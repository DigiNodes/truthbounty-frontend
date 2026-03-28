/**
 * Mock wallet provider for testing
 * Wraps components with mocked Wagmi context for testing without real blockchain
 */

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types
interface MockWalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number;
  balance: string;
}

interface MockWalletContextValue {
  state: MockWalletState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: number) => Promise<void>;
  simulateTransaction: (config: {
    to: string;
    value?: string;
    data?: string;
  }) => Promise<{ hash: string }>;
}

// Default state
const DEFAULT_STATE: MockWalletState = {
  isConnected: false,
  address: null,
  chainId: 1,
  balance: '0',
};

const MOCK_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';

// Create context
const MockWalletContext = createContext<MockWalletContextValue | null>(null);

interface MockWalletProviderProps {
  children: ReactNode;
  initialState?: Partial<MockWalletState>;
}

/**
 * Mock Wallet Provider
 * Use this to wrap components that need wallet context during testing
 */
export function MockWalletProvider({ 
  children, 
  initialState = {} 
}: MockWalletProviderProps) {
  const [state, setState] = useState<MockWalletState>({
    ...DEFAULT_STATE,
    ...initialState,
  });

  const connect = useCallback(async () => {
    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setState({
      isConnected: true,
      address: MOCK_ADDRESS,
      chainId: 1,
      balance: '1.5',
    });
  }, []);

  const disconnect = useCallback(async () => {
    // Simulate disconnection delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    setState(DEFAULT_STATE);
  }, []);

  const switchChain = useCallback(async (chainId: number) => {
    // Simulate chain switch delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setState(prev => ({
      ...prev,
      chainId,
    }));
  }, []);

  const simulateTransaction = useCallback(async (config: {
    to: string;
    value?: string;
    data?: string;
  }) => {
    // Simulate transaction delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Generate mock hash
    const hash = '0x' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    return { hash };
  }, []);

  const value: MockWalletContextValue = {
    state,
    connect,
    disconnect,
    switchChain,
    simulateTransaction,
  };

  return (
    <MockWalletContext.Provider value={value}>
      {children}
    </MockWalletContext.Provider>
  );
}

/**
 * Hook to access mock wallet context
 */
export function useMockWallet() {
  const context = useContext(MockWalletContext);
  
  if (!context) {
    throw new Error('useMockWallet must be used within a MockWalletProvider');
  }
  
  return context;
}

/**
 * Hook to get mock account data (compatible with wagmi's useAccount)
 */
export function useMockAccount() {
  const { state } = useMockWallet();
  
  return {
    isConnected: state.isConnected,
    isDisconnected: !state.isConnected,
    address: state.address as `0x${string}` | undefined,
    chainId: state.chainId,
  };
}

/**
 * Hook to get mock chain id (compatible with wagmi's useChainId)
 */
export function useMockChainId() {
  const { state } = useMockWallet();
  return state.chainId;
}

/**
 * Mock disconnect hook
 */
export function useMockDisconnect() {
  const { disconnect } = useMockWallet();
  
  return {
    disconnect,
    isPending: false,
  };
}

/**
 * Mock connect hook
 */
export function useMockConnect() {
  const { connect } = useMockWallet();
  
  return {
    connect,
    isPending: false,
    connectors: [
      {
        id: 'mock-injected',
        name: 'Mock Wallet',
        type: 'injected',
      },
    ],
  };
}

/**
 * Mock write contract hook
 */
export function useMockWriteContract() {
  const { simulateTransaction } = useMockWallet();
  
  const writeContract = useCallback(async (config: {
    address: string;
    abi: unknown[];
    functionName: string;
    args?: unknown[];
  }) => {
    return simulateTransaction({
      to: config.address,
    });
  }, [simulateTransaction]);
  
  return {
    writeContract,
    data: undefined,
    isPending: false,
    isLoading: false,
    error: null,
  };
}

/**
 * Mock send transaction hook
 */
export function useMockSendTransaction() {
  const { simulateTransaction } = useMockWallet();
  
  const sendTransaction = useCallback(async (config: {
    to: string;
    value?: bigint;
    data?: string;
  }) => {
    return simulateTransaction({
      to: config.to,
      value: config.value?.toString(),
      data: config.data,
    });
  }, [simulateTransaction]);
  
  return {
    sendTransaction,
    isPending: false,
  };
}

/**
 * Mock wait for transaction receipt hook
 */
export function useMockWaitForTransactionReceipt() {
  return function useWaitForTransactionReceipt(config: { hash: string }) {
    const [status, setStatus] = useState<'pending' | 'success' | 'error'>('success');
    
    // Simulate confirmation
    React.useEffect(() => {
      const timer = setTimeout(() => {
        setStatus('success');
      }, 2000);
      
      return () => clearTimeout(timer);
    }, [config.hash]);
    
    return {
      data: status === 'success' ? {
        status: 'success' as const,
        blockNumber: BigInt(15000000),
        confirmations: 12,
      } : undefined,
      isLoading: status === 'pending',
      isSuccess: status === 'success',
      isError: status === 'error',
      isPending: status === 'pending',
    };
  };
}

// Export the provider as default for easy use
export default MockWalletProvider;