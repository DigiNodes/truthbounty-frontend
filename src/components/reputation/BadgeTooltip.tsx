// src/components/reputation/BadgeTooltip.tsx
'use client'

import { ReactNode } from 'react'

interface Props {
  tier: string
  score: number
  children: ReactNode
}

export default function BadgeTooltip({ tier, score, children }: Props) {
  return (
    <div className="relative group inline-block">
      {children}

      <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 bg-black text-white text-xs p-2 rounded shadow-lg">
        <p className="font-semibold">{tier.toUpperCase()} Tier</p>
        <p>Reputation Score: {score}</p>
        <p>Higher tiers unlock trust benefits.</p>
      </div>
    </div>
  )
}