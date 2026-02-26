// src/components/reputation/ReputationProgress.tsx
'use client'

import { getNextTier } from '@/lib/reputation'

interface Props {
  score: number
}

export default function ReputationProgress({ score }: Props) {
  const next = getNextTier(score)

  if (!next) {
    return (
      <p className="text-green-600 text-sm font-medium">
        🎉 Maximum Tier Achieved
      </p>
    )
  }

  const currentProgress = score
  const totalRequired = score + next.required
  const percentage = (currentProgress / totalRequired) * 100

  return (
    <div className="w-full">
      <div className="h-2 bg-gray-200 rounded">
        <div
          className="h-2 bg-blue-600 rounded transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {next.required} points to {next.nextTier.toUpperCase()}
      </p>
    </div>
  )
}