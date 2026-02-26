// src/app/types/websocket.ts

import type { Claim, ClaimStatus } from './claim';
import type { Dispute } from './dispute';
import type { Verification } from './verification';

/**
 * WebSocket event types for real-time updates
 */
export type WebSocketEventType =
  | 'CLAIM_CREATED'
  | 'CLAIM_UPDATED'
  | 'CLAIM_STATUS_CHANGED'
  | 'VERIFICATION_ADDED'
  | 'VERIFICATION_UPDATED'
  | 'DISPUTE_CREATED'
  | 'DISPUTE_UPDATED'
  | 'DISPUTE_RESOLVED'
  | 'LEADERBOARD_UPDATED'
  | 'USER_STATS_UPDATED'
  | 'CONNECTION_STATUS'
  | 'ERROR';

/**
 * Base WebSocket event structure
 */
export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  payload: T;
  timestamp: string;
}

/**
 * Claim created event
 */
export interface ClaimCreatedEvent {
  claim: Claim;
}

/**
 * Claim updated event (field changes)
 */
export interface ClaimUpdatedEvent {
  claimId: string;
  updates: Partial<Claim>;
}

/**
 * Claim status changed event
 */
export interface ClaimStatusChangedEvent {
  claimId: string;
  previousStatus: ClaimStatus;
  newStatus: ClaimStatus;
  claim?: Claim;
}

/**
 * Verification added event
 */
export interface VerificationAddedEvent {
  verification: Verification;
  claimId: string;
}

/**
 * Verification updated event
 */
export interface VerificationUpdatedEvent {
  verificationId: string;
  claimId: string;
  updates: Partial<Verification>;
}

/**
 * Dispute created event
 */
export interface DisputeCreatedEvent {
  dispute: Dispute;
  claimId: string;
}

/**
 * Dispute updated event
 */
export interface DisputeUpdatedEvent {
  disputeId: string;
  updates: Partial<Dispute>;
}

/**
 * Dispute resolved event
 */
export interface DisputeResolvedEvent {
  disputeId: string;
  claimId: string;
  outcome: 'UPHELD' | 'OVERTURNED';
  winningVotes: number;
  losingVotes: number;
}

/**
 * Leaderboard updated event
 */
export interface LeaderboardUpdatedEvent {
  rankings: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalVerifications: number;
  accuracy: number;
  totalStaked: number;
  totalEarned: number;
}

/**
 * User stats updated event
 */
export interface UserStatsUpdatedEvent {
  userId: string;
  verificationCount: number;
  accuracy: number;
  reputation: number;
  totalStaked: number;
  totalEarned: number;
}

/**
 * Connection status event
 */
export interface ConnectionStatusEvent {
  status: 'connected' | 'disconnected' | 'reconnecting';
  reconnectAttempts?: number;
  lastConnected?: string;
}

/**
 * WebSocket error event
 */
export interface WebSocketErrorEvent {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Type map for event payloads
 */
export type WebSocketEventPayloadMap = {
  CLAIM_CREATED: ClaimCreatedEvent;
  CLAIM_UPDATED: ClaimUpdatedEvent;
  CLAIM_STATUS_CHANGED: ClaimStatusChangedEvent;
  VERIFICATION_ADDED: VerificationAddedEvent;
  VERIFICATION_UPDATED: VerificationUpdatedEvent;
  DISPUTE_CREATED: DisputeCreatedEvent;
  DISPUTE_UPDATED: DisputeUpdatedEvent;
  DISPUTE_RESOLVED: DisputeResolvedEvent;
  LEADERBOARD_UPDATED: LeaderboardUpdatedEvent;
  USER_STATS_UPDATED: UserStatsUpdatedEvent;
  CONNECTION_STATUS: ConnectionStatusEvent;
  ERROR: WebSocketErrorEvent;
};

/**
 * Type-safe event handler type
 */
export type WebSocketEventHandler<T extends WebSocketEventType> = (
  payload: WebSocketEventPayloadMap[T]
) => void;

/**
 * WebSocket configuration options
 */
export interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: WebSocketErrorEvent) => void;
}

/**
 * WebSocket connection state
 */
export type WebSocketConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';
