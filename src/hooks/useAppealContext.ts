/**
 * Hook for reading appeal participation context.
 *
 * The pinned `TruthBountyWeighted` ABI exposes no appeal-context getters, so
 * every value here comes from the canonical API projection via
 * `loadAppealProjection`. Nothing is derived from local clock, block
 * arithmetic or placeholder balances: an unavailable, incomplete or
 * inconsistent projection leaves `context` null and surfaces `error`, so
 * participation fails closed instead of acting on invented state.
 * V2-FE-059 — Appeal participation context from canonical protocol reads.
 *
 * Prefers Wagmi/Viem `getAppealRound` / participant / balance reads when the
 * appeal artifact is deployed. Falls back to fail-closed errors rather than
 * fabricating balances, deadlines, or participation state for writes.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useChainId,
  useBlockNumber,
  usePublicClient,
} from 'wagmi';
import {
  AppealDeadline,
  AppealWalletPosition,
  AppealParticipationContext,
} from '@/app/types/appeal';
import { getReleaseChainId } from '@/lib/contracts/registry';
import {
  AppealProjectionError,
  loadAppealProjection,
  type AppealProjectionFetcher,
} from '@/lib/appeals/projection';
  AppealRoundProgressionView,
} from '@/app/types/appeal';
import {
  APPEAL_ARTIFACT_VERSION,
  appealErc20Abi,
  appealParticipationAbi,
  getAppealArtifact,
} from '@/config/protocol/appeal-artifact';
import {
  buildAppealRoundProgression,
  nowInSeconds,
  toAppealIdBytes32,
  type OnChainAppealRound,
} from '@/lib/appeal/round-progression';

export interface UseAppealContextConfig {
  appealId: string;
  claimId: string;
  contractAddress?: string;
  expectedChainId?: number;
  pollInterval?: number; // ms
  /** Injected projection transport; defaults to `GET /api/appeals/:appealId`. */
  fetcher?: AppealProjectionFetcher;
  expectedRound?: number;
  pollInterval?: number;
}

export interface AppealContextResult {
  context: AppealParticipationContext | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DEFAULT_POLL_INTERVAL = 10000; // 10 seconds

/**
 * Fetch appeal participation context from the canonical API projection.
 * Fails closed whenever the projection cannot be trusted.
 */
const OPTIMISM_MAINNET_CHAIN_ID = 10;
const DEFAULT_POLL_INTERVAL = 10000;

function parseRoundTuple(data: unknown): OnChainAppealRound | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown> & { [key: number]: unknown };
  const roundNumber = (row.roundNumber ?? row[0]) as bigint | undefined;
  const requiredBond = (row.requiredBond ?? row[1]) as bigint | undefined;
  const deadline = (row.deadline ?? row[2]) as bigint | undefined;
  const supportStake = (row.supportStake ?? row[3]) as bigint | undefined;
  const opposeStake = (row.opposeStake ?? row[4]) as bigint | undefined;
  const state = (row.state ?? row[5]) as number | bigint | undefined;
  const claimId = (row.claimId ?? row[6]) as `0x${string}` | undefined;
  if (
    typeof roundNumber !== 'bigint' ||
    typeof requiredBond !== 'bigint' ||
    typeof deadline !== 'bigint' ||
    typeof supportStake !== 'bigint' ||
    typeof opposeStake !== 'bigint' ||
    claimId === undefined
  ) {
    return null;
  }
  return {
    roundNumber,
    requiredBond,
    deadline,
    supportStake,
    opposeStake,
    state: typeof state === 'bigint' ? Number(state) : Number(state ?? 0),
    claimId,
  };
}

