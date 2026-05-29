"use client";

import React, { useState } from "react";
import { useTrust } from "@/components/hooks/useTrust";
import TrustScoreTooltip from "@/components/ui/TrustScoreTooltip";
import { useSubmitClaim } from "@/app/queries/claims.queries";

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
  onSubmit?: (data: ClaimFormData) => void; // optional now
  onClose: () => void;
}

const ClaimSubmissionForm: React.FC<ClaimFormProps> = ({ onSubmit, onClose }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [impact, setImpact] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const trust = useTrust();

  const { mutateAsync, isLoading } = useSubmitClaim();

  const lowReputation = trust.reputation < 20;
  const newWallet = trust.accountAgeDays < 7;
  const lowTrust =
    !trust.isVerified || lowReputation || newWallet || trust.suspicious;

  // ---------------- VALIDATION ----------------
  const validateField = (name: string, value: string): string | undefined => {
    if (!value.trim()) return `${capitalize(name)} is required`;

    if (name === "title" && value.length < 3) {
      return "Title must be at least 3 characters long";
    }

    if (name === "description" && value.length < 10) {
      return "Description must be at least 10 characters long";
    }

    if (name === "source" && !/^https?:\/\/.+/.test(value)) {
      return "Enter a valid URL starting with http:// or https://";
    }

    return undefined;
  };

  const validateForm = () => {
    const fields = { title, category, impact, source, description };
    const newErrors: FormErrors = {};

    Object.entries(fields).forEach(([key, value]) => {
      const error = validateField(key, value);
      if (error) newErrors[key as keyof FormErrors] = error;
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(fields).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>)
    );

    return Object.keys(newErrors).length === 0;
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    try {
      await mutateAsync({
        title,
        category,
        impact,
        source,
        description,
      });

      // optional callback for parent
      onSubmit?.({ title, category, impact, source, description });

      onClose(); // ✅ only on success
    } catch (err: any) {
      console.error("Claim submission failed:", err);
      setSubmitError(
        err?.message || "Failed to submit claim. Please try again."
      );
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    const setters = {
      title: setTitle,
      category: setCategory,
      impact: setImpact,
      source: setSource,
      description: setDescription,
    };

    setters[name as keyof typeof setters]?.(value);

    if (touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name: string, value: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  // ---------------- UI ----------------
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        className="bg-[#18181b] p-6 rounded-xl w-full max-w-md border border-[#232329] flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-bold text-white">Submit a Claim</h2>

        {lowTrust && (
          <div className="bg-yellow-500 text-black px-2 py-1 rounded text-sm">
            ⚠️ Low trust score <TrustScoreTooltip />
          </div>
        )}

        {submitError && (
          <p className="text-red-500 text-sm" role="alert">
            {submitError}
          </p>
        )}

        {/* Inputs (same structure, shortened here) */}
        {["title", "category", "impact", "source"].map((field) => (
          <div key={field}>
            <input
              id={`claim-${field}`}
              name={field}
              type="text"
              className={`input ${errors[field] ? "border-red-500" : ""}`}
              placeholder={capitalize(field)}
              value={
                { title, category, impact, source }[
                  field as keyof ClaimFormData
                ]
              }
              onChange={(e) =>
                handleFieldChange(field, e.target.value)
              }
              onBlur={() =>
                handleBlur(
                  field,
                  { title, category, impact, source }[
                    field as keyof ClaimFormData
                  ]
                )
              }
            />
            {errors[field] && touched[field] && (
              <p className="text-red-500 text-sm">{errors[field]}</p>
            )}
          </div>
        ))}

        <textarea
          id="claim-description"
          name="description"
          placeholder="Description"
          value={description}
          onChange={(e) =>
            handleFieldChange("description", e.target.value)
          }
          onBlur={() => handleBlur("description", description)}
        />

        {errors.description && touched.description && (
          <p className="text-red-500 text-sm">{errors.description}</p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-[#232329] text-white py-3 rounded-lg"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-[#5b5bf6] text-white py-3 rounded-lg disabled:opacity-50"
          >
            {isLoading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClaimSubmissionForm;