'use client';

/**
 * useAdminAuditTrail — UI-FE-027 (#596)
 *
 * Hook coordinating immutable administrative audit trail state:
 * - Server/API authorization and canonical contract authorization
 * - Controlled pagination and comprehensive multi-parameter filtering
 * - Freshness and staleness tracking (> 45s threshold)
 * - Unavailable and offline resilient states
 * - Sanitized export execution (CSV and JSON)
 *
 * Acceptance Criteria Compliance:
 * - Records are strictly read-only.
 * - Distinct lifecycle states: requested, authorized, submitted, confirmed, projected, failed.
 * - Secrets never render or export.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from '@/hooks/useAccount';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAppShellContext } from '@/context/AppShellContext';
import { getProtocolRelease } from '@/lib/contracts/registry';
import { fetchAdminAuditRecords } from '@/app/api/admin.api';
import type {
  AdminAuditDetailedRecord,
  AuditFilterOptions,
  AuditPaginationState,
  AuditExportFormat,
  AuditQueryResponse,
} from '@/app/types/admin-audit';
import {
  generateSanitizedAuditCsv,
  generateSanitizedAuditJson,
  generateAuditExportFilename,
  triggerAuditDownload,
} from '@/lib/export/audit-export';

export interface UseAdminAuditTrailReturn {
  isAuthorized: boolean;
  unauthorizedReason: string | null;
  canonicalAdminAddress: string;
  account: string | null;
  isConnected: boolean;
  isSupportedChain: boolean;
  isLoading: boolean;
  isStale: boolean;
  isUnavailable: boolean;
  unavailableMessage: string | null;
  isOffline: boolean;
  records: AdminAuditDetailedRecord[];
  pagination: AuditPaginationState;
  filters: AuditFilterOptions;
  freshness: {
    lastUpdated: number;
    source: string;
    isFresh: boolean;
  };
  setFilters: (newFilters: Partial<AuditFilterOptions>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  resetFilters: () => void;
  refetch: () => Promise<void>;
  exportData: (format: AuditExportFormat) => Promise<{ success: boolean; message: string }>;
}

const DEFAULT_FILTERS: AuditFilterOptions = {
  search: '',
  capability: 'ALL',
  lifecycleState: 'ALL',
};

const DEFAULT_PAGINATION: AuditPaginationState = {
  page: 1,
  pageSize: 10,
  totalRecords: 0,
  totalPages: 1,
};

export function useAdminAuditTrail(): UseAdminAuditTrailReturn {
  const accountInfo = useAccount();
  const address = accountInfo?.address ?? null;
  const { isOnline } = useNetworkStatus();
  const { roles, isConnected, isSupportedChain } = useAppShellContext();

  const release = useMemo(() => getProtocolRelease(), []);
  const rawAdmin = useMemo(
    () => String(release.roles.admin || process.env.NEXT_PUBLIC_ADMIN_ADDRESS || ''),
    [release]
  );
  const canonicalAdmin = useMemo(() => rawAdmin.toLowerCase(), [rawAdmin]);

  const [records, setRecords] = useState<AdminAuditDetailedRecord[]>([]);
  const [pagination, setPagination] = useState<AuditPaginationState>(DEFAULT_PAGINATION);
  const [filters, setFiltersState] = useState<AuditFilterOptions>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(0);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(false);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);

  // Fail-closed authorization validation
  const authorizationCheck = useMemo(() => {
    if (!isConnected || !address) {
      return {
        isAuthorized: false,
        reason: 'Wallet disconnected. Connect authorized administrator address to access.',
      };
    }
    if (!isSupportedChain) {
      return {
        isAuthorized: false,
        reason: 'Unsupported network. Switch wallet to Optimism Mainnet or OP Sepolia.',
      };
    }
    const isContractAdmin = canonicalAdmin && address.toLowerCase() === canonicalAdmin;
    const isFrontendAdmin = roles.isAdmin;

    if (!isContractAdmin && !isFrontendAdmin) {
      return {
        isAuthorized: false,
        reason: 'Current address is not registered as the canonical protocol administrator.',
      };
    }

    return { isAuthorized: true, reason: null };
  }, [isConnected, address, isSupportedChain, canonicalAdmin, roles.isAdmin]);

  const loadAuditRecords = useCallback(async () => {
    if (!authorizationCheck.isAuthorized || !address) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsUnavailable(false);
    setUnavailableMessage(null);

    try {
      const response: AuditQueryResponse = await fetchAdminAuditRecords({
        adminAddress: address,
        page: pagination.page,
        pageSize: pagination.pageSize,
        capability: filters.capability,
        lifecycleState: filters.lifecycleState,
        search: filters.search,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      setRecords(response.records);
      setPagination(response.pagination);
      setLastFetchedAt(Date.now());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Audit projection service unavailable';
      setIsUnavailable(true);
      setUnavailableMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [authorizationCheck.isAuthorized, address, pagination.page, pagination.pageSize, filters]);

  useEffect(() => {
    void loadAuditRecords();
  }, [loadAuditRecords]);

  const setFilters = useCallback((newFilters: Partial<AuditFilterOptions>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
    }));
    // Reset to page 1 whenever any filter changes to prevent empty page states
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.totalPages || 1)),
    }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      pageSize,
      page: 1, // Reset to page 1 on page size change
    }));
  }, []);

  const isStale = useMemo(() => {
    if (!lastFetchedAt) return false;
    return Date.now() - lastFetchedAt > 45000;
  }, [lastFetchedAt]);

  const exportData = useCallback(
    async (format: AuditExportFormat): Promise<{ success: boolean; message: string }> => {
      try {
        if (!records || records.length === 0) {
          return { success: false, message: 'No audit records available to export.' };
        }

        const filename = generateAuditExportFilename(format);
        if (format === 'csv') {
          const csvContent = generateSanitizedAuditCsv(records);
          const triggered = triggerAuditDownload(csvContent, filename, 'text/csv;charset=utf-8;');
          return {
            success: triggered,
            message: triggered ? `Exported ${records.length} records to ${filename}` : 'Failed to start download',
          };
        } else {
          const jsonContent = generateSanitizedAuditJson(records);
          const triggered = triggerAuditDownload(jsonContent, filename, 'application/json;charset=utf-8;');
          return {
            success: triggered,
            message: triggered ? `Exported ${records.length} records to ${filename}` : 'Failed to start download',
          };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Export failed';
        return { success: false, message: msg };
      }
    },
    [records]
  );

  return {
    isAuthorized: authorizationCheck.isAuthorized,
    unauthorizedReason: authorizationCheck.reason,
    canonicalAdminAddress: rawAdmin,
    account: address,
    isConnected,
    isSupportedChain,
    isLoading,
    isStale,
    isUnavailable,
    unavailableMessage,
    isOffline: !isOnline,
    records,
    pagination,
    filters,
    freshness: {
      lastUpdated: lastFetchedAt || Date.now(),
      source: 'Optimism L2 Registry & Indexer Supervisor Projection',
      isFresh: !isStale && !isUnavailable,
    },
    setFilters,
    setPage,
    setPageSize,
    resetFilters,
    refetch: loadAuditRecords,
    exportData,
  };
}
