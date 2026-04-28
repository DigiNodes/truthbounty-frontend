'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WorldcoinVerification, WorldcoinVerificationStatus, IDKitResponse } from '@/app/types/worldcoin';
import { getVerificationStatus, submitWorldcoinVerification, mockWorldcoinVerification, shouldUseMock } from '@/app/lib/worldcoin';
import { getWorldcoinConfig, isWorldcoinConfigured } from '@/config/worldcoin-client';

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
  handleIDKitProof: (proof: IDKitResponse) => Promise<void>;
  isMockMode: boolean;
  isConfigured: boolean;
}

/**
 * Hook for managing Worldcoin verification state
 * Supports both real IDKit verification and mock verification for development
 */
export function useWorldcoinVerification({
  walletAddress,
  autoCheck = true,
}: UseWorldcoinVerificationOptions = {}): UseWorldcoinVerificationReturn {
  const [verification, setVerification] = useState<WorldcoinVerification | null>(null);
  const [status, setStatus] = useState<WorldcoinVerificationStatus>('NOT_STARTED');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockMode] = useState(() => shouldUseMock());
  const [isConfigured] = useState(() => isWorldcoinConfigured());
  const idkitRef = useRef<any>(null);

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
      let result: WorldcoinVerification;

      if (isMockMode) {
        // Use mock verification for development/testing
        result = await mockWorldcoinVerification(walletAddress);
      } else {
        // Use real IDKit verification
        // This will be triggered by the component using the hook
        // The actual proof comes from IDKit in the component
        throw new Error('Real verification requires IDKit initialization from component');
      }
      
      setVerification(result);
      setStatus(result.status);
      
      // Update localStorage for demo
      try {
        const trustInfo = JSON.parse(localStorage.getItem('trustInfo') || '{}');
        trustInfo.isVerified = result.status === 'SUCCESS';
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
  }, [walletAddress, isMockMode]);

  /**
   * Handle real IDKit verification proof
   * Call this from the component when IDKit returns a success response
   */
  const handleIDKitProof = useCallback(async (proof: IDKitResponse) => {
    if (!walletAddress) {
      setError('Wallet address is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus('IN_PROGRESS');

    try {
      const result = await submitWorldcoinVerification(walletAddress, proof);
      setVerification(result);
      setStatus(result.status);
      
      // Update localStorage
      try {
        const trustInfo = JSON.parse(localStorage.getItem('trustInfo') || '{}');
        trustInfo.isVerified = result.status === 'SUCCESS';
        localStorage.setItem('trustInfo', JSON.stringify(trustInfo));
      } catch (e) {
        console.error('Failed to update trust info:', e);
      }
    } catch (err) {
      console.error('IDKit verification failed:', err);
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
    handleIDKitProof,
    isMockMode,
    isConfigured,
  };
}
