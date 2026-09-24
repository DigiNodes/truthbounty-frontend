import { buildReputationRoot, buildReputationProof, verifyReputationProof } from '@/lib/reputation';

describe('reputation root and proof adapter', () => {
  it('builds a deterministic root from a credibility snapshot', () => {
    const snapshot = [
      { address: '0x1234567890123456789012345678901234567890', reputation: 180 },
      { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', reputation: 320 },
      { address: '0xfedcba9876543210fedcba9876543210fedcba98', reputation: 90 },
    ];

    const root = buildReputationRoot(snapshot);

    expect(root.root).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(root.entries).toHaveLength(3);
    expect(root.generatedAt).toBeTruthy();
  });

  it('creates and verifies a proof for a single user entry', () => {
    const snapshot = [
      { address: '0x1234567890123456789012345678901234567890', reputation: 180 },
      { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', reputation: 320 },
    ];

    const proof = buildReputationProof(snapshot, '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

    expect(proof.proof.length).toBeGreaterThanOrEqual(0);
    expect(proof.root).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(verifyReputationProof(proof, 320)).toBe(true);
    expect(verifyReputationProof(proof, 180)).toBe(false);
  });
});
