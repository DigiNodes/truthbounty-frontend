import type { Meta, StoryObj } from '@storybook/react';
import { VerificationHistoryCenter } from './VerificationHistoryCenter';
import {
  type VerificationHistoryData,
  type VerificationHistoryEntry,
} from './model';

const meta: Meta<typeof VerificationHistoryCenter> = {
  title: 'Features/Verification History/VerificationHistoryCenter',
  component: VerificationHistoryCenter,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onRefresh: { action: 'refresh' },
  },
};

export default meta;
type Story = StoryObj<typeof VerificationHistoryCenter>;

const baseEntry: VerificationHistoryEntry = {
  id: 'v1',
  claimId: '0x1234567890abcdef1234567890abcdef12345678',
  title: 'Breaking: Major Protocol Upgrade Announced',
  outcome: 'finalized',
  amount: '0.5',
  asset: '0x0000000000000000000000000000000000000000',
  source: {
    kind: 'contract',
    block: '12345678',
    finality: 'finalized',
  },
  submittedAtIso: '2026-01-15T10:00:00Z',
  finalizedAtIso: '2026-01-17T10:00:00Z',
  reorgStatus: 'none',
  freshness: {
    fetchedAt: '2026-01-20T10:00:00Z',
    sourceUpdatedAt: '2026-01-17T10:00:00Z',
    stale: false,
  },
};

const createEntries = (overrides: Partial<VerificationHistoryEntry>[]): VerificationHistoryEntry[] =>
  overrides.map((o, i) => ({ ...baseEntry, id: `v${i + 1}`, ...o }));

const baseData: VerificationHistoryData = {
  state: 'ready',
  entries: createEntries([
    { outcome: 'finalized', title: 'Protocol Upgrade', amount: '0.5' },
    { outcome: 'reward', title: 'Security Audit', amount: '0.2', source: { kind: 'api-projection', receivedAt: Date.now() - 5000, freshness: 'unknown' }, finalizedAtIso: '2026-01-18T10:00:00Z' },
    { outcome: 'settlement-pending', title: 'TVL Milestone', amount: '0.3', source: { kind: 'api-projection', receivedAt: Date.now() - 2000, freshness: 'projection-lag' }, freshness: { fetchedAt: new Date().toISOString(), stale: true, delayedIndexing: true } },
    { outcome: 'slashed', title: 'Governance Proposal', amount: '0.1', reorgStatus: 'reconciled', replacedBy: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' },
    { outcome: 'awaiting-reveal', title: 'Stablecoin Launch', amount: null, source: { kind: 'api-projection', receivedAt: Date.now() - 1000, freshness: 'unknown' } },
    { outcome: 'missed-deadline', title: 'Bridge Hack', amount: '0' },
    { outcome: 'unavailable-reward', title: 'Sequencer Downtime', amount: '0.15', source: { kind: 'api-projection', receivedAt: Date.now() - 3000, freshness: 'stale' }, reorgStatus: 'detected', freshness: { fetchedAt: new Date().toISOString(), stale: true, delayedIndexing: true } },
  ]),
  receivedAt: Date.now(),
  rejectedCount: 0,
};

export const Ready: Story = {
  args: {
    data: baseData,
    onRefresh: () => console.log('refresh'),
  },
};

export const Loading: Story = {
  args: {
    data: { ...baseData, state: 'loading', entries: [] },
  },
};

export const Empty: Story = {
  args: {
    data: { ...baseData, state: 'empty', entries: [] },
  },
};

export const Stale: Story = {
  args: {
    data: { ...baseData, state: 'stale' },
  },
};

export const Offline: Story = {
  args: {
    data: { ...baseData, state: 'offline' },
  },
};

export const Unavailable: Story = {
  args: {
    data: { ...baseData, state: 'unavailable' },
  },
};

export const Error: Story = {
  args: {
    data: { ...baseData, state: 'error' },
  },
};

export const Denied: Story = {
  args: {
    data: { ...baseData, state: 'denied', entries: [] },
  },
};

export const WithReorgDetected: Story = {
  args: {
    data: {
      ...baseData,
      entries: createEntries([
        { outcome: 'finalized', title: 'Protocol Upgrade', amount: '0.5', reorgStatus: 'detected' },
        { outcome: 'reward', title: 'Security Audit', amount: '0.2', source: { kind: 'api-projection', receivedAt: Date.now() - 5000, freshness: 'unknown' }, reorgStatus: 'detected' },
      ]),
    },
  },
};

export const WithDelayedIndexing: Story = {
  args: {
    data: {
      ...baseData,
      entries: createEntries([
        { outcome: 'settlement-pending', title: 'TVL Milestone', amount: '0.3', source: { kind: 'api-projection', receivedAt: Date.now() - 2000, freshness: 'projection-lag' }, freshness: { fetchedAt: new Date().toISOString(), stale: true, delayedIndexing: true } },
        { outcome: 'unavailable-reward', title: 'Sequencer Downtime', amount: '0.15', source: { kind: 'api-projection', receivedAt: Date.now() - 3000, freshness: 'stale' }, freshness: { fetchedAt: new Date().toISOString(), stale: true, delayedIndexing: true } },
      ]),
    },
  },
};

export const WithRecoveryUnavailable: Story = {
  args: {
    data: baseData,
    recoveryUnavailable: true,
  },
};

export const RefreshingDisabled: Story = {
  args: {
    data: baseData,
    refreshingDisabled: true,
    onRefresh: () => console.log('refresh'),
  },
};

export const AllOutcomesFiltered: Story = {
  args: {
    data: baseData,
  },
  play: async ({ canvasElement }) => {
    // Test filtering by outcome
    const select = canvasElement.querySelector('select') as HTMLSelectElement;
    if (select) {
      select.value = 'finalized';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  },
};