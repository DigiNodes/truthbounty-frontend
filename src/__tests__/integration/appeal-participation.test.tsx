/**
 * Integration tests for appeal participation flow
 * Tests: complete flow from context fetch → validation → simulation → submission → reconciliation
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useAppealContext } from '@/hooks/useAppealContext';
import { useAppealParticipation } from '@/hooks/useAppealParticipation';
import { useAppealReconciliation } from '@/hooks/useAppealReconciliation';
import type {
  AppealParticipationTransaction,
  AppealSimulationResult,
} from '@/app/types/appeal';
import * as wagmi from 'wagmi';

// Deterministic test fixture hash — used ONLY inside tests, never in
// production paths (V2-FE-016: no synthetic hashes in production).
const FIXTURE_TX_HASH =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

// Mock Wagmi
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useChainId: jest.fn(),
  useBlockNumber: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
  usePublicClient: jest.fn(),
}));

describe('Appeal Participation Integration', () => {
  const mockContractAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const OPTIMISM_MAINNET = 10;

  function createTxFixture(
    overrides: Partial<AppealParticipationTransaction> = {},
  ): AppealParticipationTransaction {
    return {
      transactionHash: FIXTURE_TX_HASH,
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
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();

    (wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockUserAddress,
      isConnected: true,
    });
    (wagmi.useChainId as jest.Mock).mockReturnValue(OPTIMISM_MAINNET);
    (wagmi.useBlockNumber as jest.Mock).mockReturnValue({
      data: BigInt(12345678),
    });
    (wagmi.usePublicClient as jest.Mock).mockReturnValue({});
  });

  describe('complete participation flow', () => {
    it('should complete full flow: fetch context → validate → simulate → submit → reconcile', async () => {
      // Step 1: Fetch appeal context
      const { result: contextResult } = renderHook(() =>
        useAppealContext({
          appealId: 'appeal-123',
          claimId: 'claim-456',
          contractAddress: mockContractAddress,
          pollInterval: 100000,
        })
      );

      await waitFor(() => {
        expect(contextResult.current.context).not.toBeNull();
      });

      const context = contextResult.current.context!;
      expect(context.isEligible).toBe(true);

      // Step 2: Initialize participation hook
      const { result: participationResult } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
        })
      );

      // Step 3: Validate participation
      const validation = participationResult.current.validateParticipation(
        context,
        'SUPPORT',
        '500000000000000000'
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Step 4: Simulate transaction
      let simulation: AppealSimulationResult | undefined;
      await act(async () => {
        simulation = await participationResult.current.simulateParticipation(
          context,
          'SUPPORT',
          '500000000000000000'
        );
      });

      expect(simulation?.success).toBe(true);
      expect(simulation?.gasEstimate).toBeDefined();
      expect(simulation?.projectedState).toBeDefined();

      // Step 5: Submission must fail clearly until real wallet writeContract
      // integration — no synthetic transaction hash is fabricated. The
      // rejection is captured inside act() so subsequent hook renders stay
      // healthy (React 19 + RTL 14 rejected-act quirk).
      let caught: unknown;
      await act(async () => {
        try {
          await participationResult.current.submitParticipation(
            context,
            'SUPPORT',
            '500000000000000000'
          );
        } catch (err) {
          caught = err;
        }
      });
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toMatch(/writeContract/);

      expect(participationResult.current.lastTransaction).toBeNull();

      // Step 6: Reconcile a real (fixture) transaction once mined
      const transaction = createTxFixture();
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'success',
          transactionHash: transaction.transactionHash,
          blockNumber: BigInt(12345680),
        },
        isLoading: false,
        error: null,
      });

      const { result: reconciliationResult } = renderHook(() =>
        useAppealReconciliation({
          transaction,
        })
      );

      await waitFor(() => {
        expect(reconciliationResult.current.result).not.toBeNull();
      });

      expect(reconciliationResult.current.result?.status).toBe('confirmed');
      expect(reconciliationResult.current.result?.position.hasParticipated).toBe(true);
      expect(reconciliationResult.current.stateSegregation).toBeDefined();
      expect(reconciliationResult.current.stateSegregation?.statesAreIndependent).toBe(true);
    });

    it('should handle oppose decision in complete flow', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext({
          appealId: 'appeal-456',
          claimId: 'claim-789',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(contextResult.current.context).not.toBeNull();
      });

      const { result: participationResult } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
        })
      );

      // Submission fails clearly until writeContract integration; the OPPOSE
      // decision must still be verifiable at validation/simulation boundaries.
      let caught: unknown;
      await act(async () => {
        try {
          await participationResult.current.submitParticipation(
            contextResult.current.context!,
            'OPPOSE',
            '300000000000000000'
          );
        } catch (err) {
          caught = err;
        }
      });
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toMatch(/writeContract/);

      let simulation: AppealSimulationResult | undefined;
      await act(async () => {
        simulation = await participationResult.current.simulateParticipation(
          contextResult.current.context!,
          'OPPOSE',
          '300000000000000000'
        );
      });

      expect(simulation?.success).toBe(true);
      expect(simulation?.projectedState?.newOpposeTotal).toBe('2400000000000000000');
      expect(simulation?.data?.calldata).toContain('0xdef67890'); // Oppose selector
    });
  });

  describe('error handling in flow', () => {
    it('should stop the flow when the wallet is on the wrong network', async () => {
      // Ethereum mainnet (1) instead of Optimism mainnet (10): the context
      // hook must fail clearly instead of fabricating appeal state.
      (wagmi.useChainId as jest.Mock).mockReturnValue(1);

      const { result: contextResult } = renderHook(() =>
        useAppealContext({
          appealId: 'appeal-123',
          claimId: 'claim-456',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(contextResult.current.error).not.toBeNull();
      });

      expect(contextResult.current.context).toBeNull();
      expect(contextResult.current.error).toContain('Wrong network');
    });

    it('should stop flow when validation fails', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext({
          appealId: 'appeal-123',
          claimId: 'claim-456',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(contextResult.current.context).not.toBeNull();
      });

      const { result: participationResult } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
        })
      );

      // Try to submit with insufficient stake
      let caught: unknown;
      await act(async () => {
        try {
          await participationResult.current.submitParticipation(
            contextResult.current.context!,
            'SUPPORT',
            '50000000000000000' // Below minimum
          );
        } catch (err) {
          caught = err;
        }
      });
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toMatch(/below minimum/i);
    });

    it('should handle transaction revert in reconciliation', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext({
          appealId: 'appeal-123',
          claimId: 'claim-456',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(contextResult.current.context).not.toBeNull();
      });

      const transaction = createTxFixture();

      // Mock reverted transaction
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'reverted',
          transactionHash: transaction.transactionHash,
        },
        isLoading: false,
        error: null,
      });

      const { result: reconciliationResult } = renderHook(() =>
        useAppealReconciliation({
          transaction,
        })
      );

      await waitFor(() => {
        expect(reconciliationResult.current.result).not.toBeNull();
      });

      expect(reconciliationResult.current.result?.status).toBe('reverted');
      expect(reconciliationResult.current.result?.position.hasParticipated).toBe(false);
    });
  });

  describe('state segregation throughout flow', () => {
    it('should maintain state segregation from context to reconciliation', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext({
          appealId: 'appeal-123',
          claimId: 'claim-456',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(contextResult.current.context).not.toBeNull();
      });

      // Use a test fixture transaction for the reconciliation boundary; the
      // production submit path refuses to fabricate a hash.
      const transaction = createTxFixture();

      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'success',
          transactionHash: transaction.transactionHash,
        },
        isLoading: false,
        error: null,
      });

      const { result: reconciliationResult } = renderHook(() =>
        useAppealReconciliation({
          transaction,
        })
      );

      await waitFor(() => {
        expect(reconciliationResult.current.stateSegregation).not.toBeNull();
      });

      const segregation = reconciliationResult.current.stateSegregation!;
      
      // Verify claim IDs match
      expect(segregation.claimId).toBe('claim-456');
      
      // Verify appeal state is tracked separately
      expect(segregation.appealState.appealId).toBe('appeal-123');
      expect(segregation.appealState.decision).toBe('SUPPORT');
      expect(segregation.appealState.status).toBe('CONFIRMED');
      
      // Verify independence flag
      expect(segregation.statesAreIndependent).toBe(true);
    });
  });

  describe('real-time updates during flow', () => {
    it('should update context when blocks advance during participation', async () => {
      const { result: contextResult, rerender } = renderHook(() =>
        useAppealContext({
          appealId: 'appeal-123',
          claimId: 'claim-456',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(contextResult.current.context).not.toBeNull();
      });

      const lastCurrentBlock = contextResult.current.context!.deadline.currentBlock;

      // Simulate block advancement: re-render so the hook re-reads the mock
      // and recomputes the deadline against the new current block.
      (wagmi.useBlockNumber as jest.Mock).mockReturnValue({
        data: BigInt(12345700),
      });
      await act(async () => {
        rerender();
      });

      // Context should refresh the deadline against the advanced block.
      // (The hook re-anchors the snapshot to the new block, so the remaining
      // period slides; what observably changes is the tracked currentBlock.)
      await waitFor(() => {
        expect(contextResult.current.context?.deadline.currentBlock).toBeGreaterThan(
          lastCurrentBlock
        );
      });
    });
  });

  describe('concurrent participation attempts', () => {
    it('should prevent double submission', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext({
          appealId: 'appeal-123',
          claimId: 'claim-456',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(contextResult.current.context).not.toBeNull();
      });

      const { result: participationResult } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
        })
      );

      // First submission fails clearly (no synthetic hash emitted). The
      // rejection is captured inside act() so later hooks render fine.
      let caught: unknown;
      await act(async () => {
        try {
          await participationResult.current.submitParticipation(
            contextResult.current.context!,
            'SUPPORT',
            '500000000000000000'
          );
        } catch (err) {
          caught = err;
        }
      });
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toMatch(/writeContract/);

      expect(participationResult.current.lastTransaction).toBeNull();

      // Update context to reflect participation
      const updatedContext = {
        ...contextResult.current.context!,
        walletPosition: {
          ...contextResult.current.context!.walletPosition,
          hasParticipated: true,
          existingDecision: 'SUPPORT' as const,
        },
        isEligible: false,
        ineligibilityReason: 'Already participated',
      };

      // Second submission should fail validation
      const validation = participationResult.current.validateParticipation(
        updatedContext,
        'OPPOSE',
        '300000000000000000'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('You have already participated in this appeal');
    });
  });

  describe('gas estimation and projection', () => {
    it('should provide accurate gas and projection throughout flow', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext({
          appealId: 'appeal-123',
          claimId: 'claim-456',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(contextResult.current.context).not.toBeNull();
      });

      const { result: participationResult } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
        })
      );

      const stakeAmount = '1000000000000000000'; // 1 ETH
      let simulation: AppealSimulationResult | undefined;

      await act(async () => {
        simulation = await participationResult.current.simulateParticipation(
          contextResult.current.context!,
          'SUPPORT',
          stakeAmount
        );
      });

      expect(simulation?.gasEstimate).toBeDefined();
      expect(Number(simulation?.gasEstimate)).toBeGreaterThan(0);
      
      expect(simulation?.projectedState?.newSupportTotal).toBe('4500000000000000000');
      expect(simulation?.projectedState?.riskAmount).toBe(stakeAmount);
      expect(simulation?.projectedState?.potentialReward).toBeDefined();
    });
  });
});
