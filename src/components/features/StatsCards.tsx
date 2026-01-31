import React from "react";

const stats = [
  { label: "Claims", value: "12,847" },
  { label: "Verifications", value: "9,234" },
  { label: "Votes Cast", value: "847,291" },
  { label: "Unique Verifiers", value: "4,128" },
  { label: "TVL", value: "$2.4M" },
  { label: "Chains", value: "7" },
];

const StatsCards = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
    {stats.map((stat) => (
      <div
        key={stat.label}
        className="bg-[#18181b] rounded-xl p-6 flex flex-col items-center justify-center border border-[#232329]"
      >
        <div className="text-2xl font-bold text-white">{stat.value}</div>
        <div className="text-xs text-[#a1a1aa] mt-1">{stat.label}</div>
      </div>
    ))}
  </div>
);

export default StatsCards;
