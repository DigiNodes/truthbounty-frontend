// src/components/providers/WebSocketProvider.tsx

'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { WebSocketConfig, WebSocketEvent } from '@/app/types/websocket';

export interface WebSocketContextValue {
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastMessage: WebSocketEvent | null;
  connect: () => void;
  disconnect: () => void;
  subscribe: <T extends string>(
    eventType: T,
    handler: (payload: any) => void
  ) => () => void;
  send: (message: unknown) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  config?: WebSocketConfig;
}

export function WebSocketProvider({ children, config }: WebSocketProviderProps) {
  const websocket = useWebSocket(config);

  const contextValue = useMemo(
    () => ({
      isConnected: websocket.isConnected,
      connectionState: websocket.connectionState,
      lastMessage: websocket.lastMessage,
      connect: websocket.connect,
      disconnect: websocket.disconnect,
      subscribe: websocket.subscribe,
      send: websocket.send,
    }),
    [websocket]
  );

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

/**
 * Hook to check if WebSocket is connected
 */
export function useWebSocketStatus() {
  const { isConnected, connectionState } = useWebSocketContext();
  return { isConnected, connectionState };
}
