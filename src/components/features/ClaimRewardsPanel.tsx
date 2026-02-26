"use client";
import React from "react";
import { useRewards } from "@/hooks/useRewards";

export default function ClaimRewardsPanel() {
  const {
    pendingRewards,
    totalClaimable,
    status,
    lastTxHash,
    errorMessage,
    claimAll,
  } = useRewards();

  const hasRewards = totalClaimable > 0;
  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="bg-[#18181b] rounded-xl border border-[#232329] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#232329]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#5b5bf6]/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1l1.94 3.93L14 5.27l-3 2.93.71 4.13L8 10.27l-3.71 2.06.71-4.13L2 5.27l4.06-.34L8 1z"
                fill="#5b5bf6"
              />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">
              Claimable Rewards
            </p>
            <p className="text-[#a1a1aa] text-xs">
              Earned from verified claims
            </p>
          </div>
        </div>

        {/* Total + Claim button */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-[#a1a1aa]">Total available</p>
            <p
              className={`text-xl font-bold transition-colors ${
                hasRewards ? "text-[#5b5bf6]" : "text-[#a1a1aa]"
              }`}
            >
              ${totalClaimable.toFixed(2)}
            </p>
          </div>

          <button
            onClick={claimAll}
            disabled={!hasRewards || isLoading || isSuccess}
            className={`
              relative px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200
              flex items-center gap-2 min-w-[140px] justify-center
              ${
                isSuccess
                  ? "bg-green-500/20 text-green-400 border border-green-500/30 cursor-default"
                  : isError
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : hasRewards && !isLoading
                      ? "bg-[#5b5bf6] text-white hover:bg-[#4a4ae5] hover:shadow-lg hover:shadow-[#5b5bf6]/20 active:scale-95"
                      : "bg-[#232329] text-[#a1a1aa] cursor-not-allowed border border-[#232329]"
              }
            `}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Claiming…
              </>
            ) : isSuccess ? (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8l3.5 3.5L13 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Claimed!
              </>
            ) : isError ? (
              "Retry"
            ) : (
              "Claim Rewards"
            )}
          </button>
        </div>
      </div>

      {/* Reward list */}
      <div className="divide-y divide-[#232329]">
        {pendingRewards.length === 0 ? (
          <div className="px-6 py-8 flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-full bg-[#232329] flex items-center justify-center mb-1">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1l1.94 3.93L14 5.27l-3 2.93.71 4.13L8 10.27l-3.71 2.06.71-4.13L2 5.27l4.06-.34L8 1z"
                  stroke="#a1a1aa"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>
            </div>
            <p className="text-[#a1a1aa] text-sm">No unclaimed rewards</p>
            <p className="text-[#71717a] text-xs">
              Rewards appear here once your verified claims are settled.
            </p>
          </div>
        ) : (
          pendingRewards.map((reward) => (
            <div
              key={reward.claimId}
              className="flex items-center justify-between px-6 py-3 hover:bg-[#232329]/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full bg-[#5b5bf6] shrink-0" />
                <p className="text-white text-sm truncate">{reward.title}</p>
              </div>
              <span className="text-[#5b5bf6] font-semibold text-sm ml-4 shrink-0">
                +${reward.amount.toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Status footer */}
      {(isSuccess && lastTxHash) || isError ? (
        <div
          className={`px-6 py-3 text-xs border-t ${
            isSuccess
              ? "border-green-900/30 bg-green-900/10 text-green-400"
              : "border-red-900/30 bg-red-900/10 text-red-400"
          }`}
        >
          {isSuccess && lastTxHash ? (
            <>
              ✓ Transaction confirmed &nbsp;
              <span className="font-mono opacity-70">
                {lastTxHash.slice(0, 18)}…{lastTxHash.slice(-6)}
              </span>
            </>
          ) : (
            <>⚠ {errorMessage}</>
          )}
        </div>
      ) : null}
    </div>
  );
}
