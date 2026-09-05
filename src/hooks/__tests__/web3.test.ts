import { renderHook } from '@testing-library/react';
import { formatAddress, useCanonicalAccount, useIsSupportedChain } from '../web3';

// Mock wagmi hooks
const mockUseWagmiAccount = jest.fn();
const mockUseWagmiChainId = jest.fn();

jest.mock('wagmi', () => ({
  useAccount: () => mockUseWagmiAccount(),
  useChainId: () => mockUseWagmiChainId(),
  useSwitchChain: () => ({ switchChain: jest.fn() }),
  useDisconnect: () => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() }),
  usePublicClient: () => ({}),
  useWalletClient: () => ({}),
  http: jest.fn(() => ({})),
  createStorage: jest.fn(() => ({})),
  cookieStorage: {},
  WagmiProvider: ({ children }: any) => children,
}));

describe('web3 hooks and utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatAddress', () => {
    it('formats valid address correctly', () => {
      expect(formatAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E')).toBe('0x742d...eB1E');
    });

    it('handles null/undefined gracefully', () => {
      expect(formatAddress(null)).toBe('');
      expect(formatAddress(undefined)).toBe('');
      expect(formatAddress('')).toBe('');
    });

    it('returns short strings as-is', () => {
      expect(formatAddress('0x123')).toBe('0x123');
    });
  });

  describe('useCanonicalAccount', () => {
    it('returns canonical account state with supported network flag for Optimism (10)', () => {
      mockUseWagmiAccount.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        isDisconnected: false,
        status: 'connected',
        chainId: 10,
        chain: { id: 10, name: 'OP Mainnet' },
        connector: { id: 'injected', name: 'MetaMask' },
      });

      const { result } = renderHook(() => useCanonicalAccount());

      expect(result.current.address).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E');
      expect(result.current.displayName).toBe('0x742d...eB1E');
      expect(result.current.isConnected).toBe(true);
      expect(result.current.chainId).toBe(10);
      expect(result.current.isSupportedNetwork).toBe(true);
    });

    it('flags unsupported network when connected to other chain', () => {
      mockUseWagmiAccount.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        isDisconnected: false,
        status: 'connected',
        chainId: 1, // Ethereum mainnet, not Optimism
        chain: { id: 1, name: 'Ethereum' },
        connector: { id: 'injected', name: 'MetaMask' },
      });

      const { result } = renderHook(() => useCanonicalAccount());

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isSupportedNetwork).toBe(false);
    });
  });

  describe('useIsSupportedChain', () => {
    it('detects Optimism Sepolia as supported', () => {
      mockUseWagmiChainId.mockReturnValue(11155420);

      const { result } = renderHook(() => useIsSupportedChain());

      expect(result.current.isSupported).toBe(true);
      expect(result.current.chainId).toBe(11155420);
    });

    it('detects unknown chain as unsupported', () => {
      mockUseWagmiChainId.mockReturnValue(999);

      const { result } = renderHook(() => useIsSupportedChain());

      expect(result.current.isSupported).toBe(false);
    });
  });
});
