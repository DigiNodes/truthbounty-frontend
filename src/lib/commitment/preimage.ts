/**
 * V2-FE — Commitment Preimage Boundary.
 *
 * Pure, deterministic commitment/preimage boundary for the V2 commit-reveal
 * scheme used by the verifier dashboard (commit → reveal → closed phases).
 *
 * Security model:
 *   - Commitments are unambiguous: the preimage is encoded with explicit
 *     length prefixes so no two distinct preimages can produce the same
 *     byte sequence (rejects ambiguous packed encodings).
 *   - Commitments are context-bound: chainId, releaseId, contractAddress
 *     and roundId are part of the signed preimage, so a commitment created
 *     in one context cannot be replayed in another.
 *   - Salt requirements: salt must be non-zero and meet a minimum entropy
 *     threshold to prevent preimage brute-forcing.
 *   - Pre-reveal data exposes no decision: a commitment is just a hash;
 *     nothing about the voter's choice can be derived from it.
 *   - Reveal cannot be replayed: the preimage is bound to a specific
 *     chain/release/contract/round/voter combination.
 *
 * All functions are pure and deterministic. No calldata, tx hashes, or
 * protocol state is fabricated — callers supply all values from canonical
 * sources (registry, release artifacts, wallet).
 */

import { keccak256, toBytes, toHex, type Hex } from 'viem';

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

/** Preimage encoding version. Bumped when the field layout changes. */
export const PREIMAGE_VERSION = 1;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The voter's choice in a commit-reveal round.
 * Kept as a small closed set so the encoding stays fixed-width (1 byte).
 */
export type CommitmentChoice = 'SUPPORT' | 'OPPOSE' | 'ABSTAIN';

export const COMMITMENT_CHOICE_BYTE: Record<CommitmentChoice, number> = {
  SUPPORT: 0,
  OPPOSE: 1,
  ABSTAIN: 2,
} as const;

export const COMMITMENT_CHOICE_LABEL: Record<number, CommitmentChoice> = {
  0: 'SUPPORT',
  1: 'OPPOSE',
  2: 'ABSTAIN',
} as const;

/**
 * The complete preimage that is hashed to produce a commitment.
 * Every field is required; omitting any field fails closed.
 */
export interface CommitmentPreimage {
  /** Optimism/EVM chain ID (e.g. 10 = Mainnet, 11155420 = Sepolia). */
  readonly chainId: number;
  /** Canonical release identifier (e.g. 'v2.0.0-sepolia'). */
  readonly releaseId: string;
  /** Canonical contract address (checksummed 0x-prefixed). */
  readonly contractAddress: `0x${string}`;
  /** Appeal/verification round number. */
  readonly roundId: number;
  /** Voter wallet address (checksummed 0x-prefixed). */
  readonly voterAddress: `0x${string}`;
  /** The voter's choice. */
  readonly choice: CommitmentChoice;
  /** 32-byte random salt (hex, 0x-prefixed, 66 chars). */
  readonly salt: `0x${string}`;
}

/**
 * The commitment: keccak256 of the encoded preimage.
 */
export interface Commitment {
  readonly commitment: `0x${string}`;
  readonly preimageHash: `0x${string}`;
}

/**
 * The revealed preimage, submitted during the reveal phase.
 */
export interface CommitmentReveal {
  readonly preimage: CommitmentPreimage;
  readonly expectedCommitment: `0x${string}`;
}

// ---------------------------------------------------------------------------
// Validation limits
// ---------------------------------------------------------------------------

export const COMMITMENT_MAX_RELEASE_ID_LENGTH = 128;
export const COMMITMENT_MIN_SALT_ENTROPY_BITS = 128;
export const COMMITMENT_SALT_BYTES = 32;

/** Salt values that are trivially guessable and must be rejected. */
const WEAK_SALTS: ReadonlySet<string> = new Set([
  '0x' + '0'.repeat(64),
  '0x' + '1'.repeat(64),
  '0x' + 'a'.repeat(64),
  '0x' + 'f'.repeat(64),
]);

// ---------------------------------------------------------------------------
// Address validation
// ---------------------------------------------------------------------------

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HEX32_RE = /^0x[0-9a-fA-F]{64}$/;

/**
 * Validate a checksummed 0x-prefixed 20-byte Ethereum address.
 * Returns the lowercased address or throws.
 */
function validateAddress(value: unknown, field: string): `0x${string}` {
  if (typeof value !== 'string' || !ADDRESS_RE.test(value)) {
    throw new Error(`Invalid ${field}: must be a 0x-prefixed 20-byte address`);
  }
  return value.toLowerCase() as `0x${string}`;
}

/**
 * Validate a 0x-prefixed 32-byte hex value.
 */
function validateBytes32(value: unknown, field: string): `0x${string}` {
  if (typeof value !== 'string' || !HEX32_RE.test(value)) {
    throw new Error(`Invalid ${field}: must be a 0x-prefixed 32-byte hex value`);
  }
  return value.toLowerCase() as `0x${string}`;
}

