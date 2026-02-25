import React, { useState } from "react";
import { ClaimSubmissionForm, ClaimFormData } from "@/components/features/claim-submission";


const Topbar = () => {
  const [showClaimModal, setShowClaimModal] = useState(false);

  const handleSubmit = (data: ClaimFormData) => {
    // TODO: Integrate with backend or state
    // For now, just log
    console.log("Claim submitted:", data);
  };

  return (
    <>
      <header className="flex items-center justify-between h-16 px-8 border-b border-[#232329] bg-[#18181b]">
        <div className="flex items-center space-x-4">
          <select className="bg-[#232329] text-white px-3 py-1 rounded-md text-sm">
            <option>All Chains</option>
          </select>
          <select className="bg-[#232329] text-white px-3 py-1 rounded-md text-sm">
            <option>All</option>
            <option>30d</option>
            <option>7d</option>
          </select>
        </div>
        <div className="flex items-center space-x-4">
          {/* brief trust indicator */}
          <TrustIndicator />
          <button className="bg-[#232329] text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-[#232329]/80">Connect Wallet</button>
          <button
            className="bg-[#5b5bf6] text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-[#6c6cf7]"
            onClick={() => setShowClaimModal(true)}
          >
            + Submit Claim
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
