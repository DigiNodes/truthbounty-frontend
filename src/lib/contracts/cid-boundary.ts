/**
 * V2-FE — Contract Readiness Boundary: CID validation.
 *
 * Defines the accepted CID versions, codecs, and hash functions for
 * content-addressed references that can be registered against the
 * Optimism/EVM protocol contracts. Fail-closed: any CID that does not
 * conform to the accepted profile is rejected.
 *
 * Accepted profile:
 *   - Versions: 0, 1
 *   - Codecs: dag-pb (0x70), dag-cbor (0x71), raw (0x55)
 *   - Hash functions: sha2-256 (0x12), sha3-256 (0x16), blake2b-256 (0xb220)
 *   - Multibase encodings: base58btc ('z'), base32 lowercase ('b'), base16 lowercase ('f')
 *   - CIDv0 is implicitly base58btc + sha2-256 + dag-pb (the IPFS legacy format)
 *
 * Security invariants:
 *   - Equivalent CIDs (same content, different encoding/version) normalize to
 *     the same canonical CIDv1 base32 string.
 *   - Unsupported codecs and hash functions are rejected.
 *   - A CID whose embedded digest does not match the expected digest is rejected.
 *   - Duplicate CIDs are rejected by the registry.
 *   - Size limits prevent oversized inputs.
 *   - Unicode/control characters in CID strings are rejected.
 *
 * This module is pure and deterministic. It never fabricates CIDs, digests,
 * or protocol state. All multibase/base58/base32/base16 decoding is
 * implemented from scratch — no external multiformats dependency is used,
 * so the accepted profile is explicit and pinned.
 */

// ---------------------------------------------------------------------------
// Multibase prefixes (RFC, multiformats/multibase)
// ---------------------------------------------------------------------------

const MULTIBASE_PREFIX: Record<string, { name: string; decode: (input: string) => Uint8Array | null }> = {
  z: { name: 'base58btc', decode: decodeBase58 },
  b: { name: 'base32lower', decode: decodeBase32 },
  B: { name: 'base32upper', decode: decodeBase32 }, // base32 uppercase, case-insensitive decode
  f: { name: 'base16lower', decode: decodeBase16 },
  F: { name: 'base16upper', decode: decodeBase16 },
} as const;

type MultibasePrefix = keyof typeof MULTIBASE_PREFIX;

// ---------------------------------------------------------------------------
// Multihash function codes (multiformats/multihash)
// ---------------------------------------------------------------------------

const MULTIHASH_CODE: Record<number, string> = {
  0x00: 'identity',
  0x11: 'sha1',
  0x12: 'sha2-256',
  0x13: 'sha2-512',
  0x16: 'sha3-256',
  0x17: 'sha3-512',
  0xb201: 'blake2b-128',
  0xb202: 'blake2b-256',
  0xb204: 'blake2b-512',
  0xb220: 'blake2b-256',
  0xb240: 'blake2b-512',
} as const;

const ACCEPTED_HASH_FUNCTIONS = new Set([0x12, 0x16, 0xb220]); // sha2-256, sha3-256, blake2b-256

// Accepted CID versions
const ACCEPTED_VERSIONS = new Set([0, 1]);

// ---------------------------------------------------------------------------
// Codecs (multiformats/multicodec)
// ---------------------------------------------------------------------------

const CODEC_NAME: Record<number, string> = {
  0x00: 'raw',
  0x55: 'raw',
  0x70: 'dag-pb',
  0x71: 'dag-cbor',
} as const;

const ACCEPTED_CODECS = new Set([0x55, 0x70, 0x71]); // raw, dag-pb, dag-cbor

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

export const MAX_CID_STRING_LENGTH = 1024;
export const MAX_MULTIHASH_DIGEST_SIZE = 64; // 512-bit digest max
export const MIN_MULTIHASH_DIGEST_SIZE = 1;

