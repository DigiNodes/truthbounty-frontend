import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react'; 
import { CreateDisputePayload } from '@/app/types/dispute';


interface OpenDisputeProps {
  claimId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDisputePayload) => Promise<void>;
}

export const OpenDispute = ({ claimId, isOpen, onClose, onSubmit }: OpenDisputeProps) => {
  const [reason, setReason] = useState('');
  const [stake, setStake] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ claimId, reason, initialStake: Number(stake) });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#111111] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle size={20} />
            <h2 className="text-lg font-bold text-white">Open Dispute</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Reason for Dispute</label>
            <textarea
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none"
              rows={4}
              placeholder="Why is this claim inaccurate?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Stake Amount (USDC)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none"
              placeholder="0.00"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              min="1"
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : 'Confirm Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};