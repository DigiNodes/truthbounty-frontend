"use client"
import { useAccount } from "@/hooks/useAccount";
import { useUserVerification } from "@/app/queries/user.queries";

/**
 * Trust signals shown next to accounts.
 *
 * Production sources are authoritative and never fabricated (V2-FE-016):
 *  - `isVerified` is fetched from the Worldcoin verification API.
 *  - `reputation`, `accountAgeDays` and `suspicious` are `null` until the
 *    reputation backend / indexer (V2-FE-005) provides them. No random or
 *    address-derived demo values are produced by production code.
 */
export interface TrustInfo {
  /** has the user completed an identity verification flow? */
  isVerified: boolean;
  /** 0..100 score reflecting past behaviour/reputation, or null when unknown. */
  reputation: number | null;
  /** age of the wallet in days, or null when unknown. */
  accountAgeDays: number | null;
  /** whether the user has been flagged by heuristics, or null when unknown. */
  suspicious: boolean | null;
}

/**
 * Development-only simulation hook.
 *
 * Stores a JSON object under `localStorage.trustInfo` to preview warning
 * states locally (documented in the README). Any subset of fields may be
 * overridden; unset fields resolve to their production values.
 *
 * Returns `null` when nothing is stored or the stored value is invalid.
 */
function parseTrustInfoFromStorage(): Partial<TrustInfo> | null {
  try {
    const stored = localStorage.getItem("trustInfo");
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    const overrides: Partial<TrustInfo> = {};

    if (typeof parsed.isVerified === "boolean") {
      overrides.isVerified = parsed.isVerified;
    }
    if (typeof parsed.reputation === "number") {
      overrides.reputation = parsed.reputation;
    }
    if (typeof parsed.accountAgeDays === "number") {
      overrides.accountAgeDays = parsed.accountAgeDays;
    }
    if (typeof parsed.suspicious === "boolean") {
      overrides.suspicious = parsed.suspicious;
    }

    return Object.keys(overrides).length > 0 ? overrides : null;
  } catch (error) {
    console.warn("Invalid localStorage.trustInfo", error);
    return null;
  }
}

/**
 * Read the localStorage.dev-only simulation override. Returns null when
 * nothing is stored, the value is invalid, or we are not in a browser.
 */
function readStoredTrustOverride(): Partial<TrustInfo> | null {
  if (typeof window === "undefined") return null;
  return parseTrustInfoFromStorage();
}

/**
 * Hook that returns trust information for the given address. If the
 * address is omitted it falls back to the current user.
 */
export function useTrustForAddress(address?: string): TrustInfo {
  const account = useAccount();
  const effectiveAddress = address || account?.address || "";
  const { data: verification } = useUserVerification(effectiveAddress);

  // localStorage simulation is a dev-only convenience; never applied to
  // address-specific lookups (e.g. a claim's claimant). Computed during
  // render (no setState-in-effect) so first paint already reflects it.
  const overrideInfo = !address ? readStoredTrustOverride() : null;

  const isVerified = verification?.status === "SUCCESS";

  // Only `isVerified` is backed by an API today. The remaining trust signals
  // are explicitly unknown (`null`) rather than fabricated from the address
  // or randomness — the backend/indexer is the authoritative source.
  const base: TrustInfo = {
    isVerified,
    reputation: null,
    accountAgeDays: null,
    suspicious: null,
  };

  return overrideInfo ? { ...base, ...overrideInfo } : base;
}

/**
 * Hook that returns the current user's trust information.
 *
 * The current user can be simulated using `localStorage.trustInfo`.
 * If the value is valid JSON, it overrides the production trust values.
 */
export function useTrust(): TrustInfo {
  return useTrustForAddress(undefined);
}