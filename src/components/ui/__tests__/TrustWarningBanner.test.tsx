import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import TrustWarningBanner from '../TrustWarningBanner';

jest.mock('@/components/hooks/useTrust', () => ({
  useTrust: () => ({
    isVerified: false,
    reputation: 12,
    accountAgeDays: 2,
    suspicious: false,
  }),
}));

jest.mock('../TrustScoreTooltip', () => {
  function MockTrustScoreTooltip() {
    return <span data-testid="tooltip">tooltip</span>;
  }

  return MockTrustScoreTooltip;
});

describe('TrustWarningBanner', () => {
  it('explains when verification weight is zero', () => {
    render(<TrustWarningBanner />);
    expect(screen.getByTestId('zero-weight-warning')).toHaveTextContent(/verification weight is currently 0/i);
  });

  it('opens the explanatory modal', () => {
    render(<TrustWarningBanner />);
    fireEvent.click(screen.getByRole('button', { name: /learn more/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/votes can be ignored/i);
  });
});
