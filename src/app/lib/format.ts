/**
 * TruthBounty Protocol V2 — UI Formatting Utilities“
 *
 * Re-exports the canonical formatting engine from `@/lib/format`.
 * Retained for backwards-compatibility across the app directory.
 *
 * Hydration and caching guarantees (ISSUE-UI-085):
 * - No formatting helper in this module may depend on ambient client state
 *   (`Date.now()`, `Math.random()`, `locale`, `timeZone`, or wallet authorization)
 *   at module evaluation time. All non-deterministic inputs must be passed
 *   explicitly by the caller or deferred to a client-only effect.
 * - Formatters that produce personalized or privileged output must not be
 *   used in shared/public cache keys. This module re-exports only the
 *   deterministic, cache-safe surface from `@/lib/format`.
 */

export * from "@/lib/format";

// Compile-time guard: this module must remain a pure re-export boundary.
// Any addition of client-only or wallet-dependent logic here would break
// the hydration contract for every route that imports it.
export const __FORMAT_BOUNDARY_DURATION = "server-shell" as const;
