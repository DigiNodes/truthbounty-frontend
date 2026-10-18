/**
 * Correlation references — UI-FE-053 (#626)
 *
 * A correlation reference is an opaque, support-facing identifier that lets a
 * person quote one failure to the team without exposing anything about it.
 *
 * Safety model (fail closed):
 *  - References minted here are RANDOM. They are never derived from a wallet,
 *    signature, token, evidence value, route, or error message, so they cannot
 *    carry any of those.
 *  - A reference supplied by an API/RPC adapter (response header) is treated as
 *    untrusted input. It is surfaced only when it matches one of two strict,
 *    allow-listed shapes (our own format, or a hyphenated UUID). Anything else
 *    — including 0x-hex blobs, JWT-like strings, bearer tokens, emails, URLs,
 *    CIDs, long strings — is dropped and replaced by a locally minted reference.
 *
 * This module has no React or browser-only dependencies at import time.
 */

/** Crockford base32 alphabet (no I, L, O, U) — unambiguous when read aloud. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const GROUP = '[0-9A-HJKMNP-TV-Z]{4}';

/** `TB-XXXX-XXXX-XXXX` — 60 bits of randomness. */
const LOCAL_REFERENCE_PATTERN = new RegExp(`^TB-${GROUP}-${GROUP}-${GROUP}$`);

/** Hyphenated UUID (any version), as commonly emitted by gateways. */
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Response headers adapters may read a reference from, in precedence order. */
export const CORRELATION_HEADER_NAMES = ['x-correlation-id', 'x-request-id'] as const;

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
    return bytes;
  }
  // Non-security-critical fallback: the reference is an opaque label, not a secret.
  for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

/** Mint a new random correlation reference, e.g. `TB-7K2M-9QXD-4HFA`. */
export function createCorrelationReference(): string {
  const bytes = randomBytes(12);
  let chars = '';
  for (let i = 0; i < 12; i += 1) chars += ALPHABET[bytes[i] % ALPHABET.length];
  return `TB-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

/**
 * Validate an untrusted reference. Returns the reference when it matches an
 * allow-listed shape, otherwise `null`. Never throws; never returns a
 * transformed value (no "cleaning" — a reference is accepted verbatim or not
 * at all).
 */
export function sanitizeCorrelationReference(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  if (input.length === 0 || input.length > 64) return null;
  if (LOCAL_REFERENCE_PATTERN.test(input)) return input;
  if (UUID_PATTERN.test(input)) return input.toLowerCase();
  return null;
}

/** Whether a value is a currently-valid correlation reference. */
export function isCorrelationReference(input: unknown): input is string {
  return sanitizeCorrelationReference(input) !== null;
}

/** Minimal header-reader shape so adapters can pass `Response`, axios headers, or a test double. */
export interface HeaderReader {
  get(name: string): string | null;
}

/**
 * Read and validate a correlation reference from response headers.
 * Returns `null` if none is present or the value fails validation.
 */
export function readCorrelationReference(headers: HeaderReader | null | undefined): string | null {
  if (!headers || typeof headers.get !== 'function') return null;
  for (const name of CORRELATION_HEADER_NAMES) {
    let value: string | null = null;
    try {
      value = headers.get(name);
    } catch {
      value = null;
    }
    const safe = sanitizeCorrelationReference(value);
    if (safe) return safe;
  }
  return null;
}

/**
 * Like `readCorrelationReference`, but when no header holds a *valid* reference
 * it returns the first raw header value that was present, so the caller can
 * record that something unsafe was supplied (`rejected`). The raw value must
 * only ever be passed to `resolveCorrelationReference`/`AdapterError`, which
 * validate it — it is never stored or displayed.
 */
export function readCorrelationCandidate(headers: HeaderReader | null | undefined): string | null {
  const valid = readCorrelationReference(headers);
  if (valid) return valid;
  if (!headers || typeof headers.get !== 'function') return null;
  for (const name of CORRELATION_HEADER_NAMES) {
    try {
      const raw = headers.get(name);
      if (typeof raw === 'string' && raw.length > 0) return raw;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Resolve the reference to surface: a valid adapter-supplied one when present,
 * otherwise a freshly minted local one. `rejected` is true when something was
 * supplied but failed validation (useful for telemetry, never shown).
 */
export function resolveCorrelationReference(candidate: unknown): {
  reference: string;
  origin: 'adapter' | 'local';
  rejected: boolean;
} {
  const safe = sanitizeCorrelationReference(candidate);
  if (safe) return { reference: safe, origin: 'adapter', rejected: false };
  const supplied = candidate !== undefined && candidate !== null && candidate !== '';
  return { reference: createCorrelationReference(), origin: 'local', rejected: supplied };
}
