"use client"

import React from "react";
import { useRouter } from "next/navigation";
import TrustIndicator from "@/components/ui/TrustIndicator";
import { WebSocketIndicator } from "@/components/ui/WebSocketStatus";
import { PerformanceBudgetIndicator } from "@/components/features/PerformanceBudgetIndicator";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { WalletConnection } from "../WalletConnection";
import { FeatureFlagGate } from "@/components/providers";

const Topbar = () => {
  const router = useRouter();

  return (
    <>
      {/*
        Mobile (below lg) the fixed hamburger menu button overlaps the left
        edge of the header, so left padding reserves space for it. Below sm
        the header only keeps the wallet connection and the submit-claim
        action reachable; feed filters and secondary indicators are shown
        from sm up so nothing overflows on narrow viewports.
      */}
      <header
        className="flex items-center justify-between h-16 pl-16 pr-4 sm:pr-6 lg:pl-8 lg:pr-8 border-b border-[#232329] bg-card"
        role="banner"
      >
        <div className="flex min-w-0 items-center space-x-2 sm:space-x-4">
          <label className="sr-only" htmlFor="chain-select">Select chain</label>
          <select 
            id="chain-select"
            className="hidden min-w-0 bg-accent text-foreground px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm sm:block"
            aria-label="Select chain"
          >
            <option>All Chains</option>
          </select>
          <FeatureFlagGate flag="ADVANCED_FILTERS">
            <>
              <label className="sr-only" htmlFor="time-filter">Filter by time</label>
              <select 
                id="time-filter"
                className="hidden min-w-0 bg-accent text-foreground px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm sm:block"
                aria-label="Filter by time"
              >
                <option>All</option>
                <option>30d</option>
                <option>7d</option>
              </select>
            </>
          </FeatureFlagGate>
        </div>
        <div className="flex shrink-0 items-center space-x-2 sm:space-x-4">
          {/* WebSocket connection status (compact; secondary on mobile) */}
          <FeatureFlagGate flag="REALTIME_UPDATES">
            <span className="hidden sm:inline-flex">
              <WebSocketIndicator />
            </span>
          </FeatureFlagGate>
          {/* Frontend performance budget status */}
          <FeatureFlagGate flag="PERFORMANCE_BUDGETS">
            <PerformanceBudgetIndicator />
          </FeatureFlagGate>
          {/* Theme toggle */}
          <ThemeToggle />
          {/* brief trust indicator */}
          <FeatureFlagGate flag="TRUST_SCORE_DISPLAY">
            <span className="hidden items-center sm:inline-flex">
              <TrustIndicator />
            </span>
          </FeatureFlagGate>
          {/* Wallet connection */}
          <FeatureFlagGate flag="WALLET_CONNECTION">
            <WalletConnection />
          </FeatureFlagGate>
          {/* Submit Claim button */}
          <FeatureFlagGate flag="CLAIM_SUBMISSION">
            <button
              className="bg-[#5b5bf6] text-white px-3 sm:px-4 py-2 rounded-md font-medium text-sm hover:bg-[#6c6cf7]"
              onClick={() => router.push("/claims/new")}
              aria-label="Submit a new claim"
            >
              <span className="hidden sm:inline">+ Submit Claim</span>
              <span className="sm:hidden">+ Claim</span>
            </button>
          </FeatureFlagGate>
        </div>
      </header>
    </>
  );
};

export default Topbar;
