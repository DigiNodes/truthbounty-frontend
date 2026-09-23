'use client';

/**
 * V2-FE-142 — useWalletCompatibility
 *
 * Detects connector capabilities, chain state, and failure modes for the
 * wallet compatibility matrix.  Wraps the pure buildCompatibilityMatrix
 * utility with live wagmi state.
 *
 * This hook is EVM/Optimism-only.  It never fabricates chain state,
 * capabilities, or connection status.
 */

import { useMemo, useState, useEffect } from 'react';
import { useAccount, useConnectors } from 'wagmi';
import {
  buildCompatibilityMatrix,
  type WalletCompatibilityMatrix,
} from '@/lib/wallet-compatibility';

export interface UseWalletCompatibilityOptions {
  /**
   * Milliseconds to debounce re-detection after connector/chain changes.
   * Defaults to 0 (synchronous), exposed so tests can override.
   */
  detectionDelayMs?: number;
}

export interface UseWalletCompatibilityReturn extends WalletCompatibilityMatrix {
  /** Force a re-detection pass (e.g., after user grants provider access). */
  refresh: () => void;
}

export function useWalletCompatibility(
  opts: UseWalletCompatibilityOptions = {},
): UseWalletCompatibilityReturn {
  const { detectionDelayMs = 0 } = opts;

  // Pull live wagmi state.
  const {
    address,
    isConnected,
    chainId: currentChainId,
    connector: activeConnector,
  } = useAccount();

  const connectors = useConnectors();

  // Revision counter to force refresh imperatively.
  const [revision, setRevision] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [detectionError, setDetectionError] = useState<Error | null>(null);

  // When the address / chainId / connectors list changes, mark a brief loading
  // phase so the UI can show a consistent loading state instead of a flash.
  useEffect(() => {
    if (detectionDelayMs <= 0) return;

    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
      setDetectionError(null);
    }, detectionDelayMs);

    return () => clearTimeout(timer);
  }, [address, currentChainId, connectors, detectionDelayMs, revision]);

  // Build the matrix from current state.
  const matrix = useMemo(() => {
    try {
      return buildCompatibilityMatrix({
        connectors,
        activeConnector,
        currentChainId,
        isConnected,
        isLoading,
        detectionError,
      });
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Capability detection failed');
      return buildCompatibilityMatrix({
        connectors: [],
        activeConnector: undefined,
        currentChainId: undefined,
        isConnected: false,
        isLoading: false,
        detectionError: error,
      });
    }
    // revision included so refresh() triggers a recompute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors, activeConnector, currentChainId, isConnected, isLoading, detectionError, revision]);

  const refresh = () => {
    setDetectionError(null);
    setRevision((r) => r + 1);
  };

  return { ...matrix, refresh };
}
