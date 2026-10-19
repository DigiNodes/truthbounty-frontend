"use client";

import { RouteErrorFallback } from '@/components/common/RouteErrorFallback';

/**
 * Dashboard segment boundary. Preserves pending-transaction recovery state.
 *
 * Focus contract: when a transaction is in flight or awaiting confirmation,
 * focus must remain on the recovery surface rather than jumping into a field.
 * The RouteErrorFallback owns that decision and reports the authoritative
 * error category (server, simulation, authorization, validation) to the error
 * summary primitive without exposing protected evidence or secrets.
 * The summary must never auto-focus a field while recovery is pending; only
 * after recovery resolves may first-invalid navigation proceed.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} scope="Dashboard" />;
}
