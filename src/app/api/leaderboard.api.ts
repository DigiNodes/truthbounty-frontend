// src/app/api/leaderboard.api.ts

import { LeaderboardEntry } from '@/app/types/websocket';

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch('/api/leaderboard');
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}

export async function fetchUserRank(userId: string): Promise<{
  rank: number;
  totalVerifications: number;
  accuracy: number;
}> {
  const res = await fetch(`/api/leaderboard/user/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user rank');
  return res.json();
}
