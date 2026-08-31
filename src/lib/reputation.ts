export type ReputationTier = 'bronze' | 'silver' | 'gold'

export const REPUTATION_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 1500,
}

export function getReputationTier(score: number): ReputationTier {
  if (score >= REPUTATION_THRESHOLDS.gold) return 'gold'
  if (score >= REPUTATION_THRESHOLDS.silver) return 'silver'
  return 'bronze'
}

export function getNextTier(score: number) {
  if (score < REPUTATION_THRESHOLDS.silver) {
    return {
      nextTier: 'silver',
      required: REPUTATION_THRESHOLDS.silver - score,
    }
  }

  if (score < REPUTATION_THRESHOLDS.gold) {
    return {
      nextTier: 'gold',
      required: REPUTATION_THRESHOLDS.gold - score,
    }
  }

  return null;
}

export interface ReputationEntry {
  address: string;
  reputation: number;
}

export interface ReputationRootResult {
  root: `0x${string}`;
  entries: ReputationEntry[];
  generatedAt: string;
}

export interface ReputationProofResult {
  root: `0x${string}`;
  address: string;
  reputation: number;
  proof: string[];
}

export function buildReputationRoot(entries: ReputationEntry[]): ReputationRootResult {
  const sorted = [...entries].sort((a, b) =>
    a.address.toLowerCase().localeCompare(b.address.toLowerCase())
  );
  
  // Deterministic combined hash for the snapshot root
  const combined = sorted
    .map((e) => `${e.address.toLowerCase()}:${e.reputation}`)
    .join('|');
  
  // Compute deterministic 32-byte hex root
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  const hexHash = Math.abs(hash).toString(16).padStart(64, '0');
  const root: `0x${string}` = `0x${hexHash}`;

  return {
    root,
    entries: sorted,
    generatedAt: new Date().toISOString(),
  };
}

export function buildReputationProof(
  entries: ReputationEntry[],
  targetAddress: string
): ReputationProofResult {
  const rootResult = buildReputationRoot(entries);
  const entry = entries.find(
    (e) => e.address.toLowerCase() === targetAddress.toLowerCase()
  );
  if (!entry) {
    throw new Error(`Address ${targetAddress} not found in reputation snapshot`);
  }

  return {
    root: rootResult.root,
    address: entry.address,
    reputation: entry.reputation,
    proof: [],
  };
}

export function verifyReputationProof(
  proof: ReputationProofResult,
  claimedReputation: number
): boolean {
  return proof.reputation === claimedReputation;
}