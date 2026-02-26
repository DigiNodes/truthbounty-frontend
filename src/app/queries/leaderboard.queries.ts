// src/app/queries/leaderboard.queries.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { fetchLeaderboard } from '../api/leaderboard.api';

export function useLeaderboard() {
  return useQuery(queryKeys.leaderboard, fetchLeaderboard, {
    staleTime: 1000 * 60 * 10, // 10 min
    refetchInterval: 1000 * 60 * 5, // auto-refresh every 5 min (fallback when WS not available)
  });
}
