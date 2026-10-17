import type { Meta, StoryObj } from '@storybook/react';
import { AdminAuditTrailView } from './AdminAuditTrailView';
import type { UseAdminAuditTrailReturn } from '@/hooks/useAdminAuditTrail';
import type { AdminAuditDetailedRecord } from '@/app/types/admin-audit';

const meta: Meta<typeof AdminAuditTrailView> = {
  title: 'Features/AdminAudit/AdminAuditTrailView',
  component: AdminAuditTrailView,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof AdminAuditTrailView>;

const mockAuditRecords: AdminAuditDetailedRecord[] = [
  {
    auditId: 'AUD-2026-0327-01',
    actor: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    capability: 'PROTOCOL_OPERATOR',
    authoritySource: 'Optimism L2 Registry',
    action: 'Replay Failed Event Indexer Batch #4408',
    targetResource: 'Indexer Ingestion Pipeline',
    requestSummary: 'Batch replay requested due to transient L2 RPC gateway timeout during reorg.',
    resultSummary: 'Re-ingested 18 missed dispute events without state overwrite.',
    beforeRef: '0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    afterRef: '0xb2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1',
    txHash: '0x3a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6071829',
    timestamp: '2026-03-27T08:14:00Z',
    lifecycleState: 'confirmed',
    blockNumber: 12345678,
    details: 'Cryptographic receipt confirmed on Optimism Sepolia sequencer.',
  },
  {
    auditId: 'AUD-2026-0327-02',
    actor: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    capability: 'AUDIT_ADMIN',
    authoritySource: 'Verified Release Manifest',
    action: 'Verify Release Artifact Checksum Integrity',
    targetResource: 'manifest.json & parameters/11155420.json',
    requestSummary: 'Automated checksum audit validation for deployment release v2.4.0.',
    resultSummary: 'SHA-256 bytecode hashes match canonical release digest identically.',
    beforeRef: '0x0000000000000000000000000000000000000000000000000000000000000000',
    afterRef: '0x7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d',
    txHash: null,
    timestamp: '2026-03-27T07:45:00Z',
    lifecycleState: 'projected',
    details: 'Off-chain supervisor validation run; no on-chain state mutation.',
  },
  {
    auditId: 'AUD-2026-0327-03',
    actor: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    capability: 'TIMELOCK_ADMIN',
    authoritySource: 'Timelock Controller',
    action: 'Schedule Protocol Parameter Adjustment',
    targetResource: 'TruthBountyParameters (min_bond: 1.0 ETH -> 1.2 ETH)',
    requestSummary: 'Timelock proposal queued with 48h mandatory security delay.',
    resultSummary: 'Timelock operation #88 queued in state pending-execution.',
    beforeRef: '0xc3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2',
    afterRef: '0xd4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3',
    txHash: '0x5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b',
    timestamp: '2026-03-27T06:30:00Z',
    lifecycleState: 'authorized',
    blockNumber: 12345510,
    details: 'Multi-sig signature threshold 3-of-5 satisfied for queueing.',
  },
  {
    auditId: 'AUD-2026-0327-04',
    actor: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    capability: 'PROTOCOL_OPERATOR',
    authoritySource: 'Supervisor Daemon',
    action: 'Archive Stale Dead-Letter Queue Tasks',
    targetResource: 'DeadLetterQueue (Storage partition DLQ-2026-Q1)',
    requestSummary: 'Purge 14 expired event retry records past 30-day retention window.',
    resultSummary: 'Records purged from active buffer to cold archive storage.',
    beforeRef: '0xe5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4',
    afterRef: '0xf60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5',
    txHash: null,
    timestamp: '2026-03-27T05:00:00Z',
    lifecycleState: 'submitted',
    details: 'Batch submission in progress to cold archive.',
  },
  {
    auditId: 'AUD-2026-0326-05',
    actor: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    capability: 'GUARDIAN_ADMIN',
    authoritySource: 'MultiSig Treasury',
    action: 'Simulate Safe Treasury Pull Allocation',
    targetResource: 'Optimism Treasury Vault',
    requestSummary: 'Dry-run withdrawal simulation for monthly protocol reserve.',
    resultSummary: 'Simulation returned status 0 (Reverted: Quorum threshold not yet met).',
    beforeRef: '0x293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718',
    afterRef: '0x293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718',
    txHash: null,
    timestamp: '2026-03-26T22:00:00Z',
    lifecycleState: 'failed',
    details: 'Execution failed closed cleanly without side effects.',
  },
  {
    auditId: 'AUD-2026-0326-06',
    actor: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    capability: 'PROTOCOL_OPERATOR',
    authoritySource: 'Optimism L2 Registry',
    action: 'Queue Sync of Dispute #104 Round Projection',
    targetResource: 'TruthBountyWeighted.sol (Dispute Engine)',
    requestSummary: 'Reconciliation query queued for dispute event logs.',
    resultSummary: 'Awaiting sequencer inclusion and projection indexing.',
    beforeRef: '0x3a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6071829',
    afterRef: '0x4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a',
    txHash: null,
    timestamp: '2026-03-26T19:40:00Z',
    lifecycleState: 'requested',
    details: 'Pending batch scheduler ingestion.',
  },
];

const mockBaseData: UseAdminAuditTrailReturn = {
  isAuthorized: true,
  unauthorizedReason: null,
  canonicalAdminAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  account: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  isConnected: true,
  isSupportedChain: true,
  isLoading: false,
  isStale: false,
  isUnavailable: false,
  unavailableMessage: null,
  isOffline: false,
  records: mockAuditRecords,
  pagination: {
    page: 1,
    pageSize: 10,
    totalRecords: mockAuditRecords.length,
    totalPages: 1,
  },
  filters: {
    search: '',
    capability: 'ALL',
    lifecycleState: 'ALL',
  },
  freshness: {
    lastUpdated: Date.now(),
    source: 'Optimism L2 Registry & Indexer Supervisor Projection',
    isFresh: true,
  },
  setFilters: () => {},
  setPage: () => {},
  setPageSize: () => {},
  resetFilters: () => {},
  refetch: async () => {},
  exportData: async () => ({ success: true, message: 'Exported 6 records.' }),
};

export const AuthorizedDefault: Story = {
  render: () => (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminAuditTrailView testDataOverride={mockBaseData} />
    </div>
  ),
};

export const LoadingState: Story = {
  render: () => (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminAuditTrailView
        testDataOverride={{
          ...mockBaseData,
          isLoading: true,
          records: [],
        }}
      />
    </div>
  ),
};

export const StaleTelemetryState: Story = {
  render: () => (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminAuditTrailView
        testDataOverride={{
          ...mockBaseData,
          isStale: true,
          freshness: {
            ...mockBaseData.freshness,
            lastUpdated: Date.now() - 60000,
            isFresh: false,
          },
        }}
      />
    </div>
  ),
};

export const UnavailableServiceState: Story = {
  render: () => (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminAuditTrailView
        testDataOverride={{
          ...mockBaseData,
          isUnavailable: true,
          unavailableMessage: 'API Gateway timeout (503): Indexer supervisor connection refused.',
          records: [],
        }}
      />
    </div>
  ),
};

export const UnauthorizedDeniedState: Story = {
  render: () => (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminAuditTrailView
        testDataOverride={{
          ...mockBaseData,
          isAuthorized: false,
          unauthorizedReason:
            'Current address is not registered as the canonical protocol administrator in contract registry.',
          account: '0x0000000000000000000000000000000000001234',
          records: [],
        }}
      />
    </div>
  ),
};

export const EmptyResultsState: Story = {
  render: () => (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminAuditTrailView
        testDataOverride={{
          ...mockBaseData,
          records: [],
          pagination: {
            ...mockBaseData.pagination,
            totalRecords: 0,
            totalPages: 1,
          },
        }}
      />
    </div>
  ),
};

export const MultiPagePaginationState: Story = {
  render: () => (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminAuditTrailView
        testDataOverride={{
          ...mockBaseData,
          pagination: {
            page: 2,
            pageSize: 5,
            totalRecords: 28,
            totalPages: 6,
          },
        }}
      />
    </div>
  ),
};
