/**
 * useWallet — canonical EVM wallet lifecycle hook for TruthBounty.
 *
 * Provides:
 *  - connect / reconnect / disconnect
 *  - account-change tracking
 *  - connector-error state
 *  - hydration-safe connected state (no phantom flash in Next.js SSR)
 *  - minimal preference persistence (connector id only — no keys/addresses)
 *
 * All on-chain data (balances, verdicts, rewards) must come from
 * the contract registry or indexed API — never fabricated here.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useConnectors,
  type Connector,
} from 'wagmi';
import { useIsMounted } from '@/hooks/useIsMounted';

// ── Preference persistence ───────────────────────────────────────────────────
// Only the connector id (e.g. "injected", "walletConnect") is stored.
// Addresses, balances, or private keys are never written to storage.
const PREF_KEY = 'truthbounty:wallet:connector';

function readConnectorPref(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}

function writeConnectorPref(connectorId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREF_KEY, connectorId);
  } catch {
    // storage unavailable — silently skip
  }
}

function clearConnectorPref(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PREF_KEY);
  } catch {
    // storage unavailable — silently skip
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export type WalletLifecycleState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface WalletLifecycle {
  /** Hydration-safe: always false on the first SSR render. */
  isConnected: boolean;
  /** True while a connection attempt or reconnect is in flight. */
  isPending: boolean;
  /** Wallet address of the active account (undefined when disconnected). */
  address: `0x${string}` | undefined;
  /** Chain id reported by the connected wallet. */
  chainId: number | undefined;
  /** Last error from the connector layer (connect rejection, wrong network, etc.). */
  connectorError: Error | null;
  /** The connector that is currently active. */
  activeConnector: Connector | undefined;
  /** All available connectors (injected, WalletConnect, Coinbase…). */
  connectors: readonly Connector[];
  /** Fine-grained lifecycle label. */
  state: WalletLifecycleState;
  /** Connect using a specific connector. */
  connect: (connector: Connector) => void;
  /** Reconnect using the persisted connector preference. */
  reconnect: () => void;
  /** Disconnect and clear preferences. */
  disconnect: () => void;
  /** Clear the connector error without disconnecting. */
  clearError: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet(): WalletLifecycle {
  const mounted = useIsMounted();

  // wagmi primitives
  const {
    address,
    isConnected: wagmiConnected,
    isConnecting,
    isReconnecting,
    chainId,
    connector: activeConnector,
  } = useAccount();

  const { connect: wagmiConnect, isPending: connectPending } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const connectors = useConnectors();

  // Local error state — wagmi surfaces errors through event callbacks
  const [connectorError, setConnectorError] = useState<Error | null>(null);

  // Track previous address to detect account-change events
  const prevAddressRef = useRef<`0x${string}` | undefined>(undefined);

  // ── Hydration guard ────────────────────────────────────────────────────────
  // Before the component mounts on the client we report as disconnected to
  // prevent a phantom-connected flash that mismatches SSR.
  const isConnected = mounted && wagmiConnected;

  // ── Account-change detection ───────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    const prev = prevAddressRef.current;
    if (prev !== undefined && address !== undefined && prev !== address) {
      // Account switched — clear any stale error
      setConnectorError(null);
    }
    prevAddressRef.current = address;
  }, [address, mounted]);

  // ── Connector preference persistence ──────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    if (isConnected && activeConnector?.id) {
      writeConnectorPref(activeConnector.id);
    }
  }, [isConnected, activeConnector?.id, mounted]);

  // ── Reconnect on mount using persisted preference ─────────────────────────
  // wagmi's autoConnect handles most reconnect cases, but if the user has
  // a stored preference we can eagerly select the right connector.
  const reconnect = useCallback(() => {
    const savedId = readConnectorPref();
    if (!savedId) return;
    const target = connectors.find((c) => c.id === savedId);
    if (!target) return;
    setConnectorError(null);
    wagmiConnect(
      { connector: target },
      {
        onError(err) {
          setConnectorError(err instanceof Error ? err : new Error(String(err)));
        },
      },
    );
  }, [connectors, wagmiConnect]);

  // ── Connect ────────────────────────────────────────────────────────────────
  const connect = useCallback(
    (connector: Connector) => {
      setConnectorError(null);
      wagmiConnect(
        { connector },
        {
          onError(err) {
            setConnectorError(err instanceof Error ? err : new Error(String(err)));
          },
        },
      );
    },
    [wagmiConnect],
  );

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    clearConnectorPref();
    setConnectorError(null);
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  // ── clearError ─────────────────────────────────────────────────────────────
  const clearError = useCallback(() => setConnectorError(null), []);

  // ── Lifecycle state label ──────────────────────────────────────────────────
  const state = useMemo((): WalletLifecycleState => {
    if (!mounted) return 'disconnected';
    if (connectorError) return 'error';
    if (isConnecting || connectPending) return 'connecting';
    if (isReconnecting) return 'reconnecting';
    if (isConnected) return 'connected';
    return 'disconnected';
  }, [mounted, connectorError, isConnecting, connectPending, isReconnecting, isConnected]);

  return {
    isConnected,
    isPending: isConnecting || connectPending || isReconnecting,
    address: isConnected ? address : undefined,
    chainId: isConnected ? chainId : undefined,
    connectorError,
    activeConnector: isConnected ? activeConnector : undefined,
    connectors,
    state,
    connect,
    reconnect,
    disconnect,
    clearError,
  };
}
