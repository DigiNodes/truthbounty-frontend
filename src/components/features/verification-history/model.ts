/**
 * Verification History model types.
 * Canonical types for the personal verification history composition.
 */

export type VerificationHistoryState =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'stale'
  | 'offline'
  | 'unavailable'
  | 'error'
  | 'denied';

/**
 * Verification outcome states for history entries.
 * These represent the canonical protocol states a verification can be in.
 */
export const VERIFICATION_HISTORY_OUTCOMES = [
  'awaiting-reveal',
  'settlement-pending',
  'finalized',
  'reward',
  'withdrawal',
  'slashed',
  'missed-deadline',
  'unavailable-reward',
] as const;

export type VerificationHistoryOutcome = (typeof VERIFICATION_HISTORY_OUTCOMES)[number];

/**
 * Source of the verification data.
 * Contract reads are authoritative; API projections are freshness-labelled estimates.
 */
export type VerificationSource =
  | { kind: 'contract'; block: string; finality: 'confirmed' | 'finalized' }
  | {
      kind: 'api-projection';
      receivedAt: number | null;
      freshness: 'unknown' | 'stale' | 'projection-lag' | 'delayed-indexing';
    };

/**
 * Reorg status for a verification entry.
 */
export type ReorgStatus = 'none' | 'detected' | 'reconciled';

/**
 * A single verification history entry.
 */
export interface VerificationHistoryEntry {
  id: string;
  claimId: string;
  title: string;
  outcome: VerificationHistoryOutcome;
  /** Exact amount in token base units (wei), or null if unavailable. */
  amount: string | null;
  asset: string;
  source: VerificationSource;
  /** When the verification was submitted/confirmed. */
  submittedAtIso: string;
  /** When the outcome was determined (if finalized). */
  finalizedAtIso?: string;
  /** Reorg status if applicable. */
  reorgStatus: ReorgStatus;
  /** Replacement transaction hash if reorged. */
  replacedBy?: string;
  /** Freshness metadata. */
  freshness: {
    fetchedAt: string;
    sourceUpdatedAt?: string;
    stale: boolean;
    delayedIndexing?: boolean;
  };
}

/**
 * Aggregated data for the verification history center.
 */
export interface VerificationHistoryData {
  state: VerificationHistoryState;
  entries: readonly VerificationHistoryEntry[];
  receivedAt: number | null;
  rejectedCount: number;
}

/**
 * Display outcome mapping for UI rendering.
 * Projects raw outcomes to display states.
 */
export function displayOutcome(entry: VerificationHistoryEntry): VerificationHistoryOutcome {
  // Contract-sourced slashed is always slashed
  if (entry.source.kind === 'contract' && entry.outcome === 'slashed') {
    return 'slashed';
  }
  // API projections for reward/withdrawal show as unavailable-reward until contract-confirmed
  if (entry.source.kind === 'api-projection' && (entry.outcome === 'reward' || entry.outcome === 'withdrawal')) {
    return 'unavailable-reward';
  }
  // Delayed indexing shows as settlement-pending with stale freshness
  if (entry.freshness.delayedIndexing) {
    return 'settlement-pending';
  }
  return entry.outcome;
}

/**
 * Human-readable explanation for each outcome state.
 */
export const outcomeExplanations: Record<VerificationHistoryOutcome, string> = {
  'awaiting-reveal': 'Verification submitted · awaiting reveal phase',
  'settlement-pending': 'Reveal complete · settlement pending finality',
  'finalized': 'Canonical outcome confirmed on-chain',
  'reward': 'Reward earned · contract-confirmed',
  'withdrawal': 'Withdrawal processed · funds transferred',
  'slashed': 'Stake slashed · contract-confirmed loss',
  'missed-deadline': 'Reveal deadline missed · stake forfeited',
  'unavailable-reward': 'Projected reward · not claimable until contract confirmation',
};

/**
 * Source label for display.
 */
export function sourceLabel(source: VerificationSource): string {
  if (source.kind === 'contract') {
    return `Contract read · ${source.finality} · block ${source.block}`;
  }
  const freshnessLabel =
    source.freshness === 'projection-lag'
      ? 'projection lag'
      : source.freshness === 'stale'
        ? 'stale'
        : source.freshness === 'delayed-indexing'
          ? 'delayed indexing'
          : 'chain freshness unknown';
  return `API estimate · ${freshnessLabel} · not authoritative`;
}

/**
 * Tone for StatusBadge based on outcome.
 */
export function outcomeTone(outcome: VerificationHistoryOutcome): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (outcome) {
    case 'finalized':
    case 'reward':
    case 'withdrawal':
      return 'success';
    case 'slashed':
      return 'danger';
    case 'awaiting-reveal':
    case 'settlement-pending':
      return 'warning';
    case 'missed-deadline':
    case 'unavailable-reward':
      return 'neutral';
    default:
      return 'neutral';
  }
}