// Expected digest byte lengths per accepted hash function
const EXPECTED_DIGEST_SIZE: Record<number, number> = {
  0x12: 32, // sha2-256
  0x16: 32, // sha3-256
  0xb220: 32, // blake2b-256
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CidVersion = 0 | 1;

export interface ParsedCid {
  readonly version: CidVersion;
  readonly codec: number;
  readonly codecName: string;
  readonly hashFunction: number;
  readonly hashFunctionName: string;
  readonly digest: Uint8Array;
  readonly digestHex: string; // lowercase hex, no 0x prefix
  readonly multibase: string;
  readonly multibaseName: string;
  /** Canonical CIDv1 base32 string (lowercase 'b' prefix). */
  readonly canonical: string;
}

export interface CidValidationOptions {
  /**
   * Expected content digest (hex, with or without '0x' prefix). When
   * provided, the digest embedded in the CID's multihash must match this
   * value exactly, otherwise the CID is rejected (digest binding).
   */
  readonly expectedDigest?: string;
  /** Whether duplicate CIDs are allowed (default: false — rejected). */
  readonly allowDuplicates?: boolean;
  /** Max CID string length (default: MAX_CID_STRING_LENGTH). */
  readonly maxLength?: number;
}

export interface CidValidationResult {
  readonly valid: boolean;
  /** Canonical normalized CIDv1 base32 string when valid. */
  readonly canonical?: string;
  readonly parsed?: ParsedCid;
  readonly error?: string;
  /**
   * Machine-readable rejection reason:
   *   - 'invalid_format' — CID string could not be parsed
   *   - 'unsupported_version' — CID version not in accepted set
   *   - 'unsupported_codec' — codec not in accepted set
   *   - 'unsupported_hash' — hash function not in accepted set
   *   - 'digest_mismatch' — embedded digest does not match expectedDigest
   *   - 'duplicate' — CID already registered in the registry
   *   - 'oversized' — CID string exceeds max length
   *   - 'invalid_multibase' — unknown multibase prefix
   *   - 'invalid_multihash' — malformed multihash (bad code, length, or digest size)
   */
  readonly reason?:
    | 'invalid_format'
    | 'unsupported_version'
    | 'unsupported_codec'
    | 'unsupported_hash'
    | 'digest_mismatch'
    | 'duplicate'
    | 'oversized'
    | 'invalid_multibase'
    | 'invalid_multihash';
}

// ---------------------------------------------------------------------------
// Base58 decoding (Bitcoin alphabet, no external dependency)
// ---------------------------------------------------------------------------

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_BASE = BigInt(58);
const BASE58_BYTE = BigInt(256);

/**
 * Decode a base58btc string to bytes. Returns null on invalid input.
 */
function decodeBase58(input: string): Uint8Array | null {
  if (input.length === 0) return null;
  for (const ch of input) {
    if (BASE58_ALPHABET.indexOf(ch) === -1) return null;
  }

  // Count leading '1' characters (each represents a leading zero byte)
  let leadingZeros = 0;
  for (const ch of input) {
    if (ch === '1') leadingZeros++;
    else break;
  }

  let number = BigInt(0);
  for (const ch of input) {
    const digit = BASE58_ALPHABET.indexOf(ch);
    number = number * BASE58_BASE + BigInt(digit);
  }

  const bytes: number[] = [];
  while (number > BigInt(0)) {
    bytes.unshift(Number(number % BASE58_BYTE));
    number /= BASE58_BYTE;
  }

  for (let i = 0; i < leadingZeros; i++) {
    bytes.unshift(0);
  }

  return new Uint8Array(bytes);
}

// ---------------------------------------------------------------------------
// Base32 decoding (RFC 4648, case-insensitive)
// ---------------------------------------------------------------------------

const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

/**
 * Decode a base32 string to bytes. Returns null on invalid input.
 * Case-insensitive: both 'b...' (lowercase) and 'B...' (uppercase) accepted.
 */
function decodeBase32(input: string): Uint8Array | null {
  if (input.length === 0) return null;
  const lower = input.toLowerCase();
  // Strip padding
  const clean = lower.replace(/=+$/, '');
  if (clean.length === 0) return null;

  for (const ch of clean) {
    if (BASE32_ALPHABET.indexOf(ch) === -1) return null;
  }

  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (const ch of clean) {
    const digit = BASE32_ALPHABET.indexOf(ch);
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 0xff);
    }
  }

  return new Uint8Array(out);
}

// ---------------------------------------------------------------------------
// Base16 decoding (hex, case-insensitive)
// ---------------------------------------------------------------------------

