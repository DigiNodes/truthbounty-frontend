import {
  reconcileChallengeState,
  ReconcileChallengeInput,
} from '@/app/lib/dispute-reconcile';

const TX_HASH = '0x' + 'ab'.repeat(32);
const CHAIN = 11155420;
const CLAIM = '123';
const BOND = 5n * 10n ** 18n;

const baseInput: ReconcileChallengeInput = {
  chainId: CHAIN,
  claimId: CLAIM,
  receipt: { transactionHash: TX_HASH, status: '0x1', chainId: CHAIN },
  onChain: {
    claimId: CLAIM,
    challenger: '0x0000000000000000000000000000000000000001',
    exists: true,
    bond: BOND,
  },
  expectedBond: BOND,
};

describe('reconcileChallengeState', () => {
  it('returns idle when nothing is present', () => {
    const result = reconcileChallengeState({});
    expect(result.status).toBe('idle');
    expect(result.isMismatch).toBe(false);
  });

  it('confirms when the receipt and on-chain challenge agree', () => {
    const result = reconcileChallengeState(baseInput);
    expect(result.status).toBe('confirmed');
    expect(result.isMismatch).toBe(false);
    expect(result.isWrongNetwork).toBe(false);
    expect(result.isProtocolDisabled).toBe(false);
  });

  it('reports a rejected receipt', () => {
    const result = reconcileChallengeState({
      ...baseInput,
      receipt: { transactionHash: TX_HASH, status: '0x0', chainId: CHAIN },
    });
    expect(result.status).toBe('rejected');
    expect(result.isProtocolDisabled).toBe(true);
  });

  it('reports stale when the receipt confirmed but no challenge is visible', () => {
    const result = reconcileChallengeState({ ...baseInput, onChain: null });
    expect(result.status).toBe('stale');
    expect(result.details.join(' ')).toContain('no on-chain challenge');
  });

  it('reports stale when a challenge is visible but not yet receipt-confirmed', () => {
    const result = reconcileChallengeState({ ...baseInput, receipt: undefined });
    expect(result.status).toBe('stale');
    expect(result.details.join(' ')).toContain('not yet receipt-confirmed');
  });

  it('flags an on-chain bond that contradicts the expected bond', () => {
    const result = reconcileChallengeState({
      ...baseInput,
      onChain: { ...baseInput.onChain!, bond: 1n * 10n ** 18n },
    });
    expect(result.status).toBe('mismatch');
    expect(result.isMismatch).toBe(true);
    expect(result.details.join(' ')).toContain('contradicts');
  });

  it('flags a receipt on the wrong chain', () => {
    const result = reconcileChallengeState({
      ...baseInput,
      receipt: { transactionHash: TX_HASH, status: '0x1', chainId: 1 },
    });
    expect(result.isWrongNetwork).toBe(true);
    expect(result.details.join(' ')).toContain('different chain');
  });
});
