import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatsCards from '../StatsCards';
import { platformStatsFixture } from '@/__tests__/fixtures/dashboard-fixtures';

jest.mock('@/components/hooks/useTrust', () => ({
  useTrust: () => ({
    reputation: 95,
    accountAgeDays: 0,
    suspicious: false,
    isVerified: false,
  }),
}));

jest.mock('@/components/skeletons', () => ({
  StatsCardsSkeleton: () => <div data-testid="stats-cards-skeleton" />,
}));

jest.mock('@/components/ui/TrustScoreTooltip', () => {
  return function DummyTrustScoreTooltip() {
    return <div data-testid="trust-score-tooltip" />;
  };
});

describe('StatsCards Component', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(<StatsCards isLoading={true} />);
    expect(screen.getByTestId('stats-cards-skeleton')).toBeInTheDocument();
  });

  it('renders "My Trust" stat when isLoading is false', () => {
    render(<StatsCards isLoading={false} />);
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('My Trust')).toBeInTheDocument();
    expect(screen.getByTestId('trust-score-tooltip')).toBeInTheDocument();
  });

  // STAB-FE-002 — semantic assertions replacing the opaque snapshot
  it('exposes an accessible name pairing the stat label with its value', () => {
    render(<StatsCards isLoading={false} />);
    const card = screen.getByLabelText('My Trust: 95');
    expect(card).toBeInTheDocument();
  });

  it('keeps the value, label and tooltip in the same stat card', () => {
    render(<StatsCards isLoading={false} />);
    const card = screen.getByLabelText('My Trust: 95');
    expect(within(card).getByText('95')).toBeInTheDocument();
    expect(within(card).getByText('My Trust')).toBeInTheDocument();
    expect(within(card).getByTestId('trust-score-tooltip')).toBeInTheDocument();
  });

  it('does not render stat cards while loading', () => {
    render(<StatsCards isLoading={true} />);
    expect(screen.getByTestId('stats-cards-skeleton')).toBeInTheDocument();
    expect(screen.queryByLabelText('My Trust: 95')).not.toBeInTheDocument();
  });

  it('renders platform stats when passed as a prop', () => {
    render(<StatsCards platformStats={platformStatsFixture} isLoading={false} />);
    platformStatsFixture.forEach((stat) => {
      expect(screen.getByText(stat.label)).toBeInTheDocument();
      expect(screen.getByText(stat.value)).toBeInTheDocument();
    });
  });

  it('renders em-dash placeholders when no platformStats are provided', () => {
    render(<StatsCards isLoading={false} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(6);
  });
});
