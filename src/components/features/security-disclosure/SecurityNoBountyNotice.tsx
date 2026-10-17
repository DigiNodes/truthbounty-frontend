'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface SecurityNoBountyNoticeProps {
  disclaimer: string;
}

export function SecurityNoBountyNotice({ disclaimer }: SecurityNoBountyNoticeProps) {
  return (
    <aside
      aria-label="Bounty and Response Guarantee Disclaimer"
      className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-amber-200"
    >
      <div className="flex items-start space-x-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-amber-300">
            Important Notice: No Automatic Bounty Rewards or Response SLAs
          </p>
          <p className="leading-relaxed text-amber-200/90">{disclaimer}</p>
          <p className="text-amber-300/80">
            We deeply appreciate good-faith vulnerability disclosures that help protect users and protocol contracts. However, neither monetary bounties nor fixed response SLAs may be fabricated or promised by this frontend.
          </p>
        </div>
      </div>
    </aside>
  );
}
