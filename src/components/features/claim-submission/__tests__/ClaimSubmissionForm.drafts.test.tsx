/**
 * ClaimSubmissionForm — draft auto-save, restore, and evidence attachment tests.
 *
 * V2-FE-105: Local Drafts Without Fabricated Protocol State
 *
 * Coverage:
 *  - Draft manager toggle shows/hides the panel
 *  - Draft auto-saved to localStorage on field change (after debounce)
 *  - Draft-restored banner appears after restore
 *  - Successful submit discards the draft from localStorage
 *  - Evidence: add item (valid uri), remove item, URI validation errors,
 *    digest validation errors, label is optional
 *  - No protocol state (txHash, claimId) stored in draft
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DRAFTS_STORAGE_KEY } from '@/hooks/useClaimDrafts';
import type { ClaimDraft } from '@/hooks/useClaimDrafts';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Keep a stable mock for the createDraft function so we can observe draft ids.
const mockCreateDraft = jest.fn(() => 'mock-draft-id');
const mockSaveDraft = jest.fn((id: string, fields: Partial<ClaimDraft>) => ({
  id,
  ...fields,
  savedAt: new Date().toISOString(),
}));
const mockDeleteDraft = jest.fn();
let mockDrafts: import('@/hooks/useClaimDrafts').AnnotatedClaimDraft[] = [];

jest.mock('@/hooks/useClaimDrafts', () => ({
  ...jest.requireActual('@/hooks/useClaimDrafts'),
  useClaimDrafts: () => ({
    drafts: mockDrafts,
    isLoading: false,
    createDraft: mockCreateDraft,
    saveDraft: mockSaveDraft,
    deleteDraft: mockDeleteDraft,
    getDraft: jest.fn(),
    clearAllDrafts: jest.fn(),
  }),
}));

// Wagmi hooks
let mockAccount: { address: `0x${string}`; displayName: string; chainId: number } | null = null;
const mockMutateAsync = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn();
const mockConnectors = [{ id: 'injected', name: 'Injected', type: 'injected' }];

jest.mock('@/hooks/useAccount', () => ({
  useAccount: () => mockAccount,
}));

jest.mock('@/components/hooks/useTrust', () => ({
  useTrust: () => ({
    reputation: 100,
    accountAgeDays: 365,
    isVerified: true,
    suspicious: false,
  }),
}));

jest.mock('@/components/ui/TrustScoreTooltip', () => ({
  __esModule: true,
  default: () => <span data-testid="trust-tooltip" />,
}));

jest.mock('@/app/queries/claims.queries', () => ({
  useSubmitClaim: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

jest.mock('wagmi', () => ({
  useConnect: () => ({ connect: mockConnect, connectors: mockConnectors }),
  useChainId: () => 11155420,
  usePublicClient: () => ({}),
  useReadContract: () => ({ data: undefined }),
  useWriteContract: () => ({ writeContractAsync: jest.fn() }),
}));

import ClaimSubmissionForm from '../ClaimSubmissionForm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONNECTED = {
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`,
  displayName: '0xf39F…2266',
  chainId: 11155420,
};

function fillValidForm() {
  fireEvent.change(screen.getByPlaceholderText('Title'), {
    target: { value: 'A valid claim title' },
  });
  fireEvent.change(screen.getByPlaceholderText('Category'), {
    target: { value: 'Technology' },
  });
  fireEvent.change(screen.getByPlaceholderText('Impact'), {
    target: { value: 'Medium' },
  });
  fireEvent.change(screen.getByPlaceholderText('https://example.com'), {
    target: { value: 'https://example.com/source' },
  });
  fireEvent.change(screen.getByPlaceholderText('Description'), {
    target: { value: 'This is a sufficiently long description.' },
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockAccount = null;
  mockDrafts = [];
  mockConnect.mockReset();
  mockMutateAsync.mockReset().mockResolvedValue(undefined);
  mockCreateDraft.mockReturnValue('mock-draft-id');
  mockSaveDraft.mockClear();
  mockDeleteDraft.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Draft manager toggle
// ---------------------------------------------------------------------------

describe('ClaimSubmissionForm — draft manager toggle', () => {
  it('shows the Drafts toggle button', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    expect(screen.getByTestId('draft-manager-toggle')).toBeInTheDocument();
  });

  it('hides the DraftManager panel by default', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    expect(screen.queryByTestId('draft-manager')).not.toBeInTheDocument();
  });

  it('shows the DraftManager panel after clicking the toggle', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    fireEvent.click(screen.getByTestId('draft-manager-toggle'));
    expect(screen.getByTestId('draft-manager')).toBeInTheDocument();
  });

  it('hides the DraftManager panel after clicking the toggle twice', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    fireEvent.click(screen.getByTestId('draft-manager-toggle'));
    fireEvent.click(screen.getByTestId('draft-manager-toggle'));
    expect(screen.queryByTestId('draft-manager')).not.toBeInTheDocument();
  });

  it('toggle button has aria-expanded=false initially', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    const btn = screen.getByTestId('draft-manager-toggle');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggle button has aria-expanded=true when panel is open', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    fireEvent.click(screen.getByTestId('draft-manager-toggle'));
    const btn = screen.getByTestId('draft-manager-toggle');
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });
});

// ---------------------------------------------------------------------------
// Draft auto-save
// ---------------------------------------------------------------------------

describe('ClaimSubmissionForm — draft auto-save', () => {
  it('creates a new draft on mount', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    expect(mockCreateDraft).toHaveBeenCalledTimes(1);
  });

  it('calls saveDraft after typing (debounce flush)', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'Auto-save test' },
    });

    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      // saveDraft is called on mount + after debounce
      expect(mockSaveDraft).toHaveBeenCalledWith(
        'mock-draft-id',
        expect.objectContaining({ title: 'Auto-save test' }),
      );
    });
  });

  it('draft save payload does NOT contain txHash, claimId, or status', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'No protocol leakage' },
    });

    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(mockSaveDraft).toHaveBeenCalled();
    });

    const calls = mockSaveDraft.mock.calls;
    calls.forEach(([_id, fields]) => {
      expect(fields).not.toHaveProperty('txHash');
      expect(fields).not.toHaveProperty('claimId');
      expect(fields).not.toHaveProperty('status');
      expect(fields).not.toHaveProperty('rewards');
    });
  });
});

// ---------------------------------------------------------------------------
// Draft restore banner
// ---------------------------------------------------------------------------

describe('ClaimSubmissionForm — draft restore', () => {
  it('shows the restored banner after restoring a draft', () => {
    const draft: import('@/hooks/useClaimDrafts').AnnotatedClaimDraft = {
      id: 'restored-draft',
      title: 'Restored Title',
      category: 'Science',
      impact: 'Low',
      source: 'https://restored.example.com',
      description: 'Restored description text.',
      evidence: [],
      savedAt: new Date().toISOString(),
      isStale: false,
    };
    mockDrafts = [draft];

    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    // Open the manager
    fireEvent.click(screen.getByTestId('draft-manager-toggle'));

    // Click the Restore button for the draft
    fireEvent.click(screen.getByRole('button', { name: /restore draft: restored title/i }));

    expect(screen.getByTestId('draft-restored-banner')).toBeInTheDocument();
    expect(screen.getByText(/draft restored/i)).toBeInTheDocument();
  });

  it('restores form field values from the draft', () => {
    const draft: import('@/hooks/useClaimDrafts').AnnotatedClaimDraft = {
      id: 'field-restore',
      title: 'Restored Title',
      category: 'Science',
      impact: 'Low',
      source: 'https://restored.example.com',
      description: 'Restored description text.',
      evidence: [],
      savedAt: new Date().toISOString(),
      isStale: false,
    };
    mockDrafts = [draft];

    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    fireEvent.click(screen.getByTestId('draft-manager-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /restore draft: restored title/i }));

    expect(screen.getByDisplayValue('Restored Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Science')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://restored.example.com')).toBeInTheDocument();
  });

  it('dismissing the restored banner removes it', () => {
    const draft: import('@/hooks/useClaimDrafts').AnnotatedClaimDraft = {
      id: 'dismiss-test',
      title: 'Dismiss Banner',
      category: 'Tech',
      impact: 'High',
      source: 'https://example.com',
      description: 'Some description here.',
      evidence: [],
      savedAt: new Date().toISOString(),
      isStale: false,
    };
    mockDrafts = [draft];

    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    fireEvent.click(screen.getByTestId('draft-manager-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /restore draft: dismiss banner/i }));

    expect(screen.getByTestId('draft-restored-banner')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /dismiss draft restored/i }));
    expect(screen.queryByTestId('draft-restored-banner')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Draft discard on successful submit
// ---------------------------------------------------------------------------

describe('ClaimSubmissionForm — discard draft on submit', () => {
  it('calls deleteDraft with the current draft id after a successful submit', async () => {
    mockAccount = CONNECTED;
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fillValidForm();
    fireEvent.submit(screen.getByTestId('submit-claim-button').closest('form')!);

    await waitFor(() => {
      expect(mockDeleteDraft).toHaveBeenCalledWith('mock-draft-id');
    });
  });

  it('does NOT call deleteDraft when submit fails', async () => {
    mockAccount = CONNECTED;
    mockMutateAsync.mockRejectedValueOnce(new Error('API error'));

    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    fillValidForm();

    fireEvent.submit(screen.getByTestId('submit-claim-button').closest('form')!);

    await waitFor(() => {
      expect(screen.getByTestId('submit-error')).toBeInTheDocument();
    });

    expect(mockDeleteDraft).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Evidence section
// ---------------------------------------------------------------------------

describe('ClaimSubmissionForm — evidence section', () => {
  it('renders the evidence section fieldset', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    expect(screen.getByTestId('evidence-section')).toBeInTheDocument();
  });

  it('renders the evidence URI input', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    expect(screen.getByTestId('evidence-uri-input')).toBeInTheDocument();
  });

  it('renders the evidence digest input (optional)', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    expect(screen.getByTestId('evidence-digest-input')).toBeInTheDocument();
  });

  it('renders the Add evidence button', () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    expect(screen.getByTestId('add-evidence-button')).toBeInTheDocument();
  });

  it('adds an evidence item with a valid https URI', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fireEvent.change(screen.getByTestId('evidence-uri-input'), {
      target: { value: 'https://example.com/evidence.pdf' },
    });
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      expect(screen.getByTestId('evidence-item')).toBeInTheDocument();
    });
    expect(screen.getByTestId('evidence-uri')).toHaveTextContent(
      'https://example.com/evidence.pdf',
    );
  });

  it('adds an evidence item with a valid ipfs URI', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fireEvent.change(screen.getByTestId('evidence-uri-input'), {
      target: { value: 'ipfs://QmFakeHashAbc' },
    });
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      expect(screen.getByTestId('evidence-item')).toBeInTheDocument();
    });
    expect(screen.getByTestId('evidence-uri')).toHaveTextContent('ipfs://QmFakeHashAbc');
  });

  it('clears the URI input after adding an item', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    const uriInput = screen.getByTestId('evidence-uri-input');

    fireEvent.change(uriInput, {
      target: { value: 'https://example.com/doc' },
    });
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      expect((uriInput as HTMLInputElement).value).toBe('');
    });
  });

  it('removes an evidence item when the remove button is clicked', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fireEvent.change(screen.getByTestId('evidence-uri-input'), {
      target: { value: 'https://example.com/remove-me' },
    });
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      expect(screen.getByTestId('evidence-item')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('evidence-remove-button'));
    expect(screen.queryByTestId('evidence-item')).not.toBeInTheDocument();
  });

  it('shows a URI validation error for an invalid URI', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fireEvent.change(screen.getByTestId('evidence-uri-input'), {
      target: { value: 'not-a-valid-uri' },
    });
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      expect(screen.getByTestId('evidence-uri-error')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('evidence-item')).not.toBeInTheDocument();
  });

  it('shows a URI validation error for an unsupported scheme (ftp://)', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fireEvent.change(screen.getByTestId('evidence-uri-input'), {
      target: { value: 'ftp://example.com/file' },
    });
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      expect(screen.getByTestId('evidence-uri-error')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-uri-error')).toHaveTextContent(
        /only https:\/\/ or ipfs:\/\//i,
      );
    });
  });

  it('shows a URI error when the URI contains sensitive query params', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fireEvent.change(screen.getByTestId('evidence-uri-input'), {
      target: { value: 'https://example.com?password=secret123' },
    });
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      expect(screen.getByTestId('evidence-uri-error')).toBeInTheDocument();
    });
  });

  it('shows a digest validation error for an invalid hex string', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fireEvent.change(screen.getByTestId('evidence-uri-input'), {
      target: { value: 'https://example.com/valid' },
    });
    fireEvent.change(screen.getByTestId('evidence-digest-input'), {
      target: { value: 'not-hex!!' },
    });
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      expect(screen.getByTestId('evidence-digest-error')).toBeInTheDocument();
    });
  });

  it('accepts a digest with correct 64-char hex (SHA-256)', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fireEvent.change(screen.getByTestId('evidence-uri-input'), {
      target: { value: 'https://example.com/sha256doc' },
    });
    fireEvent.change(screen.getByTestId('evidence-digest-input'), {
      target: { value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    });
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      expect(screen.getByTestId('evidence-item')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('evidence-digest-error')).not.toBeInTheDocument();
  });

  it('allows the label field to be empty (optional)', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fireEvent.change(screen.getByTestId('evidence-uri-input'), {
      target: { value: 'https://example.com/no-label' },
    });
    // Leave label empty
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      expect(screen.getByTestId('evidence-item')).toBeInTheDocument();
    });
  });

  it('evidence items accumulate (multiple adds)', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    const uriInput = screen.getByTestId('evidence-uri-input');

    fireEvent.change(uriInput, { target: { value: 'https://example.com/1' } });
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      expect(screen.getAllByTestId('evidence-item')).toHaveLength(1);
    });

    fireEvent.change(uriInput, { target: { value: 'https://example.com/2' } });
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      expect(screen.getAllByTestId('evidence-item')).toHaveLength(2);
    });
  });

  it('evidence list is saved to draft when items are added', async () => {
    render(<ClaimSubmissionForm onClose={jest.fn()} />);

    fireEvent.change(screen.getByTestId('evidence-uri-input'), {
      target: { value: 'https://example.com/evidence-save' },
    });
    fireEvent.click(screen.getByTestId('add-evidence-button'));

    await waitFor(() => {
      const calls = mockSaveDraft.mock.calls;
      const withEvidence = calls.find(
        ([_id, fields]) =>
          Array.isArray(fields.evidence) && fields.evidence.length > 0,
      );
      expect(withEvidence).toBeDefined();
    });
  });
});
