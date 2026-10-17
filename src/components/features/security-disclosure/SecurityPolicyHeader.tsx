'use client';

import React from 'react';
import { Shield, Lock, EyeOff, CheckCircle } from 'lucide-react';
import type { SecurityPolicyMetadata } from '@/app/types/security-disclosure';

export interface SecurityPolicyHeaderProps {
  metadata: SecurityPolicyMetadata;
}

export function SecurityPolicyHeader({ metadata }: SecurityPolicyHeaderProps) {
  return (
    <header className="space-y-4 border-b border-[#232329] pb-6" aria-labelledby="security-page-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1
              id="security-page-heading"
              className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
            >
              Responsible Disclosure & Security Policy
            </h1>
            <p className="text-sm text-gray-400">
              Guidelines, safe harbor boundaries, and intake protocol for security researchers.
            </p>
          </div>
        </div>

        {/* Provenance and isolation badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 border border-blue-500/20"
            title="Release Manifest provenance"
          >
            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Release: {metadata.releaseManifestVersion}</span>
          </span>

          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400 border border-purple-500/20"
            title="Optimism EVM Only"
          >
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{metadata.supportedChainName}</span>
          </span>

          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20"
            title="Isolated from all telemetry and web analytics pipelines"
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Zero-Telemetry Route</span>
          </span>
        </div>
      </div>

      {/* Metadata summary bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg bg-[#14141A] p-3 text-xs text-gray-400 border border-[#232329]">
        <div>
          <span className="block text-gray-400">Policy Version</span>
          <span className="font-semibold text-gray-200">{metadata.policyVersion}</span>
        </div>
        <div>
          <span className="block text-gray-400">Source Class</span>
          <span className="font-semibold text-gray-200 capitalize">
            {metadata.sourceClass.replace(/-/g, ' ')}
          </span>
        </div>
        <div>
          <span className="block text-gray-400">Target Chain ID</span>
          <span className="font-semibold text-gray-200">{metadata.supportedChainId}</span>
        </div>
        <div>
          <span className="block text-gray-400">Last Policy Audit</span>
          <span className="font-semibold text-gray-200">{metadata.lastAuditedDate}</span>
        </div>
      </div>
    </header>
  );
}
