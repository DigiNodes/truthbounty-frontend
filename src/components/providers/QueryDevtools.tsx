// src/components/providers/QueryDevtools.tsx

'use client';

import dynamic from 'next/dynamic';

/**
 * Pure helper exposing the production-safety gate.
 *
 * Protocol invariant:
 *   shouldRenderDevtools() === true  iff  process.env.NODE_ENV === 'development'
 *
 * In any other environment ('production', 'test', undefined, ...) this MUST
 * return false so TanStack Query DevTools never ships to end users.
 */
export function shouldRenderDevtools(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Lazy reference to ReactQueryDevtools.
 *
 * The `process.env.NODE_ENV !== 'production'` guard is statically evaluated by
 * the Next.js / webpack build, so the dynamic import (and the devtools chunk)
 * is dead-code-eliminated from production bundles entirely.
 */
const ReactQueryDevtoolsLazy =
  process.env.NODE_ENV !== 'production'
    ? dynamic(
        () =>
          import('@tanstack/react-query-devtools').then((m) => ({
            default: m.ReactQueryDevtools,
          })),
        { ssr: false }
      )
    : null;

/**
 * Production-safe wrapper around TanStack Query DevTools.
 *
 * Renders nothing unless NODE_ENV === 'development'. Combined with the
 * build-time guard above, this ensures the devtools code is never bundled
 * nor rendered in production.
 */
export function QueryDevtools() {
  if (!shouldRenderDevtools() || !ReactQueryDevtoolsLazy) {
    return null;
  }
  return <ReactQueryDevtoolsLazy initialIsOpen={false} />;
}
