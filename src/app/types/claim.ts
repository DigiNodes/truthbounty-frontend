export type ClaimStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'DISPUTED';

export type EvidenceType = 'link' | 'text' | 'image' | 'video' | 'document';

export interface Evidence {
  id: string;
  type: EvidenceType;
  value: string; // URL, text, IPFS hash, etc.
  createdAt: string;
}

export interface Claim {
  id: string;
  title: string;
  description: string;

  claimantAddress: string;

  status: ClaimStatus;

  bountyAmount: number;
  totalStaked: number;

  evidence: Evidence[];

  createdAt: string;
  updatedAt: string;
}
