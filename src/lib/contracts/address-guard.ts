/**
 * Address Guard & Canonical Address Validation
 * Enforces strict canonical EVM contract and wallet address integrity.
 */

const PLACEHOLDER_PATTERNS = [
  /^0x0+$/i,
  /yourcontract/i,
  /placeholder/i,
  /dummy/i,
  /mock/i,
  /testaddress/i,
];

const STELLAR_ADDRESS_PATTERN = /^G[A-Z0-9]{55}$/;

export function getAddressValidationError(value: unknown): string | null {
  if (!value || typeof value !== 'string') {
    return 'Address is missing or not a string';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return 'Address cannot be empty';
  }

  // Reject Stellar/Freighter public keys
  if (STELLAR_ADDRESS_PATTERN.test(trimmed)) {
    return 'Legacy Stellar address format detected; canonical Optimism EVM address required';
  }

  // Validate 0x prefix and 40 hex characters
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return `Invalid EVM address format (must be 0x followed by 40 hex characters): ${trimmed}`;
  }

  // Reject zero address
  if (trimmed.toLowerCase() === '0x0000000000000000000000000000000000000000') {
    return 'Zero address (0x000...000) is prohibited as an operational contract or account address';
  }

  // Reject known placeholder/dummy strings
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return `Placeholder or dummy address pattern detected: ${trimmed}`;
  }

  return null;
}

export function isValidContractAddress(value: unknown): value is `0x${string}` {
  return getAddressValidationError(value) === null;
}

export function assertValidContractAddress(value: unknown, label: string): asserts value is `0x${string}` {
  const error = getAddressValidationError(value);
  if (error) {
    throw new Error(`Invalid contract address for ${label}: ${error}`);
  }
}

export const isCanonicalContractAddress = isValidContractAddress;
export const assertCanonicalContractAddress = assertValidContractAddress;
