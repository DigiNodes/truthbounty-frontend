// src/lib/leaderboard.ts

import type { LeaderboardEntry } from '@/app/types/websocket';

/**
 * Leaderboard protocol invariants.
 *
 * The server is the authoritative source for ranking. The client must NOT
 * re-sort entries by arbitrary fields (e.g. accuracy, totalEarned) because
 * that could diverge from the server's composite scoring. Instead, the
 * client trusts the server-provided `rank` and only enforces the following
 * protocol invariants:
 *
 *  1. SORT_BY_RANK   – entries are ordered by `rank` ascending.
 *  2. RANK_SEQUENTIAL – ranks are dense integers starting at 1 (1, 2, 3 …).
 *  3. RANK_UNIQUE     – no two entries share the same rank.
 *  4. USER_UNIQUE     – no two entries share the same `userId`.
 *  5. NON_NEGATIVE    – `totalVerifications`, `totalStaked`, `totalEarned` ≥ 0.
 *  6. ACCURACY_RANGE  – `accuracy` ∈ [0, 100].
 */
export const LEADERBOARD_INVARIANTS = {
  SORT_BY_RANK: 'SORT_BY_RANK',
  RANK_SEQUENTIAL: 'RANK_SEQUENTIAL',
  RANK_UNIQUE: 'RANK_UNIQUE',
  USER_UNIQUE: 'USER_UNIQUE',
  NON_NEGATIVE: 'NON_NEGATIVE',
  ACCURACY_RANGE: 'ACCURACY_RANGE',
} as const;

export type LeaderboardInvariant =
  (typeof LEADERBOARD_INVARIANTS)[keyof typeof LEADERBOARD_INVARIANTS];

/**
 * Sort leaderboard entries by server-provided `rank` (ascending).
 *
 * This is a stable sort: entries with equal rank preserve their original
 * relative order so the server's intent is never contradicted.
 */
export function sortLeaderboardByRank(
  entries: LeaderboardEntry[]
): LeaderboardEntry[] {
  return [...entries].sort((a, b) => a.rank - b.rank);
}

/**
 * Re-assign dense sequential ranks (1, 2, 3 …) based on the current order.
 *
 * This is used after sorting to guarantee the `RANK_SEQUENTIAL` and
 * `RANK_UNIQUE` invariants. The original order (and therefore the server's
 * ranking intent) is preserved — only the numeric `rank` label is normalized.
 */
export function normalizeRanks(
  entries: LeaderboardEntry[]
): LeaderboardEntry[] {
  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

/**
 * Sort by server rank and normalize rank labels so the result always
 * satisfies `SORT_BY_RANK`, `RANK_SEQUENTIAL` and `RANK_UNIQUE`.
 */
export function sortAndNormalizeLeaderboard(
  entries: LeaderboardEntry[]
): LeaderboardEntry[] {
  return normalizeRanks(sortLeaderboardByRank(entries));
}

/**
 * Validate that a leaderboard array satisfies every protocol invariant.
 *
 * Returns an object describing which invariants hold. This is primarily
 * intended for assertions in tests and for guarding real-time updates.
 */
export function validateLeaderboardInvariants(
  entries: LeaderboardEntry[]
): { valid: boolean; violations: LeaderboardInvariant[] } {
  const violations: LeaderboardInvariant[] = [];

  // SORT_BY_RANK – must be ascending by rank.
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].rank < entries[i - 1].rank) {
      violations.push(LEADERBOARD_INVARIANTS.SORT_BY_RANK);
      break;
    }
  }

  // RANK_UNIQUE & USER_UNIQUE
  const seenRanks = new Set<number>();
  const seenUsers = new Set<string>();
  for (const entry of entries) {
    if (seenRanks.has(entry.rank)) {
      violations.push(LEADERBOARD_INVARIANTS.RANK_UNIQUE);
    }
    seenRanks.add(entry.rank);

    if (seenUsers.has(entry.userId)) {
      violations.push(LEADERBOARD_INVARIANTS.USER_UNIQUE);
    }
    seenUsers.add(entry.userId);
  }

  // RANK_SEQUENTIAL – dense integers starting at 1.
  const expectedRanks = entries.map((_, i) => i + 1);
  const actualRanks = entries.map((e) => e.rank);
  if (
    expectedRanks.length !== actualRanks.length ||
    !expectedRanks.every((r, i) => r === actualRanks[i])
  ) {
    violations.push(LEADERBOARD_INVARIANTS.RANK_SEQUENTIAL);
  }

  // NON_NEGATIVE & ACCURACY_RANGE
  for (const entry of entries) {
    if (
      entry.totalVerifications < 0 ||
      entry.totalStaked < 0 ||
      entry.totalEarned < 0
    ) {
      violations.push(LEADERBOARD_INVARIANTS.NON_NEGATIVE);
      break;
    }
    if (entry.accuracy < 0 || entry.accuracy > 100) {
      violations.push(LEADERBOARD_INVARIANTS.ACCURACY_RANGE);
      break;
    }
  }

  // De-duplicate violations while preserving order.
  const uniqueViolations = [...new Set(violations)];

  return {
    valid: uniqueViolations.length === 0,
    violations: uniqueViolations,
  };
}