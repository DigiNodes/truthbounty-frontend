// src/app/queries/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { readLowBandwidth } from '@/hooks/useNetworkStatus';

const BASE_STALE_TIME = 1000 * 60 * 5; // 5 mins
const LOW_BANDWIDTH_STALE_TIME = 1000 * 60 * 15; // 15 mins when data-saver/slow
const GC_TIME = 1000 * 60 * 30; // 30 mins
const MAX_RETRY = 2;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

/** Skip futile retries while the browser reports offline. */
function shouldRetry(failureCount: number): boolean {
  if (isBrowser() && navigator.onLine === false) return false;
  return failureCount < MAX_RETRY;
}

/** Exponential backoff capped at 30s — kinder on constrained links. */
function retryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30_000);
}

/**
 * Resolve stale time deterministically for the server shell.
 *
 * The server must not read browser-only hints (e.g. navigator.connection)
 * because that would produce different output from the client and break
 * hydration. The client applies the lowBandwidth override after mount via
 * `syncLowBandwidthStaleTime`.
 */
export function resolveStaleTime(): number {
  return BASE_STALE_TIME;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: resolveStaleTime(),
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        networkMode: 'online',
        retry: shouldRetry,
        retryDelay,
      },
      mutations: {
        onError: (error) => {
          // Fail closed and keep the console clean in production.
          if (process.env.NODE_ENV !== 'production') {
            console.error('Mutation error:', error);
          }
        },
        networkMode: 'online',
      },
    },
  });
}

/**
 * Browser-side only override. Call after hydration from a client effect
 * (e.g. in a top-level client component) to apply the low-bandwidth
 * stale time without causing a server/client mismatch.
 */
export function syncLowBandwidthStaleTime(client: QueryClient): void {
  if (!isBrowser()) return;
  if (!readLowBandwidth()) return;
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, staleTime: LOW_BANDWIDTH_STALE_TIME },
  });
}

export const queryClient = createQueryClient();
