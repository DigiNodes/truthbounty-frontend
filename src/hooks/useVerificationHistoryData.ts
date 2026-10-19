'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { getProtocolRelease } from '@/lib/contracts/registry';
import { queryKeys } from '@/app/queries/queryKeys';
import type {
  VerificationHistoryData,
  VerificationHistoryEntry,
  VerificationSource,
  VerificationHistoryOutcome,
} from '@/components/features/verification-history/model';

// API response types
interface ApiVerificationEntry {
  id: string;
  claimId: string;
  title: string;
  outcome: VerificationHistoryOutcome;
  amount: string | null;
  decimals: number;
  asset: string;
  source: {
    kind: 'contract' | 'api-projection';
    block?: string;
    finality?: 'confirmed' | 'finalized';
    receivedAt?: number | null;
    freshness?: 'unknown' | 'stale' | 'projection-lag' | 'delayed-indexing';
  };
  submittedAt: string;
  finalizedAt?: string;
  reorgStatus: 'none' | 'detected' | 'reconciled';
  replacedBy?: string;
  freshness: {
    fetchedAt: string;
    sourceUpdatedAt?: string;
    stale: boolean;
    delayedIndexing?: boolean;
  };
}

interface ApiVerificationResponse {
  entries: ApiVerificationEntry[];
  rejectedCount: number;
  receivedAt: number | null;
}

async function fetchVerificationHistory(address: string): Promise<ApiVerificationResponse> {
  const res = await fetch(`/api/verifier/history?address=${encodeURIComponent(address)}`, {
    headers: { Accept: 'application/json' },
  });
  if (res.status === 503) {
    throw new Error('Projection temporarily unavailable (stale or rebuilding)');
  }
  if (!res.ok) {
    throw new Error(`Verification history request failed with status ${res.status}`);
  }
  return res.json();
}

function mapApiEntry(apiEntry: ApiVerificationEntry): VerificationHistoryEntry {
  const source: VerificationSource =
    apiEntry.source.kind === 'contract' && apiEntry.source.block && apiEntry.source.finality
      ? { kind: 'contract', block: apiEntry.source.block, finality: apiEntry.source.finality }
      : {
          kind: 'api-projection',
          receivedAt: apiEntry.source.receivedAt ?? null,
          freshness: apiEntry.source.freshness ?? 'unknown',
        };

  return {
    id: apiEntry.id,
    claimId: apiEntry.claimId,
    title: apiEntry.title,
    outcome: apiEntry.outcome,
    amount: apiEntry.amount !== null ? formatUnits(apiEntry.amount, apiEntry.decimals) : null,
    asset: apiEntry.asset,
    source,
    submittedAtIso: apiEntry.submittedAt,
    finalizedAtIso: apiEntry.finalizedAt,
    reorgStatus: apiEntry.reorgStatus,
    replacedBy: apiEntry.replacedBy,
    freshness: apiEntry.freshness,
  };
}

/**
 * Hook for fetching the connected verifier's verification history.
 * Returns freshness-labelled projection data; contract reads remain authoritative.
 */
export function useVerificationHistoryData() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { manifest } = getProtocolRelease();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const allowed = Boolean(isConnected && address && chainId === manifest.chainId);

  const query = useQuery({
    queryKey: queryKeys.verifications.byUser(address ?? ''),
    queryFn: async () => {
      if (!allowed || !address) throw new Error('Verification history context unavailable');
      return fetchVerificationHistory(address);
    },
    enabled: allowed && online,
    staleTime: 30_000,
    retry: 1,
  });

  const receivedAt = query.dataUpdatedAt || null;
  const entries: VerificationHistoryEntry[] = allowed
    ? (query.data?.entries ?? []).map(mapApiEntry)
    : [];

  const state: VerificationHistoryData['state'] = !allowed
    ? 'denied'
    : !online
      ? 'offline'
      : query.isPending
        ? 'loading'
        : query.isError
          ? 'error'
          : query.isStale
            ? 'stale'
            : entries.length === 0
              ? 'empty'
              : 'ready';

  return {
    data: {
      state,
      entries,
      receivedAt: allowed ? receivedAt : null,
      rejectedCount: allowed ? (query.data?.rejectedCount ?? 0) : 0,
    } satisfies VerificationHistoryData,
    refresh: () => {
      if (allowed && online) void query.refetch();
    },
    canRefresh: allowed && online && !query.isFetching,
  };
}