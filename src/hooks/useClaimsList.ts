/**
 * Canonical claims list projection hook (V2-FE-109)
 *
 * Owns all query state for the claims list: search, filters, pagination, sort.
 * Maps React Query internals to explicit view states so presentational
 * components never branch on isLoading/isFetching themselves.
 *
 * This is the single source of truth for claim list fetching in the UI.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchClaimsList } from '@/app/api/claims.api';
import { queryKeys } from '@/app/queries/queryKeys';
import type {
  ClaimsListEnvelope,
  ClaimsListError,
  ClaimsListParams,
  ClaimsListViewState,
} from '@/app/types/claim-list';
import type { ClaimStatus } from '@/app/types/claim';

const DEFAULTS = {
  pageSize: 10,
  debounceMs: 250,
  staleAfterMs: 60_000,
};

export interface UseClaimsListParams {
  initialPage?: number;
  /** Alias for `initialPage` — canonical 1-based page to start on. */
  page?: number;
  pageSize?: number;
  /** Projection age (ms) beyond which the view is reported stale. */
  staleAfterMs?: number;
}

const SUPPORTED_PARAMS: ReadonlySet<string> = new Set([
  'initialPage',
  'page',
  'pageSize',
  'staleAfterMs',
]);

/**
 * Map a query failure to the view state it must render. A stale projection is
 * still renderable (flagged stale); everything else fails closed to `error`.
 */
export function classifyClaimsListError(error: unknown): ClaimsListViewState {
  const code = (error as { code?: string } | null | undefined)?.code;
  if (code === 'PROJECTION_STALE') return 'ready-stale';
  return 'error';
}

export interface UseClaimsListResult {
  // View state
  viewState: ClaimsListViewState;
  envelope: ClaimsListEnvelope | undefined;
  error: ClaimsListError | null;

  // Search & filters
  search: string;
  setSearch: (value: string) => void;
  statusFilter: ClaimStatus | undefined;
  setStatusFilter: (status: ClaimStatus | undefined) => void;
  highImpactFilter: boolean;
  setHighImpactFilter: (value: boolean) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;

  // Pagination
  page: number;
  setPage: (page: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  goNext: () => void;
  goPrevious: () => void;

  // Actions
  refetch: () => void;
}

function deriveViewState(
  isPending: boolean,
  isError: boolean,
  envelope: ClaimsListEnvelope | undefined,
  error: ClaimsListError | null,
  staleAfterMs: number,
): ClaimsListViewState {
  if (isPending && !envelope) return 'loading';
  if (isError) return envelope ? 'ready-stale' : classifyClaimsListError(error);
  if (!envelope) return 'empty';
  if (envelope.projection.freshness === 'stale' || envelope.projection.freshness === 'degraded') {
    return 'ready-stale';
  }
  // A projection generated longer ago than the freshness window is stale,
  // even when the API did not mark it so.
  const generatedMs = Date.parse(envelope.projection.generatedAt);
  if (Number.isFinite(generatedMs) && Date.now() - generatedMs > staleAfterMs) {
    return 'ready-stale';
  }
  if (envelope.items.length === 0) return 'empty';
  return 'ready';
}

export function useClaimsList(params: UseClaimsListParams = {}): UseClaimsListResult {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | undefined>(undefined);
  const [highImpactFilter, setHighImpactFilter] = useState(false);
  const [page, setPage] = useState(params.initialPage ?? params.page ?? 1);

  // Unsupported parameters are rejected rather than silently ignored: an
  // unrecognised filter shape must never reach the wire.
  const paramsValid = Object.keys(params).every((key) => SUPPORTED_PARAMS.has(key));
  const staleAfterMs = params.staleAfterMs ?? DEFAULTS.staleAfterMs;

  const debouncedSearch = useDebounce(search, DEFAULTS.debounceMs);

  const queryParams: ClaimsListParams = useMemo(
    () => ({
      search: debouncedSearch,
      filters: {
        status: statusFilter,
        highImpact: highImpactFilter || undefined,
      },
      pagination: {
        page,
        pageSize: params.pageSize ?? DEFAULTS.pageSize,
      },
      sort: {
        field: 'createdAt',
        direction: 'desc',
      },
    }),
    [debouncedSearch, statusFilter, highImpactFilter, page, params.pageSize]
  );

  const queryResult = useQuery<ClaimsListEnvelope, ClaimsListError>({
    // Spread into a fresh object literal so the canonical params object is
    // assignable to the legacy filter key shape.
    queryKey: queryKeys.claims.list({ ...queryParams }),
    queryFn: ({ signal }) => fetchClaimsList(queryParams, signal),
    enabled: paramsValid,
    retry: false,
    staleTime: staleAfterMs,
    // Changing search/filter/page starts a new query. Keep the previous
    // projection visible until the next one resolves so the table does not
    // collapse into a skeleton (losing focus and filter state) on every
    // keystroke or chip toggle.
    placeholderData: keepPreviousData,
  });

  const viewState = deriveViewState(
    queryResult.isPending,
    queryResult.isError,
    queryResult.data,
    queryResult.error ?? null,
    staleAfterMs,
  );

  const hasActiveFilters =
    search.trim().length > 0 || statusFilter !== undefined || highImpactFilter;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter(undefined);
    setHighImpactFilter(false);
    setPage(1);
  };

  const totalPages = queryResult.data?.pagination.totalPages ?? 1;
  const canGoNext = page < totalPages;
  const canGoPrevious = page > 1;

  const goNext = () => {
    if (canGoNext) setPage(page + 1);
  };

  const goPrevious = () => {
    if (canGoPrevious) setPage(page - 1);
  };

  return {
    viewState,
    envelope: queryResult.data,
    error: queryResult.error ?? null,

    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    highImpactFilter,
    setHighImpactFilter,
    clearFilters,
    hasActiveFilters,

    page,
    setPage,
    canGoNext,
    canGoPrevious,
    goNext,
    goPrevious,

    refetch: () => void queryResult.refetch(),
  };
}
