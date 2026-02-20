export type ClaimStatus = 'pending' | 'verified' | 'disputed' | 'resolved';

export interface Claim {
  id: string;
  title: string;
  description: string;
  status: ClaimStatus;
  submitter: string;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
  verificationCount: number;
  disputeCount: number;
}

export interface UserClaimsResponse {
  claims: Claim[];
  total: number;
  page: number;
  pageSize: number;
}
