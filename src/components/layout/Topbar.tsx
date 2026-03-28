"use client"

import React, { useState } from "react";
import { ClaimSubmissionForm, ClaimFormData } from "@/components/features/claim-submission";
import TrustIndicator from "@/components/ui/TrustIndicator";
import { WebSocketIndicator } from "@/components/ui/WebSocketStatus";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { WalletConnection } from "../WalletConnection";


const Topbar = () => {
  const [showClaimModal, setShowClaimModal] = useState(false);

  const handleSubmit = (data: ClaimFormData) => {
    // TODO: Integrate with backend or state
    // For now, just log
    console.log("Claim submitted:", data);
  };

  return (
    <>
      <header className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 border-b border-[#232329] bg-card">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <select className="bg-accent text-foreground px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm">
            <option>All Chains</option>
          </select>
          <select className="bg-accent text-foreground px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm">
            <option>All</option>
            <option>30d</option>
            <option>7d</option>
          </select>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* WebSocket connection status */}
          <WebSocketIndicator />
          {/* Theme toggle */}
          <ThemeToggle />
          {/* brief trust indicator */}
          <TrustIndicator />
          <WalletConnection />
          <button className="hidden sm:block bg-accent text-foreground px-3 sm:px-4 py-2 rounded-md font-medium text-sm hover:bg-accent/80">Connect Wallet</button>
          <button
            className="bg-[#5b5bf6] text-white px-3 sm:px-4 py-2 rounded-md font-medium text-sm hover:bg-[#6c6cf7]"
            onClick={() => setShowClaimModal(true)}
          >
            <span className="hidden sm:inline">+ Submit Claim</span>
            <span className="sm:hidden">+ Claim</span>
          </button>
        </div>
      </header>
      {showClaimModal && (
        <ClaimSubmissionForm
          onSubmit={handleSubmit}
          onClose={() => setShowClaimModal(false)}
        />
      )}
    </>
  );
};

export default Topbar;
