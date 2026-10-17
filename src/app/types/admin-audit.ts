/**
 * Admin Audit Trail Types — UI-FE-027 (#596)
 *
 * Types for immutable administrative audit logs, authority source attributions,
 * distinct lifecycle states, filter parameters, pagination, and sanitized export.
 *
 * Acceptance Criteria Compliance:
 * - Records are strictly read-only.
 * - Distinct lifecycle states: requested, authorized, submitted, confirmed, projected, failed.
 * - Source-labelled fields: actor, capability, authority source, before/after refs, API audit ID, tx hash.
 */

import type { OperationAuthority } from './admin';

export type AuditLifecycleState =
  | 'requested'
  | 'authorized'
  | 'submitted'
  | 'confirmed'
  | 'projected'
  | 'failed';

export type AuditAuthorityCapability =
  | OperationAuthority
  | 'GUARDIAN_ADMIN'
  | 'TIMELOCK_ADMIN';

export type AuditAuthoritySource =
  | 'Optimism L2 Registry'
  | 'Verified Release Manifest'
  | 'Timelock Controller'
  | 'Canonical Contract'
  | 'Supervisor Daemon'
  | 'MultiSig Treasury';

export interface AdminAuditDetailedRecord {
  /** Unique canonical API audit identifier (e.g. AUD-2026-0327-01) */
  readonly auditId: string;
  /** Operator / Actor address (0x...) */
  readonly actor: string;
  /** Cryptographically verified capability */
  readonly capability: AuditAuthorityCapability;
  /** Authoritative source verifying permission */
  readonly authoritySource: AuditAuthoritySource | string;
  /** Action executed or requested */
  readonly action: string;
  /** Target contract, queue, or resource */
  readonly targetResource: string;
  /** Request summary / parameters */
  readonly requestSummary: string;
  /** Execution result or response summary */
  readonly resultSummary: string;
  /** Pre-execution state reference hash or version ID */
  readonly beforeRef: string;
  /** Post-execution consequence reference hash or state root */
  readonly afterRef: string;
  /** On-chain transaction hash on Optimism/EVM, or null for off-chain supervisor actions */
  readonly txHash: string | null;
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** Distinct lifecycle state */
  readonly lifecycleState: AuditLifecycleState;
  /** Optimism block number where event occurred or projected */
  readonly blockNumber?: number;
  /** Additional sanitized notes or metadata */
  readonly details?: string;
}

export interface AuditFilterOptions {
  search: string;
  capability: AuditAuthorityCapability | 'ALL';
  lifecycleState: AuditLifecycleState | 'ALL';
  startDate?: string;
  endDate?: string;
}

export interface AuditPaginationState {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export type AuditExportFormat = 'json' | 'csv';

export interface AuditQueryResponse {
  records: AdminAuditDetailedRecord[];
  pagination: AuditPaginationState;
  fetchedAt: string;
  isStale: boolean;
  source: string;
}
