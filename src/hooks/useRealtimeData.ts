// src/hooks/useRealtimeData.ts

'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketContext } from '@/components/providers/WebSocketProvider';
import { queryKeys } from '@/app/queries/queryKeys';
import type {
  ClaimCreatedEvent,
  ClaimUpdatedEvent,
  ClaimStatusChangedEvent,
  VerificationAddedEvent,
  DisputeCreatedEvent,
  DisputeResolvedEvent,
  LeaderboardUpdatedEvent,
} from '@/app/types/websocket';

/**
 * Hook that integrates WebSocket events with TanStack Query cache
 * Automatically invalidates and updates queries when real-time events are received
 */
export function useRealtimeData() {
  const { subscribe, isConnected } = useWebSocketContext();
  const queryClient = useQueryClient();

  // Handle claim created events
  const handleClaimCreated = useCallback(
    (payload: ClaimCreatedEvent) => {
      // Add new claim to cache or invalidate list
      queryClient.setQueryData(queryKeys.claims.all, (old: unknown) => {
        if (Array.isArray(old)) {
          return [payload.claim, ...old];
        }
        return [payload.claim];
      });
    },
    [queryClient]
  );

  // Handle claim updated events
  const handleClaimUpdated = useCallback(
    (payload: ClaimUpdatedEvent) => {
      // Update the specific claim in cache
      queryClient.setQueryData(
        queryKeys.claims.detail(payload.claimId),
        (old: unknown) => {
          if (old && typeof old === 'object') {
            return { ...old, ...payload.updates };
          }
          return old;
        }
      );

      // Also update in the list
      queryClient.setQueryData(queryKeys.claims.all, (old: unknown) => {
        if (Array.isArray(old)) {
          return old.map((claim: any) =>
            claim.id === payload.claimId
              ? { ...claim, ...payload.updates }
              : claim
          );
        }
        return old;
      });
    },
    [queryClient]
  );

  // Handle claim status changed events
  const handleClaimStatusChanged = useCallback(
    (payload: ClaimStatusChangedEvent) => {
      // Update the specific claim with new status
      queryClient.setQueryData(
        queryKeys.claims.detail(payload.claimId),
        (old: unknown) => {
          if (old && typeof old === 'object') {
            return {
              ...old,
              status: payload.newStatus,
              updatedAt: payload.claim?.updatedAt || new Date().toISOString(),
            };
          }
          return old;
        }
      );

      // Update in the list
      queryClient.setQueryData(queryKeys.claims.all, (old: unknown) => {
        if (Array.isArray(old)) {
          return old.map((claim: any) =>
            claim.id === payload.claimId
              ? { ...claim, status: payload.newStatus }
              : claim
          );
        }
        return old;
      });

      // Invalidate related queries to refetch
      queryClient.invalidateQueries({ queryKey: ['claims', payload.claimId] });
    },
    [queryClient]
  );

  // Handle verification added events
  const handleVerificationAdded = useCallback(
    (payload: VerificationAddedEvent) => {
      // Invalidate claim detail to get updated verifications
      queryClient.invalidateQueries({
        queryKey: queryKeys.claims.detail(payload.claimId),
      });

      // Invalidate user verification queries
      queryClient.invalidateQueries({
        queryKey: ['user', payload.verification.verifierAddress],
      });
    },
    [queryClient]
  );

  // Handle dispute created events
  const handleDisputeCreated = useCallback(
    (payload: DisputeCreatedEvent) => {
      // Invalidate claim detail to show dispute status
      queryClient.invalidateQueries({
        queryKey: queryKeys.claims.detail(payload.claimId),
      });
    },
    [queryClient]
  );

  // Handle dispute resolved events
  const handleDisputeResolved = useCallback(
    (payload: DisputeResolvedEvent) => {
      // Invalidate claim detail to get final status
      queryClient.invalidateQueries({
        queryKey: queryKeys.claims.detail(payload.claimId),
      });

      // Invalidate dispute queries
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
    [queryClient]
  );

  // Handle leaderboard updated events
  const handleLeaderboardUpdated = useCallback(
    (payload: LeaderboardUpdatedEvent) => {
      // Directly update leaderboard cache
      queryClient.setQueryData(queryKeys.leaderboard, payload.rankings);
    },
    [queryClient]
  );

  // Subscribe to all WebSocket events when connected
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribers = [
      subscribe('CLAIM_CREATED', handleClaimCreated),
      subscribe('CLAIM_UPDATED', handleClaimUpdated),
      subscribe('CLAIM_STATUS_CHANGED', handleClaimStatusChanged),
      subscribe('VERIFICATION_ADDED', handleVerificationAdded),
      subscribe('DISPUTE_CREATED', handleDisputeCreated),
      subscribe('DISPUTE_RESOLVED', handleDisputeResolved),
      subscribe('LEADERBOARD_UPDATED', handleLeaderboardUpdated),
    ];

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    isConnected,
    subscribe,
    handleClaimCreated,
    handleClaimUpdated,
    handleClaimStatusChanged,
    handleVerificationAdded,
    handleDisputeCreated,
    handleDisputeResolved,
    handleLeaderboardUpdated,
  ]);
}

/**
 * Hook for subscribing to specific claim updates in real-time
 */
export function useRealtimeClaim(claimId: string) {
  const { subscribe, isConnected } = useWebSocketContext();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('CLAIM_STATUS_CHANGED', (payload) => {
      if (payload.claimId === claimId) {
        // Force refetch of claim data
        console.log(`Claim ${claimId} status changed to ${payload.newStatus}`);
      }
    });

    return unsubscribe;
  }, [isConnected, subscribe, claimId]);
}

/**
 * Hook for subscribing to leaderboard updates in real-time
 */
export function useRealtimeLeaderboard() {
  const { subscribe, isConnected } = useWebSocketContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('LEADERBOARD_UPDATED', (payload) => {
      queryClient.setQueryData(queryKeys.leaderboard, payload.rankings);
    });

    return unsubscribe;
  }, [isConnected, subscribe, queryClient]);
}
