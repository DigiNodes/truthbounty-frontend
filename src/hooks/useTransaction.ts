/**
 * V2 Transaction Management Hook
 *
 * Handles real blockchain transactions with state tracking.
 * Never fabricates transaction hashes or state.
 * All transaction data comes from RPC or contracts.
 */

import { useCallback, useRef, useState } from 'react';
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { getChainConfig, isSupportedChain } from '@/config/chains';
import { getStateMessage, validateTransaction } from '@/lib/transaction-state';
import type { Address, WaitForTransactionReceiptErrorType } from 'viem';
import type {
  Transaction,
  TransactionSubmitted,
  TransactionConfirmed,
  TransactionMetadata,
} from '@/app/types/transaction';

export interface UseTransactionOptions {
  onStateChange?: (tx: Transaction) => void;
  onError?: (error: Error) => void;
  onSuccess?: (tx: Transaction) => void;
}

export interface UseTransactionReturn {
  submit: (to: Address, data: string, value?: bigint) => Promise<void>;
  waitForConfirmation: (hash: string) => Promise<Transaction>;
  transaction: Transaction | null;
  isLoading: boolean;
  error: Error | null;
  metadata: TransactionMetadata | null;
  retry: () => Promise<void>;
}

/**
 * useTransaction - Manage real blockchain transactions
 *
 * Replaces mock transaction simulator with real Wagmi integration.
 * Tracks transaction state from submission through indexing.
 */
export function useTransaction(options: UseTransactionOptions = {}): UseTransactionReturn {
  const { onStateChange, onError, onSuccess } = options;
  const account = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { data: receipt, isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [metadata, setMetadata] = useState<TransactionMetadata | null>(null);
  const retryCountRef = useRef(0);

  // Update transaction and notify listeners
  const updateTransaction = useCallback(
    (tx: Transaction) => {
      const errors = validateTransaction(tx, account.chainId);
      if (errors.length > 0) {
        const error = new Error(`Invalid transaction: ${errors.map((e) => e.error).join(', ')}`);
        setError(error);
        onError?.(error);
        return;
      }

      setTransaction(tx);
      onStateChange?.(tx);

      if ('state' in tx && tx.state === 'indexed') {
        onSuccess?.(tx);
      }
    },
    [account.chainId, onStateChange, onError, onSuccess]
  );

  // Submit transaction to blockchain
  const submit = useCallback(
    async (to: Address, data: string, value?: bigint) => {
      // Validate chain
      if (!isSupportedChain(account.chainId)) {
        const error = new Error(`Unsupported chain: ${account.chainId}`);
        setError(error);
        onError?.(error);
        throw error;
      }

      if (!account.address) {
        const error = new Error('Wallet not connected');
        setError(error);
        onError?.(error);
        throw error;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Submit transaction
        const hash = await writeContractAsync({
          account: account.address,
          to,
          data: data as `0x${string}`,
          value,
          chainId: account.chainId,
        });

        // Create submitted state
        const submitted: TransactionSubmitted = {
          state: 'submitted',
          hash,
          fromAddress: account.address,
          toAddress: to,
          chainId: account.chainId,
          timestamp: Date.now(),
          data,
          amount: value?.toString(),
        };

        const config = getChainConfig(account.chainId);
        setMetadata({
          id: hash,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() + config.staleness.maxAgeMs,
          retryCount: 0,
          lastRetryAt: undefined,
        });

        updateTransaction(submitted);

        // Wait for confirmation
        await waitForConfirmation(hash);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);

        // Create failed transaction
        const failedTx: Transaction = {
          state: 'failed',
          chainId: account.chainId,
          timestamp: Date.now(),
          reason: 'unknown',
          error: error.message,
        };
        updateTransaction(failedTx);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [account, writeContractAsync, onError, updateTransaction]
  );

  // Wait for transaction confirmation
  const waitForConfirmation = useCallback(
    async (hash: string): Promise<Transaction> => {
      if (!publicClient) {
        throw new Error('Public client not available');
      }

      if (!account.isConnected || !account.address) {
        throw new Error('Account not connected');
      }

      const config = getChainConfig(account.chainId);

      try {
        // Wait for receipt
        const txReceipt = await publicClient.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
          timeout: config.staleness.maxConfirmationTimeMs,
        });

        // Create confirmed state
        const confirmed: TransactionConfirmed = {
          state: 'confirmed',
          hash,
          fromAddress: account.address,
          toAddress: txReceipt.to,
          chainId: account.chainId,
          timestamp: Date.now(),
          blockNumber: txReceipt.blockNumber,
          blockHash: txReceipt.blockHash,
          transactionIndex: txReceipt.transactionIndex,
          confirmations: 1,
          receipt: {
            status: txReceipt.status === 'success' ? 'success' : 'reverted',
            gasUsed: txReceipt.gasUsed,
            cumulativeGasUsed: txReceipt.cumulativeGasUsed,
            contractAddress: txReceipt.contractAddress,
            logs: txReceipt.logs.map((log) => ({
              address: log.address,
              topics: log.topics,
              data: log.data,
            })),
          },
        };

        updateTransaction(confirmed);

        // Update metadata
        if (metadata) {
          setMetadata({
            ...metadata,
            updatedAt: Date.now(),
          });
        }

        return confirmed;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Create failed transaction
        const failedTx: Transaction = {
          state: 'failed',
          hash,
          chainId: account.chainId,
          timestamp: Date.now(),
          reason: 'timeout',
          error: error.message,
        };

        updateTransaction(failedTx);
        throw error;
      }
    },
    [publicClient, account, config, metadata, updateTransaction]
  );

  // Retry failed transaction
  const retry = useCallback(async () => {
    if (!transaction || transaction.state !== 'failed') {
      return;
    }

    const config = getChainConfig(account.chainId);
    if (retryCountRef.current >= config.staleness.maxRetries) {
      throw new Error('Max retries exceeded');
    }

    retryCountRef.current += 1;

    if (metadata) {
      setMetadata({
        ...metadata,
        retryCount: retryCountRef.current,
        lastRetryAt: Date.now(),
      });
    }

    // Clear error and try again
    setError(null);
  }, [transaction, account.chainId, metadata]);

  return {
    submit,
    waitForConfirmation,
    transaction,
    isLoading: isLoading || isWaitingForReceipt,
    error,
    metadata,
    retry,
  };
}
