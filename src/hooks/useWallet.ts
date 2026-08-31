/**
 * useWallet
 *
 * EVM-aware wallet hook for V2.
 *
 * Exposes address, chainId, isConnected, and ETH balance from Wagmi.
 * No values are fabricated locally — all state comes from on-chain Wagmi hooks.
 *
 * V2-FE-009: Added chainId (from useChainId) to match the EVM-aware WalletState
 * needed by transaction hooks.
 * V2-FE-020: Added formattedBalance / balance via useBalance so reward and
 * wallet-display components can read the live on-chain balance without a
 * separate query.
 */

'use client';

import { useAccount, useChainId, useBalance } from 'wagmi';

export interface UseWalletReturn {
  /** Checksummed EVM address, or undefined when not connected. */
  address: `0x${string}` | undefined;
  /** Currently active chain ID. */
  chainId: number;
  /** True when a wallet is connected and an address is available. */
  isConnected: boolean;
  /** Current ETH balance in ether units as a formatted string, or undefined. */
  formattedBalance: string | undefined;
  /** Raw ETH balance in wei, or undefined. */
  balance: bigint | undefined;
  /** True while the balance is being fetched. */
  isLoadingBalance: boolean;
}

export function useWallet(): UseWalletReturn {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
    address,
    // Only query when we have an address; avoids a network call when
    // the wallet is disconnected.
    query: { enabled: !!address },
  });

  return {
    address,
    chainId,
    isConnected,
    formattedBalance: balanceData?.formatted,
    balance: balanceData?.value,
    isLoadingBalance,
  };
}
