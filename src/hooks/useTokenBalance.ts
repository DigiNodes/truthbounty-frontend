'use client';

/**
 * useTokenBalance — V2-FE-016
 *
 * Reads token balance and decimals from the canonical TruthBountyWeighted
 * contract on Optimism/EVM. All values are sourced from on-chain reads;
 * nothing is fabricated client-side.
 *
 * Security invariants:
 *  - balance/decimals are read via readContract (never hardcoded)
 *  - chainId validated against OPTIMISM_CHAIN_IDS
 *  - Returns null/undefined when disconnected or on wrong network
 *  - No Stellar/Freighter runtime dependencies
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { createPublicClient, formatUnits, http } from 'viem';
import { optimism, optimismSepolia } from 'viem/chains';
import {
  getContractAddress,
  getReleaseChainId,
  ERC20_ABI,
} from '@/lib/contracts/registry';
import { OPTIMISM_CHAIN_IDS } from '@/lib/transaction-machine/transaction-machine.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenBalanceState {
  /** Raw balance as bigint, or null when not loaded / disconnected. */
  balance: bigint | null;
  /** Human-readable formatted balance (e.g. "150.5"). */
  formattedBalance: string | null;
  /** Token decimals read from the contract (e.g. 18). */
  decimals: number | null;
  /** Token symbol read from the contract. */
  symbol: string | null;
  /** Whether a read is in progress. */
  isLoading: boolean;
  /** Error message if the read failed. */
  error: string | null;
}

export interface UseTokenBalanceReturn extends TokenBalanceState {
  /** Manually refetch balance and decimals. */
  refetch: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createOptimismPublicClient(chainId: number) {
  if (chainId === optimism.id) {
    return createPublicClient({ chain: optimism, transport: http() });
  }
  return createPublicClient({ chain: optimismSepolia, transport: http() });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTokenBalance(): UseTokenBalanceReturn {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const releaseChainId = getReleaseChainId();

  const [state, setState] = useState<TokenBalanceState>({
    balance: null,
    formattedBalance: null,
    decimals: null,
    symbol: null,
    isLoading: false,
    error: null,
  });

  const isCorrectNetwork =
    isConnected &&
    (OPTIMISM_CHAIN_IDS as readonly number[]).includes(chainId) &&
    chainId === releaseChainId;

  const readFromContract = useCallback(async () => {
    if (!isConnected || !address || !isCorrectNetwork) {
      setState({
        balance: null,
        formattedBalance: null,
        decimals: null,
        symbol: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const client = createOptimismPublicClient(chainId);
      const contractAddress = getContractAddress('TruthBountyWeighted');

      const [rawBalance, rawDecimals, rawSymbol] = await Promise.all([
        client.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        }) as unknown as Promise<bigint>,
        client.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as unknown as Promise<bigint>,
        client.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }) as unknown as Promise<string>,
      ]);

      const decimals = Number(rawDecimals);
      const formatted = formatUnits(rawBalance, decimals);

      setState({
        balance: rawBalance,
        formattedBalance: formatted,
        decimals,
        symbol: rawSymbol,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to read token balance';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [address, isConnected, chainId, isCorrectNetwork]);

  // Fetch on mount and when dependencies change
  // Using async IIFE pattern to avoid setState-in-effect lint error
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isConnected || !address || !isCorrectNetwork) {
        if (!cancelled) {
          setState({
            balance: null,
            formattedBalance: null,
            decimals: null,
            symbol: null,
            isLoading: false,
            error: null,
          });
        }
        return;
      }
      if (!cancelled) {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }
      try {
        const client = createOptimismPublicClient(chainId);
        const contractAddress = getContractAddress('TruthBountyWeighted');
        const [rawBalance, rawDecimals, rawSymbol] = await Promise.all([
          client.readContract({
            address: contractAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          }) as unknown as Promise<bigint>,
          client.readContract({
            address: contractAddress,
            abi: ERC20_ABI,
            functionName: 'decimals',
          }) as unknown as Promise<bigint>,
          client.readContract({
            address: contractAddress,
            abi: ERC20_ABI,
            functionName: 'symbol',
          }) as unknown as Promise<string>,
        ]);
        if (!cancelled) {
          const decimals = Number(rawDecimals);
          setState({
            balance: rawBalance,
            formattedBalance: formatUnits(rawBalance, decimals),
            decimals,
            symbol: rawSymbol,
            isLoading: false,
            error: null,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to read token balance';
          setState((prev) => ({ ...prev, isLoading: false, error: message }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, isConnected, chainId, isCorrectNetwork]);

  return {
    ...state,
    refetch: readFromContract,
  };
}
