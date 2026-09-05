/**
 * Unit Tests - Transaction State Types and Selectors
 *
 * Tests for V2 transaction state machine, state guards, and security validation.
 * Ensures no fabricated data, proper state transitions, and finality checks.
 */

import {
  isSubmitted,
  isConfirmed,
  isSafe,
  isFinalized,
  isIndexing,
  isIndexed,
  isFailed,
  isPending,
  isTerminal,
  hasReceipt,
  getTxHash,
  getBlockNumber,
  getReceiptStatus,
  canTransitionToState,
  isStale,
  shouldWaitForFinality,
  validateTransaction,
  assertNoFabricatedData,
} from '@/lib/transaction-state';
import { OPTIMISM_MAINNET } from '@/config/chains';
import type {
  TransactionSubmitted,
  TransactionConfirmed,
  TransactionSafe,
  TransactionFinalized,
  TransactionIndexing,
  TransactionIndexed,
  TransactionFailed,
  TransactionMetadata,
} from '@/app/types/transaction';

describe('Transaction State Type Guards', () => {
  const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E' as const;

  const submitted: TransactionSubmitted = {
    state: 'submitted',
    hash: '0x' + 'a'.repeat(64),
    fromAddress: address,
    toAddress: address,
    chainId: 10,
    timestamp: Date.now(),
  };

  const confirmed: TransactionConfirmed = {
    ...submitted,
    state: 'confirmed',
    blockNumber: BigInt(1000),
    blockHash: '0x' + 'b'.repeat(64),
    transactionIndex: 0,
    confirmations: 1,
    receipt: {
      status: 'success',
      gasUsed: BigInt(21000),
      cumulativeGasUsed: BigInt(100000),
      logs: [],
    },
  };

  const safe: TransactionSafe = {
    ...confirmed,
    state: 'safe',
    safeBlockNumber: BigInt(1000),
  };

  const finalized: TransactionFinalized = {
    ...safe,
    state: 'finalized',
    finalizedBlockNumber: BigInt(1000),
  };

  const indexing: TransactionIndexing = {
    ...finalized,
    state: 'indexing',
  };

  const indexed: TransactionIndexed = {
    ...indexing,
    state: 'indexed',
    indexedAt: Date.now(),
  };

  const failed: TransactionFailed = {
    state: 'failed',
    chainId: 10,
    timestamp: Date.now(),
    reason: 'user-rejected',
  };

  test('isSubmitted correctly identifies submitted state', () => {
    expect(isSubmitted(submitted)).toBe(true);
    expect(isSubmitted(confirmed)).toBe(false);
    expect(isSubmitted(failed)).toBe(false);
  });

  test('isConfirmed correctly identifies confirmed state', () => {
    expect(isConfirmed(confirmed)).toBe(true);
    expect(isConfirmed(submitted)).toBe(false);
    expect(isConfirmed(safe)).toBe(false);
  });

  test('isSafe correctly identifies safe state', () => {
    expect(isSafe(safe)).toBe(true);
    expect(isSafe(confirmed)).toBe(false);
    expect(isSafe(finalized)).toBe(false);
  });

  test('isFinalized correctly identifies finalized state', () => {
    expect(isFinalized(finalized)).toBe(true);
    expect(isFinalized(safe)).toBe(false);
    expect(isFinalized(indexed)).toBe(false);
  });

  test('isIndexing correctly identifies indexing state', () => {
    expect(isIndexing(indexing)).toBe(true);
    expect(isIndexing(finalized)).toBe(false);
    expect(isIndexing(indexed)).toBe(false);
  });

  test('isIndexed correctly identifies indexed state', () => {
    expect(isIndexed(indexed)).toBe(true);
    expect(isIndexed(indexing)).toBe(false);
  });

  test('isFailed correctly identifies failed states', () => {
    expect(isFailed(failed)).toBe(true);
    expect(isFailed(submitted)).toBe(false);
    expect(isFailed(indexed)).toBe(false);
  });

  test('isPending correctly identifies pending states', () => {
    expect(isPending(submitted)).toBe(true);
    expect(isPending(confirmed)).toBe(false);
    expect(isPending(indexed)).toBe(false);
  });

  test('isTerminal correctly identifies terminal states', () => {
    expect(isTerminal(failed)).toBe(true);
    expect(isTerminal(indexed)).toBe(true);
    expect(isTerminal(submitted)).toBe(false);
    expect(isTerminal(confirmed)).toBe(false);
  });

  test('hasReceipt correctly identifies states with receipts', () => {
    expect(hasReceipt(submitted)).toBe(false);
    expect(hasReceipt(confirmed)).toBe(true);
    expect(hasReceipt(safe)).toBe(true);
    expect(hasReceipt(finalized)).toBe(true);
    expect(hasReceipt(indexing)).toBe(true);
    expect(hasReceipt(indexed)).toBe(true);
    expect(hasReceipt(failed)).toBe(false);
  });
});

