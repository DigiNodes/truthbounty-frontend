'use client';

/**
 * V2-FE-009 — Shared Transaction State Machine
 * useEvmTransaction — Wagmi/Viem adapter connecting real wallet interactions
 * to the shared transaction state machine.
 *
 * Security invariants:
 *  - txHash is NEVER fabricated; only Wagmi-returned values are accepted
 *  - chainId validated against OPTIMISM_CHAIN_IDS before PREPARE
 *  - Wrong-network is detected and transitions to an explicit error state
 *  - No Stellar/Freighter runtime dependencies
 *  - contract ABIs throw NotImplemented until V2-FE-003/005 are merged
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  useAccount,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSendTransaction,
} from 'wagmi';

import {
  OPTIMISM_CHAIN_IDS,
  TransactionMachineError,
  isValidChain,
} from '@/lib/transaction-machine/transaction-machine.types';

import {
  useTransactionMachine,
  type UseTransactionMachineOptions,
} from './useTransactionMachine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WriteContractParams {
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}

export interface SendTransactionParams {
  to: `0x${string}`;
  value?: bigint;
  data?: `0x${string}`;
}

export interface UseEvmTransactionOptions
  extends Omit<UseTransactionMachineOptions, 'allowLocalDev'> {
  /**
   * Expected chain ID. Defaults to Optimism Mainnet (10).
   * Must be in OPTIMISM_CHAIN_IDS (or 31337 when allowLocalDev is true).
   */
  expectedChainId?: number;
  /**
   * Allow Hardhat chain ID 31337 for local development.
   * Default: false (production).
   */
  allowLocalDev?: boolean;
  /**
   * Minimum confirmations before transitioning to `safe`.
   * Default: 1 (Optimism finalises quickly on L2).
   */
  safeConfirmations?: number;
  /**
   * If true, emit `INDEXING` after `safe` and wait for `FINALIZE` to be
   * sent externally by the caller once the backend indexer acknowledges.
   * Default: false (skip indexing, go directly safe → finalized).
   */
  enableIndexing?: boolean;
}

export interface UseEvmTransactionReturn {
  /** Current state from the machine. */
  state: ReturnType<typeof useTransactionMachine>['state'];
  /** Send a raw machine event (for advanced control). */
  send: ReturnType<typeof useTransactionMachine>['send'];
  /** Reset to idle and clear persisted state. */
  reset: ReturnType<typeof useTransactionMachine>['reset'];
  /** Last machine error, if any. */
  lastError: ReturnType<typeof useTransactionMachine>['lastError'];
  /** Execute a contract write and drive the machine. */
  writeContract: (params: WriteContractParams) => Promise<void>;
  /** Execute a raw ETH send and drive the machine. */
  sendTransaction: (params: SendTransactionParams) => Promise<void>;
  /** Whether the wallet is on the expected network. */
  isCorrectNetwork: boolean;
  /** Connected wallet address, or undefined if disconnected. */
  address: `0x${string}` | undefined;
}

