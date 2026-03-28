import React from "react";

/**
 * Simple tooltip component that explains what a trust score is.  It uses
 * Tailwind utility classes and a `group` selector to show on hover and focus.
 */
export default function TrustScoreTooltip() {
  return (
    <span className="relative inline-block group">
      <button 
        className="ml-1 text-xs font-semibold text-blue-400 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
        aria-describedby="trust-tooltip"
      >
        (what is this?)
      </button>
      <div 
        id="trust-tooltip"
        role="tooltip"
        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 hidden group-hover:block group-focus-within:block z-50"
      >
        <div className="bg-[#18181b] text-white text-xs p-2 rounded shadow-lg">
          <strong>Trust score</strong> is an estimate of how likely an
          account is to behave honestly on the network. It considers identity
          verification, past reputation, wallet age, and any suspicious
          patterns. Higher is better; low scores trigger warnings.
        </div>
      </div>
    </span>
  );
}
