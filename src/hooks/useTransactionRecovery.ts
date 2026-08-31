import { useMemo } from 'react';

export type TransactionRecoveryState =
  | 'idle'
  | 'pending'
  | 'replaced'
  | 'dropped'
  | 'repriced'
  | 'wrong-network';

export interface PersistedTransactionEntry {
  id: string;
  hash?: string;
  status?: string;
  chainId?: number;
}

export interface UseTransactionRecoveryOptions {
  txHash?: string;
  chainId?: number;
  status?: string;
  replacementHash?: string;
  persistedEntries?: PersistedTransactionEntry[];
}

const APPROVED_CHAIN_IDS = new Set([10, 11155420]);

export function useTransactionRecovery(options: UseTransactionRecoveryOptions = {}) {
  return useMemo(() => {
    const { txHash, chainId, status, replacementHash, persistedEntries = [] } = options;

    if (!txHash && !status && persistedEntries.length === 0) {
      return {
        state: 'idle' as TransactionRecoveryState,
        replacementHash: undefined,
        isPending: false,
        isWrongNetwork: false,
        isProtocolDisabled: false,
        shouldDuplicateSubmit: false,
      };
    }

    const currentChainId = typeof chainId === 'number' ? chainId : undefined;
    const isWrongNetwork = typeof currentChainId === 'number' && !APPROVED_CHAIN_IDS.has(currentChainId);

    if (isWrongNetwork) {
      return {
        state: 'wrong-network' as TransactionRecoveryState,
        replacementHash,
        isPending: false,
        isWrongNetwork: true,
        isProtocolDisabled: true,
        shouldDuplicateSubmit: true,
      };
    }

    const normalizedStatus = (status ?? '').toLowerCase();
    const hasPersistedEntry = persistedEntries.some(
      (entry) => (txHash ? entry.hash === txHash : false) || (entry.status ?? '').toLowerCase() === normalizedStatus,
    );

    if (normalizedStatus === 'replaced' || replacementHash) {
      return {
        state: 'replaced' as TransactionRecoveryState,
        replacementHash: replacementHash ?? persistedEntries.find((entry) => entry.hash !== txHash)?.hash,
        isPending: false,
        isWrongNetwork: false,
        isProtocolDisabled: false,
        shouldDuplicateSubmit: false,
      };
    }

    if (normalizedStatus === 'dropped' || (txHash && hasPersistedEntry && normalizedStatus === 'pending')) {
      return {
        state: 'dropped' as TransactionRecoveryState,
        replacementHash,
        isPending: false,
        isWrongNetwork: false,
        isProtocolDisabled: true,
        shouldDuplicateSubmit: true,
      };
    }

    if (normalizedStatus === 'repriced') {
      return {
        state: 'repriced' as TransactionRecoveryState,
        replacementHash,
        isPending: true,
        isWrongNetwork: false,
        isProtocolDisabled: false,
        shouldDuplicateSubmit: false,
      };
    }

    if (normalizedStatus === 'pending') {
      return {
        state: 'pending' as TransactionRecoveryState,
        replacementHash,
        isPending: true,
        isWrongNetwork: false,
        isProtocolDisabled: false,
        shouldDuplicateSubmit: false,
      };
    }

    return {
      state: 'idle' as TransactionRecoveryState,
      replacementHash,
      isPending: false,
      isWrongNetwork: false,
      isProtocolDisabled: false,
      shouldDuplicateSubmit: false,
    };
  }, [options]);
}
