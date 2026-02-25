// src/hooks/useLeaderboard.ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queries/queryKeys';
import { fetchLeaderboard } from '../api/leaderboard.api';

export const useLeaderboard = () => {
  return useQuery(queryKeys.leaderboard, fetchLeaderboard, {
    staleTime: 1000 * 60 * 10, // 10 min
    refetchInterval: 1000 * 60 * 5, // auto-refresh every 5 min
  });
};