describe('Transaction State Getters', () => {
  const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E' as const;
  const txHash = '0x' + 'a'.repeat(64);

  test('getTxHash extracts hash safely', () => {
    const tx: TransactionSubmitted = {
      state: 'submitted',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
    };
    expect(getTxHash(tx)).toBe(txHash);
  });

  test('getBlockNumber returns block number for confirmed states', () => {
    const tx: TransactionConfirmed = {
      state: 'confirmed',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
      blockNumber: BigInt(1000),
      blockHash: '0x' + 'b'.repeat(64),
      transactionIndex: 0,
      confirmations: 1,
      receipt: {
        status: 'success',
        gasUsed: BigInt(21000),
        cumulativeGasUsed: BigInt(100000),
        logs: [],
      },
    };
    expect(getBlockNumber(tx)).toBe(BigInt(1000));
  });

  test('getReceiptStatus returns correct status', () => {
    const successTx: TransactionConfirmed = {
      state: 'confirmed',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
      blockNumber: BigInt(1000),
      blockHash: '0x' + 'b'.repeat(64),
      transactionIndex: 0,
      confirmations: 1,
      receipt: {
        status: 'success',
        gasUsed: BigInt(21000),
        cumulativeGasUsed: BigInt(100000),
        logs: [],
      },
    };
    expect(getReceiptStatus(successTx)).toBe('success');

    const revertedTx: TransactionConfirmed = {
      ...successTx,
      receipt: {
        ...successTx.receipt,
        status: 'reverted',
      },
    };
    expect(getReceiptStatus(revertedTx)).toBe('reverted');
  });
});

describe('Transaction State Transitions', () => {
  const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E' as const;
  const txHash = '0x' + 'a'.repeat(64);

  test('valid state transitions are allowed', () => {
    const submitted: TransactionSubmitted = {
      state: 'submitted',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
    };

    expect(canTransitionToState(submitted, 'confirmed', OPTIMISM_MAINNET)).toBe(true);
    expect(canTransitionToState(submitted, 'failed', OPTIMISM_MAINNET)).toBe(true);
    expect(canTransitionToState(submitted, 'rejected', OPTIMISM_MAINNET)).toBe(true);
  });

  test('invalid state transitions are rejected', () => {
    const submitted: TransactionSubmitted = {
      state: 'submitted',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
    };

    expect(canTransitionToState(submitted, 'safe', OPTIMISM_MAINNET)).toBe(false);
    expect(canTransitionToState(submitted, 'indexed', OPTIMISM_MAINNET)).toBe(false);
  });

  test('indexed state has no valid transitions', () => {
    const indexed: TransactionIndexed = {
      state: 'indexed',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
      blockNumber: BigInt(1000),
      blockHash: '0x' + 'b'.repeat(64),
      transactionIndex: 0,
      confirmations: 10,
      receipt: {
        status: 'success',
        gasUsed: BigInt(21000),
        cumulativeGasUsed: BigInt(100000),
        logs: [],
      },
      finalizedBlockNumber: BigInt(1000),
      indexedAt: Date.now(),
    };

    expect(canTransitionToState(indexed, 'submitted', OPTIMISM_MAINNET)).toBe(false);
    expect(canTransitionToState(indexed, 'confirmed', OPTIMISM_MAINNET)).toBe(false);
  });
});

