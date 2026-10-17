'use client';

/**
 * Responsible Disclosure & Security Route
 *
 * Route: /security
 * Authority: Batch 6 Support & Legal (08-security-reporting.svg)
 * Spec: Issue #609 (UI-FE-040)
 *
 * Security & Privacy Invariants:
 *  - Fail-closed protected boundary: web intake suspended until DigiNodes/truthbounty-protocol#24 decision
 *  - Forms collect NO data until approved endpoints and retention exist
 *  - Submissions are isolated outside standard support/telemetry pipelines
 *  - Zero fabricated bounty rewards or response SLAs
 *  - Reachable from contact and sidebar navigation
 */

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { SecurityDisclosureView } from '@/components/features/security-disclosure';

export default function SecurityPage() {
  return (
    <MainLayout>
      <SecurityDisclosureView />
    </MainLayout>
  );
}
