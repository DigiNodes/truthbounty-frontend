'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { WorldcoinVerificationStatus, IDKitResponse } from '@/app/types/worldcoin';
import { IDKitWidget, VerificationLevel } from '@worldcoin/idkit';
import { getWorldcoinConfig, isWorldcoinConfigured } from '@/config/worldcoin-client';

interface WorldcoinVerifyButtonProps {
  walletAddress?: string;
  onVerificationStart?: () => void;
  onVerificationComplete?: (success: boolean) => void;
  onIDKitProof?: (proof: IDKitResponse) => Promise<void>;
  disabled?: boolean;
  className?: string;
  useMockMode?: boolean;
}

export function WorldcoinVerifyButton({
  walletAddress,
  onVerificationStart,
  onVerificationComplete,
  onIDKitProof,
  disabled,
  className,
  useMockMode = false,
}: WorldcoinVerifyButtonProps) {
  const [status, setStatus] = useState<WorldcoinVerificationStatus>('NOT_STARTED');
  const [isIDKitConfigured, setIsIDKitConfigured] = useState(false);

  useEffect(() => {
    setIsIDKitConfigured(isWorldcoinConfigured());
  }, []);

  const handleVerify = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    if (useMockMode) {
      // Use mock verification for development/testing
      setStatus('IN_PROGRESS');
      onVerificationStart?.();

      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setStatus('SUCCESS');
        onVerificationComplete?.(true);
      } catch (error) {
        console.error('Mock verification failed:', error);
        setStatus('FAILED');
        onVerificationComplete?.(false);
      }
    } else if (isIDKitConfigured) {
      // IDKit widget will handle the flow via _handleProof callback
      // This button click will trigger the widget to show
      setStatus('IN_PROGRESS');
      onVerificationStart?.();
    }
  };

  const handleIDKitSuccess = async (proof: IDKitResponse) => {
    try {
      if (onIDKitProof) {
        await onIDKitProof(proof);
      }
      setStatus('SUCCESS');
      onVerificationComplete?.(true);
    } catch (error) {
      console.error('Failed to submit IDKit proof:', error);
      setStatus('FAILED');
      onVerificationComplete?.(false);
    }
  };

  const handleIDKitError = () => {
    console.error('IDKit verification failed');
    setStatus('FAILED');
    onVerificationComplete?.(false);
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
            {useMockMode ? 'Mock Verify' : 'Verify with Worldcoin'}
          </>
        );
    }
  };

  if (!useMockMode && !isIDKitConfigured) {
    // Show disabled state if IDKit is not configured and not in mock mode
    return (
      <Button
        disabled={true}
        variant="outline"
        className={className}
        title="Worldcoin verification is not configured"
      >
        <Shield />
        Verify with Worldcoin (Unavailable)
      </Button>
    );
  }

  if (!useMockMode && isIDKitConfigured && walletAddress) {
    // Use IDKit widget
    const config = getWorldcoinConfig();
    return (
      <IDKitWidget
        app_id={config.appId}
        action={config.action}
        onSuccess={handleIDKitSuccess}
        onError={handleIDKitError}
        verification_level={VerificationLevel.Orb}
      >
        {({ open }) => (
          <Button
            onClick={() => {
              setStatus('IN_PROGRESS');
              onVerificationStart?.();
              open();
            }}
            disabled={disabled || status === 'IN_PROGRESS' || status === 'SUCCESS'}
            variant={status === 'SUCCESS' ? 'outline' : 'default'}
            className={className}
          >
            {getButtonContent()}
          </Button>
        )}
      </IDKitWidget>
    );
  }

  // Mock mode button
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
