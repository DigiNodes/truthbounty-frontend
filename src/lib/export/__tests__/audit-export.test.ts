import {
  generateSanitizedAuditJson,
  generateSanitizedAuditCsv,
  generateAuditExportFilename,
  triggerAuditDownload,
  CSV_HEADERS,
} from '../audit-export';
import type { AdminAuditDetailedRecord } from '@/app/types/admin-audit';
import { REDACTED_AUDIT_SECRET } from '@/lib/security/audit-sanitizer';

describe('UI-FE-027: Administrative Audit Trail Export Utilities', () => {
  const mockRecords: AdminAuditDetailedRecord[] = [
    {
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
      blockNumber: 12345678,
      details: 'privateKey: 0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
    },
    {
      auditId: 'AUD-2026-0327-02',
      actor: '0x9876543210987654321098765432109876543210',
      capability: 'AUDIT_ADMIN',
      authoritySource: 'Verified Release Manifest',
      action: '=cmd|/c calc', // Injected formula attempt!
      targetResource: 'DeadLetterQueue Storage',
      requestSummary: 'Archive stale queue items',
      resultSummary: 'Archived 3 records',
      beforeRef: '0x1111111111111111111111111111111111111111',
      afterRef: '0x2222222222222222222222222222222222222222',
      txHash: null,
      timestamp: '2026-03-27T08:30:00Z',
      lifecycleState: 'projected',
      details: 'Normal archive execution',
    },
  ];

  describe('JSON Export', () => {
    it('generates valid JSON with redacted secrets and export metadata', () => {
      const jsonStr = generateSanitizedAuditJson(mockRecords);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.exportVersion).toBe('1.0.0');
      expect(parsed.recordCount).toBe(2);
      expect(parsed.canonicalNetwork).toBe('Optimism / EVM');
      expect(Array.isArray(parsed.records)).toBe(true);

      // Verify secret redaction in exported JSON
      expect(jsonStr).not.toContain('eyJhbGciOiJIUzI1Ni');
      expect(jsonStr).not.toContain('abc12345');
      expect(jsonStr).not.toContain('0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff');
      expect(jsonStr).toContain(REDACTED_AUDIT_SECRET);
    });
  });

  describe('CSV Export', () => {
    it('includes all required CSV headers', () => {
      const csv = generateSanitizedAuditCsv(mockRecords);
      const firstLine = csv.split('\r\n')[0];

      CSV_HEADERS.forEach((h) => {
        expect(firstLine).toContain(`"${h}"`);
      });
    });

    it('redacts secrets and neutralizes CSV formula injection attempts', () => {
      const csv = generateSanitizedAuditCsv(mockRecords);
      const lines = csv.split('\r\n');

      expect(lines).toHaveLength(3); // Header + 2 data rows

      // Verify secret redaction
      expect(csv).not.toContain('eyJhbGciOiJIUzI1Ni');
      expect(csv).not.toContain('abc12345');
      expect(csv).not.toContain('0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff');

      // Verify formula injection neutralized: "=cmd|/c calc" must become "'=cmd|/c calc"
      expect(csv).toContain(`"'=cmd|/c calc"`);
    });

    it('distinctly records lifecycle states (confirmed vs projected)', () => {
      const csv = generateSanitizedAuditCsv(mockRecords);
      expect(csv).toContain('"confirmed"');
      expect(csv).toContain('"projected"');
    });
  });

  describe('Filename Generation', () => {
    it('generates deterministic timestamped filenames for json and csv', () => {
      const fixedDate = new Date('2026-10-17T09:30:00.000Z');
      const csvFilename = generateAuditExportFilename('csv', fixedDate);
      const jsonFilename = generateAuditExportFilename('json', fixedDate);

      expect(csvFilename).toBe('truthbounty-audit-trail-20261017-093000.csv');
      expect(jsonFilename).toBe('truthbounty-audit-trail-20261017-093000.json');
    });
  });

  describe('Download Trigger', () => {
    it('safely handles non-browser environment or DOM errors', () => {
      const result = triggerAuditDownload('content', 'test.csv', 'text/csv;charset=utf-8;');
      // In JSDOM this may succeed or safely return false without crashing
      expect(typeof result).toBe('boolean');
    });
  });
});
