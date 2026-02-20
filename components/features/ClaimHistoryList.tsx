'use client';

import { useState } from 'react';
import { useUserClaims, useUserClaimsInfinite } from '@/lib/api/claims';
import { ClaimCard } from './ClaimCard';
import { Button } from '@/components/ui/Button';

interface ClaimHistoryListProps {
  userAddress: string;
  useInfiniteScroll?: boolean;
}

export function ClaimHistoryList({ userAddress, useInfiniteScroll = true }: ClaimHistoryListProps) {
  const [page, setPage] = useState(1);
  
  const {
    data: paginatedData,
    isLoading: isLoadingPaginated,
    error: errorPaginated,
  } = useUserClaims(userAddress, page, 10);

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingInfinite,
    error: errorInfinite,
  } = useUserClaimsInfinite(userAddress, 10);

  const isLoading = useInfiniteScroll ? isLoadingInfinite : isLoadingPaginated;
  const error = useInfiniteScroll ? errorInfinite : errorPaginated;
  
  const claims = useInfiniteScroll 
    ? infiniteData?.pages.flatMap(page => page.claims) || []
    : paginatedData?.claims || [];

  const totalPages = paginatedData ? Math.ceil(paginatedData.total / paginatedData.pageSize) : 0;

  if (isLoading && claims.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6 mb-4"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load claims. Please try again.</p>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No claims found for this user.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <ClaimCard key={claim.id} claim={claim} />
      ))}
      
      {useInfiniteScroll ? (
        hasNextPage && (
          <div className="text-center pt-4">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )
      ) : (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
