'use client';

import { useEffect, useState } from 'react';
import { getClaimById } from '@/app/lib/api';
import { Claim } from '@/app/types/claim';
import { useTrustForAddress } from '@/components/hooks/useTrust';
import TrustScoreTooltip from '@/components/ui/TrustScoreTooltip';
import { ClaimDetailsSkeleton } from '@/components/skeletons';

interface ClaimDetailsProps {
  claimId: string;
  isLoading?: boolean;
}

export function ClaimDetails({ claimId, isLoading: externalLoading = false }: ClaimDetailsProps) {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);

  useEffect(() => {
    setInternalLoading(true);
    getClaimById(claimId).then((data) => {
      setClaim(data);
      setInternalLoading(false);
    });
  }, [claimId]);

  const isLoading = externalLoading || internalLoading;

  if (isLoading) {
    return <ClaimDetailsSkeleton />;
  }

  if (!claim) return <ClaimDetailsSkeleton />;

  // compute trust for the claimant address
  const claimantTrust = useTrustForAddress(claim.claimantAddress);
  const lowRep = claimantTrust.reputation < 20;
  const newAcct = claimantTrust.accountAgeDays < 7;
  const lowTrustClaimant = !claimantTrust.isVerified || lowRep || newAcct || claimantTrust.suspicious;

  return (
    <div className="space-y-4">
      {lowTrustClaimant && (
        <div className="bg-yellow-500 text-black p-3 rounded">
          ⚠️ This claim was submitted by a low‑trust account (score{' '}
          {claimantTrust.reputation}).{' '}
          <TrustScoreTooltip />
        </div>
      )}
      <div className="card">
        <h2 className="text-xl font-semibold">{claim.title}</h2>
        <p className="text-muted">{claim.description}</p>

        <div className="mt-3 text-sm">
          <span>Status: </span>
          <span className="font-medium">{claim.status}</span>
        </div>
      </div>
    </div>
  );
}
