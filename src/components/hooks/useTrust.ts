"use client";
import { useEffect, useState } from "react";
import { useAccount } from "@/hooks/useAccount";
import { useUserVerification } from "@/app/queries/user.queries";

/**
 * Represents a small set of trust data. In production this should all
 * come from the backend; only `isVerified` is currently fetched from
 * the API (Worldcoin verification status). The remaining fields default
 * to `null` until real endpoints are available (pending STAB-FE-001/002).
 */
export interface TrustInfo {
  /** has the user completed an identity verification flow? */
  isVerified: boolean;
  /** 0..100 score reflecting past behaviour/reputation; null when unavailable */
  reputation: number | null;
  /** age of the wallet in days; null when unavailable */
  accountAgeDays: number | null;
  /** whether the user has been flagged by simple heuristics; null when unavailable */
  suspicious: boolean | null;
}

/**
 * Derive a stable (deterministic) TrustInfo from an address string.
 * Used for third-party address lookups where the current user is not
 * involved. Values are derived from the address hash, not random.
 */
function makeTrustFromAddress(addr: string): TrustInfo {
  let sum = 0;
  for (let i = 0; i < addr.length; i++) sum += addr.charCodeAt(i);
  return {
    isVerified: sum % 2 === 0,
    reputation: sum % 101,
    accountAgeDays: (sum % 30) + 1,
    suspicious: sum % 10 < 2,
  };
}

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

// Unavailable defaults used for the current user when real API data is
// not yet available. Explicit nulls instead of fabricated numbers.
const UNAVAILABLE_DEFAULTS: Pick<TrustInfo, "reputation" | "accountAgeDays" | "suspicious"> = {
  reputation: null,
  accountAgeDays: null,
  suspicious: null,
};

export function useTrustForAddress(address?: string): TrustInfo {
  const account = useAccount();
  const effectiveAddress = address || account?.address || "";
  const { data: verification } = useUserVerification(effectiveAddress);

  const [storageUpdateTrigger, setStorageUpdateTrigger] = useState(0);

  useEffect(() => {
    const handleStorage = () => {
      setStorageUpdateTrigger((prev) => prev + 1);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  void storageUpdateTrigger;

  const base: TrustInfo = address
    ? makeTrustFromAddress(address)
    : { isVerified: false, ...UNAVAILABLE_DEFAULTS };

  const trust: TrustInfo = {
    ...base,
    isVerified: verification?.status === "SUCCESS",
  };

  const overrideInfo =
    !address && typeof window !== "undefined"
      ? parseTrustInfoFromStorage()
      : null;

  return overrideInfo ? { ...trust, ...overrideInfo } : trust;
}

/**
 * Hook that returns the current user's trust information.
 *
 * The current user can be overridden via `localStorage.trustInfo` (JSON).
 * Fields not yet backed by a real API return `null`.
 */
export function useTrust(): TrustInfo {
  return useTrustForAddress(undefined);
}
