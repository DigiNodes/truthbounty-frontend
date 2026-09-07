/**
 * Hook for reconciling claim creation transaction state after finality
 * Ensures claim creation is confirmed, prevents stale state, and returns typed protocol errors.
 */

'use client';

import { useCallback, useState } from 'react';
import { usePublicClient } from 'wagmi';
import type { TransactionReceipt } from 'viem';
import {
  ReconciliationResult,
  SettlementSubmission,
} from '@/app/types/settlement';

export class ProtocolError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ProtocolError';
    this.code = code;
  }
}

interface UseStateReconciliationConfig {
  pollInterval?: number; // ms between polls
  confirmationBlocks?: number; // blocks to wait for confirmation
  timeout?: number; // ms timeout for waiting
  transactionHash?: string;
}

interface StateReconciliationResult {
  reconcile: (submission: SettlementSubmission) => Promise<ReconciliationResult>;
  isReconciling: boolean;
  lastResult: ReconciliationResult | null;
  error: string | null;
}

const SUPPORTED_CHAIN_IDS = [10, 11155420]; // Optimism mainnet and Sepolia

const DEFAULT_POLL_INTERVAL = 2000; // 2 seconds
const DEFAULT_CONFIRMATION_BLOCKS = 1; // 1 block for Optimism (fast finality)
const DEFAULT_TIMEOUT = 300000; // 5 minutes

/**
 * Hook for reconciling settlement state after transaction finality
 * Polls the network to confirm transaction success and update local state
 */
export function useStateReconciliation(
  config: UseStateReconciliationConfig = {}
): StateReconciliationResult {
  const {
    pollInterval = DEFAULT_POLL_INTERVAL,
    confirmationBlocks = DEFAULT_CONFIRMATION_BLOCKS,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const publicClient = usePublicClient();
  const [isReconciling, setIsReconciling] = useState(false);
  const [lastResult, setLastResult] = useState<ReconciliationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Wait for transaction receipt and confirmations
   */
  const waitForConfirmation = useCallback(
    async (txHash: string): Promise<{ receipt: TransactionReceipt; confirmations: number }> => {
      if (!publicClient) {
        throw new ProtocolError('PUBLIC_CLIENT_UNAVAILABLE', 'Public client not available');
      }

      // Validate chain
      const chainId = publicClient.chain?.id;
      if (chainId && !SUPPORTED_CHAIN_IDS.includes(chainId)) {
        throw new ProtocolError('UNSUPPORTED_CHAIN', `Unsupported chain ${chainId}`);
      }

      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        try {
          // Get transaction receipt
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

          if (!receipt) {
            // Transaction not yet mined, wait and retry
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            continue;
          }

          // Get current block number
          const currentBlock = await publicClient.getBlockNumber();

          // Calculate confirmations
          const confirmations = Number(currentBlock - receipt.blockNumber);

          // Check if sufficient confirmations
          if (confirmations >= confirmationBlocks) {
            return { receipt, confirmations };
          }

          // Wait for more confirmations
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        } catch (err) {
          // Rethrow protocol errors, otherwise continue polling
          if (err instanceof ProtocolError) {
            throw err;
          }
          console.error('Error checking receipt:', err);
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
      }

      throw new ProtocolError('TIMEOUT', `Transaction ${txHash} not confirmed within ${timeout}ms`);
    },
    [publicClient, pollInterval, confirmationBlocks, timeout]
  );

  /**
   * Determine claim state from transaction and receipt
   */
  const determineClaimState = useCallback(
    (receipt: TransactionReceipt, submission?: SettlementSubmission): string => {
      const isSuccess =
        receipt.status === 'success' ||
        (receipt.status as unknown) === 1 ||
        (receipt.status as unknown) === '0x1';
      if (
        submission?.type === 'SETTLE_PROVISIONAL' ||
        submission?.type === 'SETTLE_APPEAL' ||
        submission?.type === 'FINALIZE'
      ) {
        return isSuccess ? 'SETTLED' : 'PENDING_SETTLEMENT';
      }
      return isSuccess ? 'CLAIM_CREATED' : 'CLAIM_CREATION_REVERTED';
    },
    []
  );

  /**
   * Reconcile transaction state after finality
   */
  const reconcile = useCallback(
    async (submission: SettlementSubmission): Promise<ReconciliationResult> => {
      setIsReconciling(true);
      setError(null);

      // Validate submission
      if (!submission.transactionHash) {
        setError('Invalid transaction hash');
        throw new ProtocolError('INVALID_HASH', 'Invalid transaction hash');
      }

      if (!submission.transactionHash.match(/^0x[a-fA-F0-9]{64}$/)) {
        setError('Invalid transaction hash format');
        throw new ProtocolError('INVALID_HASH_FORMAT', 'Invalid transaction hash format');
      }

      if (!publicClient) {
        setError('Public client not available');
        throw new ProtocolError('PUBLIC_CLIENT_UNAVAILABLE', 'Public client not available');
      }

      try {
        // Wait for confirmation
        const { receipt } = await waitForConfirmation(
          submission.transactionHash
        );

        // Determine final state
        const finalState = determineClaimState(receipt, submission);

        // Build result
        const isSuccess = receipt.status === 'success' || (receipt.status as unknown) === 1 || (receipt.status as unknown) === '0x1';
        const result: ReconciliationResult = {
          transactionHash: submission.transactionHash,
          status: isSuccess ? 'confirmed' : 'reverted',
          finalState: finalState as ReconciliationResult['finalState'],
        };

        setLastResult(result);
        return result;
      } catch (err) {
        const errorObj = err instanceof ProtocolError
          ? err
          : new ProtocolError(
              'RECONCILIATION_FAILED',
              err instanceof Error ? err.message : 'Reconciliation failed'
            );
        setError(errorObj.message);

        const isSettlement =
          submission?.type === 'SETTLE_PROVISIONAL' ||
          submission?.type === 'SETTLE_APPEAL' ||
          submission?.type === 'FINALIZE';
        const result: ReconciliationResult = {
          transactionHash: submission.transactionHash,
          status: errorObj.code === 'TIMEOUT' ? 'timeout' : 'reverted',
          finalState: (isSettlement ? 'PENDING_SETTLEMENT' : 'CLAIM_CREATION_UNKNOWN') as ReconciliationResult['finalState'],
          error: errorObj.message,
        };

        setLastResult(result);
        if (errorObj.code === 'TIMEOUT') {
          return result;
        }
        throw errorObj;
      } finally {
        setIsReconciling(false);
      }
    },
    [publicClient, waitForConfirmation, determineClaimState]
  );

  return {
    reconcile,
    isReconciling,
    lastResult,
    error,
  };
}
