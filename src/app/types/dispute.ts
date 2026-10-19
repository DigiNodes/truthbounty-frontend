/**
 * V2-FE-014 — On-chain challenge / dispute opening types.
 *
 * These describe the canonical Optimism/EVM challenge flow: the bond is an
 * ERC-20 amount pulled via `transferFrom`, so it needs an allowance and is
 * never sent as payable value. Every field is derived from a confirmed receipt
 * or an on-chain read — never from a client-side guess.
 */

export type DisputeSubmissionPhase =
  | 'idle'
  | 'validating'
  | 'allowance'
  | 'approving'
  | 'simulating'
  | 'confirming'
  | 'reconciling'
  | 'confirmed'
  | 'rejected'
  | 'stale'
  | 'mismatch'
  | 'error';

/**
 * Challenge window derived from canonical on-chain reads
 * (`getChallengeBond`, `getChallengeDeadline`, `hasOpenChallenge`).
 */
export interface ChallengeWindow {
  claimId: bigint;
  /** Unix seconds; enforced on-chain. */
  deadline: bigint;
  /** Required bond in ERC-20 wei. */
  bond: bigint;
  /** True when the contract already has an open challenge for the claim. */
  hasOpenChallenge: boolean;
  /** True when a challenge can still be opened. */
  isOpen: boolean;
}

/** Effective on-chain challenge state for a claim. */
export interface EffectiveChallengeState {
  claimId: string;
  challenger: `0x${string}` | null;
  exists: boolean;
  bond: bigint;
}

export type DisputeReconciliationStatus =
  | 'idle'
  | 'confirmed'
  | 'rejected'
  | 'stale'
  | 'mismatch';

export interface DisputeReconciliation {
  status: DisputeReconciliationStatus;
  isMismatch: boolean;
  isWrongNetwork: boolean;
  isProtocolDisabled: boolean;
  details: string[];
}

export type DisputeSubmissionErrorCode =
  | 'UNCONNECTED'
  | 'WRONG_NETWORK'
  | 'PROTOCOL_DISABLED'
  | 'INVALID_CLAIM'
  | 'INVALID_REASON'
  | 'CHALLENGE_EXISTS'
  | 'CHALLENGE_CLOSED'
  | 'DEADLINE_PASSED'
  | 'INSUFFICIENT_BALANCE'
  | 'APPROVAL_REJECTED'
  | 'SIMULATION_REVERTED'
  | 'SUBMISSION_REJECTED'
  | 'RECONCILE_FAILED';

export interface DisputeSubmissionError {
  code: DisputeSubmissionErrorCode;
  message: string;
}

// Legacy types (kept for backward compatibility)

export interface ClaimData {
  id: string;
  category: string;
  hash: string;
  status: 'Verified' | 'Disputed' | 'Pending';
  title: string;
  source: string;
  timeAgo: string;
  votesFor: number;
  votesAgainst: number;
  verifiersCount: number;
  confidenceScore: number;
  totalStaked: number;
}

export interface Dispute {
  id: string;
  claimId: string;
  reason: string;
  status: 'OPEN' | 'VOTING' | 'RESOLVED' | 'FAILED' | 'APPEALED';
  proVotes: number;
  conVotes: number; 
  totalStaked: number;
  createdAt: string;
  
  // Appeal information (if dispute has been appealed)
  appealId?: string;
  appealInitiatedAt?: string;
  appealDeadline?: string;
}

export interface CreateDisputePayload {
  claimId: string;
  reason: string;
  initialStake: number;
}

export interface Evidence {
  id: string;
  title: string;
  description: string;
  url: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  timeAgo: string;
  actor: string;
  isRecent?: boolean;
}

export interface TopVerifier {
  id: string;
  rank: number;
  name: string;
  staked: string;
  score: number;
}
