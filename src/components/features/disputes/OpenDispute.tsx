import { useState, useEffect, useRef, useCallback } from 'react';
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

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLTextAreaElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the previously focused element
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
    return () => {
      if (!isOpen) {
        previousActiveElement.current?.focus();
      }
    };
  }, [isOpen]);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      firstFocusableRef.current?.focus();
    }
  }, [isOpen]);

  // Handle escape key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  // Focus trap
  const handleFocusTrap = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (!focusableElements || focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
      role="presentation"
      onKeyDown={handleFocusTrap}
    >
      <div 
        ref={modalRef}
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#111111] p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispute-modal-title"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 id="dispute-modal-title" className="text-base sm:text-lg font-bold text-white">Open Dispute</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white p-1"
            aria-label="Close dispute modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1" htmlFor="dispute-reason">
              Reason for Dispute
            </label>
            <textarea
              ref={firstFocusableRef}
              id="dispute-reason"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2.5 sm:p-3 text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none text-base"
              rows={4}
              placeholder="Why is this claim inaccurate?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              aria-required="true"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1" htmlFor="dispute-stake">
              Stake Amount (USDC)
            </label>
            <input
              id="dispute-stake"
              type="number"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2.5 sm:p-3 text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none text-base"
              placeholder="0.00"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              min="1"
              required
              aria-required="true"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Cancel dispute"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 sm:py-2 rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              aria-label={loading ? "Submitting dispute..." : "Confirm dispute"}
            >
              {loading ? 'Submitting...' : 'Confirm Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};