/**
 * Decode a base16 (hex) string to bytes. Returns null on invalid input.
 */
function decodeBase16(input: string): Uint8Array | null {
  if (input.length === 0) return null;
  if (input.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(input)) return null;

  const bytes: number[] = [];
  for (let i = 0; i < input.length; i += 2) {
    bytes.push(parseInt(input.slice(i, i + 2), 16));
  }
  return new Uint8Array(bytes);
}

// ---------------------------------------------------------------------------
// Hex utilities
// ---------------------------------------------------------------------------

const HEX_RE = /^(0x)?[0-9a-fA-F]+$/;

function normalizeHex(digest: string): string {
  const hex = digest.startsWith('0x') || digest.startsWith('0X') ? digest.slice(2) : digest;
  return hex.toLowerCase();
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!HEX_RE.test(hex)) return null;
  const clean = normalizeHex(hex);
  if (clean.length % 2 !== 0) return null;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }
  return new Uint8Array(bytes);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, '0');
  }
  return hex;
}

// ---------------------------------------------------------------------------
// CID parsing
// ---------------------------------------------------------------------------

/**
 * Parse a CID string into its components. Returns null if the string cannot
 * be parsed as a valid CID (any version, any multibase).
 */
function parseCidString(cid: string): ParsedCid | null {
  if (typeof cid !== 'string' || cid.length === 0) return null;

  // Reject any whitespace/control characters — CIDs are pure alphanumeric
  if (/[\s\u0000-\u001f\u007f-\u009f]/.test(cid)) return null;
  // Reject unicode-directional and other invisible characters
  if (/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/.test(cid)) return null;

  let version: CidVersion;
  let multibasePrefix: string | null = null;
  let payload: string;

  // CIDv1: starts with a multibase prefix (single letter) followed by
  // version byte 0x01 encoded in the same base.
  //
  // CIDv0: legacy IPFS format — pure base58btc string, no multibase prefix,
  // implicitly version 0, sha2-256, dag-pb.
  //
  // Distinguish by checking for a known multibase prefix.
  const firstChar = cid[0];
  const mb = MULTIBASE_PREFIX[firstChar as MultibasePrefix];

  if (mb) {
    // CIDv1 candidate: decode the payload after the prefix
    const decoded = mb.decode(cid.slice(1));
    if (!decoded) return null;

    // First byte must be version 0x01
    if (decoded.length < 2 || decoded[0] !== 0x01) return null;
    version = 1;
    multibasePrefix = firstChar;
    payload = bytesToHex(decoded); // version byte + codec + multihash
  } else {
    // CIDv0 candidate: entire string is base58btc-encoded multihash
    const decoded = decodeBase58(cid);
    if (!decoded) return null;
    version = 0;
    payload = bytesToHex(decoded);
  }

  // Parse the payload.
  //   CIDv0: bytes are directly the multihash (codec implicitly dag-pb 0x70).
  //   CIDv1: version byte (0x01) + codec varint + multihash.
  const payloadBytes = hexToBytes(payload);
  if (!payloadBytes) return null;

  let offset = 0;
  let codec: number;

  if (version === 1) {
    // First byte is version 0x01 (already validated during decode)
    offset = 1;

    // Read codec as a varint
    if (offset >= payloadBytes.length) return null;
    const { value: c, bytesRead: cb } = readVarint(payloadBytes, offset);
    if (c === null) return null;
    codec = c;
    offset += cb;
  } else {
    // CIDv0: codec is implicitly dag-pb (0x70)
    codec = 0x70;
  }

  // Parse multihash: <hash function code varint><digest size varint><digest bytes>
  const { value: hashFunction, bytesRead: hfBytes } = readVarint(payloadBytes, offset);
  if (hashFunction === null) return null;
  offset += hfBytes;

  const { value: digestSize, bytesRead: dsBytes } = readVarint(payloadBytes, offset);
  if (digestSize === null) return null;
  offset += dsBytes;

  if (offset + digestSize > payloadBytes.length) return null;
  const digest = payloadBytes.slice(offset, offset + digestSize);

  // Validate digest size matches expected for this hash function
  const expectedSize = EXPECTED_DIGEST_SIZE[hashFunction];
  if (expectedSize !== undefined && digest.length !== expectedSize) return null;

  const codecName = CODEC_NAME[codec] ?? `unknown-0x${codec.toString(16)}`;
  const hashFunctionName = MULTIHASH_CODE[hashFunction] ?? `unknown-0x${hashFunction.toString(16)}`;

  const digestHex = bytesToHex(digest);

  // Build canonical CIDv1 base32: 'b' + 0x01 + codec-varint + multihash
  const canonicalBytes: number[] = [0x01];
  const codecVarint = encodeVarint(codec);
  for (const b of codecVarint) canonicalBytes.push(b);
  const mhVarint = encodeVarint(hashFunction);
  for (const b of mhVarint) canonicalBytes.push(b);
  const dsVarint = encodeVarint(digestSize);
  for (const b of dsVarint) canonicalBytes.push(b);
  for (const b of digest) canonicalBytes.push(b);

  const canonical = 'b' + encodeBase32(new Uint8Array(canonicalBytes));

  return {
    version,
    codec,
    codecName,
    hashFunction,
    hashFunctionName,
    digest,
    digestHex,
    multibase: firstChar,
    multibaseName: mb ? mb.name : 'base58btc',
    canonical,
    rawBytes: payloadBytes,
  };
}

