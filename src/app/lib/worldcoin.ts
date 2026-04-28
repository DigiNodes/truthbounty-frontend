/**
 * Worldcoin verification API integration with real IDKit support
 */

import type { WorldcoinVerification, WorldcoinVerificationResult, IDKitResponse } from '@/app/types/worldcoin';
import { shouldUseMockVerification } from '@/config/worldcoin-client';

/**
 * Submit Worldcoin verification proof to backend
 */
export async function submitWorldcoinVerification(
  walletAddress: string,
  proof: WorldcoinVerificationResult | IDKitResponse
): Promise<WorldcoinVerification> {
  const res = await fetch('/api/identity/worldcoin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress,
      // Handle both old format and new IDKit response format
      ...(isIDKitResponse(proof) ? proof : {
        proof: proof.proof,
        merkle_root: proof.merkle_root,
        nullifier_hash: proof.nullifier_hash,
        verification_level: proof.verification_level,
      }),
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Verification failed' }));
    throw new Error(error.message || 'Failed to verify with Worldcoin');
  }

  return res.json();
}

/**
 * Get current verification status for a wallet
 */
export async function getVerificationStatus(
  walletAddress: string
): Promise<WorldcoinVerification | null> {
  const res = await fetch(`/api/identity/worldcoin/status?wallet=${walletAddress}`);
  
  if (res.status === 404) {
    return null;
  }
  
  if (!res.ok) {
    throw new Error('Failed to fetch verification status');
  }

  return res.json();
}

/**
 * Verify that Worldcoin IDKit is available and configured
 */
export function isIDKitAvailable(): boolean {
  return isWorldcoinConfigured() && typeof window !== 'undefined';
}

/**
 * Type guard to check if proof is IDKit response format
 */
function isIDKitResponse(proof: WorldcoinVerificationResult | IDKitResponse): proof is IDKitResponse {
  return 'credential_uuids' in proof;
}

/**
 * Initialize Worldcoin IDKit widget and get verification proof
 * 
 * This function returns a Promise that resolves when verification is complete
 * The actual widget is shown by the IDKit package based on configuration
 */
export async function verifyWithIDKit(
  walletAddress: string
): Promise<WorldcoinVerification> {
  // For client-side verification, this is typically called from a React component
  // The actual IDKit flow is initiated there
  throw new Error(
    'verifyWithIDKit must be called from the WorldcoinVerifyButton component with IDKit initialized'
  );
}

/**
 * Mock verification for development/testing
 * This is used when:
 * - NEXT_PUBLIC_WORLDCOIN_APP_ID is not configured
 * - NODE_ENV is development or test
 * - Worldcoin integration is disabled via feature flag
 */
export async function mockWorldcoinVerification(
  walletAddress: string
): Promise<WorldcoinVerification> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    id: `wc_${Date.now()}`,
    walletAddress,
    status: 'SUCCESS',
    result: {
      proof: '0x' + '0'.repeat(64),
      merkle_root: '0x' + '1'.repeat(64),
      nullifier_hash: '0x' + '2'.repeat(64),
      verification_level: 'orb',
    },
    verifiedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Determine which verification method to use
 */
export function shouldUseMock(): boolean {
  return shouldUseMockVerification();
}
