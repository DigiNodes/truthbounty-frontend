'use client';

import React from 'react';
import { FileText, Info } from 'lucide-react';
import type { VulnerabilityReportRequirement } from '@/app/types/security-disclosure';

export interface SecurityReportRequirementsSectionProps {
  requirements: readonly VulnerabilityReportRequirement[];
}

export function SecurityReportRequirementsSection({
  requirements,
}: SecurityReportRequirementsSectionProps) {
  return (
    <section
      aria-labelledby="security-report-req-heading"
      className="space-y-4 rounded-xl border border-[#232329] bg-[#14141A] p-5"
    >
      <div className="flex items-center space-x-3 border-b border-[#232329] pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 id="security-report-req-heading" className="text-lg font-semibold text-white">
            Vulnerability Report Requirements
          </h2>
          <p className="text-xs text-gray-400">
            Reports must contain sufficient technical detail for maintainers to reproduce and triage the finding.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {requirements.map((req) => (
          <li
            key={req.id}
            className="rounded-lg border border-[#232329] bg-[#0B0B0F] p-3.5 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-white text-xs">{req.field}</span>
              {req.mandatory ? (
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                  Mandatory
                </span>
              ) : (
                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400 border border-blue-500/20">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-xs text-gray-200 leading-relaxed">{req.requirement}</p>
            <div className="flex items-start space-x-1.5 text-[11px] text-gray-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
              <span>{req.guidance}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
