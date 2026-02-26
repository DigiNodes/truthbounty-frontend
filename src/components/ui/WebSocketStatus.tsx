// src/components/ui/WebSocketStatus.tsx

'use client';

import { useWebSocketStatus } from '@/components/providers/WebSocketProvider';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface WebSocketStatusProps {
  showLabel?: boolean;
  className?: string;
}

export function WebSocketStatus({ showLabel = true, className = '' }: WebSocketStatusProps) {
  const { isConnected, connectionState } = useWebSocketStatus();

  if (connectionState === 'connecting' || connectionState === 'reconnecting') {
    return (
      <div className={`flex items-center gap-2 text-amber-500 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        {showLabel && <span className="text-sm">Connecting...</span>}
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
    <div className={`flex items-center gap-2 text-gray-400 ${className}`}>
      <WifiOff className="w-4 h-4" />
      {showLabel && <span className="text-sm">Offline</span>}
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

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${color}`} />
      {isConnected && <span className="text-xs text-gray-500">Real-time</span>}
    </div>
  );
}
