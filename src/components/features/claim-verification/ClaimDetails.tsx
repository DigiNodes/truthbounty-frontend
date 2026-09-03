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
  onNotFound?: () => void;
}

export function ClaimDetails({ claimId, isLoading: externalLoading = false, onNotFound }: ClaimDetailsProps) {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Rules-of-hooks: called unconditionally. When the claim has not loaded
  // yet the address is unknown, so the hook falls back to the current user;
  // the result is only rendered once `claim` exists.
  const claimantTrust = useTrustForAddress(claim?.claimantAddress);

  useEffect(() => {
    setInternalLoading(true);
    setNotFound(false);
    getClaimById(claimId).then((data) => {
      setClaim(data);
      setInternalLoading(false);
    }).catch((err) => {
      if (err.message === 'CLAIM_NOT_FOUND') {
        setNotFound(true);
        onNotFound?.();
      }
      setInternalLoading(false);
    });
  }, [claimId, onNotFound]);

  const isLoading = externalLoading || internalLoading;

  if (isLoading && !notFound) {
    return <ClaimDetailsSkeleton />;
  }

  if (notFound) {
    return (
      <div className="card p-6 sm:p-8 text-center">
        <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Claim not found</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The claim you&apos;re looking for doesn&apos;t exist or may have been removed.
        </p>
      </div>
    );
  }

  if (!claim) {
    return <ClaimDetailsSkeleton />;
  }

  // Only warn from authoritative signals; unknown (null) never triggers a
  // warning (V2-FE-016: no fabricated verdicts).
  const lowRep =
    claimantTrust.reputation !== null && claimantTrust.reputation < 20;
  const newAcct =
    claimantTrust.accountAgeDays !== null && claimantTrust.accountAgeDays < 7;
  const lowTrustClaimant =
    !claimantTrust.isVerified ||
    lowRep ||
    newAcct ||
    claimantTrust.suspicious === true;

  return (
    <div className="space-y-3 sm:space-y-4">
      {lowTrustClaimant && (
        <div className="bg-yellow-500 text-black p-2.5 sm:p-3 rounded text-sm sm:text-base">
          ⚠️ This claim was submitted by a low‑trust account (score{' '}
          {claimantTrust.reputation ?? 'unknown'}).{' '}
          <TrustScoreTooltip />
        </div>
      )}
      <div className="card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold">{claim.title}</h2>
        <p className="text-muted text-sm sm:text-base">{claim.description}</p>

        <div className="mt-2 sm:mt-3 text-sm">
          <span>Status: </span>
          <span className="font-medium">{claim.status}</span>
        </div>
      </div>
    </div>
  );
}
