// src/hooks/useUser.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queries/queryKeys';
import { fetchUserProfile, fetchUserReputation } from '../api/user.api';

export const useUser = (userId: string) => {
  const queryClient = useQueryClient();

  const profile = useQuery(queryKeys.user.profile(userId), () => fetchUserProfile(userId));

  const reputation = useQuery(queryKeys.user.reputation(userId), () =>
    fetchUserReputation(userId)
  );

  return { profile, reputation };
};