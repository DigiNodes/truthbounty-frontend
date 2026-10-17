'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuditPaginationState } from '@/app/types/admin-audit';

export interface AdminAuditPaginationProps {
  pagination: AuditPaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

export function AdminAuditPagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  className = '',
}: AdminAuditPaginationProps) {
  const { page, pageSize, totalRecords, totalPages } = pagination;

  if (totalRecords === 0) {
    return null;
  }

  const startEntry = (page - 1) * pageSize + 1;
  const endEntry = Math.min(page * pageSize, totalRecords);

  // Generate page numbers window (up to 5 pages around current)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground ${className}`}
      aria-label="Audit log pagination"
      data-testid="admin-audit-pagination"
    >
      {/* Entries Info & Page Size */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span>
          Showing <span className="font-semibold text-foreground">{startEntry}</span> to{' '}
          <span className="font-semibold text-foreground">{endEntry}</span> of{' '}
          <span className="font-semibold text-foreground">{totalRecords}</span> entries
        </span>

        <div className="flex items-center gap-1.5 pl-3 border-l border-border">
          <label htmlFor="audit-page-size" className="text-[11px] sr-only sm:not-sr-only">
            Per page:
          </label>
          <select
            id="audit-page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 rounded-md border border-border bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            aria-label="Audit records per page"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Page Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p) => {
            const isCurrent = p === page;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={isCurrent ? 'page' : undefined}
                className={`min-w-8 h-8 px-2 rounded-lg text-xs font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'border border-border bg-card text-foreground hover:bg-accent'
                }`}
                aria-label={`Go to page ${p}`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