describe('Stale State Detection', () => {
  const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E' as const;
  const txHash = '0x' + 'a'.repeat(64);

  test('recent transactions are not stale', () => {
    const tx: TransactionSubmitted = {
      state: 'submitted',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
    };

    const metadata: TransactionMetadata = {
      id: txHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
    };

    expect(isStale(tx, metadata, OPTIMISM_MAINNET.staleness)).toBe(false);
  });

  test('old pending transactions are stale', () => {
    const tx: TransactionSubmitted = {
      state: 'submitted',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
    };

    const metadata: TransactionMetadata = {
      id: txHash,
      createdAt: Date.now() - (6 * 60 * 1000), // 6 minutes ago
      updatedAt: Date.now() - (6 * 60 * 1000),
      retryCount: 0,
    };

    expect(isStale(tx, metadata, OPTIMISM_MAINNET.staleness)).toBe(true);
  });

  test('indexed transactions are never stale', () => {
    const tx: TransactionIndexed = {
      state: 'indexed',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
      blockNumber: BigInt(1000),
      blockHash: '0x' + 'b'.repeat(64),
      transactionIndex: 0,
      confirmations: 10,
      receipt: {
        status: 'success',
        gasUsed: BigInt(21000),
        cumulativeGasUsed: BigInt(100000),
        logs: [],
      },
      finalizedBlockNumber: BigInt(1000),
      indexedAt: Date.now() - (1000 * 60 * 1000), // 1000 minutes ago
    };

    const metadata: TransactionMetadata = {
      id: txHash,
      createdAt: Date.now() - (1000 * 60 * 1000),
      updatedAt: Date.now() - (1000 * 60 * 1000),
      retryCount: 0,
    };

    expect(isStale(tx, metadata, OPTIMISM_MAINNET.staleness)).toBe(false);
  });
});

describe('Premature Success Prevention', () => {
  const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E' as const;
  const txHash = '0x' + 'a'.repeat(64);

  test('should wait for finality on L2', () => {
    const finalized: TransactionFinalized = {
      state: 'finalized',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
      blockNumber: BigInt(1000),
      blockHash: '0x' + 'b'.repeat(64),
      transactionIndex: 0,
      confirmations: 10,
      receipt: {
        status: 'success',
        gasUsed: BigInt(21000),
        cumulativeGasUsed: BigInt(100000),
        logs: [],
      },
      finalizedBlockNumber: BigInt(1000),
    };

    const metadata: TransactionMetadata = {
      id: txHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
    };

    // On L2, should still wait even if finalized
    expect(shouldWaitForFinality(finalized, metadata, OPTIMISM_MAINNET)).toBe(true);
  });

  test('should show success only when indexed', () => {
    const indexed: TransactionIndexed = {
      state: 'indexed',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
      blockNumber: BigInt(1000),
      blockHash: '0x' + 'b'.repeat(64),
      transactionIndex: 0,
      confirmations: 10,
      receipt: {
        status: 'success',
        gasUsed: BigInt(21000),
        cumulativeGasUsed: BigInt(100000),
        logs: [],
      },
      finalizedBlockNumber: BigInt(1000),
      indexedAt: Date.now(),
    };

    const metadata: TransactionMetadata = {
      id: txHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
    };

    expect(shouldWaitForFinality(indexed, metadata, OPTIMISM_MAINNET)).toBe(false);
  });
});

describe('Transaction Validation & Security', () => {
  const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E' as const;
  const txHash = '0x' + 'a'.repeat(64);

  test('validates transaction hash format', () => {
    const invalidTx: any = {
      state: 'submitted',
      hash: 'invalid-hash',
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
    };

    const errors = validateTransaction(invalidTx);
    expect(errors.some((e) => e.field === 'hash')).toBe(true);
  });

  test('validates address format', () => {
    const invalidTx: any = {
      state: 'submitted',
      hash: txHash,
      fromAddress: 'not-an-address',
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
    };

    const errors = validateTransaction(invalidTx);
    expect(errors.some((e) => e.field === 'fromAddress')).toBe(true);
  });

  test('validates chain ID matches expected', () => {
    const tx: TransactionSubmitted = {
      state: 'submitted',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
    };

    const errors = validateTransaction(tx, 1); // Expect chain 1, got 10
    expect(errors.some((e) => e.field === 'chainId')).toBe(true);
  });

  test('validates amount is exact integer', () => {
    const invalidTx: any = {
      state: 'submitted',
      hash: txHash,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
      amount: '1.5', // Invalid: must be exact integer
    };

    const errors = validateTransaction(invalidTx);
    expect(errors.some((e) => e.field === 'amount')).toBe(true);
  });

  test('rejects fabricated dummy addresses', () => {
    const tx: TransactionSubmitted = {
      state: 'submitted',
      hash: txHash,
      fromAddress: '0x0000000000000000000000000000000000000000' as any,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
    };

    expect(() => assertNoFabricatedData(tx)).toThrow(/dummy/i);
  });

  test('rejects missing transaction hash', () => {
    const tx: any = {
      state: 'submitted',
      hash: undefined,
      fromAddress: address,
      toAddress: address,
      chainId: 10,
      timestamp: Date.now(),
    };

    expect(() => assertNoFabricatedData(tx)).toThrow(/hash/i);
  });
});
