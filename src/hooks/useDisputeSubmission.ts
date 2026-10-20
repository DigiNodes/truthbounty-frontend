/**
 * V2-FE-014 — Challenge / dispute opening hook (useDisputeSubmission).
 *
 * Orchestrates the full canonical challenge flow on Optimism/EVM:
 *
 *   1. validate   — connection, chain, deployment release, challenge window,
 *                   deadline, duplicate-prevention (hasOpenChallenge)
 *   2. allowance  — read ERC-20 allowance; approve (max uint256) when short
 *   3. simulating — eth_call simulation via the public client
 *   4. confirming — write `openChallenge` and await the receipt
 *   5. reconciling— read effective on-chain challenge state and reconcile it
 *                   with the confirmed receipt
 *
 * The bond is pulled by the contract via `transferFrom`, so it requires an
 * allowance — it is never attached as payable value.
 *
 * The hook fails closed: when the dispute artifact is not pinned for the active
 * chain (`getDisputeArtifact(...).isDeployed === false`), every submission path
 * returns `PROTOCOL_DISABLED` and no calldata is produced.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { maxUint256 } from 'viem';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import {
  DisputeArtifact,
  disputeAbi,
  erc20Abi,
  getDisputeArtifact,
} from '@/config/protocol/dispute-artifact';
import {
  ChallengeWindow,
  DisputeReconciliation,
  DisputeSubmissionError,
  DisputeSubmissionPhase,
  EffectiveChallengeState,
} from '@/app/types/dispute';
import {
  buildChallengeWindow,
  encodeOpenChallenge,
  nowInSeconds,
  parseClaimIdToBigInt,
  validateDisputeOpening,
} from '@/lib/dispute/encoding';
import {
  ReceiptLike,
  reconcileChallengeState,
} from '@/app/lib/dispute-reconcile';

export interface UseDisputeSubmissionConfig {
  /** On-chain claim id (uint256), or a "claim-<n>" style id. */
  claimId: string;
  /** Expected chain id; defaults to the active wallet chain. */
  chainId?: number;
  /** Poll interval for refreshing protocol state (ms). Default 15s. */
  pollInterval?: number;
  /** When false, protocol reads are skipped (e.g. the modal is closed). */
  enabled?: boolean;
}

export interface SubmitDisputeInput {
  /** Human-readable reason for challenging the claim. */
  reason: string;
}

export interface DisputeSubmissionOutcome {
  transactionHash: string;
  phase: DisputeSubmissionPhase;
  reconciliation: DisputeReconciliation | null;
}

export interface UseDisputeSubmissionResult {
  artifact: DisputeArtifact;
  phase: DisputeSubmissionPhase;
  error: DisputeSubmissionError | null;
  challengeWindow: ChallengeWindow | null;
  effectiveChallenge: EffectiveChallengeState | null;
  allowance: bigint | null;
  balance: bigint | null;
  reconciliation: DisputeReconciliation | null;
  lastTxHash: string | null;
  isLoading: boolean;
  isConnected: boolean;
  isWrongNetwork: boolean;
  submitDispute: (input: SubmitDisputeInput) => Promise<DisputeSubmissionOutcome>;
  refreshState: () => Promise<void>;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface PollableReceipt {
  status: '0x1' | '0x0' | string;
  transactionHash: string;
  blockNumber?: bigint;
  [key: string]: unknown;
}

interface PollableClient {
  getTransactionReceipt(args: {
    hash: `0x${string}`;
  }): Promise<PollableReceipt | null>;
  simulateContract?(args: unknown): Promise<unknown>;
}

const DEFAULT_RECEIPT_TIMEOUT_MS = 300_000;

async function waitForReceipt(
  txHash: `0x${string}`,
  client: PollableClient,
  pollInterval: number,
  timeoutMs = DEFAULT_RECEIPT_TIMEOUT_MS
): Promise<PollableReceipt | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      if (receipt) return receipt;
    } catch {
      // Not mined yet — keep polling.
    }
    await sleep(pollInterval);
  }
  return null;
}

function extractRevertReason(err: unknown): string {
  if (err && typeof err === 'object') {
    const candidate = err as { shortMessage?: unknown; message?: unknown };
    if (typeof candidate.shortMessage === 'string') return candidate.shortMessage;
    if (typeof candidate.message === 'string') return candidate.message;
  }
  return 'Transaction failed';
}

