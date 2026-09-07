/**
 * useReputation
 *
 * Query-backed hook for on-chain reputation scores.
 *
 * Replaces the previous local-state-only implementation that allowed
 * arbitrary client-side score mutations. Reputation is now read from
 * the indexer API and updated only via projection-stream events.
 */

'use client';

export function useReputation(
  _userId?: string,
  initialScore = 0,
): ReputationState {
  void _userId;
  const [score, setScore] = useState(initialScore);

export interface UseReputationReturn {
  reputation: UserReputation | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useReputation(userId: string): UseReputationReturn {
  const { data: reputation, isLoading, isError } = useReputationByUser(userId);

  return {
    reputation,
    isLoading,
    isError,
  };
}
