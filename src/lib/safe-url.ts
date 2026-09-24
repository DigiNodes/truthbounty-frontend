/**
 * Render-safety guard for URLs that originate from chain/API data.
 *
 * Evidence links, image sources and other URL values are untrusted input.
 * Only absolute `http:`/`https:` URLs and same-origin root-relative paths
 * (`/foo`) are safe to render into `href`/`src` attributes. Everything else -
 * `javascript:`, `data:`, `vbscript:`, file paths, protocol-relative URLs,
 * control-character smuggling and empty values - is rejected so the UI fails
 * closed instead of executing or loading attacker-controlled content.
 */

const SAFE_SCHEMES = new Set(['http:', 'https:']);

function containsControlCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function isSafeRenderUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  // Control characters (e.g. `java\u0000script:`, `java\nscript:`) and other
  // C0 control bytes can split the scheme during parsing, so reject them
  // outright.
  if (containsControlCharacters(trimmed)) return false;

  // Protocol-relative URLs inherit the page scheme, so `//evil.example`
  // becomes `https://evil.example`. Not an XSS vector by itself, but it lets
  // chain data redirect users off the trusted origin - fail closed.
  if (trimmed.startsWith('//')) return false;

  // Same-origin root-relative paths are safe to render (e.g. served assets).
  if (trimmed.startsWith('/')) return true;

  // Require a real absolute URL (`scheme://host`). Guards against parse
  // quirks where `http:missing-host` is treated as a scheme-relative url.
  if (!/^https?:\/\//i.test(trimmed)) return false;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  // Absolute http(s) only. `new URL('http:foo')` parses without a hostname,
  // so require a real host.
  return SAFE_SCHEMES.has(parsed.protocol) && parsed.hostname.length > 0;
}