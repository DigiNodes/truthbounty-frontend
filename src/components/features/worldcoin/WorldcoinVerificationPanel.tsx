'use client';

import { useState, useEffect } from 'react';
import { WorldcoinVerifyButton } from './WorldcoinVerifyButton';
import { VerificationStatusIndicator } from './VerificationStatusIndicator';
import { VerificationSuccessCard } from './VerificationSuccessCard';
import { VerificationErrorCard } from './VerificationErrorCard';
import { WorldcoinInfoTooltip } from './WorldcoinInfoTooltip';
import type { WorldcoinVerificationStatus } from '@/app/types/worldcoin';

interface WorldcoinVerificationPanelProps {
  walletAddress?: string;
  onVerificationChange?: (verified: boolean) => void;
  compact?: boolean;
}

export function WorldcoinVerificationPanel({
  walletAddress,
  onVerificationChange,
  compact = false,
}: WorldcoinVerificationPanelProps) {
  const [status, setStatus] = useState<WorldcoinVerificationStatus>('NOT_STARTED');
  const [verificationLevel, setVerificationLevel] = useState<'orb' | 'device'>('orb');
  const [verifiedAt, setVerifiedAt] = useState<string | undefined>();
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  // Check existing verification status on mount
  useEffect(() => {
    if (walletAddress) {
      checkVerificationStatus();
    }
  }, [walletAddress]);

  const checkVerificationStatus = async () => {
    try {
      // Check localStorage for demo purposes
      const trustInfo = JSON.parse(localStorage.getItem('trustInfo') || '{}');
      if (trustInfo.isVerified) {
        setStatus('SUCCESS');
        setVerifiedAt(new Date().toISOString());
        setExpiresAt(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());
      }
    } catch (e) {
      console.error('Failed to check verification status:', e);
    }
  };

  const handleVerificationStart = () => {
    setStatus('IN_PROGRESS');
    setShowSuccess(false);
    setShowError(false);
    setError(undefined);
  };

  const handleVerificationComplete = (success: boolean) => {
    if (success) {
      setStatus('SUCCESS');
      setVerificationLevel('orb');
      setVerifiedAt(new Date().toISOString());
      setExpiresAt(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());
      setShowSuccess(true);
      onVerificationChange?.(true);
    } else {
      setStatus('FAILED');
      setError('Verification failed. Please try again.');
      setShowError(true);
      onVerificationChange?.(false);
    }
  };

  const handleRetry = () => {
    setStatus('NOT_STARTED');
    setShowError(false);
    setError(undefined);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {status === 'SUCCESS' ? (
          <VerificationStatusIndicator
            status={status}
            verificationLevel={verificationLevel}
            expiresAt={expiresAt}
          />
        ) : (
          <>
            <WorldcoinVerifyButton
              walletAddress={walletAddress}
              onVerificationStart={handleVerificationStart}
              onVerificationComplete={handleVerificationComplete}
              disabled={!walletAddress}
            />
            <WorldcoinInfoTooltip />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Identity Verification
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Verify your identity with Worldcoin to unlock full platform access
          </p>
        </div>
        <WorldcoinInfoTooltip />
      </div>

      {showSuccess && verifiedAt && (
        <VerificationSuccessCard
          verificationLevel={verificationLevel}
          verifiedAt={verifiedAt}
          expiresAt={expiresAt}
          onClose={() => setShowSuccess(false)}
        />
      )}

      {showError && error && (
        <VerificationErrorCard
          error={error}
          onRetry={handleRetry}
          onDismiss={() => setShowError(false)}
        />
      )}

      {!showSuccess && !showError && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <VerificationStatusIndicator
                  status={status}
                  verificationLevel={verificationLevel}
                  expiresAt={expiresAt}
                  showLabel={true}
                />
              </div>
              
              {status === 'NOT_STARTED' && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {walletAddress 
                    ? 'Click the button to start verification'
                    : 'Connect your wallet to begin verification'}
                </p>
              )}
              
              {status === 'SUCCESS' && verifiedAt && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Verified on {new Date(verifiedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {status !== 'SUCCESS' && (
              <WorldcoinVerifyButton
                walletAddress={walletAddress}
                onVerificationStart={handleVerificationStart}
                onVerificationComplete={handleVerificationComplete}
                disabled={!walletAddress}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
