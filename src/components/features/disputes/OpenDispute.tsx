'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useDisputeSubmission } from '@/hooks/useDisputeSubmission';
import {
  MIN_CHALLENGE_REASON_LENGTH,
  formatTokenAmount,
  normalizeChallengeReason,
} from '@/lib/dispute/encoding';
import type { DisputeSubmissionPhase } from '@/app/types/dispute';

interface OpenDisputeProps {
  claimId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (transactionHash: string) => void;
  onError?: (error: string) => void;
}

const BUSY_PHASES: DisputeSubmissionPhase[] = [
  'validating',
  'allowance',
  'approving',
  'simulating',
  'confirming',
  'reconciling',
];

function submitLabel(phase: DisputeSubmissionPhase): string {
  switch (phase) {
    case 'validating':
      return 'Validating…';
    case 'allowance':
      return 'Checking allowance…';
    case 'approving':
      return 'Approving bond…';
    case 'simulating':
      return 'Simulating…';
    case 'confirming':
      return 'Confirm in wallet…';
    case 'reconciling':
      return 'Confirming on-chain…';
    default:
      return 'Confirm Challenge';
  }
}

export const OpenDispute = ({
  claimId,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: OpenDisputeProps) => {
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLTextAreaElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const {
    artifact,
    phase,
    error,
    challengeWindow,
    balance,
    lastTxHash,
    isLoading,
    isWrongNetwork,
    submitDispute,
  } = useDisputeSubmission({ claimId, isOpen, enabled: isOpen, pollInterval: isOpen ? 15_000 : 0 });

  useEffect(() => {
    if (isOpen) setFormError(null);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
    return () => {
      if (!isOpen) previousActiveElement.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) firstFocusableRef.current?.focus();
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  const handleFocusTrap = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
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
    } else if (document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, []);

  const isBusy = BUSY_PHASES.includes(phase);
  const isConfirmed = phase === 'confirmed';
  const normalizedReason = normalizeChallengeReason(reason);
  const reasonValid = normalizedReason.length >= MIN_CHALLENGE_REASON_LENGTH;

  // Eligibility copy derived only from canonical on-chain / artifact state.
  const ineligibility = useMemo(() => {
    if (!artifact.isDeployed) {
      return (
        artifact.disabledReasons[0] ??
        'The challenge protocol is not available for this chain.'
      );
    }
    if (isWrongNetwork) {
      return 'Your wallet is on an unsupported network. Switch to Optimism to continue.';
    }
    if (!challengeWindow) return null;
    if (challengeWindow.hasOpenChallenge) {
      return 'A challenge has already been opened for this claim.';
    }
    if (!challengeWindow.isOpen) {
      return 'The challenge window has closed for this claim.';
    }
    return null;
  }, [artifact, isWrongNetwork, challengeWindow]);

  const canSubmit =
    !isBusy &&
    !isConfirmed &&
    !ineligibility &&
    Boolean(challengeWindow) &&
    reasonValid;

  const displayError = formError ?? error?.message ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setFormError(null);

    try {
      const outcome = await submitDispute({ reason });

      if (outcome.phase === 'confirmed') {
        setReason('');
        onSuccess?.(outcome.transactionHash);
        return;
      }

      const message =
        outcome.phase === 'rejected'
          ? 'The challenge transaction was reverted on-chain. No bond was locked.'
          : outcome.phase === 'mismatch'
            ? 'The confirmed receipt does not match the on-chain challenge state.'
            : 'The challenge receipt is confirmed but not yet visible on-chain.';
      setFormError(message);
      onError?.(message);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to open the challenge.';
      setFormError(message);
      onError?.(message);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 modal-shell bg-black/80 backdrop-blur-sm"
      role="presentation"
      onKeyDown={handleFocusTrap}
    >
      <div
        ref={modalRef}
        className="modal-panel border border-zinc-800 bg-[#111111] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispute-modal-title"
        aria-describedby="dispute-modal-desc"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2
              id="dispute-modal-title"
              className="text-base sm:text-lg font-bold text-white"
            >
              Open Challenge
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1"
            aria-label="Close challenge modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p id="dispute-modal-desc" className="text-sm text-zinc-400 mb-4">
          Challenging locks the required bond in the escrow contract. If the
          challenge is upheld the bond is refunded; if it is rejected the bond may
          be slashed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {displayError && (
            <div
              className="rounded-lg bg-red-950/30 border border-red-900/50 p-3 text-sm text-red-300"
              role="alert"
            >
              {displayError}
            </div>
          )}

          {isConfirmed && lastTxHash && (
            <div
              className="rounded-lg bg-green-950/30 border border-green-900/50 p-3 text-sm text-green-300"
              role="status"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>Challenge submitted and confirmed on-chain.</span>
              </div>
              <div className="mt-1 font-mono text-xs break-all text-green-200/80">
                {lastTxHash}
              </div>
            </div>
          )}

          {isBusy && (
            <div
              className="flex items-center gap-2 text-zinc-400 text-sm"
              role="status"
              aria-live="polite"
            >
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              <span>{submitLabel(phase)}</span>
            </div>
          )}

          {isLoading && !challengeWindow && (
            <div
              className="flex items-center gap-2 text-zinc-400 text-sm"
              role="status"
              aria-live="polite"
            >
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              <span>Loading challenge terms…</span>
            </div>
          )}

          {ineligibility && (
            <div
              className="rounded-lg bg-yellow-950/30 border border-yellow-900/50 p-3 text-sm text-yellow-300"
              role="alert"
            >
              {ineligibility}
            </div>
          )}

          {challengeWindow && (
            <div className="rounded-lg bg-zinc-900/50 border border-zinc-700 p-3">
              <div className="text-sm text-zinc-400 mb-1">Required Challenge Bond</div>
              <div className="text-lg font-bold text-white">
                {formatTokenAmount(challengeWindow.bond)} tokens
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Your balance: {formatTokenAmount(balance ?? 0n)} tokens
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Challenge deadline:{' '}
                {new Date(Number(challengeWindow.deadline) * 1000).toLocaleString()}
              </div>
            </div>
          )}

          <div>
            <label
              className="block text-sm font-medium text-zinc-400 mb-1"
              htmlFor="dispute-reason"
            >
              Reason for Challenge *
            </label>
            <textarea
              ref={firstFocusableRef}
              id="dispute-reason"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2.5 sm:p-3 text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none text-base"
              rows={4}
              placeholder={`Explain why the verification is incorrect (minimum ${MIN_CHALLENGE_REASON_LENGTH} characters)`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={MIN_CHALLENGE_REASON_LENGTH}
              disabled={isBusy || isConfirmed || Boolean(ineligibility)}
              aria-required="true"
              aria-invalid={reason.length > 0 && !reasonValid}
              aria-describedby="reason-help"
            />
            <div id="reason-help" className="text-xs text-zinc-500 mt-1">
              Provide a clear explanation for challenging this claim.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              aria-label="Cancel challenge"
            >
              {isConfirmed ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2.5 sm:py-2 rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              aria-label={isBusy ? submitLabel(phase) : 'Confirm challenge'}
            >
              {isBusy && (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              )}
              {isConfirmed ? 'Challenge Opened' : submitLabel(phase)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
