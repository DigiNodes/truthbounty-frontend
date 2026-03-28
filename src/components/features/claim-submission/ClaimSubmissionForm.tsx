"use client"
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTrust } from "@/components/hooks/useTrust";
import TrustScoreTooltip from "@/components/ui/TrustScoreTooltip";

export interface ClaimFormData {
  title: string;
  category: string;
  impact: string;
  source: string;
  description: string;
}

interface ClaimFormProps {
  onSubmit: (data: ClaimFormData) => void;
  onClose: () => void;
}

const ClaimSubmissionForm: React.FC<ClaimFormProps> = ({ onSubmit, onClose }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [impact, setImpact] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLInputElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const trust = useTrust();
  const lowReputation = trust.reputation < 20;
  const newWallet = trust.accountAgeDays < 7;
  const lowTrust = !trust.isVerified || lowReputation || newWallet || trust.suspicious;

  // Store the previously focused element
  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    return () => {
      // Restore focus when modal closes
      previousActiveElement.current?.focus();
    };
  }, []);

  // Focus first input when modal opens
  useEffect(() => {
    firstFocusableRef.current?.focus();
  }, []);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onSubmit({ title, category, impact, source, description });
    setLoading(false);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 sm:p-6"
      role="presentation"
      onKeyDown={handleFocusTrap}
    >
      <form
        ref={modalRef}
        className="bg-[#18181b] p-4 sm:p-6 md:p-8 rounded-xl w-full max-w-md border border-[#232329] flex flex-col gap-3 sm:gap-4 max-h-[90vh] overflow-y-auto"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-form-title"
        onKeyDown={handleKeyDown}
      >
        <h2 id="claim-form-title" className="text-lg sm:text-xl font-bold text-white mb-2">Submit a Claim</h2>
        {lowTrust && (
          <div className="bg-yellow-500 text-black px-2 py-1 rounded mb-2 text-sm" role="alert">
            ⚠️ Your account has a low <strong>trust score</strong>.{' '}
            <TrustScoreTooltip />
          </div>
        )}
        <div>
          <label className="sr-only" htmlFor="claim-title">Title</label>
          <input
            ref={firstFocusableRef}
            id="claim-title"
            className="bg-[#232329] text-white px-3 py-2.5 sm:py-2 rounded text-base w-full"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="claim-category">Category</label>
          <input
            id="claim-category"
            className="bg-[#232329] text-white px-3 py-2.5 sm:py-2 rounded text-base w-full"
            placeholder="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="claim-impact">Impact</label>
          <input
            id="claim-impact"
            className="bg-[#232329] text-white px-3 py-2.5 sm:py-2 rounded text-base w-full"
            placeholder="Impact (e.g. High Impact)"
            value={impact}
            onChange={e => setImpact(e.target.value)}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="claim-source">Source</label>
          <input
            id="claim-source"
            className="bg-[#232329] text-white px-3 py-2.5 sm:py-2 rounded text-base w-full"
            placeholder="Source"
            value={source}
            onChange={e => setSource(e.target.value)}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="claim-description">Description</label>
          <textarea
            id="claim-description"
            className="bg-[#232329] text-white px-3 py-2.5 sm:py-2 rounded text-base w-full"
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            required
            aria-required="true"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <button
            type="button"
            className="flex-1 bg-[#232329] text-white px-4 py-2.5 sm:py-2 rounded hover:bg-[#232329]/80 text-base font-medium"
            onClick={onClose}
            disabled={loading}
            aria-label="Cancel claim submission"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#5b5bf6] text-white px-4 py-2.5 sm:py-2 rounded hover:bg-[#6c6cf7] text-base font-medium"
            disabled={loading}
            aria-label={loading ? "Submitting claim..." : "Submit claim"}
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClaimSubmissionForm;
