'use client';

import { ReactNode } from 'react';
import { CompositionErrorBoundary } from '@/components/errors/boundaries';

export interface FeatureErrorBoundaryProps {
  children: ReactNode;
  /** Feature scope, e.g. "claim-verification", "rewards", "dispute". */
  scope: string;
  resetKeys?: unknown[];
}

/**
 * Feature-scoped boundary for claim/verification/dispute/reward/wallet UI.
 * Isolates feature faults without unmounting sibling routes or clearing
 * pending-transaction recovery state. Delegates to the shared
 * CompositionErrorBoundary (UI-FE-053 / #626).
 */
export function FeatureErrorBoundary({ children, scope, resetKeys }: FeatureErrorBoundaryProps) {
  return (
    <CompositionErrorBoundary scope={`feature:${scope}`} resetKeys={resetKeys}>
      {children}
    </CompositionErrorBoundary>
  );
}