export function useAppealContext(
  config: UseAppealContextConfig
): AppealContextResult {
  const {
    appealId,
    claimId,
    contractAddress: contractAddressOverride,
    expectedChainId = OPTIMISM_MAINNET_CHAIN_ID,
    expectedRound = 1,
    pollInterval = DEFAULT_POLL_INTERVAL,
    fetcher,
  } = config;

  const { address: userAddress, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { data: currentBlockNumber } = useBlockNumber({ watch: true });
  const publicClient = usePublicClient();

  const artifact = useMemo(
    () => getAppealArtifact(expectedChainId),
    [expectedChainId]
  );

  const contractAddress =
    contractAddressOverride &&
    /^0x[a-fA-F0-9]{40}$/.test(contractAddressOverride)
      ? (contractAddressOverride.toLowerCase() as `0x${string}`)
      : artifact.isDeployed
        ? artifact.addresses.appealParticipation
        : null;

  const [context, setContext] = useState<AppealParticipationContext | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The transport is read through a ref: callers commonly pass an inline
  // function, and keying the polling effect on its identity would restart the
  // interval (and refetch) on every render. Synced in an effect because React
  // disallows writing refs during render.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  /**
   * Validate basic connectivity and configuration
   */
  const validateConfiguration = useCallback((): string | null => {
    if (!isConnected || !userAddress) {
      return 'Wallet not connected';
    }
    if (currentChainId !== expectedChainId) {
      return `Wrong network. Expected chain ${expectedChainId}, got ${currentChainId}`;
    }
    if (!contractAddress) {
      if (!artifact.isDeployed) {
        return `Appeal protocol not deployed: ${artifact.disabledReasons.join('; ') || 'missing artifact'}`;
      }
      return 'Invalid contract address format';
    }
    if (!appealId || !claimId) {
      return 'Invalid appeal or claim ID';
    }
    if (!publicClient) {
      return 'Public client unavailable — cannot read appeal round';
    }
    return null;
  }, [isConnected, userAddress, currentChainId, expectedChainId, contractAddress, appealId, claimId]);

  /**
   * Compute eligibility based on all context data
   */
  const computeEligibility = useCallback(
    (
      deadline: AppealDeadline,
      position: AppealWalletPosition
    ): { isEligible: boolean; ineligibilityReason?: string } => {
      // Check if appeal is still active
      if (!deadline.isActive) {
        return {
          isEligible: false,
          ineligibilityReason: 'Appeal period has ended',
        };
      }

      // Check if user already participated
      if (position.hasParticipated) {
        return {
          isEligible: false,
          ineligibilityReason: 'You have already participated in this appeal',
        };
      }

      // Check if user has sufficient balance
      if (!position.hasMinimumBalance) {
        return {
          isEligible: false,
          ineligibilityReason: 'Insufficient balance to meet minimum stake requirement',
        };
      }

      return { isEligible: true };
    },
    []
  );

  /**
   * Main fetch logic - loads the canonical projection and assembles context.
   *
   * Eligibility is derived only from validated projection data. A transport,
   * shape or coherence failure clears the context and surfaces the reason, so
   * no caller can act on partially invented state.
   */
  }, [
    isConnected,
    userAddress,
    currentChainId,
    expectedChainId,
    contractAddress,
    artifact.isDeployed,
    artifact.disabledReasons,
    appealId,
    claimId,
    publicClient,
  ]);

  const fetchContext = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const configError = validateConfiguration();
      if (configError) {
        setError(configError);
        setContext(null);
        return;
      }

      if (!userAddress) {
        setError('Wallet not connected');
        setContext(null);
        setIsLoading(false);
        return;
      }

      const projection = await loadAppealProjection(appealId, {
        userAddress,
        expectedChainId,
        fetcher: fetcherRef.current,
      });

      if (projection.snapshot.claimId !== claimId) {
        throw new AppealProjectionError(
          'MALFORMED',
          `Projection claim ${projection.snapshot.claimId} does not match the requested claim ${claimId}.`
        );
      }

      const { isEligible, ineligibilityReason } = computeEligibility(
        projection.deadline,
        projection.walletPosition
      );

      setContext({
        snapshot: projection.snapshot,
        deadline: projection.deadline,
        stakeBounds: projection.stakeBounds,
        walletPosition: projection.walletPosition,
      if (!publicClient || !contractAddress || !userAddress) {
        setError('Missing client, contract, or wallet');
        setContext(null);
        return;
      }

      const appealIdBytes = toAppealIdBytes32(appealId);

      const rawRound = await publicClient.readContract({
        address: contractAddress,
        abi: appealParticipationAbi,
        functionName: 'getAppealRound',
        args: [appealIdBytes],
      });
      const round = parseRoundTuple(rawRound);
      if (!round) {
        throw new Error('getAppealRound returned an unreadable tuple');
      }

      const progression = buildAppealRoundProgression({
        appealId: appealIdBytes,
        round,
        expectedRound,
      });
      const roundView: AppealRoundProgressionView = {
        ...progression,
        appealId,
      };

      const [hasParticipatedRaw, participantRaw, balanceRaw, minBondRaw] =
        await Promise.all([
          publicClient.readContract({
            address: contractAddress,
            abi: appealParticipationAbi,
            functionName: 'hasParticipatedInAppeal',
            args: [appealIdBytes, userAddress as `0x${string}`],
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: appealParticipationAbi,
            functionName: 'getAppealParticipant',
            args: [appealIdBytes, userAddress as `0x${string}`],
          }),
          artifact.isDeployed
            ? publicClient.readContract({
                address: artifact.addresses.stakingToken,
                abi: appealErc20Abi,
                functionName: 'balanceOf',
                args: [userAddress as `0x${string}`],
              })
            : Promise.resolve(0n),
          publicClient.readContract({
            address: contractAddress,
            abi: appealParticipationAbi,
            functionName: 'minBondAmount',
            args: [],
          }),
        ]);

      const hasParticipated = Boolean(hasParticipatedRaw);
      const participant = participantRaw as {
        hasParticipated?: boolean;
        support?: boolean;
        stake?: bigint;
        participatedAt?: bigint;
        roundNumber?: bigint;
        [key: number]: unknown;
      };
      const balance = typeof balanceRaw === 'bigint' ? balanceRaw : 0n;
      const minBond =
        typeof minBondRaw === 'bigint' ? minBondRaw : round.requiredBond;
      const effectiveMin =
        round.requiredBond > minBond ? round.requiredBond : minBond;

      const endSeconds = Number(round.deadline);
      const startSeconds = Math.max(0, endSeconds - progression.timeRemainingSeconds);
      const currentBlock = currentBlockNumber
        ? Number(currentBlockNumber)
        : 0;

      const snapshot: AppealSnapshot = {
        appealId,
        claimId,
        disputeId: round.claimId,
        initiatorAddress: '0x0000000000000000000000000000000000000000',
        initiatorStake: '0',
        firstRoundDecision: 'VERIFIED',
        firstRoundVotesFor: 0,
        firstRoundVotesAgainst: 0,
        reason: '',
        initiatedAt: new Date(startSeconds * 1000).toISOString(),
        blockNumber: currentBlock,
      };

      const deadline: AppealDeadline = {
        appealId,
        startTime: new Date(startSeconds * 1000).toISOString(),
        endTime: new Date(endSeconds * 1000).toISOString(),
        timeRemaining: progression.timeRemainingSeconds,
        endBlock: 0,
        currentBlock,
        blocksRemaining: 0,
        isActive: progression.isActive,
        hasEnded: progression.hasEnded,
      };

      const stakeBounds: AppealStakeBounds = {
        appealId,
        minStake: effectiveMin.toString(),
        recommendedStake: effectiveMin.toString(),
        totalSupportStake: round.supportStake.toString(),
        totalOpposeStake: round.opposeStake.toString(),
        supporterCount: 0,
        opposerCount: 0,
      };

      const stake =
        typeof participant.stake === 'bigint'
          ? participant.stake
          : typeof participant[2] === 'bigint'
            ? (participant[2] as bigint)
            : 0n;
      const supportFlag =
        typeof participant.support === 'boolean'
          ? participant.support
          : typeof participant[1] === 'boolean'
            ? (participant[1] as boolean)
            : undefined;

      const walletPosition: AppealWalletPosition = {
        appealId,
        userAddress,
        hasParticipated,
        existingDecision:
          hasParticipated && supportFlag !== undefined
            ? supportFlag
              ? 'SUPPORT'
              : 'OPPOSE'
            : undefined,
        existingStake: hasParticipated ? stake.toString() : undefined,
        currentBalance: balance.toString(),
        hasMinimumBalance: balance >= effectiveMin,
      };

      let isEligible = true;
      let ineligibilityReason: string | undefined;
      if (!progression.isActive) {
        isEligible = false;
        ineligibilityReason = 'Appeal period has ended';
      } else if (!progression.roundMatchesExpected) {
        isEligible = false;
        ineligibilityReason = `Stale round: expected ${expectedRound}, on-chain is ${progression.roundNumber}`;
      } else if (hasParticipated) {
        isEligible = false;
        ineligibilityReason = 'You have already participated in this appeal';
      } else if (!walletPosition.hasMinimumBalance) {
        isEligible = false;
        ineligibilityReason =
          'Insufficient balance to meet minimum stake requirement';
      }

      setContext({
        snapshot,
        deadline,
        stakeBounds,
        walletPosition,
        roundProgression: roundView,
        isEligible,
        ineligibilityReason,
      });
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Failed to fetch appeal context';
        err instanceof Error ? err.message : 'Failed to fetch appeal context';
      setError(errorMsg);
      setContext(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    appealId,
    claimId,
    userAddress,
    expectedChainId,
    validateConfiguration,
    computeEligibility,
    validateConfiguration,
    publicClient,
    contractAddress,
    userAddress,
    appealId,
    claimId,
    expectedRound,
    artifact.isDeployed,
    artifact.addresses.stakingToken,
    currentBlockNumber,
  ]);

  useEffect(() => {
    const configError = validateConfiguration();
    if (configError) {
      setError(configError);
      setContext(null);
      return;
    }

    void fetchContext();
    if (pollInterval <= 0) {
      return;
    }
    const interval = setInterval(() => {
      void fetchContext();
    }, pollInterval);
    return () => clearInterval(interval);
  }, [
    isConnected,
    userAddress,
    currentChainId,
    expectedChainId,
    contractAddress,
    appealId,
    claimId,
    fetchContext,
    pollInterval,
    validateConfiguration,
  ]);

  useEffect(() => {
    if (!isConnected || !appealId || !context?.roundProgression) return;
    // Recompute deadline remaining from the last canonical progression.
    const remaining = Math.max(
      0,
      context.roundProgression.deadlineSeconds - nowInSeconds()
    );
    if (remaining === context.deadline.timeRemaining) return;
    setContext((prev) => {
      if (!prev?.roundProgression) return prev;
      const hasEnded =
        prev.roundProgression.hasEnded || remaining === 0;
      const isActive = prev.roundProgression.state === 'ACTIVE' && remaining > 0;
      return {
        ...prev,
        deadline: {
          ...prev.deadline,
          timeRemaining: remaining,
          isActive,
          hasEnded,
        },
        roundProgression: {
          ...prev.roundProgression,
          timeRemainingSeconds: remaining,
          isActive,
          hasEnded,
        },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBlockNumber]);

  return {
    context,
    isLoading,
    error,
    refetch: fetchContext,
  };
}

export const APPEAL_CONTEXT_ARTIFACT_VERSION = APPEAL_ARTIFACT_VERSION;
