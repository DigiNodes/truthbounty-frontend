import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminAuditTrailView } from '../AdminAuditTrailView';
import type { UseAdminAuditTrailReturn } from '@/hooks/useAdminAuditTrail';
import type { AdminAuditDetailedRecord } from '@/app/types/admin-audit';

const mockRecords: AdminAuditDetailedRecord[] = [
  {
    auditId: 'AUD-2026-0327-01',
    actor: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    capability: 'PROTOCOL_OPERATOR',
    authoritySource: 'Optimism L2 Registry',
    action: 'Replay Failed Event Indexer Batch #4408',
    targetResource: 'Indexer Ingestion Pipeline',
    requestSummary: 'Batch replay requested due to transient L2 RPC gateway timeout.',
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
    targetResource: 'TruthBountyParameters',
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
    targetResource: 'DeadLetterQueue',
    requestSummary: 'Purge 14 expired event retry records past 30-day retention window.',
    resultSummary: 'Records purged from active buffer to cold archive storage.',
    beforeRef: '0xe5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4',
    afterRef: '0xf60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5',
    txHash: null,
    timestamp: '2026-03-27T05:00:00Z',
    lifecycleState: 'submitted',
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

const createMockHookData = (overrides?: Partial<UseAdminAuditTrailReturn>): UseAdminAuditTrailReturn => {
  return {
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
    records: mockRecords,
    pagination: {
      page: 1,
      pageSize: 10,
      totalRecords: mockRecords.length,
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
    setFilters: jest.fn(),
    setPage: jest.fn(),
    setPageSize: jest.fn(),
    resetFilters: jest.fn(),
    refetch: jest.fn().mockResolvedValue(undefined),
    exportData: jest.fn().mockResolvedValue({ success: true, message: 'Export completed successfully.' }),
    ...overrides,
  };
};

describe('UI-FE-027: Administrative Audit Trail View', () => {
  describe('1. Authorization & Explicit Denied State', () => {
    it('renders explicit denied state when caller is unauthorized', () => {
      const unauthorizedData = createMockHookData({
        isAuthorized: false,
        unauthorizedReason: 'Current address is not registered as the canonical protocol administrator.',
        account: '0x0000000000000000000000000000000000009999',
        records: [],
      });

      render(<AdminAuditTrailView testDataOverride={unauthorizedData} />);

      expect(screen.getByTestId('admin-unauthorized-notice')).toBeInTheDocument();
      expect(screen.getByText(/Current address is not registered as the canonical protocol administrator/i)).toBeInTheDocument();
      // Ensure records table is completely hidden when unauthorized
      expect(screen.queryByTestId('admin-audit-desktop-table')).not.toBeInTheDocument();
    });
  });

  describe('2. Display of Required Metadata (Issue #596 Technical Scope)', () => {
    it('shows actor, capability, authority source, before/after refs, API audit ID, and transaction hash', () => {
      const hookData = createMockHookData();
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      // API Audit ID
      expect(screen.getAllByText('AUD-2026-0327-01').length).toBeGreaterThanOrEqual(1);

      // Capability
      expect(screen.getAllByText('PROTOCOL_OPERATOR').length).toBeGreaterThanOrEqual(1);

      // Authority source
      expect(screen.getAllByText('Optimism L2 Registry').length).toBeGreaterThanOrEqual(1);

      // Action & Target
      expect(screen.getAllByText('Replay Failed Event Indexer Batch #4408').length).toBeGreaterThanOrEqual(1);

      // Copy buttons for identifiers
      expect(screen.getAllByLabelText(/copy audit identifier aud-2026-0327-01/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByLabelText(/copy actor address/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByLabelText(/copy pre-execution reference hash/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByLabelText(/copy post-execution reference hash/i).length).toBeGreaterThanOrEqual(1);
    });

    it('displays desktop table and mobile card alternative views', () => {
      const hookData = createMockHookData();
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      expect(screen.getByTestId('admin-audit-desktop-table')).toBeInTheDocument();
      expect(screen.getByTestId('admin-audit-mobile-cards')).toBeInTheDocument();
    });
  });

  describe('3. Distinct Lifecycle States (Acceptance Criteria)', () => {
    it('renders distinct status badges for requested, authorized, submitted, confirmed, projected, and failed', () => {
      const hookData = createMockHookData();
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      expect(screen.getAllByTestId('audit-status-badge-requested').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId('audit-status-badge-authorized').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId('audit-status-badge-submitted').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId('audit-status-badge-confirmed').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId('audit-status-badge-projected').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId('audit-status-badge-failed').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. Records are Strictly Read-Only (Acceptance Criteria)', () => {
    it('confirms no edit, delete, mutate, or modify controls exist on audit trail records', () => {
      const hookData = createMockHookData();
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /modify/i })).not.toBeInTheDocument();
    });
  });

  describe('5. Expandable Request and Result Payloads', () => {
    it('expands and collapses request and result payload summaries', () => {
      const hookData = createMockHookData();
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      // Find expand button for first row in desktop table
      const expandBtn = screen.getByLabelText(/expand request and result details for aud-2026-0327-01/i);
      fireEvent.click(expandBtn);

      // Verify request and result summaries are visible
      expect(screen.getByText('Batch replay requested due to transient L2 RPC gateway timeout.')).toBeInTheDocument();
      expect(screen.getByText('Re-ingested 18 missed dispute events without state overwrite.')).toBeInTheDocument();

      // Click again to collapse
      const collapseBtn = screen.getByLabelText(/collapse request and result details for aud-2026-0327-01/i);
      fireEvent.click(collapseBtn);

      expect(screen.queryByText('Batch replay requested due to transient L2 RPC gateway timeout.')).not.toBeInTheDocument();
    });
  });

  describe('6. Filters Integration', () => {
    it('invokes setFilters when changing search input', () => {
      const hookData = createMockHookData();
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      const searchInput = screen.getByPlaceholderText(/search by audit id/i);
      fireEvent.change(searchInput, { target: { value: 'batch' } });

      expect(hookData.setFilters).toHaveBeenCalledWith({ search: 'batch' });
    });

    it('invokes setFilters when selecting capability', () => {
      const hookData = createMockHookData();
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      const capabilitySelect = screen.getByLabelText(/capability/i);
      fireEvent.change(capabilitySelect, { target: { value: 'PROTOCOL_OPERATOR' } });

      expect(hookData.setFilters).toHaveBeenCalledWith({ capability: 'PROTOCOL_OPERATOR' });
    });

    it('invokes setFilters when selecting lifecycle state', () => {
      const hookData = createMockHookData();
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      const lifecycleSelect = screen.getByLabelText(/lifecycle state/i);
      fireEvent.change(lifecycleSelect, { target: { value: 'confirmed' } });

      expect(hookData.setFilters).toHaveBeenCalledWith({ lifecycleState: 'confirmed' });
    });

    it('resets filters when clicking reset button', () => {
      const hookData = createMockHookData({
        filters: {
          search: 'query',
          capability: 'AUDIT_ADMIN',
          lifecycleState: 'confirmed',
        },
      });
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      const resetBtn = screen.getByLabelText(/reset all filters to default/i);
      fireEvent.click(resetBtn);

      expect(hookData.resetFilters).toHaveBeenCalled();
    });
  });

  describe('7. Controlled Pagination', () => {
    it('renders pagination details and triggers page changes', () => {
      const hookData = createMockHookData({
        pagination: {
          page: 1,
          pageSize: 10,
          totalRecords: 25,
          totalPages: 3,
        },
      });
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      expect(screen.getByText(/showing/i)).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();

      // Click Next page button
      const nextBtn = screen.getByLabelText(/next page/i);
      fireEvent.click(nextBtn);
      expect(hookData.setPage).toHaveBeenCalledWith(2);

      // Click direct page 3 button
      const page3Btn = screen.getByLabelText(/go to page 3/i);
      fireEvent.click(page3Btn);
      expect(hookData.setPage).toHaveBeenCalledWith(3);
    });

    it('changes page size', () => {
      const hookData = createMockHookData({
        pagination: {
          page: 1,
          pageSize: 10,
          totalRecords: 25,
          totalPages: 3,
        },
      });
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      const pageSizeSelect = screen.getByLabelText(/audit records per page/i);
      fireEvent.change(pageSizeSelect, { target: { value: '20' } });

      expect(hookData.setPageSize).toHaveBeenCalledWith(20);
    });
  });

  describe('8. Resilient States (Loading, Stale, Unavailable, Empty)', () => {
    it('renders loading skeleton when isLoading is true', () => {
      const hookData = createMockHookData({
        isLoading: true,
        records: [],
      });
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      expect(screen.getByTestId('admin-audit-loading')).toBeInTheDocument();
    });

    it('renders stale notice when telemetry is stale', () => {
      const hookData = createMockHookData({ isStale: true });
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      expect(screen.getByTestId('admin-audit-stale-notice')).toBeInTheDocument();
      expect(screen.getByText(/Audit Trail Telemetry Stale/i)).toBeInTheDocument();
    });

    it('renders unavailable notice when API projection is unavailable', () => {
      const hookData = createMockHookData({
        isUnavailable: true,
        unavailableMessage: 'Connection to sequencer indexing pipeline timed out (503).',
        records: [],
      });
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      expect(screen.getByTestId('admin-audit-unavailable-notice')).toBeInTheDocument();
      expect(screen.getByText(/Connection to sequencer indexing pipeline timed out/i)).toBeInTheDocument();
    });

    it('renders empty notice when no records match', () => {
      const hookData = createMockHookData({
        records: [],
        pagination: { page: 1, pageSize: 10, totalRecords: 0, totalPages: 1 },
      });
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      expect(screen.getByTestId('admin-audit-empty')).toBeInTheDocument();
      expect(screen.getByText(/No Audit Records Found/i)).toBeInTheDocument();
    });
  });

  describe('9. Sanitized Export Trigger', () => {
    it('opens export menu and invokes exportData for CSV and JSON', async () => {
      const hookData = createMockHookData();
      render(<AdminAuditTrailView testDataOverride={hookData} />);

      const exportTrigger = screen.getByTestId('admin-audit-export-trigger');
      fireEvent.click(exportTrigger);

      // Verify CSV & JSON options
      const csvBtn = screen.getByTestId('export-csv-btn');
      const jsonBtn = screen.getByTestId('export-json-btn');
      expect(csvBtn).toBeInTheDocument();
      expect(jsonBtn).toBeInTheDocument();

      // Click CSV export
      await waitFor(async () => {
        fireEvent.click(csvBtn);
      });
      expect(hookData.exportData).toHaveBeenCalledWith('csv');

      // Re-open export menu
      await waitFor(async () => {
        fireEvent.click(exportTrigger);
      });
      const reopenedJsonBtn = await screen.findByTestId('export-json-btn');

      // Click JSON export
      await waitFor(async () => {
        fireEvent.click(reopenedJsonBtn);
      });
      expect(hookData.exportData).toHaveBeenCalledWith('json');
    });
  });
});
