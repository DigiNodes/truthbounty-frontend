import React from 'react';
import { render, screen } from '@testing-library/react';

const mockTxHash = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

jest.mock('../../../hooks/useRewards', () => ({
  useRewards: () => ({
    pendingRewards: [],
    totalClaimable: 0,
    status: 'success',
    lastTxHash: mockTxHash,
    errorMessage: null,
    claimAll: jest.fn(),
  }),
}));

jest.mock('../../../components/skeletons', () => ({
  ClaimRewardsPanelSkeleton: () => <div data-testid="skeleton" />,
}));

jest.mock('../../../lib/explorer', () => ({
  getTransactionExplorerUrl: (hash: string) => `https://steexp.com/tx/${hash}`,
}));

describe('ClaimRewardsPanel - View on Explorer link', () => {
  it('renders "View on Explorer" link when transaction succeeds', async () => {
    const ClaimRewardsPanel = (await import('../ClaimRewardsPanel')).default;
    render(<ClaimRewardsPanel />);
    const link = screen.getByRole('link', { name: /view on explorer/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', `https://steexp.com/tx/${mockTxHash}`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
