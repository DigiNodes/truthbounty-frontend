export type VerificationDecision = 'VERIFY' | 'REJECT';

export type VerificationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'FAILED';

export interface Verification {
  id: string;

  claimId: string;
  verifierAddress: string;

  decision: VerificationDecision;

  stakeAmount: number;

  status: VerificationStatus;

  transactionHash?: string;

  createdAt: string;
  confirmedAt?: string;
}
