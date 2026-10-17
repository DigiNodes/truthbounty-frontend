'use client';

import React from 'react';
import { AlertTriangle, Ban, AlertOctagon } from 'lucide-react';
import type { ProhibitedActivity } from '@/app/types/security-disclosure';

export interface SecurityProhibitedSectionProps {
  activities: readonly ProhibitedActivity[];
}

export function SecurityProhibitedSection({ activities }: SecurityProhibitedSectionProps) {
  return (
    <section
      aria-labelledby="security-prohibited-heading"
      className="space-y-4 rounded-xl border border-red-500/30 bg-[#170E10] p-5"
    >
      <div className="flex items-center space-x-3 border-b border-red-500/20 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
          <Ban className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 id="security-prohibited-heading" className="text-lg font-semibold text-white">
            Strictly Prohibited Testing & Activities
          </h2>
          <p className="text-xs text-red-300/80">
            Any researcher engaging in the following activities immediately forfeits safe harbor protections.
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activities.map((activity) => (
          <li
            key={activity.id}
            className="rounded-lg border border-red-500/20 bg-[#0F080A] p-3.5 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                <span className="font-medium text-white text-xs">{activity.title}</span>
              </div>
              <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300 border border-red-500/30">
                {activity.dangerLevel}
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed pl-6">
              {activity.description}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex items-start space-x-2.5 rounded-lg bg-red-950/40 p-3 text-xs text-red-200 border border-red-500/30">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
        <p className="leading-relaxed">
          <strong>Zero Tolerance:</strong> Attacking mainnet contracts with real assets, attempting to drain liquidity pools, or holding user funds hostage will be treated as criminal activity and referred to appropriate law enforcement authorities.
        </p>
      </div>
    </section>
  );
}
