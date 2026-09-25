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
    // Storage can be unavailable in privacy-restricted environments.
  }
}

function clearConnectorPref(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PREF_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted environments.
  }
}

export type WalletLifecycleState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface WalletLifecycle {
  isConnected: boolean;
  isPending: boolean;
  address: `0x${string}` | undefined;
  chainId: number | undefined;
  connectorError: Error | null;
  activeConnector: Connector | undefined;
  connectors: readonly Connector[];
  state: WalletLifecycleState;
  connect: (connector: Connector) => void;
  reconnect: () => void;
  disconnect: () => void;
  clearError: () => void;
}

export function useWallet(): WalletLifecycle {
  const mounted = useIsMounted();
  const {
    address,
    isConnected: wagmiConnected,
    isConnecting,
    isReconnecting,
    chainId,
    connector: activeConnector,
  } = useAccount();

  const { connect: wagmiConnect } = useConnect();
  const { connect: wagmiConnect, isPending: connectPending } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const connectors = useConnectors();
  const [connectorError, setConnectorError] = useState<Error | null>(null);
  // True only while a user-initiated connect() is in flight. wagmi's own
  // `isConnecting`/`connectPending` flags also fire during its automatic
  // reconnect pass, which would otherwise surface a phantom "connecting"
  // state right after mount.
  const [userConnecting, setUserConnecting] = useState(false);

  // Track previous address to detect account-change events
  const prevAddressRef = useRef<`0x${string}` | undefined>(undefined);

  // ── Hydration guard ────────────────────────────────────────────────────────
  // Before the component mounts on the client we report as disconnected to
  // prevent a phantom-connected flash that mismatches SSR.
  const isConnected = mounted && wagmiConnected;

  // wagmi can briefly report a connected account before its chain id lands in
  // the store; fall back to the connector's default chain so callers always
  // see a concrete chain id while connected.
  const connectorChains = (
    activeConnector as { chains?: readonly { id: number }[] } | undefined
  )?.chains;
  const effectiveChainId =
    chainId ?? connectorChains?.[0]?.id ?? undefined;

  // ── Account-change detection ───────────────────────────────────────────────
  const previousAddress = useRef<`0x${string}` | undefined>(undefined);
  const isConnected = mounted && wagmiConnected;

  useEffect(() => {
    if (!mounted) return;
    if (
      previousAddress.current !== undefined &&
      address !== undefined &&
      previousAddress.current !== address
    ) {
      setConnectorError(null);
    }
    previousAddress.current = address;
  }, [address, mounted]);

  useEffect(() => {
    if (mounted && isConnected && activeConnector?.id) {
      writeConnectorPref(activeConnector.id);
    }
  }, [isConnected, activeConnector?.id, mounted]);

  const connectWith = useCallback(
    (connector: Connector) => {
      setConnectorError(null);
      setUserConnecting(true);
      wagmiConnect(
        { connector },
        {
          onSuccess() {
            setUserConnecting(false);
          },
          onError(err) {
            setUserConnecting(false);
            setConnectorError(err instanceof Error ? err : new Error(String(err)));
          onError(error) {
            setConnectorError(
              error instanceof Error ? error : new Error(String(error)),
            );
          },
        },
      );
    },
    [wagmiConnect],
  );

  const reconnect = useCallback(() => {
    const connectorId = readConnectorPref();
    const connector = connectors.find(({ id }) => id === connectorId);
    if (connector) connectWith(connector);
  }, [connectors, connectWith]);

  const disconnect = useCallback(() => {
    clearConnectorPref();
    setConnectorError(null);
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  const clearError = useCallback(() => setConnectorError(null), []);

  // ── Lifecycle state label ──────────────────────────────────────────────────
  // wagmi reports `isConnecting`/`isPending` during its automatic reconnect
  // pass even when there is nothing to reconnect to, so only a user-initiated
  // pending connect is surfaced as "connecting".
  const state = useMemo((): WalletLifecycleState => {
    if (connectorError) return 'error';
    if (userConnecting) return 'connecting';
    if (isConnected) return 'connected';
    return 'disconnected';
  }, [connectorError, userConnecting, isConnected]);
  }, [
    mounted,
    connectorError,
    isConnecting,
    connectPending,
    isReconnecting,
    isConnected,
  ]);

  return {
    isConnected,
    isPending: isConnecting || isReconnecting,
    address: isConnected ? address : undefined,
    chainId: isConnected ? effectiveChainId : undefined,
    connectorError,
    activeConnector: isConnected ? activeConnector : undefined,
    connectors,
    state,
    connect: connectWith,
    reconnect,
    disconnect,
    clearError,
  };
}
