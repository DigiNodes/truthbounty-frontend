import React from "react";
import { useTrust } from "@/components/hooks/useTrust";

/**
 * Small inline indicator showing the current user's trust score as a
 * colored circle and number.  Clicking it opens the explanation modal.
 */
export default function TrustIndicator() {
  const { reputation } = useTrust();
  const color = reputation > 60 ? "bg-green-400" : reputation > 30 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="flex items-center space-x-1">
      <div className={`${color} w-3 h-3 rounded-full`} />
      <span className="text-xs text-[#a1a1aa]">trust: {reputation}</span>
    </div>
  );
}
