// Accessibility checks for the Administrative Audit Trail (UI-FE-027 / #596).
// Runs jest-axe across authorized, unauthorized fail-closed, stale, unavailable, and empty states.

import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
const { toHaveNoViolations } = require('jest-axe');
import { AdminAuditTrailView } from '@/components/features/admin-audit/AdminAuditTrailView';
import type { UseAdminAuditTrailReturn } from '@/hooks/useAdminAuditTrail';
import type { AdminAuditDetailedRecord } from '@/app/types/admin-audit';

expect.extend(toHaveNoViolations);

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
  },
  {
    auditId: 'AUD-2026-0327-02',
    actor: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    capability: 'AUDIT_ADMIN',
    authoritySource: 'Verified Release Manifest',
    action: 'Verify Release Artifact Checksum Integrity',
    targetResource: 'manifest.json',
    requestSummary: 'Automated checksum audit validation for deployment release v2.4.0.',
    resultSummary: 'SHA-256 bytecode hashes match canonical release digest identically.',
    beforeRef: '0x0000000000000000000000000000000000000000000000000000000000000000',
    afterRef: '0x7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d',
    txHash: null,
    timestamp: '2026-03-27T07:45:00Z',
    lifecycleState: 'projected',
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
  exportData: jest.fn().mockResolvedValue({ success: true, message: 'Exported' }),
};

describe('AdminAuditTrailView Accessibility (WCAG 2.2 AA)', () => {
  it('authorized ready state has no axe violations', async () => {
    const { container } = render(<AdminAuditTrailView testDataOverride={mockBaseData} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('unauthorized fail-closed state has no axe violations', async () => {
    const { container } = render(
      <AdminAuditTrailView
        testDataOverride={{
          ...mockBaseData,
          isAuthorized: false,
          unauthorizedReason:
            'Current address is not registered as the canonical protocol administrator.',
          records: [],
        }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('stale telemetry state has no axe violations', async () => {
    const { container } = render(
      <AdminAuditTrailView
        testDataOverride={{
          ...mockBaseData,
          isStale: true,
        }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('unavailable service state has no axe violations', async () => {
    const { container } = render(
      <AdminAuditTrailView
        testDataOverride={{
          ...mockBaseData,
          isUnavailable: true,
          unavailableMessage: 'Indexer connection refused (503).',
          records: [],
        }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('empty results state has no axe violations', async () => {
    const { container } = render(
      <AdminAuditTrailView
        testDataOverride={{
          ...mockBaseData,
          records: [],
          pagination: { page: 1, pageSize: 10, totalRecords: 0, totalPages: 1 },
        }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
