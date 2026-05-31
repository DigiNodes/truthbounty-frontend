'use client';

import { useState } from 'react';
import { ClaimDetails } from "@/components/features/claim-verification/ClaimDetails";
import { EvidenceViewer } from "@/components/features/claim-verification/EvidenceViewer";
import { StakeForm } from "@/components/features/claim-verification/StakeForm";
import { VerificationActions } from "@/components/features/claim-verification/VerificationActions";

export default function ClaimDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [stakeAmount, setStakeAmount] = useState(0);
  const [claimNotFound, setClaimNotFound] = useState(false);

  const handleStakeChange = (stake: string) => {
    const value = parseFloat(stake) || 0;
    setStakeAmount(value);
  };

  const handleNotFound = () => {
    setClaimNotFound(true);
  };

  if (claimNotFound) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">404</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Claim not found</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            The claim you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <ClaimDetails claimId={params.id} onNotFound={handleNotFound} />
      <EvidenceViewer claimId={params.id} />
      <StakeForm claimId={params.id} onStakeChange={handleStakeChange} />
      <VerificationActions claimId={params.id} stakeAmount={stakeAmount} />
    </div>
  );
}
