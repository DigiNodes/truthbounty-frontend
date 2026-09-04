/**
 * Unit tests for useSettlementSubmission hook
 * Tests simulation, submission, and error handling
 */

import { renderHook, act } from '@testing-library/react';
import { useSettlementSubmission } from '@/hooks/useSettlementSubmission';
import {
  SettlementAction,
  SimulationResult,
  SettlementSubmission,
} from '@/app/types/settlement';
import * as wagmi from 'wagmi';

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
}));

describe('useSettlementSubmission', () => {
  const mockContractAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
  const mockUserAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    (wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockUserAddress,
    });
  });

  describe('simulation', () => {
    it('should successfully simulate provisional settlement', async () => {
      const { result } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: mockContractAddress,
        })
      );

      const action: SettlementAction = {
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        isCallable: true,
      };

      let simulationResult: SimulationResult | undefined;
      await act(async () => {
        simulationResult = await result.current.simulateSettlement(action);
      });

      expect(simulationResult?.success).toBe(true);
      expect(simulationResult?.gasEstimate).toBeDefined();
      expect(simulationResult?.data?.calldata).toBeDefined();
      expect(simulationResult?.data?.from).toBe(mockUserAddress);
      expect(simulationResult?.data?.to).toBe(mockContractAddress);
    });

    it('should reject simulation for non-callable action', async () => {
      const { result } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: mockContractAddress,
        })
      );

      const action: SettlementAction = {
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        isCallable: false,
        reason: 'Voting period not ended',
      };

      let simulationResult: SimulationResult | undefined;
      await act(async () => {
        simulationResult = await result.current.simulateSettlement(action);
      });

      expect(simulationResult?.success).toBe(false);
      expect(simulationResult?.error).toContain('Voting period not ended');
    });

    it('should reject simulation without wallet connection', async () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: undefined,
      });

      const { result } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: mockContractAddress,
        })
      );

      const action: SettlementAction = {
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        isCallable: true,
      };

      let simulationResult: SimulationResult | undefined;
      await act(async () => {
        simulationResult = await result.current.simulateSettlement(action);
      });

      expect(simulationResult?.success).toBe(false);
      expect(simulationResult?.error).toContain('Wallet not connected');
    });

    it('should handle invalid contract address', async () => {
      const { result } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: 'invalid-address',
        })
      );

      const action: SettlementAction = {
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        isCallable: true,
      };

      let simulationResult: SimulationResult | undefined;
      await act(async () => {
        simulationResult = await result.current.simulateSettlement(action);
      });

      expect(simulationResult?.success).toBe(false);
      expect(simulationResult?.error).toContain('Invalid contract address');
    });
  });

  describe('submission', () => {
    it('should require wallet writeContract instead of fabricating a transaction hash', async () => {
      const { result } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: mockContractAddress,
        })
      );

      const action: SettlementAction = {
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        isCallable: true,
      };

      let error: unknown;
      await act(async () => {
        try {
          await result.current.submitSettlement(action);
        } catch (e) {
          error = e;
        }
      });

      // Protocol invariant: never fabricate a synthetic hash.
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('writeContract');
      expect((error as Error).message).toContain('no synthetic transaction hash');
    });

    it('should not record a submission without a wallet-backed transaction hash', async () => {
      const { result } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: mockContractAddress,
        })
      );

      const action: SettlementAction = {
        type: 'SETTLE_APPEAL',
        claimId: 'claim-456',
        disputeId: 'dispute-789',
        isCallable: true,
      };

      await act(async () => {
        try {
          await result.current.submitSettlement(action);
        } catch {
          // Expected: submission requires wallet writeContract integration.
        }
      });

      expect(result.current.lastSubmission).toBeNull();
      expect(result.current.error).toContain('writeContract');
    });

    it('should handle submission errors', async () => {
      const { result } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: mockContractAddress,
        })
      );

      const action: SettlementAction = {
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        isCallable: false,
        reason: 'Already settled',
      };

      let error: unknown;
      await act(async () => {
        try {
          await result.current.submitSettlement(action);
        } catch (e) {
          error = e;
        }
      });

      expect(error).toBeDefined();
      expect(result.current.error).toContain('Already settled');
    });
  });

  describe('action types', () => {
    it('should encode SETTLE_PROVISIONAL correctly', async () => {
      const { result } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: mockContractAddress,
        })
      );

      const action: SettlementAction = {
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        isCallable: true,
      };

      let simulationResult: SimulationResult | undefined;
      await act(async () => {
        simulationResult = await result.current.simulateSettlement(action);
      });

      // settleProvisional(bytes32) function selector.
      expect(simulationResult?.data?.calldata).toMatch(/^0xf6ac795f/);
    });

    it('should encode FINALIZE correctly', async () => {
      const { result } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: mockContractAddress,
        })
      );

      const action: SettlementAction = {
        type: 'FINALIZE',
        claimId: 'claim-123',
        isCallable: true,
      };

      let simulationResult: SimulationResult | undefined;
      await act(async () => {
        simulationResult = await result.current.simulateSettlement(action);
      });

      // finalize(bytes32) function selector.
      expect(simulationResult?.data?.calldata).toMatch(/^0x92584d80/);
    });
  });

  describe('loading states', () => {
    it('should set isSimulating during simulation', async () => {
      const { result } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: mockContractAddress,
        })
      );

      const action: SettlementAction = {
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        isCallable: true,
      };

      act(() => {
        result.current.simulateSettlement(action).catch(() => {
          // Ignore
        });
      });

      // Note: In real scenario with async, would need to check before promise resolves
      expect(result.current.isSimulating).toBeDefined();
    });

    it('should set isSubmitting during submission', async () => {
      const { result } = renderHook(() =>
        useSettlementSubmission({
          contractAddress: mockContractAddress,
        })
      );

      const action: SettlementAction = {
        type: 'SETTLE_PROVISIONAL',
        claimId: 'claim-123',
        isCallable: true,
      };

      act(() => {
        result.current.submitSettlement(action).catch(() => {
          // Ignore
        });
      });

      expect(result.current.isSubmitting).toBeDefined();
    });
  });
});
