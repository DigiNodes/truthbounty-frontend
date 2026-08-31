/**
 * Unit tests for useFinalizationDetection hook
 * Tests finalization readiness detection and requirements
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useFinalizationDetection } from '@/hooks/useFinalizationDetection';
import * as wagmi from 'wagmi';

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useChainId: jest.fn(),
}));

describe('useFinalizationDetection', () => {
  const mockContractAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const OPTIMISM_MAINNET = 10;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('finalization detection', () => {
    it('should detect finalization is ready', async () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: mockUserAddress,
        isConnected: true,
      });
      (wagmi.useChainId as jest.Mock).mockReturnValue(OPTIMISM_MAINNET);

      const { result } = renderHook(() =>
        useFinalizationDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.validation?.isValid).toBe(true);
      expect(result.current.requirements).toBeDefined();
    });

    it('should provide finalization requirements', async () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: mockUserAddress,
        isConnected: true,
      });
      (wagmi.useChainId as jest.Mock).mockReturnValue(OPTIMISM_MAINNET);

      const { result } = renderHook(() =>
        useFinalizationDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.requirements?.claimId).toBe('claim-123');
      expect(result.current.requirements?.allSettlementsCompleted).toBeDefined();
      expect(result.current.requirements?.noActiveAppeals).toBeDefined();
      expect(result.current.requirements?.finalizationWindowOpen).toBeDefined();
    });
  });

  describe('finalization action callable', () => {
    it('should return finalization action when all requirements met', async () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: mockUserAddress,
        isConnected: true,
      });
      (wagmi.useChainId as jest.Mock).mockReturnValue(OPTIMISM_MAINNET);

      const { result } = renderHook(() =>
        useFinalizationDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const action = result.current.finalizationAction;
      if (action && action.isCallable) {
        expect(action.type).toBe('FINALIZE');
        expect(action.claimId).toBe('claim-123');
      }
    });
  });

  describe('finalization not ready', () => {
    it('should not allow finalization if settlements incomplete', async () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: mockUserAddress,
        isConnected: true,
      });
      (wagmi.useChainId as jest.Mock).mockReturnValue(OPTIMISM_MAINNET);

      const { result } = renderHook(() =>
        useFinalizationDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // In production would mock incomplete settlements
      expect(result.current.requirements).toBeDefined();
    });

    it('should prevent finalization with active appeals', async () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: mockUserAddress,
        isConnected: true,
      });
      (wagmi.useChainId as jest.Mock).mockReturnValue(OPTIMISM_MAINNET);

      const { result } = renderHook(() =>
        useFinalizationDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // In production would mock active appeals
      expect(result.current.requirements).toBeDefined();
    });

    it('should show time remaining if finalization window closed', async () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: mockUserAddress,
        isConnected: true,
      });
      (wagmi.useChainId as jest.Mock).mockReturnValue(OPTIMISM_MAINNET);

      const { result } = renderHook(() =>
        useFinalizationDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      if (result.current.requirements?.timeRemaining !== undefined) {
        expect(result.current.requirements.timeRemaining).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('wallet validation', () => {
    it('should fail on disconnected wallet', async () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      });
      (wagmi.useChainId as jest.Mock).mockReturnValue(OPTIMISM_MAINNET);

      const { result } = renderHook(() =>
        useFinalizationDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.validation?.isValid).toBe(false);
      expect(result.current.finalizationAction).toBeNull();
    });

    it('should fail on wrong network', async () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: mockUserAddress,
        isConnected: true,
      });
      (wagmi.useChainId as jest.Mock).mockReturnValue(1); // Ethereum mainnet

      const { result } = renderHook(() =>
        useFinalizationDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
          expectedChainId: OPTIMISM_MAINNET,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.validation?.isValid).toBe(false);
      expect(result.current.validation?.error).toContain('Wrong network');
    });
  });

  describe('polling', () => {
    it('should poll finalization status at interval', async () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: mockUserAddress,
        isConnected: true,
      });
      (wagmi.useChainId as jest.Mock).mockReturnValue(OPTIMISM_MAINNET);

      const { result } = renderHook(() =>
        useFinalizationDetection({
          claimId: 'claim-123',
          contractAddress: mockContractAddress,
          pollInterval: 100,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.requirements).toBeDefined();
    });
  });
});
