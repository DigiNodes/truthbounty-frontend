'use client';

/**
 * AdminAuditTrailView — UI-FE-027 (#596)
 *
 * Full-featured, hardened administrative audit trail view:
 * - Route: /admin/audit
 * - Source-labelled fields: actor, capability, authority source, before/after refs, API audit ID, tx hash
 * - Distinct lifecycle states: requested, authorized, submitted, confirmed, projected, failed
 * - Controlled pagination, comprehensive filtering, and sanitized exports (CSV/JSON)
 * - Resilient states: loading, empty, stale, unavailable, and denied
 *
 * Acceptance Criteria Compliance:
 * - Protected values/secrets never render or export.
 * - Requested, authorized, submitted, confirmed, and projected states remain distinct.
 * - Records are strictly read-only.
 * - Optimism/EVM only.
 */

import React from 'react';
import Link from 'next/link';
import {
  History,
  WifiOff,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  FileText,
  Lock,
} from 'lucide-react';
import { useAdminAuditTrail, type UseAdminAuditTrailReturn } from '@/hooks/useAdminAuditTrail';
import { AdminUnauthorizedState } from '@/components/features/admin-dashboard/AdminUnauthorizedState';
import { AdminAuditFilters } from './AdminAuditFilters';
import { AdminAuditTable } from './AdminAuditTable';
import { AdminAuditCards } from './AdminAuditCards';
import { AdminAuditPagination } from './AdminAuditPagination';
import { AdminAuditExportButton } from './AdminAuditExportButton';

export interface AdminAuditTrailViewProps {
  className?: string;
  testDataOverride?: UseAdminAuditTrailReturn;
}

export function AdminAuditTrailView({
  className = '',
  testDataOverride,
}: AdminAuditTrailViewProps) {
  if (testDataOverride) {
    return <AdminAuditTrailContent className={className} data={testDataOverride} />;
  }
  return <AdminAuditTrailConnected className={className} />;
}

function AdminAuditTrailConnected({ className = '' }: { className?: string }) {
  const hookData = useAdminAuditTrail();
  return <AdminAuditTrailContent className={className} data={hookData} />;
}

export interface AdminAuditTrailContentProps {
  className?: string;
  data: UseAdminAuditTrailReturn;
}

export function AdminAuditTrailContent({
  className = '',
  data,
}: AdminAuditTrailContentProps) {
  const {
    isAuthorized,
    unauthorizedReason,
    canonicalAdminAddress,
    account,
    isLoading,
    isStale,
    isUnavailable,
    unavailableMessage,
    isOffline,
    records,
    pagination,
    filters,
    freshness,
    setFilters,
    setPage,
    setPageSize,
    resetFilters,
    refetch,
    exportData,
  } = data;

  // 1. Fail-closed: Denied state if unauthorized
  if (!isAuthorized) {
    return (
      <div className={`space-y-6 ${className}`} data-testid="admin-audit-view-container">
        <AdminUnauthorizedState
          reason={unauthorizedReason}
          canonicalAdminAddress={canonicalAdminAddress}
          connectedAddress={account}
        />
      </div>
    );
  }

  return (
    <div
      className={`space-y-6 ${className}`}
      data-testid="admin-audit-view-container"
    >
      {/* Navigation Breadcrumb / Return Link */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          aria-label="Return to Protocol Administration Dashboard"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
          <span>Back to Administration Overview</span>
        </Link>
      </div>

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Immutable Administrative Audit Trail
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            Source-labelled, cryptographically referenced operational receipts for supervisor executions, governance proposals, and contract maintenance.
          </p>
        </div>

        {/* Action Controls & Operator Context */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs">
            <span className="text-muted-foreground">Operator:</span>
            <span className="font-mono text-foreground font-semibold">
              {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connected'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-accent text-foreground disabled:opacity-50 transition-colors shadow-xs"
            aria-label="Refresh audit records"
            data-testid="admin-audit-refresh-btn"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Sync</span>
          </button>

          <AdminAuditExportButton onExport={exportData} disabled={records.length === 0 || isLoading} />
        </div>
      </div>

      {/* 2. Stale or Offline Notice */}
      {(isOffline || isStale) && (
        <div
          role="status"
          aria-live="polite"
          data-testid="admin-audit-stale-notice"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/50 bg-amber-500/10 text-foreground"
        >
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-amber-500 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">
                {isOffline ? 'Offline Mode Active' : 'Audit Trail Telemetry Stale'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOffline
                  ? 'Displaying cached administrative audit logs. Reconnect to resume live telemetry.'
                  : `Last indexer sync was over 45s ago${freshness?.lastUpdated ? ` (${new Date(freshness.lastUpdated).toLocaleTimeString()})` : ''}. New transactions may not be reflected.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 self-start sm:self-center px-3 py-1.5 rounded-lg border border-amber-500/30 bg-card text-xs font-semibold hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      )}

      {/* 3. Service Unavailable Alert */}
      {isUnavailable && (
        <div
          role="alert"
          data-testid="admin-audit-unavailable-notice"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-foreground"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-destructive">Audit Service Unavailable</p>
              <p className="text-xs text-muted-foreground">
                {unavailableMessage || 'Unable to synchronize projection logs from backend API.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 self-start sm:self-center px-3 py-1.5 rounded-lg border border-destructive/30 bg-card text-xs font-semibold hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* 4. Filters Control */}
      <AdminAuditFilters
        filters={filters}
        onFilterChange={setFilters}
        onReset={resetFilters}
      />

      {/* 5. Main Records Area: Loading, Empty, or Table */}
      {isLoading ? (
        <div
          className="rounded-2xl border border-border bg-card p-8 space-y-4 animate-pulse shadow-xs"
          data-testid="admin-audit-loading"
        >
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-muted/50 rounded-xl" />
            ))}
          </div>
        </div>
      ) : records.length === 0 ? (
        <div
          className="rounded-2xl border border-border bg-card p-12 text-center space-y-3 shadow-xs"
          data-testid="admin-audit-empty"
        >
          <FileText className="h-8 w-8 text-muted-foreground mx-auto" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">No Audit Records Found</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            No privileged audit entries matched your active filters. Try adjusting search terms, capability, or date parameters.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-accent text-xs font-semibold text-foreground transition-colors mt-2"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <AdminAuditTable records={records} />

          {/* Mobile Cards Alternative */}
          <AdminAuditCards records={records} />

          {/* Controlled Pagination */}
          <AdminAuditPagination
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Security & Immutability Assurance Notice */}
      <div className="p-4 rounded-xl border border-border/70 bg-muted/20 text-xs text-muted-foreground flex items-start gap-3">
        <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-0.5 leading-relaxed text-[11px]">
          <span className="font-semibold text-foreground">Immutable Audit Guarantee: </span>
          <span>
            Audit records are cryptographically bound, read-only, and exportable. Pinned Optimism/EVM contract receipts are authoritative for mutations; all displayed telemetry represents freshness-labelled projection data. Protected secrets, private keys, and authorization tokens are strictly redacted at the security boundary.
          </span>
        </div>
      </div>
    </div>
  );
}
