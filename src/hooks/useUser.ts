// src/hooks/useUser.ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../app/queries/queryKeys';
import { fetchUserProfile, fetchUserReputation } from '../app/api/user.api';

export const useUser = (userId: string) => {
  const profile = useQuery({
    queryKey: queryKeys.user.profile(userId),
    queryFn: () => fetchUserProfile(userId),
  });

  const reputation = useQuery({
    queryKey: queryKeys.user.reputation(userId),
    queryFn: () => fetchUserReputation(userId),
  });

  return { profile, reputation };
};