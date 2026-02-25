"use client";

import React, { useState } from "react";
import { useTrust } from "@/components/hooks/useTrust";
import TrustScoreTooltip from "./TrustScoreTooltip";
import TrustExplanationModal from "./TrustExplanationModal";

export default function TrustWarningBanner() {
  const { isVerified, reputation, accountAgeDays, suspicious } = useTrust();
  const [showExplanation, setShowExplanation] = useState(false);

  const lowReputation = reputation < 20;
  const newWallet = accountAgeDays < 7;
  const lowTrust = !isVerified || lowReputation || newWallet || suspicious;

  if (!lowTrust) return null;

  // build message pieces
  const warnings: string[] = [];
  if (!isVerified) warnings.push("you have not completed identity verification");
  if (lowReputation) warnings.push(`your reputation score is only ${reputation}`);
  if (newWallet) warnings.push("this wallet is very new");
  if (suspicious) warnings.push("suspicious activity has been detected");

  return (
    <>
      <div className="bg-yellow-500 text-black px-8 py-3 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="font-semibold flex items-center gap-1">
            ⚠️ Low trust account{' '}
            <TrustScoreTooltip />
          </div>
          <div className="text-sm mt-1">
            {warnings.join(', ')}. Please verify your identity and follow our
            guidelines to improve your reputation.
          </div>
        </div>
        <button
          className="underline text-sm"
          onClick={() => setShowExplanation(true)}
        >
          Learn more
        </button>
      </div>
      {showExplanation && (
        <TrustExplanationModal onClose={() => setShowExplanation(false)} />
      )}
    </>
  );
}
