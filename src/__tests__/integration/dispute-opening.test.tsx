/**
 * Integration: wallet-driven challenge opening.
 *
 * Exercises the real `useDisputeSubmission` hook through the `OpenDispute`
 * modal with mocked wagmi primitives — no fabricated calldata, gas, or
 * receipts. Lifecycle state is driven by the confirmed receipt + on-chain read.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import { OpenDispute } from '@/components/features/disputes/OpenDispute';

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useChainId: jest.fn(),
  usePublicClient: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
}));

const WALLET = '0x0000000000000000000000000000000000000001';
const DISPUTE_CONTRACT = '0x1111111111111111111111111111111111111111';
const STAKING_TOKEN = '0x3333333333333333333333333333333333333333';
const CHAIN = 11155420;
const TX_HASH = `0x${'ab'.repeat(32)}` as `0x${string}`;

const BOND = 5n * 10n ** 18n;
const BALANCE = 50n * 10n ** 18n;
const NOW = BigInt(Math.floor(Date.now() / 1000));
const FUTURE_DEADLINE = NOW + 86_400n;
const REASON = 'the verification signature is invalid';

const mockedUseReadContract = useReadContract as jest.Mock;
const mockWriteContractAsync = jest.fn();
const mockGetTransactionReceipt = jest.fn();
const readRefetch = jest.fn(async () => undefined);

let openChallengeValue = false;
// Refetch resolves with the *fresh* read result, while `.data` deliberately
// stays on the pre-write value until the next render — same as real wagmi.
const readOpenChallengeRefetch = jest.fn(async () => ({ data: openChallengeValue }));

function installMocks() {
  mockedUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
    switch (functionName) {
      case 'getChallengeBond':
        return { data: BOND, isLoading: false, refetch: readRefetch };
      case 'getChallengeDeadline':
        return { data: FUTURE_DEADLINE, isLoading: false, refetch: readRefetch };
      case 'hasOpenChallenge':
        return {
          get data() {
            return openChallengeValue;
          },
          isLoading: false,
          refetch: readOpenChallengeRefetch,
        };
      case 'allowance':
        return { data: 100n * 10n ** 18n, isLoading: false, refetch: readRefetch };
      case 'balanceOf':
        return { data: BALANCE, isLoading: false, refetch: readRefetch };
      default:
        return { data: undefined, isLoading: false, refetch: readRefetch };
    }
  });

  mockWriteContractAsync.mockImplementation(({ functionName }: { functionName: string }) => {
    if (functionName === 'openChallenge') openChallengeValue = true;
    return Promise.resolve(TX_HASH);
  });
  (useWriteContract as jest.Mock).mockReturnValue({
    writeContractAsync: mockWriteContractAsync,
  });

  mockGetTransactionReceipt.mockResolvedValue({
    transactionHash: TX_HASH,
    status: '0x1',
    blockNumber: 999n,
  });
  (usePublicClient as jest.Mock).mockReturnValue({
    simulateContract: jest.fn().mockResolvedValue({ request: {} }),
    getTransactionReceipt: mockGetTransactionReceipt,
  });

  (useAccount as jest.Mock).mockReturnValue({ address: WALLET, isConnected: true });
  (useChainId as jest.Mock).mockReturnValue(CHAIN);
}

beforeEach(() => {
  jest.clearAllMocks();
  openChallengeValue = false;
  process.env.NEXT_PUBLIC_TRUTHBOUNTY_PROTOCOL_RELEASE_TAG = 'v2-sc-014@v0.1.0';
  process.env.NEXT_PUBLIC_TRUTHBOUNTY_DISPUTE_ADDRESS = DISPUTE_CONTRACT;
  process.env.NEXT_PUBLIC_TRUTHBOUNTY_STAKING_TOKEN_ADDRESS = STAKING_TOKEN;
  installMocks();
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_TRUTHBOUNTY_PROTOCOL_RELEASE_TAG;
  delete process.env.NEXT_PUBLIC_TRUTHBOUNTY_DISPUTE_ADDRESS;
  delete process.env.NEXT_PUBLIC_TRUTHBOUNTY_STAKING_TOKEN_ADDRESS;
});

describe('Challenge opening integration', () => {
  it('opens a challenge and drives the confirmed state from the receipt', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    render(<OpenDispute claimId="123" isOpen onClose={jest.fn()} onSuccess={onSuccess} />);

    // Canonical terms loaded from on-chain reads.
    await screen.findByText('5.0000 tokens');
    await user.type(screen.getByLabelText(/reason for challenge/i), REASON);
    await user.click(screen.getByRole('button', { name: /confirm challenge/i }));

    await waitFor(() =>
      expect(screen.getByText(/confirmed on-chain/i)).toBeInTheDocument()
    );

    expect(mockWriteContractAsync).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'openChallenge', address: DISPUTE_CONTRACT })
    );
    expect(mockGetTransactionReceipt).toHaveBeenCalledWith({ hash: TX_HASH });
    expect(onSuccess).toHaveBeenCalledWith(TX_HASH);
  });

  it('surfaces a wallet rejection and allows recovery', async () => {
    const user = userEvent.setup();
    const onError = jest.fn();
    mockWriteContractAsync.mockRejectedValue(new Error('User rejected the request.'));
    render(<OpenDispute claimId="123" isOpen onClose={jest.fn()} onError={onError} />);

    await screen.findByText('5.0000 tokens');
    await user.type(screen.getByLabelText(/reason for challenge/i), REASON);
    await user.click(screen.getByRole('button', { name: /confirm challenge/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/user rejected/i);
    expect(onError).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /confirm challenge/i })).toBeEnabled();
  });

  it('fails closed when a challenge already exists on-chain', async () => {
    openChallengeValue = true;
    render(<OpenDispute claimId="123" isOpen onClose={jest.fn()} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/already been opened/i);
    expect(screen.getByRole('button', { name: /confirm challenge/i })).toBeDisabled();
  });
});
