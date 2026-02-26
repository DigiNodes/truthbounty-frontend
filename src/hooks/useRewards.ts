"use client";
import { useState, useCallback } from "react";
import { claimableRewards, ClaimableReward } from "@/data/mock-data";
import { claimRewards } from "@/app/lib/wallet";

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

    setStatus("loading");
    setErrorMessage(null);

    try {
      const { txHash } = await claimRewards(ids);
      setLastTxHash(txHash);
      setPendingRewards([]); // balance cleared after successful claim
      setStatus("success");

      // Auto-reset button label after 3s (stays disabled — no more rewards)
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Claim failed. Please try again.";
      setErrorMessage(message);
      setStatus("error");

      // Auto-reset error state after 4s so the user can retry
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
