"use client"
import React, { useState } from "react";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onSubmit({ title, category, impact, source, description });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <form
        className="bg-[#18181b] p-8 rounded-xl w-full max-w-md border border-[#232329] flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-bold text-white mb-2">Submit a Claim</h2>
        <input
          className="bg-[#232329] text-white px-3 py-2 rounded"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
        <input
          className="bg-[#232329] text-white px-3 py-2 rounded"
          placeholder="Category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          required
        />
        <input
          className="bg-[#232329] text-white px-3 py-2 rounded"
          placeholder="Impact (e.g. High Impact)"
          value={impact}
          onChange={e => setImpact(e.target.value)}
          required
        />
        <input
          className="bg-[#232329] text-white px-3 py-2 rounded"
          placeholder="Source"
          value={source}
          onChange={e => setSource(e.target.value)}
          required
        />
        <textarea
          className="bg-[#232329] text-white px-3 py-2 rounded"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          required
        />
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            className="flex-1 bg-[#232329] text-white px-4 py-2 rounded hover:bg-[#232329]/80"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#5b5bf6] text-white px-4 py-2 rounded hover:bg-[#6c6cf7]"
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
