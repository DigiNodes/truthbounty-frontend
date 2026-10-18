'use client';

import { RouteErrorFallback } from '@/components/common/RouteErrorFallback';
import { redactError } from '@/lib/security/redaction';

/**
 * Global error boundary. Must include its own <html>/<body> per Next.js.
 * Strictly generic copy — no stack traces or sensitive data.
 *
 * The error is routed through `redactError` before it reaches the fallback so
 * that secrets, long hex, and Bearer tokens never reach the DOM. The fallback
 * classifies it, shows a sanitized correlation reference, and reports through
 * privacy-safe telemetry — nothing is written raw to the console.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const redacted = redactError(error);

  const safeError: Error & { digest?: string } = {
    name: redacted.name,
    message: redacted.message,
    digest: error.digest,
  } as Error & { digest?: string };

  return (
    <html lang="en" className="dark">
      <body>
        <RouteErrorFallback error={safeError} reset={reset} scope="Application" preserveNotice={false} />
      </body>
    </html>
  );
}
