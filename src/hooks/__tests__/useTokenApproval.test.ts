/**
 * useTokenApproval — Unit tests (V2-FE-016)
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useTokenApproval } from '../useTokenApproval';
import {
  createMockUseAccount,
  MOCK_TX_HASH_1,
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
}) {
  mockReadContract.mockImplementation(async (args: { functionName: string }) => {
    switch (args.functionName) {
      case 'allowance':
        return config.allowance ?? 0n;
      case 'balanceOf':
        return config.balance ?? 0n;
      case 'decimals':
        return BigInt(config.decimals ?? 18);
      case 'symbol':
        return 'TBOUNTY';
      default:
        return 0n;
    }
  });
}

describe('useTokenApproval', () => {
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
    // Default: 50 token allowance, 100 token balance
    mockReads({ allowance: BigInt('50000000000000000000'), balance: BigInt('100000000000000000000'), decimals: 18 });
  });

  describe('allowance reading', () => {
    it('reads allowance and decimals from canonical contract', async () => {
      const { result } = renderHook(() => useTokenApproval());

      await waitFor(() => {
        expect(result.current.isLoadingAllowance).toBe(false);
      });

      expect(result.current.allowance).toBe(BigInt('50000000000000000000'));
      expect(result.current.decimals).toBe(18);
      expect(result.current.formattedAllowance).toBe('50');
      expect(result.current.error).toBeNull();
    });

    it('returns null state when wallet is disconnected', async () => {
      mockUseAccountFn.mockReturnValue(
        createMockUseAccount({ isConnected: false })(),
      );

      const { result } = renderHook(() => useTokenApproval());

      await waitFor(() => {
        expect(result.current.isLoadingAllowance).toBe(false);
      });

      expect(result.current.allowance).toBeNull();
    });
  });

  describe('validation guards', () => {
    it('rejects unlimited approval (MAX_UINT256) by default', async () => {
      const { result } = renderHook(() => useTokenApproval());

      await waitFor(() => {
        expect(result.current.isLoadingAllowance).toBe(false);
      });

      await act(async () => {
        await expect(
          result.current.approve(2n ** 256n - 1n),
        ).rejects.toThrow('Unlimited approval rejected');
      });

      expect(result.current.status).toBe('idle');
    });

    it('allows unlimited approval when allowUnlimited is true', async () => {
      // Set balance higher than MAX_UINT256 to pass the balance check
      mockReads({
        allowance: 0n,
        balance: 2n ** 256n, // exceeds MAX_UINT256
        decimals: 18,
      });

      const { result } = renderHook(() =>
        useTokenApproval({ allowUnlimited: true }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingAllowance).toBe(false);
      });

      await act(async () => {
        await result.current.approve(2n ** 256n - 1n);
      });

      expect(result.current.txHash).toBe(MOCK_TX_HASH_1);
    });

    it('rejects zero amount', async () => {
      const { result } = renderHook(() => useTokenApproval());

      await waitFor(() => {
        expect(result.current.isLoadingAllowance).toBe(false);
      });

      await act(async () => {
        await expect(result.current.approve(0n)).rejects.toThrow(
          'Amount must be > 0',
        );
      });
    });

    it('rejects insufficient balance', async () => {
      mockReads({ allowance: 0n, balance: BigInt('1000000000000000000'), decimals: 18 });

      const { result } = renderHook(() => useTokenApproval());

      await waitFor(() => {
        expect(result.current.isLoadingAllowance).toBe(false);
      });

      await act(async () => {
        await expect(
          result.current.approve(BigInt('10000000000000000000')),
        ).rejects.toThrow('Insufficient balance');
      });
    });
  });

  describe('transaction flow', () => {
    it('submits exact approval', async () => {
      const { result } = renderHook(() => useTokenApproval());

      await waitFor(() => {
        expect(result.current.isLoadingAllowance).toBe(false);
      });

      await act(async () => {
        await result.current.approve(BigInt('50000000000000000000'));
      });

      expect(result.current.txHash).toBe(MOCK_TX_HASH_1);
      expect(result.current.status).toBe('loading');
    });

    it('handles user rejection', async () => {
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
    });

    it('handles reverted transaction', async () => {
      mockWriteContractAsyncFn.mockRejectedValue(
        new Error('Transaction reverted'),
      );

      const { result } = renderHook(() => useTokenApproval());

      await waitFor(() => {
        expect(result.current.isLoadingAllowance).toBe(false);
      });

      await act(async () => {
        await result.current.approve(BigInt('1000000000000000000'));
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Transaction reverted');
    });
  });

  describe('reset-to-zero', () => {
    it('submits approve(spender, 0) for reset', async () => {
      const { result } = renderHook(() => useTokenApproval());

      await waitFor(() => {
        expect(result.current.isLoadingAllowance).toBe(false);
      });

      expect(result.current.allowance).toBe(BigInt('50000000000000000000'));

      await act(async () => {
        await result.current.resetApproval();
      });

      expect(result.current.txHash).toBe(MOCK_TX_HASH_1);
    });
  });
});
