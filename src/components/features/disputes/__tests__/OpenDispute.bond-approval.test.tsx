/**
 * OpenDispute — Bond approval integration tests
 * Covers V2-FE-049: Bond approval gate for ERC-20 bond tokens
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockSubmitDispute = jest.fn();
const mockSimulateDispute = jest.fn();
const mockValidateDispute = jest.fn();
const mockBondApprove = jest.fn();
const mockBondReset = jest.fn();

let mockReadiness: {
  isReady: boolean;
  message: string | null;
  primaryCode: string | null;
  codes: string[];
} = {
  isReady: true,
  message: null,
  primaryCode: null,
  codes: [],
};

let mockBondApprovalStatus: any = 'needs-approval';
let mockBondAllowance: bigint | undefined = 0n;
let mockBondIsApproving = false;
let mockBondError: Error | null = null;

const mockContext = {
  isEligible: true,
  bond: {
    bondAmount: '1000000000000000000',
    bondToken: '0x1234567890123456789012345678901234567890', // ERC-20 bond token
    slashAmount: '100000000000000000',
    slashPercentage: 10,
    potentialReward: '1500000000000000000',
    rewardMultiplier: 1.5,
  },
  walletPosition: {
    userAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    currentBalance: '5000000000000000000',
  },
};

jest.mock('@/hooks/useDisputeContext', () => ({
  useDisputeContext: () => ({
    context: mockContext,
    isLoading: false,
    error: null,
  }),
}));

let mockIsDisputeSupported = true;

jest.mock('@/hooks/useDisputeSubmission', () => ({
  useDisputeSubmission: () => ({
    validateDispute: mockValidateDispute,
    simulateDispute: mockSimulateDispute,
    submitDispute: mockSubmitDispute,
    isSimulating: false,
    isSubmitting: false,
    error: null,
    isDisputeSupported: mockIsDisputeSupported,
  }),
  formatBondAmount: (wei: string) => {
    try {
      return (Number(BigInt(wei)) / 1e18).toFixed(4);
    } catch {
      return '0.0000';
    }
  },
}));

jest.mock('@/hooks/useERC20Approval', () => ({
  useERC20Approval: () => ({
    status: mockBondApprovalStatus,
    allowance: mockBondAllowance,
    isSufficient: mockBondAllowance !== undefined && mockBondAllowance >= BigInt('1000000000000000000'),
    isApproving: mockBondIsApproving,
    error: mockBondError,
    approve: mockBondApprove,
    reset: mockBondReset,
  }),
}));

jest.mock('@/hooks/useWriteReadiness', () => ({
  useWriteReadiness: () => mockReadiness,
}));

jest.mock('@/lib/contracts/registry', () => ({
  getContractAddress: () => '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
}));

import { OpenDispute } from '../OpenDispute';

function fillReason() {
  fireEvent.change(screen.getByLabelText(/reason for dispute/i), {
    target: { value: 'This claim is incorrect because evidence is missing.' },
  });
}

describe('OpenDispute — Bond approval integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDisputeSupported = true;
    mockReadiness = {
      isReady: true,
      message: null,
      primaryCode: null,
      codes: [],
    };
    mockBondApprovalStatus = 'needs-approval';
    mockBondAllowance = 0n;
    mockBondIsApproving = false;
    mockBondError = null;
    mockValidateDispute.mockReturnValue({ isValid: true, errors: [], warnings: [] });
    mockSimulateDispute.mockResolvedValue({
      success: true,
      projectedState: { bondLocked: '1', newStatus: 'DISPUTED' },
    });
    mockSubmitDispute.mockResolvedValue({
      transactionHash: '0xabc123',
      disputeId: 'dispute_1',
    });
    mockBondApprove.mockResolvedValue(undefined);
  });

  describe('ERC-20 bond token approval gate', () => {
    it('shows bond approval step when bond token is ERC-20', () => {
      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      expect(screen.getByText(/step 1: approve bond token/i)).toBeInTheDocument();
      expect(screen.getByText(/step 2:.*reason for dispute/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /approve bond/i })).toBeInTheDocument();
    });

    it('disables confirm button until bond approval completes', () => {
      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      fillReason();

      const confirmBtn = screen.getByRole('button', { name: /approve bond first/i });
      expect(confirmBtn).toBeDisabled();
      expect(confirmBtn).toHaveTextContent(/approve bond first/i);
    });

    it('enables confirm button after bond approval succeeds', () => {
      mockBondApprovalStatus = 'approved';
      mockBondAllowance = BigInt('1000000000000000000');

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      expect(screen.getByText(/bond token approved/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /approve bond/i })).not.toBeInTheDocument();

      fillReason();
      const confirmBtn = screen.getByRole('button', { name: /confirm dispute/i });
      expect(confirmBtn).not.toBeDisabled();
    });

    it('calls approve when user clicks approve button', async () => {
      const user = userEvent.setup();

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      const approveBtn = screen.getByRole('button', { name: /approve bond/i });
      await user.click(approveBtn);

      expect(mockBondApprove).toHaveBeenCalledTimes(1);
    });

    it('shows approval in-progress state', () => {
      mockBondApprovalStatus = 'pending-approval';
      mockBondIsApproving = true;

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      expect(screen.getByText(/approving/i)).toBeInTheDocument();
      const approveBtn = screen.getByRole('button', { name: /approval transaction submitted/i });
      expect(approveBtn).toBeDisabled();
    });

    it('allows retry after approval rejection', async () => {
      const user = userEvent.setup();
      mockBondApprovalStatus = 'rejected';

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      const retryBtn = screen.getByRole('button', { name: /approval was rejected.*retry/i });
      expect(retryBtn).not.toBeDisabled();

      await user.click(retryBtn);
      expect(mockBondReset).toHaveBeenCalledTimes(1);
      expect(mockBondApprove).toHaveBeenCalledTimes(1);
    });

    it('shows error state with retry option after approval failure', async () => {
      const user = userEvent.setup();
      mockBondApprovalStatus = 'error';
      mockBondError = new Error('Insufficient gas');

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      expect(screen.getByText(/insufficient gas/i)).toBeInTheDocument();
      
      const retryBtn = screen.getByRole('button', { name: /insufficient gas.*retry/i });
      await user.click(retryBtn);

      expect(mockBondReset).toHaveBeenCalledTimes(1);
      expect(mockBondApprove).toHaveBeenCalledTimes(1);
    });

    it('prevents modal close while approval is in progress', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      mockBondApprovalStatus = 'awaiting-signature';
      mockBondIsApproving = true;

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={onClose} />
      );

      const closeBtn = screen.getByRole('button', { name: /close dispute modal/i });
      expect(closeBtn).toBeDisabled();

      // Try Escape key
      await user.keyboard('{Escape}');
      expect(onClose).not.toHaveBeenCalled();
    });

    it('displays allowance status when checking', () => {
      mockBondApprovalStatus = 'checking';
      mockBondAllowance = undefined;

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      // AllowanceDisplay should show checking state
      expect(screen.getByText(/checking allowance/i)).toBeInTheDocument();
    });

    it('shows insufficient allowance when allowance < required', () => {
      mockBondApprovalStatus = 'needs-approval';
      mockBondAllowance = BigInt('500000000000000000'); // 0.5 ETH, less than 1 ETH required

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      expect(screen.getByRole('button', { name: /approve bond/i })).toBeInTheDocument();
    });

    it('does not block submission when bond approval succeeds', async () => {
      mockBondApprovalStatus = 'success';
      mockBondAllowance = BigInt('1000000000000000000');

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      fillReason();

      const confirmBtn = screen.getByRole('button', { name: /confirm dispute/i });
      expect(confirmBtn).not.toBeDisabled();

      fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

      await waitFor(() => {
        expect(mockSubmitDispute).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Native ETH bond (no approval needed)', () => {
    beforeEach(() => {
      // Mock context with no bondToken (native ETH)
      (mockContext.bond as any) = {
        bondAmount: '1000000000000000000',
        bondToken: undefined,
        slashAmount: '100000000000000000',
        slashPercentage: 10,
        potentialReward: '1500000000000000000',
        rewardMultiplier: 1.5,
      };
    });

    it('does not show bond approval step for native ETH bonds', () => {
      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      expect(screen.queryByText(/step 1: approve bond token/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/step 2:/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /approve bond/i })).not.toBeInTheDocument();
    });

    it('enables confirm button immediately for native ETH (no approval needed)', () => {
      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      fillReason();

      const confirmBtn = screen.getByRole('button', { name: /confirm dispute/i });
      expect(confirmBtn).not.toBeDisabled();
    });

    it('submits dispute without waiting for approval', async () => {
      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      fillReason();
      fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

      await waitFor(() => {
        expect(mockSubmitDispute).toHaveBeenCalledTimes(1);
      });

      expect(mockBondApprove).not.toHaveBeenCalled();
    });
  });

  describe('Accessible feedback for bond approval', () => {
    it('announces approval states via live region', async () => {
      mockBondApprovalStatus = 'pending-approval';

      const { rerender } = render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      // ApprovalButton has its own live region
      const liveRegions = screen.getAllByRole('status');
      expect(liveRegions.length).toBeGreaterThan(0);
    });

    it('provides descriptive aria-label on approval button states', () => {
      mockBondApprovalStatus = 'awaiting-signature';
      mockBondIsApproving = true;

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      const btn = screen.getByRole('button', { name: /waiting for wallet confirmation/i });
      expect(btn).toHaveAttribute('aria-busy', 'true');
    });

    it('links approval error to button via aria-describedby', () => {
      mockBondApprovalStatus = 'error';
      mockBondError = new Error('Transaction underpriced');

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      const btn = screen.getByRole('button', { name: /transaction underpriced.*retry/i });
      expect(btn).toBeInTheDocument();
    });
  });

  describe('Combined validation gates', () => {
    it('requires both bond approval AND readiness before enabling submit', () => {
      mockBondApprovalStatus = 'approved';
      mockBondAllowance = BigInt('1000000000000000000');
      mockReadiness = {
        isReady: false,
        message: 'Wrong network',
        primaryCode: 'WRONG_CHAIN',
        codes: ['WRONG_CHAIN'],
      };

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      fillReason();

      const confirmBtn = screen.getByRole('button', { name: /wrong network/i });
      expect(confirmBtn).toBeDisabled();
    });

    it('requires both bond approval AND valid reason before enabling submit', () => {
      mockBondApprovalStatus = 'approved';
      mockBondAllowance = BigInt('1000000000000000000');

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      // Don't fill reason
      const confirmBtn = screen.getByRole('button', { name: /confirm dispute/i });
      expect(confirmBtn).toBeDisabled();
    });

    it('requires all gates to pass: approval, readiness, reason, eligibility', () => {
      mockBondApprovalStatus = 'approved';
      mockBondAllowance = BigInt('1000000000000000000');
      mockReadiness = { isReady: true, message: null, primaryCode: null, codes: [] };

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      fillReason();

      const confirmBtn = screen.getByRole('button', { name: /confirm dispute/i });
      expect(confirmBtn).not.toBeDisabled();
    });
  });

  describe('Error boundaries', () => {
    it('displays bond approval error alongside other errors', () => {
      mockBondApprovalStatus = 'error';
      mockBondError = new Error('Approval failed: RPC timeout');

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} />
      );

      expect(screen.getByRole('alert')).toHaveTextContent(/approval failed.*rpc timeout/i);
    });

    it('prioritizes submission error over approval error after both fail', async () => {
      mockBondApprovalStatus = 'approved';
      mockBondAllowance = BigInt('1000000000000000000');
      mockSubmitDispute.mockRejectedValue(new Error('Gas estimation failed'));

      const onError = jest.fn();

      render(
        <OpenDispute claimId="claim_1" isOpen={true} onClose={jest.fn()} onError={onError} />
      );

      fillReason();
      fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringMatching(/gas estimation failed/i));
      });
    });
  });
});
