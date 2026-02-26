export type ReputationTier = 'bronze' | 'silver' | 'gold'

export const REPUTATION_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 1500,
}

export function getReputationTier(score: number): ReputationTier {
  if (score >= REPUTATION_THRESHOLDS.gold) return 'gold'
  if (score >= REPUTATION_THRESHOLDS.silver) return 'silver'
  return 'bronze'
}

export function getNextTier(score: number) {
  if (score < REPUTATION_THRESHOLDS.silver) {
    return {
      nextTier: 'silver',
      required: REPUTATION_THRESHOLDS.silver - score,
    }
  }

  if (score < REPUTATION_THRESHOLDS.gold) {
    return {
      nextTier: 'gold',
      required: REPUTATION_THRESHOLDS.gold - score,
    }
  }

  return null
}