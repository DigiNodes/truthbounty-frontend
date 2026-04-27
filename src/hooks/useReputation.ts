import { useCallback, useState } from "react";

type ReputationState = {
  score: number;
  addPositive: () => void;
  addNegative: () => void;
};

export function useReputation(_userId: string): ReputationState {
  const [score, setScore] = useState(0);

  const addPositive = useCallback(() => {
    setScore((current) => current + 1);
  }, []);

  const addNegative = useCallback(() => {
    setScore((current) => Math.max(0, current - 1));
  }, []);

  return {
    score,
    addPositive,
    addNegative,
  };
}
