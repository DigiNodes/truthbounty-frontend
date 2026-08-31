import { useCallback, useMemo } from 'react';

export const OPTIMISM_MAINNET_CHAIN_ID = 10;
export const OPTIMISM_SEPOLIA_CHAIN_ID = 11155420;

export type ApprovedOptimismChainId =
  | typeof OPTIMISM_MAINNET_CHAIN_ID
  | typeof OPTIMISM_SEPOLIA_CHAIN_ID;

export type WalletNetworkAction = 'none' | 'switch' | 'add' | 'unsupported';

export interface WalletNetworkDefinition {
  chainId: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls?: string[];
  blockExplorers?: Array<{
    name: string;
    url: string;
  }>;
}

export const APPROVED_OPTIMISM_ENVIRONMENTS: Record<string, WalletNetworkDefinition> = {
  optimism: {
    chainId: OPTIMISM_MAINNET_CHAIN_ID,
    name: 'OP Mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://mainnet.optimism.io'],
    blockExplorers: [
      {
        name: 'Etherscan',
        url: 'https://optimistic.etherscan.io',
      },
    ],
  },
  'optimism-sepolia': {
    chainId: OPTIMISM_SEPOLIA_CHAIN_ID,
    name: 'OP Sepolia',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.optimism.io'],
    blockExplorers: [
      {
        name: 'Etherscan',
        url: 'https://sepolia-optimism.etherscan.io',
      },
    ],
  },
};

export const SUPPORTED_OPTIMISM_CHAIN_IDS = Object.values(APPROVED_OPTIMISM_ENVIRONMENTS).map(
  (chain) => chain.chainId,
);

export type WalletNetworkSwitchRequest = {
  chainId: number;
};

const CHAIN_SCOPED_STORAGE_KEYS = [
  'truthbounty-chain-cache',
  'truthbounty:chain',
  'truthbounty:wallet:network',
];

/**
 * Remove chain-scoped caches from storage.
 * Safe to call on the server (no-op).
 */
export function clearChainScopedStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  for (const key of CHAIN_SCOPED_STORAGE_KEYS) {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  }
}

export interface UseWalletNetworkOptions {
  chainId?: number;
  isConnected?: boolean;
  switchChain?: ((request: WalletNetworkSwitchRequest) => Promise<unknown> | unknown) | null;
  addChain?: ((chain: WalletNetworkDefinition) => Promise<unknown> | unknown) | null;
  clearCache?: (() => void) | null;
  supportedChainIds?: readonly number[];
}

export function getPreferredOptimismChainId(chainIds: readonly number[] = SUPPORTED_OPTIMISM_CHAIN_IDS) {
  if (chainIds.length === 0) {
    return OPTIMISM_MAINNET_CHAIN_ID;
  }

  return chainIds.includes(OPTIMISM_MAINNET_CHAIN_ID)
    ? OPTIMISM_MAINNET_CHAIN_ID
    : chainIds[0];
}

export function getNetworkDefinition(chainId: number): WalletNetworkDefinition | undefined {
  return Object.values(APPROVED_OPTIMISM_ENVIRONMENTS).find(
    (chain) => chain.chainId === chainId,
  );
}

export function useWalletNetwork(options: UseWalletNetworkOptions = {}) {
  const supportedChainIds = useMemo(
    () => options.supportedChainIds ?? SUPPORTED_OPTIMISM_CHAIN_IDS,
    [options.supportedChainIds],
  );
  const preferredChainId = getPreferredOptimismChainId(supportedChainIds);
  const isConnected = options.isConnected ?? false;
  const currentChainId = typeof options.chainId === 'number' ? options.chainId : undefined;
  const isSupported =
    typeof currentChainId === 'number' && supportedChainIds.includes(currentChainId);
  const isUnsupported = isConnected && typeof currentChainId === 'number' && !isSupported;
  const isWrongNetwork = isUnsupported;
  const isProtocolDisabled = !isConnected || isUnsupported;
  const safeAction: WalletNetworkAction = isUnsupported
    ? options.switchChain
      ? 'switch'
      : options.addChain
        ? 'add'
        : 'unsupported'
    : 'none';

  const clearChainScopedCaches = useCallback(() => {
    if (typeof options.clearCache === 'function') {
      options.clearCache();
      return;
    }

    clearChainScopedStorage();
  }, [options.clearCache]);

  const switchToSupportedNetwork = useCallback(async () => {
    if (!isConnected || !supportedChainIds.length) {
      return undefined;
    }

    if (typeof options.switchChain !== 'function') {
      throw new Error('Wallet connector does not support switching chains.');
    }

    const targetChainId = preferredChainId;
    const result = await options.switchChain({ chainId: targetChainId });
    clearChainScopedCaches();
    return result;
  }, [clearChainScopedCaches, isConnected, options.switchChain, preferredChainId, supportedChainIds.length]);

  const addSupportedNetwork = useCallback(async () => {
    if (!isConnected || !supportedChainIds.length) {
      return undefined;
    }

    if (typeof options.addChain !== 'function') {
      throw new Error('Wallet connector does not support adding a chain.');
    }

    const targetChainId = supportedChainIds.includes(OPTIMISM_SEPOLIA_CHAIN_ID)
      ? OPTIMISM_SEPOLIA_CHAIN_ID
      : preferredChainId;
    const targetChain = getNetworkDefinition(targetChainId) ?? {
      chainId: targetChainId,
      name: 'Optimism',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    };

    const result = await options.addChain(targetChain);
    clearChainScopedCaches();
    return result;
  }, [clearChainScopedCaches, isConnected, options.addChain, preferredChainId, supportedChainIds]);

  return {
    supportedChainIds,
    preferredChainId,
    currentChainId,
    isConnected,
    isSupported,
    isUnsupported,
    isWrongNetwork,
    isProtocolDisabled,
    action: safeAction,
    clearChainScopedCaches,
    switchToSupportedNetwork,
    addSupportedNetwork,
  };
}
