/**
 * Admin Audit Trail Export Utilities — UI-FE-027 (#596)
 *
 * Implements sanitized, deterministic exports (CSV and JSON) with
 * fail-closed secret redaction and formula injection defense.
 *
 * Acceptance Criteria Compliance:
 * - Protected values/secrets never render or export.
 * - Records are read-only.
 * - Requested, authorized, submitted, confirmed, and projected states remain distinct.
 */

import type { AdminAuditDetailedRecord, AuditExportFormat } from '@/app/types/admin-audit';
import { sanitizeAuditRecords, sanitizeCsvCell } from '@/lib/security/audit-sanitizer';

export const CSV_HEADERS = [
  'Audit ID',
  'Actor',
  'Capability',
  'Authority Source',
  'Action',
  'Target Resource',
  'Lifecycle State',
  'Request Summary',
  'Result Summary',
  'Before Ref',
  'After Ref',
  'Transaction Hash',
  'Timestamp',
  'Block Number',
  'Details',
] as const;

/**
 * Serializes sanitized audit records to a deterministic JSON string.
 */
export function generateSanitizedAuditJson(records: readonly AdminAuditDetailedRecord[]): string {
  const sanitized = sanitizeAuditRecords(records);
  const payload = {
    exportVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    recordCount: sanitized.length,
    canonicalNetwork: 'Optimism / EVM',
    records: sanitized,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Serializes sanitized audit records to a CSV string with formula injection protection.
 */
export function generateSanitizedAuditCsv(records: readonly AdminAuditDetailedRecord[]): string {
  const sanitized = sanitizeAuditRecords(records);

  const headerLine = CSV_HEADERS.map((h) => `"${h}"`).join(',');
  const rowLines = sanitized.map((r) => {
    const cells = [
      sanitizeCsvCell(r.auditId),
      sanitizeCsvCell(r.actor),
      sanitizeCsvCell(r.capability),
      sanitizeCsvCell(r.authoritySource),
      sanitizeCsvCell(r.action),
      sanitizeCsvCell(r.targetResource),
      sanitizeCsvCell(r.lifecycleState),
      sanitizeCsvCell(r.requestSummary),
      sanitizeCsvCell(r.resultSummary),
      sanitizeCsvCell(r.beforeRef),
      sanitizeCsvCell(r.afterRef),
      sanitizeCsvCell(r.txHash || '0x00'),
      sanitizeCsvCell(r.timestamp),
      sanitizeCsvCell(r.blockNumber ?? ''),
      sanitizeCsvCell(r.details ?? ''),
    ];
    return cells.join(',');
  });

  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Generates an injection-safe filename for exported audit logs.
 */
export function generateAuditExportFilename(format: AuditExportFormat, date?: Date): string {
  const now = date || new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  const yyyy = now.getUTCFullYear();
  const mm = pad(now.getUTCMonth() + 1);
  const dd = pad(now.getUTCDate());
  const hh = pad(now.getUTCHours());
  const min = pad(now.getUTCMinutes());
  const ss = pad(now.getUTCSeconds());

  const timestampSegment = `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
  const ext = format === 'csv' ? 'csv' : 'json';

  return `truthbounty-audit-trail-${timestampSegment}.${ext}`;
}

/**
 * Triggers a client-side file download via a transient anchor element.
 * Safeguarded for SSR (no-op if window/document is undefined).
 */
export function triggerAuditDownload(
  content: string,
  filename: string,
  mimeType: 'text/csv;charset=utf-8;' | 'application/json;charset=utf-8;'
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.setAttribute('role', 'button');
    link.setAttribute('aria-label', `Download ${filename}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
