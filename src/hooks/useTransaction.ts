/**
 * V2 Transaction Management Hook
 *
 * Handles real blockchain transactions with state tracking.
 * Never fabricates transaction hashes or state.
 * All transaction data comes from RPC or contracts.
 */

import { useCallback, useRef, useState } from 'react';
import { useAccount, usePublicClient, useSendTransaction } from 'wagmi';
import { getChainConfig, isSupportedChain } from '@/config/chains';
import { validateTransaction } from '@/lib/transaction-state';
import type { Address, Hex } from 'viem';
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
 * Manage real EVM transactions from submission through confirmation.
 * Later safe/finalized/indexed transitions must come from canonical RPC and
 * indexer observations.
 */
export function useTransaction(options: UseTransactionOptions = {}): UseTransactionReturn {
  const { onStateChange, onError, onSuccess } = options;
  const account = useAccount();
  const publicClient = usePublicClient();
  const { sendTransactionAsync } = useSendTransaction();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [metadata, setMetadata] = useState<TransactionMetadata | null>(null);
  const retryCountRef = useRef(0);

  const updateTransaction = useCallback(
    (tx: Transaction) => {
      const errors = validateTransaction(tx, account.chainId);
      if (errors.length > 0) {
        const validationError = new Error(
          `Invalid transaction: ${errors.map(({ error }) => error).join(', ')}`,
        );
        setError(validationError);
        onError?.(validationError);
        return;
      }

      setTransaction(tx);
      onStateChange?.(tx);
      if (tx.state === 'indexed') onSuccess?.(tx);
    },
    [account.chainId, onStateChange, onError, onSuccess],
  );

  const waitForConfirmation = useCallback(
    async (hash: string): Promise<Transaction> => {
      const { address, chainId, isConnected } = account;
      if (!publicClient) throw new Error('Public client not available');
      if (!isConnected || !address) throw new Error('Account not connected');
      if (typeof chainId !== 'number' || !isSupportedChain(chainId)) {
        throw new Error(`Unsupported chain: ${chainId ?? 'unknown'}`);
      }

      const config = getChainConfig(chainId);

      try {
        const txReceipt = await publicClient.waitForTransactionReceipt({
          hash: hash as Hex,
          timeout: config.staleness.maxConfirmationTimeMs,
        });

        if (!txReceipt.to) {
          throw new Error('Contract-creation receipts are not supported by this hook');
        }

        const confirmed: TransactionConfirmed = {
          state: 'confirmed',
          hash,
          fromAddress: address,
          toAddress: txReceipt.to,
          chainId,
          timestamp: Date.now(),
          blockNumber: txReceipt.blockNumber,
          blockHash: txReceipt.blockHash,
          transactionIndex: txReceipt.transactionIndex,
          confirmations: 1,
          receipt: {
            status: txReceipt.status === 'success' ? 'success' : 'reverted',
            gasUsed: txReceipt.gasUsed,
            cumulativeGasUsed: txReceipt.cumulativeGasUsed,
            contractAddress: txReceipt.contractAddress ?? undefined,
            logs: txReceipt.logs.map((log) => ({
              address: log.address,
              topics: [...log.topics],
              data: log.data,
            })),
          },
        };

        updateTransaction(confirmed);
        setMetadata((current) =>
          current ? { ...current, updatedAt: Date.now() } : current,
        );
        return confirmed;
      } catch (cause) {
        const confirmationError =
          cause instanceof Error ? cause : new Error(String(cause));
        const failedTx: Transaction = {
          state: 'failed',
          hash,
          chainId,
          timestamp: Date.now(),
          reason: 'timeout',
          error: confirmationError.message,
        };
        updateTransaction(failedTx);
        throw confirmationError;
      }
    },
    [publicClient, account, updateTransaction],
  );

  const submit = useCallback(
    async (to: Address, data: string, value?: bigint) => {
      const { address, chainId } = account;
      if (!address) {
        const walletError = new Error('Wallet not connected');
        setError(walletError);
        onError?.(walletError);
        throw walletError;
      }
      if (typeof chainId !== 'number' || !isSupportedChain(chainId)) {
        const chainError = new Error(`Unsupported chain: ${chainId ?? 'unknown'}`);
        setError(chainError);
        onError?.(chainError);
        throw chainError;
      }

      setIsLoading(true);
      setError(null);

      try {
        const hash = await sendTransactionAsync({
          account: address,
          to,
          data: data as Hex,
          value,
          chainId,
        });

        const submitted: TransactionSubmitted = {
          state: 'submitted',
          hash,
          fromAddress: address,
          toAddress: to,
          chainId,
          timestamp: Date.now(),
          data,
          amount: value?.toString(),
        };
        const config = getChainConfig(chainId);
        setMetadata({
          id: hash,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() + config.staleness.maxAgeMs,
          retryCount: 0,
          lastRetryAt: undefined,
        });
        updateTransaction(submitted);
        await waitForConfirmation(hash);
      } catch (cause) {
        const submissionError =
          cause instanceof Error ? cause : new Error(String(cause));
        setError(submissionError);
        onError?.(submissionError);
        const failedTx: Transaction = {
          state: 'failed',
          chainId,
          timestamp: Date.now(),
          reason: 'unknown',
          error: submissionError.message,
        };
        updateTransaction(failedTx);
        throw submissionError;
      } finally {
        setIsLoading(false);
      }
    },
    [account, sendTransactionAsync, onError, updateTransaction, waitForConfirmation],
  );

  const retry = useCallback(async () => {
    if (!transaction || transaction.state !== 'failed') return;
    const chainId = account.chainId;
    if (typeof chainId !== 'number' || !isSupportedChain(chainId)) {
      throw new Error(`Unsupported chain: ${chainId ?? 'unknown'}`);
    }

    const config = getChainConfig(chainId);
    if (retryCountRef.current >= config.staleness.maxRetries) {
      throw new Error('Max retries exceeded');
    }

    retryCountRef.current += 1;
    setMetadata((current) =>
      current
        ? {
            ...current,
            retryCount: retryCountRef.current,
            lastRetryAt: Date.now(),
          }
        : current,
    );
    setError(null);
  }, [transaction, account.chainId]);

  return {
    submit,
    waitForConfirmation,
    transaction,
    isLoading,
    error,
    metadata,
    retry,
  };
}
