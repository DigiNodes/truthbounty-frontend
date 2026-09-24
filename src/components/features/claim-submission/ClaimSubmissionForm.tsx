"use client";

/**
 * ClaimSubmissionForm — modal form for submitting a new claim.
 *
 * V2-FE-105: Local Drafts Without Fabricated Protocol State
 *
 * Draft behaviour:
 *  - A new draft id is generated when the modal opens (or an existing draft
 *    is restored from DraftManager). The draft id is stable for the lifetime
 *    of the open modal.
 *  - All text fields and evidence items are debounced-saved to localStorage
 *    after each keystroke (300 ms debounce via useDebounce).
 *  - On successful submission the draft is deleted — the protocol record is
 *    now the canonical source of truth, not localStorage.
 *  - No protocol state (txHash, claimId, status, rewards) is fabricated or
 *    stored in the draft.
 *
 * Evidence attachment:
 *  - Users may add one or more (uri, optional digest) pairs before submitting.
 *  - Items are local-only pre-submission. They are NOT sent on-chain here;
 *    post-submission on-chain evidence registration is handled by
 *    useEvidenceRegistration (a separate interaction).
 *  - Only https:// and ipfs:// URIs are accepted.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from "react";
import { useConnect } from "wagmi";
import { useTrust } from "@/components/hooks/useTrust";
import TrustScoreTooltip from "@/components/ui/TrustScoreTooltip";
import { useSubmitClaim } from "@/app/queries/claims.queries";
import {
  useWriteContract,
  useReadContract,
  usePublicClient,
  useChainId,
} from "wagmi";
import { keccak256, stringToHex, parseAbi } from "viem";
import { useClaimDrafts } from "@/hooks/useClaimDrafts";
import type { DraftEvidenceItem } from "@/hooks/useClaimDrafts";
import DraftManager from "./DraftManager";
import { useDebounce } from "@/hooks/useDebounce";

// ---------------------------------------------------------------------------
// Inline claim-contract helpers (unchanged from original)
// ---------------------------------------------------------------------------

const claimAbi = parseAbi([
  "function createClaim(bytes32 contentDigest, address bountyAsset, uint256 amount, bytes32 configHash) returns (uint256 claimId)",
]);
const erc20Abi = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

function getClaimConfig() {
  const address = process.env.NEXT_PUBLIC_BOUNTY_CLAIM_ADDRESS;
  const asset = process.env.NEXT_PUBLIC_BOUNTY_ASSET;
  const amount = process.env.NEXT_PUBLIC_CLAIM_AMOUNT;
  const configHash = process.env.NEXT_PUBLIC_CLAIM_CONFIG_HASH;
  const chainId = process.env.NEXT_PUBLIC_EXPECTED_CHAIN_ID;
  if (!address || !asset || !amount || !configHash || !chainId) {
    return null;
  }
  return {
    address: address as `0x${string}`,
    asset: asset as `0x${string}`,
    amount: BigInt(amount),
    configHash: configHash as `0x${string}`,
    chainId: Number(chainId),
  };
}

function useCreateClaimTransaction() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | null>(null);
  const account = useAccount();
  const address = account?.address;
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const config = getClaimConfig();
  const contractAddress = config?.address;
  const asset = config?.asset;
  const amount = config?.amount ?? 0n;
  const configHash = config?.configHash;
  const expectedChainId = config?.chainId;

  const { data: allowance = 0n } = useReadContract({
    address: asset,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      address && contractAddress ? [address, contractAddress] : undefined,
    query: {
      enabled: !!address && !!contractAddress && !!asset,
    },
  });

  const { writeContractAsync: writeAllowanceAsync } = useWriteContract();
  const { writeContractAsync: writeClaimAsync } = useWriteContract();

  const submitClaim = async (contentDigest: `0x${string}`) => {
    if (!address) throw new Error("Wallet not connected");
    if (!config || !contractAddress || !asset || !configHash) {
      throw new Error("Claim contract configuration is incomplete.");
    }
    if (chainId !== expectedChainId) throw new Error("Wrong network connected.");
    if (!publicClient) throw new Error("Public client not available");

    setIsPending(true);
    setError(null);

    try {
      if (amount > 0n && allowance < amount) {
        const approvalHash = await writeAllowanceAsync({
          address: asset,
          abi: erc20Abi,
          functionName: "approve",
          args: [contractAddress, amount],
        });
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }

      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi: claimAbi,
        functionName: "createClaim",
        args: [contentDigest, asset, amount, configHash],
        account: address,
      });

      const hash = await writeClaimAsync(request);
      setTransactionHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Claim creation failed";
      setError(message);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { submitClaim, isPending, error, transactionHash };
}

import { useAccount } from "@/hooks/useAccount";

// ---------------------------------------------------------------------------
// Form types
// ---------------------------------------------------------------------------

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

interface EvidenceItemErrors {
  uri?: string;
  digest?: string;
}

interface ClaimFormProps {
  onSubmit?: (data: ClaimFormData) => void;
  onClose: () => void;
}

type StringFormField = "title" | "category" | "impact" | "source";

// ---------------------------------------------------------------------------
// Evidence URI validation
// ---------------------------------------------------------------------------

function validateEvidenceUri(uri: string): string | undefined {
  if (!uri.trim()) return "Evidence URI is required";
  try {
    const parsed = new URL(uri.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "ipfs:") {
      return "Only https:// or ipfs:// URIs are supported";
    }
    if (uri.length > 1024) return "URI must be under 1024 characters";
    // Rudimentary secret-in-URL guard
    if (/\b(password|secret|key|token)=/i.test(uri)) {
      return "URI appears to contain sensitive information — please remove it";
    }
  } catch {
    return "Enter a valid URI (https:// or ipfs://)";
  }
  return undefined;
}

function validateEvidenceDigest(digest: string): string | undefined {
  if (!digest.trim()) return undefined; // Optional field
  // Accept hex string with or without 0x prefix.
  const stripped = digest.startsWith("0x") ? digest.slice(2) : digest;
  if (!/^[a-fA-F0-9]+$/.test(stripped)) {
    return "Digest must be a hexadecimal string";
  }
  if (stripped.length !== 64 && stripped.length !== 128) {
    return "Digest must be 32 bytes (SHA-256, 64 hex chars) or 64 bytes (SHA-512, 128 hex chars)";
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ClaimSubmissionForm: React.FC<ClaimFormProps> = ({ onSubmit, onClose }) => {
  // ── Core form state ──────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [impact, setImpact] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Draft state ──────────────────────────────────────────────────────────
  const { drafts, isLoading: draftsLoading, createDraft, saveDraft, deleteDraft } =
    useClaimDrafts();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [showDraftManager, setShowDraftManager] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Initialise a new draft id on mount (once).
  useEffect(() => {
    const id = createDraft();
    setDraftId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Evidence state ───────────────────────────────────────────────────────
  const [evidenceItems, setEvidenceItems] = useState<DraftEvidenceItem[]>([]);
  const [newEvidenceUri, setNewEvidenceUri] = useState("");
  const [newEvidenceDigest, setNewEvidenceDigest] = useState("");
  const [newEvidenceLabel, setNewEvidenceLabel] = useState("");
  const [newEvidenceErrors, setNewEvidenceErrors] = useState<EvidenceItemErrors>({});
  const evidenceUriId = useId();
  const evidenceDigestId = useId();
  const evidenceLabelId = useId();

  // ── Debounced field values for auto-save ─────────────────────────────────
  const debouncedTitle = useDebounce(title, 300);
  const debouncedCategory = useDebounce(category, 300);
  const debouncedImpact = useDebounce(impact, 300);
  const debouncedSource = useDebounce(source, 300);
  const debouncedDescription = useDebounce(description, 300);
  // Evidence saves immediately on list mutation (no debounce needed — user
  // confirms each item explicitly before it's added).

  // Auto-save draft when debounced fields change.
  useEffect(() => {
    if (!draftId) return;
    saveDraft(draftId, {
      title: debouncedTitle,
      category: debouncedCategory,
      impact: debouncedImpact,
      source: debouncedSource,
      description: debouncedDescription,
      evidence: evidenceItems,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, debouncedTitle, debouncedCategory, debouncedImpact, debouncedSource, debouncedDescription]);

  // Re-save when evidence list mutates (explicit user action, not debounced).
  useEffect(() => {
    if (!draftId) return;
    saveDraft(draftId, {
      title,
      category,
      impact,
      source,
      description,
      evidence: evidenceItems,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceItems]);

  // ── Auth & trust ─────────────────────────────────────────────────────────
  const trust = useTrust();
  const account = useAccount();
  const { connect, connectors } = useConnect();
  const isWalletConnected = !!account?.address;

  const { mutateAsync, isPending: isSubmittingApi } =
    useSubmitClaim?.() ?? { mutateAsync: undefined, isPending: false };
  const { submitClaim, isPending: isSubmittingTx } = useCreateClaimTransaction();
  const isPending = isSubmittingApi || isSubmittingTx;

  const lowReputation = trust.reputation < 20;
  const newWallet = trust.accountAgeDays < 7;
  const lowTrust =
    !trust.isVerified || lowReputation || newWallet || trust.suspicious;

  // ── Focus management ─────────────────────────────────────────────────────
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const draftToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    firstInputRef.current?.focus();
    return () => {
      previousActiveElement.current?.focus();
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  const handleFocusTrap = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusableElements || focusableElements.length === 0) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
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

  // ── Validation ───────────────────────────────────────────────────────────

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

  // ── Submit ───────────────────────────────────────────────────────────────

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
      if (process.env.NEXT_PUBLIC_BOUNTY_CLAIM_ADDRESS) {
        const contentDigest = keccak256(
          stringToHex(
            `${title}|${category}|${impact}|${source}|${description}`,
          ),
        );
        await submitClaim(contentDigest);
      }

      if (mutateAsync) {
        await mutateAsync({ title, category, impact, source, description });
      }

      // Discard draft on success — the protocol ledger is now authoritative.
      if (draftId) {
        deleteDraft(draftId);
      }

      onSubmit?.({ title, category, impact, source, description });
      onClose();
    } catch (err: unknown) {
      console.error("Claim submission failed:", err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to submit claim. Please try again.",
      );
    }
  };

  // ── Field change helpers ─────────────────────────────────────────────────

  const handleFieldChange = (name: string, value: string) => {
    const setters: Record<string, (v: string) => void> = {
      title: setTitle,
      category: setCategory,
      impact: setImpact,
      source: setSource,
      description: setDescription,
    };
    setters[name]?.(value);
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

  // ── Draft restore ─────────────────────────────────────────────────────────

  const handleRestoreDraft = useCallback(
    (draft: import("@/hooks/useClaimDrafts").ClaimDraft) => {
      // Replace current ephemeral draft with the restored one.
      if (draftId && draftId !== draft.id) {
        deleteDraft(draftId);
      }
      setDraftId(draft.id);
      setTitle(draft.title);
      setCategory(draft.category);
      setImpact(draft.impact);
      setSource(draft.source);
      setDescription(draft.description);
      setEvidenceItems(draft.evidence ?? []);
      setDraftRestored(true);
      setShowDraftManager(false);
      // Return focus to toggle button.
      setTimeout(() => draftToggleRef.current?.focus(), 0);
    },
    [draftId, deleteDraft],
  );

  const handleDeleteDraft = useCallback(
    (id: string) => {
      deleteDraft(id);
      // If user deletes the currently active draft, spin up a fresh one.
      if (id === draftId) {
        const newId = createDraft();
        setDraftId(newId);
        setTitle("");
        setCategory("");
        setImpact("");
        setSource("");
        setDescription("");
        setEvidenceItems([]);
        setDraftRestored(false);
      }
    },
    [draftId, deleteDraft, createDraft],
  );

  // ── Connect wallet ────────────────────────────────────────────────────────

  const handleConnectWallet = async () => {
    try {
      const connector = connectors[0];
      if (!connector) {
        setSubmitError(
          "No wallet connector found. Please install a browser wallet and reload.",
        );
        return;
      }
      connect({ connector });
    } catch (err) {
      console.error("Failed to open wallet connector:", err);
      setSubmitError(
        "Could not open the wallet. Please install a browser wallet and try again.",
      );
    }
  };

  // ── Evidence helpers ──────────────────────────────────────────────────────

  const handleAddEvidence = () => {
    const uriError = validateEvidenceUri(newEvidenceUri);
    const digestError = validateEvidenceDigest(newEvidenceDigest);
    if (uriError || digestError) {
      setNewEvidenceErrors({ uri: uriError, digest: digestError });
      return;
    }
    const item: DraftEvidenceItem = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `ev-${Date.now()}`,
      uri: newEvidenceUri.trim(),
      ...(newEvidenceDigest.trim() ? { digest: newEvidenceDigest.trim() } : {}),
      ...(newEvidenceLabel.trim() ? { label: newEvidenceLabel.trim() } : {}),
    };
    setEvidenceItems((prev) => [...prev, item]);
    setNewEvidenceUri("");
    setNewEvidenceDigest("");
    setNewEvidenceLabel("");
    setNewEvidenceErrors({});
  };

  const handleRemoveEvidence = (id: string) => {
    setEvidenceItems((prev) => prev.filter((item) => item.id !== id));
  };

  // ── Misc ──────────────────────────────────────────────────────────────────

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const statusMessage = isPending
    ? "Submitting your claim…"
    : submitError
      ? submitError
      : "";

  const formValues: Record<StringFormField, string> = {
    title,
    category,
    impact,
    source,
  };

  // Drafts eligible to display in the manager (exclude the active draft so the
  // user isn't confused seeing their current in-progress form in the list).
  const displayDrafts = drafts.filter((d) => d.id !== draftId);

  // ── Render ────────────────────────────────────────────────────────────────

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
        className="modal-panel bg-[#18181b] border border-[#232329] flex flex-col gap-4 overflow-y-auto max-h-screen"
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2
            id="claim-submission-title"
            className="text-xl font-bold text-white"
          >
            Submit a Claim
          </h2>

          {/* Draft manager toggle */}
          <button
            ref={draftToggleRef}
            type="button"
            data-testid="draft-manager-toggle"
            onClick={() => setShowDraftManager((v) => !v)}
            className="text-xs text-gray-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 px-2 py-1 rounded"
            aria-expanded={showDraftManager}
            aria-controls="draft-manager-panel"
          >
            {showDraftManager ? "Hide drafts" : `Drafts (${displayDrafts.length})`}
          </button>
        </div>

        {/* ── Draft manager panel ───────────────────────────────────────── */}
        {showDraftManager && (
          <div id="draft-manager-panel">
            <DraftManager
              drafts={displayDrafts}
              isLoading={draftsLoading}
              onRestore={handleRestoreDraft}
              onDelete={handleDeleteDraft}
            />
          </div>
        )}

        {/* ── Draft-restored confirmation ───────────────────────────────── */}
        {draftRestored && (
          <div
            role="status"
            aria-live="polite"
            data-testid="draft-restored-banner"
            className="flex items-center justify-between gap-2 rounded-lg border border-blue-600/40 bg-blue-900/30 px-3 py-2 text-sm text-blue-200"
          >
            <span>Draft restored. Your previous progress has been loaded.</span>
            <button
              type="button"
              onClick={() => setDraftRestored(false)}
              className="shrink-0 text-xs text-blue-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
              aria-label="Dismiss draft restored notice"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Screen-reader live region ─────────────────────────────────── */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </div>

        {/* ── Wallet gate banner ────────────────────────────────────────── */}
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

        {/* ── Low-trust warning ─────────────────────────────────────────── */}
        {lowTrust && (
          <div className="bg-yellow-500 text-black px-2 py-2 rounded text-sm">
            ⚠️ Low trust score <TrustScoreTooltip />
          </div>
        )}

        {/* ── Submit error ──────────────────────────────────────────────── */}
        {submitError && (
          <p
            className="text-red-500 text-sm break-words"
            role="alert"
            data-testid="submit-error"
          >
            {submitError}
          </p>
        )}

        {/* ── Text fields ───────────────────────────────────────────────── */}
        {(["title", "category", "impact", "source"] as StringFormField[]).map(
          (field, index) => (
            <div key={field}>
              <input
                ref={index === 0 ? firstInputRef : undefined}
                id={`claim-${field}`}
                name={field}
                type="text"
                className={`input ${errors[field] ? "border-red-500" : ""}`}
                placeholder={
                  field === "source" ? "https://example.com" : capitalize(field)
                }
                aria-label={capitalize(field)}
                value={formValues[field]}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                onBlur={() => handleBlur(field, formValues[field])}
              />
              {errors[field] && touched[field] && (
                <p className="text-red-500 text-sm break-words" role="alert">
                  {errors[field]}
                </p>
              )}
            </div>
          ),
        )}

        <div>
          <textarea
            id="claim-description"
            name="description"
            className={`input ${errors.description ? "border-red-500" : ""}`}
            placeholder="Description"
            aria-label="Description"
            value={description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            onBlur={() => handleBlur("description", description)}
          />
          {errors.description && touched.description && (
            <p className="text-red-500 text-sm break-words" role="alert">
              {errors.description}
            </p>
          )}
        </div>

        {/* ── Evidence section ──────────────────────────────────────────── */}
        <fieldset
          data-testid="evidence-section"
          className="rounded-xl border border-[#232329] px-3 pb-3 pt-2"
        >
          <legend className="px-1 text-sm font-semibold text-gray-300">
            Evidence{" "}
            <span className="font-normal text-gray-500">(optional, local only)</span>
          </legend>

          {/* Existing evidence items */}
          {evidenceItems.length > 0 && (
            <ul
              role="list"
              aria-label="Added evidence"
              data-testid="evidence-list"
              className="mb-3 flex flex-col gap-2"
            >
              {evidenceItems.map((item) => (
                <li
                  key={item.id}
                  role="listitem"
                  data-testid="evidence-item"
                  className="flex items-start justify-between gap-2 rounded-lg border border-[#2a2a2f] bg-[#1a1a1e] px-2.5 py-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    {item.label && (
                      <p className="mb-0.5 font-medium text-gray-300">
                        {item.label}
                      </p>
                    )}
                    <p
                      className="break-all text-gray-400"
                      data-testid="evidence-uri"
                    >
                      {item.uri}
                    </p>
                    {item.digest && (
                      <p className="mt-0.5 truncate font-mono text-gray-500">
                        {item.digest}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid="evidence-remove-button"
                    onClick={() => handleRemoveEvidence(item.id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-gray-500 hover:bg-red-900/50 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
                    aria-label={`Remove evidence: ${item.label ?? item.uri}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add-evidence inline form */}
          <div
            data-testid="add-evidence-form"
            className="flex flex-col gap-2"
          >
            <div>
              <label
                htmlFor={evidenceUriId}
                className="mb-1 block text-xs font-medium text-gray-400"
              >
                Evidence URI{" "}
                <span className="font-normal text-gray-500">
                  (https:// or ipfs://)
                </span>
              </label>
              <input
                id={evidenceUriId}
                type="url"
                data-testid="evidence-uri-input"
                className={`input text-sm ${newEvidenceErrors.uri ? "border-red-500" : ""}`}
                placeholder="https://example.com/article or ipfs://Qm…"
                value={newEvidenceUri}
                onChange={(e) => {
                  setNewEvidenceUri(e.target.value);
                  if (newEvidenceErrors.uri) {
                    setNewEvidenceErrors((prev) => ({ ...prev, uri: undefined }));
                  }
                }}
                aria-describedby={
                  newEvidenceErrors.uri ? `${evidenceUriId}-error` : undefined
                }
              />
              {newEvidenceErrors.uri && (
                <p
                  id={`${evidenceUriId}-error`}
                  className="mt-0.5 text-xs text-red-500"
                  role="alert"
                  data-testid="evidence-uri-error"
                >
                  {newEvidenceErrors.uri}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={evidenceDigestId}
                className="mb-1 block text-xs font-medium text-gray-400"
              >
                Content digest{" "}
                <span className="font-normal text-gray-500">
                  (optional, SHA-256 hex)
                </span>
              </label>
              <input
                id={evidenceDigestId}
                type="text"
                data-testid="evidence-digest-input"
                className={`input text-sm font-mono ${newEvidenceErrors.digest ? "border-red-500" : ""}`}
                placeholder="e3b0c44298fc1c149afb…"
                value={newEvidenceDigest}
                onChange={(e) => {
                  setNewEvidenceDigest(e.target.value);
                  if (newEvidenceErrors.digest) {
                    setNewEvidenceErrors((prev) => ({ ...prev, digest: undefined }));
                  }
                }}
                aria-describedby={
                  newEvidenceErrors.digest
                    ? `${evidenceDigestId}-error`
                    : undefined
                }
              />
              {newEvidenceErrors.digest && (
                <p
                  id={`${evidenceDigestId}-error`}
                  className="mt-0.5 text-xs text-red-500"
                  role="alert"
                  data-testid="evidence-digest-error"
                >
                  {newEvidenceErrors.digest}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={evidenceLabelId}
                className="mb-1 block text-xs font-medium text-gray-400"
              >
                Label{" "}
                <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <input
                id={evidenceLabelId}
                type="text"
                data-testid="evidence-label-input"
                className="input text-sm"
                placeholder="e.g. Reuters article"
                value={newEvidenceLabel}
                onChange={(e) => setNewEvidenceLabel(e.target.value)}
              />
            </div>

            <button
              type="button"
              data-testid="add-evidence-button"
              onClick={handleAddEvidence}
              className="self-start rounded bg-[#2a2a2f] px-3 py-1.5 text-sm text-gray-300 hover:bg-[#35353b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              + Add evidence
            </button>
          </div>
        </fieldset>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="btn btn-secondary flex-1"
            onClick={onClose}
            disabled={isPending}
            aria-label="Cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="submit-claim-button"
            className="btn btn-primary flex-1 disabled:opacity-50"
            disabled={isPending || !isWalletConnected}
            aria-label={
              isPending
                ? "Submitting claim"
                : !isWalletConnected
                  ? "Connect wallet to submit"
                  : "Submit claim"
            }
          >
            {isPending
              ? "Submitting…"
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
