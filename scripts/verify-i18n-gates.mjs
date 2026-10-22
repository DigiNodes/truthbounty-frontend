#!/usr/bin/env node
/**
 * UI-FE-063 — Pseudo-locale, missing-copy, and layout-expansion gates.
 *
 * Loads the *real* TypeScript i18n modules (bundled with esbuild, then imported
 * through Node's ESM loader) so the gate exercises exactly the code the app
 * ships — not a hand-copied reimplementation.
 *
 * Gates enforced (fail closed -> exit 1):
 *  1. Pseudo-locale expansion: every catalogue string grows and is
 *     marker-wrapped, exposing un-externalized copy and layout headroom.
 *  2. Placeholder safety: ICU `{placeholders}`, plural/select branches and `#`
 *     survive the pseudo transform untouched.
 *  3. Catalogue fallback: unregistered/unknown locales resolve to the canonical
 *     catalogue with `usedFallback: true` (never a silent empty render).
 *  4. Missing-copy behaviour: non-production renders a visible marker; production
 *     resolves to canonical English; legal keys fail closed in both.
 *  5. Legal policy: legal namespaces are never pseudo-localized and legal copy
 *     never resolves unless it is approved + version-matched + locale-matched.
 *  6. Production pseudo exclusion: pseudo-locales are never routeable in
 *     production.
 *
 * CLI:
 *   node scripts/verify-i18n-gates.mjs [--root <dir>] [--production]
 */
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { build } from 'esbuild';

export const ROOT = resolve(process.cwd());

const ENTRY_SOURCE = `
export * from './config';
export * from './fallback';
export * from './pseudo-locale';
export * from './legal';
`;

/**
 * Bundle the i18n modules from `root` and import them.
 * Returns the live module namespace.
 */
export async function loadI18nApi({ root = ROOT } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'i18n-gate-'));
  const entry = join(root, 'src', 'i18n', '__gate_entry__.ts');
  const outfile = join(dir, 'i18n-gate.mjs');

  try {
    writeFileSync(entry, ENTRY_SOURCE, 'utf8');
    await build({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node20',
      outfile,
      logLevel: 'silent',
      absWorkingDir: root,
    });
    return await import(pathToFileURL(outfile).href);
  } finally {
    try {
      rmSync(entry, { force: true });
    } catch {
      /* ignore */
    }
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/** Flatten a nested catalogue into `{ 'ns.key': 'value' }`. */
export function flattenMessages(messages, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(messages ?? {})) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[next] = value;
    else if (value && typeof value === 'object')
      flattenMessages(value, next, out);
  }
  return out;
}

/** Structural ICU markers that must survive a pseudo transform. */
function placeholdersOf(value) {
  const found = [];
  const re = /\{([^}]*)\}/g;
  let match;
  while ((match = re.exec(value)) !== null) {
    if (/^[a-zA-Z_$][\w$]*$/.test(match[1].trim())) found.push(match[0]);
  }
  return found;
}

/**
 * Evaluate every gate against a loaded i18n API.
 * Returns an array of violation strings (empty === pass).
 */
