/**
 * V2-FE — Contract Readiness Boundary: CID validation tests.
 *
 * Covers valid/invalid CID, alternate encoding, Unicode, duplicate content,
 * mismatched digest, zero/oversized metadata, and fuzz tests.
 *
 * Acceptance criteria:
 *   - Equivalent CIDs normalize deterministically.
 *   - Unsupported codecs/hashes fail.
 *   - Digest/CID mismatch cannot register.
 *   - Events expose canonical identifiers.
 *
 * Test CIDs are built from known byte values using the same base58/base32
 * encoding as the module under test, so round-trip consistency is
 * guaranteed regardless of external IPFS test vectors.
 */

import {
  validateCid,
  isValidCid,
  normalizeCid,
  cidMatchesDigest,
  createCidRegistry,
  MAX_CID_STRING_LENGTH,
  type CidValidationResult,
} from '../cid-boundary';

// ---------------------------------------------------------------------------
// Test helpers: build CIDs from known bytes (same encoding as module)
// ---------------------------------------------------------------------------

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function encodeBase58(bytes: Uint8Array): string {
  let leadingZeros = 0;
  for (const b of bytes) { if (b === 0) leadingZeros++; else break; }
  let number = BigInt(0);
  for (const b of bytes) { number = number * BigInt(256) + BigInt(b); }
  const base = BigInt(58);
  const digits: string[] = [];
  while (number > BigInt(0)) {
    const rem = number % base;
    digits.unshift(BASE58_ALPHABET[Number(rem)]);
    number /= base;
  }
  return '1'.repeat(leadingZeros) + digits.join('');
}

function encodeBase32Test(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += alphabet[(value >> bits) & 0x1f];
    }
  }
  if (bits > 0) { out += alphabet[(value << (5 - bits)) & 0x1f]; }
  return out;
}

