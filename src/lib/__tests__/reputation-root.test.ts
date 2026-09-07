/**
 * Unit tests for the reputation scoring helpers in '@/lib/reputation'.
 *
 * Note: an earlier draft of this file tested a not-yet-existing "reputation
 * root / proof adapter"; those exports do not exist in the current module and
 * were never shipped. The authoritative reputation logic is the threshold +
 * tier helpers below (backend/indexer-driven, never fabricated client-side).
 */
import {
  REPUTATION_THRESHOLDS,
  getReputationTier,
  getNextTier,
} from '@/lib/reputation';

describe('reputation thresholds', () => {
  it('exposes bronze/silver/gold thresholds in order', () => {
    expect(REPUTATION_THRESHOLDS.bronze).toBe(0);
    expect(REPUTATION_THRESHOLDS.silver).toBeGreaterThan(REPUTATION_THRESHOLDS.bronze);
    expect(REPUTATION_THRESHOLDS.gold).toBeGreaterThan(REPUTATION_THRESHOLDS.silver);
  });
});

describe('getReputationTier', () => {
  it('classifies scores against the thresholds', () => {
    expect(getReputationTier(0)).toBe('bronze');
    expect(getReputationTier(499)).toBe('bronze');
    expect(getReputationTier(500)).toBe('silver');
    expect(getReputationTier(1499)).toBe('silver');
    expect(getReputationTier(1500)).toBe('gold');
    expect(getReputationTier(9999)).toBe('gold');
  });
});

describe('getNextTier', () => {
  it('reports the next tier and remaining points needed', () => {
    expect(getNextTier(100)).toEqual({ nextTier: 'silver', required: 400 });
    expect(getNextTier(1200)).toEqual({ nextTier: 'gold', required: 300 });
    expect(getNextTier(500)).toEqual({ nextTier: 'gold', required: 1000 });
  });

  it('returns null when already at the highest tier', () => {
    expect(getNextTier(1500)).toBeNull();
    expect(getNextTier(5000)).toBeNull();
  });
});