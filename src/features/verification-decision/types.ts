/**
 * UI-FE-019 — Verification decision and authorization types.
 *
 * The decision vocabulary is derived from the pinned release interface only:
 * the pinned `VerificationSubmission` ABI exposes a direct vote
 * (`submitVerification(uint256 claimId, uint8 verdict, uint256 stakeAmount)`)
 * whose `verdict` is the enum-encoded `VerificationVerdict` (TRUE = 0,
 * FALSE = 1). No abstain, commit or reveal behaviour is invented here.
 */

import type { TransactionStatus } from '@/lib/transaction-machine';

/** Verdicts the pinned release exposes. */
export type VerdictChoice = 'support' | 'reject';

/** Every verdict the pinned ABI supports, in display order. */
export const VERDICT_CHOICES: readonly VerdictChoice[] = ['support', 'reject'];

/** Enum encoding of each verdict in the pinned ABI. */
export const VERDICT_ENCODING: Record<VerdictChoice, number> = {
  support: 0,
  reject: 1,
};

/** Human-readable label of each verdict. */
export const VERDICT_LABELS: Record<VerdictChoice, string> = {
  support: 'Support the claim',
  reject: 'Reject the claim',
};

/** Canonical phase of the verification the decision belongs to. */
export type DecisionPhase = 'commit' | 'reveal' | 'closed';

/** Result of the transaction simulation performed before authorizing. */
export type SimulationState =
  | { status: 'idle' }
  | { status: 'passed' }
  | { status: 'failed'; reason: string };

/** Pinned deployment release backing the callable interface. */
export type ReleaseState =
  | { status: 'pinned'; releaseTag: string; artifactVersion: string }
  | { status: 'unpinned'; reasons: string[] };

/** Wallet connection state. */
export type WalletState =
  | { status: 'connected'; account: string; chainId: number }
  | { status: 'disconnected' }
  | { status: 'wrong-chain'; chainId: number | null; expectedChainId: number };

/** Contract-derived context of the verification being decided. */
export interface VerificationDecisionContext {
  claimId: string;
  /** Pinned VerificationSubmission address, or null when the release is not pinned. */
  target: string | null;
  /** Minimum stake in base units, read from the contract. */
  minStake: string;
  /** Stake the verifier intends to lock, in base units. */
  stakeAmount: string;
  /** Canonical deadline of the current phase (ISO-8601). */
  deadlineIso: string;
  phase: DecisionPhase;
  /** Canonical transaction state of the authorization in flight. */
  txStatus: TransactionStatus;
}

/** One reason why the authorization is unavailable. */
export interface AuthorizationBlocker {
  code:
    | 'release-unpinned'
    | 'simulation-failed'
    | 'phase-closed'
    | 'wallet-disconnected'
    | 'wrong-chain'
    | 'stake-below-minimum'
    | 'transaction-in-flight'
    | 'no-verdict-selected';
  message: string;
}

/** The exact call the wallet is asked to sign. */
export interface AuthorizationReview {
  functionName: string;
  signature: string;
  args: { name: string; type: string; value: string }[];
  target: string | null;
  chainId: number | null;
  account: string | null;
  verdict: VerdictChoice | null;
  verdictEncoding: number | null;
  stakeAmount: string;
}