function asDisputeError(
  code: DisputeSubmissionError['code'],
  message: string
): DisputeSubmissionError {
  return { code, message };
}

export function useDisputeSubmission(
  config: UseDisputeSubmissionConfig
): UseDisputeSubmissionResult {
  const {
    claimId,
    chainId,
    pollInterval = 15_000,
    enabled = true,
  } = config;

  const { address, isConnected } = useAccount();
  const activeChainId = useChainId();
  const publicClient = usePublicClient() as PollableClient | undefined;
  const { writeContractAsync } = useWriteContract();

  const expectedChainId = chainId ?? activeChainId;
  const artifact = useMemo(
    () => getDisputeArtifact(expectedChainId),
    [expectedChainId]
  );
  const isDeployed = artifact.isDeployed;
  /** Reads only run while enabled (modal open) and the artifact is pinned. */
  const readsEnabled = enabled && isDeployed;

  const contractAddress = readsEnabled ? artifact.addresses.dispute : undefined;
  const tokenAddress = readsEnabled
    ? artifact.addresses.stakingToken
    : undefined;

  const claimIdBigInt = useMemo(
    () => parseClaimIdToBigInt(claimId),
    [claimId]
  );

  const [phase, setPhase] = useState<DisputeSubmissionPhase>('idle');
  const [error, setError] = useState<DisputeSubmissionError | null>(null);
  const [reconciliation, setReconciliation] =
    useState<DisputeReconciliation | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [challengeWindow, setChallengeWindow] = useState<ChallengeWindow | null>(
    null
  );
  const [effectiveChallenge, setEffectiveChallenge] =
    useState<EffectiveChallengeState | null>(null);

  // -------------------------------------------------------------------------
  // On-chain reads (fail closed when the artifact is not deployed)
  // -------------------------------------------------------------------------

  const bondRead = useReadContract({
    address: contractAddress,
    abi: disputeAbi,
    functionName: 'getChallengeBond',
    args: claimIdBigInt !== null ? [claimIdBigInt] : undefined,
    query: { enabled: readsEnabled && claimIdBigInt !== null },
  });

  const deadlineRead = useReadContract({
    address: contractAddress,
    abi: disputeAbi,
    functionName: 'getChallengeDeadline',
    args: claimIdBigInt !== null ? [claimIdBigInt] : undefined,
    query: { enabled: readsEnabled && claimIdBigInt !== null },
  });

  const hasOpenChallengeRead = useReadContract({
    address: contractAddress,
    abi: disputeAbi,
    functionName: 'hasOpenChallenge',
    args: claimIdBigInt !== null ? [claimIdBigInt] : undefined,
    query: { enabled: readsEnabled && claimIdBigInt !== null },
  });

  const allowanceRead = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args:
      address && contractAddress
        ? [address as `0x${string}`, contractAddress]
        : undefined,
    query: {
      enabled: readsEnabled && Boolean(address) && Boolean(contractAddress),
    },
  });

  const balanceRead = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: readsEnabled && Boolean(address) },
  });

  // Re-derive the challenge window whenever a canonical input changes. When
  // the protocol is not deployed or reads are still loading, the window stays
  // `null` so validation fails closed instead of guessing.
  useEffect(() => {
    if (
      !readsEnabled ||
      claimIdBigInt === null ||
      bondRead.data === undefined ||
      deadlineRead.data === undefined ||
      hasOpenChallengeRead.data === undefined
    ) {
      setChallengeWindow(null);
      return;
    }
    setChallengeWindow(
      buildChallengeWindow({
        claimId: claimIdBigInt,
        challengeBond: bondRead.data as bigint,
        challengeDeadline: deadlineRead.data as bigint,
        hasOpenChallenge: Boolean(hasOpenChallengeRead.data),
        nowSeconds: nowInSeconds(),
      })
    );
  }, [
    readsEnabled,
    claimIdBigInt,
    bondRead.data,
    deadlineRead.data,
    hasOpenChallengeRead.data,
  ]);

  useEffect(() => {
    if (!readsEnabled || claimIdBigInt === null) {
      setEffectiveChallenge(null);
      return;
    }
    setEffectiveChallenge({
      claimId: claimIdBigInt.toString(),
      challenger: null,
      exists: Boolean(hasOpenChallengeRead.data),
      bond: (bondRead.data as bigint | undefined) ?? 0n,
    });
  }, [readsEnabled, claimIdBigInt, hasOpenChallengeRead.data, bondRead.data]);

  const refreshState = useCallback(async () => {
    await Promise.all([
      bondRead.refetch(),
      deadlineRead.refetch(),
      hasOpenChallengeRead.refetch(),
      allowanceRead.refetch(),
      balanceRead.refetch(),
    ]);
  }, [
    bondRead.refetch,
    deadlineRead.refetch,
    hasOpenChallengeRead.refetch,
    allowanceRead.refetch,
    balanceRead.refetch,
  ]);

  // -------------------------------------------------------------------------
  // Poll protocol state while connected & deployed
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isConnected || !readsEnabled || claimIdBigInt === null) return;
    void refreshState();
    if (pollInterval <= 0) return;
    const interval = setInterval(() => void refreshState(), pollInterval);
    return () => clearInterval(interval);
  }, [isConnected, readsEnabled, claimIdBigInt, refreshState, pollInterval]);

  // -------------------------------------------------------------------------
  // Submission state machine
  // -------------------------------------------------------------------------

  const submitDispute = useCallback(
    async (input: SubmitDisputeInput): Promise<DisputeSubmissionOutcome> => {
      setError(null);
      setReconciliation(null);

      const fail = (
        code: DisputeSubmissionError['code'],
        message: string
      ): never => {
        const err = asDisputeError(code, message);
        setPhase('error');
        setError(err);
        throw err;
      };

      if (!isConnected || !address) {
        return fail('UNCONNECTED', 'Wallet not connected.');
      }

      if (expectedChainId !== activeChainId) {
        return fail(
          'WRONG_NETWORK',
          `Wrong network. Expected chain ${expectedChainId}, got ${activeChainId}.`
        );
      }

      if (!isDeployed) {
        const reason = artifact.disabledReasons[0] ?? 'deployment not pinned';
        return fail(
          'PROTOCOL_DISABLED',
          `Challenge protocol is not available: ${reason}.`
        );
      }

      if (claimIdBigInt === null) {
        return fail(
          'INVALID_CLAIM',
          `Claim id "${claimId}" is not a valid on-chain claim id.`
        );
      }

      if (!contractAddress || !tokenAddress) {
        return fail(
          'PROTOCOL_DISABLED',
          'Challenge protocol addresses are not pinned for this chain.'
        );
      }

      setPhase('validating');

      const validation = validateDisputeOpening({
        reason: input.reason,
        challengeWindow,
        balance: (balanceRead.data as bigint | undefined) ?? null,
        nowSeconds: nowInSeconds(),
      });
      if (!validation.ok) {
        setPhase('error');
        setError(validation.error);
        throw validation.error;
      }

      const bond = challengeWindow!.bond;
      const encoded = encodeOpenChallenge({
        claimId: claimIdBigInt,
        reason: input.reason,
      });

      // ------------------------------------------------------------------
      // Allowance + approval
      // ------------------------------------------------------------------
      setPhase('allowance');
      let currentAllowance = allowanceRead.data as bigint | undefined;
      if (currentAllowance === undefined || currentAllowance < bond) {
        setPhase('approving');
        try {
          await writeContractAsync({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [contractAddress, maxUint256],
          });
        } catch (err) {
          return fail(
            'APPROVAL_REJECTED',
            `Bond approval was rejected: ${extractRevertReason(err)}`
          );
        }
        // Read the refreshed allowance from the refetch result; `.data` is
        // still the pre-approval value until React re-renders.
        const refreshedAllowance = await allowanceRead.refetch();
        currentAllowance = refreshedAllowance.data as bigint | undefined;
        if (currentAllowance === undefined || currentAllowance < bond) {
          return fail(
            'APPROVAL_REJECTED',
            'Bond allowance did not update after approval.'
          );
        }
      }

      // ------------------------------------------------------------------
      // Simulation (eth_call) — catch reverts before spending gas
      // ------------------------------------------------------------------
      setPhase('simulating');
      if (!publicClient?.simulateContract) {
        return fail(
          'SIMULATION_REVERTED',
          'Public client is unavailable for simulation.'
        );
      }
      try {
        await publicClient.simulateContract({
          address: contractAddress,
          abi: disputeAbi,
          functionName: 'openChallenge',
          args: encoded.args,
          account: address as `0x${string}`,
        });
      } catch (err) {
        return fail(
          'SIMULATION_REVERTED',
          `Simulation reverted: ${extractRevertReason(err)}`
        );
      }

      // ------------------------------------------------------------------
      // Confirmation
      // ------------------------------------------------------------------
      setPhase('confirming');
      let txHash: `0x${string}`;
      try {
        txHash = await writeContractAsync({
          address: contractAddress,
          abi: disputeAbi,
          functionName: 'openChallenge',
          args: encoded.args,
        });
      } catch (err) {
        return fail(
          'SUBMISSION_REJECTED',
          `Challenge submission was rejected by the wallet: ${extractRevertReason(err)}`
        );
      }
      setLastTxHash(txHash);

      const receipt = await waitForReceipt(
        txHash,
        publicClient,
        Math.min(pollInterval, 2_000)
      );

      if (!receipt || receipt.status === '0x0') {
        setPhase('rejected');
        const err = asDisputeError(
          'SUBMISSION_REJECTED',
          'The challenge transaction was reverted on-chain.'
        );
        setError(err);
        const rejected = reconcileChallengeState({
          chainId: activeChainId,
          claimId: claimIdBigInt.toString(),
          receipt: { transactionHash: txHash, status: receipt?.status ?? '0x0' },
        });
        setReconciliation(rejected);
        return { transactionHash: txHash, phase: 'rejected', reconciliation: rejected };
      }

      // ------------------------------------------------------------------
      // Reconcile the confirmed receipt with the effective on-chain state
      // ------------------------------------------------------------------
      // Use the refetch result itself: `hasOpenChallengeRead.data` still holds
      // the pre-write value until React re-renders, which would report a
      // confirmed receipt as stale.
      const refreshed = await hasOpenChallengeRead.refetch();
      setPhase('reconciling');

      const receiptLike: ReceiptLike = {
        transactionHash: txHash,
        status: receipt.status,
        chainId: activeChainId,
      };
      const result = reconcileChallengeState({
        chainId: activeChainId,
        claimId: claimIdBigInt.toString(),
        receipt: receiptLike,
        onChain: {
          claimId: claimIdBigInt.toString(),
          challenger: address as `0x${string}`,
          exists: Boolean(refreshed.data),
          bond,
        },
        expectedBond: bond,
      });

      setReconciliation(result);
      const resolvedPhase: DisputeSubmissionPhase =
        result.status === 'confirmed'
          ? 'confirmed'
          : result.status === 'mismatch'
            ? 'mismatch'
            : 'stale';
      setPhase(resolvedPhase);
      return { transactionHash: txHash, phase: resolvedPhase, reconciliation: result };
    },
    [
      address,
      isConnected,
      expectedChainId,
      activeChainId,
      isDeployed,
      artifact.disabledReasons,
      claimId,
      claimIdBigInt,
      contractAddress,
      tokenAddress,
      challengeWindow,
      allowanceRead.data,
      allowanceRead.refetch,
      balanceRead.data,
      hasOpenChallengeRead.data,
      hasOpenChallengeRead.refetch,
      publicClient,
      writeContractAsync,
      pollInterval,
    ]
  );

  const isWrongNetwork =
    isConnected && typeof chainId === 'number' && chainId !== activeChainId;

  const isLoading =
    bondRead.isLoading ||
    deadlineRead.isLoading ||
    hasOpenChallengeRead.isLoading ||
    allowanceRead.isLoading ||
    balanceRead.isLoading;

  return {
    artifact,
    phase,
    error,
    challengeWindow,
    effectiveChallenge,
    allowance: (allowanceRead.data as bigint | undefined) ?? null,
    balance: (balanceRead.data as bigint | undefined) ?? null,
    reconciliation,
    lastTxHash,
    isLoading,
    isConnected,
    isWrongNetwork,
    submitDispute,
    refreshState,
  };
}
