'use client';

import React from 'react';
import {
  useSecurityDisclosure,
  type UseSecurityDisclosureOptions,
} from '@/hooks/useSecurityDisclosure';
import { SecurityPolicyHeader } from './SecurityPolicyHeader';
import { SecurityNoBountyNotice } from './SecurityNoBountyNotice';
import { SecurityProtectedIntakeBoundary } from './SecurityProtectedIntakeBoundary';
import { SecurityScopeSection } from './SecurityScopeSection';
import { SecuritySafeHarborSection } from './SecuritySafeHarborSection';
import { SecurityProhibitedSection } from './SecurityProhibitedSection';
import { SecurityReportRequirementsSection } from './SecurityReportRequirementsSection';

export interface SecurityDisclosureViewProps extends UseSecurityDisclosureOptions {
  className?: string;
}

export function SecurityDisclosureView({
  channelStateOverride,
  initialData,
  className = '',
}: SecurityDisclosureViewProps) {
  const {
    data,
    activeChannelState,
    scopeFilter,
    setScopeFilter,
    categoryFilter,
    setCategoryFilter,
    filteredScopeTargets,
    copiedTargetId,
    copyToClipboard,
  } = useSecurityDisclosure({
    channelStateOverride,
    initialData,
  });

  return (
    <div className={`mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 text-white ${className}`}>
      {/* Keyboard accessible skip link */}
      <a
        href="#security-scope-heading"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to Target Scope
      </a>

      {/* Header with Release & Network Provenance */}
      <SecurityPolicyHeader metadata={data.metadata} />

      {/* Zero Bounty / Zero SLA Disclaimer Notice */}
      <SecurityNoBountyNotice
        disclaimer={data.metadata.bountyGovernanceDisclaimer}
      />

      {/* Protected Intake Boundary: Fail-Closed Unavailable vs Verified Ready */}
      <SecurityProtectedIntakeBoundary
        status={data.channelStatus}
        activeState={activeChannelState}
        copiedTargetId={copiedTargetId}
        onCopyText={copyToClipboard}
      />

      {/* In-Scope & Out-of-Scope Targets */}
      <SecurityScopeSection
        targets={filteredScopeTargets}
        scopeFilter={scopeFilter}
        onScopeFilterChange={setScopeFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        copiedTargetId={copiedTargetId}
        onCopyTarget={copyToClipboard}
      />

      {/* Safe Harbor Pledge */}
      <SecuritySafeHarborSection safeHarbor={data.safeHarbor} />

      {/* Strictly Prohibited Testing & Activities */}
      <SecurityProhibitedSection activities={data.prohibitedActivities} />

      {/* Vulnerability Report Requirements */}
      <SecurityReportRequirementsSection
        requirements={data.reportRequirements}
      />
    </div>
  );
}
