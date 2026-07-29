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

const DEFAULT_RECONNECT_ATTEMPTS = 10;
const DEFAULT_INITIAL_RECONNECT_INTERVAL = 1000; // 1 second initial delay
const DEFAULT_MAX_RECONNECT_INTERVAL = 30000; // 30 seconds max delay
const DEFAULT_HEARTBEAT_INTERVAL = 30000;
const DEFAULT_BACKOFF_MULTIPLIER = 2; // Exponential backoff multiplier

type TimeoutId = ReturnType<typeof setTimeout>;
type IntervalId = ReturnType<typeof setInterval>;

/**
 * Custom hook for managing WebSocket connection and events with exponential backoff
 */
export function useWebSocket(config?: WebSocketConfig) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<IntervalId | null>(null);
  const reconnectTimeoutRef = useRef<TimeoutId | null>(null);
  const listenersRef = useRef<
    Map<WebSocketEventType, Set<WebSocketEventHandler<any>>>
  >(new Map());
  const isMountedRef = useRef(true);

  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const {
    url,
    reconnectAttempts = DEFAULT_RECONNECT_ATTEMPTS,
    reconnectInterval, // Deprecated
    initialReconnectInterval: initialInterval,
    maxReconnectInterval = DEFAULT_MAX_RECONNECT_INTERVAL,
    heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL,
    backoffMultiplier = DEFAULT_BACKOFF_MULTIPLIER,
    onConnect,
    onDisconnect,
    onError,
  } = config || {};

  // Use deprecated reconnectInterval if provided for backward compatibility, otherwise use default
  const initialReconnectInterval = initialInterval ?? reconnectInterval ?? DEFAULT_INITIAL_RECONNECT_INTERVAL;

  // Calculate exponential backoff delay
  const getBackoffDelay = useCallback((attempt: number) => {
    const delay = Math.min(
      initialReconnectInterval * Math.pow(backoffMultiplier, attempt),
      maxReconnectInterval
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }, [initialReconnectInterval, maxReconnectInterval, backoffMultiplier]);

  // Clear all timers and intervals
  const clearAllTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (!url || !isMountedRef.current) return;

    // Clear any existing connections or timers before creating new one
    if (socketRef.current) {
      socketRef.current.close(1000, 'Creating new connection');
      socketRef.current = null;
    }
    clearAllTimers();

    setConnectionState('connecting');
    setError(null);

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isMountedRef.current) return;
        
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        onConnect?.();

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN && isMountedRef.current) {
            socket.send(JSON.stringify({ type: 'PING' }));
          }
        }, heartbeatInterval);
      };

      socket.onmessage = (event) => {
        if (!isMountedRef.current) return;
        
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          setLastMessage(data);

          // Dispatch to registered listeners
          const listeners = listenersRef.current.get(data.type);
          if (listeners) {
            listeners.forEach((handler: WebSocketEventHandler<any>) => {
              if (isMountedRef.current) {
                handler(data.payload);
              }
            });
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      socket.onclose = (event) => {
        if (!isMountedRef.current) return;
        
        setConnectionState('disconnected');
        onDisconnect?.();

        // Clear heartbeat
        clearAllTimers();

        // Attempt reconnection if not a clean close and still mounted
        if (!event.wasClean && reconnectAttemptsRef.current < reconnectAttempts && isMountedRef.current) {
          setConnectionState('reconnecting');
          const attempt = reconnectAttemptsRef.current;
          reconnectAttemptsRef.current += 1;
          
          const delay = getBackoffDelay(attempt);
          console.log(`WebSocket disconnected. Attempting reconnection ${reconnectAttemptsRef.current}/${reconnectAttempts} in ${Math.round(delay)}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect();
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= reconnectAttempts) {
          console.error('Max WebSocket reconnection attempts reached. Giving up.');
          setConnectionState('error');
        }
      };

      socket.onerror = (event) => {
        if (!isMountedRef.current) return;
        
        const errorEvent = new Error('WebSocket error');
        setError(errorEvent);
        onError?.({
          code: 'WS_ERROR',
          message: 'WebSocket connection error',
          details: event,
        });
      };
    } catch (err) {
      if (!isMountedRef.current) return;
      
      setConnectionState('error');
      setError(err as Error);
    }
  }, [url, reconnectAttempts, heartbeatInterval, getBackoffDelay, clearAllTimers, onConnect, onDisconnect, onError]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    clearAllTimers();
    if (socketRef.current) {
      socketRef.current.close(1000, 'Client disconnect');
      socketRef.current = null;
    }
    setConnectionState('disconnected');
  }, [clearAllTimers]);

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
      console.warn('WebSocket is not connected. Could not send message.');
    }
  }, []);

  // Auto-connect on mount if URL provided
  useEffect(() => {
    isMountedRef.current = true;
    
    if (url) {
      connect();
    }

    return () => {
      // Mark as unmounted to prevent any state updates after cleanup
      isMountedRef.current = false;
      // Clean up all resources
      disconnect();
      // Clear all listeners to prevent memory leaks
      listenersRef.current.forEach((listeners) => listeners.clear());
      listenersRef.current.clear();
    };
  }, [url, connect, disconnect]);

  // Return the hook interface
  return useMemo(
    () => ({
      connectionState,
      isConnected: connectionState === 'connected',
      lastMessage,
      error,
      reconnectAttempts: reconnectAttemptsRef.current,
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