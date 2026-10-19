import { render, screen, fireEvent } from '@testing-library/react';
import { VerificationHistoryCenter } from './VerificationHistoryCenter';
import type { VerificationHistoryData, VerificationHistoryEntry } from './model';

const baseEntry: VerificationHistoryEntry = {
  id: 'v1',
  claimId: '0x1234567890abcdef1234567890abcdef12345678',
  title: 'Test Claim',
  outcome: 'finalized',
  amount: '0.5',
  asset: '0x0000000000000000000000000000000000000000',
  source: { kind: 'contract', block: '12345678', finality: 'finalized' },
  submittedAtIso: '2026-01-15T10:00:00Z',
  finalizedAtIso: '2026-01-17T10:00:00Z',
  reorgStatus: 'none',
  freshness: {
    fetchedAt: '2026-01-20T10:00:00Z',
    sourceUpdatedAt: '2026-01-17T10:00:00Z',
    stale: false,
  },
};

const createData = (overrides: Partial<VerificationHistoryData> = {}): VerificationHistoryData => ({
  state: 'ready',
  entries: [baseEntry],
  receivedAt: Date.now(),
  rejectedCount: 0,
  ...overrides,
});

const baseProps = {
  data: createData(),
  onRefresh: jest.fn(),
};

describe('VerificationHistoryCenter', () => {
  it('renders summary cards for first four outcomes', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    // Summary card headings use capitalize CSS, so they appear as "Finalized", "Settlement Pending", etc.
    // Use getAllByText and check the first one (summary card) since entries also have badges
    const finalizedElements = screen.getAllByText('Finalized');
    const settlementPendingElements = screen.getAllByText('Settlement Pending');
    const awaitingRevealElements = screen.getAllByText('Awaiting Reveal');
    const rewardElements = screen.getAllByText('Reward');
    expect(finalizedElements.length).toBeGreaterThanOrEqual(1);
    expect(settlementPendingElements.length).toBeGreaterThanOrEqual(1);
    expect(awaitingRevealElements.length).toBeGreaterThanOrEqual(1);
    expect(rewardElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows entry count in summary cards for matching outcomes', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    // The finalized summary card shows the amount (0.5) since there's 1 entry with amount
    // The entry also shows 0.5, so there are two elements with 0.5
    expect(screen.getAllByText('0.5')).toHaveLength(2);
  });

  it('renders verification history entries', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    expect(screen.getByText('Test Claim')).toBeInTheDocument();
    expect(screen.getAllByText('0.5')).toHaveLength(2); // One in summary card, one in entry
  });

  it('shows contract source label', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    expect(screen.getByText(/Contract read · finalized · block 12345678/)).toBeInTheDocument();
  });

  it('shows link to claim detail', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    const link = screen.getByRole('link', { name: /View claim/ });
    expect(link).toHaveAttribute('href', '/claims/0x1234567890abcdef1234567890abcdef12345678');
  });

  it('filters entries by outcome', () => {
    const data = createData({
      entries: [
        baseEntry,
        { ...baseEntry, id: 'v2', outcome: 'reward', title: 'Reward Claim' },
      ],
    });
    render(<VerificationHistoryCenter {...baseProps} data={data} />);

    const select = screen.getByRole('combobox', { name: /Outcome/ });
    fireEvent.change(select, { target: { value: 'reward' } });

    expect(screen.getByText('Reward Claim')).toBeInTheDocument();
    expect(screen.queryByText('Test Claim')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'loading', entries: [] })} />);
    expect(screen.getByText(/Loading verification history/)).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'empty', entries: [] })} />);
    expect(screen.getByText('No entries for this outcome.')).toBeInTheDocument();
  });

  it('shows stale state notice', () => {
    render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'stale' })} />);
    expect(screen.getByText(/Stale API projection/)).toBeInTheDocument();
  });

  it('shows offline state notice', () => {
    render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'offline' })} />);
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
  });

  it('shows unavailable state notice', () => {
    render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'unavailable' })} />);
    expect(screen.getByText(/Data unavailable/)).toBeInTheDocument();
  });

  it('shows error state notice', () => {
    render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'error' })} />);
    expect(screen.getByText(/Reward projection could not be loaded/)).toBeInTheDocument();
  });

  it('shows denied state notice', () => {
    render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'denied', entries: [] })} />);
    expect(screen.getByText(/Connect the intended wallet/)).toBeInTheDocument();
  });

  it('shows delayed indexing warning', () => {
    const data = createData({
      entries: [
        { ...baseEntry, id: 'v2', outcome: 'settlement-pending', freshness: { ...baseEntry.freshness, delayedIndexing: true, stale: true } },
      ],
    });
    render(<VerificationHistoryCenter {...baseProps} data={data} />);
    expect(screen.getByText(/Delayed indexing/)).toBeInTheDocument();
  });

  it('shows reorg detected alert', () => {
    const data = createData({
      entries: [{ ...baseEntry, id: 'v2', reorgStatus: 'detected' }],
    });
    render(<VerificationHistoryCenter {...baseProps} data={data} />);
    expect(screen.getByText(/Reorg detected/)).toBeInTheDocument();
  });

  it('shows reorg reconciled notice', () => {
    const data = createData({
      entries: [{ ...baseEntry, id: 'v2', reorgStatus: 'reconciled' }],
    });
    render(<VerificationHistoryCenter {...baseProps} data={data} />);
    expect(screen.getByText(/Reorg reconciled/)).toBeInTheDocument();
  });

  it('shows recovery unavailable message', () => {
    render(<VerificationHistoryCenter {...baseProps} recoveryUnavailable />);
    expect(screen.getByText(/Browser recovery storage is unavailable/)).toBeInTheDocument();
  });

  it('shows no saved references message', () => {
    render(<VerificationHistoryCenter {...baseProps} transactions={[]} />);
    expect(screen.getByText('No saved transaction references in this browser.')).toBeInTheDocument();
  });

  it('disables refresh button when refreshingDisabled', () => {
    render(<VerificationHistoryCenter {...baseProps} refreshingDisabled />);
    const button = screen.getByRole('button', { name: /Refresh references/ });
    expect(button).toBeDisabled();
  });

  it('calls onRefresh when refresh button clicked', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    const button = screen.getByRole('button', { name: /Refresh references/ });
    fireEvent.click(button);
    expect(baseProps.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows rejected count warning', () => {
    render(<VerificationHistoryCenter {...baseProps} data={createData({ rejectedCount: 2 })} />);
    expect(screen.getByText(/Some projection entries were rejected as invalid/)).toBeInTheDocument();
  });

  it('shows withdrawn withdrawal button as disabled with reason', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    const button = screen.getByRole('button', { name: /Review withdrawal/ });
    expect(button).toBeDisabled();
    expect(screen.getByText(/Withdrawal unavailable/)).toBeInTheDocument();
  });

  it('renders transaction references when provided', () => {
    const mockRecord = {
      id: 'tx1',
      label: 'Test Transaction',
      source: 'local-reference' as const,
      state: {
        status: 'confirmed' as const,
        chainId: 10,
        blockNumber: 123,
        confirmations: 5,
        txHash: '0xabc',
        replacedBy: null,
      },
    };
    render(<VerificationHistoryCenter {...baseProps} transactions={[mockRecord]} />);
    expect(screen.getByText('Test Transaction')).toBeInTheDocument();
    // The chain name is rendered as "Optimism Mainnet · Local recovery reference"
    expect(screen.getByText(/Optimism Mainnet/)).toBeInTheDocument();
  });
});