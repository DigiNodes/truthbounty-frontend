"use client";

/**
 * DraftManager — lists saved claim drafts and exposes restore / delete actions.
 *
 * V2-FE-105: Local Drafts Without Fabricated Protocol State
 *
 * Accessibility:
 *  - Uses role="list" / role="listitem" so AT announces item count.
 *  - Each action button carries a unique aria-label that includes the draft title.
 *  - Empty and loading states have appropriate aria-live regions.
 *  - Focus returns to the trigger button after the panel closes.
 *
 * No protocol state is rendered here: no txHash, claimId, status or rewards.
 */

import React, { useId } from "react";
import type { AnnotatedClaimDraft, ClaimDraft } from "@/hooks/useClaimDrafts";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface DraftItemProps {
  draft: AnnotatedClaimDraft;
  onRestore: (draft: ClaimDraft) => void;
  onDelete: (id: string) => void;
}

/**
 * A single row in the draft list. No protocol state is shown.
 */
const DraftItem: React.FC<DraftItemProps> = ({ draft, onRestore, onDelete }) => {
  const displayTitle = draft.title.trim() || "(untitled draft)";
  const savedAt = new Date(draft.savedAt);
  const relativeDate = !isNaN(savedAt.getTime())
    ? savedAt.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year:
          savedAt.getFullYear() !== new Date().getFullYear()
            ? "numeric"
            : undefined,
      })
    : "unknown date";

  return (
    <li
      role="listitem"
      data-testid="draft-item"
      className="flex items-start justify-between gap-3 rounded-lg border border-[#232329] bg-[#1a1a1e] px-3 py-2.5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white" title={displayTitle}>
          {displayTitle}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">
          Saved {relativeDate}
          {draft.isStale && (
            <span
              className="ml-2 text-yellow-400"
              title="This draft is more than 7 days old"
              aria-label="stale draft"
            >
              · stale
            </span>
          )}
        </p>
        {draft.evidence.length > 0 && (
          <p className="mt-0.5 text-xs text-gray-500">
            {draft.evidence.length} evidence item{draft.evidence.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          data-testid="draft-restore-button"
          onClick={() => onRestore(draft)}
          className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
          aria-label={`Restore draft: ${displayTitle}`}
        >
          Restore
        </button>
        <button
          type="button"
          data-testid="draft-delete-button"
          onClick={() => onDelete(draft.id)}
          className="rounded bg-[#2a2a2e] px-2.5 py-1 text-xs font-medium text-gray-300 hover:bg-red-900/60 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
          aria-label={`Delete draft: ${displayTitle}`}
        >
          Delete
        </button>
      </div>
    </li>
  );
};

// ---------------------------------------------------------------------------
// DraftManager props
// ---------------------------------------------------------------------------

export interface DraftManagerProps {
  /** All annotated drafts to display. */
  drafts: AnnotatedClaimDraft[];
  /** True while initial localStorage hydration is in progress. */
  isLoading?: boolean;
  /** Called when the user clicks Restore on a draft. */
  onRestore: (draft: ClaimDraft) => void;
  /** Called when the user clicks Delete on a draft. */
  onDelete: (id: string) => void;
  /** Optional className for the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// DraftManager
// ---------------------------------------------------------------------------

/**
 * Renders the full saved-drafts panel.
 *
 * Callers control open/close state; this component is always rendered
 * (not portaled) so the parent can animate it however it likes.
 */
const DraftManager: React.FC<DraftManagerProps> = ({
  drafts,
  isLoading = false,
  onRestore,
  onDelete,
  className = "",
}) => {
  const headingId = useId();

  return (
    <section
      data-testid="draft-manager"
      aria-labelledby={headingId}
      className={`flex flex-col gap-3 rounded-xl border border-[#232329] bg-[#141416] p-4 ${className}`}
    >
      <h3
        id={headingId}
        className="text-sm font-semibold text-white"
      >
        Saved Drafts
      </h3>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          aria-label="Loading drafts"
          data-testid="draft-manager-loading"
          className="flex items-center gap-2 py-4 text-sm text-gray-400"
        >
          {/* Simple CSS spinner — no JavaScript animation library needed */}
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-white"
          />
          Loading drafts…
        </div>
      ) : drafts.length === 0 ? (
        <p
          role="status"
          aria-live="polite"
          aria-label="No saved drafts yet"
          data-testid="draft-manager-empty"
          className="py-4 text-center text-sm text-gray-500"
        >
          No saved drafts yet. Start filling in the form and your progress will
          be saved automatically.
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            {drafts.length} draft{drafts.length > 1 ? "s" : ""} saved locally
          </p>
          <ul
            role="list"
            aria-label="Saved drafts"
            data-testid="draft-list"
            className="flex flex-col gap-2"
          >
            {drafts.map((draft) => (
              <DraftItem
                key={draft.id}
                draft={draft}
                onRestore={onRestore}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
};

export default DraftManager;