// ---------------------------------------------------------------------------
// Varint encoding/decoding (multiformats variable-length integer)
// ---------------------------------------------------------------------------

/**
 * Read a varint from bytes at offset. Returns { value, bytesRead }.
 * Supports 1-byte (0-127), 2-byte (128-16383), and 4-byte (16384-536M) varints.
 */
function readVarint(bytes: Uint8Array, offset: number): { value: number | null; bytesRead: number } {
  if (offset >= bytes.length) return { value: null, bytesRead: 0 };

  const first = bytes[offset];
  if (first < 0x80) {
    return { value: first, bytesRead: 1 };
  }

  // 2-byte varint: 10xxxxxx xxxxxxxx (14 bits, values 128-16383)
  if ((first & 0xc0) === 0x80) {
    if (offset + 1 >= bytes.length) return { value: null, bytesRead: 0 };
    const second = bytes[offset + 1];
    const value = ((first & 0x3f) << 8) | second;
    return { value, bytesRead: 2 };
  }

  // 4-byte varint: 110xxxxx xxxxxxxx xxxxxxxx xxxxxxxx (29 bits)
  if ((first & 0xe0) === 0xe0) {
    if (offset + 3 >= bytes.length) return { value: null, bytesRead: 0 };
    const value =
      ((first & 0x1f) << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    return { value, bytesRead: 4 };
  }

  return { value: null, bytesRead: 0 };
}

/**
 * Encode a number as a varint. Returns byte array.
 * Supports 1-byte, 2-byte, and 4-byte varints.
 */
function encodeVarint(value: number): Uint8Array {
  if (value < 0x80) {
    return new Uint8Array([value]);
  }
  if (value < 0x4000) {
    // 2-byte varint: 10xxxxxx xxxxxxxx
    return new Uint8Array([0x80 | (value >> 8), value & 0xff]);
  }
  // 4-byte varint: 110xxxxx xxxxxxxx xxxxxxxx xxxxxxxx
  return new Uint8Array([
    0xe0 | (value >> 24),
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  ]);
}

/**
 * Encode bytes as base32 (RFC 4648, lowercase, no padding).
 */
function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';

  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += BASE32_ALPHABET[(value >> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return out;
}

// ---------------------------------------------------------------------------
// Digest normalization
// ---------------------------------------------------------------------------

function digestMatches(embeddedDigestHex: string, expectedDigest: string): boolean {
  const embedded = normalizeHex(embeddedDigestHex);
  const expected = normalizeHex(expectedDigest);
  return embedded === expected;
}

// ---------------------------------------------------------------------------
// CID registry (duplicate tracking)
// ---------------------------------------------------------------------------

/**
 * Tracks registered CIDs to enforce duplicate rejection. Each instance
 * maintains its own set; callers should share a single instance for a
 * given registration context.
 */
export class CidRegistry {
  private readonly seen = new Set<string>();

  /** True if the canonical CID has already been registered. */
  has(canonical: string): boolean {
    return this.seen.has(canonical);
  }

  /** Register a canonical CID. Returns false if it was already present. */
  add(canonical: string): boolean {
    if (this.seen.has(canonical)) return false;
    this.seen.add(canonical);
    return true;
  }

  /** Number of registered CIDs. */
  get size(): number {
    return this.seen.size;
  }

  /** Clear all registered CIDs. */
  clear(): void {
    this.seen.clear();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a CID string against the accepted contract readiness profile.
 *
 * Fail-closed: returns { valid: false, reason } for any CID that does not
 * conform. When valid, returns the canonical CIDv1 base32 string and the
 * parsed components.
 *
 * Options:
 *   - expectedDigest: if provided, the CID's embedded multihash digest must
 *     match this value (digest binding).
 *   - allowDuplicates: if false (default), the CID is checked against the
 *     registry and rejected if already seen.
 *   - maxLength: maximum CID string length.
 *
 * A shared CidRegistry instance should be passed by the caller for duplicate
 * detection across multiple validation calls.
 */
export function validateCid(
  cid: string,
  options: CidValidationOptions = {},
  registry?: CidRegistry,
): CidValidationResult {
  const {
    expectedDigest,
    allowDuplicates = false,
    maxLength = MAX_CID_STRING_LENGTH,
  } = options;

  // Size check
  if (typeof cid !== 'string' || cid.length === 0) {
    return { valid: false, error: 'CID is required', reason: 'invalid_format' };
  }
  if (cid.length > maxLength) {
    return { valid: false, error: `CID exceeds max length of ${maxLength}`, reason: 'oversized' };
  }

  // Parse
  const parsed = parseCidString(cid);
  if (!parsed) {
    return { valid: false, error: 'Invalid CID format', reason: 'invalid_format' };
  }

  // Version check
  if (!ACCEPTED_VERSIONS.has(parsed.version)) {
    return {
      valid: false,
      error: `Unsupported CID version: ${parsed.version}`,
      reason: 'unsupported_version',
    };
  }

  // Codec check
  if (!ACCEPTED_CODECS.has(parsed.codec)) {
    return {
      valid: false,
      error: `Unsupported codec: 0x${parsed.codec.toString(16)} (${parsed.codecName})`,
      reason: 'unsupported_codec',
    };
  }

  // Hash function check
  if (!ACCEPTED_HASH_FUNCTIONS.has(parsed.hashFunction)) {
    return {
      valid: false,
      error: `Unsupported hash function: 0x${parsed.hashFunction.toString(16)} (${parsed.hashFunctionName})`,
      reason: 'unsupported_hash',
    };
  }

  // Digest binding check
  if (expectedDigest !== undefined) {
    if (!digestMatches(parsed.digestHex, expectedDigest)) {
      return {
        valid: false,
        error: 'CID digest does not match expected content digest',
        reason: 'digest_mismatch',
        parsed,
      };
    }
  }

  // Duplicate check
  if (!allowDuplicates && registry) {
    if (registry.has(parsed.canonical)) {
      return {
        valid: false,
        error: 'Duplicate CID already registered',
        reason: 'duplicate',
        parsed,
      };
    }
    registry.add(parsed.canonical);
  }

  return {
    valid: true,
    canonical: parsed.canonical,
    parsed,
  };
}

/**
 * Simple boolean check: is this a valid CID under the accepted profile?
 */
export function isValidCid(cid: string): boolean {
  return validateCid(cid).valid;
}

/**
 * Normalize a CID to its canonical CIDv1 base32 form. Equivalent CIDs
 * (e.g. CIDv0 base58 and CIDv1 base32 representing the same content)
 * produce the same canonical string. Returns null if the CID is invalid.
 */
export function normalizeCid(cid: string): string | null {
  const result = validateCid(cid);
  return result.valid ? result.canonical ?? null : null;
}

/**
 * Check whether a CID's embedded digest matches an expected content digest.
 * Returns false if the CID is invalid or the digests do not match.
 */
export function cidMatchesDigest(cid: string, expectedDigest: string): boolean {
  const result = validateCid(cid, { expectedDigest });
  return result.valid === true;
}

/**
 * Create a new, empty CID registry for duplicate tracking.
 */
export function createCidRegistry(): CidRegistry {
  return new CidRegistry();
}
