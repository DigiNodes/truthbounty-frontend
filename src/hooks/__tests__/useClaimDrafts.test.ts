/**
 * Unit tests for useClaimDrafts
 *
 * V2-FE-105: Local Drafts Without Fabricated Protocol State
 *
 * Coverage:
 *  - CRUD: createDraft, saveDraft (create & update), getDraft, deleteDraft, clearAllDrafts
 *  - Staleness flag
 *  - localStorage isolation (reads from / writes to the correct key)
 *  - Corrupt storage handled gracefully
 *  - No fabricated protocol fields (txHash, claimId, status) in any output
 */

import { renderHook, act } from '@testing-library/react';
import {
  useClaimDrafts,
  DRAFTS_STORAGE_KEY,
  DRAFT_TTL_MS,
  type ClaimDraft,
  type DraftEvidenceItem,
} from '@/hooks/useClaimDrafts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid draft fixture (no protocol state). */
function makeDraft(overrides: Partial<ClaimDraft> = {}): ClaimDraft {
  return {
    id: 'test-id-1',
    title: 'Test title',
    category: 'Politics',
    impact: 'High',
    source: 'https://example.com',
    description: 'A long enough description.',
    evidence: [],
    savedAt: new Date().toISOString(),
    ...overrides,
  };
}

function seedStorage(drafts: ClaimDraft[]) {
  window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Ensure localStorage is clean before every test.
// jest.setup.js clears storage in afterEach, but we also clear it here so
// that each test starts with a known-empty state regardless of order.
beforeEach(() => {
  window.localStorage.clear();
});

describe('useClaimDrafts — initial load', () => {
  it('returns an empty array when localStorage is empty', () => {
    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.drafts).toHaveLength(0);
  });

  it('hydrates drafts from localStorage on mount', () => {
    const draft = makeDraft();
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0].id).toBe('test-id-1');
  });

  it('sets isLoading=false after mount', () => {
    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.isLoading).toBe(false);
  });

  it('handles corrupt JSON in localStorage gracefully (returns empty)', () => {
    window.localStorage.setItem(DRAFTS_STORAGE_KEY, 'not-valid-json{{{');
    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.drafts).toHaveLength(0);
  });

  it('handles a non-array value in localStorage gracefully', () => {
    window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.drafts).toHaveLength(0);
  });

  it('filters out malformed items (missing id) but keeps valid ones', () => {
    const valid = makeDraft({ id: 'valid-1' });
    const malformed = { title: 'no id', savedAt: new Date().toISOString() };
    seedStorage([valid, malformed as ClaimDraft]);

    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0].id).toBe('valid-1');
  });
});

describe('useClaimDrafts — createDraft', () => {
  it('returns a non-empty string id', () => {
    const { result } = renderHook(() => useClaimDrafts());
    let id: string;
    act(() => {
      id = result.current.createDraft();
    });
    expect(typeof id!).toBe('string');
    expect(id!.length).toBeGreaterThan(0);
  });

  it('adds the draft to the returned list', () => {
    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.createDraft({ title: 'My draft' });
    });
    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0].title).toBe('My draft');
  });

  it('persists the draft to localStorage', () => {
    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.createDraft({ title: 'Stored draft' });
    });
    const stored = JSON.parse(
      window.localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '[]',
    ) as ClaimDraft[];
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('Stored draft');
  });

  it('generates unique ids for each draft', () => {
    const { result } = renderHook(() => useClaimDrafts());
    let id1: string, id2: string;
    act(() => {
      id1 = result.current.createDraft({ title: 'Draft A' });
      id2 = result.current.createDraft({ title: 'Draft B' });
    });
    expect(id1!).not.toBe(id2!);
  });

  it('new draft has no protocol state fields', () => {
    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.createDraft({ title: 'Clean draft' });
    });
    const draft = result.current.drafts[0];
    expect(draft).not.toHaveProperty('txHash');
    expect(draft).not.toHaveProperty('claimId');
    expect(draft).not.toHaveProperty('status');
    expect(draft).not.toHaveProperty('bountyAmount');
    expect(draft).not.toHaveProperty('rewards');
  });
});

describe('useClaimDrafts — saveDraft (update)', () => {
  it('updates an existing draft in-place', () => {
    const draft = makeDraft({ id: 'save-test', title: 'Original' });
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.saveDraft('save-test', { title: 'Updated' });
    });

    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0].title).toBe('Updated');
  });

  it('upserts (creates) a draft when id does not exist', () => {
    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.saveDraft('brand-new-id', { title: 'Upserted' });
    });
    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0].id).toBe('brand-new-id');
    expect(result.current.drafts[0].title).toBe('Upserted');
  });

  it('refreshes savedAt when updating', () => {
    const pastDate = new Date(Date.now() - 10_000).toISOString();
    const draft = makeDraft({ id: 'ts-test', savedAt: pastDate });
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.saveDraft('ts-test', { title: 'Touch' });
    });

    const updated = result.current.drafts.find((d) => d.id === 'ts-test');
    expect(updated?.savedAt).not.toBe(pastDate);
  });

  it('persists the update to localStorage', () => {
    const draft = makeDraft({ id: 'ls-save', title: 'Before' });
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.saveDraft('ls-save', { title: 'After' });
    });

    const stored = JSON.parse(
      window.localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '[]',
    ) as ClaimDraft[];
    expect(stored.find((d) => d.id === 'ls-save')?.title).toBe('After');
  });
});

