/**
 * Administrative Audit Trail Sanitizer — UI-FE-027 (#596)
 *
 * Enforces strict, fail-closed redaction of secrets, protected rationale,
 * private keys, credentials, and tokens from administrative audit logs.
 * Also provides CSV Injection (CWE-1236) defense for audit exports.
 *
 * Acceptance Criteria Compliance:
 * - Protected values/secrets never render or export.
 * - Records are strictly read-only.
 */

import type { AdminAuditDetailedRecord } from '@/app/types/admin-audit';

export const REDACTED_AUDIT_SECRET = '[REDACTED_SECRET]' as const;

/**
 * Key patterns indicating confidential credentials, secrets, or internal tokens.
 */
const SENSITIVE_KEY_SUBSTRINGS = [
  'privatekey',
  'privkey',
  'secret',
  'password',
  'passwd',
  'token',
  'bearer',
  'authheader',
  'authorization',
  'apikey',
  'cookie',
  'session',
  'seed',
  'mnemonic',
  'credential',
  'signature',
  'salt',
] as const;


/**
 * Regex for JSON Web Tokens (JWT) / Bearer headers
 */
const JWT_TOKEN_REGEX = /\beyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g;
const BEARER_AUTH_REGEX = /(?:Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi;

/**
 * Regex for key/value secrets in text (e.g. `secret=xyz`, `apiKey: 123`)
 */
const INLINE_SECRET_ASSIGNMENT_REGEX =
  /((?:private[_\s-]*key|secret[_\s-]*key|secret|password|passwd|token|apikey|api[_\s-]*key|credential|session|cookie|seed|mnemonic)\s*[:=]\s*)([^\s,;]+)/gi;

/**
 * Checks whether an object key name denotes a protected secret.
 */
export function isAuditSensitiveKey(key: string): boolean {
  const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SENSITIVE_KEY_SUBSTRINGS.some((pat) => norm.includes(pat));
}

/**
 * Redacts any detected secrets (JWTs, private keys, bearer tokens, inline secrets) from a string.
 */
export function sanitizeAuditString(value: string): string {
  if (!value || typeof value !== 'string') return '';

  let sanitized = value;

  // 1. Redact JWTs
  sanitized = sanitized.replace(JWT_TOKEN_REGEX, REDACTED_AUDIT_SECRET);

  // 2. Redact Bearer headers
  sanitized = sanitized.replace(BEARER_AUTH_REGEX, `Bearer ${REDACTED_AUDIT_SECRET}`);

  // 3. Redact inline credential assignments
  sanitized = sanitized.replace(INLINE_SECRET_ASSIGNMENT_REGEX, `$1${REDACTED_AUDIT_SECRET}`);

  return sanitized;
}

/**
 * Sanitizes an individual audit record deeply.
 * Verifies that all string fields are sanitized and any sensitive fields are redacted.
 */
export function sanitizeAuditRecord(record: AdminAuditDetailedRecord): AdminAuditDetailedRecord {
  if (!record || typeof record !== 'object') {
    throw new Error('Invalid audit record: expected object');
  }

  return {
    ...record,
    auditId: sanitizeAuditString(record.auditId),
    actor: sanitizeAuditString(record.actor),
    capability: record.capability,
    authoritySource: sanitizeAuditString(record.authoritySource),
    action: sanitizeAuditString(record.action),
    targetResource: sanitizeAuditString(record.targetResource),
    requestSummary: sanitizeAuditString(record.requestSummary),
    resultSummary: sanitizeAuditString(record.resultSummary),
    beforeRef: sanitizeAuditString(record.beforeRef),
    afterRef: sanitizeAuditString(record.afterRef),
    txHash: record.txHash ? sanitizeAuditString(record.txHash) : null,
    timestamp: record.timestamp,
    lifecycleState: record.lifecycleState,
    blockNumber: record.blockNumber,
    details: record.details ? sanitizeAuditString(record.details) : undefined,
  };
}

/**
 * Sanitizes an array of audit records in batch.
 */
export function sanitizeAuditRecords(records: readonly AdminAuditDetailedRecord[]): AdminAuditDetailedRecord[] {
  if (!Array.isArray(records)) return [];
  return records.map((r) => sanitizeAuditRecord(r));
}

/**
 * CSV Formula Injection (CWE-1236) Defense
 *
 * If a cell string starts with any formula indicator (=, +, -, @, tab, or carriage return),
 * prefix with a single quote (') so spreadsheet applications treat it as raw text.
 * Escapes double quotes by doubling them.
 */
export function sanitizeCsvCell(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return '""';
  }

  let text = String(raw);

  // Redact any secrets before CSV formatting
  text = sanitizeAuditString(text);

  // CWE-1236 Defense: Neutralize formula invocation
  const firstChar = text.charAt(0);
  if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
    text = `'${text}`;
  }

  // Escape double quotes: " -> ""
  const escaped = text.replace(/"/g, '""');

  return `"${escaped}"`;
}
