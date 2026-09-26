'use client';

import { useCallback, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import {
  getContractAddress,
  getProtocolVersion,
  getReleaseChainId,
} from '@/lib/contracts/registry';
import { evaluateWriteTarget } from '@/lib/contracts/write-gate';

// Types
export interface EvidencePayload {
  claimId: string;
  evidenceUri: string;
  evidenceDigest?: string;
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

const SUBMIT_EVIDENCE_SELECTOR = '0x1a2b3c4d'; // Mock selector for submitEvidence

export function useEvidenceRegistration(config: UseEvidenceRegistrationConfig = {}) {
  const contractAddress = config.contractAddress ?? getContractAddress('TruthBountyWeighted');
  const expectedChainId = config.expectedChainId ?? getReleaseChainId();
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

    const writeTarget = evaluateWriteTarget({
      activeChainId: currentChainId,
      contractAddress,
      expectedProtocolVersion: artifactVersion,
    });
    if (!writeTarget.ok) {
      errors.push(...writeTarget.errors);
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
  }, [isConnected, userAddress, currentChainId, expectedChainId, contractAddress, artifactVersion]);

  const submitEvidence = useCallback(async (payload: EvidencePayload): Promise<EvidenceTransaction> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const validation = validateEvidence(payload);
      if (!validation.isValid) {
        throw new Error(validation.errors.join('; '));
      }

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
