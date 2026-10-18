import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { assertAccessible } from '@/__tests__/utils/axe';
import { ErrorFallback } from '@/components/errors';
import { classifyError, AdapterError, AuthorityDeniedError } from '@/lib/errors/classification';
import type { BoundaryLevel } from '@/lib/errors/support-report';
import { __resetRecoveryBudgetMemory } from '@/lib/errors/recovery-budget';

const KINDS = {
  user: () => classifyError(Object.assign(new Error('x'), { name: 'UserRejectedRequestError' })),
  dependency: () => classifyError(new AdapterError({ kind: 'dependency', code: 'UPSTREAM_UNAVAILABLE', source: 'api' })),
  denied: () => classifyError(new AuthorityDeniedError('admin_role_required')),
  defect: () => classifyError(new Error('x')),
} as const;

beforeEach(() => {
  window.sessionStorage.clear();
  __resetRecoveryBudgetMemory();
});

describe('ErrorFallback accessibility (WCAG 2.2 AA)', () => {
  const levels: BoundaryLevel[] = ['route', 'composition', 'widget'];

  describe.each(Object.entries(KINDS))('%s', (_kind, make) => {
    it.each(levels)('has no axe violations at %s level', async (level) => {
      const { container } = render(
        <ErrorFallback
          classified={make()}
          scope="a11y"
          level={level}
          onRetry={() => undefined}
          retryBudget={{ remaining: 3, max: 3 }}
          showNavigation={level === 'route'}
        />,
      );
      await assertAccessible(container as unknown as HTMLElement);
    });
  });

  it('exhausted-retry state has no axe violations', async () => {
    const { container } = render(
      <ErrorFallback
        classified={KINDS.defect()}
        scope="a11y"
        level="composition"
        onRetry={() => undefined}
        retryBudget={{ remaining: 0, max: 3 }}
      />,
    );
    await assertAccessible(container as unknown as HTMLElement);
    expect(screen.getByTestId('retry-exhausted')).toBeInTheDocument();
  });

  it('every action is a native, keyboard-reachable control with an accessible name', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    const onReload = jest.fn();
    const onGoBack = jest.fn();
    render(
      <ErrorFallback
        classified={KINDS.dependency()}
        scope="a11y"
        level="route"
        onRetry={onRetry}
        retryBudget={{ remaining: 3, max: 3 }}
        onReload={onReload}
        onGoBack={onGoBack}
      />,
    );
    // Focus lands on the heading first (programmatic focus), then Tab walks the actions in order.
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    const order = ['Try again', 'Reload page', 'Copy error report', 'Go back'];
    for (const name of order) {
      await user.tab();
      expect(screen.getByRole('button', { name })).toHaveFocus();
    }
    await user.keyboard('{Enter}');
    expect(onGoBack).toHaveBeenCalledTimes(1);
    for (const b of screen.getAllByRole('button')) {
      expect(b).toHaveAttribute('type', 'button');
      expect(b.getAttribute('tabindex')).not.toBe('-1');
    }
  });

  it('kind is conveyed by text, not colour alone', () => {
    for (const make of Object.values(KINDS)) {
      const { unmount } = render(<ErrorFallback classified={make()} scope="a11y" level="widget" />);
      const heading = screen.getByRole('heading');
      expect(heading.textContent?.trim().length).toBeGreaterThan(5);
      expect(document.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      unmount();
    }
  });

  it('announces assertively for faults but politely for access decisions', () => {
    const a = render(<ErrorFallback classified={KINDS.defect()} scope="a11y" level="widget" />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    a.unmount();
    render(<ErrorFallback classified={KINDS.denied()} scope="a11y" level="widget" />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
  });

  it('report outcomes are announced from a separate (non-nested) polite status region', () => {
    render(<ErrorFallback classified={KINDS.defect()} scope="a11y" level="widget" />);
    const status = screen.getByTestId('error-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(screen.getByRole('alert').contains(status)).toBe(false);
  });

  it('recovery navigation is a labelled landmark of plain links', () => {
    render(<ErrorFallback classified={KINDS.defect()} scope="a11y" level="route" showNavigation />);
    const nav = screen.getByRole('navigation', { name: /recovery navigation/i });
    for (const link of nav.querySelectorAll('a')) expect(link.getAttribute('href')).toMatch(/^\//);
  });
});
