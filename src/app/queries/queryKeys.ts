/**
 * Canonical query key factory for TruthBounty V2
 *
 * Design rules:
 *  1. Every key is an immutable `as const` tuple — never a plain string.
 *  2. Scoped invalidation is possible at every level (root → entity → sub-resource).
 *  3. Keys are projection-aware: callers can target a single projection without
 *     nuking unrelated cache entries.
 *  4. No mock values, dummy addresses, or fabricated hashes are defined here.
 */

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------
export const claimsKeys = {
  /** Invalidate the entire claims namespace. */
  all: ['claims'] as const,
  /** All paginated / filtered claim lists. */
  lists: () => ['claims', 'list'] as const,
  /** A specific filtered list (status, cursor, …). */
  list: (filters: Record<string, unknown>) => ['claims', 'list', filters] as const,
  /** Single claim detail. */
  detail: (claimId: string) => ['claims', 'detail', claimId] as const,
  /** Claim filtered by lifecycle status. */
  byStatus: (status: string) => ['claims', 'status', status] as const,
  /** Claim finality projection (observed / safe / finalized / reorged). */
  finality: (claimId: string) => ['claims', 'finality', claimId] as const,
} as const;

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------
export const evidenceKeys = {
  /** Invalidate all evidence. */
  all: ['evidence'] as const,
  /** All evidence items for a given claim. */
  byClaim: (claimId: string) => ['evidence', 'claim', claimId] as const,
  /** Single evidence item. */
  detail: (evidenceId: string) => ['evidence', 'detail', evidenceId] as const,
} as const;

// ---------------------------------------------------------------------------
// Rounds
// ---------------------------------------------------------------------------
export const roundsKeys = {
  /** Invalidate all rounds. */
  all: ['rounds'] as const,
  /** Rounds for a specific claim. */
  byClaim: (claimId: string) => ['rounds', 'claim', claimId] as const,
  /** Single round detail. */
  detail: (roundId: string) => ['rounds', 'detail', roundId] as const,
} as const;

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------
export const disputesKeys = {
  /** Invalidate all disputes. */
  all: ['disputes'] as const,
  /** Disputes associated with a specific claim. */
  byClaim: (claimId: string) => ['disputes', 'claim', claimId] as const,
  /** Single dispute detail. */
  detail: (disputeId: string) => ['disputes', 'detail', disputeId] as const,
  /** Dispute finality projection. */
  finality: (disputeId: string) => ['disputes', 'finality', disputeId] as const,
} as const;

// ---------------------------------------------------------------------------
// Verifications (kept for backward compatibility; formerly top-level)
// ---------------------------------------------------------------------------
export const verificationsKeys = {
  all: ['verifications'] as const,
  byClaim: (claimId: string) => ['verifications', 'claim', claimId] as const,
  byUser: (userId: string) => ['verifications', 'user', userId] as const,
} as const;

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------
export const rewardsKeys = {
  /** Invalidate all rewards. */
  all: ['rewards'] as const,
  /** Claimable rewards for a wallet address. */
  claimable: (address: string) => ['rewards', 'claimable', address] as const,
  /** Historical reward log for a wallet address. */
  history: (address: string) => ['rewards', 'history', address] as const,
  /** Reward details for a specific claim. */
  byClaim: (claimId: string) => ['rewards', 'claim', claimId] as const,
} as const;

// ---------------------------------------------------------------------------
// Reputation
// ---------------------------------------------------------------------------
export const reputationKeys = {
  /** Invalidate all reputation data. */
  all: ['reputation'] as const,
  /** Reputation score for a specific address / userId. */
  byUser: (userId: string) => ['reputation', 'user', userId] as const,
  /** Leaderboard snapshot. */
  leaderboard: ['reputation', 'leaderboard'] as const,
} as const;

// ---------------------------------------------------------------------------
// Wallet / on-chain state
// ---------------------------------------------------------------------------
export const walletKeys = {
  /** Invalidate all wallet state. */
  all: ['wallet'] as const,
  /** ETH balance for an address on a given chain. */
  balance: (address: string, chainId: number) =>
    ['wallet', 'balance', address, chainId] as const,
  /** ERC-20 token balance (e.g. TBT reward token). */
  tokenBalance: (address: string, tokenAddress: string, chainId: number) =>
    ['wallet', 'token', address, tokenAddress, chainId] as const,
  /** Nonce / pending-tx guard. */
  nonce: (address: string, chainId: number) =>
    ['wallet', 'nonce', address, chainId] as const,
} as const;

// ---------------------------------------------------------------------------
// Leaderboard (top-level, distinct from reputation leaderboard)
// ---------------------------------------------------------------------------
export const leaderboardKeys = {
  all: ['leaderboard'] as const,
} as const;

// ---------------------------------------------------------------------------
// User (profile + nested sub-resources)
// ---------------------------------------------------------------------------
export const userKeys = {
  all: ['user'] as const,
  profile: (userId: string) => ['user', userId] as const,
  reputation: (userId: string) => ['user', userId, 'reputation'] as const,
  verification: (userId: string) => ['user', userId, 'verification'] as const,
  rewards: (userId: string) => ['user', userId, 'rewards'] as const,
} as const;

// ---------------------------------------------------------------------------
// Unified export — keep the old `queryKeys` shape for backward compat while
// also exposing each sub-factory directly.
// ---------------------------------------------------------------------------
export const queryKeys = {
  claims: claimsKeys,
  evidence: evidenceKeys,
  rounds: roundsKeys,
  disputes: disputesKeys,
  verifications: verificationsKeys,
  rewards: rewardsKeys,
  reputation: reputationKeys,
  wallet: walletKeys,
  leaderboard: leaderboardKeys.all,
  user: userKeys,
} as const;
