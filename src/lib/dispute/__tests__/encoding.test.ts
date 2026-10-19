import { decodeFunctionData, toFunctionSelector } from 'viem';
import { disputeAbi } from '@/config/protocol/dispute-artifact';
import {
  MIN_CHALLENGE_REASON_LENGTH,
  buildChallengeWindow,
  encodeOpenChallenge,
  formatTokenAmount,
  normalizeChallengeReason,
  parseClaimIdToBigInt,
  validateDisputeOpening,
} from '@/lib/dispute/encoding';
import type { ChallengeWindow } from '@/app/types/dispute';

const nowSeconds = BigInt(Math.floor(Date.now() / 1000));

const OPEN_WINDOW: ChallengeWindow = buildChallengeWindow({
  claimId: 123n,
  challengeBond: 5n * 10n ** 18n,
  challengeDeadline: nowSeconds + 86_400n,
  hasOpenChallenge: false,
  nowSeconds,
});

describe('parseClaimIdToBigInt', () => {
  it('accepts canonical numeric and labelled claim ids', () => {
    expect(parseClaimIdToBigInt('123')).toBe(123n);
    expect(parseClaimIdToBigInt('0x7b')).toBe(123n);
    expect(parseClaimIdToBigInt('claim-123')).toBe(123n);
    expect(parseClaimIdToBigInt('claim_123')).toBe(123n);
  });

  it('fails closed on an unresolvable id', () => {
    expect(parseClaimIdToBigInt('not-a-claim')).toBeNull();
    expect(parseClaimIdToBigInt('')).toBeNull();
  });
});

describe('normalizeChallengeReason', () => {
  it('collapses whitespace so the on-chain reason is stable', () => {
    expect(normalizeChallengeReason('  bad   evidence  ')).toBe('bad evidence');
  });
});

describe('encodeOpenChallenge', () => {
  const selector = toFunctionSelector('openChallenge(uint256,string)');

  it('encodes real calldata with the canonical selector', () => {
    const { calldata, args } = encodeOpenChallenge({
      claimId: 42n,
      reason: '  the   evidence was misread ',
    });

    expect(calldata.startsWith(selector)).toBe(true);
    expect(args).toEqual([42n, 'the evidence was misread']);
  });

  it('round-trips through the pinned ABI', () => {
    const { calldata } = encodeOpenChallenge({
      claimId: 7n,
      reason: 'verification ignored counter-evidence',
    });

    const decoded = decodeFunctionData({ abi: disputeAbi, data: calldata });
    expect(decoded.functionName).toBe('openChallenge');
    expect(decoded.args).toEqual([7n, 'verification ignored counter-evidence']);
  });
});

describe('buildChallengeWindow', () => {
  it('marks the window open for a future deadline without an open challenge', () => {
    expect(OPEN_WINDOW.isOpen).toBe(true);
    expect(OPEN_WINDOW.bond).toBe(5n * 10n ** 18n);
  });

  it('marks the window closed once the deadline has passed', () => {
    const closed = buildChallengeWindow({
      claimId: 1n,
      challengeBond: 1n,
      challengeDeadline: nowSeconds - 1n,
      hasOpenChallenge: false,
      nowSeconds,
    });
    expect(closed.isOpen).toBe(false);
  });

  it('marks the window closed when a challenge already exists', () => {
    const closed = buildChallengeWindow({
      claimId: 1n,
      challengeBond: 1n,
      challengeDeadline: nowSeconds + 100n,
      hasOpenChallenge: true,
      nowSeconds,
    });
    expect(closed.isOpen).toBe(false);
    expect(closed.hasOpenChallenge).toBe(true);
  });
});

describe('validateDisputeOpening', () => {
  const base = {
    reason: 'the verifier signature is invalid',
    challengeWindow: OPEN_WINDOW,
    balance: 50n * 10n ** 18n,
    nowSeconds,
  };

  it('accepts a valid opening', () => {
    expect(validateDisputeOpening(base)).toEqual({ ok: true });
  });

  it('fails closed when the challenge window is unavailable', () => {
    const result = validateDisputeOpening({ ...base, challengeWindow: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PROTOCOL_DISABLED');
  });

  it('rejects a claim that already has an open challenge', () => {
    const result = validateDisputeOpening({
      ...base,
      challengeWindow: { ...OPEN_WINDOW, hasOpenChallenge: true, isOpen: false },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CHALLENGE_EXISTS');
  });

  it('rejects a closed challenge window', () => {
    const result = validateDisputeOpening({
      ...base,
      challengeWindow: { ...OPEN_WINDOW, isOpen: false },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CHALLENGE_CLOSED');
  });

  it('rejects a passed deadline defensively', () => {
    const result = validateDisputeOpening({
      ...base,
      challengeWindow: {
        ...OPEN_WINDOW,
        deadline: nowSeconds - 1n,
        isOpen: true,
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DEADLINE_PASSED');
  });

  it('fails closed when the bond is not published', () => {
    const result = validateDisputeOpening({
      ...base,
      challengeWindow: { ...OPEN_WINDOW, bond: 0n },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PROTOCOL_DISABLED');
  });

  it('rejects a reason below the minimum length', () => {
    const result = validateDisputeOpening({ ...base, reason: 'too short' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_REASON');
    expect(MIN_CHALLENGE_REASON_LENGTH).toBeGreaterThan('too short'.length);
  });

  it('rejects a balance below the required bond', () => {
    const result = validateDisputeOpening({ ...base, balance: 1n });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INSUFFICIENT_BALANCE');
  });
});

describe('formatTokenAmount', () => {
  it('formats wei to four decimal places', () => {
    expect(formatTokenAmount(10n ** 18n)).toBe('1.0000');
    expect(formatTokenAmount(5n * 10n ** 17n)).toBe('0.5000');
    expect(formatTokenAmount(0n)).toBe('0.0000');
  });
});
