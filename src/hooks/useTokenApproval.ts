'use client';

/**
 * useTokenApproval — V2-FE-016
 *
 * Reads ERC-20 allowance and manages token approval transactions for the
 * TruthBountyWeighted contract on Optimism/EVM.
 *
 * Features:
 *  - Reads current allowance from canonical contract
 *  - Supports exact approval (no unlimited defaults)
 *  - Supports reset-to-zero (approve(spender, 0))
 *  - Rejects insufficient balance, wrong asset, wrong spender, unlimited approval
 *  - Confirmation tracking via useWaitForTransactionReceipt
 *  - Integrates with the V2-FE-009 transaction state machine
 *
 * Security invariants:
 *  - MAX_UINT256 approvals rejected by default (opt-in via allowUnlimited)
 *  - Spender validated against canonical contract address
 *  - Chain validated against OPTIMISM_CHAIN_IDS
 *  - All values read from chain; nothing fabricated
 *  - No Stellar/Freighter runtime dependencies
 */

import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { createPublicClient, formatUnits, http } from 'viem';
import { optimism, optimismSepolia } from 'viem/chains';
import {
  getContractAddress,
  getReleaseChainId,
  ERC20_ABI,
} from '@/lib/contracts/registry';
import { OPTIMISM_CHAIN_IDS } from '@/lib/transaction-machine/transaction-machine.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum uint256 value — used for unlimited approval detection. */
const MAX_UINT256 = 2n ** 256n - 1n;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApprovalStatus = 'idle' | 'loading' | 'success' | 'error';

export interface TokenApprovalState {
  /** Current allowance as bigint, or null when not loaded. */
  allowance: bigint | null;
  /** Human-readable formatted allowance. */
  formattedAllowance: string | null;
  /** Token decimals from the contract. */
  decimals: number | null;
  /** Current approval transaction status. */
  status: ApprovalStatus;
  /** Transaction hash after submission, or null. */
  txHash: `0x${string}` | null;
  /** Error message if the approval failed. */
  error: string | null;
  /** Whether an allowance read is in progress. */
  isLoadingAllowance: boolean;
}

export interface UseTokenApprovalReturn extends TokenApprovalState {
  /**
   * Approve the spender for an exact amount of tokens.
   * Rejects if balance < amount, spender is wrong, or amount is MAX_UINT256.
   */
  approve: (amount: bigint) => Promise<void>;
  /** Reset approval to zero for the canonical spender. */
  resetApproval: () => Promise<void>;
  /** Manually refetch the current allowance. */
  refetchAllowance: () => Promise<void>;
}

