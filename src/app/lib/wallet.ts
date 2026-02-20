/**
 * Wallet abstraction layer
 * (mock implementation for now)
 */

export async function getTokenBalance(): Promise<number> {
  // Later: replace with ERC20 balanceOf call
  return 1000;
}
