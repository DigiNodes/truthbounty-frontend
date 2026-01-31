import React from "react";

const ActivityAndNodes = () => (
  <div className="bg-[#18181b] rounded-xl p-6 h-72 flex flex-col justify-between border border-[#232329]">
    <div className="text-white font-semibold mb-2">Verification Activity</div>
    {/* Chart placeholder */}
    <div className="flex-1 flex items-center justify-center">
      <span className="text-[#a1a1aa]">[Chart Placeholder]</span>
    </div>
    <div className="flex justify-between mt-4 text-xs text-[#a1a1aa]">
      <span>Verified</span>
      <span>Disputed</span>
      <span>False</span>
    </div>
  </div>
);

export default ActivityAndNodes;
