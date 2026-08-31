const PLACEHOLDER_PATTERNS = [
  /^0x0+$/i,
  /yourcontract/i,
  /placeholder/i,
  /dummy/i,
];

export function isValidContractAddress(value: string): boolean {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return false;
  }

  const normalized = value.toLowerCase();
  if (normalized === '0x0000000000000000000000000000000000000000') {
    return false;
  }

  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

export function assertValidContractAddress(value: string, label: string): void {
  if (!isValidContractAddress(value)) {
    throw new Error(`Invalid or placeholder contract address for ${label}: ${value}`);
  }
}
