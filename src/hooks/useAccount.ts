'use client';

/**
 * useAccount — EVM/Wagmi implementation for V2.
 *
 * Replaces the Stellar/Freighter-based implementation removed in V2-FE-009.
 * Public interface is preserved so existing consumers compile without change.
 *
 * Provides:
 *  - address    — checksummed `0x…` EVM address, or null if disconnected
 *  - displayName — abbreviated "0xABCD…1234" label
 *  - chainId    — currently connected chain
 *  - isConnected — boolean wallet connection status
 */

import { useAccount as useWagmiAccount } from 'wagmi';

export interface AccountInfo {
  address: string;
  displayName: string;
  chainId: number | undefined;
  isConnected: boolean;
}

/**
 * Returns the connected EVM account, or null if the wallet is disconnected.
 *
 * This hook is a thin adapter over Wagmi's `useAccount`.
 * The `displayName` format mirrors the previous Stellar implementation:
 * first 6 and last 4 hex characters separated by "…".
 */
export function useAccount(): AccountInfo | null {
  const { address, chainId, isConnected } = useWagmiAccount();

  if (!isConnected || !address) return null;

  const displayName = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return {
    address,
    displayName,
    chainId,
    isConnected,
  };
}

/**
 * Disconnect hook — delegates to Wagmi's `useDisconnect`.
 * Exported for backward compatibility with existing callers.
 */
export { useDisconnect } from 'wagmi';
