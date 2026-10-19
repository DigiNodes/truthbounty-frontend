'use client';

import { useEffect, useMemo, useState } from 'react';
import { ErrorFallback } from '@/components/errors/ErrorFallback';
import { classifyError, type ClassifiedError } from '@/lib/errors/classification';
import { MAX_RETRY_ATTEMPTS, RecoveryBudget } from '@/lib/errors/recovery-budget';
import { captureBoundaryError, slugifyScope } from '@/lib/errors/support-report';
import type { RouteErrorKind } from '@/lib/routes/errors';

export type { RouteErrorKind } from '@/lib/routes/errors';

export interface RouteErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Route scope label, e.g. "dashboard" or "claim detail". */
  scope: string;
  /** Show pending-transaction preservation notice (default true). */
  preserveNotice?: boolean;
  /**
   * Explicit failure category from the caller (e.g. `classifyRouteError`).
   * When omitted, the error is classified from typed signals only.
   */
  kind?: RouteErrorKind;
}

/** Map a route-contract kind onto the shared model. Authorization is a denial, never a fault. */
function applyRouteKind(base: ClassifiedError, kind: RouteErrorKind | undefined): ClassifiedError {
  switch (kind) {
    case 'authorization':
      return { ...base, kind: 'denied', code: 'AUTHORITY_DENIED', retryable: false, reloadable: false };
    case 'configuration':
      return { ...base, kind: 'defect', code: 'CONFIGURATION_ERROR', retryable: false, reloadable: false };
    case 'missing-resource':
      return { ...base, kind: 'user', code: 'NOT_FOUND', retryable: false, reloadable: false };
    case 'dependency':
      return base.kind === 'dependency'
        ? base
        : { ...base, kind: 'dependency', code: 'DEPENDENCY_UNAVAILABLE', retryable: true, reloadable: true };
    default:
      return base;
  }
}

/**
 * Shared fallback for Next.js `error.tsx` route boundaries (UI-FE-053 / #626).
 *
 * Classifies the error (user / dependency / denied / defect), shows a sanitized
 * correlation reference, bounds "Try again" via `reset()`, and renders static
 * recovery navigation because a segment `error.tsx` replaces the page — which
 * includes the app shell when the failing component sits above `MainLayout`.
 * Never renders the error message, stack or digest-bearing text.
 */
export function RouteErrorFallback({
  error,
  reset,
  scope,
  preserveNotice = true,
  kind,
}: RouteErrorFallbackProps) {
  const slug = slugifyScope(scope);
  const classified = useMemo(
    () => applyRouteKind(classifyError(error, { digest: error.digest }), kind),
    [error, kind],
  );
  // Persisted per scope so remounting after a failed reset() cannot reset the count.
  const budget = useMemo(
    () => new RecoveryBudget({ max: MAX_RETRY_ATTEMPTS, persistScope: `route-retry:${slug}` }),
    [slug],
  );
  const [, bump] = useState(0);

  useEffect(() => {
    captureBoundaryError(classified, slug, 'route');
  }, [classified, slug]);

  const retry = () => {
    if (budget.record()) reset();
    bump((n) => n + 1);
  };

  return (
    <ErrorFallback
      classified={classified}
      scope={slug}
      level="route"
      onRetry={retry}
      retryBudget={{ remaining: budget.remaining(), max: MAX_RETRY_ATTEMPTS }}
      showNavigation
      preserveNotice={preserveNotice}
    />
  );
}
