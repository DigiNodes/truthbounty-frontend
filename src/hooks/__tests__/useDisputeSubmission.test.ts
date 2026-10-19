import { act, renderHook, waitFor } from '@testing-library/react';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import { useDisputeSubmission } from '@/hooks/useDisputeSubmission';

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
const MAX_UINT256 = 2n ** 256n - 1n;

const BOND = 5n * 10n ** 18n;
const BALANCE = 50n * 10n ** 18n;
const NOW = BigInt(Math.floor(Date.now() / 1000));
const FUTURE_DEADLINE = NOW + 86_400n;

const mockedUseAccount = useAccount as jest.Mock;
const mockedUseChainId = useChainId as jest.Mock;
const mockedUsePublicClient = usePublicClient as jest.Mock;
const mockedUseReadContract = useReadContract as jest.Mock;
const mockedUseWriteContract = useWriteContract as jest.Mock;

const mockWriteContractAsync = jest.fn();
const mockSimulateContract = jest.fn();
const mockGetTransactionReceipt = jest.fn();
const readRefetch = jest.fn(async () => undefined);

let allowanceValue = 100n * 10n ** 18n;
let openChallengeValue = false;

function createReadStore() {
  return {
    getChallengeBond: () => ({ data: BOND, isLoading: false, refetch: readRefetch }),
    getChallengeDeadline: () => ({
      data: FUTURE_DEADLINE,
      isLoading: false,
      refetch: readRefetch,
    }),
    hasOpenChallenge: () => ({
      get data() {
        return openChallengeValue;
      },
      isLoading: false,
      refetch: readRefetch,
    }),
    allowance: () => ({
      get data() {
        return allowanceValue;
      },
      isLoading: false,
      refetch: readRefetch,
    }),
    balanceOf: () => ({ data: BALANCE, isLoading: false, refetch: readRefetch }),
  };
}

let readStore = createReadStore();

function installMocks() {
  mockedUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
    const factory = (readStore as Record<string, () => unknown>)[functionName];
    return factory
      ? factory()
      : { data: undefined, isLoading: false, refetch: readRefetch };
  });

  mockWriteContractAsync.mockImplementation(({ functionName }: { functionName: string }) => {
    if (functionName === 'approve') {
      // Simulate the approval tx updating on-chain allowance.
      allowanceValue = MAX_UINT256;
      return Promise.resolve(`0x${'aa'.repeat(32)}`);
    }
    // openChallenge: the contract records an open challenge.
    openChallengeValue = true;
    return Promise.resolve(TX_HASH);
  });
  mockedUseWriteContract.mockReturnValue({ writeContractAsync: mockWriteContractAsync });

  mockSimulateContract.mockResolvedValue({ request: {} });
  mockGetTransactionReceipt.mockResolvedValue({
    transactionHash: TX_HASH,
    status: '0x1',
    blockNumber: 999n,
  });
  mockedUsePublicClient.mockReturnValue({
    simulateContract: mockSimulateContract,
    getTransactionReceipt: mockGetTransactionReceipt,
  });

  mockedUseAccount.mockReturnValue({ address: WALLET, isConnected: true });
  mockedUseChainId.mockReturnValue(CHAIN);
}

function pinEnv() {
  process.env.NEXT_PUBLIC_TRUTHBOUNTY_PROTOCOL_RELEASE_TAG = 'v2-sc-014@v0.1.0';
  process.env.NEXT_PUBLIC_TRUTHBOUNTY_DISPUTE_ADDRESS = DISPUTE_CONTRACT;
  process.env.NEXT_PUBLIC_TRUTHBOUNTY_STAKING_TOKEN_ADDRESS = STAKING_TOKEN;
}

function clearEnv() {
  delete process.env.NEXT_PUBLIC_TRUTHBOUNTY_PROTOCOL_RELEASE_TAG;
  delete process.env.NEXT_PUBLIC_TRUTHBOUNTY_DISPUTE_ADDRESS;
  delete process.env.NEXT_PUBLIC_TRUTHBOUNTY_STAKING_TOKEN_ADDRESS;
}

beforeEach(() => {
  jest.clearAllMocks();
  allowanceValue = 100n * 10n ** 18n;
  openChallengeValue = false;
  readStore = createReadStore();
  pinEnv();
  installMocks();
});

afterEach(() => {
  clearEnv();
});

async function renderReady(
  config: Parameters<typeof useDisputeSubmission>[0] = { claimId: '123', chainId: CHAIN }
) {
  const rendered = renderHook(() => useDisputeSubmission(config));
  await waitFor(() => {
    expect(rendered.result.current.challengeWindow?.isOpen).toBe(true);
  });
  return rendered;
}

const REASON = 'the verification signature is invalid';

