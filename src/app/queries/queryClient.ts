// src/app/queries/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 mins
      gcTime: 1000 * 60 * 30, // 30 mins
      refetchOnWindowFocus: false,
      retry: 2,
    },
    mutations: {
      onError: (error) => console.error('Mutation error:', error),
    },
  },
});
