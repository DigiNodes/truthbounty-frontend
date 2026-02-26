// src/hooks/useWebSocket.ts

'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type {
  WebSocketConfig,
  WebSocketConnectionState,
  WebSocketEvent,
  WebSocketEventHandler,
  WebSocketEventType,
  WebSocketEventPayloadMap,
} from '@/app/types/websocket';

const DEFAULT_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_INTERVAL = 3000;
const DEFAULT_HEARTBEAT_INTERVAL = 30000;

type TimeoutId = ReturnType<typeof setTimeout>;
type IntervalId = ReturnType<typeof setInterval>;

/**
 * Custom hook for managing WebSocket connection and events
 */
export function useWebSocket(config?: WebSocketConfig) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<IntervalId | null>(null);
  const reconnectTimeoutRef = useRef<TimeoutId | null>(null);
  const listenersRef = useRef<
    Map<WebSocketEventType, Set<WebSocketEventHandler<any>>>
  >(new Map());

  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const {
    url,
    reconnectAttempts = DEFAULT_RECONNECT_ATTEMPTS,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL,
    onConnect,
    onDisconnect,
    onError,
  } = config || {};

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (!url) return;

    setConnectionState('connecting');
    setError(null);

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        onConnect?.();

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'PING' }));
          }
        }, heartbeatInterval);
      };

      socket.onmessage = (event) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          setLastMessage(data);

          // Dispatch to registered listeners
          const listeners = listenersRef.current.get(data.type);
          if (listeners) {
            listeners.forEach((handler: WebSocketEventHandler<any>) => {
              handler(data.payload);
            });
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      socket.onclose = (event) => {
        setConnectionState('disconnected');
        onDisconnect?.();

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Attempt reconnection if not a clean close
        if (!event.wasClean && reconnectAttemptsRef.current < reconnectAttempts) {
          setConnectionState('reconnecting');
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      socket.onerror = (event) => {
        const errorEvent = new Error('WebSocket error');
        setError(errorEvent);
        onError?.({
          code: 'WS_ERROR',
          message: 'WebSocket connection error',
          details: event,
        });
      };
    } catch (err) {
      setConnectionState('error');
      setError(err as Error);
    }
  }, [url, reconnectAttempts, reconnectInterval, heartbeatInterval, onConnect, onDisconnect, onError]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close(1000, 'Client disconnect');
      socketRef.current = null;
    }
    setConnectionState('disconnected');
  }, []);

  // Subscribe to specific event type
  const subscribe = useCallback(<T extends WebSocketEventType>(
    eventType: T,
    handler: WebSocketEventHandler<T>
  ) => {
    const listeners = listenersRef.current;
    if (!listeners.has(eventType)) {
      listeners.set(eventType, new Set());
    }
    listeners.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      listeners.get(eventType)?.delete(handler);
    };
  }, []);

  // Send message through WebSocket
  const send = useCallback((message: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Auto-connect on mount if URL provided
  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  // Return the hook interface
  return useMemo(
    () => ({
      connectionState,
      isConnected: connectionState === 'connected',
      lastMessage,
      error,
      connect,
      disconnect,
      subscribe,
      send,
    }),
    [
      connectionState,
      lastMessage,
      error,
      connect,
      disconnect,
      subscribe,
      send,
    ]
  );
}

/**
 * Hook for subscribing to specific event types with automatic cleanup
 */
export function useWebSocketEvent<T extends WebSocketEventType>(
  socket: ReturnType<typeof useWebSocket> | null,
  eventType: T,
  handler: WebSocketEventHandler<T>
) {
  useEffect(() => {
    if (!socket?.isConnected) return;

    const unsubscribe = socket.subscribe(eventType, handler);
    return () => {
      unsubscribe();
    };
  }, [socket, eventType, handler]);
}
