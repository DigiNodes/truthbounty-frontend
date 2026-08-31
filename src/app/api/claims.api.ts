// src/app/api/claims.api.ts

import { Claim } from '@/app/types/claim';

// ---------------------------------------------------------------------------
// Evidence types
// ---------------------------------------------------------------------------
export interface EvidenceItem {
  id: string;
  claimId: string;
  submitter: string;
  /** IPFS CID — must not be fabricated. */
  cid: string;
  mimeType: string;
  description: string;
  submittedAt: string;
}

// ---------------------------------------------------------------------------
// Round types
// ---------------------------------------------------------------------------
export interface RoundItem {
  id: string;
  claimId: string;
  index: number;
  startBlock: number;
  endBlock: number;
  votesFor: number;
  votesAgainst: number;
  status: 'active' | 'closed' | 'settled';
}

// In a real app, these would be actual API calls
// For now, they return mock data or would call your backend

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

export async function submitClaim(payload: {
  title: string;
  description: string;
  category?: string;
  impact?: string;
  source?: string;
  evidence?: Array<{ type: string; value: string }>;
}): Promise<Claim> {
  const res = await fetch('/api/claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to submit claim');
  return res.json();
}

export async function fetchClaimsByStatus(status: string): Promise<Claim[]> {
  const res = await fetch(`/api/claims?status=${encodeURIComponent(status)}`);
  if (!res.ok) throw new Error('Failed to fetch claims by status');
  return res.json();
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export async function fetchEvidence(claimId: string): Promise<EvidenceItem[]> {
  const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/evidence`);
  if (!res.ok) throw new Error('Failed to fetch evidence');
  return res.json();
}

export async function fetchEvidenceDetail(evidenceId: string): Promise<EvidenceItem> {
  const res = await fetch(`/api/evidence/${encodeURIComponent(evidenceId)}`);
  if (!res.ok) throw new Error('Failed to fetch evidence detail');
  return res.json();
}

// ---------------------------------------------------------------------------
// Rounds
// ---------------------------------------------------------------------------

export async function fetchRoundsByClaim(claimId: string): Promise<RoundItem[]> {
  const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}/rounds`);
  if (!res.ok) throw new Error('Failed to fetch rounds');
  return res.json();
}

export async function fetchRoundDetail(roundId: string): Promise<RoundItem> {
  const res = await fetch(`/api/rounds/${encodeURIComponent(roundId)}`);
  if (!res.ok) throw new Error('Failed to fetch round detail');
  return res.json();
}
