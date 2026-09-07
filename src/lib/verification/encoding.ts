/**
 * V2-FE-013 — Pure encoding & validation helpers for the verification/stake
 * submission flow.
 *
 * Everything here is deterministic and side-effect free so it can be unit
 * tested in isolation. Calldata is produced with real viem encoding from the
 * versioned artifact ABI — no synthetic selectors or fabricated protocol state.
 */

import { encodeFunctionData } from 'viem';
import { verificationSubmissionAbi } from '@/config/protocol/verification-artifact';
import {
  VERIFICATION_VERDICT,
  VerificationDecision,
  VerificationPosition,
  VerificationVerdictValue,
  VerificationSubmissionError,
  OnChainVerification,
  VerificationRoundParams,
} from '@/app/types/verification';

// ---------------------------------------------------------------------------
// Position <-> verdict <-> decision mapping
// ---------------------------------------------------------------------------

export function positionToVerdict(
  position: VerificationPosition | null | undefined
): VerificationVerdictValue | null {
  if (position === 'TRUE') return VERIFICATION_VERDICT.TRUE;
  if (position === 'FALSE') return VERIFICATION_VERDICT.FALSE;
  return null;
}

export function verdictToPosition(
  verdict: number | bigint | null | undefined
): VerificationPosition | null {
  if (verdict === undefined || verdict === null) return null;
  const value = typeof verdict === 'bigint' ? Number(verdict) : verdict;
  if (value === VERIFICATION_VERDICT.TRUE) return 'TRUE';
  if (value === VERIFICATION_VERDICT.FALSE) return 'FALSE';
  return null;
}

export function positionToDecision(
  position: VerificationPosition | null | undefined
): VerificationDecision | null {
  if (position === 'TRUE') return 'VERIFY';
  if (position === 'FALSE') return 'REJECT';
  return null;
}

export function decisionToPosition(
  decision: VerificationDecision | null | undefined
): VerificationPosition | null {
  if (decision === 'VERIFY') return 'TRUE';
  if (decision === 'REJECT') return 'FALSE';
  return null;
}

// ---------------------------------------------------------------------------
// Calldata encoding (viem, from the versioned artifact ABI)
// ---------------------------------------------------------------------------

export interface SubmitVerificationCalldataArgs {
  claimId: bigint;
  position: VerificationPosition;
  stake: bigint;
}

export interface EncodedSubmitVerification {
  functionName: 'submitVerification';
  verdict: VerificationVerdictValue;
  args: [bigint, VerificationVerdictValue, bigint];
  calldata: `0x${string}`;
}

/**
 * Encode a `submitVerification(claimId, verdict, stakeAmount)` call.
 * `verdict` is encoded as the canonical `VerificationVerdict` enum
 * (TRUE = 0, FALSE = 1).
 */
export function encodeSubmitVerification(
  args: SubmitVerificationCalldataArgs
): EncodedSubmitVerification {
  const verdict = positionToVerdict(args.position);
  if (verdict === null) {
    throw new Error('Invalid verification position; expected TRUE or FALSE');
  }

  const abiArgs: [bigint, VerificationVerdictValue, bigint] = [
    args.claimId,
    verdict,
    args.stake,
  ];

  return {
    functionName: 'submitVerification',
    verdict,
    args: abiArgs,
    calldata: encodeFunctionData({
      abi: verificationSubmissionAbi,
      functionName: 'submitVerification',
      args: abiArgs,
    }),
  };
}

// ---------------------------------------------------------------------------
// Round parameters
// ---------------------------------------------------------------------------

export interface RoundParamsSource {
  claimId: bigint;
  claimStatus: number; // IClaimRegistry.ClaimStatus (1 = UnderVerification)
  verificationDeadline: bigint;
  minStakeAmount: bigint;
  nowSeconds: bigint;
  maxStake?: bigint | null;
  perWalletWeightCap?: bigint | null;
  parameterVersion?: bigint | null;
  roundId?: bigint;
}

/** IClaimRegistry.ClaimStatus.UnderVerification */
const CLAIM_STATUS_UNDER_VERIFICATION = 1;