describe('useDisputeSubmission', () => {
  it('fails closed with PROTOCOL_DISABLED when the artifact is not pinned', async () => {
    clearEnv();
    const { result } = renderHook(() =>
      useDisputeSubmission({ claimId: '123', chainId: CHAIN })
    );
    await waitFor(() => expect(result.current.artifact.isDeployed).toBe(false));

    await act(async () => {
      await expect(
        result.current.submitDispute({ reason: REASON })
      ).rejects.toMatchObject({ code: 'PROTOCOL_DISABLED' });
    });
    expect(result.current.phase).toBe('error');
  });

  it('rejects UNCONNECTED wallets', async () => {
    mockedUseAccount.mockReturnValue({ address: undefined, isConnected: false });
    const { result } = await renderReady();

    await act(async () => {
      await expect(
        result.current.submitDispute({ reason: REASON })
      ).rejects.toMatchObject({ code: 'UNCONNECTED' });
    });
    expect(mockWriteContractAsync).not.toHaveBeenCalled();
  });

  it('rejects a WRONG_NETWORK submission', async () => {
    mockedUseChainId.mockReturnValue(1);
    const { result } = await renderReady();

    await act(async () => {
      await expect(
        result.current.submitDispute({ reason: REASON })
      ).rejects.toMatchObject({ code: 'WRONG_NETWORK' });
    });
    expect(mockWriteContractAsync).not.toHaveBeenCalled();
  });

  it('rejects an INVALID_CLAIM id', async () => {
    const { result } = renderHook(() =>
      useDisputeSubmission({ claimId: 'not-a-claim', chainId: CHAIN })
    );

    await act(async () => {
      await expect(
        result.current.submitDispute({ reason: REASON })
      ).rejects.toMatchObject({ code: 'INVALID_CLAIM' });
    });
    expect(mockWriteContractAsync).not.toHaveBeenCalled();
  });

  it('prevents a duplicate CHALLENGE_EXISTS submission', async () => {
    openChallengeValue = true;
    const { result } = renderHook(() =>
      useDisputeSubmission({ claimId: '123', chainId: CHAIN })
    );
    await waitFor(() => {
      expect(result.current.challengeWindow?.hasOpenChallenge).toBe(true);
    });

    await act(async () => {
      await expect(
        result.current.submitDispute({ reason: REASON })
      ).rejects.toMatchObject({ code: 'CHALLENGE_EXISTS' });
    });
    expect(mockWriteContractAsync).not.toHaveBeenCalled();
  });

  it('rejects an INVALID_REASON before spending gas', async () => {
    const { result } = await renderReady();

    await act(async () => {
      await expect(
        result.current.submitDispute({ reason: 'bad' })
      ).rejects.toMatchObject({ code: 'INVALID_REASON' });
    });
    expect(mockWriteContractAsync).not.toHaveBeenCalled();
  });

  it('rejects an INSUFFICIENT_BALANCE submission', async () => {
    readStore.balanceOf = () => ({ data: 1n, isLoading: false, refetch: readRefetch });
    const { result } = await renderReady();

    await act(async () => {
      await expect(
        result.current.submitDispute({ reason: REASON })
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });
    expect(mockWriteContractAsync).not.toHaveBeenCalled();
  });

  it('runs the full submission flow to confirmed', async () => {
    const { result } = await renderReady();

    let outcome: Awaited<ReturnType<typeof result.current.submitDispute>>;
    await act(async () => {
      outcome = await result.current.submitDispute({ reason: REASON });
    });

    expect(outcome!.phase).toBe('confirmed');
    expect(result.current.lastTxHash).toBe(TX_HASH);
    expect(result.current.reconciliation?.status).toBe('confirmed');

    // No approval needed when allowance already covers the bond.
    expect(mockWriteContractAsync).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'openChallenge' })
    );
    expect(mockWriteContractAsync).not.toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'approve' })
    );
    expect(mockSimulateContract).toHaveBeenCalled();
    expect(mockGetTransactionReceipt).toHaveBeenCalledWith({ hash: TX_HASH });
  });

  it('approves max allowance first when the allowance is insufficient', async () => {
    allowanceValue = 0n;
    const { result } = await renderReady();

    await act(async () => {
      await result.current.submitDispute({ reason: REASON });
    });

    const calls = mockWriteContractAsync.mock.calls.map(
      (call: [{ functionName: string }]) => call[0].functionName
    );
    expect(calls).toEqual(['approve', 'openChallenge']);
    expect(mockWriteContractAsync.mock.calls[0][0].args[1]).toBe(MAX_UINT256);
    expect(result.current.reconciliation?.status).toBe('confirmed');
  });

  it('fails with APPROVAL_REJECTED when the wallet rejects approve', async () => {
    allowanceValue = 0n;
    mockWriteContractAsync.mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'approve') return Promise.reject(new Error('user rejected'));
      return Promise.resolve(TX_HASH);
    });
    const { result } = await renderReady();

    await act(async () => {
      await expect(
        result.current.submitDispute({ reason: REASON })
      ).rejects.toMatchObject({ code: 'APPROVAL_REJECTED' });
    });
    expect(result.current.phase).toBe('error');
  });

  it('surfaces SIMULATION_REVERTED when eth_call fails', async () => {
    mockSimulateContract.mockRejectedValue(new Error('Challenge window closed'));
    const { result } = await renderReady();

    await act(async () => {
      await expect(
        result.current.submitDispute({ reason: REASON })
      ).rejects.toMatchObject({ code: 'SIMULATION_REVERTED' });
    });
    expect(mockWriteContractAsync).not.toHaveBeenCalled();
  });

  it('returns rejected when the receipt is a revert', async () => {
    mockGetTransactionReceipt.mockResolvedValue({
      transactionHash: TX_HASH,
      status: '0x0',
      blockNumber: 999n,
    });
    const { result } = await renderReady();

    let outcome: Awaited<ReturnType<typeof result.current.submitDispute>>;
    await act(async () => {
      outcome = await result.current.submitDispute({ reason: REASON });
    });

    expect(outcome!.phase).toBe('rejected');
    expect(outcome!.reconciliation?.status).toBe('rejected');
    expect(result.current.phase).toBe('rejected');
  });
});
