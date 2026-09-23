import React from 'react';
import { render, screen } from '@testing-library/react';

import { ClaimDetails } from '../ClaimDetails';
import { createMockClaim } from '@/__tests__/utils/test-utils';

jest.mock('@/components/hooks/useTrust', () => ({
  useTrustForAddress: () => ({
    isVerified: false,
    reputation: 50,
    accountAgeDays: 5,
    suspicious: false,
  }),
}));

jest.mock('@/components/ui/TrustScoreTooltip', () => {
  function MockTrustScoreTooltip() {
    return <span data-testid="tooltip">tooltip</span>;
  }

  return MockTrustScoreTooltip;
});

describe('ClaimDetails', () => {
  it('renders safe evidence link values as anchors', () => {
    const claim = createMockClaim({
      evidence: [
        {
          id: 'ev-1',
          type: 'link',
          value: 'https://example.com/proof',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    render(<ClaimDetails claim={claim} />);

    const link = screen.getByRole('link', { name: /example\.com\/proof/ });
    expect(link).toHaveAttribute('href', 'https://example.com/proof');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders unsafe evidence link values as plain text, not anchors', () => {
    const claim = createMockClaim({
      evidence: [
        {
          id: 'ev-2',
          type: 'link',
          value: 'javascript:alert(document.cookie)',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    render(<ClaimDetails claim={claim} />);

    expect(screen.getByText('javascript:alert(document.cookie)')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});