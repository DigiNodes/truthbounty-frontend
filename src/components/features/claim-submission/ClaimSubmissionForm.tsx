"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useConnect } from "wagmi";
import { useTrust } from "@/components/hooks/useTrust";
import TrustScoreTooltip from "@/components/ui/TrustScoreTooltip";
import { useSubmitClaim } from "@/app/queries/claims.queries";
import { useAccount } from "@/hooks/useAccount";

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
  onSubmit?: (data: ClaimFormData) => void;
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
  const account = useAccount();
  const { connect, connectors } = useConnect();
  const isWalletConnected = !!account?.address && !account?.isWrongNetwork;

  const { mutateAsync, isPending } = useSubmitClaim();

  const lowReputation = trust.reputation < 20;
  const newWallet = trust.accountAgeDays < 7;
  const lowTrust =
    !trust.isVerified || lowReputation || newWallet || trust.suspicious;

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    firstInputRef.current?.focus();
    return () => {
      previousActiveElement.current?.focus();
    };
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

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
    } else if (document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!isWalletConnected) {
      setSubmitError("Please connect your wallet before submitting a claim.");
      return;
    }

    if (!validateForm()) return;

    try {
      await mutateAsync({
        title,
        category,
        impact,
        source,
        description,
      });

      onSubmit?.({ title, category, impact, source, description });

      onClose();
    } catch (err: unknown) {
      console.error("Claim submission failed:", err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to submit claim. Please try again."
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

  const handleConnectWallet = async () => {
    try {
      await setAllowed();
    } catch (err) {
      console.error("Failed to request wallet connection:", err);
      setSubmitError(
        "Could not open the wallet. Please install/enable Freighter and try again."
      );
    }
  };

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const statusMessage = isPending
    ? "Submitting your claim..."
    : submitError
      ? submitError
      : "";

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 modal-shell bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-submission-title"
      data-testid="claim-submission-modal"
      onKeyDown={handleFocusTrap}
    >
      <form
        className="modal-panel bg-[#18181b] border border-[#232329] flex flex-col gap-4"
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
      >
        <h2 id="claim-submission-title" className="text-xl font-bold text-white">Submit a Claim</h2>

        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {statusMessage}
        </div>

        {!isWalletConnected && (
          <div
            data-testid="connect-wallet-banner"
            role="alert"
            className="flex flex-col gap-2 bg-[#2a1d05] border border-yellow-600/50 text-yellow-200 px-3 py-3 rounded-lg text-sm"
          >
            <p className="font-medium">
              You need to connect a wallet to submit a claim.
            </p>
            <button
              type="button"
              data-testid="connect-wallet-button"
              onClick={handleConnectWallet}
              className="self-start bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-2 rounded-md font-semibold"
            >
              Connect Wallet
            </button>
          </div>
        )}

        {lowTrust && (
          <div className="bg-yellow-500 text-black px-2 py-2 rounded text-sm">
            ⚠️ Low trust score <TrustScoreTooltip />
          </div>
        )}

        {submitError && (
          <p className="text-red-500 text-sm break-words" role="alert">
            {submitError}
          </p>
        )}

        {["title", "category", "impact", "source"].map((field, index) => (
          <div key={field}>
            <input
              ref={index === 0 ? firstInputRef : undefined}
              id={`claim-${field}`}
              name={field}
              type="text"
              className={`input ${errors[field as keyof FormErrors] ? "border-red-500" : ""}`}
              placeholder={field === "source" ? "https://example.com" : capitalize(field)}
              aria-label={capitalize(field)}
              value={
                { title, category, impact, source }[
                  field as 'title' | 'category' | 'impact' | 'source'
                ]
              }
              onChange={(e) =>
                handleFieldChange(field, e.target.value)
              }
              onBlur={() =>
                handleBlur(
                  field,
                  { title, category, impact, source }[
                    field as 'title' | 'category' | 'impact' | 'source'
                  ]
                )
              }
            />
            {errors[field as keyof FormErrors] && touched[field] && (
              <p className="text-red-500 text-sm break-words" role="alert">{errors[field as keyof FormErrors]}</p>
            )}
          </div>
        ))}

        <textarea
          id="claim-description"
          name="description"
          placeholder="Description"
          aria-label="Description"
          value={description}
          onChange={(e) =>
            handleFieldChange("description", e.target.value)
          }
          onBlur={() => handleBlur("description", description)}
        />

        {errors.description && touched.description && (
          <p className="text-red-500 text-sm break-words" role="alert">{errors.description}</p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 bg-[#232329] text-white py-3 rounded-lg"
            aria-label="Cancel claim submission"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="submit-claim-button"
            disabled={isPending || !isWalletConnected}
            className="flex-1 bg-[#5b5bf6] text-white py-3 rounded-lg disabled:opacity-50"
            aria-label={isPending ? "Submitting claim" : !isWalletConnected ? "Connect wallet to submit" : "Submit claim"}
          >
            {isPending
              ? "Submitting..."
              : !isWalletConnected
                ? "Connect your wallet to submit"
                : "Submit Claim"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClaimSubmissionForm;
