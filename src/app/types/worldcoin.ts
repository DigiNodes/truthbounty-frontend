/**
 * Worldcoin verification types for Sybil-resistant identity
 */

export type WorldcoinVerificationStatus = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED';

export interface WorldcoinVerificationResult {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: 'orb' | 'device';
}

export interface WorldcoinVerification {
  id: string;
  walletAddress: string;
  status: WorldcoinVerificationStatus;
  result?: WorldcoinVerificationResult;
  verifiedAt?: string;
  expiresAt?: string;
  error?: string;
}

export interface WorldcoinConfig {
  appId: string;
  action: string;
  signal?: string;
}
