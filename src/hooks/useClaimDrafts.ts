'use client';

/**
 * useClaimDrafts — local-only draft persistence for claim creation.
 *
 * V2-FE-105: Local Drafts Without Fabricated Protocol State
 *
 * Design invariants:
 *  - Drafts live ONLY in localStorage. They carry zero protocol state
 *    (no txHash, claimId, status, reward, or on-chain identifier).
 *  - A draft is discarded (not updated) when the user successfully submits a
 *    claim. The protocol ledger is the authoritative record of that event.
 *  - Evidence items in a draft are local-only pre-submission attachments;
 *    they are NOT sent to the chain until a real transaction is confirmed.
 *  - Stale drafts (older than DRAFT_TTL_MS) are surfaced with a flag so the
 *    UI can warn the user, but are never auto-deleted without user action.
 */

import { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DRAFTS_STORAGE_KEY = 'tb:claim-drafts';

/** 7 days — a draft older than this is flagged as stale. */
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single evidence attachment that lives only in the draft (pre-submission).
 *
 * - `uri`    — publicly-accessible URL (https or ipfs) or a content-addressed
 *              identifier. The field is intentionally freeform so the user can
 *              reference any evidence before a real on-chain registration.
 * - `digest` — optional hex digest of the content (e.g. SHA-256 of the file).
 *              Helps reviewers verify integrity. NOT a fabricated IPFS CID.
 */
export interface DraftEvidenceItem {
  /** Stable local id (crypto.randomUUID() or similar). */
  id: string;
  /** Evidence location — https or ipfs URI. */
  uri: string;
  /** Optional content digest (hex string, no prefix required). */
  digest?: string;
  /** Human-readable label/description. */
  label?: string;
}

/**
 * A draft claim form — fields mirror ClaimFormData plus evidence.
 *
 * MUST NOT contain: txHash, claimId, status, bountyAmount, rewards,
 * on-chain identifiers, or any fabricated protocol outcome.
 */
export interface ClaimDraft {
  /** Stable local id (crypto.randomUUID()). */
  id: string;
  title: string;
  category: string;
  impact: string;
  source: string;
  description: string;
  /** Pre-submission evidence attachments. Empty array when none. */
  evidence: DraftEvidenceItem[];
  /** ISO-8601 timestamp set when the draft is first created or last saved. */
  savedAt: string;
}

// Fields that can be updated via saveDraft / updateDraft.
export type ClaimDraftFields = Omit<ClaimDraft, 'id' | 'savedAt'>;

// Partial update payload (preserves existing fields).
export type ClaimDraftUpdate = Partial<ClaimDraftFields>;

/** A draft annotated with a UI-facing stale flag. */
export interface AnnotatedClaimDraft extends ClaimDraft {
  isStale: boolean;
}

// ---------------------------------------------------------------------------
// Storage helpers (isolated so tests can stub them)
// ---------------------------------------------------------------------------

function readDraftsFromStorage(): ClaimDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate minimal shape to avoid crashes on corrupt data.
    return parsed.filter(
      (d): d is ClaimDraft =>
        d !== null &&
        typeof d === 'object' &&
        typeof (d as ClaimDraft).id === 'string' &&
        typeof (d as ClaimDraft).savedAt === 'string',
    );
  } catch {
    return [];
  }
}

function writeDraftsToStorage(drafts: ClaimDraft[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Storage quota exceeded or private-mode restriction — fail silently.
  }
}

function isStale(draft: ClaimDraft): boolean {
  const savedAt = new Date(draft.savedAt).getTime();
  return Date.now() - savedAt > DRAFT_TTL_MS;
}

function annotate(draft: ClaimDraft): AnnotatedClaimDraft {
  return { ...draft, isStale: isStale(draft) };
}

// ---------------------------------------------------------------------------
// The hook
// ---------------------------------------------------------------------------

export interface UseClaimDraftsReturn {
  /** All drafts, annotated with staleness. Ordered newest-first. */
  drafts: AnnotatedClaimDraft[];
  /** True on the initial client render before localStorage has been read. */
  isLoading: boolean;
  /**
   * Create a new draft and return its id.
   * The caller may pass an empty-ish object; defaults are applied.
   */
  createDraft: (fields?: ClaimDraftUpdate) => string;
  /**
   * Upsert a draft by id. If no draft with that id exists, a new one is
   * created with the supplied id. Returns the saved draft.
   */
  saveDraft: (id: string, fields: ClaimDraftUpdate) => ClaimDraft;
  /**
   * Permanently delete a draft. No-ops gracefully when id not found.
   */
  deleteDraft: (id: string) => void;
  /**
   * Get a single draft by id (or undefined if not found).
   */
  getDraft: (id: string) => AnnotatedClaimDraft | undefined;
  /**
   * Remove all drafts at once. Requires explicit user intent — do NOT call
   * this on navigation or timeout.
   */
  clearAllDrafts: () => void;
}

const EMPTY_FIELDS: ClaimDraftFields = {
  title: '',
  category: '',
  impact: '',
  source: '',
  description: '',
  evidence: [],
};

export function useClaimDrafts(): UseClaimDraftsReturn {
  const [drafts, setDrafts] = useState<ClaimDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate on mount (client-only).
  useEffect(() => {
    setDrafts(readDraftsFromStorage());
    setIsLoading(false);
  }, []);

  // Persist state changes back to storage.
  const persist = useCallback((next: ClaimDraft[]) => {
    setDrafts(next);
    writeDraftsToStorage(next);
  }, []);

  const createDraft = useCallback(
    (fields: ClaimDraftUpdate = {}): string => {
      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();
      const draft: ClaimDraft = {
        ...EMPTY_FIELDS,
        ...fields,
        evidence: fields.evidence ?? [],
        id,
        savedAt: now,
      };
      persist([draft, ...readDraftsFromStorage()]);
      return id;
    },
    [persist],
  );

  const saveDraft = useCallback(
    (id: string, fields: ClaimDraftUpdate): ClaimDraft => {
      const existing = readDraftsFromStorage();
      const idx = existing.findIndex((d) => d.id === id);
      const now = new Date().toISOString();

      let updated: ClaimDraft;
      let next: ClaimDraft[];

      if (idx === -1) {
        // Upsert: create with the supplied id.
        updated = {
          ...EMPTY_FIELDS,
          ...fields,
          evidence: fields.evidence ?? [],
          id,
          savedAt: now,
        };
        next = [updated, ...existing];
      } else {
        updated = {
          ...existing[idx],
          ...fields,
          evidence: fields.evidence ?? existing[idx].evidence,
          savedAt: now,
        };
        next = existing.map((d) => (d.id === id ? updated : d));
      }

      persist(next);
      return updated;
    },
    [persist],
  );

  const deleteDraft = useCallback(
    (id: string): void => {
      persist(readDraftsFromStorage().filter((d) => d.id !== id));
    },
    [persist],
  );

  const getDraft = useCallback(
    (id: string): AnnotatedClaimDraft | undefined => {
      const stored = readDraftsFromStorage();
      const found = stored.find((d) => d.id === id);
      return found ? annotate(found) : undefined;
    },
    [],
  );

  const clearAllDrafts = useCallback((): void => {
    persist([]);
  }, [persist]);

  // Stable sorted view: newest first.
  const annotatedDrafts = drafts
    .slice()
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .map(annotate);

  return {
    drafts: annotatedDrafts,
    isLoading,
    createDraft,
    saveDraft,
    deleteDraft,
    getDraft,
    clearAllDrafts,
  };
}
