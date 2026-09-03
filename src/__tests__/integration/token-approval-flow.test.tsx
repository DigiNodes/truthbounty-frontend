/**
 * Token Approval Flow — Integration tests (V2-FE-016)
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useTokenApproval } from '@/hooks/useTokenApproval';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import {
  createMockUseAccount,
  MOCK_TX_HASH_1,
  MOCK_TX_HASH_2,
} from '@/__tests__/mocks/wagmi/mock-wagmi';

const mockReadContract = jest.fn();

jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  createPublicClient: jest.fn(() => ({
    readContract: mockReadContract,
  })),
  formatUnits: jest.fn((value: bigint, _decimals: number) => {
    return (Number(value) / 1e18).toString();
  }),
  http: jest.fn(),
}));

jest.mock('viem/chains', () => ({
  optimism: { id: 10, name: 'Optimism' },
  optimismSepolia: { id: 11155420, name: 'OP Sepolia' },
}));

jest.mock('@/lib/contracts/registry', () => ({
  getContractAddress: jest.fn(
    () => '0x1234567890123456789012345678901234567890',
  ),
  getReleaseChainId: jest.fn(() => 11155420),
  ERC20_ABI: [],
}));

jest.mock('@/lib/transaction-machine/transaction-machine.types', () => ({
  OPTIMISM_CHAIN_IDS: [10, 11155420],
}));

const mockUseAccountFn = jest.fn();
const mockUseChainIdFn = jest.fn(() => 11155420);
const mockWriteContractAsyncFn = jest.fn();
const mockUseWaitForReceiptFn = jest.fn();

jest.mock('wagmi', () => ({
  useAccount: (...args: unknown[]) => mockUseAccountFn(...args),
  useChainId: (...args: unknown[]) => mockUseChainIdFn(...args),
  useWriteContract: () => ({
    writeContractAsync: mockWriteContractAsyncFn,
    isPending: false,
    data: undefined,
    error: null,
  }),
  useWaitForTransactionReceipt: (...args: unknown[]) =>
    mockUseWaitForReceiptFn(...args),
}));

/** Set up readContract to return different values by functionName. */
function mockReads(config: {
  allowance?: bigint;
  balance?: bigint;
  decimals?: number;
  symbol?: string;
}) {
  mockReadContract.mockImplementation(
    async (args: { functionName: string }) => {
      switch (args.functionName) {
        case 'allowance':
          return config.allowance ?? 0n;
        case 'balanceOf':
          return config.balance ?? 0n;
        case 'decimals':
          return BigInt(config.decimals ?? 18);
        case 'symbol':
          return config.symbol ?? 'TBOUNTY';
        default:
          return 0n;
      }
    },
  );
}

describe('Token Approval Flow — Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountFn.mockReturnValue(
      createMockUseAccount({ isConnected: true })(),
    );
    mockUseChainIdFn.mockReturnValue(11155420);
    mockWriteContractAsyncFn.mockResolvedValue(MOCK_TX_HASH_1);
    mockUseWaitForReceiptFn.mockReturnValue({
      data: null,
      isLoading: false,
      isSuccess: false,
    });
    // Default: 100 token balance, 0 allowance
    mockReads({
      balance: BigInt('100000000000000000000'),
      allowance: 0n,
      decimals: 18,
    });
  });

  it('full approve → confirm → finalize lifecycle', async () => {
    const balanceHook = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(balanceHook.result.current.isLoading).toBe(false);
    });

    expect(balanceHook.result.current.balance).toBe(
      BigInt('100000000000000000000'),
    );
    expect(balanceHook.result.current.formattedBalance).toBe('100');

    const approvalHook = renderHook(() => useTokenApproval());

    await waitFor(() => {
      expect(approvalHook.result.current.isLoadingAllowance).toBe(false);
    });

    expect(approvalHook.result.current.allowance).toBe(BigInt(0));

    await act(async () => {
      await approvalHook.result.current.approve(
        BigInt('50000000000000000000'),
      );
    });

    expect(approvalHook.result.current.txHash).toBe(MOCK_TX_HASH_1);
    expect(approvalHook.result.current.status).toBe('loading');
  });

  it('reset-to-zero clears allowance', async () => {
    mockReads({
      balance: BigInt('100000000000000000000'),
      allowance: BigInt('50000000000000000000'),
      decimals: 18,
    });

    mockWriteContractAsyncFn.mockResolvedValue(MOCK_TX_HASH_2);

    const { result } = renderHook(() => useTokenApproval());

    await waitFor(() => {
      expect(result.current.isLoadingAllowance).toBe(false);
    });

    expect(result.current.allowance).toBe(BigInt('50000000000000000000'));

    await act(async () => {
      await result.current.resetApproval();
    });

    expect(result.current.txHash).toBe(MOCK_TX_HASH_2);
  });

  it('rejects approval when wallet is on wrong network', async () => {
    mockUseChainIdFn.mockReturnValue(1);
    mockUseAccountFn.mockReturnValue(
      createMockUseAccount({ isConnected: true, chainId: 1 })(),
    );

    const { result } = renderHook(() => useTokenApproval());

    await waitFor(() => {
      expect(result.current.isLoadingAllowance).toBe(false);
    });

    await act(async () => {
      await expect(
        result.current.approve(BigInt('1000000000000000000')),
      ).rejects.toThrow('Connected to chain');
    });
  });

  it('rejects approval when balance is insufficient', async () => {
    mockReads({
      balance: BigInt('1000000000000000000'), // 1 token
      allowance: 0n,
      decimals: 18,
    });

    const { result } = renderHook(() => useTokenApproval());

    await waitFor(() => {
      expect(result.current.isLoadingAllowance).toBe(false);
    });

    await act(async () => {
      await expect(
        result.current.approve(BigInt('10000000000000000000')), // 10 tokens
      ).rejects.toThrow('Insufficient balance');
    });

    expect(result.current.status).toBe('idle');
  });

  it('exposes error for rejected user transaction', async () => {
    mockWriteContractAsyncFn.mockRejectedValue(
      Object.assign(new Error('User rejected the request.'), {
        code: 4001,
      }),
    );

    const { result } = renderHook(() => useTokenApproval());

    await waitFor(() => {
      expect(result.current.isLoadingAllowance).toBe(false);
    });

    await act(async () => {
      await result.current.approve(BigInt('1000000000000000000'));
    });

    expect(result.current.error).toBe('Transaction rejected by user');
    expect(result.current.status).toBe('idle');
    expect(result.current.txHash).toBeNull();
  });
});
