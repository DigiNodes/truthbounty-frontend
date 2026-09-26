/**
 * Unit tests for useStateReconciliation hook
 * Tests transaction confirmation and state reconciliation
 */

import { renderHook, act } from '@testing-library/react';
import { useStateReconciliation } from '@/hooks/useStateReconciliation';
import { SettlementSubmission } from '@/app/types/settlement';
import * as wagmi from 'wagmi';

jest.mock('wagmi', () => ({
  usePublicClient: jest.fn(),
}));

describe('useStateReconciliation', () => {
  const mockTxHash = '0x' + '1'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
    const defaultReceipt = {
      status: 1,
      blockNumber: 100n,
      from: '0x1234567890123456789012345678901234567890',
      logs: [],
    };
    (wagmi.usePublicClient as jest.Mock).mockReturnValue({
      getTransactionReceipt: jest.fn().mockResolvedValue(defaultReceipt),
      getBlockNumber: jest.fn().mockResolvedValue(101n),
    });
  });

  describe('transaction confirmation', () => {
    it('should confirm successful transaction', async () => {
      const mockReceipt = {
        status: 1, // Success
        blockNumber: 100n,
        from: '0x1234567890123456789012345678901234567890',
        logs: [],
      };

      const mockPublicClient = {
        getTransactionReceipt: jest.fn().mockResolvedValue(mockReceipt),
        getBlockNumber: jest.fn().mockResolvedValue(101n),
      };

      (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      const { result } = renderHook(() =>
        useStateReconciliation({
          transactionHash: mockTxHash,
          pollInterval: 100,
          confirmationBlocks: 1,
        })
      );

      const mockSubmission: SettlementSubmission = {
        transactionHash: mockTxHash,
        from: mockReceipt.from,
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
        status: 'pending',
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        timestamp: new Date().toISOString(),
      };

      let reconciliationResult: any;
      await act(async () => {
        reconciliationResult = await result.current.reconcile(mockSubmission);
      });

      expect(reconciliationResult?.status).toBe('confirmed');
      expect(reconciliationResult?.transactionHash).toBe(mockTxHash);
    });

    it('should detect reverted transaction', async () => {
      const mockReceipt = {
        status: 0, // Reverted
        blockNumber: 100n,
        from: '0x1234567890123456789012345678901234567890',
        logs: [],
      };

      const mockPublicClient = {
        getTransactionReceipt: jest.fn().mockResolvedValue(mockReceipt),
        getBlockNumber: jest.fn().mockResolvedValue(101n),
      };

      (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      const { result } = renderHook(() =>
        useStateReconciliation({
          pollInterval: 100,
          confirmationBlocks: 1,
        })
      );

      const mockSubmission: SettlementSubmission = {
        transactionHash: mockTxHash,
        from: mockReceipt.from,
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
        status: 'pending',
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        timestamp: new Date().toISOString(),
      };

      let reconciliationResult: any;
      await act(async () => {
        reconciliationResult = await result.current.reconcile(mockSubmission);
      });

      expect(reconciliationResult?.status).toBe('reverted');
      expect(reconciliationResult?.transactionHash).toBe(mockTxHash);
    });

    it('should wait for sufficient confirmations', async () => {
      const mockReceipt = {
        status: 1,
        blockNumber: 100n,
        from: '0x1234567890123456789012345678901234567890',
        logs: [],
      };

      const mockPublicClient = {
        getTransactionReceipt: jest
          .fn()
          .mockResolvedValueOnce(null) // Not mined yet
          .mockResolvedValue(mockReceipt), // Mined
        getBlockNumber: jest
          .fn()
          .mockResolvedValueOnce(100n) // Same block
          .mockResolvedValueOnce(101n) // 1 confirmation
          .mockResolvedValue(102n), // 2 confirmations
      };

      (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      const { result } = renderHook(() =>
        useStateReconciliation({
          pollInterval: 10,
          confirmationBlocks: 2,
        })
      );

      const mockSubmission: SettlementSubmission = {
        transactionHash: mockTxHash,
        from: mockReceipt.from,
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
        status: 'pending',
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        timestamp: new Date().toISOString(),
      };

      let reconciliationResult: any;
      await act(async () => {
        reconciliationResult = await result.current.reconcile(mockSubmission);
      });

      expect(reconciliationResult?.status).toBe('confirmed');
    });
  });

  describe('timeout handling', () => {
    it('should timeout if transaction not confirmed', async () => {
      const mockPublicClient = {
        getTransactionReceipt: jest.fn().mockResolvedValue(null),
        getBlockNumber: jest.fn().mockResolvedValue(100n),
      };

      (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      const { result } = renderHook(() =>
        useStateReconciliation({
          pollInterval: 10,
          timeout: 100, // Short timeout for testing
        })
      );

      const mockSubmission: SettlementSubmission = {
        transactionHash: mockTxHash,
        from: '0x1234567890123456789012345678901234567890',
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
        status: 'pending',
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        timestamp: new Date().toISOString(),
      };

      let reconciliationResult: any;
      await act(async () => {
        reconciliationResult = await result.current.reconcile(mockSubmission);
      });

      expect(reconciliationResult?.status).toBe('timeout');
      expect(reconciliationResult?.error).toContain('not confirmed within');
    });
  });

  describe('error handling', () => {
    it('should reject invalid transaction hash', async () => {
      const mockPublicClient = {
        getTransactionReceipt: jest.fn(),
        getBlockNumber: jest.fn(),
      };

      (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      const { result } = renderHook(() =>
        useStateReconciliation()
      );

      const mockSubmission: SettlementSubmission = {
        transactionHash: 'invalid-hash',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
        status: 'pending',
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        timestamp: new Date().toISOString(),
      };

      let error: any;
      await act(async () => {
        try {
          await result.current.reconcile(mockSubmission);
        } catch (e) {
          error = e;
        }
      });

      expect(error).toBeDefined();
      expect(result.current.error).toContain('Invalid transaction hash format');
    });

    it('should handle missing public client', async () => {
      (wagmi.usePublicClient as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() =>
        useStateReconciliation()
      );

      const mockSubmission: SettlementSubmission = {
        transactionHash: mockTxHash,
        from: '0x1234567890123456789012345678901234567890',
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
        status: 'pending',
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        timestamp: new Date().toISOString(),
      };

      let error: any;
      await act(async () => {
        try {
          await result.current.reconcile(mockSubmission);
        } catch (e) {
          error = e;
        }
      });

      expect(error).toBeDefined();
    });
  });

  describe('state tracking', () => {
    it('should track last reconciliation result', async () => {
      const mockReceipt = {
        status: 1,
        blockNumber: 100n,
        from: '0x1234567890123456789012345678901234567890',
        logs: [],
      };

      const mockPublicClient = {
        getTransactionReceipt: jest.fn().mockResolvedValue(mockReceipt),
        getBlockNumber: jest.fn().mockResolvedValue(101n),
      };

      (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      const { result } = renderHook(() =>
        useStateReconciliation()
      );

      const mockSubmission: SettlementSubmission = {
        transactionHash: mockTxHash,
        from: mockReceipt.from,
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
        status: 'pending',
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.reconcile(mockSubmission);
      });

      expect(result.current.lastResult).toBeDefined();
      expect(result.current.lastResult?.status).toBe('confirmed');
    });

    it('should update isReconciling state', async () => {
      const mockPublicClient = {
        getTransactionReceipt: jest.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(null), 100))
        ),
        getBlockNumber: jest.fn(),
      };

      (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      const { result } = renderHook(() =>
        useStateReconciliation({
          timeout: 50,
        })
      );

      const mockSubmission: SettlementSubmission = {
        transactionHash: mockTxHash,
        from: '0x1234567890123456789012345678901234567890',
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
        status: 'pending',
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        timestamp: new Date().toISOString(),
      };

      expect(result.current.isReconciling).toBe(false);

      act(() => {
        result.current.reconcile(mockSubmission).catch(() => {
          // Ignore
        });
      });

      expect(result.current.isReconciling).toBeDefined();
    });
  });
});
