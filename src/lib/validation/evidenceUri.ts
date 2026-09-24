/**
 * Canonical evidence URI validation and safe resolution.
 * Protocol requirement: Fail closed on unsupported schemes, unsafe inputs, or secrets.
 */

export const SUPPORTED_EVIDENCE_SCHEMES = ['https:', 'ipfs:'] as const;
export type SupportedEvidenceScheme = typeof SUPPORTED_EVIDENCE_SCHEMES[number];

export const MAX_EVIDENCE_URI_LENGTH = 1024;

// Sensitive keyword detection to prevent accidental credential leakage
const SENSITIVE_KEYWORD_REGEX = /(password|secret|key|token)=/i;

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
      error: 'Oversized input: evidence URI must be under 1024 characters',
    };
  }

  if (SENSITIVE_KEYWORD_REGEX.test(trimmed)) {
    return {
      isValid: false,
      scheme: null,
      error: 'Raw secrets detected in URI. Please remove sensitive information.',
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

  // Prevent embedded credentials (e.g., https://user:pass@example.com)
  if (parsed.username || parsed.password) {
    return {
      isValid: false,
      scheme,
      error: 'Raw secrets detected in URI. Please remove sensitive information.',
    };
  }

  return {
    isValid: true,
    scheme,
    error: null,
  };
}

/**
 * Returns a safe URL for rendering in the UI, or null if the URI is not safe to navigate to.
 * Maps ipfs:// to a public gateway if direct web navigation is needed.
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
      // Retain canonical ipfs: scheme for compliant handlers or gateway resolution
      const cidPath = uri.replace(/^ipfs:\/\//i, '');
      return `https://ipfs.io/ipfs/${cidPath}`;
    }
  } catch {
    return null;
  }

  return null;
}