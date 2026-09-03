/**
 * Wallet abstraction layer — V2 EVM implementation.
 *
 * V2-FE-009: Removed mock hash generation (Math.random) and Stellar
 * dependencies.
 * V2-FE-016: Replaced NotImplemented stubs with real readContract/writeContract
 * calls using the canonical TruthBountyWeighted contract artifacts.
 *
 * claimRewards remains NotImplemented pending V2-FE-003 (full rewards ABI freeze).
 */

import { createPublicClient, http } from 'viem';
import { optimismSepolia } from 'viem/chains';
import {
  getContractAddress,
  ERC20_ABI,
} from '@/lib/contracts/registry';

const publicClient = createPublicClient({
  chain: optimismSepolia,
  transport: http(),
});

/**
 * NOT IMPLEMENTED — pending V2-FE-003 (contract ABI freeze).
 *
 * Will be replaced with a Wagmi `writeContract` call to the TruthBounty
 * rewards contract's `claimRewards()` method once the full ABI is frozen.
 *
 * @throws Error always — callers must gate on contract availability.
 */
export async function claimRewards(
  _claimIds: string[],
): Promise<{ txHash: `0x${string}` }> {
  throw new Error(
    '[claimRewards] Not implemented: waiting for V2-FE-003 contract ABI. ' +
    'Use useEvmTransaction.writeContract once the ABI is available.',
  );
}

/**
 * Read the ERC-20 token balance for the given address from the canonical
 * TruthBountyWeighted contract.
 *
 * Returns the raw bigint balance. Use formatUnits(balance, decimals)
 * for a human-readable value.
 *
 * @throws Error if the contract read fails (e.g. wrong network, contract not deployed).
 */
export async function getTokenBalance(
  address: string,
): Promise<bigint> {
  const contractAddress = getContractAddress('TruthBountyWeighted');
  const abi = ERC20_ABI;

  const result = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });

  return result as unknown as bigint;
}

/**
 * Read the token decimals from the canonical contract.
 * Returns 18 as a safe default if the read fails.
 */
export async function getTokenDecimals(): Promise<number> {
  try {
    const contractAddress = getContractAddress('TruthBountyWeighted');
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });
    return Number(result as unknown as bigint);
  } catch {
    return 18;
  }
}

/**
 * Read the ERC-20 allowance for owner → spender from the canonical contract.
 *
 * @param owner - Token owner address
 * @param spender - Spender address (defaults to TruthBountyWeighted contract)
 */
export async function getAllowance(
  owner: string,
  spender?: string,
): Promise<bigint> {
  const contractAddress = getContractAddress('TruthBountyWeighted');
  const spenderAddr = (spender ?? contractAddress) as `0x${string}`;

  const result = await publicClient.readContract({
    address: contractAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner as `0x${string}`, spenderAddr],
  });

  return result as unknown as bigint;
}
