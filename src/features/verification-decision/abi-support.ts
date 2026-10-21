/**
 * UI-FE-019 — Facts proven by the pinned release interface.
 *
 * Every capability rendered by the verification decision UI is derived from
 * the pinned ABI. When the pinned release does not expose an entrypoint the
 * matching control renders an explicit unavailable state instead of being
 * invented.
 */

import { verificationSubmissionAbi } from '@/config/protocol/verification-artifact';

const ABI_FUNCTION_NAMES: readonly string[] = verificationSubmissionAbi.map(
  (entry) => entry.name
);

/** The only callable the pinned release exposes for a direct vote. */
export const SUBMIT_VERIFICATION_FUNCTION = 'submitVerification';

/** Exact signature of the callable shown in the authorization review. */
export const SUBMIT_VERIFICATION_SIGNATURE =
  'submitVerification(uint256 claimId, uint8 verdict, uint256 stakeAmount)';

/** True when the pinned ABI exposes a function with this name. */
export function pinnedAbiSupports(functionName: string): boolean {
  return ABI_FUNCTION_NAMES.includes(functionName);
}

/**
 * Commit/reveal controls may only be rendered when the pinned release exposes
 * a matching entrypoint. The pinned interface exposes a direct vote only, so
 * sealed voting stays unavailable until a release pins commit/reveal.
 */
export function commitRevealAvailable(): boolean {
  return (
    pinnedAbiSupports('commitVerification') ||
    pinnedAbiSupports('revealVerification')
  );
}
