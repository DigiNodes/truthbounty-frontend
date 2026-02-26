import React from "react";
import { activeClaims } from "@/data/mock-data";

const ActiveClaimsTable = () => (
  <div className="bg-[#18181b] rounded-xl p-6 border border-[#232329]">
    <div className="flex items-center justify-between mb-4">
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded bg-[#232329] text-xs text-white">All</button>
        <button className="px-3 py-1 rounded bg-transparent text-xs text-[#a1a1aa]">Verified</button>
        <button className="px-3 py-1 rounded bg-transparent text-xs text-[#a1a1aa]">Disputed</button>
        <button className="px-3 py-1 rounded bg-transparent text-xs text-[#a1a1aa]">Under Review</button>
        <button className="px-3 py-1 rounded bg-transparent text-xs text-[#a1a1aa]">High Impact</button>
      </div>
      <div className="flex gap-2">
        <input className="bg-[#232329] text-white px-2 py-1 rounded text-xs" placeholder="Search claims..." />
        <button className="px-3 py-1 rounded bg-[#232329] text-xs text-white">Filter</button>
      </div>
    </div>
    <table className="w-full text-sm text-left">
      <thead>
        <tr className="text-[#a1a1aa] border-b border-[#232329]">
          <th className="py-2">Claim</th>
          <th className="py-2">Status</th>
          <th className="py-2">Confidence</th>
          <th className="py-2">Votes / Stake</th>
          <th className="py-2">Time Left</th>
          <th className="py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {activeClaims.map((claim, idx) => (
          <tr key={idx} className="border-b border-[#232329] hover:bg-[#232329]/40">
            <td className="py-3">
              <div className="flex flex-col">
                <span className="text-xs text-[#5b5bf6] font-semibold">{claim.category} <span className="ml-2 bg-[#232329] text-[#5b5bf6] px-2 py-0.5 rounded-full text-[10px]">{claim.impact}</span></span>
                <span className="text-white font-medium leading-tight">{claim.title}</span>
                <span className="text-xs text-[#a1a1aa]">{claim.source}</span>
              </div>
            </td>
            <td className="py-3">
              <span className={claim.status === "Verified" ? "text-green-400" : claim.status === "Under Review" ? "text-yellow-400" : "text-red-400"}>{claim.status}</span>
            </td>
            <td className="py-3">{claim.confidence}</td>
            <td className="py-3">{claim.votes} <span className="text-[#a1a1aa]">/ {claim.stake}</span></td>
            <td className="py-3">{claim.time}</td>
            <td className="py-3">
              <button className="px-3 py-1 rounded bg-[#232329] text-xs text-white hover:bg-[#5b5bf6]">{claim.actions}</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default ActiveClaimsTable;
