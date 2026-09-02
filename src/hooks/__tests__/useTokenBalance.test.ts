/**
 * useTokenBalance — Unit tests (V2-FE-016)
 *
 * Covers:
 *  - Successful balance and decimals read from canonical contract
 *  - Disconnected wallet returns null state
 *  - RPC error surfaces error message
 *  - Refetch re-reads from contract
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useTokenBalance } from '../useTokenBalance';
import {
  createMockUseAccount,
  createMockUseChainId,
  MOCK_CHAIN_ID,
} from '@/__tests__/mocks/wagmi/mock-wagmi';

// Mock viem readContract
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

// Use standalone jest.fn() references that are overridden per-test
const mockUseAccountFn = jest.fn();
const mockUseChainIdFn = jest.fn(() => MOCK_CHAIN_ID);

jest.mock('wagmi', () => ({
  useAccount: (...args: unknown[]) => mockUseAccountFn(...args),
  useChainId: (...args: unknown[]) => mockUseChainIdFn(...args),
}));

describe('useTokenBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: connected wallet
    mockUseAccountFn.mockReturnValue(
      createMockUseAccount({ isConnected: true })(),
    );
    mockUseChainIdFn.mockReturnValue(MOCK_CHAIN_ID);
  });

  it('reads balance, decimals, and symbol from canonical contract', async () => {
    mockReadContract
      .mockResolvedValueOnce(BigInt('150000000000000000000')) // balanceOf
      .mockResolvedValueOnce(BigInt(18)) // decimals
      .mockResolvedValueOnce('TBOUNTY'); // symbol

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.balance).toBe(BigInt('150000000000000000000'));
    expect(result.current.decimals).toBe(18);
    expect(result.current.symbol).toBe('TBOUNTY');
    expect(result.current.formattedBalance).toBe('150');
    expect(result.current.error).toBeNull();
  });

  it('returns null state when wallet is disconnected', async () => {
    mockUseAccountFn.mockReturnValue(
      createMockUseAccount({ isConnected: false })(),
    );

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.balance).toBeNull();
    expect(result.current.decimals).toBeNull();
    expect(result.current.symbol).toBeNull();
    expect(result.current.formattedBalance).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns error when RPC call fails', async () => {
    mockReadContract.mockRejectedValue(
      new Error('RPC endpoint unavailable'),
    );

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('RPC endpoint unavailable');
    expect(result.current.balance).toBeNull();
  });

  it('refetch re-reads from contract', async () => {
    mockReadContract
      .mockResolvedValueOnce(BigInt('1000000000000000000')) // initial balance
      .mockResolvedValueOnce(BigInt(18)) // decimals
      .mockResolvedValueOnce('TBOUNTY') // symbol
      .mockResolvedValueOnce(BigInt('2000000000000000000')) // refetch balance
      .mockResolvedValueOnce(BigInt(18)) // decimals
      .mockResolvedValueOnce('TBOUNTY'); // symbol

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.formattedBalance).toBe('1');

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.formattedBalance).toBe('2');
    });
  });
});
