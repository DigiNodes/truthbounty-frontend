// src/components/features/RealtimeActivityFeed.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebSocketContext } from '@/components/providers/WebSocketProvider';
import type { WebSocketEvent } from '@/app/types/websocket';

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export function RealtimeActivityFeed() {
  const { subscribe, isConnected } = useWebSocketContext();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to various events and create activity items
    const unsubscribers = [
      subscribe('CLAIM_CREATED', (payload: any) => {
        const activity: ActivityItem = {
          id: `claim-${payload.claim.id}-${Date.now()}`,
          type: 'claim_created',
          message: `New claim: "${payload.claim.title}"`,
          timestamp: new Date().toISOString(),
        };
        addActivity(activity);
      }),
      subscribe('CLAIM_STATUS_CHANGED', (payload: any) => {
        const activity: ActivityItem = {
          id: `status-${payload.claimId}-${Date.now()}`,
          type: 'status_changed',
          message: `Claim status changed to ${payload.newStatus}`,
          timestamp: new Date().toISOString(),
        };
        addActivity(activity);
      }),
      subscribe('VERIFICATION_ADDED', (payload: any) => {
        const activity: ActivityItem = {
          id: `verify-${payload.verification.id}-${Date.now()}`,
          type: 'verification',
          message: `New verification on claim`,
          timestamp: new Date().toISOString(),
        };
        addActivity(activity);
      }),
      subscribe('DISPUTE_CREATED', (payload: any) => {
        const activity: ActivityItem = {
          id: `dispute-${payload.dispute.id}-${Date.now()}`,
          type: 'dispute',
          message: `New dispute raised`,
          timestamp: new Date().toISOString(),
        };
        addActivity(activity);
      }),
      subscribe('DISPUTE_RESOLVED', (payload: any) => {
        const activity: ActivityItem = {
          id: `resolved-${payload.disputeId}-${Date.now()}`,
          type: 'dispute_resolved',
          message: `Dispute ${payload.outcome === 'UPHELD' ? 'upheld' : 'overturned'}`,
          timestamp: new Date().toISOString(),
        };
        addActivity(activity);
      }),
      subscribe('LEADERBOARD_UPDATED', () => {
        const activity: ActivityItem = {
          id: `leaderboard-${Date.now()}`,
          type: 'leaderboard',
          message: 'Leaderboard rankings updated',
          timestamp: new Date().toISOString(),
        };
        addActivity(activity);
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [isConnected, subscribe]);

  const addActivity = (activity: ActivityItem) => {
    setActivities((prev) => [activity, ...prev].slice(0, 50)); // Keep last 50
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'claim_created':
        return 'bg-blue-500';
      case 'status_changed':
        return 'bg-purple-500';
      case 'verification':
        return 'bg-green-500';
      case 'dispute':
        return 'bg-red-500';
      case 'dispute_resolved':
        return 'bg-orange-500';
      case 'leaderboard':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-[#18181b] rounded-lg border border-[#232329] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Live Activity</h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <span className="text-xs text-gray-400">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      <div
        ref={feedRef}
        className="space-y-2 max-h-64 overflow-y-auto"
      >
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">Waiting for activity...</p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 text-sm animate-fadeIn"
            >
              <div
                className={`w-2 h-2 rounded-full mt-1.5 ${getTypeColor(
                  activity.type
                )}`}
              />
              <div className="flex-1">
                <p className="text-gray-300">{activity.message}</p>
                <p className="text-gray-500 text-xs">{formatTime(activity.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
