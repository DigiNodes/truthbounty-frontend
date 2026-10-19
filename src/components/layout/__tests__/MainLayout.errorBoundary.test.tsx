import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShellProvider } from '@/context/AppShellContext';
import MainLayout from '@/components/layout/MainLayout';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));
jest.mock('@/components/features/claim-submission', () => ({
  ClaimSubmissionForm: () => <div data-testid="claim-form" />,
}));
jest.mock('@/components/providers', () => ({
  useFeatureFlags: () => ({ isEnabled: () => true }),
  FeatureFlagGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/components/ui/ThemeToggle', () => ({ ThemeToggle: () => <button type="button">Theme</button> }));
jest.mock('@/components/ui/TrustIndicator', () => ({ __esModule: true, default: () => <span>Trust</span> }));
jest.mock('@/components/ui/TrustWarningBanner', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ui/WebSocketStatus', () => ({ WebSocketIndicator: () => <span>WebSocket</span> }));
jest.mock('@/components/features/PerformanceBudgetIndicator', () => ({ PerformanceBudgetIndicator: () => <span>Performance</span> }));
jest.mock('@/components/WalletConnection', () => ({ WalletConnection: () => <button type="button">Wallet</button> }));

function Boom(): never {
  throw new Error('page content exploded');
}

describe('MainLayout error containment (UI-FE-053 / #626)', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    window.sessionStorage.clear();
  });
  afterEach(() => spy.mockRestore());

  it('a failing page leaves the sidebar, topbar and skip link intact', () => {
    render(
      <AppShellProvider>
        <MainLayout>
          <Boom />
        </MainLayout>
      </AppShellProvider>,
    );
    // Page content is replaced by a contained fallback…
    const main = screen.getByRole('main');
    expect(within(main).getByRole('alert')).toHaveAttribute('data-boundary-scope', 'route:content');
    // …while shell navigation is untouched.
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('exactly one alert exists, and it is inside <main>, not wrapping the shell', () => {
    render(
      <AppShellProvider>
        <MainLayout>
          <Boom />
        </MainLayout>
      </AppShellProvider>,
    );
    expect(screen.getByRole('main').contains(screen.getByRole('alert'))).toBe(true);
  });

  it('healthy pages render normally with no boundary UI', () => {
    render(
      <AppShellProvider>
        <MainLayout>
          <p>healthy page</p>
        </MainLayout>
      </AppShellProvider>,
    );
    expect(screen.getByText('healthy page')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('the contained failure is recoverable in place', async () => {
    const user = userEvent.setup();
    let throwing = true;
    const Flaky = () => (throwing ? <Boom /> : <p>back to normal</p>);
    render(
      <AppShellProvider>
        <MainLayout>
          <Flaky />
        </MainLayout>
      </AppShellProvider>,
    );
    throwing = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('back to normal')).toBeInTheDocument();
  });
});
