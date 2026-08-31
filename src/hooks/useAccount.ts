'use client';

import { useAccount as useWagmiAccount, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { formatAddress } from './web3';

export interface AccountData {
  address: `0x${string}`;
  displayName: string;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  chainId?: number;
}

export type AccountInfo = AccountData;

/**
 * Account hook for TruthBounty V2 EVM runtime.
 * Returns account info when connected, or null when disconnected.
 */
export function useAccount(): AccountData | null {
  const { address, isConnected, isConnecting, isDisconnected, chainId } = useWagmiAccount();

  if (!isConnected || !address) {
    return null;
  }

  return {
    address,
    displayName: formatAddress(address),
    isConnected,
    isConnecting,
    isDisconnected,
    chainId,
  };
}

/**
 * Disconnect hook wrapping Wagmi useDisconnect.
 * Supports both callable syntax `disconnect()` and destructured syntax `{ disconnect }`.
 */
export function useDisconnect() {
  const { disconnect, disconnectAsync, ...rest } = useWagmiDisconnect();

  const fn = async () => {
    try {
      await disconnectAsync();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  return Object.assign(fn, { disconnect, disconnectAsync, ...rest });
}
