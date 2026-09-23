/**
 * useApiFallback
 *
 * API projection fallback hook for TruthBounty V2.
 * Wraps a TanStack Query result and derives staleness / degraded state.
 *
 * Fail-closed: never fabricates data. If there is no data and an error,
 * exposes data as undefined rather than a stale or synthetic value.
 */

'use client';

import { useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

/** The subset of a TanStack Query result that useApiFallback requires. */
export interface QueryResultInput<TData = unknown> {
  data: TData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null | unknown;
  dataUpdatedAt: number;
  status: 'pending' | 'error' | 'success';
  /** Optional: TanStack Query v5 refetch function. */
  refetch?: () => Promise<unknown>;
}

export type ApiErrorCode =
  | 'client_error'
  | 'server_error'
  | 'network_error'
  | 'unknown';

export interface ApiFallbackOptions<TData = unknown> {
  /** The TanStack Query result to wrap. */
  queryResult: QueryResultInput<TData>;
  /**
   * Age threshold in ms after which data is considered stale.
   * Defaults to 5 minutes.
   */
  staleThresholdMs?: number;
}

export interface ApiFallbackState<TData = unknown> {
  /** The current data (may be stale). Never synthesised from thin air. */
  data: TData | undefined;
  /** True while the initial fetch is in-flight and no data is cached. */
  isLoading: boolean;
  /** True when the last query ended with an error. */
  isError: boolean;
  /** True when data is stale OR (error and stale data exists). */
  isDegraded: boolean;
  /** True when cached data is older than staleThresholdMs. */
  isStale: boolean;
  /** True when isDegraded and not loading — signal to show stale banner. */
  showStaleBanner: boolean;
  /** Ms since data was last successfully updated, or null if no data. */
  staleSinceMs: number | null;
  /** Classified error code, or null when healthy. */
  errorCode: ApiErrorCode | null;
  /** Call refetch() on the underlying query. No-op if refetch is not available. */
  retryFn: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Classify an error into a machine-readable code.
 *
 * Strategy:
 *  - Look for "5xx" digit patterns → server_error
 *  - Look for "4xx" digit patterns → client_error
 *  - Network/fetch failures (TypeError, "Failed to fetch", "NetworkError") → network_error
 *  - Anything else → unknown
 */
function classifyError(error: unknown): ApiErrorCode {
  if (error == null) return 'unknown';

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : String(error);

  const lower = message.toLowerCase();

  // Server-side HTTP errors: 500, 502, 503, 504 …
  if (/5\d{2}/.test(message)) return 'server_error';

  // Client-side HTTP errors: 400, 401, 403, 404 …
  if (/4\d{2}/.test(message)) return 'client_error';

  // Network / connectivity failures
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('fetch error') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    error instanceof TypeError
  ) {
    return 'network_error';
  }

  return 'unknown';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Derives staleness and degraded state from a TanStack Query result.
 *
 * @example
 * const claimsQuery = useQuery({ queryKey: ['claims'], queryFn: fetchClaims });
 * const { data, showStaleBanner, isDegraded, retryFn } = useApiFallback({
 *   queryResult: claimsQuery,
 * });
 */
export function useApiFallback<TData = unknown>(
  options: ApiFallbackOptions<TData>,
): ApiFallbackState<TData> {
  const { queryResult, staleThresholdMs = DEFAULT_STALE_THRESHOLD_MS } = options;

  const {
    data,
    isLoading,
    isError,
    error,
    dataUpdatedAt,
    refetch,
  } = queryResult;

  const result = useMemo<ApiFallbackState<TData>>(() => {
    const now = Date.now();
    const hasData = data !== undefined;

    // isStale: data exists but is older than the threshold
    const isStale = hasData && dataUpdatedAt > 0
      ? now - dataUpdatedAt > staleThresholdMs
      : false;

    // isDegraded: stale data, or error while we still have old data to show
    const isDegraded = isStale || (isError && hasData);

    // showStaleBanner: degraded state is actionable only when not mid-load
    const showStaleBanner = isDegraded && !isLoading;

    // staleSinceMs: age of the data in ms, null when no data
    const staleSinceMs = hasData && dataUpdatedAt > 0 ? now - dataUpdatedAt : null;

    // errorCode: only classified when there is an actual error
    const errorCode: ApiErrorCode | null = isError ? classifyError(error) : null;

    // retryFn: delegates to the underlying query's refetch, no-op if absent
    const retryFn = () => {
      if (typeof refetch === 'function') {
        void refetch();
      }
    };

    // Fail-closed: never expose fabricated data.
    // If there is no data and there is an error, surface data as undefined.
    const safeData: TData | undefined = hasData ? data : undefined;

    return {
      data: safeData,
      isLoading,
      isError,
      isDegraded,
      isStale,
      showStaleBanner,
      staleSinceMs,
      errorCode,
      retryFn,
    };
  }, [
    data,
    isLoading,
    isError,
    error,
    dataUpdatedAt,
    staleThresholdMs,
    refetch,
  ]);

  return result;
}
