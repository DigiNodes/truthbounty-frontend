import React from "react";
import { VerificationNodesSkeleton } from "@/components/skeletons";

export interface VerificationNode {
  name: string;
  status: "Online" | "Maintenance" | "Offline";
  uptime: string;
  location: string;
}

interface VerificationNodesProps {
  /** Node telemetry from the indexer/monitoring API. Defaults to [] — an
   *  honest empty state until real data is available (V2-FE-016: fixtures
   *  live in tests/Storybook only). */
  nodes?: VerificationNode[];
  isLoading?: boolean;
}

const VerificationNodes = ({ nodes = [], isLoading = false }: VerificationNodesProps) => {
  if (isLoading) {
    return <VerificationNodesSkeleton />;
  }

  const activeCount = nodes.filter((node) => node.status === "Online").length;

  return (
    <div className="bg-[#18181b] rounded-xl p-6 h-72 border border-[#232329] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="text-white font-semibold">Verification Nodes</div>
        <button className="text-xs text-[#5b5bf6] cursor-pointer hover:underline" aria-label="View all verification nodes" disabled={nodes.length === 0}>View All</button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <p className="text-sm text-[#a1a1aa]">No node data available yet</p>
            <p className="text-xs text-[#71717a]">
              Node telemetry will appear here once the indexer is connected.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {nodes.map((node, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#232329]/50 hover:bg-[#232329] transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-200">{node.name}</span>
                  <span className="text-xs text-gray-400">{node.location}</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${node.status === 'Online' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    <span className={`text-xs ${node.status === 'Online' ? 'text-emerald-500' : 'text-amber-500'}`}>{node.status}</span>
                  </div>
                  <span className="text-xs text-gray-400 mt-0.5">{node.uptime}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#232329] flex justify-between text-xs text-[#a1a1aa]">
        {nodes.length === 0 ? (
          <span>Awaiting indexer data</span>
        ) : (
          <>
            <span>Total Nodes: {nodes.length}</span>
            <span>Active: {activeCount}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default VerificationNodes;