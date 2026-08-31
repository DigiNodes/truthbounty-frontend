/**
 * useAccount — canonical EVM account accessor for TruthBounty.
 *
 * Thin wrapper over wagmi's useAccount with:
 *  - hydration-safe connected state (no phantom flash on SSR/Next.js)
 *  - stable display name (truncated address)
 *  - null return when disconnected, making guards idiomatic
 *
 * Replaces the previous Stellar/Freighter-backed implementation.
 */

'use client';

import { useMemo } from 'react';
import { useAccount as useWagmiAccount } from 'wagmi';
import { useIsMounted } from '@/hooks/useIsMounted';

export { useDisconnect } from 'wagmi';

export interface AccountInfo {
  /** Full checksummed EVM address. */
  address: `0x${string}`;
  /** Truncated address for display: "0xABCD…EF12". */
  displayName: string;
  /** Chain id reported by the wallet at connection time. */
  chainId: number | undefined;
}

/**
 * Returns the connected account or null.
 *
 * Returns null on the server and on the first client render to prevent
 * a hydration mismatch ("phantom connected" flash).
 */
export function useAccount(): AccountInfo | null {
  const mounted = useIsMounted();
  const { address, isConnected, chainId } = useWagmiAccount();

  return useMemo<AccountInfo | null>(() => {
    // Guard: never report connected state before client hydration.
    if (!mounted || !isConnected || !address) {
      return null;
    }

    return {
      address,
      displayName: `${address.slice(0, 6)}…${address.slice(-4)}`,
      chainId,
    };
  }, [mounted, isConnected, address, chainId]);
}
