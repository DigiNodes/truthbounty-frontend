// src/app/queries/user.queries.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { fetchUserProfile, fetchUserReputation, UserProfile, UserReputation } from '../api/user.api';

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
