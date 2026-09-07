/**
 * Sensitive Path Policy for TruthBounty V2
 * Identifies sensitive files (wallet, auth, transaction, artifact, security) requiring strict audit.
 */

const SENSITIVE_PATH_PATTERNS = [
  /auth/i,
  /wallet/i,
  /transaction/i,
  /artifact/i,
  /security/i,
];

export function isSensitivePath(filePath: string): boolean {
  return SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function requiresManualReview(filePaths: string[], labels: string[] = []): boolean {
  if (labels.includes('manual-review')) {
    return false;
  }
  return filePaths.some(isSensitivePath);
}
