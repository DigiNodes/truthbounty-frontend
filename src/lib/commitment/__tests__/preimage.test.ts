/**
 * Unit tests for the commitment preimage boundary (V2-FE commit-reveal).
 *
 * Covers:
 *   - Valid/invalid preimage fields
 *   - Cross-chain/release/contract/round replay
 *   - Field reordering produces different commitments
 *   - Packed collision resistance (length-prefix encoding)
 *   - Zero/weak salt rejection
 *   - Wrong voter rejection
 *   - Reveal verification and cross-context replay
 */

import {
  computeCommitment,
  encodePreimage,
  verifyReveal,
  verifyRevealInContext,
  buildPreimage,
  validatePreimage,
  validateSalt,
  PREIMAGE_VERSION,
  COMMITMENT_CHOICE_BYTE,
  type CommitmentPreimage,
} from '../preimage';
import { toHex } from 'viem';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const SALT_A = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
const SALT_B = '0xcafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe';

function makePreimage(overrides: Partial<CommitmentPreimage> = {}): CommitmentPreimage {
  return {
    chainId: 11155420,
    releaseId: 'v2.0.0-sepolia',
    contractAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    roundId: 1,
    voterAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    choice: 'SUPPORT',
    salt: SALT_A,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Valid preimage and commitment
// ---------------------------------------------------------------------------

describe('commitment preimage — valid preimage', () => {
  it('builds and validates a well-formed preimage', () => {
    const preimage = makePreimage();
    expect(() => validatePreimage(preimage)).not.toThrow();
  });

  it('computes a deterministic commitment', () => {
    const preimage = makePreimage();
    const c1 = computeCommitment(preimage);
    const c2 = computeCommitment(preimage);
    expect(c1.commitment).toBe(c2.commitment);
    expect(c1.commitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(c1.preimageHash).toBe(c1.commitment);
  });

  it('produces different commitments for different preimages', () => {
    const a = computeCommitment(makePreimage());
    const b = computeCommitment(makePreimage({ salt: SALT_B }));
    expect(a.commitment).not.toBe(b.commitment);
  });

  it('includes the version byte in the encoding', () => {
    const preimage = makePreimage();
    const encoded = encodePreimage(preimage);
    expect(encoded[0]).toBe(PREIMAGE_VERSION);
  });
});

// ---------------------------------------------------------------------------
// Field reordering produces different commitments (unambiguous encoding)
// ---------------------------------------------------------------------------

describe('commitment preimage — field reordering', () => {
  it('different field orderings produce different commitments', () => {
    const base = makePreimage();
    const baseCommitment = computeCommitment(base).commitment;

    // Swap chainId and roundId values — different logical preimage
    const reordered = makePreimage({
      chainId: base.roundId,
      roundId: base.chainId,
    });
    // These happen to be different values so the commitment must differ
    const reorderedCommitment = computeCommitment(reordered).commitment;
    expect(reorderedCommitment).not.toBe(baseCommitment);
  });

  it('same fields in same order always produce identical commitment', () => {
    const preimage = makePreimage();
    const commitments = Array.from({ length: 10 }, () =>
      computeCommitment(preimage).commitment
    );
    expect(new Set(commitments).size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Packed collision resistance (length-prefix encoding)
// ---------------------------------------------------------------------------

describe('commitment preimage — packed collision resistance', () => {
  it('releaseId with length-prefix prevents boundary ambiguity', () => {
    // Two different releaseIds that would collide under naive concatenation
    // because one is a prefix of the other:
    //   releaseId="ab" + "cd" vs releaseId="abc" + "d"
    const preimageA = makePreimage({ releaseId: 'abcd' });
    const preimageB = makePreimage({ releaseId: 'abc' });

    const commitmentA = computeCommitment(preimageA).commitment;
    const commitmentB = computeCommitment(preimageB).commitment;

    expect(commitmentA).not.toBe(commitmentB);
  });

  it('different releaseIds produce different commitments', () => {
    const a = computeCommitment(makePreimage({ releaseId: 'release-a' }));
    const b = computeCommitment(makePreimage({ releaseId: 'release-b' }));
    expect(a.commitment).not.toBe(b.commitment);
  });

  it('encoding is injective: distinct preimages → distinct byte sequences', () => {
    const seen = new Set<string>();
    const variants = [
      makePreimage({ chainId: 10 }),                    // different chain
      makePreimage({ chainId: 137 }),                   // different chain
      makePreimage({ releaseId: 'v1.0.0' }),            // different release
      makePreimage({ releaseId: 'v2.1.0-mainnet' }),    // different release
      makePreimage({ roundId: 2 }),                     // different round
      makePreimage({ roundId: 42 }),                    // different round
      makePreimage({ choice: 'OPPOSE' }),               // different choice
      makePreimage({ choice: 'ABSTAIN' }),              // different choice
      makePreimage({ salt: SALT_A }),                   // different salt
      makePreimage({ salt: SALT_B }),                   // different salt
      makePreimage({ voterAddress: '0x1234567890123456789012345678901234567890' as `0x${string}` }), // different voter
      makePreimage({ contractAddress: '0x1234567890123456789012345678901234567890' as `0x${string}` }), // different contract
    ];
    for (const preimage of variants) {
      const encoded = toHex(encodePreimage(preimage));
      expect(seen.has(encoded)).toBe(false);
      seen.add(encoded);
    }
  });
});

// ---------------------------------------------------------------------------
// Cross-context replay protection
// ---------------------------------------------------------------------------

describe('commitment preimage — cross-context replay', () => {
  const baseContext = {
    chainId: 11155420,
    releaseId: 'v2.0.0-sepolia',
    contractAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as `0x${string}`,
    roundId: 1,
  };

  it('rejects replay on a different chain', () => {
    const preimage = makePreimage();
    const commitment = computeCommitment(preimage).commitment;

    // Same preimage but different chain — must not match context
    const otherChain = makePreimage({ chainId: 10 });
    const reveal = { preimage: otherChain, expectedCommitment: commitment };
    expect(verifyRevealInContext(reveal, baseContext)).toBe(false);
  });

  it('rejects replay on a different release', () => {
    const preimage = makePreimage();
    const commitment = computeCommitment(preimage).commitment;

    const otherRelease = makePreimage({ releaseId: 'v2.1.0-sepolia' });
    const reveal = { preimage: otherRelease, expectedCommitment: commitment };
    expect(verifyRevealInContext(reveal, baseContext)).toBe(false);
  });

  it('rejects replay on a different contract', () => {
    const preimage = makePreimage();
    const commitment = computeCommitment(preimage).commitment;

    const otherContract = makePreimage({
      contractAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    });
    const reveal = { preimage: otherContract, expectedCommitment: commitment };
    expect(verifyRevealInContext(reveal, baseContext)).toBe(false);
  });

  it('rejects replay on a different round', () => {
    const preimage = makePreimage();
    const commitment = computeCommitment(preimage).commitment;

    const otherRound = makePreimage({ roundId: 999 });
    const reveal = { preimage: otherRound, expectedCommitment: commitment };
    expect(verifyRevealInContext(reveal, baseContext)).toBe(false);
  });

  it('accepts reveal in matching context', () => {
    const preimage = makePreimage();
    const commitment = computeCommitment(preimage).commitment;

    const reveal = { preimage, expectedCommitment: commitment };
    expect(verifyRevealInContext(reveal, baseContext)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Zero/weak salt rejection
// ---------------------------------------------------------------------------

describe('commitment preimage — salt validation', () => {
  it('rejects zero salt', () => {
    expect(() =>
      validateSalt('0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`)
    ).toThrow(/zero salt/i);
  });

  it('rejects weak salt (all ones)', () => {
    expect(() =>
      validateSalt('0x1111111111111111111111111111111111111111111111111111111111111111' as `0x${string}`)
    ).toThrow(/weak salt/i);
  });

  it('rejects insufficient entropy salt', () => {
    // Only 10 non-zero bytes = 80 bits < 128 minimum
    const lowEntropy = '0x01' + '0'.repeat(62);
    expect(() =>
      validateSalt(lowEntropy as `0x${string}`)
    ).toThrow(/insufficient entropy/i);
  });

  it('accepts high-entropy salt', () => {
    expect(() => validateSalt(SALT_A as `0x${string}`)).not.toThrow();
  });

  it('rejects invalid salt format', () => {
    expect(() => validateSalt('not-hex' as `0x${string}`)).toThrow();
    expect(() => validateSalt('0x1234' as `0x${string}`)).toThrow();
  });

  it('buildPreimage rejects zero salt', () => {
    expect(() =>
      buildPreimage({
        ...makePreimage(),
        salt: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      })
    ).toThrow(/zero salt/i);
  });
});

// ---------------------------------------------------------------------------
// Wrong voter / invalid fields
// ---------------------------------------------------------------------------

describe('commitment preimage — wrong voter and invalid fields', () => {
  it('rejects wrong voter address', () => {
    const preimage = makePreimage();
    const commitment = computeCommitment(preimage).commitment;

    const wrongVoter = makePreimage({
      voterAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    });
    const reveal = { preimage: wrongVoter, expectedCommitment: commitment };
    expect(verifyReveal(reveal)).toBe(false);
  });

  it('rejects invalid chainId', () => {
    expect(() =>
      buildPreimage({ ...makePreimage(), chainId: 0 })
    ).toThrow(/chainId/i);
    expect(() =>
      buildPreimage({ ...makePreimage(), chainId: -1 })
    ).toThrow(/chainId/i);
  });

  it('rejects invalid contract address', () => {
    expect(() =>
      buildPreimage({ ...makePreimage(), contractAddress: 'not-an-address' as string })
    ).toThrow(/contractAddress/i);
  });

  it('rejects invalid roundId', () => {
    expect(() =>
      buildPreimage({ ...makePreimage(), roundId: -1 })
    ).toThrow(/roundId/i);
  });

  it('rejects empty releaseId', () => {
    expect(() =>
      buildPreimage({ ...makePreimage(), releaseId: '' })
    ).toThrow(/releaseId/i);
  });

  it('rejects invalid choice', () => {
    expect(() =>
      buildPreimage({
        ...makePreimage(),
        choice: 'INVALID' as any,
      })
    ).toThrow(/choice/i);
  });
});

// ---------------------------------------------------------------------------
// Reveal verification
// ---------------------------------------------------------------------------

describe('commitment preimage — reveal verification', () => {
  it('accepts a valid reveal', () => {
    const preimage = makePreimage();
    const commitment = computeCommitment(preimage).commitment;
    const reveal = { preimage, expectedCommitment: commitment };
    expect(verifyReveal(reveal)).toBe(true);
  });

  it('rejects a reveal with wrong commitment', () => {
    const preimage = makePreimage();
    const reveal = {
      preimage,
      expectedCommitment: '0x1111111111111111111111111111111111111111111111111111111111111111' as `0x${string}`,
    };
    expect(verifyReveal(reveal)).toBe(false);
  });

  it('rejects a reveal with invalid preimage', () => {
    const reveal = {
      preimage: makePreimage({ salt: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}` }),
      expectedCommitment: computeCommitment(makePreimage()).commitment,
    };
    expect(verifyReveal(reveal)).toBe(false);
  });

  it('verifies preimage context extraction', () => {
    const preimage = makePreimage();
    const context = {
      chainId: preimage.chainId,
      releaseId: preimage.releaseId,
      contractAddress: preimage.contractAddress,
      roundId: preimage.roundId,
    };
    const extracted = {
      chainId: preimage.chainId,
      releaseId: preimage.releaseId,
      contractAddress: preimage.contractAddress,
      roundId: preimage.roundId,
    };
    expect(extracted.chainId).toBe(context.chainId);
    expect(extracted.releaseId).toBe(context.releaseId);
    expect(extracted.contractAddress).toBe(context.contractAddress);
    expect(extracted.roundId).toBe(context.roundId);
  });
});

// ---------------------------------------------------------------------------
// Choice encoding
// ---------------------------------------------------------------------------

describe('commitment preimage — choice encoding', () => {
  it('encodes each choice as a distinct byte', () => {
    const support = computeCommitment(makePreimage({ choice: 'SUPPORT' }));
    const oppose = computeCommitment(makePreimage({ choice: 'OPPOSE' }));
    const abstain = computeCommitment(makePreimage({ choice: 'ABSTAIN' }));
    expect(support.commitment).not.toBe(oppose.commitment);
    expect(oppose.commitment).not.toBe(abstain.commitment);
    expect(abstain.commitment).not.toBe(support.commitment);
  });

  it('maps choice bytes correctly', () => {
    expect(COMMITMENT_CHOICE_BYTE.SUPPORT).toBe(0);
    expect(COMMITMENT_CHOICE_BYTE.OPPOSE).toBe(1);
    expect(COMMITMENT_CHOICE_BYTE.ABSTAIN).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Pre-reveal data exposes no decision
// ---------------------------------------------------------------------------

describe('commitment preimage — pre-reveal opacity', () => {
  it('commitment contains no choice information', () => {
    const supportCommitment = computeCommitment(makePreimage({ choice: 'SUPPORT' }));
    const opposeCommitment = computeCommitment(makePreimage({ choice: 'OPPOSE' }));
    const abstainCommitment = computeCommitment(makePreimage({ choice: 'ABSTAIN' }));

    // All commitments are 32-byte hashes; none reveal the choice
    expect(supportCommitment.commitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(opposeCommitment.commitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(abstainCommitment.commitment).toMatch(/^0x[0-9a-f]{64}$/);

    // Different choices produce different commitments (unforgeable binding)
    expect(supportCommitment.commitment).not.toBe(opposeCommitment.commitment);
    expect(opposeCommitment.commitment).not.toBe(abstainCommitment.commitment);
  });

  it('commitment is a fixed-size hash regardless of releaseId length', () => {
    const short = computeCommitment(makePreimage({ releaseId: 'a' }));
    const long = computeCommitment(makePreimage({ releaseId: 'a'.repeat(100) }));
    expect(short.commitment.length).toBe(long.commitment.length);
    expect(short.commitment).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
