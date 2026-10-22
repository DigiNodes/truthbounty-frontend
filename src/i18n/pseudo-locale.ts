/**
 * UI-FE-063 — Pseudo-locale generation.
 *
 * A pseudo-locale is a deterministic transform applied to catalogue copy so a
 * reviewer can see, without a real translation:
 *
 * 1. which strings are actually externalized (transformed strings are accented
 *    and bracket-wrapped; hard-coded strings stay plain ASCII), and
 * 2. how layout behaves once text expands by ~40% (overflow, truncation,
 *    hidden actions).
 *
 * Guarantees:
 * - ICU placeholders (`{address}`, `{count}`) are preserved verbatim.
 * - ICU `plural` / `select` / `selectordinal` syntax and `#` are preserved; only
 *   the human-readable branch copy is transformed.
 * - Legal namespaces are excluded (see `./legal`); a pseudo rendering must never
 *   look like an approved legal translation.
 *
 * The transform is pure and deterministic: identical input always produces
 * identical output (required for screenshot/hydration stability).
 */

import { isLegalKey } from './legal';

export interface PseudoLocaleOptions {
  /** Fraction by which transformed copy is padded (default 0.4 = +40%). */
  expandRatio?: number;
  /** Apply the accented character map (default true). */
  accent?: boolean;
  /** Wrap each transformed string in boundary markers (default true). */
  wrap?: boolean;
  openMarker?: string;
  closeMarker?: string;
  /** Padding character used to reach the expansion target. */
  filler?: string;
  /**
   * Return true to leave a key's copy untouched. Defaults to excluding legal
   * namespaces; when provided it is combined with (not replacing) that rule.
   */
  excludeKey?: (keyPath: string) => boolean;
}

export const PSEUDO_LOCALE_DEFAULTS = {
  expandRatio: 0.4,
  accent: true,
  wrap: true,
  openMarker: '⟦',
  closeMarker: '⟧',
  filler: '·',
} as const;

/** Accented lookalikes that make pseudo copy visibly non-production. */
const ACCENT_MAP: Record<string, string> = {
  a: 'å', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ğ', h: 'ħ',
  i: 'í', j: 'ĵ', k: 'ķ', l: 'ļ', m: 'ɱ', n: 'ñ', o: 'ö', p: 'þ',
  q: 'ǫ', r: 'ř', s: 'š', t: 'ţ', u: 'ü', v: 'ṽ', w: 'ŵ', x: 'ӿ',
  y: 'ý', z: 'ž',
  A: 'Å', B: 'Ɓ', C: 'Ç', D: 'Ð', E: 'É', F: 'Ƒ', G: 'Ğ', H: 'Ħ',
  I: 'Í', J: 'Ĵ', K: 'Ķ', L: 'Ļ', M: 'Ṁ', N: 'Ñ', O: 'Ö', P: 'Þ',
  Q: 'Ǫ', R: 'Ř', S: 'Š', T: 'Ţ', U: 'Ü', V: 'Ṽ', W: 'Ŵ', X: 'Ӿ',
  Y: 'Ý', Z: 'Ž',
};

type ResolvedOptions = Required<
  Pick<
    PseudoLocaleOptions,
    | 'expandRatio'
    | 'accent'
    | 'wrap'
    | 'openMarker'
    | 'closeMarker'
    | 'filler'
  >
> & { excludeKey: (keyPath: string) => boolean };

function resolveOptions(options?: PseudoLocaleOptions): ResolvedOptions {
  const userExclude = options?.excludeKey;
  return {
    ...PSEUDO_LOCALE_DEFAULTS,
    ...options,
    excludeKey: (keyPath: string) =>
      isLegalKey(keyPath) || (userExclude ? userExclude(keyPath) : false),
  };
}

