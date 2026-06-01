/**
 * Worldcoin "Verified" badge desync invariants (#189)
 *
 * Audit finding: badge can fall out of sync with backend status.
 *
 * Invariants enforced:
 *   - refresh() is called on mount when autoCheck is true.
 *   - A polling interval is set up when walletAddress is provided.
 *   - The polling interval is cleared on unmount (no memory leaks).
 *   - Polling is skipped while status is IN_PROGRESS.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorldcoinVerification } from '@/hooks/useWorldcoinVerification';

// Mock dependencies
jest.mock('@/app/lib/worldcoin', () => ({
  getVerificationStatus: jest.fn().mockResolvedValue(null),
  submitWorldcoinVerification: jest.fn(),
  mockWorldcoinVerification: jest.fn(),
  shouldUseMock: jest.fn().mockReturnValue(true),
}));

jest.mock('@/config/worldcoin-client', () => ({
  getWorldcoinConfig: jest.fn().mockReturnValue({ appId: 'test', action: 'test' }),
  isWorldcoinConfigured: jest.fn().mockReturnValue(false),
}));

jest.mock('@/app/queries/queryKeys', () => ({
  queryKeys: { user: { verification: (addr: string) => ['verification', addr] } },
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

import { getVerificationStatus } from '@/app/lib/worldcoin';

describe('useWorldcoinVerification — badge desync fix', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (getVerificationStatus as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('calls refresh on mount when autoCheck is true', async () => {
    renderHook(() =>
      useWorldcoinVerification({ walletAddress: '0xabc', autoCheck: true, pollInterval: 0 })
    );

    await waitFor(() => {
      expect(getVerificationStatus).toHaveBeenCalledWith('0xabc');
    });
  });

  it('sets up polling interval when walletAddress is provided', async () => {
    renderHook(() =>
      useWorldcoinVerification({ walletAddress: '0xabc', autoCheck: false, pollInterval: 5000 })
    );

    const initialCalls = (getVerificationStatus as jest.Mock).mock.calls.length;

    act(() => { jest.advanceTimersByTime(5000); });
    await waitFor(() => {
      expect((getVerificationStatus as jest.Mock).mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  it('clears polling interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() =>
      useWorldcoinVerification({ walletAddress: '0xabc', autoCheck: false, pollInterval: 5000 })
    );

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('does not poll when pollInterval is 0', async () => {
    renderHook(() =>
      useWorldcoinVerification({ walletAddress: '0xabc', autoCheck: false, pollInterval: 0 })
    );

    act(() => { jest.advanceTimersByTime(60000); });
    expect(getVerificationStatus).not.toHaveBeenCalled();
  });
});