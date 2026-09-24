/**
 * Canonical evidence URI validation and safe resolution.
 * Protocol requirement: Fail closed on unsupported schemes, unsafe inputs, or secrets.
 */

export const SUPPORTED_EVIDENCE_SCHEMES = ['https:', 'ipfs:'] as const;
export type SupportedEvidenceScheme = typeof SUPPORTED_EVIDENCE_SCHEMES[number];

export const MAX_EVIDENCE_URI_LENGTH = 1024;

// Sensitive parameter names that indicate credentials or presigned query secrets
const SENSITIVE_PARAM_NAMES = new Set([
  'password',
  'secret',
  'token',
  'key',
  'api_key',
  'apikey',
  'access_token',
  'authorization',
  'credential',
  'sig',
  'signature',
  'x-amz-signature',
  'x-amz-credential',
  'x-amz-security-token',
  'x-goog-signature',
  'x-goog-credential',
]);

/**
 * IPFS CID validation:
 * - CIDv0: base58btc starting with Qm (exactly 46 characters: Qm + 44 base58 chars)
 * - CIDv1: multibase base32 starting with 'b' (e.g. bafy..., baga...) using RFC 4648 base32 [a-z2-7]
 * Anchored end-to-end to reject trailing invalid characters.
 */
const IPFS_CID_REGEX = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,})$/i;

export interface EvidenceUriValidationResult {
  isValid: boolean;
  scheme: string | null;
  error: string | null;
}

/**
 * Validates an evidence URI against canonical protocol rules.
 */
export function validateEvidenceUri(uri: string | undefined | null): EvidenceUriValidationResult {
  if (!uri || !uri.trim()) {
    return {
      isValid: false,
      scheme: null,
      error: 'Evidence URI is required',
    };
  }

  const trimmed = uri.trim();

  if (trimmed.length > MAX_EVIDENCE_URI_LENGTH) {
    return {
      isValid: false,
      scheme: null,
      error: 'Oversized input: evidence URI must be at most 1024 characters',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      scheme: null,
      error: 'Invalid Evidence URI',
    };
  }

  const scheme = parsed.protocol.toLowerCase();

  if (!SUPPORTED_EVIDENCE_SCHEMES.includes(scheme as SupportedEvidenceScheme)) {
    return {
      isValid: false,
      scheme,
      error: 'Unsupported scheme: only https and ipfs are allowed',
    };
  }

  // Prevent embedded authority credentials (e.g., https://user:pass@example.com)
  if (parsed.username || parsed.password) {
    return {
      isValid: false,
      scheme,
      error: 'Raw secrets detected in URI. Please remove sensitive information.',
    };
  }

  // Inspect query parameters for secrets, credentials, or presigned signatures
  for (const [key] of parsed.searchParams.entries()) {
    if (SENSITIVE_PARAM_NAMES.has(key.toLowerCase())) {
      return {
        isValid: false,
        scheme,
        error: 'Raw secrets detected in URI. Please remove sensitive information.',
      };
    }
  }

  // If ipfs: validate CID host or path
  if (scheme === 'ipfs:') {
    const rawCid = parsed.hostname || parsed.pathname.replace(/^\/\//, '').split('/')[0];
    if (!rawCid || !IPFS_CID_REGEX.test(rawCid)) {
      return {
        isValid: false,
        scheme,
        error: 'Invalid IPFS CID in evidence URI',
      };
    }
  }

  return {
    isValid: true,
    scheme,
    error: null,
  };
}

/**
 * Resolves a safe gateway URL for UI navigation or rendering.
 * Returns null if the URI is invalid, contains credentials, or is unsupported.
 */
export function getSafeEvidenceHref(uri: string): string | null {
  const result = validateEvidenceUri(uri);
  if (!result.isValid) {
    return null;
  }

  try {
    const parsed = new URL(uri.trim());
    if (parsed.protocol === 'https:') {
      return parsed.href;
    }
    if (parsed.protocol === 'ipfs:') {
      const cid = parsed.hostname || parsed.pathname.replace(/^\/\//, '').split('/')[0];
      const remainder = parsed.pathname.startsWith('/') && parsed.hostname
        ? parsed.pathname
        : parsed.pathname.replace(new RegExp(`^\\/?\\/?${cid}`), '');
      return `https://ipfs.io/ipfs/${cid}${remainder}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return null;
  }

  return null;
}