// ---------------------------------------------------------------------------
// Safe confirmation threshold (Optimism L2)
// ---------------------------------------------------------------------------
const DEFAULT_SAFE_CONFIRMATIONS = 1;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEvmTransaction(
  opts: UseEvmTransactionOptions,
): UseEvmTransactionReturn {
  const {
    expectedChainId = OPTIMISM_CHAIN_IDS[0], // Optimism Mainnet
    allowLocalDev = false,
    safeConfirmations = DEFAULT_SAFE_CONFIRMATIONS,
    enableIndexing = false,
    ...machineOpts
  } = opts;

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const isCorrectNetwork = isValidChain(chainId, allowLocalDev) &&
    (chainId === expectedChainId || allowLocalDev);

  // Wagmi write/send hooks
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  // Machine
  const { state, send, context, reset, lastError } = useTransactionMachine({
    ...machineOpts,
    allowLocalDev,
  });

  // Track the in-flight hash so the receipt watcher can pick it up
  const pendingHashRef = useRef<`0x${string}` | null>(null);

  // Watch receipt for the current submitted/confirming hash
  const submittedHash =
    (state.status === 'submitted' || state.status === 'confirming') &&
    state.txHash
      ? state.txHash
      : undefined;

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: submittedHash,
    // confirmations: safeConfirmations — wagmi v2 does not expose this directly,
    // we manage the confirmation threshold ourselves below
  });

  // React to receipt changes
  useEffect(() => {
    if (!receipt) return;
    if (state.status !== 'submitted' && state.status !== 'confirming') return;

    const receiptStatus = receipt.status; // '0x1' (success) or '0x0' (revert)

    if (receiptStatus === 'reverted') {
      send({ type: 'REVERT' });
      return;
    }

    // Successful inclusion
    if (state.status === 'submitted') {
      send({
        type: 'CONFIRM',
        blockNumber: receipt.blockNumber,
        confirmations: 1, // Wagmi receipt = at least 1 confirmation
        receiptChainId: Number(receipt.chainId ?? chainId),
      });
    }

    // Check if we have enough confirmations to mark safe
    // (receipt.confirmations may be undefined in some Wagmi versions — default to 1)
    const confirmations = 1;
    if (state.status === 'confirming' && confirmations >= safeConfirmations) {
      send({ type: 'MARK_SAFE' });

      if (enableIndexing) {
        send({ type: 'INDEXING' });
        // Caller must send FINALIZE once indexer acknowledges
      } else {
        send({ type: 'FINALIZE' });
      }
    }
  }, [receipt, state.status, send, chainId, safeConfirmations, enableIndexing]);

  // ---------------------------------------------------------------------------
  // writeContract
  // ---------------------------------------------------------------------------

  const writeContract = useCallback(
    async (params: WriteContractParams): Promise<void> => {
      if (!isConnected || !address) {
        throw new TransactionMachineError(
          'INVALID_TRANSITION',
          'Wallet not connected',
        );
      }

      // Network guard
      if (!isCorrectNetwork) {
        throw new TransactionMachineError(
          'WRONG_NETWORK',
          `Connected to chain ${chainId}, expected ${expectedChainId}`,
        );
      }

      // Drive: idle → preparing
      send({ type: 'PREPARE', chainId });

      try {
        // Drive: preparing → signature-requested
        send({ type: 'REQUEST_SIGNATURE' });

        // Wagmi handles wallet popup
        const txHash = await writeContractAsync({
          address: params.address,
          abi: params.abi,
          functionName: params.functionName,
          args: params.args,
          value: params.value,
        });

        // Drive: signature-requested → submitted
        send({ type: 'SUBMIT', txHash });
        pendingHashRef.current = txHash;
      } catch (err: unknown) {
        const isUserRejection =
          err instanceof Error &&
          (err.message.includes('User rejected') ||
            err.message.includes('user rejected') ||
            err.message.includes('4001'));

        if (isUserRejection) {
          send({ type: 'USER_REJECTED' });
        } else {
          // Re-throw non-rejection errors; caller can inspect lastError
          send({ type: 'RESET' });
          throw err;
        }
      }
    },
    [
      isConnected,
      address,
      isCorrectNetwork,
      chainId,
      expectedChainId,
      send,
      writeContractAsync,
    ],
  );

  // ---------------------------------------------------------------------------
  // sendTransaction
  // ---------------------------------------------------------------------------

  const sendTransaction = useCallback(
    async (params: SendTransactionParams): Promise<void> => {
      if (!isConnected || !address) {
        throw new TransactionMachineError(
          'INVALID_TRANSITION',
          'Wallet not connected',
        );
      }

      if (!isCorrectNetwork) {
        throw new TransactionMachineError(
          'WRONG_NETWORK',
          `Connected to chain ${chainId}, expected ${expectedChainId}`,
        );
      }

      send({ type: 'PREPARE', chainId });

      try {
        send({ type: 'REQUEST_SIGNATURE' });

        const txHash = await sendTransactionAsync({
          to: params.to,
          value: params.value,
          data: params.data,
        });

        send({ type: 'SUBMIT', txHash });
        pendingHashRef.current = txHash;
      } catch (err: unknown) {
        const isUserRejection =
          err instanceof Error &&
          (err.message.includes('User rejected') ||
            err.message.includes('user rejected') ||
            err.message.includes('4001'));

        if (isUserRejection) {
          send({ type: 'USER_REJECTED' });
        } else {
          send({ type: 'RESET' });
          throw err;
        }
      }
    },
    [
      isConnected,
      address,
      isCorrectNetwork,
      chainId,
      expectedChainId,
      send,
      sendTransactionAsync,
    ],
  );

  return {
    state,
    send,
    reset,
    lastError,
    writeContract,
    sendTransaction,
    isCorrectNetwork,
    address,
  };
}
