/**
 * V2-FE-009 — TEST BOUNDARY ONLY
 *
 * Mock Wagmi hooks for unit/integration testing WITHOUT a real blockchain.
 * These mocks are NEVER imported from production code paths.
 *
 * Hashes in this file use deterministic fixtures (not Math.random) to
 * ensure reproducible test output.
 *
 * Original file: src/lib/mock-wagmi.ts (moved to test boundary)
 */

import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Deterministic test fixtures (no Math.random)
// ---------------------------------------------------------------------------

export const MOCK_ADDRESS_1 =
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const satisfies `0x${string}`;

export const MOCK_TX_HASH_1 =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const satisfies `0x${string}`;

export const MOCK_TX_HASH_2 =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const satisfies `0x${string}`;

export const MOCK_TX_HASH_REVERTED =
  '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as const satisfies `0x${string}`;

/** OP Sepolia — default test chain */
export const MOCK_CHAIN_ID = 11155420;

// ---------------------------------------------------------------------------
// Mock account data
// ---------------------------------------------------------------------------

export interface MockAccount {
  address: `0x${string}`;
  chainId: number;
}

export interface MockChain {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorers: { name: string; url: string };
}

export const MOCK_CHAIN: MockChain = {
  id: MOCK_CHAIN_ID,
  name: 'OP Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  blockExplorers: { name: 'Blockscout', url: 'https://optimism-sepolia.blockscout.com' },
};

// ---------------------------------------------------------------------------
// Factory hooks (deterministic, no side-effects beyond useState)
// ---------------------------------------------------------------------------

export function createMockUseAccount(config?: {
  isConnected?: boolean;
  address?: `0x${string}`;
  chainId?: number;
}) {
  return function useAccount() {
    const isConnected = config?.isConnected ?? true;
    return {
      isConnected,
      isDisconnected: !isConnected,
      address: isConnected ? (config?.address ?? MOCK_ADDRESS_1) : undefined,
      chainId: isConnected ? (config?.chainId ?? MOCK_CHAIN_ID) : undefined,
    };
  };
}

export function createMockUseChainId(chainId = MOCK_CHAIN_ID) {
  return function useChainId() {
    return chainId;
  };
}

export function createMockUseWriteContract(opts?: {
  /** Deterministic hash to return. Default: MOCK_TX_HASH_1 */
  returnHash?: `0x${string}`;
  /** If true, rejects with a user-rejection error. */
  rejectAsUser?: boolean;
  /** If true, rejects with a revert error. */
  rejectAsRevert?: boolean;
}) {
  return function useWriteContract() {
    const [isPending, setIsPending] = useState(false);

    const writeContractAsync = useCallback(async (_config: unknown) => {
      setIsPending(true);
      if (opts?.rejectAsUser) {
        setIsPending(false);
        throw Object.assign(new Error('User rejected the request.'), {
          code: 4001,
        });
      }
      if (opts?.rejectAsRevert) {
        setIsPending(false);
        throw new Error('Transaction reverted');
      }
      const hash = opts?.returnHash ?? MOCK_TX_HASH_1;
      setIsPending(false);
      return hash;
    }, []);

    return { writeContractAsync, isPending, data: undefined, error: null };
  };
}

export function createMockUseWaitForTransactionReceipt(opts?: {
  status?: 'success' | 'reverted';
  blockNumber?: bigint;
}) {
  return function useWaitForTransactionReceipt() {
    const status = opts?.status ?? 'success';
    const data =
      status === 'success'
        ? {
            status: 'success' as const,
            blockNumber: opts?.blockNumber ?? BigInt(123456),
            chainId: MOCK_CHAIN_ID,
          }
        : {
            status: 'reverted' as const,
            blockNumber: opts?.blockNumber ?? BigInt(123456),
            chainId: MOCK_CHAIN_ID,
          };
    return { data, isLoading: false, isSuccess: status === 'success' };
  };
}

export function createMockUseSendTransaction(opts?: {
  returnHash?: `0x${string}`;
  rejectAsUser?: boolean;
}) {
  return function useSendTransaction() {
    const [isPending, setIsPending] = useState(false);

    const sendTransactionAsync = useCallback(async (_config: unknown) => {
      setIsPending(true);
      if (opts?.rejectAsUser) {
        setIsPending(false);
        throw Object.assign(new Error('User rejected the request.'), {
          code: 4001,
        });
      }
      const hash = opts?.returnHash ?? MOCK_TX_HASH_1;
      setIsPending(false);
      return hash;
    }, []);

    return { sendTransactionAsync, isPending };
  };
}

export function createMockUseDisconnect() {
  return function useDisconnect() {
    const [isPending, setIsPending] = useState(false);
    const disconnect = useCallback(async () => {
      setIsPending(true);
      setIsPending(false);
    }, []);
    return { disconnect, isPending };
  };
}
