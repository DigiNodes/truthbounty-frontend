// src/queries/queryKeys.ts
export const queryKeys = {
  claims: {
    all: ['claims'] as const,
    detail: (claimId: string) => ['claims', claimId] as const,
  },
  leaderboard: ['leaderboard'] as const,
  user: {
    profile: (userId: string) => ['user', userId] as const,
    reputation: (userId: string) => ['user', userId, 'reputation'] as const,
    verification: (userId: string) => ['user', userId, 'verification'] as const,
  },
};