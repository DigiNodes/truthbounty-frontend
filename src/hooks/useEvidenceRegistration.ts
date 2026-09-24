'use client';

import { useCallback, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { getContractAddress, getProtocolVersion } from '@/lib/contracts/registry';
import { validateEvidenceUri } from '@/lib/validation/evidenceUri';

// Types
export interface EvidencePayload {
  claimId: string;
  evidenceUri: string;
  evidenceDigest?: string; // e.g. SHA-256 hash of the content
}

export interface EvidenceValidation {
  isValid: boolean;
  errors: string[];
}

export interface EvidenceTransaction {
  hash: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
}

interface UseEvidenceRegistrationConfig {
  contractAddress?: string;
  expectedChainId?: number;
  artifactVersion?: string;
}

const OPTIMISM_MAINNET_CHAIN_ID = 10;

export function useEvidenceRegistration(config: UseEvidenceRegistrationConfig = {}) {
  const contractAddress = config.contractAddress ?? getContractAddress('TruthBountyWeighted');
  const expectedChainId = config.expectedChainId ?? OPTIMISM_MAINNET_CHAIN_ID;
  const artifactVersion = config.artifactVersion ?? getProtocolVersion();

  const { address: userAddress, isConnected } = useAccount();
  const currentChainId = useChainId();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEvidence = useCallback((payload: EvidencePayload): EvidenceValidation => {
    const errors: string[] = [];

    if (!isConnected || !userAddress) {
      errors.push('Wallet not connected');
    }

    if (currentChainId !== expectedChainId) {
      errors.push(`Wrong network. Expected chain ${expectedChainId}, got ${currentChainId}`);
    }

    if (!payload.claimId || !payload.claimId.match(/^[0-9a-fA-F]{64}$/)) {
      errors.push('Invalid claim mismatch: claimId must be a 32-byte hex string (without 0x)');
    }

    const uriValidation = validateEvidenceUri(payload?.evidenceUri);
    if (!uriValidation.isValid && uriValidation.error) {
      errors.push(uriValidation.error);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [isConnected, userAddress, currentChainId, expectedChainId]);

  const submitEvidence = useCallback(async (payload: EvidencePayload): Promise<EvidenceTransaction> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const validation = validateEvidence(payload);
      if (!validation.isValid) {
        throw new Error(validation.errors.join('; '));
      }

      // Submission requires a wallet writeContract call
      throw new Error('Evidence registration requires wallet writeContract integration; no synthetic transaction hash is emitted.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Submission failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [validateEvidence]);

  return {
    validateEvidence,
    submitEvidence,
    isSubmitting,
    error,
    artifactVersion,
    contractAddress
  };
}
