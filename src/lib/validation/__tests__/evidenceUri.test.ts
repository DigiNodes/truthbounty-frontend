import {
  validateEvidenceUri,
  getSafeEvidenceHref,
  SUPPORTED_EVIDENCE_SCHEMES,
  MAX_EVIDENCE_URI_LENGTH,
} from '../evidenceUri';

describe('validateEvidenceUri', () => {
  it('defines supported schemes to strictly https: and ipfs:', () => {
    expect(SUPPORTED_EVIDENCE_SCHEMES).toEqual(['https:', 'ipfs:']);
  });

  describe('valid URIs', () => {
    it('accepts valid HTTPS URLs', () => {
      const result = validateEvidenceUri('https://example.com/evidence/123');
      expect(result.isValid).toBe(true);
      expect(result.scheme).toBe('https:');
      expect(result.error).toBeNull();
    });

    it('accepts valid IPFS URIs', () => {
      const result = validateEvidenceUri('ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco');
      expect(result.isValid).toBe(true);
      expect(result.scheme).toBe('ipfs:');
      expect(result.error).toBeNull();
    });
  });

  describe('empty / missing inputs', () => {
    it('rejects empty string', () => {
      const result = validateEvidenceUri('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Evidence URI is required');
    });

    it('rejects null or undefined', () => {
      expect(validateEvidenceUri(null).isValid).toBe(false);
      expect(validateEvidenceUri(undefined).isValid).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      const result = validateEvidenceUri('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Evidence URI is required');
    });
  });

  describe('unsupported schemes', () => {
    it('rejects http: scheme (must be https)', () => {
      const result = validateEvidenceUri('http://insecure.example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unsupported scheme: only https and ipfs are allowed');
    });

    it('rejects ftp: scheme', () => {
      const result = validateEvidenceUri('ftp://ftp.example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unsupported scheme: only https and ipfs are allowed');
    });

    it('fails closed against javascript: XSS vectors', () => {
      const result = validateEvidenceUri('javascript:alert(1)');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unsupported scheme: only https and ipfs are allowed');
    });

    it('fails closed against data: schemes', () => {
      const result = validateEvidenceUri('data:text/html,<script>alert(1)</script>');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unsupported scheme: only https and ipfs are allowed');
    });

    it('fails closed against file: schemes', () => {
      const result = validateEvidenceUri('file:///etc/passwd');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unsupported scheme: only https and ipfs are allowed');
    });
  });

  describe('oversized input', () => {
    it('rejects URIs exceeding 1024 characters', () => {
      const longUri = 'https://example.com/' + 'a'.repeat(MAX_EVIDENCE_URI_LENGTH);
      const result = validateEvidenceUri(longUri);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Oversized input: evidence URI must be under 1024 characters');
    });
  });

  describe('raw secret detection', () => {
    it('rejects URIs with embedded query secrets (password=)', () => {
      const result = validateEvidenceUri('https://example.com/api?password=supersecret');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Raw secrets detected in URI. Please remove sensitive information.');
    });

    it('rejects URIs with embedded query secrets (token=)', () => {
      const result = validateEvidenceUri('https://example.com/api?token=abc12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Raw secrets detected in URI. Please remove sensitive information.');
    });

    it('rejects URIs with embedded basic auth credentials', () => {
      const result = validateEvidenceUri('https://user:password123@example.com/evidence');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Raw secrets detected in URI. Please remove sensitive information.');
    });
  });

  describe('malformed URIs', () => {
    it('rejects completely invalid strings', () => {
      const result = validateEvidenceUri('not-a-valid-uri');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid Evidence URI');
    });
  });
});

describe('getSafeEvidenceHref', () => {
  it('returns valid https URL unmodified', () => {
    expect(getSafeEvidenceHref('https://truthbounty.io/evidence/1')).toBe(
      'https://truthbounty.io/evidence/1'
    );
  });

  it('resolves ipfs:// to safe https gateway URL', () => {
    expect(getSafeEvidenceHref('ipfs://bafybeic56...')).toBe(
      'https://ipfs.io/ipfs/bafybeic56...'
    );
  });

  it('returns null for unsupported or invalid scheme', () => {
    expect(getSafeEvidenceHref('javascript:alert(1)')).toBeNull();
    expect(getSafeEvidenceHref('http://unencrypted.com')).toBeNull();
    expect(getSafeEvidenceHref('invalid-uri')).toBeNull();
  });
});