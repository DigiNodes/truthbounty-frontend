"use client"
import { useEffect, useState } from "react";

/**
 * Represents a small set of data that would normally come from the
 * backend or identity service.  For the purposes of UX prototyping we
 * either pull from `localStorage` or fall back to a randomized default.
 */
export interface TrustInfo {
  /** has the user completed an identity verification flow? */
  isVerified: boolean;
  /** 0..100 score reflecting past behaviour/reputation */
  reputation: number;
  /** age of the wallet in days (new wallets get extra scrutiny) */
  accountAgeDays: number;
  /** whether the user has been flagged by simple heuristics */
  suspicious: boolean;
}

/**
 * Hook that returns the current user's trust information.
 *
 * In a real application this would hit an API or read from a context
 * provider.  For the demo we look at `localStorage` for a JSON blob
 * keyed by "trustInfo"; if nothing is present we generate a semi-random
 * object so that slightly different values can be seen on page reload.
 */
export function useTrust(): TrustInfo {
  const [info, setInfo] = useState<TrustInfo>({
    isVerified: false,
    reputation: 0,
    accountAgeDays: 0,
    suspicious: false,
  });

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem("trustInfo");
    } catch {
      // ignore in SSR environments
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TrustInfo;
        setInfo(parsed);
        return;
      } catch {
        // fall through
      }
    }

    // generate a random but stableish value so the UI doesn't look
    // identical on every reload.  Consumers should not rely on this.
    setInfo({
      isVerified: false,
      reputation: Math.floor(Math.random() * 100),
      accountAgeDays: Math.floor(Math.random() * 30),
      suspicious: Math.random() < 0.2,
    });
  }, []);

  return info;
}

/**
 * Utility to generate a pseudo-random TrustInfo based on an address string.
 * The values are stable across rerenders for the same address but not
 * cryptographically secure – just enough for demo purposes.
 */
function makeTrustFromAddress(addr: string): TrustInfo {
  // simple hash: sum of char codes
  let sum = 0;
  for (let i = 0; i < addr.length; i++) sum += addr.charCodeAt(i);
  const reputation = sum % 101; // 0..100
  const accountAgeDays = (sum % 30) + 1;
  const isVerified = sum % 2 === 0;
  const suspicious = sum % 10 < 2;
  return { isVerified, reputation, accountAgeDays, suspicious };
}

/**
 * Hook that returns trust information for the given address.  If the
 * address is omitted it falls back to the current user.
 */
export function useTrustForAddress(address?: string): TrustInfo {
  if (!address) return useTrust();

  const [info, setInfo] = useState<TrustInfo>(() => {
    // try to read a stored override first
    try {
      const stored = window.localStorage.getItem(`trustInfo_${address}`);
      if (stored) return JSON.parse(stored) as TrustInfo;
    } catch {
      // ignore
    }
    return makeTrustFromAddress(address);
  });

  // there is no dynamic behaviour for other accounts in this mock;
  // normally we would re-fetch when address changes.
  useEffect(() => {
    // nothing for now
  }, [address]);

  return info;
}
