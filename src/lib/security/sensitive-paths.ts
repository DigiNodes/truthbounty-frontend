/**
 * Sensitive path policy for the TruthBounty frontend.
 *
 * Paths that touch wallet, auth, transaction, artifact or security logic are
 * flagged for manual review so that risky changes are never auto-approved.
 */

// Directory prefixes that are always sensitive.
const SENSITIVE_PREFIXES = [
  'src/app/auth/',
  'src/lib/artifacts/',
  'src/lib/security/',
  'src/lib/transaction-machine/',
];

// Specific files that are sensitive even if their directory is not.
const SENSITIVE_FILES = [
  'src/hooks/useWallet.ts',
  'src/hooks/useWalletNetwork.ts',
  'src/lib/transaction-simulator.ts',
  'src/lib/session-store.ts',
  'src/lib/pending-transactions.ts',
];

export function isSensitivePath(filePath: string): boolean {
  return (
    SENSITIVE_FILES.includes(filePath) ||
    SENSITIVE_PREFIXES.some((prefix) => filePath.startsWith(prefix))
  );
}

export function requiresManualReview(
  changedFiles: string[],
  labels: string[],
): boolean {
  if (labels.includes('manual-review')) {
    return false;
  }
  return changedFiles.some((file) => isSensitivePath(file));
}
