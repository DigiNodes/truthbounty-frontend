'use client';

/**
 * useWallet — EVM-aware wallet hook for V2.
 *
 * Replaced the toy numeric-balance mock (V2-FE-009).
 * Exposes address, chainId, and isConnected from Wagmi.
 * The `balance` field is intentionally omitted — ERC-20 balance
 * queries will be implemented separately via `useBalance` when
 * the TruthBounty token contract address is finalized (V2-FE-003).
 */

import { useAccount, useChainId } from 'wagmi';

export interface WalletState {
  /** Checksummed EVM address, or undefined if not connected. */
  address: `0x${string}` | undefined;
  /** Currently active chain ID. */
  chainId: number;
  /** True when a wallet is connected and an address is available. */
  isConnected: boolean;
}

export function useWallet(): WalletState {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  return {
    address,
    chainId,
    isConnected,
  };
}
