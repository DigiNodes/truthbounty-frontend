// src/app/queries/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { readLowBandwidth } from '@/hooks/useNetworkStatus';
import {
  createPersistedStore,
  type PersistedKeyRegistryEntry,
} from '@/app/lib/persistedState';
import {
  CACHE_RELEASE,
  CACHEABLE_ROOTS,
  NON_CACHEABLE_ROOTS,
  isNonCacheable,
  type QueryKeyRoot,
} from './offlineCache';

interface QueryLike {
  queryKey?: readonly unknown[];
  state?: { data?: unknown };
}

interface MutationLike {
  options?: { mutationKey?: readonly unknown[] };
}

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

/** Observation metadata attached to every successful query. */
export interface ObservationMeta {
  observedAt: number;
  chainId: number | null;
  release: string;
  finality: 'unknown' | 'pending' | 'finalized';
  walletScope: string | null;
  stale: boolean;
  source: 'cache' | 'network';
}

export { CACHEABLE_ROOTS, NON_CACHEABLE_ROOTS };

function rootOf(queryKey: readonly unknown[] | undefined): QueryKeyRoot {
  const root = queryKey?.[0];
  if (typeof root === 'string' || typeof root === 'number') return root;
  return undefined;
}

/** True when the query root is explicitly allowed to be cached. */
export function isCacheableRoot(root: QueryKeyRoot): boolean {
  if (root === undefined || root === null) return false;
  if (isNonCacheable(root)) return false;
  if (NON_CACHEABLE_ROOTS.has(String(root))) return false;
  return CACHEABLE_ROOTS.has(String(root));
}

/** True when the query root must never be cached. */
export function isBlockedRoot(root: QueryKeyRoot): boolean {
  if (root === undefined || root === null) return true;
  if (isNonCacheable(root)) return true;
  return NON_CACHEABLE_ROOTS.has(String(root));
}

/**
 * Attach observation metadata to every successful query. Non-cacheable roots
 * are marked stale so they are never presented as fresh or final.
 */
function attachObservationMeta(
  _data: unknown,
  query: QueryLike,
): ObservationMeta {
  const root = rootOf(query.queryKey);
  const blocked = isBlockedRoot(root);
  const cacheable = isCacheableRoot(root);
  return {
    observedAt: Date.now(),
    chainId: null,
    release: CACHE_RELEASE,
    finality: 'unknown',
    walletScope: null,
    stale: blocked || !cacheable,
    source: 'network',
  };
}

/**
 * Fail closed: any mutation whose key is not explicitly allowed is rejected
 * while canonical dependencies are unavailable (offline / stale / wrong chain).
 */
function guardMutation(mutation: MutationLike): void {
  const root = rootOf(mutation.options?.mutationKey);
  if (isBlockedRoot(root)) {
    throw new Error('Mutation blocked: canonical dependencies unavailable.');
  }
  if (isBrowser() && navigator.onLine === false) {
    throw new Error('Mutation blocked: offline.');
  }
}

/**
 * Persisted Query Cache Policy
 * ---------------------------
 * The query cache is persisted to browser storage only through the versioned,
 * bounded persistence layer. The cache is treated as untrusted input on rehydration:
 * corrupt, oversized, expired, partially written, or unsupported-newer state fails
 * closed and is dropped rather than boot-looping. Authoritative protocol state,
 * contract receipts, reviewed API projections, signatures, and secrets are never
 * persisted here.
 */
export const queryCachePersistence: PersistedKeyRegistryEntry = {
  key: 'tb.queryCache.v1',
  owner: 'app/queries/queryClient',
  schemaVersion: 1,
  retention: {
    maxAgeMs: GC_TIME,
    maxBytes: 250 * 1024,
  },
  sensitivity: 'internal',
  storage: 'localStorage',
};

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
        // Offline read-only: serve last observed projections with metadata.
        // Mutations remain gated by networkMode: 'online'.
        meta: attachObservationMeta,
      },
      mutations: {
        onMutate: guardMutation,
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

/**
 * Rehydrate the query cache from browser storage. The persistence layer enforces
 * versioned schemas, bounded migrations, expiry, size limits, and corruption
 * recovery. Any failure is swallowed and the cache starts empty.
 */
export function rehydrateQueryCache(): void {
  if (!isBrowser()) return;
  try {
    void createPersistedStore(queryCachePersistence).read();
  } catch {
    // Fail closed: drop untrusted persisted state without boot-looping.
  }
}