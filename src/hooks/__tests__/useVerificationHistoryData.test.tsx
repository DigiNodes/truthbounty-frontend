import { renderHook, waitFor } from '@testing-library/react';
import { useVerificationHistoryData } from '../useVerificationHistoryData';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

jest.mock('@/lib/contracts/registry', () => ({
  getProtocolRelease: () => ({
    manifest: { chainId: 11155420, releaseId: 'test-release' },
  }),
}));

global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useVerificationHistoryData', () => {
  const createFreshWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches verification history when allowed - empty entries', async () => {
    const mockResponse = {
      entries: [],
      rejectedCount: 0,
      receivedAt: Date.now(),
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useVerificationHistoryData(), { wrapper: createFreshWrapper() });

    await waitFor(() => {
      expect(result.current.data.state).toBe('empty');
    }, { timeout: 5000 });

    expect(result.current.data.entries).toHaveLength(0);
  });

  it('fetches verification history when allowed - with entries', async () => {
    const mockResponse = {
      entries: [
        {
          id: 'v1',
          claimId: '0x123',
          title: 'Test',
          outcome: 'finalized',
          amount: '500000000000000000',
          decimals: 18,
          asset: '0xETH',
          source: { kind: 'contract', block: '123', finality: 'finalized' },
          submittedAt: '2026-01-01T00:00:00Z',
          reorgStatus: 'none',
          freshness: { fetchedAt: '2026-01-01T00:00:00Z', stale: false },
        },
      ],
      rejectedCount: 0,
      receivedAt: Date.now(),
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useVerificationHistoryData(), { wrapper: createFreshWrapper() });

    await waitFor(() => {
      expect(result.current.data.state).toBe('ready');
    }, { timeout: 5000 });

    expect(result.current.data.entries).toHaveLength(1);
    expect(result.current.data.entries[0].amount).toBe('0.5');
    expect(result.current.data.entries[0].outcome).toBe('finalized');
  });

  it('handles api-projection source correctly', async () => {
    const mockResponse = {
      entries: [
        {
          id: 'v1',
          claimId: '0x123',
          title: 'Test',
          outcome: 'reward',
          amount: '200000000000000000',
          decimals: 18,
          asset: '0xETH',
          source: { kind: 'api-projection', receivedAt: Date.now(), freshness: 'unknown' },
          submittedAt: '2026-01-01T00:00:00Z',
          reorgStatus: 'none',
          freshness: { fetchedAt: '2026-01-01T00:00:00Z', stale: false },
        },
      ],
      rejectedCount: 0,
      receivedAt: Date.now(),
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useVerificationHistoryData(), { wrapper: createFreshWrapper() });

    await waitFor(() => {
      expect(result.current.data.state).toBe('ready');
    }, { timeout: 5000 });

    expect(result.current.data.entries[0].source.kind).toBe('api-projection');
    expect(result.current.data.entries[0].amount).toBe('0.2');
  });

  it('handles delayed indexing freshness', async () => {
    const mockResponse = {
      entries: [
        {
          id: 'v1',
          claimId: '0x123',
          title: 'Test',
          outcome: 'settlement-pending',
          amount: '300000000000000000',
          decimals: 18,
          asset: '0xETH',
          source: { kind: 'api-projection', receivedAt: Date.now(), freshness: 'projection-lag' },
          submittedAt: '2026-01-01T00:00:00Z',
          reorgStatus: 'none',
          freshness: { fetchedAt: '2026-01-01T00:00:00Z', stale: true, delayedIndexing: true },
        },
      ],
      rejectedCount: 0,
      receivedAt: Date.now(),
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useVerificationHistoryData(), { wrapper: createFreshWrapper() });

    await waitFor(() => {
      expect(result.current.data.state).toBe('ready');
    }, { timeout: 5000 });

    expect(result.current.data.entries[0].freshness.delayedIndexing).toBe(true);
    expect(result.current.data.entries[0].freshness.stale).toBe(true);
  });

  it('handles reorg status', async () => {
    const mockResponse = {
      entries: [
        {
          id: 'v1',
          claimId: '0x123',
          title: 'Test',
          outcome: 'slashed',
          amount: '100000000000000000',
          decimals: 18,
          asset: '0xETH',
          source: { kind: 'contract', block: '123', finality: 'finalized' },
          submittedAt: '2026-01-01T00:00:00Z',
          reorgStatus: 'reconciled',
          replacedBy: '0xabc',
          freshness: { fetchedAt: '2026-01-01T00:00:00Z', stale: false },
        },
      ],
      rejectedCount: 0,
      receivedAt: Date.now(),
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useVerificationHistoryData(), { wrapper: createFreshWrapper() });

    await waitFor(() => {
      expect(result.current.data.state).toBe('ready');
    }, { timeout: 5000 });

    expect(result.current.data.entries[0].reorgStatus).toBe('reconciled');
    expect(result.current.data.entries[0].replacedBy).toBe('0xabc');
  });

  it('returns error state on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useVerificationHistoryData(), { wrapper: createFreshWrapper() });

    await waitFor(() => {
      expect(result.current.data.state).toBe('error');
    }, { timeout: 5000 });
  });

  it('provides refresh function', async () => {
    const mockResponse = {
      entries: [
        {
          id: 'v1',
          claimId: '0x123',
          title: 'Test',
          outcome: 'finalized',
          amount: '500000000000000000',
          decimals: 18,
          asset: '0xETH',
          source: { kind: 'contract', block: '123', finality: 'finalized' },
          submittedAt: '2026-01-01T00:00:00Z',
          reorgStatus: 'none',
          freshness: { fetchedAt: '2026-01-01T00:00:00Z', stale: false },
        },
      ],
      rejectedCount: 0,
      receivedAt: Date.now(),
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useVerificationHistoryData(), { wrapper: createFreshWrapper() });

    await waitFor(() => {
      expect(result.current.data.state).toBe('ready');
    }, { timeout: 5000 });

    // Test that refresh function exists and can be called
    expect(typeof result.current.refresh).toBe('function');
    result.current.refresh();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});