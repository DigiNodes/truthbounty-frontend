// src/components/providers/WebSocketProvider.tsx

'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import type {
  WebSocketConfig,
  WebSocketEvent,
  WebSocketConnectionState,
  WebSocketEventType,
  WebSocketEventHandler,
} from '@/app/types/websocket';

export interface WebSocketContextValue {
  isConnected: boolean;
  connectionState: WebSocketConnectionState;
  lastMessage: WebSocketEvent<unknown> | null;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  subscribe: <T extends WebSocketEventType>(
    eventType: T,
    handler: WebSocketEventHandler<T>
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

  const contextValue = useMemo<WebSocketContextValue>(
    () => ({
      isConnected: websocket.isConnected,
      connectionState: websocket.connectionState,
      lastMessage: websocket.lastMessage,
      reconnectAttempts: websocket.reconnectAttempts,
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

export function useWebSocketStatus() {
  const { isConnected, connectionState, reconnectAttempts } = useWebSocketContext();
  return { isConnected, connectionState, reconnectAttempts };
}