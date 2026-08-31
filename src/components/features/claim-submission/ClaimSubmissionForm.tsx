"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
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

type StringFormField = "title" | "category" | "impact" | "source";

const ClaimSubmissionForm: React.FC<ClaimFormProps> = ({ onSubmit, onClose }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [impact, setImpact] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { openConnectModal } = useConnectModal();
  const trust = useTrust();
  const account = useAccount();
  const isWalletConnected = !!account?.address;

  const { mutateAsync, isLoading } = useSubmitClaim();

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
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "title":
        if (!value.trim()) return "Title is required";
        if (value.length < 5) return "Title must be at least 5 characters";
        break;
      case "category":
        if (!value.trim()) return "Category is required";
        break;
      case "impact":
        if (!value.trim()) return "Impact is required";
        break;
      case "source":
        if (!value.trim()) return "Source is required";
        try {
          new URL(value);
        } catch {
          return "Enter a valid URL";
        }
        break;
      case "description":
        if (!value.trim()) return "Description is required";
        if (value.length < 10) return "Description must be at least 10 characters";
        break;
    }
    return undefined;
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const fields = { title, category, impact, source, description };

    Object.entries(fields).forEach(([name, value]) => {
      const error = validateField(name, value);
      if (error) newErrors[name as keyof FormErrors] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConnectWallet = () => {
    openConnectModal?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    setTouched({
      title: true,
      category: true,
      impact: true,
      source: true,
      description: true,
    });

    if (!isWalletConnected) {
      setSubmitError("Please connect your wallet before submitting a claim.");
      return;
    }

    if (!validate()) return;

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

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const statusMessage = isLoading
    ? "Submitting your claim..."
    : submitError
      ? submitError
      : "";

  const formValues: Record<StringFormField, string> = {
    title,
    category,
    impact,
    source,
  };

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

        {(["title", "category", "impact", "source"] as StringFormField[]).map((field, index) => (
          <div key={field}>
            <input
              ref={index === 0 ? firstInputRef : undefined}
              id={`claim-${field}`}
              name={field}
              type="text"
              className={`input ${errors[field] ? "border-red-500" : ""}`}
              placeholder={field === "source" ? "https://example.com" : capitalize(field)}
              aria-label={capitalize(field)}
              value={formValues[field]}
              onChange={(e) =>
                handleFieldChange(field, e.target.value)
              }
              onBlur={() =>
                handleBlur(field, formValues[field])
              }
            />
            {errors[field] && touched[field] && (
              <p className="text-red-500 text-sm break-words" role="alert">{errors[field]}</p>
            )}
          </div>
        ))}

        <textarea
          id="claim-description"
          name="description"
          className={`input ${errors.description ? "border-red-500" : ""}`}
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

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="submit-claim-button"
            className="btn btn-primary"
            disabled={isLoading || !isWalletConnected}
          >
            {isLoading
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
