/**
 * Layout invariant: ActivityAndNodes must clip-and-scroll vertically.
 *
 * The card uses a fixed height (`h-72`) so the dashboard grid stays
 * aligned with its sibling card (VerificationNodes). When the chart's
 * intrinsic content (title + recharts surface + legend) exceeds that
 * fixed height — for example on narrow widths where the legend wraps,
 * or when a user zooms the page — the previous version clipped the
 * overflow silently. The audit flagged this as:
 *
 *   "ActivityAndNodes height overflow → Fix: overflow-y-auto"
 *
 * These tests guard the invariant that the outer container of both the
 * loaded component and its skeleton declare `overflow-y-auto` so any
 * vertical overflow becomes a scroll instead of being hidden.
 */

import React from 'react';
import { render } from '@testing-library/react';

import ActivityAndNodes from '@/components/features/ActivityAndNodes';
import { ActivityChartSkeleton } from '@/components/skeletons/ActivityChartSkeleton';

// recharts uses ResizeObserver / SVG measurements that are not reliable in
// jsdom. We only care about the outer container's class list, so the inner
// chart can safely be replaced by a no-op stub.
jest.mock('recharts', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="recharts-stub">{children}</div>
  );
  return new Proxy(
    {},
    {
      get: () => Stub,
    }
  );
});

describe('ActivityAndNodes — height overflow invariant', () => {
  it('outer container declares overflow-y-auto so overflowing content scrolls', () => {
    const { container } = render(<ActivityAndNodes />);
    const outer = container.firstElementChild as HTMLElement | null;

    expect(outer).not.toBeNull();
    expect(outer!.className).toContain('overflow-y-auto');
    // The fixed height (`h-72`) is what makes overflow possible; the test
    // pins both pieces of the invariant together.
    expect(outer!.className).toContain('h-72');
  });

  it('skeleton mirrors the overflow-y-auto invariant of the loaded card', () => {
    const { container } = render(<ActivityChartSkeleton />);
    const outer = container.firstElementChild as HTMLElement | null;

    expect(outer).not.toBeNull();
    expect(outer!.className).toContain('overflow-y-auto');
    expect(outer!.className).toContain('h-72');
  });

  it('isLoading=true renders the skeleton, which also enforces the invariant', () => {
    const { container } = render(<ActivityAndNodes isLoading />);
    const outer = container.firstElementChild as HTMLElement | null;

    expect(outer).not.toBeNull();
    expect(outer!.className).toContain('overflow-y-auto');
  });
});
