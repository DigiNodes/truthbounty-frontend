// src/app/queries/user.queries.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export interface UserProfile {
  id: string;
  address: string;
  username: string;
  reputation: number;
  verificationCount: number;
  accuracy: number;
  totalStaked: number;
  totalEarned: number;
  joinedAt: string;
}

export interface UserReputation {
  score: number;
  rank: number;
  totalVerifications: number;
  successfulVerifications: number;
  accuracy: number;
}

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
}

async function fetchUserReputation(userId: string): Promise<UserReputation> {
  const res = await fetch(`/api/users/${userId}/reputation`);
  if (!res.ok) throw new Error('Failed to fetch user reputation');
  return res.json();
}

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
