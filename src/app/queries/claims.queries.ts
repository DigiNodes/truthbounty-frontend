// src/app/queries/claims.queries.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { fetchClaims, fetchClaimDetail, submitClaim, fetchClaimsByStatus } from '../api/claims.api';

export function useClaims() {
  return useQuery(queryKeys.claims.all, fetchClaims);
}

export function useClaimDetail(claimId: string) {
  return useQuery(
    queryKeys.claims.detail(claimId),
    () => fetchClaimDetail(claimId),
    {
      staleTime: 1000 * 60 * 2, // 2 min
    }
  );
}

export function useClaimsByStatus(status: string) {
  return useQuery(queryKeys.claims.byStatus(status), () =>
    fetchClaimsByStatus(status)
  );
}

export function useSubmitClaim() {
  const queryClient = useQueryClient();

  return useMutation(submitClaim, {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.claims.all);
    },
  });
}

// Re-export fetchClaimsByStatus from claims.api
export { fetchClaimsByStatus } from '../api/claims.api';
