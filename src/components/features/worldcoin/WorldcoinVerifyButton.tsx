'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { WorldcoinVerificationStatus } from '@/app/types/worldcoin';

interface WorldcoinVerifyButtonProps {
  walletAddress?: string;
  onVerificationStart?: () => void;
  onVerificationComplete?: (success: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function WorldcoinVerifyButton({
  walletAddress,
  onVerificationStart,
  onVerificationComplete,
  disabled,
  className,
}: WorldcoinVerifyButtonProps) {
  const [status, setStatus] = useState<WorldcoinVerificationStatus>('NOT_STARTED');

  const handleVerify = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setStatus('IN_PROGRESS');
    onVerificationStart?.();

    try {
      // In production, this would trigger the Worldcoin IDKit widget
      // For now, we'll simulate the verification flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatus('SUCCESS');
      onVerificationComplete?.(true);
      
      // Update trust info in localStorage
      try {
        const trustInfo = JSON.parse(localStorage.getItem('trustInfo') || '{}');
        trustInfo.isVerified = true;
        localStorage.setItem('trustInfo', JSON.stringify(trustInfo));
      } catch (e) {
        console.error('Failed to update trust info:', e);
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setStatus('FAILED');
      onVerificationComplete?.(false);
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case 'IN_PROGRESS':
        return (
          <>
            <Loader2 className="animate-spin" />
            Verifying...
          </>
        );
      case 'SUCCESS':
        return (
          <>
            <CheckCircle2 />
            Verified
          </>
        );
      case 'FAILED':
        return (
          <>
            <AlertCircle />
            Retry Verification
          </>
        );
      default:
        return (
          <>
            <Shield />
            Verify with Worldcoin
          </>
        );
    }
  };

  return (
    <Button
      onClick={handleVerify}
      disabled={disabled || status === 'IN_PROGRESS' || status === 'SUCCESS'}
      variant={status === 'SUCCESS' ? 'outline' : 'default'}
      className={className}
    >
      {getButtonContent()}
    </Button>
  );
}
