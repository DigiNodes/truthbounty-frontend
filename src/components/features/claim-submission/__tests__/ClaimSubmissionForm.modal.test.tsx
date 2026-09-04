/**
 * ClaimSubmissionForm — modal layout tests.
 *
 * Regression: @stellar/freighter-api is no longer imported by the form.
 */

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
  useAccount: () => ({
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    displayName: '0xf39F…2266',
    chainId: 11155420,
  }),
}));

jest.mock('@/app/queries/claims.queries', () => ({
  useSubmitClaim: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('wagmi', () => ({
  useConnectors: () => [{ id: 'injected', name: 'Injected', type: 'injected' }],
  useConnect: () => ({ connect: jest.fn() }),
  useAccount: () => ({ address: '0x123', isConnected: true }),
  useChainId: () => 11155420,
  usePublicClient: () => ({
    waitForTransactionReceipt: jest.fn(),
    simulateContract: jest.fn(),
  }),
  useReadContract: () => ({ data: 0n }),
  useWriteContract: () => ({ writeContractAsync: jest.fn() }),
}));

// Claim contract config is required by useCreateClaimTransaction during render.
process.env.NEXT_PUBLIC_BOUNTY_CLAIM_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
process.env.NEXT_PUBLIC_BOUNTY_ASSET = '0x1234567890123456789012345678901234567890';
process.env.NEXT_PUBLIC_CLAIM_AMOUNT = '1000000000000000000';
process.env.NEXT_PUBLIC_CLAIM_CONFIG_HASH = '0xabc';
process.env.NEXT_PUBLIC_EXPECTED_CHAIN_ID = '11155420';

describe('ClaimSubmissionForm modal layout', () => {
  it('uses modal shell and panel classes for mobile-safe spacing', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    const modal = screen.getByTestId('claim-submission-modal');
    expect(modal.className).toContain('modal-shell');
    const form = modal.querySelector('form');
    expect(form?.className).toContain('modal-panel');
  });
});
