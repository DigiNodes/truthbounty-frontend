/**
 * Unit tests for useAppealReconciliation hook
 * Tests: confirmed transactions, reverted transactions, timeouts, state segregation
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useAppealReconciliation, canParticipateInAppeal, verifyStateIndependence } from '../useAppealReconciliation';
import * as wagmi from 'wagmi';
import {
  AppealParticipationTransaction,
  StateSegregation,
  AppealReconciliationResult,
} from '@/app/types/appeal';

// Mock Wagmi hooks
jest.mock('wagmi', () => ({
  useWaitForTransactionReceipt: jest.fn(),
  usePublicClient: jest.fn(),
}));

describe('useAppealReconciliation', () => {
  const mockTxHash = '0xabc123def456789012345678901234567890123456789012345678901234abcd';
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const mockContractAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';

  const createMockTransaction = (
    overrides?: Partial<AppealParticipationTransaction>
  ): AppealParticipationTransaction => ({
    transactionHash: mockTxHash,
    from: mockUserAddress,
    to: mockContractAddress,
    status: 'PENDING',
    appealId: 'appeal-123',
    claimId: 'claim-456',
    disputeId: 'dispute-789',
    decision: 'SUPPORT',
    stakeAmount: '500000000000000000',
    timestamp: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    (wagmi.usePublicClient as jest.Mock).mockReturnValue({});
  });

  describe('successful confirmation', () => {
    it('should reconcile confirmed transaction', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'success',
          transactionHash: mockTxHash,
          blockNumber: BigInt(12345678),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
        })
      );

      await waitFor(() => {
        expect(result.current.result?.status).toBe('confirmed');
      });
      expect(result.current.result?.transactionHash).toBe(mockTxHash);
      expect(result.current.result?.finalState).toBe('ACTIVE');
      expect(result.current.result?.position.hasParticipated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should update wallet position after confirmation', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'success',
          transactionHash: mockTxHash,
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
        })
      );

      await waitFor(() => {
        expect(result.current.result?.position).toBeDefined();
      });

      const position = result.current.result!.position;
      expect(position.hasParticipated).toBe(true);
      expect(position.existingDecision).toBe('SUPPORT');
      expect(position.existingStake).toBe('500000000000000000');
      expect(position.participatedAt).toBeDefined();
      expect(position.transactionHash).toBe(mockTxHash);
    });

    it('should wait for specified confirmations', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
          confirmations: 3,
        })
      );

      expect(result.current.isWaiting).toBe(true);
      expect(result.current.result).toBeNull();
    });
  });

  describe('reverted transactions', () => {
    it('should handle reverted transaction', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'reverted',
          transactionHash: mockTxHash,
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
        })
      );

      await waitFor(() => {
        expect(result.current.result?.status).toBe('reverted');
      });
      expect(result.current.result?.position.hasParticipated).toBe(false);
      expect(result.current.result?.revertReason).toBeDefined();
    });

    it('should not update position on revert', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'reverted',
          transactionHash: mockTxHash,
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
        })
      );

      await waitFor(() => {
        expect(result.current.result?.position).toBeDefined();
      });

      const position = result.current.result!.position;
      expect(position.hasParticipated).toBe(false);
      expect(position.existingDecision).toBeUndefined();
      expect(position.existingStake).toBeUndefined();
    });
  });

  describe('timeout handling', () => {
    it('should handle transaction timeout', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Transaction timeout'),
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
          timeout: 1000,
        })
      );

      await waitFor(() => {
        expect(result.current.result).toBeDefined();
      });

      expect(result.current.result?.status).toBe('timeout');
      expect(result.current.result?.error).toContain('timeout');
      expect(result.current.error).toBeDefined();
    });

    it('should set custom timeout', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
          timeout: 30000, // 30 seconds
        })
      );

      // Verify timeout was passed to useWaitForTransactionReceipt
      const calls = (wagmi.useWaitForTransactionReceipt as jest.Mock).mock.calls;
      expect(calls[0][0].timeout).toBe(30000);
    });
  });

  describe('state segregation', () => {
    it('should create state segregation for appeal participation', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'success',
          transactionHash: mockTxHash,
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
        })
      );

      await waitFor(() => {
        expect(result.current.stateSegregation?.claimId).toBeDefined();
      });

      const segregation = result.current.stateSegregation!;
      expect(segregation.claimId).toBe('claim-456');
      expect(segregation.appealState.appealId).toBe('appeal-123');
      expect(segregation.appealState.decision).toBe('SUPPORT');
      expect(segregation.statesAreIndependent).toBe(true);
    });

    it('should keep first-round and appeal states separate', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'success',
          transactionHash: mockTxHash,
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
        })
      );

      await waitFor(() => {
        expect(result.current.stateSegregation?.firstRoundState).toBeDefined();
      });

      const segregation = result.current.stateSegregation!;
      
      // First-round state should be empty/separate
      expect(segregation.firstRoundState).toBeDefined();
      
      // Appeal state should have data
      expect(segregation.appealState.appealId).toBeDefined();
      expect(segregation.appealState.decision).toBeDefined();
      
      // They should be independent
      expect(segregation.hasAppealParticipation).toBe(true);
      expect(segregation.statesAreIndependent).toBe(true);
    });

    it('should update appeal state status after confirmation', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'success',
          transactionHash: mockTxHash,
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
        })
      );

      await waitFor(() => {
        expect(result.current.stateSegregation?.appealState.status).toBe('CONFIRMED');
      });
    });

    it('should update appeal state to REVERTED on transaction failure', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'reverted',
          transactionHash: mockTxHash,
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
        })
      );

      await waitFor(() => {
        expect(result.current.stateSegregation?.appealState.status).toBe('REVERTED');
      });
    });

    it('should update appeal state to FAILED on timeout', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Timeout'),
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
        })
      );

      await waitFor(() => {
        expect(result.current.stateSegregation?.appealState.status).toBe('FAILED');
      });
    });
  });

  describe('manual reconciliation', () => {
    it('should allow manual reconciliation call', async () => {
      const mockTransaction = createMockTransaction();
      
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'success',
          transactionHash: mockTxHash,
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: mockTransaction,
        })
      );

      let manualResult: AppealReconciliationResult | null | undefined;
      await act(async () => {
        manualResult = await result.current.reconcile();
      });

      expect(manualResult).toBeDefined();
      expect(manualResult?.status).toBe('confirmed');
    });

    it('should return null when no transaction or receipt', async () => {
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: null,
        })
      );

      const manualResult = await result.current.reconcile();
      expect(manualResult).toBeNull();
    });
  });

  describe('canParticipateInAppeal utility', () => {
    it('should allow participation when no prior appeal participation', () => {
      const segregation: StateSegregation = {
        claimId: 'claim-123',
        firstRoundState: {
          decision: 'VERIFY',
          status: 'CONFIRMED',
        },
        appealState: {},
        hasFirstRoundParticipation: true,
        hasAppealParticipation: false,
        statesAreIndependent: true,
      };

      const result = canParticipateInAppeal(segregation);
      expect(result.canParticipate).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should block participation when already participated in appeal', () => {
      const segregation: StateSegregation = {
        claimId: 'claim-123',
        firstRoundState: {},
        appealState: {
          appealId: 'appeal-123',
          decision: 'SUPPORT',
          status: 'CONFIRMED',
        },
        hasFirstRoundParticipation: false,
        hasAppealParticipation: true,
        statesAreIndependent: true,
      };

      const result = canParticipateInAppeal(segregation);
      expect(result.canParticipate).toBe(false);
      expect(result.reason).toBe('Already participated in appeal');
    });

    it('should block participation when appeal transaction confirmed', () => {
      const segregation: StateSegregation = {
        claimId: 'claim-123',
        firstRoundState: {},
        appealState: {
          appealId: 'appeal-123',
          status: 'CONFIRMED',
        },
        hasFirstRoundParticipation: false,
        hasAppealParticipation: false,
        statesAreIndependent: true,
      };

      const result = canParticipateInAppeal(segregation);
      expect(result.canParticipate).toBe(false);
      expect(result.reason).toBe('Appeal participation already confirmed');
    });

    it('should block participation when transaction pending', () => {
      const segregation: StateSegregation = {
        claimId: 'claim-123',
        firstRoundState: {},
        appealState: {
          appealId: 'appeal-123',
          status: 'PENDING',
        },
        hasFirstRoundParticipation: false,
        hasAppealParticipation: false,
        statesAreIndependent: true,
      };

      const result = canParticipateInAppeal(segregation);
      expect(result.canParticipate).toBe(false);
      expect(result.reason).toBe('Appeal participation transaction pending');
    });
  });

  describe('verifyStateIndependence utility', () => {
    it('should verify states are independent', () => {
      const segregation: StateSegregation = {
        claimId: 'claim-123',
        firstRoundState: {
          decision: 'VERIFY',
          status: 'CONFIRMED',
        },
        appealState: {
          appealId: 'appeal-123',
          decision: 'OPPOSE',
          status: 'CONFIRMED',
        },
        hasFirstRoundParticipation: true,
        hasAppealParticipation: true,
        statesAreIndependent: true,
      };

      const result = verifyStateIndependence(segregation);
      expect(result).toBe(true);
    });

    it('should allow appeal participation even with first-round participation', () => {
      const segregation: StateSegregation = {
        claimId: 'claim-123',
        firstRoundState: {
          decision: 'VERIFY',
          status: 'CONFIRMED',
        },
        appealState: {},
        hasFirstRoundParticipation: true,
        hasAppealParticipation: false,
        statesAreIndependent: true,
      };

      const result = verifyStateIndependence(segregation);
      expect(result).toBe(true);
    });
  });

  describe('null transaction handling', () => {
    it('should handle null transaction gracefully', () => {
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAppealReconciliation({
          transaction: null,
        })
      );

      expect(result.current.result).toBeNull();
      expect(result.current.stateSegregation).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
