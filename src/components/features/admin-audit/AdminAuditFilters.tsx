'use client';

import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import type {
  AuditFilterOptions,
  AuditAuthorityCapability,
  AuditLifecycleState,
} from '@/app/types/admin-audit';

export interface AdminAuditFiltersProps {
  filters: AuditFilterOptions;
  onFilterChange: (updated: Partial<AuditFilterOptions>) => void;
  onReset: () => void;
  className?: string;
}

const CAPABILITY_OPTIONS: { value: AuditAuthorityCapability | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Capabilities' },
  { value: 'PROTOCOL_OPERATOR', label: 'Protocol Operator' },
  { value: 'AUDIT_ADMIN', label: 'Audit Admin' },
  { value: 'EMERGENCY_ADMIN', label: 'Emergency Admin' },
  { value: 'GUARDIAN_ADMIN', label: 'Guardian Admin' },
  { value: 'TIMELOCK_ADMIN', label: 'Timelock Admin' },
];

const LIFECYCLE_OPTIONS: { value: AuditLifecycleState | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Lifecycle States' },
  { value: 'requested', label: 'Requested' },
  { value: 'authorized', label: 'Authorized' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'projected', label: 'Projected' },
  { value: 'failed', label: 'Failed' },
];

export function AdminAuditFilters({
  filters,
  onFilterChange,
  onReset,
  className = '',
}: AdminAuditFiltersProps) {
  const isFiltered =
    Boolean(filters.search) ||
    filters.capability !== 'ALL' ||
    filters.lifecycleState !== 'ALL' ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate);

  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 space-y-4 shadow-xs ${className}`}
      data-testid="admin-audit-filters"
      role="search"
      aria-label="Filter administrative audit logs"
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <label htmlFor="audit-search-input" className="sr-only">
            Search audit trail
          </label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="audit-search-input"
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search by Audit ID, Actor, Action, Target, or Tx Hash..."
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded focus:outline-hidden focus:ring-2 focus:ring-primary/50"
              aria-label="Clear search input"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Reset Action */}
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-muted/30 text-xs font-medium text-foreground hover:bg-accent transition-colors shrink-0"
            aria-label="Reset all filters to default"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Selectors Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/50 text-xs">
        {/* Capability Filter */}
        <div className="space-y-1">
          <label htmlFor="audit-capability-select" className="text-[11px] font-semibold text-muted-foreground">
            Capability
          </label>
          <select
            id="audit-capability-select"
            value={filters.capability}
            onChange={(e) =>
              onFilterChange({ capability: e.target.value as AuditAuthorityCapability | 'ALL' })
            }
            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
          >
            {CAPABILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Lifecycle State Filter */}
        <div className="space-y-1">
          <label htmlFor="audit-lifecycle-select" className="text-[11px] font-semibold text-muted-foreground">
            Lifecycle State
          </label>
          <select
            id="audit-lifecycle-select"
            value={filters.lifecycleState}
            onChange={(e) =>
              onFilterChange({ lifecycleState: e.target.value as AuditLifecycleState | 'ALL' })
            }
            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
          >
            {LIFECYCLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div className="space-y-1">
          <label htmlFor="audit-start-date" className="text-[11px] font-semibold text-muted-foreground">
            From Date
          </label>
          <input
            id="audit-start-date"
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => onFilterChange({ startDate: e.target.value || undefined })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>

        {/* End Date */}
        <div className="space-y-1">
          <label htmlFor="audit-end-date" className="text-[11px] font-semibold text-muted-foreground">
            To Date
          </label>
          <input
            id="audit-end-date"
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => onFilterChange({ endDate: e.target.value || undefined })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
}
