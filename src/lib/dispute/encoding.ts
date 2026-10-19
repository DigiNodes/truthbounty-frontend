/**
 * V2-FE-014 — Pure encoding & validation helpers for the challenge/dispute
 * opening flow.
 *
 * Everything here is deterministic and side-effect free so it can be unit
 * tested in isolation. Calldata is produced with real viem encoding from the
 * versioned dispute artifact ABI — no synthetic selectors.
 */

import { encodeFunctionData } from 'viem';
import { disputeAbi } from '@/config/protocol/dispute-artifact';
import {
  ChallengeWindow,
  DisputeSubmissionError,
} from '@/app/types/dispute';

/** Minimum descriptive length for a challenge reason (mirrors the modal copy). */
export const MIN_CHALLENGE_REASON_LENGTH = 10;

export function nowInSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

/**
 * Normalize a frontend claim id into the on-chain uint256 id.
 * Accepts "123", "0x7b", "claim-123", "claim_123" — returns `null` when the
 * id is not resolvable so submission fails closed with `INVALID_CLAIM`.
 */
export function parseClaimIdToBigInt(claimId: string): bigint | null {
  const trimmed = claimId.trim();
  if (/^\d+$/.test(trimmed)) return BigInt(trimmed);
  const hexMatch = /^0x[0-9a-fA-F]+$/.test(trimmed)
    ? trimmed.match(/^0x([0-9a-fA-F]+)$/)
    : null;
  if (hexMatch) return BigInt(`0x${hexMatch[1]}`);
  const labelMatch = trimmed.match(/^claim[-_ ]?(\d+)$/i);
  if (labelMatch) return BigInt(labelMatch[1]);
  return null;
}

/** Collapse whitespace so the on-chain reason is stable and untrusted-free. */
export function normalizeChallengeReason(reason: string): string {
  return reason.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Calldata encoding (viem, from the versioned dispute artifact ABI)
// ---------------------------------------------------------------------------

export interface EncodeOpenChallengeArgs {
  claimId: bigint;
  reason: string;
}

export interface EncodedOpenChallenge {
  functionName: 'openChallenge';
  args: [bigint, string];
  calldata: `0x${string}`;
}

/**
 * Encode an `openChallenge(claimId, reason)` call. The bond is pulled by the
 * contract via `transferFrom`, so there is no payable value to attach.
 */
export function encodeOpenChallenge(
  args: EncodeOpenChallengeArgs
): EncodedOpenChallenge {
  const abiArgs: [bigint, string] = [
    args.claimId,
    normalizeChallengeReason(args.reason),
  ];

  return {
    functionName: 'openChallenge',
    args: abiArgs,
    calldata: encodeFunctionData({
      abi: disputeAbi,
      functionName: 'openChallenge',
      args: abiArgs,
    }),
  };
}

// ---------------------------------------------------------------------------
// Challenge window derivation
// ---------------------------------------------------------------------------

export interface ChallengeWindowSource {
  claimId: bigint;
  challengeDeadline: bigint;
  challengeBond: bigint;
  hasOpenChallenge: boolean;
  nowSeconds: bigint;
}

/**
 * Derive the challenge window from the canonical on-chain values. `isOpen` is
 * computed from the deadline and the contract's own `hasOpenChallenge` flag,
 * not from any client-side timer.
 */
export function buildChallengeWindow(
  source: ChallengeWindowSource
): ChallengeWindow {
  const isOpen =
    !source.hasOpenChallenge && source.challengeDeadline > source.nowSeconds;

  return {
    claimId: source.claimId,
    deadline: source.challengeDeadline,
    bond: source.challengeBond,
    hasOpenChallenge: source.hasOpenChallenge,
    isOpen,
  };
}

// ---------------------------------------------------------------------------
// Opening validation
// ---------------------------------------------------------------------------

export interface ValidateDisputeOpeningInput {
  reason: string;
  challengeWindow: ChallengeWindow | null;
  balance: bigint | null;
  nowSeconds: bigint;
}

export type DisputeValidationResult =
  | { ok: true }
  | { ok: false; error: DisputeSubmissionError };

export function validateDisputeOpening(
  input: ValidateDisputeOpeningInput
): DisputeValidationResult {
  const { reason, challengeWindow, balance, nowSeconds } = input;

  if (!challengeWindow) {
    return {
      ok: false,
      error: {
        code: 'PROTOCOL_DISABLED',
        message: 'The challenge protocol is not available for this chain.',
      },
    };
  }

  if (challengeWindow.hasOpenChallenge) {
    return {
      ok: false,
      error: {
        code: 'CHALLENGE_EXISTS',
        message: 'A challenge has already been opened for this claim.',
      },
    };
  }

  if (!challengeWindow.isOpen) {
    return {
      ok: false,
      error: {
        code: 'CHALLENGE_CLOSED',
        message: 'The challenge window is not open for this claim.',
      },
    };
  }

  if (challengeWindow.deadline <= nowSeconds) {
    return {
      ok: false,
      error: {
        code: 'DEADLINE_PASSED',
        message: 'The challenge deadline has passed.',
      },
    };
  }

  if (challengeWindow.bond <= 0n) {
    return {
      ok: false,
      error: {
        code: 'PROTOCOL_DISABLED',
        message: 'The challenge bond is not published for this claim.',
      },
    };
  }

  if (normalizeChallengeReason(reason).length < MIN_CHALLENGE_REASON_LENGTH) {
    return {
      ok: false,
      error: {
        code: 'INVALID_REASON',
        message: `Provide a reason of at least ${MIN_CHALLENGE_REASON_LENGTH} characters.`,
      },
    };
  }

  if (balance !== null && balance < challengeWindow.bond) {
    return {
      ok: false,
      error: {
        code: 'INSUFFICIENT_BALANCE',
        message: 'Wallet balance is below the required challenge bond.',
      },
    };
  }

  return { ok: true };
}

/** Format an ERC-20 wei amount for display (default 18 decimals). */
export function formatTokenAmount(wei: bigint, decimals = 18): string {
  const base = 10n ** BigInt(decimals);
  const whole = wei / base;
  const fraction = (wei % base).toString().padStart(decimals, '0').slice(0, 4);
  return `${whole}.${fraction}`;
}