/**
 * Validate a release identifier string.
 */
function validateReleaseId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Invalid releaseId: must be a non-empty string');
  }
  if (value.length > COMMITMENT_MAX_RELEASE_ID_LENGTH) {
    throw new Error(
      `Invalid releaseId: must be at most ${COMMITMENT_MAX_RELEASE_ID_LENGTH} characters`,
    );
  }
  // Reject control characters and whitespace that could confuse encoders
  if (/[\s\u0000-\u001f\u007f-\u009f]/.test(value)) {
    throw new Error('Invalid releaseId: contains control or whitespace characters');
  }
  return value;
}

// ---------------------------------------------------------------------------
// Unambiguous encoding
// ---------------------------------------------------------------------------

/**
 * Encode a uint256 as 32 big-endian bytes.
 */
function encodeUint256(value: number): Uint8Array {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new Error(`Invalid uint256 value: ${value}`);
  }
  const bytes = new Uint8Array(32);
  let remaining = value;
  for (let i = 31; i >= 0 && remaining > 0; i--) {
    bytes[i] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }
  return bytes;
}

/**
 * Encode a uint8 as 1 byte.
 */
function encodeUint8(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error(`Invalid uint8 value: ${value}`);
  }
  return new Uint8Array([value]);
}

/**
 * Encode a byte string with a 1-byte length prefix.
 * Rejects empty strings and strings longer than 255 bytes.
 */
function encodeBytesPrefixed(value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length === 0) {
    throw new Error('Cannot encode empty byte string');
  }
  if (bytes.length > 255) {
    throw new Error(`Byte string too long: ${bytes.length} bytes (max 255)`);
  }
  const out = new Uint8Array(1 + bytes.length);
  out[0] = bytes.length;
  out.set(bytes, 1);
  return out;
}

/**
 * Encode a 20-byte address (no length prefix — fixed width).
 */
function encodeAddress(address: `0x${string}`): Uint8Array {
  return toBytes(address);
}

/**
 * Encode a 32-byte value (no length prefix — fixed width).
 */
function encodeBytes32(value: `0x${string}`): Uint8Array {
  return toBytes(value);
}

/**
 * Encode a complete commitment preimage into an unambiguous byte sequence.
 *
 * Layout:
 *   [1 byte]  version (0x01)
 *   [32 bytes] chainId (uint256 big-endian)
 *   [1 byte]  releaseId length + N bytes releaseId (UTF-8)
 *   [20 bytes] contractAddress
 *   [32 bytes] roundId (uint256 big-endian)
 *   [20 bytes] voterAddress
 *   [1 byte]  choice (0=SUPPORT, 1=OPPOSE, 2=ABSTAIN)
 *   [32 bytes] salt
 *
 * Fixed-width fields are never ambiguous. The variable-length releaseId is
 * explicitly length-prefixed, so no two distinct preimages encode to the
 * same byte sequence. This rejects ambiguous packed encodings.
 */
