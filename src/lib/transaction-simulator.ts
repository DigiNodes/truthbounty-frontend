/**
 * DELETED — V2-FE-009
 *
 * This file previously contained synthetic transaction simulation utilities
 * (generateTransactionHash, simulateTransaction, createMockReceipt, etc.)
 * that fabricated random hashes and fake confirmations.
 *
 * All production transaction logic is now handled by the shared state machine:
 *   src/lib/transaction-machine/
 *
 * Test mocks are in:
 *   src/__tests__/mocks/wagmi/mock-wagmi.ts
 *
 * DO NOT re-add Math.random() hash generation or synthetic transaction logic
 * to any production path.
 */

// This file intentionally left empty after V2-FE-009 cleanup.
// It will be removed in the next cleanup PR once all imports are confirmed gone.

export {};