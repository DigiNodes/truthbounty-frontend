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

interface FormErrors {
  title?: string;
  category?: string;
  impact?: string;
  source?: string;
  description?: string;
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
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{[key: string]: boolean}>({});

  const trust = useTrust();
  const lowReputation = trust.reputation < 20;
  const newWallet = trust.accountAgeDays < 7;
  const lowTrust = !trust.isVerified || lowReputation || newWallet || trust.suspicious;

  const validateField = (name: string, value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    }
    if (name === 'title' && value.length < 3) {
      return 'Title must be at least 3 characters long';
    }
    if (name === 'description' && value.length < 10) {
      return 'Description must be at least 10 characters long';
    }
    if (name === 'source' && !value.match(/^https?://.+/)) {
      return 'Please enter a valid URL starting with http:// or https://';
    }
    return undefined;
  };

  const handleFieldChange = (name: string, value: string) => {
    const setter = {
      title: setTitle,
      category: setCategory,
      impact: setImpact,
      source: setSource,
      description: setDescription
    }[name];
    
    if (setter) {
      setter(value);
      
      if (touched[name]) {
        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
      }
    }
  };

  const handleFieldBlur = (name: string, value: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const fields = ['title', 'category', 'impact', 'source', 'description'];
    
    fields.forEach(field => {
      const value = {
        title,
        category,
        impact,
        source,
        description
      }[field as keyof ClaimFormData];
      
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    setErrors(newErrors);
    setTouched(Object.fromEntries(fields.map(field => [field, true])));
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
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
    <div>
      <input
        id="title"
        name="title"
        className={`bg-[#232329] text-white px-4 py-3 rounded-lg text-base min-h-[44px] w-full touch-manipulation transition-colors ${
          errors.title ? 'border-2 border-red-500' : 'border border-transparent'
        }`}
        placeholder="Title"
        value={title}
        onChange={e => handleFieldChange('title', e.target.value)}
        onBlur={() => handleFieldBlur('title', title)}
        required
        aria-invalid={!!errors.title}
        aria-describedby={errors.title ? 'title-error' : undefined}
      />
      {errors.title && touched.title && (
        <p id="title-error" className="text-red-500 text-sm mt-1" role="alert">
          {errors.title}
        </p>
      )}
    </div>

    {/* Category */}
    <label htmlFor="category" className="sr-only">Category</label>
    <div>
      <input
        id="category"
        name="category"
        className={`bg-[#232329] text-white px-4 py-3 rounded-lg text-base min-h-[44px] w-full touch-manipulation transition-colors ${
          errors.category ? 'border-2 border-red-500' : 'border border-transparent'
        }`}
        placeholder="Category"
        value={category}
        onChange={e => handleFieldChange('category', e.target.value)}
        onBlur={() => handleFieldBlur('category', category)}
        required
        aria-invalid={!!errors.category}
        aria-describedby={errors.category ? 'category-error' : undefined}
      />
      {errors.category && touched.category && (
        <p id="category-error" className="text-red-500 text-sm mt-1" role="alert">
          {errors.category}
        </p>
      )}
    </div>

    {/* Impact */}
    <label htmlFor="impact" className="sr-only">Impact</label>
    <div>
      <input
        id="impact"
        name="impact"
        className={`bg-[#232329] text-white px-4 py-3 rounded-lg text-base min-h-[44px] w-full touch-manipulation transition-colors ${
          errors.impact ? 'border-2 border-red-500' : 'border border-transparent'
        }`}
        placeholder="Impact (e.g. High Impact)"
        value={impact}
        onChange={e => handleFieldChange('impact', e.target.value)}
        onBlur={() => handleFieldBlur('impact', impact)}
        required
        aria-invalid={!!errors.impact}
        aria-describedby={errors.impact ? 'impact-error' : undefined}
      />
      {errors.impact && touched.impact && (
        <p id="impact-error" className="text-red-500 text-sm mt-1" role="alert">
          {errors.impact}
        </p>
      )}
    </div>

    {/* Source */}
    <label htmlFor="source" className="sr-only">Source</label>
    <div>
      <input
        id="source"
        name="source"
        className={`bg-[#232329] text-white px-4 py-3 rounded-lg text-base min-h-[44px] w-full touch-manipulation transition-colors ${
          errors.source ? 'border-2 border-red-500' : 'border border-transparent'
        }`}
        placeholder="Source URL"
        value={source}
        onChange={e => handleFieldChange('source', e.target.value)}
        onBlur={() => handleFieldBlur('source', source)}
        required
        aria-invalid={!!errors.source}
        aria-describedby={errors.source ? 'source-error' : undefined}
      />
      {errors.source && touched.source && (
        <p id="source-error" className="text-red-500 text-sm mt-1" role="alert">
          {errors.source}
        </p>
      )}
    </div>

    {/* Description */}
    <label htmlFor="description" className="sr-only">Description</label>
    <div>
      <textarea
        id="description"
        name="description"
        className={`bg-[#232329] text-white px-4 py-3 rounded-lg text-base min-h-[44px] w-full touch-manipulation resize-none transition-colors ${
          errors.description ? 'border-2 border-red-500' : 'border border-transparent'
        }`}
        placeholder="Description"
        value={description}
        onChange={e => handleFieldChange('description', e.target.value)}
        onBlur={() => handleFieldBlur('description', description)}
        rows={4}
        required
        aria-invalid={!!errors.description}
        aria-describedby={errors.description ? 'description-error' : undefined}
      />
      {errors.description && touched.description && (
        <p id="description-error" className="text-red-500 text-sm mt-1" role="alert">
          {errors.description}
        </p>
      )}
    </div>

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
