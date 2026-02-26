// src/components/reputation/ReputationBadge.tsx
'use client'

import { getReputationTier } from '@/lib/reputation'
import BadgeTooltip from './BadgeTooltip'

interface Props {
  score: number
}

export default function ReputationBadge({ score }: Props) {
  const tier = getReputationTier(score)

  const styles = {
    bronze: 'bg-amber-600 text-white',
    silver: 'bg-gray-400 text-white',
    gold: 'bg-yellow-400 text-black',
  }

  return (
    <BadgeTooltip tier={tier} score={score}>
      <div
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${styles[tier]}`}
      >
        {tier.toUpperCase()}
      </div>
    </BadgeTooltip>
  )
}
