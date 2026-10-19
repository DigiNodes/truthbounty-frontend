/**
 * Error scrubbing — UI-FE-053 (#626)
 *
 * React logs a caught error to the console *after* `getDerivedStateFromError`,
 * and error messages routinely embed things that must never be logged or shown:
 * wallet signatures, private keys, bearer/JWT tokens, emails, evidence URLs and
 * CIDs. `scrubErrorInPlace` rewrites `message`, `stack` and the `cause` chain on
 * the error object itself, so whatever reads it afterwards (React, devtools,
 * telemetry, a test spy) only sees scrubbed text.
 *
 * Builds on the telemetry redactor (addresses, keys, signatures, JWT, email,
 * key=value secrets, mnemonics) and adds the evidence-specific shapes: URLs
 * (which may carry tokens in the query string) and IPFS CIDs.
 */

import { redactString } from '@/lib/telemetry';

const URL_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>)\]]+/gi;
const CID_V0_PATTERN = /\bQm[1-9A-HJ-NP-Za-km-z]{44}\b/g;
const CID_V1_PATTERN = /\bb[a-z2-7]{58,}\b/g;
// Three dot-separated base64url segments starting with `ey`. Shorter minimums than the
// telemetry rule on purpose: the standard HS256 header (`eyJhbGciOiJIUzI1NiJ9`) is only 20 chars.
const JWT_PATTERN = /\bey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;

/** Scrub a single string. Pure; safe to call on untrusted text. */
export function scrubText(input: string): string {
  let out = input;
  out = out.replace(BEARER_PATTERN, 'Bearer [REDACTED_TOKEN]');
  out = out.replace(JWT_PATTERN, '[REDACTED_TOKEN]');
  out = out.replace(URL_PATTERN, '[REDACTED_URL]');
  out = out.replace(CID_V0_PATTERN, '[REDACTED_CID]').replace(CID_V1_PATTERN, '[REDACTED_CID]');
  return redactString(out);
}

/**
 * Scrub an error (and its `cause` chain) in place. Never throws; properties
 * that are non-writable are skipped.
 */
export function scrubErrorInPlace(error: unknown, depth = 0): void {
  if (!(error instanceof Error) || depth > 5) return;
  try {
    error.message = scrubText(error.message);
  } catch {
    /* non-writable */
  }
  try {
    if (typeof error.stack === 'string') error.stack = scrubText(error.stack);
  } catch {
    /* non-writable */
  }
  scrubErrorInPlace((error as { cause?: unknown }).cause, depth + 1);
}
