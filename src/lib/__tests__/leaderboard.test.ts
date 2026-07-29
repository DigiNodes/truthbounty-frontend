import {
  sortLeaderboardByRank,
  normalizeRanks,
  sortAndNormalizeLeaderboard,
  validateLeaderboardInvariants,
  LEADERBOARD_INVARIANTS,
} from '../leaderboard';
import type { LeaderboardEntry } from '@/app/types/websocket';

const createEntry = (overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  rank: 1,
  userId: 'user-1',
  username: 'Alice',
  totalVerifications: 10,
  accuracy: 95,
  totalStaked: 1000,
  totalEarned: 500,
  ...overrides,
});

const validEntries: LeaderboardEntry[] = [
  createEntry({ rank: 1, userId: 'user-1', username: 'Alice' }),
  createEntry({ rank: 2, userId: 'user-2', username: 'Bob' }),
  createEntry({ rank: 3, userId: 'user-3', username: 'Carol' }),
];

describe('leaderboard utilities', () => {
  describe('sortLeaderboardByRank', () => {
    it('sorts entries by rank ascending', () => {
      const unsorted = [
        createEntry({ rank: 3, userId: 'user-3' }),
        createEntry({ rank: 1, userId: 'user-1' }),
        createEntry({ rank: 2, userId: 'user-2' }),
      ];

      const result = sortLeaderboardByRank(unsorted);

      expect(result.map((e) => e.rank)).toEqual([1, 2, 3]);
    });

    it('does not mutate the original array', () => {
      const original = [
        createEntry({ rank: 3, userId: 'user-3' }),
        createEntry({ rank: 1, userId: 'user-1' }),
      ];

      const originalCopy = [...original];
      sortLeaderboardByRank(original);

      expect(original).toEqual(originalCopy);
    });

    it('preserves relative order for equal ranks (stable sort)', () => {
      const entries = [
        createEntry({ rank: 1, userId: 'user-a', username: 'A' }),
        createEntry({ rank: 1, userId: 'user-b', username: 'B' }),
        createEntry({ rank: 1, userId: 'user-c', username: 'C' }),
      ];

      const result = sortLeaderboardByRank(entries);

      expect(result.map((e) => e.userId)).toEqual(['user-a', 'user-b', 'user-c']);
    });

    it('returns empty array for empty input', () => {
      expect(sortLeaderboardByRank([])).toEqual([]);
    });
  });

  describe('normalizeRanks', () => {
    it('assigns dense sequential ranks starting at 1', () => {
      const entries = [
        createEntry({ rank: 5, userId: 'user-1' }),
        createEntry({ rank: 10, userId: 'user-2' }),
        createEntry({ rank: 99, userId: 'user-3' }),
      ];

      const result = normalizeRanks(entries);

      expect(result.map((e) => e.rank)).toEqual([1, 2, 3]);
    });

    it('preserves other fields while only changing rank', () => {
      const entries = [
        createEntry({ rank: 7, userId: 'user-1', username: 'Alice', accuracy: 90 }),
      ];

      const result = normalizeRanks(entries);

      expect(result[0]).toEqual({
        ...entries[0],
        rank: 1,
      });
    });

    it('does not mutate the original entries', () => {
      const entries = [createEntry({ rank: 5, userId: 'user-1' })];

      normalizeRanks(entries);

      expect(entries[0].rank).toBe(5);
    });
  });

  describe('sortAndNormalizeLeaderboard', () => {
    it('sorts by rank and normalizes to dense ranks', () => {
      const entries = [
        createEntry({ rank: 10, userId: 'user-3' }),
        createEntry({ rank: 2, userId: 'user-1' }),
        createEntry({ rank: 5, userId: 'user-2' }),
      ];

      const result = sortAndNormalizeLeaderboard(entries);

      expect(result.map((e) => e.rank)).toEqual([1, 2, 3]);
      expect(result.map((e) => e.userId)).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('produces output that passes all invariants', () => {
      const entries = [
        createEntry({ rank: 7, userId: 'user-3' }),
        createEntry({ rank: 1, userId: 'user-1' }),
        createEntry({ rank: 4, userId: 'user-2' }),
      ];

      const result = sortAndNormalizeLeaderboard(entries);
      const validation = validateLeaderboardInvariants(result);

      expect(validation.valid).toBe(true);
      expect(validation.violations).toEqual([]);
    });
  });

  describe('validateLeaderboardInvariants', () => {
    it('returns valid=true for a correct leaderboard', () => {
      const validation = validateLeaderboardInvariants(validEntries);

      expect(validation.valid).toBe(true);
      expect(validation.violations).toEqual([]);
    });

    it('returns valid=true for an empty leaderboard', () => {
      const validation = validateLeaderboardInvariants([]);

      expect(validation.valid).toBe(true);
    });

    it('detects SORT_BY_RANK violation', () => {
      const entries = [
        createEntry({ rank: 1, userId: 'user-1' }),
        createEntry({ rank: 3, userId: 'user-2' }),
        createEntry({ rank: 2, userId: 'user-3' }),
      ];

      const validation = validateLeaderboardInvariants(entries);

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContain(LEADERBOARD_INVARIANTS.SORT_BY_RANK);
    });

    it('detects RANK_SEQUENTIAL violation for gaps', () => {
      const entries = [
        createEntry({ rank: 1, userId: 'user-1' }),
        createEntry({ rank: 2, userId: 'user-2' }),
        createEntry({ rank: 5, userId: 'user-3' }),
      ];

      const validation = validateLeaderboardInvariants(entries);

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContain(LEADERBOARD_INVARIANTS.RANK_SEQUENTIAL);
    });

    it('detects RANK_SEQUENTIAL violation when not starting at 1', () => {
      const entries = [
        createEntry({ rank: 2, userId: 'user-1' }),
        createEntry({ rank: 3, userId: 'user-2' }),
      ];

      const validation = validateLeaderboardInvariants(entries);

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContain(LEADERBOARD_INVARIANTS.RANK_SEQUENTIAL);
    });

    it('detects RANK_UNIQUE violation', () => {
      const entries = [
        createEntry({ rank: 1, userId: 'user-1' }),
        createEntry({ rank: 1, userId: 'user-2' }),
        createEntry({ rank: 2, userId: 'user-3' }),
      ];

      const validation = validateLeaderboardInvariants(entries);

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContain(LEADERBOARD_INVARIANTS.RANK_UNIQUE);
    });

    it('detects USER_UNIQUE violation', () => {
      const entries = [
        createEntry({ rank: 1, userId: 'user-1' }),
        createEntry({ rank: 2, userId: 'user-1' }),
        createEntry({ rank: 3, userId: 'user-3' }),
      ];

      const validation = validateLeaderboardInvariants(entries);

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContain(LEADERBOARD_INVARIANTS.USER_UNIQUE);
    });

    it('detects NON_NEGATIVE violation for negative totalStaked', () => {
      const entries = [
        createEntry({ rank: 1, userId: 'user-1', totalStaked: -100 }),
        createEntry({ rank: 2, userId: 'user-2' }),
        createEntry({ rank: 3, userId: 'user-3' }),
      ];

      const validation = validateLeaderboardInvariants(entries);

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContain(LEADERBOARD_INVARIANTS.NON_NEGATIVE);
    });

    it('detects NON_NEGATIVE violation for negative totalEarned', () => {
      const entries = [
        createEntry({ rank: 1, userId: 'user-1' }),
        createEntry({ rank: 2, userId: 'user-2', totalEarned: -5 }),
        createEntry({ rank: 3, userId: 'user-3' }),
      ];

      const validation = validateLeaderboardInvariants(entries);

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContain(LEADERBOARD_INVARIANTS.NON_NEGATIVE);
    });

    it('detects ACCURACY_RANGE violation for accuracy > 100', () => {
      const entries = [
        createEntry({ rank: 1, userId: 'user-1', accuracy: 150 }),
        createEntry({ rank: 2, userId: 'user-2' }),
        createEntry({ rank: 3, userId: 'user-3' }),
      ];

      const validation = validateLeaderboardInvariants(entries);

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContain(LEADERBOARD_INVARIANTS.ACCURACY_RANGE);
    });

    it('detects ACCURACY_RANGE violation for negative accuracy', () => {
      const entries = [
        createEntry({ rank: 1, userId: 'user-1' }),
        createEntry({ rank: 2, userId: 'user-2', accuracy: -1 }),
        createEntry({ rank: 3, userId: 'user-3' }),
      ];

      const validation = validateLeaderboardInvariants(entries);

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContain(LEADERBOARD_INVARIANTS.ACCURACY_RANGE);
    });

    it('de-duplicates violations', () => {
      // Multiple duplicate ranks should only report RANK_UNIQUE once
      const entries = [
        createEntry({ rank: 1, userId: 'user-1' }),
        createEntry({ rank: 1, userId: 'user-2' }),
        createEntry({ rank: 1, userId: 'user-3' }),
      ];

      const validation = validateLeaderboardInvariants(entries);

      const rankUniqueCount = validation.violations.filter(
        (v) => v === LEADERBOARD_INVARIANTS.RANK_UNIQUE
      ).length;
      expect(rankUniqueCount).toBe(1);
    });
  });

  describe('protocol invariant integration', () => {
    it('sortAndNormalizeLeaderboard output always satisfies all invariants', () => {
      // Simulate server data with non-sequential ranks
      const serverData = [
        createEntry({ rank: 5, userId: 'user-5', username: 'Eve' }),
        createEntry({ rank: 1, userId: 'user-1', username: 'Alice' }),
        createEntry({ rank: 3, userId: 'user-3', username: 'Carol' }),
        createEntry({ rank: 2, userId: 'user-2', username: 'Bob' }),
        createEntry({ rank: 4, userId: 'user-4', username: 'Dave' }),
      ];

      const normalized = sortAndNormalizeLeaderboard(serverData);
      const validation = validateLeaderboardInvariants(normalized);

      expect(validation.valid).toBe(true);
      expect(normalized.map((e) => e.rank)).toEqual([1, 2, 3, 4, 5]);
      expect(normalized.map((e) => e.userId)).toEqual([
        'user-1',
        'user-2',
        'user-3',
        'user-4',
        'user-5',
      ]);
    });
  });
});