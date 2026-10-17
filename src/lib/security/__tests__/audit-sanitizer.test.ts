import {
  REDACTED_AUDIT_SECRET,
  isAuditSensitiveKey,
  sanitizeAuditString,
  sanitizeAuditRecord,
  sanitizeAuditRecords,
  sanitizeCsvCell,
} from '../audit-sanitizer';
import type { AdminAuditDetailedRecord } from '@/app/types/admin-audit';

describe('UI-FE-027: Administrative Audit Trail Sanitizer', () => {
  describe('Sensitive Key Detection', () => {
    it('detects sensitive keys correctly', () => {
      expect(isAuditSensitiveKey('privateKey')).toBe(true);
      expect(isAuditSensitiveKey('priv_key')).toBe(true);
      expect(isAuditSensitiveKey('bearerToken')).toBe(true);
      expect(isAuditSensitiveKey('sessionSecret')).toBe(true);
      expect(isAuditSensitiveKey('authHeader')).toBe(true);
      expect(isAuditSensitiveKey('mnemonic_seed')).toBe(true);
      expect(isAuditSensitiveKey('apiKey')).toBe(true);
      expect(isAuditSensitiveKey('password')).toBe(true);

      // Non-sensitive keys
      expect(isAuditSensitiveKey('auditId')).toBe(false);
      expect(isAuditSensitiveKey('actor')).toBe(false);
      expect(isAuditSensitiveKey('action')).toBe(false);
      expect(isAuditSensitiveKey('authoritySource')).toBe(false);
    });
  });

  describe('Secret String Redaction', () => {
    it('redacts JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature123';
      const input = `User authentication token: ${jwt} generated`;
      const sanitized = sanitizeAuditString(input);

      expect(sanitized).not.toContain(jwt);
      expect(sanitized).toContain(REDACTED_AUDIT_SECRET);
    });

    it('redacts Bearer authorization headers', () => {
      const input = 'Request headers: Bearer ya29.a0AfH6SMD_very_secret_token_123';
      const sanitized = sanitizeAuditString(input);

      expect(sanitized).toBe(`Request headers: Bearer ${REDACTED_AUDIT_SECRET}`);
    });

    it('redacts inline credentials and private keys', () => {
      const input = 'Execution context: privateKey: 0x9999888877776666555544443333222211110000aaaabbbbccccddddeeeeffff; apiKey: live_super_secret_123; password: AdminPassword!';
      const sanitized = sanitizeAuditString(input);

      expect(sanitized).not.toContain('0x9999888877776666555544443333222211110000aaaabbbbccccddddeeeeffff');
      expect(sanitized).not.toContain('live_super_secret_123');
      expect(sanitized).not.toContain('AdminPassword!');
    });
  });

  describe('Deep Audit Record Sanitization', () => {
    const mockRecord: AdminAuditDetailedRecord = {
      auditId: 'AUD-2026-0327-01',
      actor: '0x1234567890123456789012345678901234567890',
      capability: 'PROTOCOL_OPERATOR',
      authoritySource: 'Optimism L2 Registry',
      action: 'Replay Failed Batch',
      targetResource: 'Indexer Ingestion Pipeline',
      requestSummary: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.signature batchId=4410',
      resultSummary: 'Success with secretKey=abc12345',
      beforeRef: '0x0000000000000000000000000000000000000001',
      afterRef: '0x0000000000000000000000000000000000000002',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      timestamp: '2026-03-27T08:00:00Z',
      lifecycleState: 'confirmed',
      details: 'privateKey: 0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
    };

    it('strictly redacts secrets across all record fields', () => {
      const sanitized = sanitizeAuditRecord(mockRecord);

      expect(sanitized.requestSummary).not.toContain('eyJhbGciOiJIUzI1Ni');
      expect(sanitized.requestSummary).toContain(REDACTED_AUDIT_SECRET);

      expect(sanitized.resultSummary).not.toContain('abc12345');
      expect(sanitized.resultSummary).toContain(REDACTED_AUDIT_SECRET);

      expect(sanitized.details).not.toContain('0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff');
      expect(sanitized.details).toContain(REDACTED_AUDIT_SECRET);

      // Legit references and identities are preserved
      expect(sanitized.auditId).toBe('AUD-2026-0327-01');
      expect(sanitized.actor).toBe('0x1234567890123456789012345678901234567890');
      expect(sanitized.txHash).toBe('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    });

    it('batch sanitizes records correctly', () => {
      const batch = sanitizeAuditRecords([mockRecord]);
      expect(batch).toHaveLength(1);
      expect(batch[0].details).toContain(REDACTED_AUDIT_SECRET);
    });
  });

  describe('CSV Injection Neutralization (CWE-1236)', () => {
    it('prepends single quote to cells beginning with formula triggers (=, +, -, @)', () => {
      expect(sanitizeCsvCell('=SUM(1+1)')).toBe(`"'=SUM(1+1)"`);
      expect(sanitizeCsvCell('+cmd|/c calc')).toBe(`"'+cmd|/c calc"`);
      expect(sanitizeCsvCell('-2+5')).toBe(`"'-2+5"`);
      expect(sanitizeCsvCell('@admin_secret')).toBe(`"'@admin_secret"`);
    });

    it('prepends single quote to cells starting with tab or carriage return', () => {
      expect(sanitizeCsvCell('\t=calc')).toBe(`"'\t=calc"`);
      expect(sanitizeCsvCell('\r=calc')).toBe(`"'\r=calc"`);
    });

    it('escapes internal double quotes by doubling them', () => {
      expect(sanitizeCsvCell('Action with "quotes" inside')).toBe(`"Action with ""quotes"" inside"`);
    });

    it('handles null and undefined gracefully', () => {
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });
  });
});
