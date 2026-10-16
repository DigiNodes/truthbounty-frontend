'use client';

import { useEffect } from 'react';
import { RouteErrorFallback } from '@/components/common/RouteErrorFallback';

/**
 * Root route boundary. Fail closed: generic message only, safe retry.
 *
 * This boundary is deliberately side-effect free beyond logging:
 * - No auto-submit, signing, network switch, or draft discard.
 * - Recovery is user-initiated via the fallback's reset action.
 * - Safe identifiers and transaction references are preserved by
 *   the fallback component and never echoed back from this boundary.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sanitized client-side log only; no error payload is forwarded to
    // any network endpoint and no untrusted content is rendered.
    console.error('Root route error', error.digest ?? 'unknown');
  }, [error]);

  return <RouteErrorFallback error={error} reset={reset} scope="Application" />;
}
