"use client"
import { useState } from "react";
import { useAccount } from "@/hooks/useAccount";
import { useUserVerification } from "@/app/queries/user.queries";

/**
 * Represents a small set of trust data.  In production this should all
 * come from the backend; for now only `isVerified` is fetched from the
 * API (Worldcoin verification status) while the remaining fields use
 * randomized demo values.
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
  const account = useAccount();
  const effectiveAddress = address || account?.address || "";
  const { data: verification } = useUserVerification(effectiveAddress);

  // Stable randomised demo values – these should be replaced by API
  // calls once backend endpoints for reputation/account-age exist.
  const [mock] = useState(() => ({
    reputation: Math.floor(Math.random() * 100),
    accountAgeDays: Math.floor(Math.random() * 30),
    suspicious: Math.random() < 0.2,
  }));

  const base = address ? makeTrustFromAddress(address) : mock;

  return {
    ...base,
    isVerified: verification?.status === "SUCCESS",
  };
}

/**
 * Hook that returns the current user's trust information.
 *
 * `isVerified` is fetched from the backend / chain and is NOT read from
 * localStorage.  The remaining fields are mock/demo values.
 */
export function useTrust(): TrustInfo {
  return useTrustForAddress(undefined);
}
