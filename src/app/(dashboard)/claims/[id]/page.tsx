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

  const handleStakeChange = (stake: string) => {
    const value = parseFloat(stake) || 0;
    setStakeAmount(value);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <ClaimDetails claimId={params.id} />
      <EvidenceViewer claimId={params.id} />
      <StakeForm claimId={params.id} onStakeChange={handleStakeChange} />
      <VerificationActions claimId={params.id} stakeAmount={stakeAmount} />
    </div>
  );
}
