import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAccount, useDisconnect } from '../useAccount';

// Mock wagmi hooks
const mockUseWagmiAccount = jest.fn();
const mockDisconnectAsync = jest.fn();

jest.mock('wagmi', () => ({
  useAccount: () => mockUseWagmiAccount(),
  useDisconnect: () => ({
    disconnect: jest.fn(),
    disconnectAsync: mockDisconnectAsync,
  }),
  useChainId: () => 10,
  useSwitchChain: () => ({ switchChain: jest.fn() }),
  usePublicClient: () => ({}),
  useWalletClient: () => ({}),
  http: jest.fn(() => ({})),
  createStorage: jest.fn(() => ({})),
  cookieStorage: {},
  WagmiProvider: ({ children }: any) => children,
}));

describe('useAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns formatted account data when connected', () => {
    mockUseWagmiAccount.mockReturnValue({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E' as `0x${string}`,
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
      chainId: 10,
    });

    function TestComp() {
      const account = useAccount();
      return (
        <div>
          <div data-testid="addr">{account?.address}</div>
          <div data-testid="display">{account?.displayName}</div>
          <div data-testid="connected">{String(account?.isConnected)}</div>
          <div data-testid="chain">{account?.chainId}</div>
        </div>
      );
    }

    render(<TestComp />);

    expect(screen.getByTestId('addr')).toHaveTextContent('0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E');
    expect(screen.getByTestId('display')).toHaveTextContent('0x742d...eB1E');
    expect(screen.getByTestId('connected')).toHaveTextContent('true');
    expect(screen.getByTestId('chain')).toHaveTextContent('10');
  });

  test('returns null when disconnected', () => {
    mockUseWagmiAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      chainId: undefined,
    });

    function TestComp() {
      const account = useAccount();
      return <div data-testid="addr">{account ? account.address : 'null'}</div>;
    }

    render(<TestComp />);

    expect(screen.getByTestId('addr')).toHaveTextContent('null');
  });

  test('useDisconnect triggers disconnectAsync', async () => {
    mockDisconnectAsync.mockResolvedValue(undefined);

    function TestComp() {
      const disconnect = useDisconnect();
      return (
        <button data-testid="disconnect-btn" onClick={() => disconnect()}>
          Disconnect
        </button>
      );
    }

    render(<TestComp />);

    act(() => {
      screen.getByTestId('disconnect-btn').click();
    });

    await waitFor(() => {
      expect(mockDisconnectAsync).toHaveBeenCalledTimes(1);
    });
  });
});