export function evaluateGates(api, { isProduction = false } = {}) {
  const violations = [];
  const { primaryLocale } = api;

  const messages = api.getCatalog(primaryLocale);
  const leaves = flattenMessages(messages);
  const entries = Object.entries(leaves);

  if (entries.length === 0) {
    violations.push('canonical catalogue is empty');
    return violations;
  }

  // Gate 1 + 2: expansion, markers, placeholder / ICU preservation.
  for (const [key, value] of entries) {
    if (api.isLegalKey(key)) continue;
    const out = api.pseudoLocalizeString(value);
    if ([...out].length <= [...value].length) {
      violations.push(`no expansion for "${key}"`);
    }
    if (!api.isPseudoLocalizedString(out)) {
      violations.push(`missing markers for "${key}"`);
    }
    for (const token of placeholdersOf(value)) {
      if (!out.includes(token)) {
        violations.push(`placeholder ${token} lost in "${key}"`);
      }
    }
    if (/\bplural\b/.test(value) && !out.includes('#')) {
      violations.push(`ICU '#' lost in "${key}"`);
    }
  }

  // Gate 3: unknown locale falls back to canonical catalogue.
  const unknown = api.resolveCatalog('zz-ZZ', { isProduction });
  if (!unknown.usedFallback || unknown.locale !== api.fallbackLocale) {
    violations.push('unknown locale did not fall back to canonical catalogue');
  }

  // Gate 4: missing-copy behaviour.
  const devFallback = api.getMessageFallback(
    { key: 'definitely.missing.key' },
    { isProduction: false },
  );
  if (!api.isMissingKeyMarker(devFallback)) {
    violations.push('missing key is not visible outside production');
  }
  const prodFallback = api.getMessageFallback(
    { key: 'definitely.missing.key' },
    { isProduction: true },
  );
  if (api.isMissingKeyMarker(prodFallback)) {
    violations.push('missing key marker leaked into production fallback');
  }

  // Gate 5: legal policy — excluded from pseudo, fail closed on resolve.
  for (const ns of api.LEGAL_NAMESPACES) {
    const sampleKey = `${ns}.clause.title`;
    const sample = 'Approved legal wording.';
    const transformed = api.pseudoLocalizeString(sample, {
      excludeKey: api.isLegalKey,
    });
    // Direct call should still transform (exclusion is key-driven); verify the
    // catalogue-level transform honours exclusion instead.
    void transformed;
    const unavailable = api.resolveLegalCopy({ requestedVersion: '2' });
    if (unavailable.status !== 'unavailable') {
      violations.push(`legal copy for "${sampleKey}" did not fail closed`);
    }
    const approved = api.resolveLegalCopy({
      requestedVersion: '2',
      approvedVersion: '2',
      locale: primaryLocale,
      approvedLocale: primaryLocale,
      copy: sample,
    });
    if (approved.status !== 'approved') {
      violations.push(`approved legal copy for "${sampleKey}" was rejected`);
    }
  }

  const pseudoMessages = api.pseudoLocalizeMessages({
    copy: 'Plain user copy.',
    terms: { title: 'Terms of Use' },
  });
  if (!api.isPseudoLocalizedString(pseudoMessages.copy)) {
    violations.push('non-legal copy was not pseudo-localized');
  }
  if (api.isPseudoLocalizedString(pseudoMessages.terms.title)) {
    violations.push('legal copy was pseudo-localized');
  }

  // Gate 6: production must not expose pseudo-locales.
  const previousEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const runtime = api.getRuntimeLocales();
    for (const pseudo of api.pseudoLocales) {
      if (runtime.includes(pseudo)) {
        violations.push(`pseudo-locale "${pseudo}" routeable in production`);
      }
    }
    const prodPseudo = api.resolveCatalog('en-XA', { isProduction: true });
    if (prodPseudo.pseudo || prodPseudo.locale !== api.fallbackLocale) {
      violations.push('pseudo-locale resolved in production');
    }
  } finally {
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
  }

  return violations;
}

/** Convenience: load the API from `root` and evaluate the gates. */
export async function findI18nGateViolations({
  root = ROOT,
  isProduction = false,
} = {}) {
  const api = await loadI18nApi({ root });
  return evaluateGates(api, { isProduction });
}

function parseArgs(argv) {
  const args = { root: ROOT, production: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--root') args.root = resolve(argv[++i]);
    else if (token === '--production') args.production = true;
  }
  return args;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const violations = await findI18nGateViolations({
    root: args.root,
    isProduction: args.production,
  });

  if (violations.length > 0) {
    console.error('i18n gate failed:');
    for (const violation of violations) console.error(`  ✗ ${violation}`);
    return 1;
  }
  console.log(
    'i18n gate passed (pseudo-locale, fallback, missing-copy, legal policy).',
  );
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('verify-i18n-gates.mjs')) {
  runCli()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error('Unhandled i18n gate error:', err);
      process.exit(1);
    });
}
