/**
 * Wallet abstraction layer
 * (mock implementation for now)
 */

export async function getTokenBalance(): Promise<number> {
  // Later: replace with ERC20 balanceOf call
  return 1000;
}

/**
 * Simulate calling the reward contract's claim() method.
 * In production, replace this with an actual on-chain transaction.
 */
export async function claimRewards(
  claimIds: string[],
): Promise<{ txHash: string }> {
  // Simulate network / contract call latency
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Simulate occasional failure (uncomment to test error state)
  // if (Math.random() < 0.3) throw new Error("Transaction reverted");

  const txHash =
    "0x" +
    Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("");

  console.log(`[claimRewards] claimed for ${claimIds.join(", ")} → ${txHash}`);
  return { txHash };
}
