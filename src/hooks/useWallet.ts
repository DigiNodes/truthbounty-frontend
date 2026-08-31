/**
 * useWallet
 *
 * Thin adapter that exposes wallet balance and address from Wagmi hooks
 * and the query cache.
 *
 * Replaces the previous local-state-only implementation that allowed
 * arbitrary client-side balance mutations. Balances are now read from
 * the on-chain state via Wagmi; no values are fabricated locally.
 */

'use client';

import { useAccount, useBalance } from 'wagmi';

export interface UseWalletReturn {
  /** Connected wallet address, or undefined when not connected. */
  address: `0x${string}` | undefined;
  /** True when a wallet is connected. */
  isConnected: boolean;
  /** Current ETH balance in ether units as a formatted string, or undefined. */
  formattedBalance: string | undefined;
  /** Raw balance value, or undefined. */
  balance: bigint | undefined;
  /** True while the balance is being fetched. */
  isLoadingBalance: boolean;
}

export function useWallet(): UseWalletReturn {
  const { address, isConnected } = useAccount();

  const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
    address,
    // Only query when we have an address; the `enabled` flag avoids an
    // unnecessary network call when the wallet is disconnected.
    query: { enabled: !!address },
  });

  return {
    address,
    isConnected,
    formattedBalance: balanceData?.formatted,
    balance: balanceData?.value,
    isLoadingBalance,
  };
}
