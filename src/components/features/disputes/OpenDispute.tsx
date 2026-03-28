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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#111111] p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle size={18} sm:size={20} />
            <h2 className="text-base sm:text-lg font-bold text-white">Open Dispute</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X size={18} sm:size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Reason for Dispute</label>
            <textarea
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2.5 sm:p-3 text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none text-base"
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
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2.5 sm:p-3 text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none text-base"
              placeholder="0.00"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              min="1"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 sm:py-2 rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : 'Confirm Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};