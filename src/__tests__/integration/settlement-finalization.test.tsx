/**
 * Integration tests for settlement and finalization flows
 * Tests full lifecycle from detection through settlement and reconciliation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettlementDetection } from '@/hooks/useSettlementDetection';
import { useFinalizationDetection } from '@/hooks/useFinalizationDetection';
import { useSettlementSubmission } from '@/hooks/useSettlementSubmission';
import { useStateReconciliation } from '@/hooks/useStateReconciliation';
import type {
  SimulationResult,
  SettlementSubmission,
  ReconciliationResult,
} from '@/app/types/settlement';
import * as wagmi from 'wagmi';

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useChainId: jest.fn(),
  usePublicClient: jest.fn(),
}));

describe('Settlement and Finalization Integration', () => {
  const mockContractAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const OPTIMISM_MAINNET = 10;

  // Deterministic test fixture hash — used ONLY inside tests, never in
  // production paths (V2-FE-016: no synthetic hashes in production).
  const FIXTURE_TX_HASH = '0x' + '1'.repeat(64);

  function createSubmissionFixture(
    overrides: Partial<SettlementSubmission> = {},
  ): SettlementSubmission {
    return {
      transactionHash: FIXTURE_TX_HASH,
      from: mockUserAddress,
      to: mockContractAddress,
      status: 'pending',
      type: 'SETTLE_PROVISIONAL',
      claimId: 'claim-123',
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockUserAddress,
      isConnected: true,
    });
    (wagmi.useChainId as jest.Mock).mockReturnValue(OPTIMISM_MAINNET);
  });

  describe('provisional settlement flow', () => {
    it('should complete full provisional settlement lifecycle', async () => {
      // Step 1: Detect that settlement is callable
      const { result: detectionResult } = renderHook(() =>
        useSettlementDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
          pollInterval: 1000,
        })
      );

      await waitFor(() => {
        expect(detectionResult.current.isLoading).toBe(false);
      });

      expect(detectionResult.current.validation?.isValid).toBe(true);

      // Step 2: Submission must fail clearly until real wallet writeContract
      // integration — no synthetic transaction hash is emitted. The rejection
      // is captured inside act() so later hook renders stay healthy.
      expect(detectionResult.current.provisionalAction?.isCallable).toBe(true);

      const { result: submissionResult } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: mockContractAddress,
        })
      );

      let caught: unknown;
      await act(async () => {
        try {
          await submissionResult.current.submitSettlement(
            detectionResult.current.provisionalAction!
          );
        } catch (err) {
          caught = err;
        }
      });
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toMatch(/writeContract/);
      expect(submissionResult.current.lastSubmission).toBeNull();

      // Step 3: Reconcile state after finality
      const mockReceipt = {
        status: 1,
        blockNumber: 100n,
        from: mockUserAddress,
        logs: [],
      };

      const mockPublicClient = {
        getTransactionReceipt: jest.fn().mockResolvedValue(mockReceipt),
        getBlockNumber: jest.fn().mockResolvedValue(101n),
      };

      (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      const { result: reconciliationResult } = renderHook(() =>
        useStateReconciliation()
      );

      // Reconcile a real (fixture) submission once mined.
      let reconciliationOutcome: ReconciliationResult | undefined;
      await act(async () => {
        reconciliationOutcome = await reconciliationResult.current.reconcile(
          createSubmissionFixture()
        );
      });

      expect(reconciliationOutcome?.status).toBe('confirmed');
      expect(reconciliationOutcome?.finalState).toBe('SETTLED');
    });

    it('should handle rejected settlement action', async () => {
      const { result: detectionResult } = renderHook(() =>
        useSettlementDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(detectionResult.current.isLoading).toBe(false);
      });

      // If settlement is not callable, provisionalAction should be null or indicate not callable
      if (!detectionResult.current.provisionalAction?.isCallable) {
        const { result: submissionResult } = renderHook(() =>
          useSettlementSubmission({
            contractAddress: mockContractAddress,
          })
        );

        let error;
        if (detectionResult.current.provisionalAction) {
          await act(async () => {
            try {
              await submissionResult.current.submitSettlement(
                detectionResult.current.provisionalAction!
              );
            } catch (e) {
              error = e;
            }
          });

          expect(error).toBeDefined();
        }
      }
    });

    it('should prevent stale settlement calls', async () => {
      // Setup initial detection
      const { result: detectionResult, rerender } = renderHook(
        ({ chainId }) =>
          useSettlementDetection({
            claimId: 'claim-123',
            contractAddress: mockContractAddress,
            expectedChainId: chainId,
          }),
        { initialProps: { chainId: OPTIMISM_MAINNET } }
      );

      await waitFor(() => {
        expect(detectionResult.current.isLoading).toBe(false);
      });

      // Simulate chain change
      (wagmi.useChainId as jest.Mock).mockReturnValue(1);
      rerender({ chainId: 1 });

      await waitFor(() => {
        expect(detectionResult.current.validation?.isValid).toBe(false);
      });

      // Settlement submission should fail
      const { result: submissionResult } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: mockContractAddress,
        })
      );

      if (detectionResult.current.provisionalAction) {
        let simulationResult: SimulationResult | undefined;
        await act(async () => {
          simulationResult = await submissionResult.current.simulateSettlement(
            detectionResult.current.provisionalAction!
          );
        });

        // Simulation should succeed or provide useful error
        expect(simulationResult).toBeDefined();
      }
    });

    it('should reconcile transaction on wrong network', async () => {
      // Simulate transaction that gets submitted on correct chain
      const mockTxHash = '0x' + '1'.repeat(64);

      const mockReceipt = {
        status: 1,
        blockNumber: 100n,
        from: mockUserAddress,
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

      const mockSubmission = {
        transactionHash: mockTxHash,
        from: mockUserAddress,
        to: mockContractAddress,
        status: 'pending' as const,
        type: 'SETTLE_PROVISIONAL' as const,
        claimId: 'claim-123',
        timestamp: new Date().toISOString(),
      };

      let reconciliationResult: ReconciliationResult | undefined;
      await act(async () => {
        reconciliationResult = await result.current.reconcile(mockSubmission);
      });

      expect(reconciliationResult?.status).toBe('confirmed');
    });
  });

  describe('appeal settlement flow', () => {
    it('should complete appeal settlement when ready', async () => {
      const { result: detectionResult } = renderHook(() =>
        useSettlementDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(detectionResult.current.isLoading).toBe(false);
      });

      expect(detectionResult.current.validation?.isValid).toBe(true);

      // Check if appeal settlement is detected
      if (detectionResult.current.appealAction) {
        const { result: submissionResult } = renderHook(() =>
          useSettlementSubmission({
            contractAddress: mockContractAddress,
          })
        );

        // Appeal settlement submission requires wallet writeContract; the
        // hook fails clearly instead of fabricating a hash (V2-FE-016).
        let caught: unknown;
        await act(async () => {
          try {
            await submissionResult.current.submitSettlement(
              detectionResult.current.appealAction!
            );
          } catch (err) {
            caught = err;
          }
        });
        expect(caught).toBeInstanceOf(Error);
        expect((caught as Error).message).toMatch(/writeContract/);
      }
    });
  });

  describe('finalization flow', () => {
    it('should detect and finalize when ready', async () => {
      const { result: finalizationResult } = renderHook(() =>
        useFinalizationDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(finalizationResult.current.isLoading).toBe(false);
      });

      expect(finalizationResult.current.validation?.isValid).toBe(true);
      expect(finalizationResult.current.requirements).toBeDefined();

      if (finalizationResult.current.finalizationAction?.isCallable) {
        const { result: submissionResult } = renderHook(() =>
          useSettlementSubmission({
            contractAddress: mockContractAddress,
          })
        );

        // Finalization submission requires wallet writeContract; the hook
        // fails clearly instead of fabricating a hash (V2-FE-016).
        let caught: unknown;
        await act(async () => {
          try {
            await submissionResult.current.submitSettlement(
              finalizationResult.current.finalizationAction!
            );
          } catch (err) {
            caught = err;
          }
        });
        expect(caught).toBeInstanceOf(Error);
        expect((caught as Error).message).toMatch(/writeContract/);
      }
    });

    it('should prevent premature finalization', async () => {
      const { result: finalizationResult } = renderHook(() =>
        useFinalizationDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(finalizationResult.current.isLoading).toBe(false);
      });

      // If finalization is not ready
      if (!finalizationResult.current.finalizationAction?.isCallable) {
        expect(finalizationResult.current.finalizationAction?.reason).toBeDefined();
      }
    });
  });

  describe('error recovery', () => {
    it('should handle reverted transactions gracefully', async () => {
      const mockTxHash = '0x' + '1'.repeat(64);

      const mockReceipt = {
        status: 0, // Reverted
        blockNumber: 100n,
        from: mockUserAddress,
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

      const mockSubmission = {
        transactionHash: mockTxHash,
        from: mockUserAddress,
        to: mockContractAddress,
        status: 'pending' as const,
        type: 'SETTLE_PROVISIONAL' as const,
        claimId: 'claim-123',
        timestamp: new Date().toISOString(),
      };

      let reconciliationResult: ReconciliationResult | undefined;
      await act(async () => {
        reconciliationResult = await result.current.reconcile(mockSubmission);
      });

      expect(reconciliationResult?.status).toBe('reverted');
      expect(reconciliationResult?.finalState).toBe('PENDING_SETTLEMENT');
    });

    it('should handle transaction timeout', async () => {
      const mockPublicClient = {
        getTransactionReceipt: jest.fn().mockResolvedValue(null),
        getBlockNumber: jest.fn().mockResolvedValue(100n),
      };

      (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      const { result } = renderHook(() =>
        useStateReconciliation({
          timeout: 50,
          pollInterval: 10,
        })
      );

      const mockSubmission = {
        transactionHash: '0x' + '1'.repeat(64),
        from: mockUserAddress,
        to: mockContractAddress,
        status: 'pending' as const,
        type: 'SETTLE_PROVISIONAL' as const,
        claimId: 'claim-123',
        timestamp: new Date().toISOString(),
      };

      let reconciliationResult: ReconciliationResult | undefined;
      await act(async () => {
        reconciliationResult = await result.current.reconcile(mockSubmission);
      });

      expect(reconciliationResult?.status).toBe('timeout');
      expect(reconciliationResult?.error).toContain('not confirmed');
    });
  });
});
