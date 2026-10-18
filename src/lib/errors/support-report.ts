/**
 * Support report + privacy-safe reporting — UI-FE-053 (#626)
 *
 * The report is assembled ONLY from an allow-list of non-sensitive fields:
 * correlation reference, category, machine code, source, scope label,
 * release, timestamp, and (optionally) a numeric Next.js digest.
 *
 * It deliberately never includes: the error message, stack, component props,
 * URL/path/query, wallet address, signature, token, evidence value, or any
 * server-provided text. Every string is additionally passed through the
 * telemetry redactor as defence in depth.
 */

import { redactString, getTelemetryClient } from '@/lib/telemetry';
import { ERROR_KIND_LABEL, type ClassifiedError } from './classification';

export type BoundaryLevel = 'route' | 'composition' | 'widget';

const SCOPE_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,63}$/;

/** Scope labels are developer constants; anything else is replaced, never echoed. */
export function sanitizeScope(scope: unknown): string {
  return typeof scope === 'string' && SCOPE_PATTERN.test(scope) ? scope : 'unknown';
}

/** Turn a human route label ("Claim detail") into a valid scope slug ("claim-detail"). */
export function slugifyScope(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return SCOPE_PATTERN.test(slug) ? slug : 'unknown';
}

export interface SupportReportInput {
  classified: ClassifiedError;
  scope: string;
  level: BoundaryLevel;
  /** Injected for deterministic tests. */
  now?: () => Date;
  release?: string;
}

export function buildSupportReport({ classified, scope, level, now, release }: SupportReportInput): string {
  const releaseLabel = release ?? process.env.NEXT_PUBLIC_PROTOCOL_RELEASE ?? 'unknown';
  const lines = [
    'TruthBounty error report',
    `Reference: ${classified.correlationRef}`,
    `Category: ${ERROR_KIND_LABEL[classified.kind]}`,
    `Code: ${classified.code}`,
    `Source: ${classified.source}`,
    `Scope: ${sanitizeScope(scope)} (${level})`,
    `Release: ${releaseLabel}`,
    `Time: ${(now ? now() : new Date()).toISOString()}`,
    ...(classified.digest ? [`Digest: ${classified.digest}`] : []),
  ];
  return lines.map((line) => redactString(line)).join('\n');
}

const reportedReferences = new Set<string>();

/** Test helper. */
export function __resetReportedReferences(): void {
  reportedReferences.clear();
}

/**
 * Emit a privacy-safe telemetry incident for a user-initiated report.
 * De-duplicated per correlation reference so the action cannot spam.
 * Returns false if this reference was already reported.
 */
export function reportIncident(input: SupportReportInput): boolean {
  const { classified, scope, level } = input;
  if (reportedReferences.has(classified.correlationRef)) return false;
  reportedReferences.add(classified.correlationRef);
  try {
    getTelemetryClient().captureIncident('user_reported_error', {
      category: 'incident',
      severity: 'warning',
      errorCode: classified.code,
      context: {
        correlationRef: classified.correlationRef,
        kind: classified.kind,
        source: classified.source,
        scope: sanitizeScope(scope),
        level,
      },
    });
  } catch {
    /* telemetry must never surface to the user */
  }
  return true;
}

/** Capture a boundary-caught error. Context is allow-listed; message is never forwarded raw. */
export function captureBoundaryError(
  classified: ClassifiedError,
  scope: string,
  level: BoundaryLevel,
): void {
  try {
    const safeError = new Error(classified.code);
    safeError.name = classified.kind === 'defect' ? 'ApplicationDefect' : 'HandledFailure';
    getTelemetryClient().captureError(safeError, {
      category: 'boundary_error',
      severity: classified.kind === 'defect' ? 'fatal' : classified.kind === 'denied' ? 'info' : 'error',
      errorCode: classified.code,
      context: {
        correlationRef: classified.correlationRef,
        kind: classified.kind,
        source: classified.source,
        scope: sanitizeScope(scope),
        level,
        correlationRejected: classified.correlationRejected,
      },
    });
  } catch {
    /* never throw from error handling */
  }
}
