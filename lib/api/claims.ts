import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Claim, UserClaimsResponse } from '@/types/claim';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ClaimsResponse {
  data: Claim[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNextPage: boolean;
  };
}

export const useUserClaims = (address: string, page = 1, pageSize = 10) => {
  return useQuery({
    queryKey: ['userClaims', address, page, pageSize],
    queryFn: async (): Promise<UserClaimsResponse> => {
      const response = await fetch(
        `${API_BASE_URL}/users/${address}/claims?page=${page}&pageSize=${pageSize}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch user claims');
      }
      
      const data: ClaimsResponse = await response.json();
      
      return {
        claims: data.data,
        total: data.pagination.total,
        page: data.pagination.page,
        pageSize: data.pagination.pageSize,
      };
    },
    enabled: !!address,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useUserClaimsInfinite = (address: string, pageSize = 10) => {
  return useInfiniteQuery({
    queryKey: ['userClaimsInfinite', address, pageSize],
    queryFn: async ({ pageParam = 1 }): Promise<UserClaimsResponse> => {
      const response = await fetch(
        `${API_BASE_URL}/users/${address}/claims?page=${pageParam}&pageSize=${pageSize}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch user claims');
      }
      
      const data: ClaimsResponse = await response.json();
      
      return {
        claims: data.data,
        total: data.pagination.total,
        page: data.pagination.page,
        pageSize: data.pagination.pageSize,
      };
    },
    enabled: !!address,
    getNextPageParam: (lastPage) => {
      if (lastPage.page * lastPage.pageSize < lastPage.total) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 60 * 1000,
  });
};
