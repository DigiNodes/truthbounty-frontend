"use client"
import React, { useState } from "react";
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

  const trust = useTrust();
  const lowReputation = trust.reputation < 20;
  const newWallet = trust.accountAgeDays < 7;
  const lowTrust = !trust.isVerified || lowReputation || newWallet || trust.suspicious;

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
  role="dialog"
  aria-modal="true"
  aria-labelledby="claim-title"
  onKeyDown={(e) => {
    if (e.key === 'Escape') onClose();
  }}
>
  <form
    className="bg-[#18181b] p-4 sm:p-6 md:p-8 rounded-xl w-full max-w-md border border-[#232329] flex flex-col gap-4 sm:gap-4 max-h-[90vh] overflow-y-auto"
    onSubmit={handleSubmit}
  >
    <h2 id="claim-title" className="text-lg sm:text-xl font-bold text-white mb-2">
      Submit a Claim
    </h2>

    {lowTrust && (
      <div
        className="bg-yellow-500 text-black px-2 py-1 rounded mb-2 text-sm"
        role="alert"
      >
        ⚠️ Your account has a low <strong>trust score</strong>.{' '}
        <TrustScoreTooltip />
      </div>
    )}

    {/* Title */}
    <label htmlFor="title" className="sr-only">Title</label>
    <input
      id="title"
      name="title"
      className="bg-[#232329] text-white px-4 py-3 rounded-lg text-base min-h-[44px] w-full touch-manipulation"
      placeholder="Title"
      value={title}
      onChange={e => setTitle(e.target.value)}
      required
    />

    {/* Category */}
    <label htmlFor="category" className="sr-only">Category</label>
    <input
      id="category"
      name="category"
      className="bg-[#232329] text-white px-4 py-3 rounded-lg text-base min-h-[44px] w-full touch-manipulation"
      placeholder="Category"
      value={category}
      onChange={e => setCategory(e.target.value)}
      required
    />

    {/* Impact */}
    <label htmlFor="impact" className="sr-only">Impact</label>
    <input
      id="impact"
      name="impact"
      className="bg-[#232329] text-white px-4 py-3 rounded-lg text-base min-h-[44px] w-full touch-manipulation"
      placeholder="Impact (e.g. High Impact)"
      value={impact}
      onChange={e => setImpact(e.target.value)}
      required
    />

    {/* Source */}
    <label htmlFor="source" className="sr-only">Source</label>
    <input
      id="source"
      name="source"
      className="bg-[#232329] text-white px-4 py-3 rounded-lg text-base min-h-[44px] w-full touch-manipulation"
      placeholder="Source"
      value={source}
      onChange={e => setSource(e.target.value)}
      required
    />

    {/* Description */}
    <label htmlFor="description" className="sr-only">Description</label>
    <textarea
      id="description"
      name="description"
      className="bg-[#232329] text-white px-4 py-3 rounded-lg text-base min-h-[44px] w-full touch-manipulation resize-none"
      placeholder="Description"
      value={description}
      onChange={e => setDescription(e.target.value)}
      rows={4}
      required
    />

    {/* Actions */}
    <div className="flex flex-col sm:flex-row gap-3 mt-4">
      <button
        type="button"
        className="flex-1 bg-[#232329] text-white px-4 py-3 rounded-lg hover:bg-[#232329]/80 text-base font-medium min-h-[44px] touch-manipulation transition-colors"
        onClick={onClose}
        disabled={loading}
      >
        Cancel
      </button>

      <button
        type="submit"
        className="flex-1 bg-[#5b5bf6] text-white px-4 py-3 rounded-lg hover:bg-[#6c6cf7] text-base font-medium min-h-[44px] touch-manipulation transition-colors disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Submitting..." : "Submit"}
      </button>
    </div>
  </form>
</div>
  );
};

export default ClaimSubmissionForm;
