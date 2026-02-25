import { ClaimData } from "@/app/types/dispute";
import { CheckCircle2, FileText, Shield } from "lucide-react";

export const ClaimStats = ({ data }: { data: ClaimData }) => {
  return (
    <div className="bg-[#13141b] border border-gray-800 rounded-xl p-6 mb-6">
      <h2 className="text-white font-medium mb-6">Claim Stats</h2>
      <div className="space-y-5">
        <div className="flex justify-between items-center pb-4 border-b border-gray-800/60">
          <span className="text-sm text-gray-400 flex items-center"><Shield size={16} className="mr-2" /> Total Staked</span>
          <span className="text-sm font-medium text-indigo-400">${data.totalStaked.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center pb-4 border-b border-gray-800/60">
          <span className="text-sm text-gray-400 flex items-center"><CheckCircle2 size={16} className="mr-2" /> Verifiers</span>
          <span className="text-sm font-medium text-white">{data.verifiersCount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400 flex items-center"><FileText size={16} className="mr-2" /> Category</span>
          <span className="text-xs font-medium text-white bg-gray-800 px-3 py-1 rounded-md">{data.category}</span>
        </div>
      </div>
    </div>
  );
};