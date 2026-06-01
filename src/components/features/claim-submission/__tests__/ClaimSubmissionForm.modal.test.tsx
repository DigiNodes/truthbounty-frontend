import React from 'react';
import { render, screen } from '@testing-library/react';

import ClaimSubmissionForm from '../ClaimSubmissionForm';

jest.mock('@stellar/freighter-api', () => ({
  setAllowed: jest.fn(),
}));

jest.mock('@/components/hooks/useTrust', () => ({
  useTrust: () => ({
    isVerified: true,
    reputation: 80,
    accountAgeDays: 90,
    suspicious: false,
  }),
}));

jest.mock('@/hooks/useAccount', () => ({
  useAccount: () => ({ address: 'GABC1234', displayName: 'GABC...1234' }),
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
