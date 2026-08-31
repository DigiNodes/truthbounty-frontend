'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { WorldcoinVerificationStatus, IDKitResponse } from '@/app/types/worldcoin';
import { isWorldcoinConfigured } from '@/config/worldcoin-client';

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
  const [isConfigured] = useState(() => isWorldcoinConfigured());

  const handleVerify = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setStatus('IN_PROGRESS');
    onVerificationStart?.();

    // Verification process simulation or handler
    try {
      if (onIDKitProof) {
        await onIDKitProof({
          merkle_root: '0x123',
          nullifier_hash: '0x456',
          proof: '0x789',
          verification_level: 'orb',
          credential_uuids: [],
        });
      }
      setStatus('SUCCESS');
      onVerificationComplete?.(true);
    } catch {
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
            {useMockMode ? 'Mock Verify' : 'Verify with Worldcoin'}
          </>
        );
    }
  };

  if (!useMockMode && !isConfigured) {
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
