// src/hooks/useClaims.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queries/queryKeys';
import { fetchClaims, fetchClaimDetail, submitClaim } from '../api/claims.api';

export const useClaims = () => {
  const queryClient = useQueryClient();

  const claimsQuery = useQuery(queryKeys.claims.all, fetchClaims);

  const claimDetailQuery = (claimId: string) =>
    useQuery(queryKeys.claims.detail(claimId), () => fetchClaimDetail(claimId), {
      staleTime: 1000 * 60 * 2, // 2 min
    });

  const mutation = useMutation(submitClaim, {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.claims.all); // Invalidate list after new claim
    },
  });

  return { claimsQuery, claimDetailQuery, mutation };
};