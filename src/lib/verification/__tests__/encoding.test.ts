import { toFunctionSelector } from 'viem';
import {
  buildVerificationRoundParams,
  decisionToPosition,
  encodeSubmitVerification,
  parseVerificationTuple,
  positionToDecision,
  positionToVerdict,
  validateVerificationSubmission,
  verdictToPosition,
} from '@/lib/verification/encoding';

const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
const OPEN_ROUND = buildVerificationRoundParams({
  claimId: 123n,
  claimStatus: 1,
  verificationDeadline: nowSeconds + 86_400n,
  minStakeAmount: 1n * 10n ** 18n,
  nowSeconds,
});

describe('position <-> verdict mapping', () => {
  it('maps TRUE/FALSE to the canonical enum values', () => {
    expect(positionToVerdict('TRUE')).toBe(0);
    expect(positionToVerdict('FALSE')).toBe(1);
    expect(positionToVerdict(null)).toBeNull();
  });

  it('maps verdicts back to positions', () => {
    expect(verdictToPosition(0)).toBe('TRUE');
    expect(verdictToPosition(1)).toBe('FALSE');
    expect(verdictToPosition(2)).toBeNull();
    expect(verdictToPosition(undefined)).toBeNull();
  });

  it('maps positions to UI decisions and back', () => {
    expect(positionToDecision('TRUE')).toBe('VERIFY');
    expect(positionToDecision('FALSE')).toBe('REJECT');
    expect(decisionToPosition('VERIFY')).toBe('TRUE');
    expect(decisionToPosition('REJECT')).toBe('FALSE');
    expect(decisionToPosition(null)).toBeNull();
  });
});

describe('encodeSubmitVerification', () => {
  const selector = toFunctionSelector('submitVerification(uint256,uint8,uint256)');

  it('encodes real calldata with the canonical selector and verdict enum', () => {
    const stake = 100n * 10n ** 18n;
    const { calldata, verdict, args } = encodeSubmitVerification({
      claimId: 42n,
      position: 'TRUE',
      stake,
    });

    expect(verdict).toBe(0);
    expect(args).toEqual([42n, 0, stake]);
    expect(calldata.startsWith(selector)).toBe(true);
    // claimId word
    expect(calldata.slice(10, 74)).toBe(
      '000000000000000000000000000000000000000000000000000000000000002a'
    );
    // verdict word (TRUE = 0)
    expect(calldata.slice(74, 138)).toBe(
      '0000000000000000000000000000000000000000000000000000000000000000'
    );
    // stake word
    expect(calldata.slice(138, 202)).toBe(stake.toString(16).padStart(64, '0'));
  });

  it('encodes FALSE as verdict 1', () => {
    const { verdict, calldata } = encodeSubmitVerification({
      claimId: 7n,
      position: 'FALSE',
      stake: 5n * 10n ** 18n,
    });
    expect(verdict).toBe(1);
    expect(calldata.slice(74, 138)).toBe(
      '0000000000000000000000000000000000000000000000000000000000000001'
    );
  });

  it('throws on an invalid position', () => {
    expect(() =>
      encodeSubmitVerification({
        claimId: 1n,
        position: 'MAYBE' as never,
        stake: 1n,
      })
    ).toThrow(/Invalid verification position/);
  });
});

describe('parseVerificationTuple', () => {
  it('parses a named tuple', () => {
    const parsed = parseVerificationTuple({
      id: 9n,
      claimId: 3n,
      verifier: '0x0000000000000000000000000000000000000001',
      verdict: 1,
      stake: 2n * 10n ** 18n,
      submittedAt: 1700000000n,
    });
    expect(parsed.verdict).toBe(1);
    expect(parsed.verifier).toBe('0x0000000000000000000000000000000000000001');
  });

  it('parses a positional array (multicall output)', () => {
    const parsed = parseVerificationTuple([
      9n,
      3n,
      '0x0000000000000000000000000000000000000001',
      0,
      2n * 10n ** 18n,
      1700000000n,
    ]);
    expect(parsed.verdict).toBe(0);
    expect(parsed.claimId).toBe(3n);
  });
});

describe('buildVerificationRoundParams', () => {
  it('marks the round open for UnderVerification with a future deadline', () => {
    const round = buildVerificationRoundParams({
      claimId: 1n,
      claimStatus: 1,
      verificationDeadline: nowSeconds + 10n,
      minStakeAmount: 1n,
      nowSeconds,
    });
    expect(round.isOpen).toBe(true);
    expect(round.minStake).toBe(1n);
    expect(round.roundId).toBe(1n);
  });

  it('marks the round closed when the deadline has passed', () => {
    const round = buildVerificationRoundParams({
      claimId: 1n,
      claimStatus: 1,
      verificationDeadline: nowSeconds - 10n,
      minStakeAmount: 1n,
      nowSeconds,
    });
    expect(round.isOpen).toBe(false);
  });

  it('marks the round closed for a non-UnderVerification status', () => {
    const round = buildVerificationRoundParams({
      claimId: 1n,
      claimStatus: 2,
      verificationDeadline: nowSeconds + 10n,
      minStakeAmount: 1n,
      nowSeconds,
    });
    expect(round.isOpen).toBe(false);
  });
});

describe('validateVerificationSubmission', () => {
  const base = {
    position: 'TRUE' as const,
    stake: 2n * 10n ** 18n,
    roundParams: OPEN_ROUND,
    hasVerified: false,
    nowSeconds,
  };

  it('accepts a valid submission', () => {
    const result = validateVerificationSubmission(base);
    expect(result).toEqual({ ok: true });
  });

  it('rejects an invalid position', () => {
    const result = validateVerificationSubmission({ ...base, position: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_POSITION');
  });

  it('fails closed when round params are unavailable', () => {
    const result = validateVerificationSubmission({ ...base, roundParams: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PROTOCOL_DISABLED');
  });

  it('prevents duplicate positions from the same wallet', () => {
    const result = validateVerificationSubmission({ ...base, hasVerified: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ALREADY_VERIFIED');
  });

  it('rejects a closed round', () => {
    const closed = buildVerificationRoundParams({
      claimId: 1n,
      claimStatus: 2,
      verificationDeadline: nowSeconds + 100n,
      minStakeAmount: 1n,
      nowSeconds,
    });
    const result = validateVerificationSubmission({ ...base, roundParams: closed });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VERIFICATION_CLOSED');
  });

  it('rejects when the deadline has passed (defensive check)', () => {
    const expired = { ...OPEN_ROUND, deadline: nowSeconds - 1n, isOpen: true };
    const result = validateVerificationSubmission({ ...base, roundParams: expired });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DEADLINE_PASSED');
  });

  it('enforces the minimum stake', () => {
    const result = validateVerificationSubmission({ ...base, stake: 0n });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('STAKE_BELOW_MIN');
  });

  it('enforces the protocol max stake cap when published', () => {
    const capped = { ...OPEN_ROUND, maxStake: 5n * 10n ** 18n };
    const result = validateVerificationSubmission({
      ...base,
      roundParams: capped,
      stake: 6n * 10n ** 18n,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('STAKE_ABOVE_MAX');
  });
});
