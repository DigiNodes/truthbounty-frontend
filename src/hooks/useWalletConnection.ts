'use client';

import * as React from 'react';
import { useConnect, useDisconnect, useReconnect } from 'wagmi';

const { useCallback, useEffect, useMemo, useState } = React;

import { type AccountInfo, useAccount } from './useAccount';

export const WALLET_PREFERENCE_STORAGE_KEY = 'tb-wallet-pref-v1';

export interface WalletPreference {
  connectorId?: string;
  chainId?: number;
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readWalletPreference(storage?: StorageLike | null): WalletPreference | null {
  if (!storage || typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = storage.getItem(WALLET_PREFERENCE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<WalletPreference>;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const connectorId = typeof parsed.connectorId === 'string' ? parsed.connectorId : undefined;
    const chainId = typeof parsed.chainId === 'number' ? parsed.chainId : undefined;

    if (!connectorId && typeof chainId !== 'number') {
      return null;
    }

    return { connectorId, chainId };
  } catch {
    return null;
  }
}

export function writeWalletPreference(
  preference: Partial<WalletPreference> | null,
  storage?: StorageLike | null,
): void {
  if (!storage || typeof window === 'undefined') {
    return;
  }

  if (!preference || (!preference.connectorId && typeof preference.chainId !== 'number')) {
    storage.removeItem(WALLET_PREFERENCE_STORAGE_KEY);
    return;
  }

  const next: WalletPreference = {
    connectorId: typeof preference.connectorId === 'string' ? preference.connectorId : undefined,
    chainId: typeof preference.chainId === 'number' ? preference.chainId : undefined,
  };

  storage.setItem(WALLET_PREFERENCE_STORAGE_KEY, JSON.stringify(next));
}

export interface UseWalletConnectionOptions {
  storage?: StorageLike | null;
}

export interface UseWalletConnectionReturn {
  address?: string;
  displayName: string | null;
  chainId?: number;
  isConnected: boolean;
  status: AccountInfo['status'];
  isReconnecting: boolean;
  isHydrated: boolean;
  connectorId?: string;
  connectorName?: string;
  connectorError: Error | null;
  connect: ReturnType<typeof useConnect>['connect'];
  reconnect: ReturnType<typeof useReconnect>['reconnect'];
  disconnect: ReturnType<typeof useDisconnect>['disconnect'];
  connectors: ReturnType<typeof useConnect>['connectors'];
  isPending: boolean;
  persistPreference: (connectorId?: string, chainId?: number) => void;
}

export function useWalletConnection(options: UseWalletConnectionOptions = {}): UseWalletConnectionReturn {
  const account = useAccount();
  const { connect, connectors, error: connectorError, isPending: isConnecting } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();
  const { reconnect, isPending: isReconnecting } = useReconnect();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const storage = options.storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  const preference = useMemo(() => readWalletPreference(storage), [storage]);

  const persistPreference = useCallback((connectorId?: string, chainId?: number) => {
    writeWalletPreference(
      {
        connectorId: connectorId ?? preference?.connectorId,
        chainId: typeof chainId === 'number' ? chainId : preference?.chainId,
      },
      storage,
    );
  }, [preference?.chainId, preference?.connectorId, storage]);

  useEffect(() => {
    if (account?.connectorId) {
      persistPreference(account.connectorId, account.chainId);
    }
  }, [account?.chainId, account?.connectorId, persistPreference]);

  return {
    address: account?.address,
    displayName: account?.displayName ?? null,
    chainId: account?.chainId,
    isConnected: Boolean(account?.isConnected),
    status: account?.status ?? 'disconnected',
    isReconnecting: Boolean(account?.isReconnecting || isReconnecting),
    isHydrated,
    connectorId: account?.connectorId ?? preference?.connectorId,
    connectorName: account?.connectorName ?? preference?.connectorId,
    connectorError: connectorError ?? null,
    connect,
    reconnect,
    disconnect,
    connectors,
    isPending: isConnecting || isDisconnecting || isReconnecting,
    persistPreference,
  };
}
