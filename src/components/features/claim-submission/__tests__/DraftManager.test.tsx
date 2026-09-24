/**
 * Component tests for DraftManager
 *
 * V2-FE-105: Local Drafts Without Fabricated Protocol State
 *
 * Coverage:
 *  - Empty state rendering (aria-live, data-testid)
 *  - Loading state rendering (spinner, aria status)
 *  - Draft list rendering (count, titles, evidence count)
 *  - Stale badge display
 *  - Restore callback invoked with correct draft
 *  - Delete callback invoked with correct id
 *  - Accessibility: aria-labels, roles, heading
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DraftManager from '@/components/features/claim-submission/DraftManager';
import type {
  AnnotatedClaimDraft,
  ClaimDraft,
} from '@/hooks/useClaimDrafts';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeAnnotatedDraft(
  overrides: Partial<AnnotatedClaimDraft> = {},
): AnnotatedClaimDraft {
  return {
    id: 'draft-1',
    title: 'Test Claim Draft',
    category: 'Politics',
    impact: 'High',
    source: 'https://example.com',
    description: 'A detailed description.',
    evidence: [],
    savedAt: new Date().toISOString(),
    isStale: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('DraftManager — empty state', () => {
  it('renders the empty state message when no drafts exist', () => {
    render(
      <DraftManager
        drafts={[]}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByTestId('draft-manager-empty')).toBeInTheDocument();
    expect(
      screen.getByText(/no saved drafts yet/i),
    ).toBeInTheDocument();
  });

  it('empty state has role="status" for AT announcement', () => {
    render(
      <DraftManager
        drafts={[]}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(
      screen.getByRole('status', { name: /no saved drafts yet/i }),
    ).toBeInTheDocument();
  });

  it('does NOT render the draft list when empty', () => {
    render(
      <DraftManager
        drafts={[]}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('draft-list')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('DraftManager — loading state', () => {
  it('renders the loading indicator when isLoading=true', () => {
    render(
      <DraftManager
        drafts={[]}
        isLoading
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByTestId('draft-manager-loading')).toBeInTheDocument();
    expect(screen.getByText(/loading drafts/i)).toBeInTheDocument();
  });

  it('loading indicator has role="status"', () => {
    render(
      <DraftManager
        drafts={[]}
        isLoading
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does NOT render the empty-state message while loading', () => {
    render(
      <DraftManager
        drafts={[]}
        isLoading
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('draft-manager-empty')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// List rendering
// ---------------------------------------------------------------------------

describe('DraftManager — draft list', () => {
  it('renders a list item for each draft', () => {
    const drafts = [
      makeAnnotatedDraft({ id: 'd1', title: 'Alpha' }),
      makeAnnotatedDraft({ id: 'd2', title: 'Beta' }),
    ];
    render(
      <DraftManager
        drafts={drafts}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getAllByTestId('draft-item')).toHaveLength(2);
  });

  it('displays the draft title in each row', () => {
    const drafts = [makeAnnotatedDraft({ id: 'd1', title: 'Specific Title' })];
    render(
      <DraftManager
        drafts={drafts}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('Specific Title')).toBeInTheDocument();
  });

  it('shows "(untitled draft)" when title is empty', () => {
    const drafts = [makeAnnotatedDraft({ id: 'd1', title: '' })];
    render(
      <DraftManager
        drafts={drafts}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('(untitled draft)')).toBeInTheDocument();
  });

  it('shows evidence item count when evidence is present', () => {
    const drafts = [
      makeAnnotatedDraft({
        id: 'd1',
        evidence: [
          { id: 'e1', uri: 'https://example.com/1' },
          { id: 'e2', uri: 'https://example.com/2' },
        ],
      }),
    ];
    render(
      <DraftManager
        drafts={drafts}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText(/2 evidence items/i)).toBeInTheDocument();
  });

  it('does NOT show evidence count when there is no evidence', () => {
    const drafts = [makeAnnotatedDraft({ id: 'd1', evidence: [] })];
    render(
      <DraftManager
        drafts={drafts}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByText(/evidence item/i)).not.toBeInTheDocument();
  });

  it('shows the draft count summary', () => {
    const drafts = [
      makeAnnotatedDraft({ id: 'd1' }),
      makeAnnotatedDraft({ id: 'd2' }),
    ];
    render(
      <DraftManager
        drafts={drafts}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText(/2 drafts saved locally/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Stale flag
// ---------------------------------------------------------------------------

describe('DraftManager — stale badge', () => {
  it('shows stale badge for stale drafts', () => {
    const drafts = [makeAnnotatedDraft({ id: 'd1', isStale: true })];
    render(
      <DraftManager
        drafts={drafts}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('· stale')).toBeInTheDocument();
  });

  it('does NOT show stale badge for fresh drafts', () => {
    const drafts = [makeAnnotatedDraft({ id: 'd1', isStale: false })];
    render(
      <DraftManager
        drafts={drafts}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByText('· stale')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Restore action
// ---------------------------------------------------------------------------

describe('DraftManager — restore', () => {
  it('calls onRestore with the correct draft when Restore is clicked', () => {
    const draft = makeAnnotatedDraft({ id: 'restore-me', title: 'Restore Target' });
    const onRestore = jest.fn();
    render(
      <DraftManager
        drafts={[draft]}
        onRestore={onRestore}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('draft-restore-button'));
    expect(onRestore).toHaveBeenCalledTimes(1);
    // The callback receives the draft object (without internal isStale annotation).
    const received: ClaimDraft = onRestore.mock.calls[0][0];
    expect(received.id).toBe('restore-me');
  });

  it('Restore button has an accessible aria-label including the draft title', () => {
    const draft = makeAnnotatedDraft({ id: 'd1', title: 'My Important Draft' });
    render(
      <DraftManager
        drafts={[draft]}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /restore draft: my important draft/i }),
    ).toBeInTheDocument();
  });

  it('Restore button for untitled draft has a clear aria-label', () => {
    const draft = makeAnnotatedDraft({ id: 'd1', title: '' });
    render(
      <DraftManager
        drafts={[draft]}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /restore draft: \(untitled draft\)/i }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Delete action
// ---------------------------------------------------------------------------

describe('DraftManager — delete', () => {
  it('calls onDelete with the correct draft id when Delete is clicked', () => {
    const draft = makeAnnotatedDraft({ id: 'delete-target', title: 'Deleteable' });
    const onDelete = jest.fn();
    render(
      <DraftManager
        drafts={[draft]}
        onRestore={jest.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByTestId('draft-delete-button'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('delete-target');
  });

  it('Delete button has an accessible aria-label including the draft title', () => {
    const draft = makeAnnotatedDraft({ id: 'd1', title: 'Target Draft' });
    render(
      <DraftManager
        drafts={[draft]}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /delete draft: target draft/i }),
    ).toBeInTheDocument();
  });

  it('each draft row has separate Restore and Delete buttons', () => {
    const drafts = [
      makeAnnotatedDraft({ id: 'd1', title: 'First' }),
      makeAnnotatedDraft({ id: 'd2', title: 'Second' }),
    ];
    render(
      <DraftManager
        drafts={drafts}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getAllByTestId('draft-restore-button')).toHaveLength(2);
    expect(screen.getAllByTestId('draft-delete-button')).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('DraftManager — accessibility', () => {
  it('renders with a section landmark and accessible heading', () => {
    render(
      <DraftManager
        drafts={[]}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    // The section is labelled by its heading
    expect(
      screen.getByRole('region', { name: /saved drafts/i }),
    ).toBeInTheDocument();
  });

  it('draft list has role="list" and aria-label', () => {
    const drafts = [makeAnnotatedDraft({ id: 'd1' })];
    render(
      <DraftManager
        drafts={drafts}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(
      screen.getByRole('list', { name: /saved drafts/i }),
    ).toBeInTheDocument();
  });

  it('each draft item has role="listitem"', () => {
    const drafts = [
      makeAnnotatedDraft({ id: 'd1' }),
      makeAnnotatedDraft({ id: 'd2' }),
    ];
    render(
      <DraftManager
        drafts={drafts}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders the DraftManager root with data-testid for integration tests', () => {
    render(
      <DraftManager
        drafts={[]}
        onRestore={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByTestId('draft-manager')).toBeInTheDocument();
  });
});
