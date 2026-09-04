/**
 * Hook for reconciling settlement/finalization state after transaction finality
 * Ensures outcomes are confirmed and prevents stale state issues
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import {
  SettlementSubmission,
  ReconciliationResult,
} from '@/app/types/settlement';

interface UseStateReconciliationConfig {
  transactionHash?: string;
  pollInterval?: number; // ms between polls
  confirmationBlocks?: number; // blocks to wait for confirmation
  timeout?: number; // ms timeout for waiting
}

interface StateReconciliationResult {
  reconcile: (submission: SettlementSubmission) => Promise<ReconciliationResult>;
  isReconciling: boolean;
  lastResult: ReconciliationResult | null;
  error: string | null;
}

/**
 * Minimal transaction receipt shape used while polling for finality.
 */
interface TransactionReceiptLike {
  status?: string | number;
  blockNumber?: bigint;
  from?: string;
  logs?: readonly unknown[];
}

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
    transactionHash,
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
    async (
      txHash: string
    ): Promise<{ receipt: TransactionReceiptLike; confirmations: number }> => {
      if (!publicClient) {
        throw new Error('Public client not available');
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
          console.error('Error checking receipt:', err);
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
      }

      throw new Error(`Transaction ${txHash} not confirmed within ${timeout}ms`);
    },
    [publicClient, pollInterval, confirmationBlocks, timeout]
  );

  /**
   * Determine settlement state from transaction and receipt
   */
  const determineSettlementState = useCallback(
    (receipt: TransactionReceiptLike): ReconciliationResult['finalState'] => {
      // Transaction success/failure is determined by status
      if (receipt.status === '0x1' || receipt.status === 1) {
        // Successfully executed
        return 'SETTLED';
      } else {
        // Reverted
        return 'PENDING_SETTLEMENT';
      }
    },
    []
  );

  /**
   * Extract rewards from transaction logs (in production)
   */
  const extractRewards = useCallback(
    (receipt: TransactionReceiptLike): { address: string; amount: string } | undefined => {
    // In production, this would:
    // 1. Decode logs using ABI
    // 2. Look for Reward or Transfer events
    // 3. Extract amount and recipient
    // 4. Validate amounts against contract state
    
    // Mock reward extraction
    if (receipt.logs && receipt.logs.length > 0) {
      return {
        address: receipt.from ?? '',
        amount: '0',
      };
    }

    return undefined;
  }, []);

  /**
   * Reconcile transaction state after finality
   */
  const reconcile = useCallback(
    async (submission: SettlementSubmission): Promise<ReconciliationResult> => {
      setIsReconciling(true);
      setError(null);

      try {
        // Validate submission
        if (!submission.transactionHash) {
          throw new Error('Invalid transaction hash');
        }

        if (!submission.transactionHash.match(/^0x[a-fA-F0-9]{64}$/)) {
          throw new Error('Invalid transaction hash format');
        }

        // Wait for confirmation
        const { receipt, confirmations } = await waitForConfirmation(
          submission.transactionHash
        );

        // Determine final state
        const finalState = determineSettlementState(receipt);

        // Extract rewards
        const rewards = extractRewards(receipt);

        // Build result
        const result: ReconciliationResult = {
          transactionHash: submission.transactionHash,
          status: receipt.status === '0x1' || receipt.status === 1 ? 'confirmed' : 'reverted',
          finalState,
          rewards,
        };

        setLastResult(result);
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Reconciliation failed';
        setError(errorMsg);

        const result: ReconciliationResult = {
          transactionHash: submission.transactionHash,
          status: 'timeout',
          finalState: 'PENDING_SETTLEMENT',
          error: errorMsg,
        };

        setLastResult(result);
        throw err;
      } finally {
        setIsReconciling(false);
      }
    },
    [waitForConfirmation, determineSettlementState, extractRewards]
  );

  /**
   * Auto-reconcile if transactionHash is provided
   */
  useEffect(() => {
    if (!transactionHash || !publicClient) return;

    const mockSubmission: SettlementSubmission = {
      transactionHash,
      from: '',
      to: '',
      status: 'pending',
      type: 'SETTLE_PROVISIONAL',
      claimId: '',
      timestamp: new Date().toISOString(),
    };

    reconcile(mockSubmission).catch((err) => {
      console.error('Auto-reconciliation failed:', err);
    });
  }, [transactionHash, publicClient, reconcile]);

  return {
    reconcile,
    isReconciling,
    lastResult,
    error,
  };
}
