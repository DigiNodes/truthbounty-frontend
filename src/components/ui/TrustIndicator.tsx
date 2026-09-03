import React from "react";
import { useTrust } from "@/components/hooks/useTrust";

/**
 * Small inline indicator showing the current user's trust score as a
 * colored circle and number.  Clicking it opens the explanation modal.
 */
export default function TrustIndicator() {
  const { reputation } = useTrust();
  // reputation is null until the backend/indexer provides it — show
  // “unknown” instead of fabricating a score (V2-FE-016).
  const color =
    reputation === null
      ? "bg-gray-400"
      : reputation > 60
        ? "bg-green-400"
        : reputation > 30
          ? "bg-yellow-400"
          : "bg-red-400";
  const label = reputation === null ? "—" : reputation;

  return (
    <div className="flex items-center space-x-1" aria-label={`Trust score: ${label}`}>
      <div className={`${color} w-3 h-3 rounded-full`} aria-hidden="true" />
      <span className="text-xs text-[#a1a1aa]">trust: {label}</span>
    </div>
  );
}
