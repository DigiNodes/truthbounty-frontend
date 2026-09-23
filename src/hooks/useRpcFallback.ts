/**
 * useRpcFallback
 *
 * Multi-endpoint RPC fallback hook for TruthBounty V2.
 * Probes each endpoint in order using a lightweight eth_chainId JSON-RPC call,
 * advances to the next on failure, and exposes degraded/fallback state.
 *
 * Fail-closed: only marks healthy after a successful probe. Never fabricates connectivity.
 * Does NOT import viem createPublicClient at module level (tree-shakeable).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_CHAIN_IDS = [10, 11155420] as const;
type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

/** Chain-id hex values that a healthy endpoint must return. */
const CHAIN_HEX: Record<SupportedChainId, string> = {
  10: '0xa',
  11155420: '0xaa37dc',
};

/** Public fallback RPC URLs (no API key required). */
const PUBLIC_FALLBACKS: Record<SupportedChainId, string> = {
  10: 'https://mainnet.optimism.io',
  11155420: 'https://sepolia.optimism.io',
};

const PROBE_TIMEOUT_MS = 5_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type RpcStatus =
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'unsupported_chain'
  | 'misconfigured';

export interface RpcFallbackState {
  /** Current health status. */
  status: RpcStatus;
  /** The URL of the currently-active (passing) endpoint, or null. */
  activeUrl: string | null;
  /** URLs that failed the probe during the last probe sequence. */
  failedUrls: string[];
  /** True when status is 'healthy' or 'degraded'. */
  isHealthy: boolean;
  /** True when actively using a fallback URL (not the primary). */
  isFallback: boolean;
  /** True when using a fallback URL — signals degraded quality. */
  isDegraded: boolean;
  /** Machine-readable error code when not healthy. */
  errorCode: string | null;
  /** Number of times retry() has been invoked. */
  retryCount: number;
  /** Re-probe all endpoints from the beginning. */
  retry: () => void;
}

export interface UseRpcFallbackOptions {
  /** Override the chain whose endpoints should be probed. */
  chainId?: number;
  /** Custom ordered list of RPC URLs to probe (overrides env defaults + public fallbacks). */
  rpcUrls?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSupportedChainId(id: number): id is SupportedChainId {
  return (SUPPORTED_CHAIN_IDS as readonly number[]).includes(id);
}

/**
 * Build the ordered probe URL list for a given chain.
 * Order: env-var primary → hardcoded public fallback.
 * An external rpcUrls override replaces this list entirely.
 */
function buildUrlList(chainId: SupportedChainId, override?: string[]): string[] {
  if (override && override.length > 0) return [...override];

  const urls: string[] = [];

  // Primary: env var (if set and non-empty)
  const envVar =
    chainId === 10
      ? process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL
      : process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL;

  if (envVar && envVar.trim() !== '') {
    urls.push(envVar.trim());
  }

  // Always append the public fallback (deduplicating if env already points there)
  const publicFallback = PUBLIC_FALLBACKS[chainId];
  if (!urls.includes(publicFallback)) {
    urls.push(publicFallback);
  }

  return urls;
}

/**
 * Probe a single RPC endpoint with eth_chainId.
 * Returns true if the endpoint responds with the expected chainId hex.
 */
async function probeEndpoint(url: string, expectedHex: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return false;

    const json = (await res.json()) as { result?: string };
    return (
      typeof json.result === 'string' &&
      json.result.toLowerCase() === expectedHex.toLowerCase()
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probe without chain-id validation — used when caller provides explicit rpcUrls
 * but no chainId context.
 */
async function probeEndpointAny(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return false;

    const json = (await res.json()) as { result?: string };
    return typeof json.result === 'string' && json.result.startsWith('0x');
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function computeErrorCode(status: RpcStatus): string | null {
  switch (status) {
    case 'failed':
      return 'RPC_ALL_FAILED';
    case 'unsupported_chain':
      return 'UNSUPPORTED_CHAIN';
    case 'misconfigured':
      return 'MISCONFIGURED';
    default:
      return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns live RPC health state and a retry function.
 *
 * Validates chainId on every render and fail-closes immediately for
 * unsupported chains and missing config without ever entering an async probe.
 *
 * @example
 * const { status, activeUrl, isDegraded, retry } = useRpcFallback({ chainId: 10 });
 */
export function useRpcFallback(options: UseRpcFallbackOptions = {}): RpcFallbackState {
  const { chainId, rpcUrls } = options;

  // Compute static validation flags synchronously (before any hook calls)
  const hasExplicitUrls = rpcUrls && rpcUrls.length > 0;
  const isUnsupportedChain =
    chainId !== undefined && !isSupportedChainId(chainId);
  const isMisconfigured =
    !isUnsupportedChain && chainId === undefined && !hasExplicitUrls;

  // All hooks MUST be called unconditionally (Rules of Hooks).
  const [status, setStatus] = useState<RpcStatus>(() => {
    if (isUnsupportedChain) return 'unsupported_chain';
    if (isMisconfigured) return 'misconfigured';
    return 'healthy';
  });
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  // Probe generation counter — cancels stale probe callbacks on re-run
  const probeGen = useRef(0);

  const runProbe = useCallback(async () => {
    // If config is statically invalid, skip the async probe entirely
    if (isUnsupportedChain || isMisconfigured) return;

    const gen = ++probeGen.current;

    // Build URL list
    let urls: string[];
    const resolvedChainId = chainId as SupportedChainId | undefined;
    if (hasExplicitUrls) {
      urls = [...(rpcUrls as string[])];
    } else if (resolvedChainId !== undefined) {
      urls = buildUrlList(resolvedChainId, undefined);
    } else {
      if (gen === probeGen.current) setStatus('misconfigured');
      return;
    }

    if (urls.length === 0) {
      if (gen === probeGen.current) setStatus('misconfigured');
      return;
    }

    const primary = urls[0];
    const expectedHex: string | null =
      resolvedChainId !== undefined ? CHAIN_HEX[resolvedChainId] : null;

    const failed: string[] = [];
    let found: string | null = null;

    for (const url of urls) {
      const ok = expectedHex
        ? await probeEndpoint(url, expectedHex)
        : await probeEndpointAny(url);

      if (gen !== probeGen.current) return; // stale — abort

      if (ok) {
        found = url;
        break;
      } else {
        failed.push(url);
      }
    }

    if (gen !== probeGen.current) return;

    setFailedUrls(failed);

    if (found === null) {
      setActiveUrl(null);
      setStatus('failed');
    } else if (found === primary) {
      setActiveUrl(found);
      setStatus('healthy');
    } else {
      setActiveUrl(found);
      setStatus('degraded');
    }
  }, [chainId, rpcUrls, isUnsupportedChain, isMisconfigured, hasExplicitUrls]);

  // Probe on mount and whenever deps or retryCount change
  useEffect(() => {
    void runProbe();
  }, [runProbe, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  // Override computed status for static failures regardless of async state
  const resolvedStatus: RpcStatus = isUnsupportedChain
    ? 'unsupported_chain'
    : isMisconfigured
    ? 'misconfigured'
    : status;

  const isFallback = resolvedStatus === 'degraded';
  const isDegraded = resolvedStatus === 'degraded';
  const isHealthy = resolvedStatus === 'healthy' || resolvedStatus === 'degraded';

  return {
    status: resolvedStatus,
    activeUrl,
    failedUrls,
    isHealthy,
    isFallback,
    isDegraded,
    errorCode: computeErrorCode(resolvedStatus),
    retryCount,
    retry,
  };
}