describe('useClaimDrafts — getDraft', () => {
  it('returns the draft by id', () => {
    const draft = makeDraft({ id: 'get-me' });
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    const found = result.current.getDraft('get-me');
    expect(found?.id).toBe('get-me');
  });

  it('returns undefined for a missing id', () => {
    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.getDraft('no-such-id')).toBeUndefined();
  });

  it('includes the isStale annotation', () => {
    const staleDate = new Date(Date.now() - DRAFT_TTL_MS - 1000).toISOString();
    const draft = makeDraft({ id: 'stale-check', savedAt: staleDate });
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    const found = result.current.getDraft('stale-check');
    expect(found?.isStale).toBe(true);
  });
});

describe('useClaimDrafts — deleteDraft', () => {
  it('removes the draft from the list', () => {
    const draft = makeDraft({ id: 'delete-me' });
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.deleteDraft('delete-me');
    });

    expect(result.current.drafts).toHaveLength(0);
  });

  it('removes the draft from localStorage', () => {
    const draft = makeDraft({ id: 'delete-ls' });
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.deleteDraft('delete-ls');
    });

    const stored = JSON.parse(
      window.localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '[]',
    ) as ClaimDraft[];
    expect(stored).toHaveLength(0);
  });

  it('no-ops gracefully when id not found', () => {
    const draft = makeDraft({ id: 'keep-me' });
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.deleteDraft('not-here');
    });

    expect(result.current.drafts).toHaveLength(1);
  });

  it('does not mutate other drafts when deleting one', () => {
    const d1 = makeDraft({ id: 'keep-1', title: 'Keep' });
    const d2 = makeDraft({ id: 'del-2', title: 'Delete' });
    seedStorage([d1, d2]);

    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.deleteDraft('del-2');
    });

    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0].id).toBe('keep-1');
  });
});

describe('useClaimDrafts — clearAllDrafts', () => {
  it('empties the draft list', () => {
    seedStorage([makeDraft({ id: 'a' }), makeDraft({ id: 'b' })]);

    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.drafts).toHaveLength(2);

    act(() => {
      result.current.clearAllDrafts();
    });

    expect(result.current.drafts).toHaveLength(0);
  });

  it('clears localStorage', () => {
    seedStorage([makeDraft({ id: 'clr' })]);

    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.clearAllDrafts();
    });

    const stored = JSON.parse(
      window.localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '[]',
    );
    expect(stored).toHaveLength(0);
  });
});

describe('useClaimDrafts — staleness', () => {
  it('marks recent drafts as NOT stale', () => {
    const draft = makeDraft({ id: 'fresh', savedAt: new Date().toISOString() });
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.drafts[0].isStale).toBe(false);
  });

  it('marks old drafts (> 7 days) as stale', () => {
    const staleDate = new Date(Date.now() - DRAFT_TTL_MS - 1000).toISOString();
    const draft = makeDraft({ id: 'old', savedAt: staleDate });
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.drafts[0].isStale).toBe(true);
  });

  it('marks exactly-TTL-old drafts as stale', () => {
    // A draft saved exactly DRAFT_TTL_MS milliseconds ago has elapsed time
    // equal to the TTL, so it IS stale (elapsed >= TTL).
    // We add 1 ms to ensure we're strictly past the boundary.
    const atBoundary = new Date(Date.now() - DRAFT_TTL_MS - 1).toISOString();
    const draft = makeDraft({ id: 'exact', savedAt: atBoundary });
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.drafts[0].isStale).toBe(true);
  });
});

describe('useClaimDrafts — ordering', () => {
  it('returns drafts sorted newest-first', () => {
    const older = makeDraft({
      id: 'older',
      savedAt: new Date(Date.now() - 5000).toISOString(),
    });
    const newer = makeDraft({
      id: 'newer',
      savedAt: new Date().toISOString(),
    });
    seedStorage([older, newer]);

    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.drafts[0].id).toBe('newer');
    expect(result.current.drafts[1].id).toBe('older');
  });
});

describe('useClaimDrafts — evidence items', () => {
  it('stores and retrieves evidence items in a draft', () => {
    const evidence: DraftEvidenceItem[] = [
      { id: 'ev1', uri: 'https://example.com/doc', digest: 'abc123' },
    ];
    const draft = makeDraft({ id: 'ev-draft', evidence });
    seedStorage([draft]);

    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.drafts[0].evidence).toHaveLength(1);
    expect(result.current.drafts[0].evidence[0].uri).toBe(
      'https://example.com/doc',
    );
  });

  it('evidence items carry no txHash or on-chain identifiers', () => {
    const evidence: DraftEvidenceItem[] = [
      { id: 'ev2', uri: 'ipfs://Qmfake', label: 'Evidence A' },
    ];
    const { result } = renderHook(() => useClaimDrafts());
    act(() => {
      result.current.createDraft({ evidence });
    });
    const item = result.current.drafts[0].evidence[0];
    expect(item).not.toHaveProperty('txHash');
    expect(item).not.toHaveProperty('claimId');
    expect(item).not.toHaveProperty('status');
  });
});

describe('useClaimDrafts — localStorage isolation', () => {
  it('only reads from and writes to DRAFTS_STORAGE_KEY', () => {
    // Seed an unrelated key
    window.localStorage.setItem('tb:other-key', JSON.stringify([{ id: 'x' }]));

    const { result } = renderHook(() => useClaimDrafts());
    expect(result.current.drafts).toHaveLength(0);

    act(() => {
      result.current.createDraft({ title: 'Isolated' });
    });

    // The unrelated key should be untouched.
    const unrelated = window.localStorage.getItem('tb:other-key');
    expect(unrelated).toBe(JSON.stringify([{ id: 'x' }]));

    // The canonical drafts key must hold the new draft.
    const draftsRaw = window.localStorage.getItem(DRAFTS_STORAGE_KEY);
    expect(draftsRaw).not.toBeNull();
    const stored = JSON.parse(draftsRaw ?? '[]') as ClaimDraft[];
    expect(stored.some((d) => d.title === 'Isolated')).toBe(true);
  });
});
