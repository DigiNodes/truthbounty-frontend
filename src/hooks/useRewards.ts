"use client";
import { useState, useCallback } from "react";
import { claimableRewards, ClaimableReward } from "@/data/mock-data";
import { claimRewards } from "@/app/lib/wallet";
import {
  clearPendingTransaction,
  trackPendingTransaction,
} from '@/lib/pending-transactions';

export type ClaimStatus = "idle" | "loading" | "success" | "error";

export interface UseRewardsReturn {
  pendingRewards: ClaimableReward[];
  totalClaimable: number;
  status: ClaimStatus;
  lastTxHash: string | null;
  errorMessage: string | null;
  claimAll: () => Promise<void>;
}

export function useRewards(): UseRewardsReturn {
  const [pendingRewards, setPendingRewards] =
    useState<ClaimableReward[]>(claimableRewards);
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalClaimable = pendingRewards.reduce((sum, r) => sum + r.amount, 0);

  const claimAll = useCallback(async () => {
    if (pendingRewards.length === 0 || status === "loading") return;

    const ids = pendingRewards.map((r) => r.claimId);
    const transactionId = `rewards:${ids.join(',')}`;

    setStatus("loading");
    setErrorMessage(null);
    trackPendingTransaction({
      id: transactionId,
      kind: 'rewards',
      title: 'Rewards claim pending',
      description: `Claiming ${ids.length} reward${ids.length === 1 ? '' : 's'} from your dashboard.`,
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
