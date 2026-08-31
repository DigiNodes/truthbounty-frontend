/**
 * Wallet helpers backed by the verified protocol release registry.
 * On-chain reads use the pinned contract address; writes require a connected wallet.
 */

import { createPublicClient, http, type Address } from 'viem';
import { optimismSepolia } from 'viem/chains';
import {
  getContractAbi,
  getContractAddress,
  getReleaseChainId,
} from '@/lib/contracts/registry';

function getReadClient() {
  const chainId = getReleaseChainId();
  const chain = chainId === optimismSepolia.id ? optimismSepolia : optimismSepolia;
  return createPublicClient({
    chain,
    transport: http(),
  });
}

export async function getTokenBalance(account: Address): Promise<bigint> {
  const client = getReadClient();
  const result = await client.readContract({
    address: getContractAddress('TruthBountyWeighted'),
    abi: getContractAbi('TruthBountyWeighted'),
    functionName: 'balanceOf',
    args: [account],
  });
  return result as bigint;
}

/**
 * Claim rewards through the user's wallet (write path).
 * Callers must submit the transaction via Wagmi writeContract — this helper
 * only validates registry wiring and rejects synthetic hashes.
 */
export async function claimRewards(claimIds: string[]): Promise<never> {
  if (claimIds.length === 0) {
    throw new Error('No rewards selected to claim');
  }

  getContractAddress('TruthBountyWeighted');
  throw new Error(
    'Rewards claim requires an on-chain wallet transaction via writeContract; synthetic tx hashes are not produced.',
  );
}
