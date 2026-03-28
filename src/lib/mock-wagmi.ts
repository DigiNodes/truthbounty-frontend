/**
 * Mock Wagmi hooks for testing without real blockchain dependency
 * These mocks simulate the behavior of wagmi hooks for development/testing
 */

import { useState, useCallback } from 'react';

// Mock account data
export interface MockAccount {
  address: `0x${string}`;
  chainId: number;
  balance: string;
}

// Mock chain data
export interface MockChain {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorers: {
    name: string;
    url: string;
  };
}

// Default mock account
const DEFAULT_MOCK_ACCOUNT: MockAccount = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
  chainId: 1,
  balance: '1.5',
};

// Default mock chain
export const MOCK_CHAIN: MockChain = {
  id: 1,
  name: 'Ethereum',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  blockExplorers: {
    name: 'Etherscan',
    url: 'https://etherscan.io',
  },
};

/**
 * Mock useAccount hook
 * Returns mock account state
 */
export function createMockUseAccount(config?: {
  isConnected?: boolean;
  isDisconnected?: boolean;
  address?: string;
  chainId?: number;
  balance?: string;
}) {
  return function useAccount() {
    const isConnected = config?.isConnected ?? true;
    const address = config?.address ?? DEFAULT_MOCK_ACCOUNT.address;
    const chainId = config?.chainId ?? DEFAULT_MOCK_ACCOUNT.chainId;
    const balance = config?.balance ?? DEFAULT_MOCK_ACCOUNT.balance;

    return {
      isConnected,
      isDisconnected: !isConnected,
      address: isConnected ? address : undefined,
      chainId: isConnected ? chainId : undefined,
      balances: [
        {
          address: address,
          balance: balance,
          symbol: 'ETH',
          decimals: 18,
        },
      ],
    };
  };
}

/**
 * Mock useDisconnect hook
 */
export function createMockUseDisconnect() {
  return function useDisconnect() {
    const [isPending, setIsPending] = useState(false);

    const disconnect = useCallback(async () => {
      setIsPending(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsPending(false);
    }, []);

    return { disconnect, isPending };
  };
}

/**
 * Mock useConnect hook
 */
export function createMockUseConnect() {
  return function useConnect() {
    const [isPending, setIsPending] = useState(false);

    const connect = useCallback(async () => {
      setIsPending(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsPending(false);
      return {
        accounts: [DEFAULT_MOCK_ACCOUNT.address],
        chainId: DEFAULT_MOCK_ACCOUNT.chainId,
      };
    }, []);

    const connectors = [
      {
        id: 'mock-injected',
        name: 'Mock Wallet',
        type: 'injected',
      },
    ];

    return { connect, connectors, isPending };
  };
}

/**
 * Mock useChainId hook
 */
export function createMockUseChainId() {
  return function useChainId() {
    return DEFAULT_MOCK_ACCOUNT.chainId;
  };
}

/**
 * Mock useWaitForTransactionReceipt hook
 * Simulates transaction confirmation
 */
export function createMockUseWaitForTransactionReceipt() {
  return function useWaitForTransactionReceipt() {
    const [status, setStatus] = useState<'pending' | 'success' | 'error'>('success');

    const data = {
      status: 'success',
      blockNumber: BigInt(12345678),
      confirmations: 12,
    };

    return {
      data,
      isLoading: false,
      isSuccess: status === 'success',
      isError: status === 'error',
      isPending: status === 'pending',
    };
  };
}

/**
 * Mock useWriteContract hook
 * Simulates writing to a smart contract
 */
export function createMockUseWriteContract() {
  return function useWriteContract() {
    const [isPending, setIsPending] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const writeContract = useCallback(async (config: {
      address: string;
      abi: unknown[];
      functionName: string;
      args?: unknown[];
    }) => {
      setIsPending(true);
      setIsLoading(true);
      
      // Simulate transaction delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const hash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;
      
      setIsPending(false);
      setIsLoading(false);
      
      return { hash };
    }, []);

    return {
      writeContract,
      data: undefined,
      isPending: false,
      isLoading: false,
      error: null,
    };
  };
}

/**
 * Mock useReadContract hook
 * Simulates reading from a smart contract
 */
export function createMockUseReadContract() {
  return function useReadContract(config: {
    address: string;
    abi: unknown[];
    functionName: string;
    args?: unknown[];
  }) {
    return {
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: async () => ({ data: null }),
    };
  };
}

/**
 * Mock useSimulateContract hook
 * Simulates contract simulation
 */
export function createMockUseSimulateContract() {
  return function useSimulateContract(config: {
    address: string;
    abi: unknown[];
    functionName: string;
    args?: unknown[];
  }) {
    return {
      data: {
        request: {
          address: config.address,
          abi: config.abi,
          functionName: config.functionName,
          args: config.args,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    };
  };
}

/**
 * Mock useSwitchChain hook
 */
export function createMockUseSwitchChain() {
  return function useSwitchChain() {
    const [isPending, setIsPending] = useState(false);

    const switchChain = useCallback(async (chainId: number) => {
      setIsPending(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsPending(false);
      return { id: chainId };
    }, []);

    return { switchChain, isPending };
  };
}

/**
 * Mock useSignMessage hook
 */
export function createMockUseSignMessage() {
  return function useSignMessage() {
    const [isLoading, setIsLoading] = useState(false);

    const signMessage = useCallback(async (config: { message: string }) => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsLoading(false);
      
      // Return a mock signature
      return `0x${Array.from({ length: 130 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;
    }, []);

    return { signMessage, isLoading };
  };
}

/**
 * Mock useSendTransaction hook
 */
export function createMockUseSendTransaction() {
  return function useSendTransaction() {
    const [isPending, setIsPending] = useState(false);

    const sendTransaction = useCallback(async (config: {
      to: string;
      value?: bigint;
      data?: string;
    }) => {
      setIsPending(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const hash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;
      
      setIsPending(false);
      return { hash };
    }, []);

    return { sendTransaction, isPending };
  };
}

// Re-export types for convenience
// These will work once dependencies are installed
export type MockChain = {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
};