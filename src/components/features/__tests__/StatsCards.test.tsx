import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatsCards from '../StatsCards';

// Mock useTrust hook
jest.mock('@/components/hooks/useTrust', () => ({
  useTrust: () => ({
    reputation: 95,
  }),
}));

// Mock StatsCardsSkeleton
jest.mock('@/components/skeletons', () => ({
  StatsCardsSkeleton: () => <div data-testid="stats-cards-skeleton" />,
}));

// Mock TrustScoreTooltip
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

    // Check "My Trust" value is rendered
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('My Trust')).toBeInTheDocument();

    // Check tooltip is rendered for "My Trust"
    expect(screen.getByTestId('trust-score-tooltip')).toBeInTheDocument();
  });

  /**
   * STAB-FE-002 — replaces a `toMatchSnapshot()` baseline.
   *
   * The snapshot asserted the rendered Tailwind class strings, so any
   * semantics-preserving reorder of utility classes failed the suite while the
   * accessible output was unchanged. It also asserted the `aria-label`
   * accessible name only opaquely, as serialized markup.
   *
   * These assertions cover the same contract semantically: the accessible name
   * pairs each label with its value, and the value, label and tooltip belong to
   * the same card. Scoping the lookups to the card is stricter than the
   * previous page-wide `getByText` calls, which would pass even if the label
   * and the value were rendered in different cards.
   */
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

  it('renders exactly one stat card so a missing or duplicated stat is caught', () => {
    render(<StatsCards isLoading={false} />);

    expect(screen.getAllByLabelText(/^[^:]+: \S+$/)).toHaveLength(1);
  });

  it('does not render stat cards while loading', () => {
    render(<StatsCards isLoading={true} />);

    expect(screen.getByTestId('stats-cards-skeleton')).toBeInTheDocument();
    expect(screen.queryByLabelText('My Trust: 95')).not.toBeInTheDocument();
  });
});
