import React from 'react';
import { render, screen } from '@testing-library/react';

import ClaimSubmissionForm from '../ClaimSubmissionForm';

jest.mock('@/components/hooks/useTrust', () => ({
  useTrust: () => ({
    isVerified: true,
    reputation: 80,
    accountAgeDays: 90,
    suspicious: false,
  }),
}));

jest.mock('@/hooks/useAccount', () => ({
  useAccount: () => ({ address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E', displayName: '0x742d...eB1E' }),
}));

jest.mock('@/app/queries/claims.queries', () => ({
  useSubmitClaim: () => ({ mutateAsync: jest.fn(), isLoading: false }),
}));

describe('ClaimSubmissionForm modal layout', () => {
  it('uses modal shell and panel classes for mobile-safe spacing', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    const modal = screen.getByTestId('claim-submission-modal');
    expect(modal.className).toContain('modal-shell');
    const form = modal.querySelector('form');
    expect(form?.className).toContain('modal-panel');
  });
});
