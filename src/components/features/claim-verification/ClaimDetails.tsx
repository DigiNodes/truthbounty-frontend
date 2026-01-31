'use client';

import { useEffect, useState } from 'react';
import { getClaimById } from '@/app/lib/api';
import { Claim } from '@/app/types/claim';

export function ClaimDetails({ claimId }: { claimId: string }) {
  const [claim, setClaim] = useState<Claim | null>(null);

  useEffect(() => {
    getClaimById(claimId).then(setClaim);
  }, [claimId]);

  if (!claim) return <div>Loading claim...</div>;

  return (
    <div className="card">
      <h2 className="text-xl font-semibold">{claim.title}</h2>
      <p className="text-muted">{claim.description}</p>

      <div className="mt-3 text-sm">
        <span>Status: </span>
        <span className="font-medium">{claim.status}</span>
      </div>
    </div>
  );
}
