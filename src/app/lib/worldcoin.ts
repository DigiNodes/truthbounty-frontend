/**
 * Worldcoin verification API integration
 */

import type { WorldcoinVerification, WorldcoinVerificationResult } from '@/app/types/worldcoin';

/**
 * Submit Worldcoin verification proof to backend
 */
export async function submitWorldcoinVerification(
  walletAddress: string,
  proof: WorldcoinVerificationResult
): Promise<WorldcoinVerification> {
  const res = await fetch('/api/identity/worldcoin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress,
      proof: proof.proof,
      merkle_root: proof.merkle_root,
      nullifier_hash: proof.nullifier_hash,
      verification_level: proof.verification_level,
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
 * Mock verification for development/testing
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