/** Find the index of the `}` that closes the `{` at `start` (brace-aware). */
function findMatchingBrace(value: string, start: number): number {
  let depth = 0;
  for (let i = start; i < value.length; i += 1) {
    const char = value[i];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function accentText(text: string, options: ResolvedOptions): string {
  if (!options.accent) return text;
  let out = '';
  for (const char of text) out += ACCENT_MAP[char] ?? char;
  return out;
}

/** Transform only the literal portions of a message. */
function transformLiteral(text: string, options: ResolvedOptions): string {
  return accentText(text, options);
}

/** Transform the inside of a `{...}` group without touching ICU syntax. */
function transformBraced(inner: string, options: ResolvedOptions): string {
  // Simple argument, e.g. `{address}` — preserve exactly.
  if (/^[a-zA-Z_$][\w$]*$/.test(inner.trim())) return inner;

  const icu =
    /^([a-zA-Z_$][\w$]*)\s*,\s*(plural|select|selectordinal)\s*,\s*([\s\S]*)$/.exec(
      inner,
    );
  if (icu) {
    const [, arg, type, body] = icu;
    return `${arg}, ${type}, ${transformIcuBody(body, options)}`;
  }

  // Other ICU formats (number/date/time) carry no user copy — keep verbatim.
  return inner;
}

/** Transform `=0 {..} one {..} other {..}` branch copy, preserving structure. */
function transformIcuBody(body: string, options: ResolvedOptions): string {
  let out = '';
  let i = 0;
  while (i < body.length) {
    const braceIndex = body.indexOf('{', i);
    if (braceIndex === -1) {
      out += body.slice(i);
      break;
    }
    // Everything up to the branch message is ICU syntax (keyword/`=N`/offset).
    out += body.slice(i, braceIndex);
    const end = findMatchingBrace(body, braceIndex);
    if (end === -1) {
      out += body.slice(braceIndex);
      break;
    }
    out += `{${transformMessage(body.slice(braceIndex + 1, end), options)}}`;
    i = end + 1;
  }
  return out;
}

/** Transform a single ICU message string. */
export function transformMessage(
  message: string,
  options?: PseudoLocaleOptions,
): string {
  const resolved = resolveOptions(options);
  let out = '';
  let i = 0;
  while (i < message.length) {
    if (message[i] === '{') {
      const end = findMatchingBrace(message, i);
      if (end === -1) {
        out += transformLiteral(message.slice(i), resolved);
        break;
      }
      out += `{${transformBraced(message.slice(i + 1, end), resolved)}}`;
      i = end + 1;
    } else {
      const next = message.indexOf('{', i);
      const stop = next === -1 ? message.length : next;
      out += transformLiteral(message.slice(i, stop), resolved);
      i = stop;
    }
  }
  return out;
}

/** Count Unicode code points (stable across markers/accents). */
function codePointLength(value: string): number {
  return [...value].length;
}

/** Pseudo-localize a single catalogue string with expansion + wrapping. */
export function pseudoLocalizeString(
  message: string,
  options?: PseudoLocaleOptions,
): string {
  if (!message) return message;
  const resolved = resolveOptions(options);
  const transformed = transformMessage(message, options);
  const target = Math.ceil(
    codePointLength(message) * (1 + resolved.expandRatio),
  );

  let padded = transformed;
  while (codePointLength(padded) < target) padded += resolved.filler;

  return resolved.wrap
    ? `${resolved.openMarker}${padded}${resolved.closeMarker}`
    : padded;
}

function pseudoLocalizeValue(
  value: unknown,
  options: ResolvedOptions,
  keyPath: string,
): unknown {
  if (typeof value === 'string') {
    if (options.excludeKey(keyPath)) return value;
    return pseudoLocalizeString(value, options);
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      pseudoLocalizeValue(item, options, `${keyPath}.${index}`),
    );
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = pseudoLocalizeValue(
        child,
        options,
        keyPath ? `${keyPath}.${key}` : key,
      );
    }
    return out;
  }
  return value;
}

/**
 * Pseudo-localize an entire nested message catalogue.
 * Legal namespaces are preserved verbatim by default.
 */
export function pseudoLocalizeMessages<T extends Record<string, unknown>>(
  messages: T,
  options?: PseudoLocaleOptions,
): T {
  const resolved = resolveOptions(options);
  return pseudoLocalizeValue(messages, resolved, '') as T;
}

/** True when a string carries pseudo-locale boundary markers. */
export function isPseudoLocalizedString(value: string): boolean {
  return (
    value.includes(PSEUDO_LOCALE_DEFAULTS.openMarker) &&
    value.includes(PSEUDO_LOCALE_DEFAULTS.closeMarker)
  );
}
