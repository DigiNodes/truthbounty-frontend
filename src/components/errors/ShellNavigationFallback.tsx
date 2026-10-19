'use client';

import { RecoveryNavigation } from './RecoveryNavigation';

/**
 * Fallback for a failed Sidebar. Keeps navigation reachable (UI-FE-053 / #626)
 * by rendering static public destinations: a column at `lg`+, a bottom bar below.
 */
export function ShellNavigationFallback() {
  return (
    <>
      <aside
        aria-label="Navigation (limited)"
        className="hidden h-full w-64 shrink-0 flex-col gap-3 border-r border-border bg-card p-4 text-foreground lg:flex"
      >
        <p className="text-sm text-muted-foreground">
          The full menu couldn’t load. These pages are still available.
        </p>
        <RecoveryNavigation />
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card p-2 lg:hidden">
        <RecoveryNavigation />
      </div>
    </>
  );
}
