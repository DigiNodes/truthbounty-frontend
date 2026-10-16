'use client';

import { useEffect } from 'react';
import { RouteErrorFallback } from '@/components/common/RouteErrorFallback';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard route error:', error);
  }, [error]);

  return <RouteErrorFallback error={error} reset={reset} scope="Dashboard" />;
}
