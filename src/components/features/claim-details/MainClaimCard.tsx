import { ClaimData } from "@/app/types/dispute";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useState } from "react";
import { Dispute } from "@/app/types/dispute";
import { OpenDispute } from "../disputes/OpenDispute";
import { DisputeVoting } from "../disputes/DisputeVoting";

export const MainClaimCard = ({ data }: { data: ClaimData }) => {
  const totalVotes = data.votesFor + data.votesAgainst;
  const forPercentage = (data.votesFor / totalVotes) * 100;
  const againstPercentage = (data.votesAgainst / totalVotes) * 100;
  const [dispute, setDispute] = useState<Dispute | null>(null);

  const [isDisputeModalOpen, setDisputeModalOpen] = useState(false);

  const handleOpenDispute = async (payload: any) => {
    console.log("Opening dispute:", payload);

    setDispute({
      id: "dsp_1",
      claimId: "claim_123",
      reason: payload.reason,
      status: "VOTING",
      proVotes: 0,
      conVotes: 0,
      totalStaked: payload.initialStake,
      createdAt: new Date().toISOString(),
    });
  };

  const handleVote = async (id: string, side: string, amount: number) => {
    console.log(`Voting ${side} with ${amount}`);
  };

  return (
    <div className="bg-[#13141b] border border-gray-800 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3 text-sm">
          <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-md">
            {data.category}
          </span>
          <span className="text-gray-500">{data.hash}</span>
        </div>
        <div className="flex items-center space-x-2 text-green-600 bg-green-600/10 px-3 py-1 rounded-md text-sm border border-green-600/20">
          <CheckCircle2 size={16} />
          <span>{data.status}</span>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-3">{data.title}</h1>

      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-8">
        <a
          href="#"
          className="flex items-center hover:text-gray-200 transition-colors"
        >
          {data.source} <ExternalLink size={14} className="ml-1" />
        </a>
        <span className="flex items-center">
          <Clock size={14} className="mr-1" /> {data.timeAgo}
        </span>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-white text-sm font-medium mb-3">
            Verification Breakdown
          </h3>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-green-600 flex items-center">
              <ThumbsUp size={14} className="mr-1" /> For:{" "}
              {data.votesFor.toLocaleString()}
            </span>
            <span className="text-red-500 flex items-center">
              Against: {data.votesAgainst}{" "}
              <ThumbsDown size={14} className="ml-1" />
            </span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden mb-2">
            <div
              style={{ width: `${forPercentage}%` }}
              className="bg-green-600"
            ></div>
            <div
              style={{ width: `${againstPercentage}%` }}
              className="bg-red-500"
            ></div>
          </div>
          <p className="text-xs text-gray-500">
            Weighted by reputation · {data.verifiersCount} verifiers
            participated
          </p>
        </div>

        <div>
          <h3 className="text-white text-sm font-medium mb-3">
            Confidence Score
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex-1 h-2.5 rounded-full bg-gray-800 overflow-hidden">
              <div
                style={{ width: `${data.confidenceScore}%` }}
                className="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-400"
              ></div>
            </div>
            <span className="text-green-600 font-bold text-xl">
              {data.confidenceScore}%
            </span>
          </div>
        </div>

        <div className="flex space-x-4 pt-4">
          {!dispute && (
            <button className="flex-1 bg-green-600 hover:bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center transition-colors">
              <ThumbsUp size={18} className="mr-2" /> Verify (Stake + Vote)
            </button>
          )}

          <button
            className="flex-1 border border-red-900 text-red-500 hover:bg-red-950/30 py-3 rounded-lg font-medium flex items-center justify-center transition-colors"
            onClick={() => setDisputeModalOpen(true)}
          >
            <Shield size={18} className="mr-2" /> Dispute
          </button>
        </div>
      </div>

      {dispute && (
        <DisputeVoting
          disputeId={dispute.id}
          currentStaked={dispute.totalStaked}
          onVote={handleVote}
        />
      )}

      <OpenDispute
        claimId="claim_123"
        isOpen={isDisputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        onSubmit={handleOpenDispute}
      />
    </div>
  );
};