function encodeVarintTest(value: number): number[] {
  if (value < 0x80) return [value];
  if (value < 0x4000) return [0x80 | (value >> 8), value & 0xff];
  return [0xe0 | (value >> 24), (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function makeMultihash(hashFn: number, digestHex: string): Uint8Array {
  const digest = new Uint8Array(digestHex.length / 2);
  for (let i = 0; i < digest.length; i++) {
    digest[i] = parseInt(digestHex.slice(i * 2, i * 2 + 2), 16);
  }
  const hashFnBytes = encodeVarintTest(hashFn);
  const digestSizeBytes = encodeVarintTest(digest.length);
  return new Uint8Array([...hashFnBytes, ...digestSizeBytes, ...digest]);
}

function makeCidv0(multihash: Uint8Array): string {
  return encodeBase58(multihash);
}

function makeCidv1Base58(codec: number, multihash: Uint8Array): string {
  const codecBytes = encodeVarintTest(codec);
  const payload = new Uint8Array([0x01, ...codecBytes, ...multihash]);
  return 'z' + encodeBase58(payload);
}

function makeCidv1Base32(codec: number, multihash: Uint8Array): string {
  const codecBytes = encodeVarintTest(codec);
  const payload = new Uint8Array([0x01, ...codecBytes, ...multihash]);
  return 'b' + encodeBase32Test(payload);
}

function makeCidv1Base16(codec: number, multihash: Uint8Array): string {
  const codecBytes = encodeVarintTest(codec);
  const payload = new Uint8Array([0x01, ...codecBytes, ...multihash]);
  const hex = Array.from(payload, (b) => b.toString(16).padStart(2, '0')).join('');
  return 'f' + hex;
}

// Known test digests
const DIGEST_A = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'; // sha2-256("hello")
const DIGEST_B = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // sha2-256("")

// Pre-built CIDs
const MH_A_SHA256 = makeMultihash(0x12, DIGEST_A);
const CIDV0_A = makeCidv0(MH_A_SHA256); // CIDv0, dag-pb, sha2-256, digest A
const CIDV1_A_BASE32 = makeCidv1Base32(0x70, MH_A_SHA256); // CIDv1, dag-pb, sha2-256, digest A
const CIDV1_A_BASE58 = makeCidv1Base58(0x70, MH_A_SHA256); // CIDv1, dag-pb, sha2-256, digest A
const CIDV1_A_BASE16 = makeCidv1Base16(0x70, MH_A_SHA256); // CIDv1, dag-pb, sha2-256, digest A

const MH_B_SHA3_256 = makeMultihash(0x16, DIGEST_B);
const CIDV1_B_BASE32 = makeCidv1Base32(0x71, MH_B_SHA3_256); // CIDv1, dag-cbor, sha3-256, digest B

const MH_B_BLAKE2B = makeMultihash(0xb220, DIGEST_B);
const CIDV1_B_BLAKE_BASE32 = makeCidv1Base32(0x55, MH_B_BLAKE2B); // CIDv1, raw, blake2b-256, digest B

// ---------------------------------------------------------------------------
// Valid CIDs
// ---------------------------------------------------------------------------

describe('CID boundary — valid CIDs', () => {
  it('accepts a valid CIDv0 base58 string', () => {
    const result = validateCid(CIDV0_A);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.canonical).toBeDefined();
    expect(result.canonical).toMatch(/^b[1-9a-z]+$/);
    expect(result.parsed?.version).toBe(0);
    expect(result.parsed?.codec).toBe(0x70); // dag-pb
    expect(result.parsed?.hashFunction).toBe(0x12); // sha2-256
    expect(result.parsed?.digestHex).toBe(DIGEST_A);
  });

  it('accepts CIDv1 base32 canonical form (round-trip stability)', () => {
    const first = validateCid(CIDV0_A);
    expect(first.valid).toBe(true);
    const canonical = first.canonical!;

    const second = validateCid(canonical);
    expect(second.valid).toBe(true);
    expect(second.canonical).toBe(canonical);
    expect(second.parsed?.version).toBe(1);
  });

  it('accepts CIDv1 base58 (z-prefixed) with sha2-256', () => {
    const result = validateCid(CIDV1_A_BASE58);
    expect(result.valid).toBe(true);
    expect(result.canonical).toBeDefined();
  });

  it('accepts CIDv1 base32 (b-prefixed) with sha3-256', () => {
    const result = validateCid(CIDV1_B_BASE32);
    expect(result.valid).toBe(true);
    expect(result.parsed?.hashFunction).toBe(0x16);
    expect(result.parsed?.codec).toBe(0x71);
  });

  it('accepts CIDv1 base32 (b-prefixed) with blake2b-256', () => {
    const result = validateCid(CIDV1_B_BLAKE_BASE32);
    expect(result.valid).toBe(true);
    expect(result.parsed?.hashFunction).toBe(0xb220);
    expect(result.parsed?.codec).toBe(0x55);
  });

  it('accepts CIDv1 base16 (f-prefixed) with sha2-256', () => {
    const result = validateCid(CIDV1_A_BASE16);
    expect(result.valid).toBe(true);
    expect(result.parsed?.multibase).toBe('f');
  });

  it('isValidCid returns true for valid CIDs', () => {
    expect(isValidCid(CIDV0_A)).toBe(true);
  });

  it('isValidCid returns false for invalid input', () => {
    expect(isValidCid('')).toBe(false);
    expect(isValidCid('not-a-cid')).toBe(false);
    expect(isValidCid(null as unknown as string)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Normalization: equivalent CIDs normalize deterministically
// ---------------------------------------------------------------------------

describe('CID boundary — normalization', () => {
  it('CIDv0 and CIDv1 base32 of same content normalize to same canonical', () => {
    const v0 = validateCid(CIDV0_A);
    expect(v0.valid).toBe(true);

    const v1 = validateCid(CIDV1_A_BASE32);
    expect(v1.valid).toBe(true);
    expect(v1.canonical).toBe(v0.canonical);
  });

  it('CIDv0, CIDv1 base58, CIDv1 base16 all normalize to same canonical', () => {
    const canon0 = normalizeCid(CIDV0_A);
    const canon58 = normalizeCid(CIDV1_A_BASE58);
    const canon16 = normalizeCid(CIDV1_A_BASE16);
    expect(canon0).toBeDefined();
    expect(canon58).toBe(canon0);
    expect(canon16).toBe(canon0);
  });

  it('normalizeCid returns same canonical for equivalent CIDs', () => {
    const canon1 = normalizeCid(CIDV0_A);
    const canon2 = normalizeCid(CIDV1_A_BASE32);
    expect(canon2).toBe(canon1);
  });

  it('normalizeCid returns null for invalid CID', () => {
    expect(normalizeCid('not-a-cid')).toBeNull();
    expect(normalizeCid('')).toBeNull();
  });

  it('canonical form is always CIDv1 base32 (b-prefixed)', () => {
    const result = validateCid(CIDV0_A);
    expect(result.valid).toBe(true);
    expect(result.canonical).toMatch(/^b[1-9a-z]+$/);
  });

  it('canonical form is idempotent', () => {
    const result = validateCid(CIDV0_A);
    expect(result.valid).toBe(true);
    const canonical = result.canonical!;
    const revalidated = validateCid(canonical);
    expect(revalidated.valid).toBe(true);
    expect(revalidated.canonical).toBe(canonical);
  });
});

// ---------------------------------------------------------------------------
// Unsupported codecs/hashes fail
// ---------------------------------------------------------------------------

describe('CID boundary — unsupported codecs and hashes', () => {
  it('rejects unsupported hash function (sha1 = 0x11)', () => {
    const mh = new Uint8Array([0x11, 0x14, ...new Array(20).fill(0)]); // sha1, 20-byte digest
    const cid = makeCidv1Base58(0x70, mh);
    const result = validateCid(cid);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_hash');
  });

  it('rejects unsupported hash function (identity = 0x00)', () => {
    const mh = new Uint8Array([0x00, 0x20, ...new Array(32).fill(0)]);
    const cid = makeCidv1Base32(0x55, mh);
    const result = validateCid(cid);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_hash');
  });

  it('rejects unsupported codec (0x99)', () => {
    const mh = makeMultihash(0x12, DIGEST_A);
    const cid = makeCidv1Base58(0x99, mh);
    const result = validateCid(cid);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_codec');
  });

  it('rejects CIDv2 (version 2 not accepted)', () => {
    const mh = makeMultihash(0x12, DIGEST_A);
    // Build CID with version byte 0x02 — CIDv1 requires version byte 0x01,
    // so any other version byte is an invalid format.
    const payload = new Uint8Array([0x02, ...encodeVarintTest(0x70), ...mh]);
    const cid = 'z' + encodeBase58(payload);
    const result = validateCid(cid);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_format');
  });
});

// ---------------------------------------------------------------------------
// Digest/CID mismatch cannot register
// ---------------------------------------------------------------------------

describe('CID boundary — digest binding', () => {
  it('accepts when embedded digest matches expected digest', () => {
    const result = validateCid(CIDV0_A, {
      expectedDigest: '0x' + DIGEST_A,
    });
    expect(result.valid).toBe(true);
  });

  it('accepts when embedded digest matches expected digest (no 0x prefix)', () => {
    const result = validateCid(CIDV0_A, {
      expectedDigest: DIGEST_A,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects when embedded digest does not match expected digest', () => {
    const result = validateCid(CIDV0_A, {
      expectedDigest: '0x' + '0'.repeat(64),
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('digest_mismatch');
  });

  it('cidMatchesDigest returns true for matching digest', () => {
    expect(cidMatchesDigest(CIDV0_A, '0x' + DIGEST_A)).toBe(true);
  });

  it('cidMatchesDigest returns false for mismatched digest', () => {
    expect(cidMatchesDigest(CIDV0_A, '0x' + '0'.repeat(64))).toBe(false);
  });

  it('cidMatchesDigest returns false for invalid CID', () => {
    expect(cidMatchesDigest('not-a-cid', '0x' + DIGEST_A)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Duplicate behavior
// ---------------------------------------------------------------------------

describe('CID boundary — duplicate behavior', () => {
  it('rejects duplicate CID when registry tracks it', () => {
    const registry = createCidRegistry();

    const first = validateCid(CIDV0_A, {}, registry);
    expect(first.valid).toBe(true);

    const second = validateCid(CIDV0_A, {}, registry);
    expect(second.valid).toBe(false);
    expect(second.reason).toBe('duplicate');
  });

  it('allows duplicate when allowDuplicates is true', () => {
    const registry = createCidRegistry();

    const first = validateCid(CIDV0_A, { allowDuplicates: true }, registry);
    expect(first.valid).toBe(true);

    const second = validateCid(CIDV0_A, { allowDuplicates: true }, registry);
    expect(second.valid).toBe(true);
  });

  it('does not reject duplicate when no registry is provided', () => {
    const first = validateCid(CIDV0_A);
    expect(first.valid).toBe(true);

    const second = validateCid(CIDV0_A);
    expect(second.valid).toBe(true);
  });

  it('registry tracks size correctly', () => {
    const registry = createCidRegistry();
    expect(registry.size).toBe(0);

    validateCid(CIDV0_A, {}, registry);
    expect(registry.size).toBe(1);

    validateCid(CIDV1_B_BASE32, {}, registry);
    expect(registry.size).toBe(2);

    validateCid(CIDV0_A, {}, registry);
    expect(registry.size).toBe(2);
  });

  it('registry clear resets duplicate tracking', () => {
    const registry = createCidRegistry();
    validateCid(CIDV0_A, {}, registry);
    expect(registry.size).toBe(1);

    registry.clear();
    expect(registry.size).toBe(0);

    const again = validateCid(CIDV0_A, {}, registry);
    expect(again.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unicode and malformed input
// ---------------------------------------------------------------------------

describe('CID boundary — Unicode and malformed input', () => {
  it('rejects CID with whitespace', () => {
    const result = validateCid(CIDV0_A + ' ');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_format');
  });

  it('rejects CID with Unicode directional characters', () => {
    const result = validateCid('\u202a' + CIDV0_A);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_format');
  });

  it('rejects CID with null bytes', () => {
    const result = validateCid('Qm\0' + CIDV0_A.slice(2));
    expect(result.valid).toBe(false);
  });

  it('rejects obviously non-CID strings', () => {
    expect(validateCid('not-a-cid').valid).toBe(false);
    expect(validateCid('http://example.com').valid).toBe(false);
    expect(validateCid('ipfs://QmTest').valid).toBe(false);
    expect(validateCid('0x1234').valid).toBe(false);
  });

  it('rejects CID with invalid base58 characters', () => {
    const result = validateCid(CIDV0_A.slice(0, -1) + 'I'); // 'I' not in base58
    expect(result.valid).toBe(false);
  });

  it('rejects empty CID', () => {
    expect(validateCid('').valid).toBe(false);
    expect(validateCid('   ').valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Size policy: zero/oversized metadata
// ---------------------------------------------------------------------------

describe('CID boundary — size policy', () => {
  it('rejects oversized CID string', () => {
    const oversized = 'Q'.repeat(MAX_CID_STRING_LENGTH + 1);
    const result = validateCid(oversized);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('oversized');
  });

  it('allows custom maxLength override', () => {
    const result = validateCid(CIDV0_A, { maxLength: 10 });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('oversized');
  });
});

// ---------------------------------------------------------------------------
// Fuzz tests
// ---------------------------------------------------------------------------

describe('CID boundary — fuzz tests', () => {
  it('never crashes on random input and always returns a well-formed result', () => {
    const inputs = [
      '', ' ', '\n', '\t', 'Qm', CIDV0_A,
      'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      'z' + CIDV0_A, 'f' + '01'.repeat(100), '🚀',
      'Qm' + '🚀'.repeat(50), CIDV0_A.repeat(10),
      null as unknown as string, undefined as unknown as string,
      123 as unknown as string, {}, [] as unknown as string,
    ];

    for (const input of inputs) {
      const result = validateCid(input as string);
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      if (result.valid) {
        expect(result.canonical).toBeDefined();
        expect(result.parsed).toBeDefined();
        expect(result.error).toBeUndefined();
      } else {
        expect(result.reason).toBeDefined();
        expect([
          'invalid_format', 'unsupported_version', 'unsupported_codec',
          'unsupported_hash', 'digest_mismatch', 'duplicate', 'oversized',
          'invalid_multibase', 'invalid_multihash',
        ]).toContain(result.reason);
      }
    }
  });

  it('random base58 strings are almost always invalid (fail-closed)', () => {
    let validCount = 0;
    const trials = 100;
    const alphabet = BASE58_ALPHABET.split('');

    for (let i = 0; i < trials; i++) {
      let s = '';
      for (let j = 0; j < 46; j++) {
        s += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      if (validateCid(s).valid) validCount++;
    }

    // Valid CIDs require specific multihash structure; random strings should
    // almost never be valid.
    expect(validCount).toBeLessThanOrEqual(trials * 0.5);
  });

  it('fuzz with random bytes encoded as base32 CIDv1', () => {
    let validCount = 0;
    const trials = 50;

    for (let i = 0; i < trials; i++) {
      const bytes = new Uint8Array(35);
      for (let j = 0; j < 35; j++) bytes[j] = Math.floor(Math.random() * 256);
      const cid = 'b' + encodeBase32Test(bytes);
      if (validateCid(cid).valid) validCount++;
    }

    expect(validCount).toBeLessThanOrEqual(trials * 0.5);
  });
});

// ---------------------------------------------------------------------------
// Events expose canonical identifiers
// ---------------------------------------------------------------------------

describe('CID boundary — canonical identifiers for events', () => {
  it('provides canonical CID suitable for event emission', () => {
    const result = validateCid(CIDV0_A);
    expect(result.valid).toBe(true);

    const canonical = result.canonical!;
    expect(typeof canonical).toBe('string');
    expect(canonical.length).toBeGreaterThan(0);

    const revalidated = validateCid(canonical);
    expect(revalidated.valid).toBe(true);
    expect(revalidated.canonical).toBe(canonical);
  });

  it('canonical CID identifies the same content across versions', () => {
    const v0canon = normalizeCid(CIDV0_A)!;
    const v1b58canon = normalizeCid(CIDV1_A_BASE58)!;
    const v1b16canon = normalizeCid(CIDV1_A_BASE16)!;

    expect(v1b58canon).toBe(v0canon);
    expect(v1b16canon).toBe(v0canon);
  });
});
