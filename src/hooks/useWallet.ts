'use client';

/**
 * useWallet — EVM-aware wallet hook for V2.
 *
 * Replaced the toy numeric-balance mock (V2-FE-009).
 * Exposes address, chainId, and lifecycle state from canonical Wagmi hooks.
 * The `balance` field is intentionally omitted — ERC-20 balance queries will be
 * implemented separately via `useBalance` when the TruthBounty token contract
 * address is finalized (V2-FE-003).
 */

import { useAccount as useWagmiAccount, useChainId, useConnect, useDisconnect, useReconnect } from 'wagmi';
import { useAccount } from './useAccount';

export interface WalletState {
  /** Checksummed EVM address, or undefined if not connected. */
  address: `0x${string}` | undefined;
  /** Currently active chain ID. */
  chainId: number | undefined;
  /** True when a wallet is connected and an address is available. */
  isConnected: boolean;
  /** Canonical wallet lifecycle state for hydration-safe UI. */
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  /** True while the wallet is restoring a prior session. */
  isReconnecting: boolean;
  /** Last wallet connector metadata, if available. */
  connectorId?: string;
  connectorName?: string;
  /** Connector-level error state surfaced through Wagmi. */
  connectorError: Error | null;
  connect: ReturnType<typeof useConnect>['connect'];
  reconnect: ReturnType<typeof useReconnect>['reconnect'];
  disconnect: ReturnType<typeof useDisconnect>['disconnect'];
  isPending: boolean;
}

export function useWallet(): WalletState {
  const account = useAccount();
  const wagmiAccount = useWagmiAccount();
  const chainId = useChainId();
  const { connect, error: connectorError, isPending: connectPending } = useConnect();
  const { disconnect, isPending: disconnectPending } = useDisconnect();
  const { reconnect, isPending: reconnectPending } = useReconnect();

  const status =
    wagmiAccount.status ??
    (wagmiAccount.isConnected ? 'connected' : wagmiAccount.isReconnecting ? 'reconnecting' : 'disconnected');

  return {
    address: account?.address as `0x${string}` | undefined,
    chainId: chainId ?? account?.chainId,
    isConnected: Boolean(account?.isConnected),
    status,
    isReconnecting: Boolean(account?.isReconnecting || wagmiAccount.isReconnecting || reconnectPending),
    connectorId: account?.connectorId ?? wagmiAccount.connector?.id,
    connectorName: account?.connectorName ?? wagmiAccount.connector?.name,
    connectorError: connectorError ?? null,
    connect,
    reconnect,
    disconnect,
    isPending: connectPending || disconnectPending || reconnectPending,
  };
}
