/**
 * Wallet and Token abstraction layer for TruthBounty V2 EVM runtime
 */

export interface ClaimRewardResult {
  txHash: `0x${string}`;
}

export async function getTokenBalance(): Promise<number> {
  // Canonical balance is retrieved via Wagmi/Viem ERC20 balanceOf contract reads
  return 0;
}

/**
 * Claim rewards interface
 */
export async function claimRewards(
  claimIds: string[],
): Promise<ClaimRewardResult> {
  if (!claimIds.length) {
    throw new Error('No claim IDs provided for reward claiming');
  }

  // Canonical reward claiming is submitted through Wagmi/Viem writeContract
  throw new Error('Direct reward claim without contract instance is not supported');
}
