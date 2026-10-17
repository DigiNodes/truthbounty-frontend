'use client';

import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { SafeHarborPledge } from '@/app/types/security-disclosure';

export interface SecuritySafeHarborSectionProps {
  safeHarbor: SafeHarborPledge;
}

export function SecuritySafeHarborSection({ safeHarbor }: SecuritySafeHarborSectionProps) {
  return (
    <section
      aria-labelledby="security-safe-harbor-heading"
      className="space-y-4 rounded-xl border border-[#232329] bg-[#14141A] p-5"
    >
      <div className="flex items-center space-x-3 border-b border-[#232329] pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 id="security-safe-harbor-heading" className="text-lg font-semibold text-white">
            {safeHarbor.title}
          </h2>
          <p className="text-xs text-gray-400">{safeHarbor.summary}</p>
        </div>
      </div>

      {/* Rules list */}
      <ul className="space-y-2.5 text-xs text-gray-300">
        {safeHarbor.clauses.map((clause, index) => (
          <li key={index} className="flex items-start space-x-2.5">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
              aria-hidden="true"
            />
            <span className="leading-relaxed">{clause}</span>
          </li>
        ))}
      </ul>

      {/* Legal protection note */}
      <div className="rounded-lg bg-[#0B0B0F] p-3 text-[11px] text-gray-400 border border-[#232329]">
        <span className="font-semibold text-gray-300">Legal Assurance: </span>
        <span>{safeHarbor.legalNotice}</span>
      </div>
    </section>
  );
}
