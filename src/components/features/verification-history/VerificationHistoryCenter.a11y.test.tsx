import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { VerificationHistoryCenter } from './VerificationHistoryCenter';
import type { VerificationHistoryData, VerificationHistoryEntry } from './model';

expect.extend(toHaveNoViolations);

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

describe('VerificationHistoryCenter accessibility', () => {
  it('has no accessibility violations in ready state', async () => {
    const { container } = render(<VerificationHistoryCenter {...baseProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in loading state', async () => {
    const { container } = render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'loading', entries: [] })} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in empty state', async () => {
    const { container } = render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'empty', entries: [] })} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in stale state', async () => {
    const { container } = render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'stale' })} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in offline state', async () => {
    const { container } = render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'offline' })} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in error state', async () => {
    const { container } = render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'error' })} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in denied state', async () => {
    const { container } = render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'denied', entries: [] })} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with reorg detected', async () => {
    const { container } = render(
      <VerificationHistoryCenter
        {...baseProps}
        data={createData({ entries: [{ ...baseEntry, id: 'v2', reorgStatus: 'detected' }] })}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with delayed indexing', async () => {
    const delayedEntry = {
      ...baseEntry,
      id: 'v2',
      outcome: 'settlement-pending' as const,
      freshness: {
        fetchedAt: baseEntry.freshness.fetchedAt,
        sourceUpdatedAt: baseEntry.freshness.sourceUpdatedAt,
        stale: true,
        delayedIndexing: true,
      },
    };
    const { container } = render(
      <VerificationHistoryCenter
        {...baseProps}
        data={createData({ entries: [delayedEntry] })}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with recovery unavailable', async () => {
    const { container } = render(<VerificationHistoryCenter {...baseProps} recoveryUnavailable />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper heading hierarchy', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/My verifications/);
  });

  it('has proper region labels', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    expect(screen.getByRole('region', { name: /Verification history entries/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Pending authorization/ })).toBeInTheDocument();
  });

  it('has accessible filter select', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    const select = screen.getByRole('combobox', { name: /Outcome/ });
    expect(select).toBeInTheDocument();
  });

  it('has live region for loading state', () => {
    render(<VerificationHistoryCenter {...baseProps} data={createData({ state: 'loading', entries: [] })} />);
    expect(screen.getByText(/Loading verification history/)).toBeInTheDocument();
  });

  it('has alert for rejected entries', () => {
    render(<VerificationHistoryCenter {...baseProps} data={createData({ rejectedCount: 1 })} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has alert for reorg detected', () => {
    render(
      <VerificationHistoryCenter
        {...baseProps}
        data={createData({ entries: [{ ...baseEntry, id: 'v2', reorgStatus: 'detected' }] })}
      />
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has status for delayed indexing', () => {
    const delayedEntry = {
      ...baseEntry,
      id: 'v2',
      outcome: 'settlement-pending' as const,
      source: { kind: 'api-projection' as const, receivedAt: Date.now(), freshness: 'unknown' },
      freshness: {
        fetchedAt: baseEntry.freshness.fetchedAt,
        sourceUpdatedAt: baseEntry.freshness.sourceUpdatedAt,
        stale: true,
        delayedIndexing: true,
      },
    };
    render(
      <VerificationHistoryCenter
        {...baseProps}
        data={createData({ entries: [delayedEntry] })}
      />
    );
    expect(screen.getByText(/Delayed indexing/)).toBeInTheDocument();
  });

  it('links have accessible names', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    const link = screen.getByRole('link', { name: /View claim/ });
    expect(link).toBeInTheDocument();
  });

  it('buttons have accessible names', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    expect(screen.getByRole('button', { name: /Refresh references/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review withdrawal/ })).toBeInTheDocument();
  });

  it('time elements have proper datetime attributes', () => {
    render(<VerificationHistoryCenter {...baseProps} />);
    const timeElements = screen.getAllByRole('time');
    expect(timeElements.length).toBeGreaterThan(0);
    timeElements.forEach((time) => {
      expect(time).toHaveAttribute('dateTime');
    });
  });
});