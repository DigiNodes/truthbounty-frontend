import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent, waitFor } from 'storybook/test';
import { AdminAuditTrailView } from './AdminAuditTrailView';
import type { UseAdminAuditTrailReturn } from '@/hooks/useAdminAuditTrail';
import type { AdminAuditDetailedRecord } from '@/app/types/admin-audit';

const meta: Meta<typeof AdminAuditTrailView> = {
  title: 'Features/AdminAudit/Interactions',
  component: AdminAuditTrailView,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof AdminAuditTrailView>;

const mockInteractiveRecords: AdminAuditDetailedRecord[] = [
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
];

const createInteractiveBaseData = (
  overrides?: Partial<UseAdminAuditTrailReturn>
): UseAdminAuditTrailReturn => {
  let currentFilters = {
    search: '',
    capability: 'ALL' as const,
    lifecycleState: 'ALL' as const,
  };

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
    records: mockInteractiveRecords,
    pagination: {
      page: 1,
      pageSize: 10,
      totalRecords: mockInteractiveRecords.length,
      totalPages: 1,
    },
    filters: currentFilters,
    freshness: {
      lastUpdated: Date.now(),
      source: 'Optimism L2 Registry & Indexer Supervisor Projection',
      isFresh: true,
    },
    setFilters: (updated) => {
      currentFilters = { ...currentFilters, ...updated };
    },
    setPage: () => {},
    setPageSize: () => {},
    resetFilters: () => {
      currentFilters = { search: '', capability: 'ALL', lifecycleState: 'ALL' };
    },
    refetch: async () => {},
    exportData: async (fmt) => ({ success: true, message: `Exported ${fmt.toUpperCase()}` }),
    ...overrides,
  };
};

export const FilterBySearchInteraction: Story = {
  render: () => (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminAuditTrailView testDataOverride={createInteractiveBaseData()} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify search input is present and interactive
    const searchInput = canvas.getByPlaceholderText(/search by audit id/i);
    expect(searchInput).toBeInTheDocument();

    await userEvent.type(searchInput, 'AUD-2026-0327-01');
    expect(searchInput).toHaveValue('AUD-2026-0327-01');
  },
};

export const ExpandRowDetailsInteraction: Story = {
  render: () => (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminAuditTrailView testDataOverride={createInteractiveBaseData()} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find expand toggle button
    const expandButton = canvas.getByLabelText(/expand request and result details for aud-2026-0327-01/i);
    expect(expandButton).toBeInTheDocument();

    // Click to expand details
    await userEvent.click(expandButton);

    // Verify request and result summaries are visible
    await waitFor(() => {
      expect(canvas.getByText(/request summary/i)).toBeInTheDocument();
      expect(canvas.getByText(/batch replay requested/i)).toBeInTheDocument();
    });
  },
};

export const ExportDropdownInteraction: Story = {
  render: () => (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminAuditTrailView testDataOverride={createInteractiveBaseData()} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find export button
    const exportTrigger = canvas.getByTestId('admin-audit-export-trigger');
    expect(exportTrigger).toBeInTheDocument();

    // Open export dropdown menu
    await userEvent.click(exportTrigger);

    // Verify menu items
    await waitFor(() => {
      expect(canvas.getByTestId('export-csv-btn')).toBeInTheDocument();
      expect(canvas.getByTestId('export-json-btn')).toBeInTheDocument();
    });

    // Click CSV export
    await userEvent.click(canvas.getByTestId('export-csv-btn'));

    // Verify feedback
    await waitFor(() => {
      expect(canvas.getByTestId('audit-export-feedback')).toBeInTheDocument();
    });
  },
};
