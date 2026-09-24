/**
 * ClaimSubmissionForm — modal layout tests.
 *
 * Regression: @stellar/freighter-api is no longer imported by the form.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ClaimSubmissionForm from '../ClaimSubmissionForm';

let mockApiPending = false;

jest.mock('@/components/hooks/useTrust', () => ({
  useTrust: () => ({
    isVerified: true,
    reputation: 80,
    accountAgeDays: 90,
    suspicious: false,
  }),
}));

jest.mock('@/hooks/useAccount', () => ({
  useAccount: () => ({
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    displayName: '0xf39F…2266',
    chainId: 11155420,
  }),
}));

jest.mock('@/app/queries/claims.queries', () => ({
  useSubmitClaim: () => ({ mutateAsync: jest.fn(), isPending: mockApiPending }),
}));

jest.mock('wagmi', () => ({
  useConnectors: () => [{ id: 'injected', name: 'Injected', type: 'injected' }],
  useConnect: () => ({ connect: jest.fn() }),
  useChainId: () => 11155420,
  usePublicClient: () => ({}),
  useReadContract: () => ({ data: undefined }),
  useWriteContract: () => ({ writeContractAsync: jest.fn() }),
}));

describe('ClaimSubmissionForm modal layout', () => {
  beforeEach(() => {
    mockApiPending = false;
  });

  it('uses modal shell and panel classes for mobile-safe spacing', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    const modal = screen.getByTestId('claim-submission-modal');
    expect(modal.className).toContain('modal-shell');
    const form = modal.querySelector('form');
    expect(form?.className).toContain('modal-panel');
  });

  it('keeps the dialog open on Escape while submission is pending', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockApiPending = true;
    const { rerender } = render(<ClaimSubmissionForm onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    mockApiPending = false;
    rerender(<ClaimSubmissionForm onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
