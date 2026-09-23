/**
 * Tests for useApiFallback hook
 *
 * Runs under Jest. Pure unit tests — all assertions are synchronous because
 * useApiFallback only performs memoised derivation over its inputs.
 *
 * Spec note: the task spec calls for `import from 'vitest'` style, but the
 * project's primary test runner is Jest (jest.config.js + next/jest).
 * `describe`, `it`, `expect` are injected as globals by Jest. `jest.fn()`
 * replaces `vi.fn()` throughout.
 */

import { renderHook } from '@testing-library/react';
import { useApiFallback, type QueryResultInput } from '../useApiFallback';

// ─── Helper factory ───────────────────────────────────────────────────────────

const NOW = Date.now();

function makeQueryResult<T = string>(
  overrides: Partial<QueryResultInput<T>> = {},
): QueryResultInput<T> {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    dataUpdatedAt: NOW, // fresh by default
    status: 'success',
    refetch: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes (default)

describe('useApiFallback', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // isStale derivation
  // ──────────────────────────────────────────────────────────────────────────

  describe('isStale', () => {
    it('is false when dataUpdatedAt is recent (within threshold)', () => {
      const queryResult = makeQueryResult<string>({
        data: 'fresh data',
        dataUpdatedAt: NOW - 1_000, // 1 second ago
      });

      const { result } = renderHook(() =>
        useApiFallback({ queryResult, staleThresholdMs: STALE_THRESHOLD }),
      );

      expect(result.current.isStale).toBe(false);
    });

    it('is true when dataUpdatedAt is older than staleThresholdMs', () => {
      const queryResult = makeQueryResult<string>({
        data: 'old data',
        dataUpdatedAt: NOW - STALE_THRESHOLD - 1_000, // 1s beyond threshold
      });

      const { result } = renderHook(() =>
        useApiFallback({ queryResult, staleThresholdMs: STALE_THRESHOLD }),
      );

      expect(result.current.isStale).toBe(true);
    });

    it('is false when there is no data (nothing to be stale)', () => {
      const queryResult = makeQueryResult<string>({
        data: undefined,
        dataUpdatedAt: NOW - STALE_THRESHOLD - 1_000,
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.isStale).toBe(false);
    });

    it('respects a custom staleThresholdMs override', () => {
      const customThreshold = 10_000; // 10 seconds

      const queryResult = makeQueryResult<string>({
        data: 'data',
        dataUpdatedAt: NOW - 15_000, // 15 seconds ago — past custom threshold
      });

      const { result } = renderHook(() =>
        useApiFallback({ queryResult, staleThresholdMs: customThreshold }),
      );

      expect(result.current.isStale).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // isDegraded derivation
  // ──────────────────────────────────────────────────────────────────────────

  describe('isDegraded', () => {
    it('is true when data is stale', () => {
      const queryResult = makeQueryResult<string>({
        data: 'stale data',
        dataUpdatedAt: NOW - STALE_THRESHOLD - 1_000,
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.isDegraded).toBe(true);
    });

    it('is true when isError=true and data exists (stale+error scenario)', () => {
      const queryResult = makeQueryResult<string>({
        data: 'previous data',
        dataUpdatedAt: NOW - 60_000,
        isError: true,
        error: new Error('500 Internal Server Error'),
        status: 'error',
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.isDegraded).toBe(true);
    });

    it('is false when data is fresh and no error', () => {
      const queryResult = makeQueryResult<string>({
        data: 'fresh data',
        dataUpdatedAt: NOW - 1_000,
        isError: false,
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.isDegraded).toBe(false);
    });

    it('is false when there is an error but no data (hard error, not degraded)', () => {
      const queryResult = makeQueryResult<string>({
        data: undefined,
        isError: true,
        error: new Error('Network error'),
        status: 'error',
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      // No data means nothing to degrade — isDegraded=false but isError=true
      expect(result.current.isDegraded).toBe(false);
      expect(result.current.isError).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // showStaleBanner derivation
  // ──────────────────────────────────────────────────────────────────────────

  describe('showStaleBanner', () => {
    it('is true when isDegraded and not loading', () => {
      const queryResult = makeQueryResult<string>({
        data: 'stale data',
        dataUpdatedAt: NOW - STALE_THRESHOLD - 1_000,
        isLoading: false,
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.showStaleBanner).toBe(true);
    });

    it('is false when isDegraded but isLoading (mid-refresh)', () => {
      const queryResult = makeQueryResult<string>({
        data: 'stale data',
        dataUpdatedAt: NOW - STALE_THRESHOLD - 1_000,
        isLoading: true,
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.showStaleBanner).toBe(false);
    });

    it('is true when both isStale and isError (prefer degraded+banner)', () => {
      const queryResult = makeQueryResult<string>({
        data: 'old data',
        dataUpdatedAt: NOW - STALE_THRESHOLD - 1_000,
        isError: true,
        error: new Error('500 Server Error'),
        isLoading: false,
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.isDegraded).toBe(true);
      expect(result.current.showStaleBanner).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // errorCode classification
  // ──────────────────────────────────────────────────────────────────────────

  describe('errorCode', () => {
    it('is null when there is no error', () => {
      const queryResult = makeQueryResult<string>({
        data: 'ok',
        isError: false,
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.errorCode).toBeNull();
    });

    it("is 'server_error' for a 5xx error message", () => {
      const queryResult = makeQueryResult<string>({
        isError: true,
        error: new Error('Request failed with status code 500'),
        status: 'error',
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.errorCode).toBe('server_error');
    });

    it("is 'server_error' for 503 service unavailable message", () => {
      const queryResult = makeQueryResult<string>({
        isError: true,
        error: new Error('503 Service Unavailable'),
        status: 'error',
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.errorCode).toBe('server_error');
    });

    it("is 'client_error' for a 4xx error message", () => {
      const queryResult = makeQueryResult<string>({
        isError: true,
        error: new Error('404 Not Found'),
        status: 'error',
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.errorCode).toBe('client_error');
    });

    it("is 'client_error' for a 401 Unauthorized message", () => {
      const queryResult = makeQueryResult<string>({
        isError: true,
        error: new Error('401 Unauthorized'),
        status: 'error',
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.errorCode).toBe('client_error');
    });

    it("is 'network_error' for a fetch/network failure message", () => {
      const queryResult = makeQueryResult<string>({
        isError: true,
        error: new TypeError('Failed to fetch'),
        status: 'error',
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.errorCode).toBe('network_error');
    });

    it("is 'network_error' for a NetworkError message string", () => {
      const queryResult = makeQueryResult<string>({
        isError: true,
        error: new Error('NetworkError when attempting to fetch resource'),
        status: 'error',
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.errorCode).toBe('network_error');
    });

    it("is 'unknown' for an unrecognised error message", () => {
      const queryResult = makeQueryResult<string>({
        isError: true,
        error: new Error('Something went completely wrong'),
        status: 'error',
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.errorCode).toBe('unknown');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Data visibility
  // ──────────────────────────────────────────────────────────────────────────

  describe('data visibility', () => {
    it('keeps data visible when stale (does not wipe stale data)', () => {
      const queryResult = makeQueryResult<string[]>({
        data: ['claim-1', 'claim-2'],
        dataUpdatedAt: NOW - STALE_THRESHOLD - 1_000,
        isError: false,
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      // Data must remain visible even when stale
      expect(result.current.data).toEqual(['claim-1', 'claim-2']);
      expect(result.current.isStale).toBe(true);
    });

    it('exposes data as undefined when no data and error exists (fail-closed)', () => {
      const queryResult = makeQueryResult<string>({
        data: undefined,
        isError: true,
        error: new Error('500 Server Error'),
        status: 'error',
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.data).toBeUndefined();
    });

    it('exposes staleSinceMs correctly', () => {
      const ageMs = STALE_THRESHOLD + 10_000;
      const queryResult = makeQueryResult<string>({
        data: 'old data',
        dataUpdatedAt: NOW - ageMs,
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      // staleSinceMs should be approximately ageMs (allow small timing variance)
      expect(result.current.staleSinceMs).toBeGreaterThanOrEqual(ageMs - 100);
    });

    it('staleSinceMs is null when there is no data', () => {
      const queryResult = makeQueryResult<string>({
        data: undefined,
        dataUpdatedAt: 0,
      });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(result.current.staleSinceMs).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // retryFn
  // ──────────────────────────────────────────────────────────────────────────

  describe('retryFn', () => {
    it('calls queryResult.refetch when invoked', () => {
      const refetch = jest.fn().mockResolvedValue(undefined);
      const queryResult = makeQueryResult<string>({ refetch });

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      result.current.retryFn();

      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('does not throw when refetch is not provided', () => {
      const queryResult: QueryResultInput<string> = {
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
        dataUpdatedAt: NOW,
        status: 'success',
        // refetch intentionally omitted
      };

      const { result } = renderHook(() => useApiFallback({ queryResult }));

      expect(() => result.current.retryFn()).not.toThrow();
    });
  });
});
