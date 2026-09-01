'use client';

/**
 * useAccount — EVM/Wagmi implementation for V2.
 *
 * Replaces the Stellar/Freighter-based implementation removed in V2-FE-009.
 * Public interface is preserved so existing consumers compile without change.
 *
 * Provides:
 *  - address      — checksummed `0x…` EVM address, or null if disconnected
 *  - displayName  — abbreviated "0xABCD…1234" label
 *  - chainId      — currently connected chain
 *  - isConnected  — boolean wallet connection status
 *  - status       — canonical Wagmi lifecycle status
 *  - isReconnecting — true while the wallet is re-establishing a session
 *  - connectorId/Name — last connected wallet metadata for persistence and UX
 */

import { useAccount as useWagmiAccount } from 'wagmi';

export type WalletLifecycleStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface AccountInfo {
  address: string | null;
  displayName: string | null;
  chainId: number | undefined;
  isConnected: boolean;
  isReconnecting: boolean;
  status: WalletLifecycleStatus;
  connectorId?: string;
  connectorName?: string;
}

/**
 * Returns the connected EVM account, or null if the wallet is disconnected.
 *
 * This hook is a thin adapter over Wagmi's `useAccount` and exposes lifecycle
 * metadata needed for reconnect handling and hydration-safe UI state.
 */
export function useAccount(): AccountInfo | null {
  const wagmiAccount = useWagmiAccount();
  const { address, chainId, isConnected, isReconnecting, status, connector } = wagmiAccount;

  const lifecycleStatus: WalletLifecycleStatus =
    status ?? (isConnected ? 'connected' : isReconnecting ? 'reconnecting' : 'disconnected');

  if (!isConnected || !address) {
    return null;
  }

  const displayName = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return {
    address,
    displayName,
    chainId,
    isConnected,
    isReconnecting: Boolean(isReconnecting),
    status: lifecycleStatus,
    connectorId: connector?.id,
    connectorName: connector?.name,
  };
}

export { useConnect, useDisconnect, useReconnect } from 'wagmi';
