import manifest from '../../../release/manifest.json';
import addresses from '../../../release/addresses/11155420.json';
import truthBountyWeightedAbi from '../../../release/abi/TruthBountyWeighted.json';
import eventSchema from '../../../release/events/event-schema.json';
import parameters from '../../../release/parameters/11155420.json';
import roles from '../../../release/roles/11155420.json';
import checksums from '../../../release/checksums.json';
import type { LoadedReleaseArtifacts, ProtocolDiagnostics } from './types';
import { assertValidContractAddress } from './address-guard';

const loaded: LoadedReleaseArtifacts = {
  manifest,
  addresses,
  abis: {
    TruthBountyWeighted: truthBountyWeightedAbi,
  },
  events: eventSchema,
  parameters,
  roles,
  checksums,
};

assertValidContractAddress(loaded.addresses.TruthBountyWeighted, 'TruthBountyWeighted');

export function getProtocolRelease(): LoadedReleaseArtifacts {
  return loaded;
}

export function getContractAddress(name: keyof typeof loaded.abis): `0x${string}` {
  if (name === 'TruthBountyWeighted') {
    return loaded.addresses.TruthBountyWeighted as `0x${string}`;
  }
  throw new Error(`Unknown contract: ${String(name)}`);
}

export function getContractAbi(name: keyof typeof loaded.abis) {
  return loaded.abis[name];
}

export function getProtocolVersion(): string {
  return loaded.manifest.protocolVersion;
}

export function getReleaseChainId(): number {
  return loaded.manifest.chainId;
}

export function getProtocolDiagnostics(): ProtocolDiagnostics {
  return {
    protocolVersion: loaded.manifest.protocolVersion,
    releaseId: loaded.manifest.releaseId,
    chainId: loaded.manifest.chainId,
    gitCommit: loaded.manifest.gitCommit,
    artifactPath: 'release',
    verifiedAt: new Date().toISOString(),
    contracts: {
      TruthBountyWeighted: loaded.addresses.TruthBountyWeighted,
    },
  };
}

// ---------------------------------------------------------------------------
// ERC-20 helpers (V2-FE-016)
// ---------------------------------------------------------------------------

/**
 * ERC-20 subset of the TruthBountyWeighted ABI.
 * Contains only view (balanceOf, allowance, decimals, symbol) and
 * nonpayable (approve) functions needed for token approval flows.
 */
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

/**
 * Read the token decimals from the canonical contract.
 * Returns 18 as a safe default if the read fails (e.g. contract not yet deployed).
 */
export async function getTokenDecimals(
  publicClient: { readContract: (args: unknown) => Promise<unknown> },
): Promise<number> {
  try {
    const result = await publicClient.readContract({
      address: getContractAddress('TruthBountyWeighted'),
      abi: ERC20_ABI,
      functionName: 'decimals',
    });
    return Number(result as bigint);
  } catch {
    return 18;
  }
}

export { loaded as protocolRegistry };
