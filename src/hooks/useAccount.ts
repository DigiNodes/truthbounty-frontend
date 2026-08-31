/**
 * V2 EVM Wallet Account Hook
 *
 * Replaces Stellar/Freighter wallet integration with canonical EVM wallet support
 * using Wagmi and Viem. Never connects to non-canonical chains or performs
 * unauthorized wallet operations.
 */

import { useAccount as useWagmiAccount, useChainId, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { useEffect, useState, useCallback } from 'react';
import { type Address } from 'viem';
import { getChainConfig, isSupportedChain } from '@/config/chains';

const WALLET_STORAGE_KEY = 'truthbounty-wallet-connection-v2';

interface AccountState {
  address: Address | undefined;
  displayName: string;
  chainId: number;
  isConnected: boolean;
  isDisconnected: boolean;
  isWrongNetwork: boolean;
}

/**
 * useAccount hook - EVM wallet integration
 *
 * Returns account state with chain validation.
 * Detects wrong network and prevents operations on unsupported chains.
 */
export function useAccount() {
  const wagmiAccount = useWagmiAccount();
  const wagmiChainId = useChainId();
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  // Validate chain on account/chainId change
  useEffect(() => {
    if (wagmiAccount.isConnected && wagmiAccount.address) {
      const supported = isSupportedChain(wagmiChainId);
      setIsWrongNetwork(!supported);

      if (supported) {
        try {
          const config = getChainConfig(wagmiChainId);
          // Persist valid connection
          localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({
            address: wagmiAccount.address,
            chainId: wagmiChainId,
            chainName: config.name,
            timestamp: Date.now(),
          }));
        } catch (error) {
          console.error('Failed to persist wallet connection:', error);
        }
      }
    } else {
      setIsWrongNetwork(false);
      try {
        localStorage.removeItem(WALLET_STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear wallet connection:', error);
      }
    }
  }, [wagmiAccount.address, wagmiAccount.isConnected, wagmiChainId]);

  const getDisplayName = useCallback((address: Address | undefined): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  return {
    address: wagmiAccount.address as Address | undefined,
    displayName: getDisplayName(wagmiAccount.address as Address | undefined),
    chainId: wagmiChainId,
    isConnected: wagmiAccount.isConnected,
    isDisconnected: !wagmiAccount.isConnected,
    isWrongNetwork,
  };
}

/**
 * useDisconnect hook - Wrapper around wagmi's useDisconnect
 * 
 * Provides wallet disconnection functionality with cleanup.
 */
export function useDisconnect() {
  const { disconnect } = useWagmiDisconnect();
  
  return useCallback(async () => {
    try {
      localStorage.removeItem(WALLET_STORAGE_KEY);
      disconnect?.();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }, [disconnect]);
}

/**
 * Get persisted wallet connection info (for recovery/debugging)
 */
export function getPersistedConnection() {
  try {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as {
        address: Address;
        chainId: number;
        chainName: string;
        timestamp: number;
    };

    window.addEventListener('storage', onStorage);

    // As a safety net, poll occasionally to detect manual disconnects.
    const interval = setInterval(() => void validate(), 5000);

    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
      };
    }
  } catch (error) {
    console.error('Failed to retrieve persisted connection:', error);
  }
  return null;
}

/**
 * Clear persisted wallet connection
 */
export function clearPersistedConnection() {
  try {
    localStorage.removeItem(WALLET_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear connection:', error);
  }
}
