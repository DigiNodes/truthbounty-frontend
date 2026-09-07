"use client";

/**
 * useRewards — V2 update (V2-FE-009 + V2-FE-016)
 *
 * - claimRewards from wallet.ts throws NotImplemented pending V2-FE-003;
 *   this hook gracefully surfaces that error as an `error` state.
 * - No reward fixtures are seeded: pendingRewards is empty until the rewards
 *   indexer/contract integration (V2-FE-003) provides authoritative data.
 *   Fabricated claimable rewards were removed in V2-FE-016 (web3 cleanup).
 * - lastTxHash is typed as `0x${string} | null` — never a fabricated hash.
 */

import { useState, useCallback } from "react";
import { claimRewards } from "@/app/lib/wallet";
import {
  clearPendingTransaction,
  trackPendingTransaction,
} from '@/lib/pending-transactions';

export type ClaimStatus = "idle" | "loading" | "success" | "error";

/** A claimable reward sourced from the rewards indexer/contract. */
export interface ClaimableReward {
  claimId: string;
  title: string;
  amount: number; // in USD
}

export interface UseRewardsReturn {
  pendingRewards: ClaimableReward[];
  totalClaimable: number;
  status: ClaimStatus;
  lastTxHash: `0x${string}` | null;
  errorMessage: string | null;
  claimAll: () => Promise<void>;
}

export function useRewards(): UseRewardsReturn {
  // Rewards are only displayed when the backend/indexer supplies them;
  // no fixtures are seeded in production (V2-FE-016).
  const [pendingRewards, setPendingRewards] =
    useState<ClaimableReward[]>([]);
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalClaimable = pendingRewards.reduce((sum, r) => sum + r.amount, 0);

  const claimAll = useCallback(async () => {
    if (pendingRewards.length === 0 || status === "loading") return;

    const ids = pendingRewards.map((r) => r.claimId);
    const transactionId = `rewards:${ids.join(',')}`;

    setStatus("loading");
    setErrorMessage(null);

    // Track in pending-tx registry with v2 fields
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
      setPendingRewards([]);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: unknown) {
      clearPendingTransaction(transactionId);
      const message =
        err instanceof Error ? err.message : "Claim failed. Please try again.";
      setErrorMessage(message);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }, [pendingRewards, status]);

  return {
    pendingRewards,
    totalClaimable,
    status,
    lastTxHash,
    errorMessage,
    claimAll,
  };
}
