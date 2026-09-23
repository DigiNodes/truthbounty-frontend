/**
 * Tests for useRpcFallback hook
 *
 * Uses the project's existing global fetch mock (jest.fn() from jest.setup.js)
 * and configures it per-test via mockImplementation / mockResolvedValueOnce.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRpcFallback } from '../useRpcFallback';

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

/** Successful eth_chainId RPC response for a given chain hex. */
function rpcOkResponse(chainIdHex: string) {
  return {
    ok: true,
    json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: chainIdHex }),
  };
}

/** Mock a failing HTTP response. */
const rpcErrorResponse = { ok: false, status: 503 };

// Mainnet hex: 0xa (10), Sepolia hex: 0xaa37dc (11155420)
const OP_MAINNET_HEX = '0xa';
const OP_SEPOLIA_HEX = '0xaa37dc';
const WRONG_HEX = '0x1'; // Ethereum mainnet

describe('useRpcFallback', () => {
  beforeEach(() => {
    // Reset call history and implementations before each test
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Static validation (no async probe needed)
  // ──────────────────────────────────────────────────────────────────────────

  describe('unsupported_chain', () => {
    it('returns status=unsupported_chain immediately for chainId=1 (Ethereum mainnet)', () => {
      const { result } = renderHook(() => useRpcFallback({ chainId: 1 }));
      expect(result.current.status).toBe('unsupported_chain');
      expect(result.current.isHealthy).toBe(false);
      expect(result.current.errorCode).toBe('UNSUPPORTED_CHAIN');
    });

    it('returns status=unsupported_chain for arbitrary unknown chainId', () => {
      const { result } = renderHook(() => useRpcFallback({ chainId: 999 }));
      expect(result.current.status).toBe('unsupported_chain');
    });

    it('retry is a no-op for unsupported_chain (does not throw)', () => {
      const { result } = renderHook(() => useRpcFallback({ chainId: 1 }));
      expect(() => {
        act(() => {
          result.current.retry();
        });
      }).not.toThrow();
      expect(result.current.status).toBe('unsupported_chain');
    });
  });

  describe('misconfigured', () => {
    it('returns status=misconfigured when chainId is undefined and no rpcUrls provided', () => {
      const { result } = renderHook(() => useRpcFallback({}));
      expect(result.current.status).toBe('misconfigured');
      expect(result.current.isHealthy).toBe(false);
      expect(result.current.errorCode).toBe('MISCONFIGURED');
    });

    it('returns status=misconfigured when called with no arguments', () => {
      const { result } = renderHook(() => useRpcFallback());
      expect(result.current.status).toBe('misconfigured');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Probe-based tests (async)
  //
  // Note: activeUrl starts as null and is populated after the probe completes.
  // We wait for activeUrl !== null (or for a non-initial status) to confirm
  // the probe has resolved rather than catching the initial 'healthy' state.
  // ──────────────────────────────────────────────────────────────────────────

  describe('healthy — primary probe succeeds', () => {
    it('sets status=healthy and activeUrl when primary probe succeeds with correct chainId (mainnet)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(rpcOkResponse(OP_MAINNET_HEX));

      const { result } = renderHook(() =>
        useRpcFallback({
          chainId: 10,
          rpcUrls: ['https://primary.example.com'],
        }),
      );

      // activeUrl starts null; wait for probe to resolve it
      await waitFor(() => {
        expect(result.current.activeUrl).toBe('https://primary.example.com');
      });

      expect(result.current.status).toBe('healthy');
      expect(result.current.failedUrls).toHaveLength(0);
      expect(result.current.isHealthy).toBe(true);
      expect(result.current.isFallback).toBe(false);
      expect(result.current.isDegraded).toBe(false);
      expect(result.current.errorCode).toBeNull();
    });

    it('returns status=healthy for OP Sepolia with correct chainId hex', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(rpcOkResponse(OP_SEPOLIA_HEX));

      const { result } = renderHook(() =>
        useRpcFallback({
          chainId: 11155420,
          rpcUrls: ['https://sepolia-primary.example.com'],
        }),
      );

      await waitFor(() => {
        expect(result.current.activeUrl).toBe('https://sepolia-primary.example.com');
      });

      expect(result.current.status).toBe('healthy');
    });
  });

  describe('degraded — primary fails but fallback succeeds', () => {
    it('returns status=degraded and isFallback=true when primary fails but fallback succeeds', async () => {
      // Call 1 (primary URL) → network error; Call 2 (fallback URL) → success
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(rpcOkResponse(OP_MAINNET_HEX));

      const { result } = renderHook(() =>
        useRpcFallback({
          chainId: 10,
          rpcUrls: [
            'https://primary-fails.example.com',
            'https://fallback-ok.example.com',
          ],
        }),
      );

      await waitFor(() => {
        expect(result.current.status).toBe('degraded');
      });

      expect(result.current.activeUrl).toBe('https://fallback-ok.example.com');
      expect(result.current.failedUrls).toContain('https://primary-fails.example.com');
      expect(result.current.isFallback).toBe(true);
      expect(result.current.isDegraded).toBe(true);
      // degraded still means there's a working endpoint
      expect(result.current.isHealthy).toBe(true);
    });

    it('marks endpoint failed when it returns wrong chainId and advances to fallback', async () => {
      // Call 1 → wrong chainId; Call 2 → correct chainId
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(rpcOkResponse(WRONG_HEX))
        .mockResolvedValueOnce(rpcOkResponse(OP_MAINNET_HEX));

      const { result } = renderHook(() =>
        useRpcFallback({
          chainId: 10,
          rpcUrls: [
            'https://wrong-chain.example.com',
            'https://correct-chain.example.com',
          ],
        }),
      );

      await waitFor(() => {
        expect(result.current.status).toBe('degraded');
      });

      expect(result.current.activeUrl).toBe('https://correct-chain.example.com');
      expect(result.current.failedUrls).toContain('https://wrong-chain.example.com');
    });
  });

  describe('failed — all probes fail', () => {
    it('returns status=failed when all endpoints fail with network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

      const { result } = renderHook(() =>
        useRpcFallback({
          chainId: 10,
          rpcUrls: [
            'https://broken-1.example.com',
            'https://broken-2.example.com',
          ],
        }),
      );

      await waitFor(() => {
        expect(result.current.status).toBe('failed');
      });

      expect(result.current.activeUrl).toBeNull();
      expect(result.current.failedUrls).toHaveLength(2);
      expect(result.current.isHealthy).toBe(false);
      expect(result.current.errorCode).toBe('RPC_ALL_FAILED');
    });

    it('returns failed when probe returns HTTP error status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(rpcErrorResponse);

      const { result } = renderHook(() =>
        useRpcFallback({
          chainId: 10,
          rpcUrls: ['https://http-error.example.com'],
        }),
      );

      await waitFor(() => {
        expect(result.current.status).toBe('failed');
      });
    });
  });

  describe('retry()', () => {
    it('re-probes and updates status when retry() is called', async () => {
      // Initial probe → fail; after retry → succeed
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(rpcOkResponse(OP_MAINNET_HEX));

      const { result } = renderHook(() =>
        useRpcFallback({
          chainId: 10,
          rpcUrls: ['https://rpc.example.com'],
        }),
      );

      // Wait for initial failed state
      await waitFor(() => {
        expect(result.current.status).toBe('failed');
      });

      // Call retry
      act(() => {
        result.current.retry();
      });

      // Should recover to healthy after re-probe
      await waitFor(() => {
        expect(result.current.activeUrl).toBe('https://rpc.example.com');
      });

      expect(result.current.status).toBe('healthy');
      expect(result.current.retryCount).toBe(1);
    });

    it('increments retryCount on each retry() call', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(rpcOkResponse(OP_MAINNET_HEX));

      const { result } = renderHook(() =>
        useRpcFallback({
          chainId: 10,
          rpcUrls: ['https://rpc.example.com'],
        }),
      );

      // Wait for first probe to complete
      await waitFor(() => expect(result.current.activeUrl).toBe('https://rpc.example.com'));

      act(() => result.current.retry());
      await waitFor(() => expect(result.current.retryCount).toBe(1));

      act(() => result.current.retry());
      await waitFor(() => expect(result.current.retryCount).toBe(2));
    });
  });
});
