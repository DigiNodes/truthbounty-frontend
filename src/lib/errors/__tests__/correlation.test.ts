import {
  CORRELATION_HEADER_NAMES,
  createCorrelationReference,
  isCorrelationReference,
  readCorrelationReference,
  resolveCorrelationReference,
  sanitizeCorrelationReference,
} from '../correlation';

const LOCAL = /^TB-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

/** Things that must NEVER be accepted as, or leak through, a correlation reference. */
const SENSITIVE_CANDIDATES: Record<string, string> = {
  'wallet signature (65 bytes)': '0x' + 'ab'.repeat(65),
  'private key / 32-byte hash': '0x' + 'cd'.repeat(32),
  'bare 64-hex key': 'ef'.repeat(32),
  'wallet address': '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
  'JWT': 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  'bearer token': 'Bearer abc123def456ghi789',
  // Assembled at runtime so the repo secret scanner doesn't flag the fixture itself.
  'api secret': ['sk', 'live', '51H8exampleSecretKey'].join('_'),
  'email': 'person@example.com',
  'evidence URL': 'https://evidence.example/claim/secret-file.pdf',
  'IPFS CID': 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
  'script': '<script>alert(1)</script>',
  'whitespace / newline injection': 'TB-AAAA-BBBB-CCCC\nX-Injected: 1',
  'path traversal': '../../etc/passwd',
  'oversized': 'A'.repeat(500),
  'local lookalike with ambiguous chars': 'TB-IOLU-IOLU-IOLU',
  'unprefixed 32-hex (could be a key fragment)': '0123456789abcdef0123456789abcdef',
};

describe('createCorrelationReference', () => {
  it('has the documented TB-XXXX-XXXX-XXXX shape', () => {
    for (let i = 0; i < 50; i += 1) expect(createCorrelationReference()).toMatch(LOCAL);
  });

  it('is random (no collisions across many mints) and independent of any input', () => {
    const seen = new Set(Array.from({ length: 2000 }, () => createCorrelationReference()));
    expect(seen.size).toBe(2000);
  });

  it('survives its own validator', () => {
    expect(isCorrelationReference(createCorrelationReference())).toBe(true);
  });
});

describe('sanitizeCorrelationReference (fail closed, accept verbatim or not at all)', () => {
  it('accepts our own format and hyphenated UUIDs', () => {
    expect(sanitizeCorrelationReference('TB-7K2M-9QXD-4HFA')).toBe('TB-7K2M-9QXD-4HFA');
    expect(sanitizeCorrelationReference('3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe(
      '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    );
  });

  it.each(Object.entries(SENSITIVE_CANDIDATES))('rejects %s', (_label, candidate) => {
    expect(sanitizeCorrelationReference(candidate)).toBeNull();
  });

  it.each([undefined, null, 42, {}, [], true, ''])('rejects non-string / empty input %p', (candidate) => {
    expect(sanitizeCorrelationReference(candidate)).toBeNull();
  });

  it('never returns a transformed value', () => {
    // A valid reference padded with junk is rejected, not "cleaned".
    expect(sanitizeCorrelationReference(' TB-7K2M-9QXD-4HFA ')).toBeNull();
    expect(sanitizeCorrelationReference('TB-7K2M-9QXD-4HFA-extra')).toBeNull();
  });
});

describe('readCorrelationReference', () => {
  const headers = (map: Record<string, string>) => ({
    get: (name: string) => map[name.toLowerCase()] ?? null,
  });

  it('reads x-correlation-id before x-request-id', () => {
    expect(CORRELATION_HEADER_NAMES).toEqual(['x-correlation-id', 'x-request-id']);
    expect(
      readCorrelationReference(
        headers({ 'x-correlation-id': 'TB-AAAA-BBBB-CCCC', 'x-request-id': 'TB-DDDD-EEEE-FFFF' }),
      ),
    ).toBe('TB-AAAA-BBBB-CCCC');
  });

  it('falls through to x-request-id when the first header is unsafe', () => {
    expect(
      readCorrelationReference(
        headers({ 'x-correlation-id': '0x' + 'ab'.repeat(65), 'x-request-id': 'TB-DDDD-EEEE-FFFF' }),
      ),
    ).toBe('TB-DDDD-EEEE-FFFF');
  });

  it('returns null when absent, malformed or when the reader throws', () => {
    expect(readCorrelationReference(null)).toBeNull();
    expect(readCorrelationReference(undefined)).toBeNull();
    expect(readCorrelationReference(headers({}))).toBeNull();
    expect(
      readCorrelationReference({
        get: () => {
          throw new Error('boom');
        },
      }),
    ).toBeNull();
  });
});

describe('resolveCorrelationReference', () => {
  it('uses a valid adapter reference', () => {
    expect(resolveCorrelationReference('TB-7K2M-9QXD-4HFA')).toEqual({
      reference: 'TB-7K2M-9QXD-4HFA',
      origin: 'adapter',
      rejected: false,
    });
  });

  it('replaces an unsafe adapter reference with a local one and flags the rejection', () => {
    const secret = '0x' + 'ab'.repeat(65);
    const resolved = resolveCorrelationReference(secret);
    expect(resolved.origin).toBe('local');
    expect(resolved.rejected).toBe(true);
    expect(resolved.reference).toMatch(LOCAL);
    expect(resolved.reference).not.toContain('abab');
  });

  it('mints locally without flagging when nothing was supplied', () => {
    expect(resolveCorrelationReference(undefined)).toMatchObject({ origin: 'local', rejected: false });
  });
});