export function encodePreimage(preimage: CommitmentPreimage): Uint8Array {
  const chainIdBytes = encodeUint256(preimage.chainId);
  const releaseIdBytes = encodeBytesPrefixed(preimage.releaseId);
  const contractAddressBytes = encodeAddress(preimage.contractAddress);
  const roundIdBytes = encodeUint256(preimage.roundId);
  const voterAddressBytes = encodeAddress(preimage.voterAddress);
  const choiceByte = encodeUint8(COMMITMENT_CHOICE_BYTE[preimage.choice]);
  const saltBytes = encodeBytes32(preimage.salt);

  const parts: Uint8Array[] = [
    new Uint8Array([PREIMAGE_VERSION]),
    chainIdBytes,
    releaseIdBytes,
    contractAddressBytes,
    roundIdBytes,
    voterAddressBytes,
    choiceByte,
    saltBytes,
  ];

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * Hash an encoded preimage into a 32-byte commitment.
 */
export function hashPreimage(encoded: Uint8Array): `0x${string}` {
  return keccak256(encoded) as `0x${string}`;
}

/**
 * Compute the commitment for a preimage.
 */
export function computeCommitment(preimage: CommitmentPreimage): Commitment {
  const encoded = encodePreimage(preimage);
  const commitment = hashPreimage(encoded);
  return {
    commitment,
    preimageHash: commitment,
  };
}

// ---------------------------------------------------------------------------
// Salt validation
// ---------------------------------------------------------------------------

/**
 * Validate that a salt is acceptable: non-zero, 32 bytes, and not a weak
 * trivially-guessable value.
 */
export function validateSalt(salt: `0x${string}`): void {
  const normalized = salt.toLowerCase();
  if (!HEX32_RE.test(normalized)) {
    throw new Error(
      'Invalid salt: must be a 0x-prefixed 32-byte hex value',
    );
  }
  const bytes = toBytes(normalized);
  if (bytes.every((b) => b === 0)) {
    throw new Error('Invalid salt: zero salt is not permitted');
  }
  if (WEAK_SALTS.has(normalized)) {
    throw new Error('Invalid salt: weak salt value');
  }
  // Entropy check: at least half the bytes must be non-zero
  const nonZeroBytes = bytes.filter((b) => b !== 0).length;
  const entropyBits = nonZeroBytes * 8;
  if (entropyBits < COMMITMENT_MIN_SALT_ENTROPY_BITS) {
    throw new Error(
      `Invalid salt: insufficient entropy (${entropyBits} bits, minimum ${COMMITMENT_MIN_SALT_ENTROPY_BITS})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Preimage validation
// ---------------------------------------------------------------------------

/**
 * Validate every field of a commitment preimage. Throws on the first
 * invalid field (fail closed).
 */
export function validatePreimage(preimage: CommitmentPreimage): void {
  if (!preimage || typeof preimage !== 'object') {
    throw new Error('Invalid preimage: must be an object');
  }

  if (!Number.isInteger(preimage.chainId) || preimage.chainId <= 0) {
    throw new Error('Invalid chainId: must be a positive integer');
  }

  validateReleaseId(preimage.releaseId);

  validateAddress(preimage.contractAddress, 'contractAddress');

  if (!Number.isInteger(preimage.roundId) || preimage.roundId < 0) {
    throw new Error('Invalid roundId: must be a non-negative integer');
  }

  validateAddress(preimage.voterAddress, 'voterAddress');

  if (!(preimage.choice in COMMITMENT_CHOICE_BYTE)) {
    throw new Error(`Invalid choice: ${String(preimage.choice)}`);
  }

  validateSalt(preimage.salt);
}

/**
 * Build a validated commitment preimage from raw inputs.
 * Throws if any field fails validation.
 */
export function buildPreimage(args: {
  chainId: number;
  releaseId: string;
  contractAddress: string;
  roundId: number;
  voterAddress: string;
  choice: CommitmentChoice;
  salt: `0x${string}`;
}): CommitmentPreimage {
  const preimage: CommitmentPreimage = {
    chainId: args.chainId,
    releaseId: args.releaseId,
    contractAddress: args.contractAddress as `0x${string}`,
    roundId: args.roundId,
    voterAddress: args.voterAddress as `0x${string}`,
    choice: args.choice,
    salt: args.salt,
  };
  validatePreimage(preimage);
  return preimage;
}

// ---------------------------------------------------------------------------
// Reveal verification
// ---------------------------------------------------------------------------

/**
 * Verify that a revealed preimage matches an expected commitment.
 *
 * Returns true only when:
 *   - The preimage is fully valid
 *   - keccak256(encodePreimage(preimage)) === expectedCommitment
 *
 * This is the gate that prevents a reveal from being accepted unless it
 * exactly matches a previously computed commitment.
 */
export function verifyReveal(reveal: CommitmentReveal): boolean {
  try {
    validatePreimage(reveal.preimage);
    const { commitment } = computeCommitment(reveal.preimage);
    return commitment === reveal.expectedCommitment;
  } catch {
    return false;
  }
}

/**
 * Check whether a commitment was created in a specific context.
 * Returns the context fields extracted from a preimage if the commitment
 * matches, otherwise null.
 */
export function extractCommitmentContext(
  preimage: CommitmentPreimage,
): {
  chainId: number;
  releaseId: string;
  contractAddress: `0x${string}`;
  roundId: number;
} | null {
  try {
    validatePreimage(preimage);
    return {
      chainId: preimage.chainId,
      releaseId: preimage.releaseId,
      contractAddress: preimage.contractAddress,
      roundId: preimage.roundId,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cross-context replay protection
// ---------------------------------------------------------------------------

/**
 * Determine whether a preimage belongs to a given context.
 * Used to reject cross-context replay: a commitment created for one
 * chain/release/contract/round cannot be revealed in another.
 */
export function preimageMatchesContext(
  preimage: CommitmentPreimage,
  context: {
    chainId: number;
    releaseId: string;
    contractAddress: `0x${string}`;
    roundId: number;
  },
): boolean {
  return (
    preimage.chainId === context.chainId &&
    preimage.releaseId === context.releaseId &&
    preimage.contractAddress.toLowerCase() ===
      context.contractAddress.toLowerCase() &&
    preimage.roundId === context.roundId
  );
}

/**
 * Check that a reveal's preimage context matches the expected context,
 * preventing cross-context replay attacks.
 */
export function verifyRevealInContext(
  reveal: CommitmentReveal,
  context: {
    chainId: number;
    releaseId: string;
    contractAddress: `0x${string}`;
    roundId: number;
  },
): boolean {
  if (!verifyReveal(reveal)) return false;
  return preimageMatchesContext(reveal.preimage, context);
}