/**
 * Derive the active round params for a claim from the canonical on-chain
 * state. `isOpen` is computed from the claim lifecycle + deadline, matching
 * the contract's own `VerificationWindowClosed`/`InvalidClaimState` guards.
 */
export function buildVerificationRoundParams(
  source: RoundParamsSource
): VerificationRoundParams {
  const isOpen =
    source.claimStatus === CLAIM_STATUS_UNDER_VERIFICATION &&
    source.verificationDeadline > source.nowSeconds;

  return {
    roundId: source.roundId ?? source.claimId,
    startTime: 0n,
    deadline: source.verificationDeadline,
    minStake: source.minStakeAmount,
    maxStake: source.maxStake ?? null,
    perWalletWeightCap: source.perWalletWeightCap ?? null,
    parameterVersion: source.parameterVersion ?? null,
    isOpen,
  };
}

// ---------------------------------------------------------------------------
// On-chain record parsing
// ---------------------------------------------------------------------------

export interface RawVerificationTuple {
  id: bigint;
  claimId: bigint;
  verifier: `0x${string}`;
  verdict: number;
  stake: bigint;
  submittedAt: bigint;
}

/**
 * Normalize a `Verification` tuple returned by `getVerification`.
 * Accepts either a named object or a positional array (multicall output).
 */
export function parseVerificationTuple(
  raw: RawVerificationTuple | readonly unknown[]
): OnChainVerification {
  const arr = Array.isArray(raw) ? raw : null;
  return {
    id: (arr ? arr[0] : raw.id) as bigint,
    claimId: (arr ? arr[1] : raw.claimId) as bigint,
    verifier: (arr ? arr[2] : raw.verifier) as `0x${string}`,
    verdict: Number(arr ? arr[3] : raw.verdict),
    stake: (arr ? arr[4] : raw.stake) as bigint,
    submittedAt: (arr ? arr[5] : raw.submittedAt) as bigint,
  };
}

// ---------------------------------------------------------------------------
// Submission validation (deadline, bounds, duplicate prevention)
// ---------------------------------------------------------------------------

export interface ValidateVerificationSubmissionInput {
  position: VerificationPosition | null | undefined;
  stake: bigint;
  roundParams: VerificationRoundParams | null;
  hasVerified: boolean;
  nowSeconds: bigint;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: VerificationSubmissionError };

export function validateVerificationSubmission(
  input: ValidateVerificationSubmissionInput
): ValidationResult {
  const { position, stake, roundParams, hasVerified, nowSeconds } = input;

  if (position !== 'TRUE' && position !== 'FALSE') {
    return {
      ok: false,
      error: {
        code: 'INVALID_POSITION',
        message: 'A verification position must be TRUE or FALSE.',
      },
    };
  }

  if (!roundParams) {
    return {
      ok: false,
      error: {
        code: 'PROTOCOL_DISABLED',
        message: 'Verification protocol is not deployed for this chain.',
      },
    };
  }

  if (hasVerified) {
    return {
      ok: false,
      error: {
        code: 'ALREADY_VERIFIED',
        message: 'This address already submitted a verification in this round.',
      },
    };
  }

  if (!roundParams.isOpen) {
    return {
      ok: false,
      error: {
        code: 'VERIFICATION_CLOSED',
        message: 'The claim is not in an open verification window.',
      },
    };
  }

  if (roundParams.deadline <= nowSeconds) {
    return {
      ok: false,
      error: {
        code: 'DEADLINE_PASSED',
        message: 'The verification deadline has passed.',
      },
    };
  }

  if (stake < roundParams.minStake) {
    return {
      ok: false,
      error: {
        code: 'STAKE_BELOW_MIN',
        message: `Stake must be at least ${roundParams.minStake.toString()} wei.`,
      },
    };
  }

  if (roundParams.maxStake !== null && stake > roundParams.maxStake) {
    return {
      ok: false,
      error: {
        code: 'STAKE_ABOVE_MAX',
        message: `Stake must not exceed ${roundParams.maxStake.toString()} wei.`,
      },
    };
  }

  return { ok: true };
}

export function nowInSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}
