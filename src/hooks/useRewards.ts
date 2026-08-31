/**
 * useRewards
 *
 * Query-backed hook for managing on-chain reward state.
 *
 * Replaces the previous local-state + mock-data implementation.
 * Reward amounts come from the indexer API; no values are fabricated locally.
 *
 * V2-FE-009: trackPendingTransaction now requires txHash, chainId, and
 * machineState fields (V2 schema). These are passed with sentinel values
 * while the tx is still being prepared.
 *
 * After a successful claim transaction, the rewards.claimable cache is
 * invalidated via the canonical query key so the UI reflects on-chain truth.
 */

'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useClaimableRewards } from '@/app/queries/rewards.queries';
import { queryKeys } from '@/app/queries/queryKeys';
import { claimRewards } from '@/app/lib/wallet';
import {
  clearPendingTransaction,
  trackPendingTransaction,
} from '@/lib/pending-transactions';

export type ClaimStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseRewardsReturn {
  /** Claimable rewards from the indexer. Empty array when loading or no wallet. */
  pendingRewards: Array<{ claimId: string; title: string; amount: string }>;
  /** True while the query is fetching from the API. */
  isLoading: boolean;
  /** True if the query failed. */
  isError: boolean;
  /** Status of the claim transaction. */
  claimStatus: ClaimStatus;
  /** tx hash of the last successful claim transaction. */
  lastTxHash: `0x${string}` | null;
  /** Error message from a failed claim attempt. */
  errorMessage: string | null;
  /** Submit the claim transaction for all pending rewards. */
  claimAll: () => Promise<void>;
}

export function useRewards(): UseRewardsReturn {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const {
    data: pendingRewards = [],
    isLoading,
    isError,
  } = useClaimableRewards(address);

  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('idle');
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const claimAll = useCallback(async () => {
    if (pendingRewards.length === 0 || claimStatus === 'loading') return;
    if (!address) return; // wallet not connected

    const ids = pendingRewards.map((r) => r.claimId);
    const transactionId = `rewards:${ids.join(',')}`;

    setClaimStatus('loading');
    setErrorMessage(null);

    // Track in pending-tx registry with V2 schema fields (V2-FE-009).
    // txHash and chainId are null until the tx is submitted on-chain.
    trackPendingTransaction({
      id: transactionId,
      kind: 'rewards',
      title: 'Rewards claim pending',
      description: `Claiming ${ids.length} reward${ids.length === 1 ? '' : 's'} from your dashboard.`,
      txHash: null,       // not yet submitted
      chainId: null,      // not yet known
      machineState: 'idle',
    });

    try {
      const { txHash } = await claimRewards(ids);
      clearPendingTransaction(transactionId);
      setLastTxHash(txHash);
      setClaimStatus('success');

      // Invalidate only the rewards projection for this wallet —
      // no cache-wide churn.
      queryClient.invalidateQueries({
        queryKey: queryKeys.rewards.claimable(address),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.rewards.history(address),
      });

      setTimeout(() => setClaimStatus('idle'), 3000);
    } catch (err: unknown) {
      clearPendingTransaction(transactionId);
      const message =
        err instanceof Error ? err.message : 'Claim failed. Please try again.';
      setErrorMessage(message);
      setClaimStatus('error');
      setTimeout(() => setClaimStatus('idle'), 4000);
    }
  }, [pendingRewards, claimStatus, address, queryClient]);

  return {
    pendingRewards,
    isLoading,
    isError,
    claimStatus,
    lastTxHash,
    errorMessage,
    claimAll,
  };
}
