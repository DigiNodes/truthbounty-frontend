// src/app/queries/claims.queries.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { fetchClaims, fetchClaimDetail, submitClaim, fetchClaimsByStatus } from '../api/claims.api';

export function useClaims() {
  return useQuery({
    queryKey: queryKeys.claims.all,
    queryFn: fetchClaims,
  });
}

export function useClaimDetail(claimId: string) {
  return useQuery({
    queryKey: queryKeys.claims.detail(claimId),
    queryFn: () => fetchClaimDetail(claimId),
    staleTime: 1000 * 60 * 2, // 2 min
  });
}

export function useClaimsByStatus(status: string) {
  return useQuery({
    queryKey: queryKeys.claims.byStatus(status),
    queryFn: () => fetchClaimsByStatus(status),
  });
}

export function useSubmitClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitClaim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
}

// Re-export fetchClaimsByStatus from claims.api
export { fetchClaimsByStatus } from '../api/claims.api';
