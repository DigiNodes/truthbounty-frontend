
export interface ClaimData {
  id: string;
  category: string;
  hash: string;
  status: 'Verified' | 'Disputed' | 'Pending';
  title: string;
  source: string;
  timeAgo: string;
  votesFor: number;
  votesAgainst: number;
  verifiersCount: number;
  confidenceScore: number;
  totalStaked: number;
}

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

export interface Evidence {
  id: string;
  title: string;
  description: string;
  url: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  timeAgo: string;
  actor: string;
  isRecent?: boolean;
}

export interface TopVerifier {
  id: string;
  rank: number;
  name: string;
  staked: string;
  score: number;
}
