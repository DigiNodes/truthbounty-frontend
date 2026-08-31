/**
 * V2 EVM Wallet Hook
 *
 * Replaces mock wallet with real Wagmi integration.
 * Provides balance, transaction submission, and account management.
 * Never deposits/withdraws directly - uses smart contracts instead.
 */

import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { useCallback, useMemo } from 'react';
import { getChainConfig, isSupportedChain } from '@/config/chains';
import type { Address } from 'viem';

interface WalletState {
  isConnected: boolean;
  address: Address | undefined;
  chainId: number;
  balance: bigint | undefined;
  balanceFormatted: string;
  isWrongNetwork: boolean;
  connect: (connector?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: number) => Promise<void>;
}

/**
 * useWallet hook - Real EVM wallet integration
 *
 * Returns current wallet state and connection methods.
 * Validates chain and prevents operations on unsupported networks.
 */
export function useWallet(): WalletState {
  const wagmiAccount = useAccount();
  const wagmiBalance = useBalance({
    address: wagmiAccount.address,
  });
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // Check if on wrong network
  const isWrongNetwork = useMemo(() => {
    if (!wagmiAccount.isConnected) return false;
    return !isSupportedChain(wagmiAccount.chainId);
  }, [wagmiAccount.isConnected, wagmiAccount.chainId]);

  const handleConnect = useCallback(async (connectorId?: string) => {
    if (wagmiAccount.isConnected) return;

    const targetConnector = connectorId
      ? connectors.find((c) => c.id === connectorId)
      : connectors[0];

    if (targetConnector) {
      connect({ connector: targetConnector });
    }
  }, [connect, connectors, wagmiAccount.isConnected]);

  const handleDisconnect = useCallback(async () => {
    disconnect();
  }, [disconnect]);

  const handleSwitchChain = useCallback(
    async (chainId: number) => {
      if (!isSupportedChain(chainId)) {
        throw new Error(`Chain ${chainId} is not supported`);
      }
      switchChain({ chainId });
    },
    [switchChain]
  );

  // Format balance to readable string
  const balanceFormatted = useMemo(() => {
    if (!wagmiBalance.data) return '0';
    return wagmiBalance.data.formatted.slice(0, 6); // 6 decimals
  }, [wagmiBalance.data]);

  return {
    isConnected: wagmiAccount.isConnected,
    address: wagmiAccount.address as Address | undefined,
    chainId: wagmiAccount.chainId,
    balance: wagmiBalance.data?.value,
    balanceFormatted,
    isWrongNetwork,
    connect: handleConnect,
    disconnect: handleDisconnect,
    switchChain: handleSwitchChain,
  };
}

/**
 * Get human-readable chain name from wallet state
 */
export function getChainName(chainId: number): string {
  if (!isSupportedChain(chainId)) return 'Unknown Chain';
  const config = getChainConfig(chainId);
  return config.name;
}

/**
 * Get blockchain explorer URL for an address or tx
 */
export function getExplorerUrl(
  chainId: number,
  type: 'address' | 'tx',
  value: string
): string | null {
  if (!isSupportedChain(chainId)) return null;
  const config = getChainConfig(chainId);

  if (type === 'address') {
    return `${config.blockExplorer.url}/address/${value}`;
  } else {
    return `${config.blockExplorer.url}/tx/${value}`;
  }
}

