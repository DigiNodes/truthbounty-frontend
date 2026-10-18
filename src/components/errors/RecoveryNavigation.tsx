'use client';

import { NAV_ITEMS } from '@/config/navigation';

/**
 * Static recovery navigation — UI-FE-053 (#626)
 *
 * Rendered by route-level fallbacks that replace the app shell (e.g. when a
 * page component fails above `MainLayout`), so a single failure never leaves
 * the person without a way to move elsewhere.
 *
 * Deliberately dependency-free at runtime: no wallet, query, router or context
 * hooks, so it cannot fail for the same reason as the thing it is rescuing.
 * Uses plain anchors (full navigation) so the next page starts from clean state.
 * Only public, ungated destinations are listed — it never implies access that
 * the capability model has not granted.
 */
const PUBLIC_ITEMS = NAV_ITEMS.filter(
  (item) => item.group === 'public' && !item.requiresAuth && !item.requiresRole && !item.featureFlag,
);

export interface RecoveryNavigationProps {
  className?: string;
}

export function RecoveryNavigation({ className }: RecoveryNavigationProps) {
  return (
    <nav aria-label="Recovery navigation" className={className} data-testid="recovery-navigation">
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {PUBLIC_ITEMS.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
