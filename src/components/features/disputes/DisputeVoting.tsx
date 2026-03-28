import { useState } from 'react';

interface DisputeVotingProps {
  disputeId: string;
  currentStaked: number;
  onVote: (disputeId: string, side: 'PRO' | 'CON', amount: number) => Promise<void>;
}

export const DisputeVoting = ({ disputeId, currentStaked, onVote }: DisputeVotingProps) => {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleVote = async (side: 'PRO' | 'CON') => {
    if (!amount) return;
    setLoading(true);
    await onVote(disputeId, side, Number(amount));
    setLoading(false);
    setAmount('');
  };

  return (
    <div className="rounded-xl border border-red-900/50 bg-red-950/10 p-4 sm:p-5 mt-4 sm:mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
        <h3 className="text-white font-bold flex items-center gap-2 text-sm sm:text-base">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          Active Dispute Voting
        </h3>
        <span className="text-xs sm:text-sm text-red-400 font-mono">${currentStaked.toLocaleString()} Staked</span>
      </div>

      <div className="mb-3 sm:mb-4">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter stake amount"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 sm:p-3 text-white focus:border-red-500 outline-none text-base"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <button
          onClick={() => handleVote('PRO')}
          disabled={loading || !amount}
          className="py-2.5 sm:py-2.5 rounded-lg bg-green-900/30 border border-green-800 text-green-400 hover:bg-green-900/50 font-bold transition-all text-sm sm:text-base"
        >
          Vote Valid
        </button>
        <button
          onClick={() => handleVote('CON')}
          disabled={loading || !amount}
          className="py-2.5 sm:py-2.5 rounded-lg bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50 font-bold transition-all text-sm sm:text-base"
        >
          Vote Invalid
        </button>
      </div>
    </div>
  );
};