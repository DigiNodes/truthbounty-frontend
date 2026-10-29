/**
 * Offline cache policy.
 *
 * Only public, documentation, legal and previously viewed projection data may
 * be cached. Everything else — auth, wallet, evidence, user content, receipts
 * and mutations — is treated as non-cacheable and fails closed.
 *
 * The release marker is attached to every observation so a cache written by a
 * different release can be discarded instead of being replayed.
 */

/** Cache-schema release marker attached to every observation. */
export const CACHE_RELEASE = 'tb.queryCache.v1';

/** Query-key root types that the cache policy understands. */
export type QueryKeyRoot = string | number | null | undefined;

/**
 * Cache allow-list. Only public, documentation, legal, and previously viewed
 * projection data may be cached. Everything else (mutations, auth, wallet,
 * evidence, user content) is treated as non-cacheable and fails closed.
 */
export const CACHEABLE_ROOTS: ReadonlySet<string> = new Set([
  'public',
  'docs',
  'documentation',
  'legal',
  'projection',
  'projections',
  'viewed',
  'history',
]);

/** Roots that must never be cached or served from cache. */
export const NON_CACHEABLE_ROOTS: ReadonlySet<string> = new Set([
  'auth',
  'authorization',
  'session',
  'wallet',
  'account',
  'mutation',
  'mutations',
  'evidence',
  'user',
  'userContent',
  'receipt',
  'receipts',
]);

/**
 * True when the query root must never be cached or served from cache.
 *
 * A root that is not explicitly allow-listed is non-cacheable, so the policy
 * fails closed for any root that is added later without an explicit decision.
 */
export function isNonCacheable(root: QueryKeyRoot): boolean {
  if (root === undefined || root === null) return true;
  const key = String(root);
  if (NON_CACHEABLE_ROOTS.has(key)) return true;
  return !CACHEABLE_ROOTS.has(key);
}
