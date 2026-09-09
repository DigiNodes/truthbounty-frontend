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
  const { connect: wagmiConnect, isPending: connectPending } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const connectors = useConnectors();
  const [connectorError, setConnectorError] = useState<Error | null>(null);
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
      wagmiConnect(
        { connector },
        {
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

  const state = useMemo((): WalletLifecycleState => {
    if (!mounted) return 'disconnected';
    if (connectorError) return 'error';
    if (isConnecting || connectPending) return 'connecting';
    if (isReconnecting) return 'reconnecting';
    if (isConnected) return 'connected';
    return 'disconnected';
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
    isPending: isConnecting || connectPending || isReconnecting,
    address: isConnected ? address : undefined,
    chainId: isConnected ? chainId : undefined,
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
