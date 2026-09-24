'use client';

import { useMemo } from 'react';
import {
  useAccount as useWagmiAccount,
  useDisconnect as useWagmiDisconnect,
} from 'wagmi';
import { useIsMounted } from '@/hooks/useIsMounted';

export interface AccountInfo {
  address: `0x${string}`;
  displayName: string;
  chainId: number | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
}

export type AccountData = AccountInfo;

/**
 * Returns the connected EVM account, or null before hydration/disconnection.
 */
export function useAccount(): AccountInfo | null {
  const mounted = useIsMounted();
  const {
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    chainId,
  } = useWagmiAccount();

  return useMemo<AccountInfo | null>(() => {
    if (!mounted || !isConnected || !address) {
      return null;
    }

    return {
      address,
      displayName: `${address.slice(0, 6)}…${address.slice(-4)}`,
      chainId,
      isConnected,
      isConnecting,
      isDisconnected,
    };
  }, [
    mounted,
    isConnected,
    isConnecting,
    isDisconnected,
    address,
    chainId,
  ]);
}

/**
 * Callable disconnect helper that also supports Wagmi-style destructuring.
 */
export function useDisconnect() {
  const { disconnect, disconnectAsync, ...rest } = useWagmiDisconnect();

  const disconnectAccount = async () => {
    try {
      await disconnectAsync();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  return Object.assign(disconnectAccount, {
    disconnect,
    disconnectAsync,
    ...rest,
  });
}
