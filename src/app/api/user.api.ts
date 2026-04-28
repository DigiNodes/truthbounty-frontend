// src/app/api/user.api.ts

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

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
}

export async function fetchUserReputation(userId: string): Promise<UserReputation> {
  const res = await fetch(`/api/users/${userId}/reputation`);
  if (!res.ok) throw new Error('Failed to fetch user reputation');
  return res.json();
}
