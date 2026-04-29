// src/app/queries/user.queries.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { fetchUserProfile, fetchUserReputation, UserProfile, UserReputation } from '../api/user.api';
import { getVerificationStatus } from '../lib/worldcoin';

// Re-export types for backward compatibility
export type { UserProfile, UserReputation };

export function useUserProfile(userId: string) {
  return useQuery(
    queryKeys.user.profile(userId),
    () => fetchUserProfile(userId)
  );
}

export function useUserReputation(userId: string) {
  return useQuery(
    queryKeys.user.reputation(userId),
    () => fetchUserReputation(userId)
  );
}

export function useUserVerification(userId: string) {
  return useQuery({
    queryKey: queryKeys.user.verification(userId),
    queryFn: () => getVerificationStatus(userId),
    enabled: !!userId,
  });
}
