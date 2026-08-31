// src/app/api/claims.api.ts

import { Claim } from '@/app/types/claim';

export interface ClaimSubmissionData {
  title: string;
  description: string;
  category?: string;
  impact?: string;
  source?: string;
  evidence?: Array<{ type: string; value: string }>;
}

export async function fetchClaims(): Promise<Claim[]> {
  const res = await fetch('/api/claims');
  if (!res.ok) throw new Error('Failed to fetch claims');
  return res.json();
}

export async function fetchClaimDetail(claimId: string): Promise<Claim> {
  const res = await fetch(`/api/claims/${claimId}`);
  if (!res.ok) throw new Error('Failed to fetch claim detail');
  return res.json();
}

export async function submitClaim(payload: ClaimSubmissionData): Promise<Claim> {
  const res = await fetch('/api/claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to submit claim');
  return res.json();
}

export async function fetchClaimsByStatus(status: string): Promise<Claim[]> {
  const res = await fetch(`/api/claims?status=${status}`);
  if (!res.ok) throw new Error('Failed to fetch claims by status');
  return res.json();
}
