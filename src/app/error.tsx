'use client';

import { RouteErrorFallback } from '@/components/common/RouteErrorFallback';

/**
 * Root route boundary. Fail closed: generic message only, safe retry.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} scope="Application" />;
}
