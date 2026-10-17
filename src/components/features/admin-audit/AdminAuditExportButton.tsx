'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileCode, Check, AlertCircle } from 'lucide-react';
import type { AuditExportFormat } from '@/app/types/admin-audit';

export interface AdminAuditExportButtonProps {
  onExport: (format: AuditExportFormat) => Promise<{ success: boolean; message: string }>;
  disabled?: boolean;
  className?: string;
}

export function AdminAuditExportButton({
  onExport,
  disabled = false,
  className = '',
}: AdminAuditExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleExport = async (format: AuditExportFormat) => {
    setIsOpen(false);
    setIsExporting(true);
    setFeedback(null);

    const result = await onExport(format);
    setIsExporting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: 'error', message: result.message });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className={`relative inline-block ${className}`} data-testid="admin-audit-export-wrapper">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={disabled || isExporting}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Export administrative audit trail"
          data-testid="admin-audit-export-trigger"
        >
          <Download className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>{isExporting ? 'Exporting...' : 'Export Audit Log'}</span>
        </button>
      </div>

      {/* Export Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop for closing */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className="absolute right-0 mt-1.5 w-48 rounded-xl border border-border bg-card p-1 shadow-lg z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
            role="menu"
            aria-label="Export formats"
          >
            <button
              type="button"
              onClick={() => void handleExport('csv')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-foreground hover:bg-muted font-medium transition-colors"
              role="menuitem"
              data-testid="export-csv-btn"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
              <div>
                <div>Export CSV</div>
                <div className="text-[10px] text-muted-foreground">Sanitized spreadsheet</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => void handleExport('json')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-foreground hover:bg-muted font-medium transition-colors"
              role="menuitem"
              data-testid="export-json-btn"
            >
              <FileCode className="h-4 w-4 text-cyan-500 shrink-0" aria-hidden="true" />
              <div>
                <div>Export JSON</div>
                <div className="text-[10px] text-muted-foreground">Deterministic records</div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Feedback Toast / Banner */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          data-testid="audit-export-feedback"
          className={`absolute right-0 top-full mt-2 w-64 p-2.5 rounded-xl border text-[11px] shadow-md z-50 flex items-start gap-2 ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-card text-emerald-500'
              : 'border-destructive/40 bg-card text-destructive'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
          )}
          <span className="leading-tight">{feedback.message}</span>
        </div>
      )}
    </div>
  );
}
