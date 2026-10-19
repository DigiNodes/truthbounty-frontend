import {
  displayOutcome,
  outcomeExplanations,
  sourceLabel,
  outcomeTone,
  VERIFICATION_HISTORY_OUTCOMES,
} from './model';
import type { VerificationHistoryEntry, VerificationSource } from './model';

const baseEntry: VerificationHistoryEntry = {
  id: 'v1',
  claimId: '0x123',
  title: 'Test Claim',
  outcome: 'finalized',
  amount: '0.5',
  asset: '0xETH',
  source: { kind: 'contract', block: '123', finality: 'finalized' },
  submittedAtIso: '2026-01-01T00:00:00Z',
  reorgStatus: 'none',
  freshness: { fetchedAt: '2026-01-01T00:00:00Z', stale: false },
};

describe('model', () => {
  describe('displayOutcome', () => {
    it('returns slashed for contract-sourced slashed entries', () => {
      const entry = { ...baseEntry, outcome: 'slashed' as const, source: { kind: 'contract' as const, block: '123', finality: 'finalized' as const } };
      expect(displayOutcome(entry)).toBe('slashed');
    });

    it('returns unavailable-reward for api-projection reward', () => {
      const entry = { ...baseEntry, outcome: 'reward' as const, source: { kind: 'api-projection' as const, receivedAt: Date.now(), freshness: 'unknown' } };
      expect(displayOutcome(entry)).toBe('unavailable-reward');
    });

    it('returns unavailable-reward for api-projection withdrawal', () => {
      const entry = { ...baseEntry, outcome: 'withdrawal' as const, source: { kind: 'api-projection' as const, receivedAt: Date.now(), freshness: 'unknown' } };
      expect(displayOutcome(entry)).toBe('unavailable-reward');
    });

    it('returns settlement-pending for delayed indexing', () => {
      const entry = { ...baseEntry, outcome: 'reward' as const, freshness: { ...baseEntry.freshness, delayedIndexing: true } };
      expect(displayOutcome(entry)).toBe('settlement-pending');
    });

    it('returns original outcome for other cases', () => {
      expect(displayOutcome({ ...baseEntry, outcome: 'awaiting-reveal' })).toBe('awaiting-reveal');
      expect(displayOutcome({ ...baseEntry, outcome: 'finalized' })).toBe('finalized');
      expect(displayOutcome({ ...baseEntry, outcome: 'missed-deadline' })).toBe('missed-deadline');
    });
  });

  describe('outcomeExplanations', () => {
    it('has explanations for all outcomes', () => {
      VERIFICATION_HISTORY_OUTCOMES.forEach((outcome) => {
        expect(outcomeExplanations[outcome]).toBeDefined();
        expect(outcomeExplanations[outcome].length).toBeGreaterThan(0);
      });
    });
  });

  describe('sourceLabel', () => {
    it('formats contract source correctly', () => {
      const source: VerificationSource = { kind: 'contract', block: '12345', finality: 'finalized' };
      expect(sourceLabel(source)).toBe('Contract read · finalized · block 12345');
    });

    it('formats api-projection source with projection-lag', () => {
      const source: VerificationSource = { kind: 'api-projection', receivedAt: Date.now(), freshness: 'projection-lag' };
      expect(sourceLabel(source)).toContain('API estimate');
      expect(sourceLabel(source)).toContain('projection lag');
      expect(sourceLabel(source)).toContain('not authoritative');
    });

    it('formats api-projection source with stale', () => {
      const source: VerificationSource = { kind: 'api-projection', receivedAt: Date.now(), freshness: 'stale' };
      expect(sourceLabel(source)).toContain('stale');
    });

    it('formats api-projection source with delayed-indexing', () => {
      const source: VerificationSource = { kind: 'api-projection', receivedAt: Date.now(), freshness: 'delayed-indexing' };
      expect(sourceLabel(source)).toContain('delayed indexing');
    });

    it('formats api-projection source with unknown', () => {
      const source: VerificationSource = { kind: 'api-projection', receivedAt: Date.now(), freshness: 'unknown' };
      expect(sourceLabel(source)).toContain('chain freshness unknown');
    });
  });

  describe('outcomeTone', () => {
    it('returns success for positive outcomes', () => {
      expect(outcomeTone('finalized')).toBe('success');
      expect(outcomeTone('reward')).toBe('success');
      expect(outcomeTone('withdrawal')).toBe('success');
    });

    it('returns danger for slashed', () => {
      expect(outcomeTone('slashed')).toBe('danger');
    });

    it('returns warning for pending outcomes', () => {
      expect(outcomeTone('awaiting-reveal')).toBe('warning');
      expect(outcomeTone('settlement-pending')).toBe('warning');
    });

    it('returns neutral for other outcomes', () => {
      expect(outcomeTone('missed-deadline')).toBe('neutral');
      expect(outcomeTone('unavailable-reward')).toBe('neutral');
    });
  });
});