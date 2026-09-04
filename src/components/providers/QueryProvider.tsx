// src/components/providers/QueryProvider.tsx

'use client';

import React, { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAccount, useChainId } from 'wagmi';
import { queryClient } from '@/app/queries/queryClient';
import { WebSocketProvider } from './WebSocketProvider';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { useSessionReconciliation } from '@/hooks/useSessionReconciliation';
import { QueryDevtools } from './QueryDevtools';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Component that handles real-time data sync when WebSocket is connected
 */
function RealtimeDataSync() {
  useRealtimeData();
  return null;
}

/**
 * Renders nothing; keeps wallet/chain/auth sessions reconciled (V2-FE-008).
 * Invalidate auth + clear caches whenever the connected account or required
 * chain changes, and coordinate reconnect / logout / re-authentication.
 */
function SessionReconciler() {
  useSessionReconciliation();
  return null;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // WebSocket URL - can be configured via environment variable
  const wsUrl = typeof window !== 'undefined' 
    ?  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws"
    : 'ws://localhost:8080/ws';

  // The wallet scope that authenticates the realtime stream. A stored session
  // token is only attached when it is still valid for this scope.
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const sessionScope =
    isConnected && address ? { address, chainId } : null;

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider
        config={{
          url: wsUrl,
          sessionScope,
          reconnectAttempts: 5,
          reconnectInterval: 3000,
          heartbeatInterval: 30000,
        }}
      >
        <RealtimeDataSync />
        <SessionReconciler />
        {children}
      </WebSocketProvider>
      {/* DevTools are gated by process.env.NODE_ENV — never rendered in production. */}
      <QueryDevtools />
    </QueryClientProvider>
  );
}
