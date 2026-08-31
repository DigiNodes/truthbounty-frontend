'use client';

/**
 * useReputation — hook for reputation state and tier calculation.
 */

import { useCallback, useState } from 'react';
import {
  getReputationTier,
  getNextTier,
  type ReputationTier,
} from '@/lib/reputation';

export interface ReputationState {
  score: number;
  tier: ReputationTier;
  nextTier: ReturnType<typeof getNextTier>;
  addPositive: () => void;
  addNegative: () => void;
  setScore: (score: number | ((prev: number) => number)) => void;
}

export function useReputation(
  _userId?: string,
  initialScore = 0,
): ReputationState {
  void _userId;
  const [score, setScore] = useState(initialScore);

  const addPositive = useCallback(() => {
    setScore((current) => current + 1);
  }, []);

  const addNegative = useCallback(() => {
    setScore((current) => Math.max(0, current - 1));
  }, []);

  return {
    score,
    tier: getReputationTier(score),
    nextTier: getNextTier(score),
    addPositive,
    addNegative,
    setScore,
  };
}
