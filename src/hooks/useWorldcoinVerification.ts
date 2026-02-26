'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WorldcoinVerification, WorldcoinVerificationStatus } from '@/app/types/worldcoin';
import { getVerificationStatus, submitWorldcoinVerification, mockWorldcoinVerification } from '@/app/lib/worldcoin';

interface UseWorldcoinVerificationOptions {
  walletAddress?: string;
  autoCheck?: boolean;
}

interface UseWorldcoinVerificationReturn {
  verification: WorldcoinVerification | null;
  status: WorldcoinVerificationStatus;
  isLoading: boolean;
  error: string | null;
  verify: () => Promise<void>;
  refresh: () => Promise<void>;
  isVerified: boolean;
}

/**
 * Hook for managing Worldcoin verification state
 */
export function useWorldcoinVerification({
  walletAddress,
  autoCheck = true,
}: UseWorldcoinVerificationOptions = {}): UseWorldcoinVerificationReturn {
  const [verification, setVerification] = useState<WorldcoinVerification | null>(null);
  const [status, setStatus] = useState<WorldcoinVerificationStatus>('NOT_STARTED');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getVerificationStatus(walletAddress);
      
      if (result) {
        setVerification(result);
        setStatus(result.status);
      } else {
        setVerification(null);
        setStatus('NOT_STARTED');
      }
    } catch (err) {
      console.error('Failed to fetch verification status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch verification status');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  const verify = useCallback(async () => {
    if (!walletAddress) {
      setError('Wallet address is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus('IN_PROGRESS');

    try {
      // In production, this would integrate with Worldcoin IDKit
      // For now, use mock verification
      const result = await mockWorldcoinVerification(walletAddress);
      
      setVerification(result);
      setStatus(result.status);
      
      // Update localStorage for demo
      try {
        const trustInfo = JSON.parse(localStorage.getItem('trustInfo') || '{}');
        trustInfo.isVerified = true;
        localStorage.setItem('trustInfo', JSON.stringify(trustInfo));
      } catch (e) {
        console.error('Failed to update trust info:', e);
      }
    } catch (err) {
      console.error('Verification failed:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
      setStatus('FAILED');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Auto-check verification status on mount
  useEffect(() => {
    if (autoCheck && walletAddress) {
      refresh();
    }
  }, [autoCheck, walletAddress, refresh]);

  return {
    verification,
    status,
    isLoading,
    error,
    verify,
    refresh,
    isVerified: status === 'SUCCESS',
  };
}
