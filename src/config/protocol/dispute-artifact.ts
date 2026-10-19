/**
 * Versioned protocol artifact for the canonical challenge/dispute opening
 * runtime.
 *
 * Mirrors `verification-artifact.ts`: the upstream interface is not frozen, so
 * this module pins the exact interface the frontend was built against
 * (`IVerificationDispute` + ERC-20) under a single immutable
 * `DISPUTE_ARTIFACT_VERSION` string and the deployment release tag supplied
 * through the environment.
 *
 * Fail-closed rules (PROTOCOL_V2_SPEC §23 / §26 / ADR-0001):
 *   - The artifact is only `isDeployed` when every required address is pinned
 *     for the active chain AND a real release tag is set.
 *   - Missing/empty/dummy/zero addresses disable the hook with explicit
 *     reasons — the frontend never fabricates or guesses protocol state.
 */

'use client';

export const DISPUTE_SUPPORTED_CHAINS = [10, 11155420] as const;
export type DisputeChainId = (typeof DISPUTE_SUPPORTED_CHAINS)[number];

/**
 * Immutable version of the pinned interface. Bump this when the upstream
 * interface (IVerificationDispute) changes and the ABI below is regenerated.
 */
export const DISPUTE_ARTIFACT_VERSION = 'iv-verification-dispute@v1.0.0';

// ---------------------------------------------------------------------------
// ABI fragments — generated from the canonical V2 interfaces
// (DigiNodes/truthbounty-contract: contracts/interfaces/IVerificationDispute.sol,
//  OpenZeppelin IERC20). The challenge bond is an ERC-20 amount pulled with
// `transferFrom`, so callers must hold an allowance — there is no payable path.
// ---------------------------------------------------------------------------

export const disputeAbi = [
  {
    type: 'function',
    name: 'getChallengeBond',
    stateMutability: 'view',
    inputs: [{ name: 'claimId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getChallengeDeadline',
    stateMutability: 'view',
    inputs: [{ name: 'claimId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'hasOpenChallenge',
    stateMutability: 'view',
    inputs: [{ name: 'claimId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'openChallenge',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'claimId', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
] as const;

export const erc20Abi = [
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
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export interface DisputeArtifactAddresses {
  dispute: `0x${string}`;
  stakingToken: `0x${string}`;
}

export interface DisputeArtifact {
  chainId: DisputeChainId;
  releaseTag: string | null;
  artifactVersion: string;
  addresses: DisputeArtifactAddresses;
  isDeployed: boolean;
  disabledReasons: string[];
}

/**
 * Environment snapshot used to resolve the artifact. Keys mirror
 * `NEXT_PUBLIC_*` env vars with optional per-chain suffixes (`_10`,
 * `_11155420`) that take precedence over the chain-agnostic value.
 */
export interface DisputeArtifactEnv {
  NEXT_PUBLIC_TRUTHBOUNTY_PROTOCOL_RELEASE_TAG?: string;
  NEXT_PUBLIC_TRUTHBOUNTY_DISPUTE_ADDRESS?: string;
  NEXT_PUBLIC_TRUTHBOUNTY_STAKING_TOKEN_ADDRESS?: string;
  [key: string]: string | undefined;
}

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const FORBIDDEN_RELEASE_TAGS = /dummy|placeholder|zero|todo|example/i;

function isUnsupportedChain(chainId: number): boolean {
  return !(DISPUTE_SUPPORTED_CHAINS as readonly number[]).includes(chainId);
}

/**
 * Pure artifact resolver. Exported separately from `getDisputeArtifact` so
 * tests can exercise it with a fabricated environment.
 */
export function resolveDisputeArtifact(
  env: DisputeArtifactEnv,
  chainId: number
): DisputeArtifact {
  const disabledReasons: string[] = [];

  if (isUnsupportedChain(chainId)) {
    disabledReasons.push(`chain ${chainId} is not a supported dispute chain`);
  }

  const chainSuffix = String(chainId);
  const readAddress = (baseKey: string): string | undefined => {
    const perChain = env[`${baseKey}_${chainSuffix}`];
    if (perChain && perChain.trim() !== '') return perChain.trim();
    const generic = env[baseKey];
    if (generic && generic.trim() !== '') return generic.trim();
    return undefined;
  };

  const releaseTag =
    env.NEXT_PUBLIC_TRUTHBOUNTY_PROTOCOL_RELEASE_TAG?.trim() || null;

  const validate = (
    raw: string | undefined,
    label: string,
    reasons: string[]
  ): `0x${string}` | null => {
    if (!raw) {
      reasons.push(`${label} address is not pinned in the deployment release`);
      return null;
    }
    if (!EVM_ADDRESS_RE.test(raw)) {
      reasons.push(`${label} address is not a valid EVM address`);
      return null;
    }
    return raw.toLowerCase() as `0x${string}`;
  };

  const dispute = validate(
    readAddress('NEXT_PUBLIC_TRUTHBOUNTY_DISPUTE_ADDRESS'),
    'VerificationDispute',
    disabledReasons
  );
  const stakingToken = validate(
    readAddress('NEXT_PUBLIC_TRUTHBOUNTY_STAKING_TOKEN_ADDRESS'),
    'StakingToken',
    disabledReasons
  );

  if (!releaseTag) {
    disabledReasons.push(
      'protocol release tag is not pinned (NEXT_PUBLIC_TRUTHBOUNTY_PROTOCOL_RELEASE_TAG)'
    );
  } else if (FORBIDDEN_RELEASE_TAGS.test(releaseTag)) {
    disabledReasons.push(`release tag "${releaseTag}" is not a real release`);
  }

  return {
    chainId: chainId as DisputeChainId,
    releaseTag,
    artifactVersion: DISPUTE_ARTIFACT_VERSION,
    addresses: {
      dispute: dispute ?? ('' as `0x${string}`),
      stakingToken: stakingToken ?? ('' as `0x${string}`),
    },
    isDeployed:
      disabledReasons.length === 0 &&
      Boolean(dispute && stakingToken && releaseTag),
    disabledReasons,
  };
}

/**
 * Resolve the active artifact from the process environment.
 * Fails closed when the deployment release is not pinned for the chain.
 */
export function getDisputeArtifact(chainId: number): DisputeArtifact {
  return resolveDisputeArtifact(process.env as DisputeArtifactEnv, chainId);
}