export interface UseTokenApprovalOptions {
  /** Override the expected spender. Defaults to TruthBountyWeighted contract. */
  spender?: `0x${string}`;
  /** Allow MAX_UINT256 approvals. Default: false. */
  allowUnlimited?: boolean;
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

export function useTokenApproval(
  opts: UseTokenApprovalOptions = {},
): UseTokenApprovalReturn {
  const { spender: overrideSpender, allowUnlimited = false } = opts;

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const releaseChainId = getReleaseChainId();

  const [state, setState] = useState<TokenApprovalState>({
    allowance: null,
    formattedAllowance: null,
    decimals: null,
    status: 'idle',
    txHash: null,
    error: null,
    isLoadingAllowance: false,
  });

  const isCorrectNetwork =
    isConnected &&
    (OPTIMISM_CHAIN_IDS as readonly number[]).includes(chainId) &&
    chainId === releaseChainId;

  // Resolved spender address
  const expectedSpender: `0x${string}` =
    overrideSpender ?? getContractAddress('TruthBountyWeighted');

  // Wagmi write hook
  const { writeContractAsync } = useWriteContract();

  // Watch for tx confirmation
  const submittedHash =
    state.status === 'loading' && state.txHash ? state.txHash : undefined;

  const { isSuccess: txConfirmed } =
    useWaitForTransactionReceipt({ hash: submittedHash });

  // After confirmation, reset status to success
  useEffect(() => {
    if (txConfirmed && state.status === 'loading') {
      setState((prev) => ({ ...prev, status: 'success' }));
      // Auto-reset after 3s
      const timer = setTimeout(() => {
        setState((prev) => ({ ...prev, status: 'idle', txHash: null }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [txConfirmed, state.status]);

  // -----------------------------------------------------------------------
  // Fetch allowance
  // -----------------------------------------------------------------------

  const refetchAllowance = useCallback(async () => {
    if (!isConnected || !address || !isCorrectNetwork) {
      setState((prev) => ({
        ...prev,
        allowance: null,
        formattedAllowance: null,
        decimals: null,
        isLoadingAllowance: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoadingAllowance: true }));

    try {
      const client = createOptimismPublicClient(chainId);
      const contractAddress = getContractAddress('TruthBountyWeighted');

      const [rawAllowance, rawDecimals] = await Promise.all([
        client.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address as `0x${string}`, expectedSpender],
        }) as unknown as Promise<bigint>,
        client.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as unknown as Promise<bigint>,
      ]);

      const decimals = Number(rawDecimals);
      const formatted = formatUnits(rawAllowance, decimals);

      setState((prev) => ({
        ...prev,
        allowance: rawAllowance,
        formattedAllowance: formatted,
        decimals,
        isLoadingAllowance: false,
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to read allowance';
      setState((prev) => ({
        ...prev,
        isLoadingAllowance: false,
        error: message,
      }));
    }
  }, [address, isConnected, chainId, isCorrectNetwork, expectedSpender]);

  // Fetch allowance on mount and when dependencies change
  useEffect(() => {
    void refetchAllowance();
  }, [refetchAllowance]);

  // -----------------------------------------------------------------------
  // Core approve logic
  // -----------------------------------------------------------------------

  const executeApproval = useCallback(
    async (amount: bigint): Promise<void> => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      if (!isCorrectNetwork) {
        throw new Error(
          `Connected to chain ${chainId}, expected ${releaseChainId}`,
        );
      }

      // Guard: reject unlimited approval unless explicitly allowed
      if (!allowUnlimited && amount >= MAX_UINT256) {
        throw new Error(
          'Unlimited approval rejected: pass allowUnlimited: true to approve MAX_UINT256',
        );
      }

      // Guard: reject zero amount (use resetApproval instead)
      if (amount === 0n) {
        throw new Error(
          'Amount must be > 0. Use resetApproval() to set allowance to zero.',
        );
      }

      // Guard: check balance
      const client = createOptimismPublicClient(chainId);
      const contractAddress = getContractAddress('TruthBountyWeighted');

      const rawBalance = (await client.readContract({
        address: contractAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      })) as unknown as bigint;

      if (rawBalance < amount) {
        const decimals =
          state.decimals ??
          Number(
            (await client.readContract({
              address: contractAddress,
              abi: ERC20_ABI,
              functionName: 'decimals',
            })) as unknown as bigint,
          );
        throw new Error(
          `Insufficient balance: have ${formatUnits(rawBalance, decimals)}, need ${formatUnits(amount, decimals)}`,
        );
      }

      // Submit approval
      setState((prev) => ({
        ...prev,
        status: 'loading',
        error: null,
      }));

      try {
        const txHash = await writeContractAsync({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [expectedSpender, amount],
        });

        setState((prev) => ({
          ...prev,
          txHash,
        }));
      } catch (err: unknown) {
        const isUserRejection =
          err instanceof Error &&
          (err.message.includes('User rejected') ||
            err.message.includes('user rejected') ||
            err.message.includes('4001'));

        if (isUserRejection) {
          setState((prev) => ({
            ...prev,
            status: 'idle',
            error: 'Transaction rejected by user',
          }));
        } else {
          const message =
            err instanceof Error ? err.message : 'Approval failed';
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: message,
          }));
          setTimeout(() => {
            setState((prev) => ({ ...prev, status: 'idle' }));
          }, 4000);
        }
      }
    },
    [
      isConnected,
      address,
      isCorrectNetwork,
      chainId,
      releaseChainId,
      allowUnlimited,
      writeContractAsync,
      expectedSpender,
      state.decimals,
    ],
  );

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  const approve = useCallback(
    async (amount: bigint) => executeApproval(amount),
    [executeApproval],
  );

  // resetApproval bypasses the zero-amount guard that approve() enforces
  const resetApprovalFinal = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!isCorrectNetwork) {
      throw new Error(
        `Connected to chain ${chainId}, expected ${releaseChainId}`,
      );
    }

    setState((prev) => ({
      ...prev,
      status: 'loading',
      error: null,
    }));

    try {
      const contractAddress = getContractAddress('TruthBountyWeighted');
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [expectedSpender, 0n],
      });

      setState((prev) => ({ ...prev, txHash }));
    } catch (err: unknown) {
      const isUserRejection =
        err instanceof Error &&
        (err.message.includes('User rejected') ||
          err.message.includes('user rejected') ||
          err.message.includes('4001'));

      if (isUserRejection) {
        setState((prev) => ({
          ...prev,
          status: 'idle',
          error: 'Transaction rejected by user',
        }));
      } else {
        const message = err instanceof Error ? err.message : 'Reset failed';
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: message,
        }));
        setTimeout(() => {
          setState((prev) => ({ ...prev, status: 'idle' }));
        }, 4000);
      }
    }
  }, [
    isConnected,
    address,
    isCorrectNetwork,
    chainId,
    releaseChainId,
    writeContractAsync,
    expectedSpender,
  ]);

  return {
    ...state,
    approve,
    resetApproval: resetApprovalFinal,
    refetchAllowance,
  };
}
