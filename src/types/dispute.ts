export interface Dispute {
  id: string;
  claimId: string;
  reason: string;
  status: 'OPEN' | 'VOTING' | 'RESOLVED' | 'FAILED';
  proVotes: number;
  conVotes: number; 
  totalStaked: number;
  createdAt: string;
}

export interface CreateDisputePayload {
  claimId: string;
  reason: string;
  initialStake: number;
}