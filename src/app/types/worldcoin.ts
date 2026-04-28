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

/**
 * IDKit response format from @worldcoin/idkit
 * This is the real proof format returned by the Worldcoin IDKit widget
 * See: https://docs.worldcoin.org/world-id/advanced/widget
 */
export interface IDKitResponse {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: 'orb' | 'device';
  credential_uuids: string[];
}

export interface WorldcoinVerification {
  id: string;
  walletAddress: string;
  status: WorldcoinVerificationStatus;
  result?: WorldcoinVerificationResult | Omit<IDKitResponse, 'credential_uuids'>;
  verifiedAt?: string;
  expiresAt?: string;
  error?: string;
}

export interface WorldcoinConfig {
  appId: string;
  action: string;
  signal?: string;
}
