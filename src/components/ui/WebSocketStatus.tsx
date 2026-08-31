// src/components/ui/WebSocketStatus.tsx

'use client';

import { useWebSocketStatus } from '@/components/providers/WebSocketProvider';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface WebSocketStatusProps {
  showLabel?: boolean;
  className?: string;
}

export function WebSocketStatus({ showLabel = true, className = '' }: WebSocketStatusProps) {
  const { isConnected, connectionState, reconnectAttempts } = useWebSocketStatus();

  const statusText = connectionState === 'connecting' || connectionState === 'reconnecting'
    ? 'Connecting...'
    : isConnected
      ? 'Live'
      : 'Offline';
  if (connectionState === 'connecting') {
    return (
      <div className={`flex items-center gap-2 text-amber-500 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        {showLabel && <span className="text-sm">Connecting...</span>}
      </div>
    );
  }

  if (connectionState === 'reconnecting') {
    return (
      <div className={`flex items-center gap-2 text-amber-500 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        {showLabel && <span className="text-sm">Reconnecting... (Attempt {reconnectAttempts})</span>}
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className={`flex items-center gap-2 text-green-500 ${className}`}>
        <Wifi className="w-4 h-4" />
        {showLabel && <span className="text-sm">Live</span>}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 text-gray-400 ${className}`}
      aria-live="polite"
      aria-atomic="true"
      aria-label={`WebSocket status: ${statusText}`}
    >
      <WifiOff className="w-4 h-4" aria-hidden="true" />
      {showLabel && <span className="text-sm">{statusText}</span>}
    </div>
  );
}

/**
 * Compact indicator for use in headers/toolbars
 */
export function WebSocketIndicator({ className = '' }: { className?: string }) {
  const { isConnected, connectionState } = useWebSocketStatus();

  const color =
    connectionState === 'connected'
      ? 'bg-green-500'
      : connectionState === 'reconnecting' || connectionState === 'connecting'
        ? 'bg-amber-500 animate-pulse'
        : 'bg-gray-400';

  const statusLabel =
    connectionState === 'connected'
      ? 'Real-time'
      : connectionState === 'reconnecting'
        ? 'Reconnecting...'
        : connectionState === 'connecting'
          ? 'Connecting...'
          : 'Offline';

  return (
    <div className={`flex items-center gap-2 ${className}`} aria-live="polite" aria-atomic="true" aria-label={`WebSocket status: ${statusLabel}`}>
      <div className={`w-2 h-2 rounded-full ${color}`} aria-hidden="true" />
      <span className="text-xs text-gray-400">{statusLabel}</span>
    </div>
  );
}