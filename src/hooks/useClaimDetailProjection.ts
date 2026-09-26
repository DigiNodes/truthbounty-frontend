'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchClaimDetailProjection } from '@/app/api/claim-detail.api';
import type {
  ClaimDetailEnvelope,
  ClaimDetailError,
  ClaimDetailViewState,
} from '@/app/types/claim-detail';

export interface ClaimDetailProjectionState {
  viewState: ClaimDetailViewState;
  data?: ClaimDetailEnvelope;
  error?: ClaimDetailError;
  retry: () => void;
}

export function useClaimDetailProjection(
  claimId: string | undefined,
): ClaimDetailProjectionState {
  const [data, setData] = useState<ClaimDetailEnvelope>();
  const [error, setError] = useState<ClaimDetailError>();
  const [isLoading, setIsLoading] = useState(Boolean(claimId));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!claimId) {
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError(undefined);
    fetchClaimDetailProjection(claimId, controller.signal)
      .then((nextData) => setData(nextData))
      .catch((nextError: unknown) => {
        if (nextError instanceof DOMException && nextError.name === 'AbortError') return;
        setError(nextError as ClaimDetailError);
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [claimId, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const freshness = data?.projection.freshness;
  const viewState: ClaimDetailViewState = isLoading
    ? 'loading'
    : error?.code === 'CLAIM_NOT_FOUND'
      ? 'not-found'
      : error
        ? 'error'
        : data && (freshness === 'stale' || freshness === 'degraded')
          ? 'ready-stale'
          : data
            ? 'ready'
            : 'error';

  return { viewState, data, error, retry };
}