/**
 * Protocol time / deadline normalization.
 *
 * Protocol deadlines are derived from canonical chain data only:
 *   - a confirmed block header timestamp (anchor) and block number,
 *   - an ordinal target block (deadline expressed in blocks),
 *   - the protocol's expected block interval.
 *
 * This module NEVER fabricates timestamps, block numbers, hashes, receipts,
 * settlement, or finality. It fails closed: any missing, ambiguous, or
 * invalid input resolves to `null` / `UNKNOWN` rather than a client guess.
 * Lifecycle state is driven by canonical projections, never by timers.
 *
 * HYDRATION BOUNDARY:
 * This module is pure and deterministic. It must never read `window`,
 * `navigator`, `Date.now()`, `new Date()`, `MathMath.random()`, `performance`,
 * or any other ambient environment state at module scope. All clock and
 * locale dependency is injected by the caller (`snowMs`, `locale`, `timeZone`)
 * so that server shells and client hydration produce identical output.
 */

import { formatLocalDateTime, formatUtcDateTime } from './format';

export type DeadlineState = 'ACTIVE' | 'EXPIRED' | 'UNKNOWN';

export interface ChainClockAnchor {
  /** Confirmed block number this projection is anchored to. */
  anchorBlockNumber: bigint | number | string | null | undefined;
  /** Confirmed ms-epoch timestamp of the anchor block (from the block header). */
  anchorBlockTimestampMs: number | string | null | undefined;
  /** Protocol's expected seconds per block (e.g. 2s on Optimism). */
  avgBlockSeconds?: number | string | null | undefined;
}

export interface BlockDeadlineProjection {
  /** Absolute ms-epoch deadline derived from chain data, or null when fail-closed. */
  deadlineMs: number | null;
  /** Number of blocks between the anchor and the deadline block. */
  blockDelta: number | null;
  /** Canonical target (deadline) block number. */
  projectBlockNumber: bigint | null;
  /** Canonical anchor block number. */
  anchorBlockNumber: bigint | null;
  /** Expected seconds per block used for the projection. */
  avgBlockSeconds: number | null;
}

/** Deterministic locale context for formatting. */
export interface DeadlineFormatContext {
  /** BCP 47 language tag, e.g. 'en-US'. Defaults to 'en-US' when omitted. */
  locale?: string | null | undefined;
  /** IANA time zone, e.g. 'UTC'. Defaults to 'UTC' when omitted. */
  timeZone?: string | null | undefined;
  /** Whether to include seconds in the formatted output. */
  includeSeconds?: boolean;
}

const EPSILON = Number.EPSILON;

const DEFAULT_LOCALE = 'en-US';
const DEFAULT_TIME_ZONE = 'UTC';

/**
 * Normalize a chain block number (bigint | number | string) to `bigint`.
 * Returns null (fail closed) for missing, non-integer, negative, or
 * non-numeric input.
 */
export function normalizeBlockNumber(
  value: bigint | number | string | null | undefined
): bigint | null {
  if (value === null || value === undefined) return null;

  try {
    let numberValue: bigint;
    if (typeof value === 'bigint') {
      numberValue = value;
    } else if (typeof value === 'number') {
      if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
      numberValue = BigInt(value);
    } else {
      const trimmed = String(value).trim();
      if (!/^\d+$/.test(trimmed)) return null;
      numberValue = BigInt(trimmed);
    }

    return numberValue >= 0n ? numberValue : null;
  } catch {
    return null;
  }
}

/**
 * Parse a timestamp expressed in milliseconds (as number, Date, ISO-8601
 * string, or millisecond numeric string) into a ms-epoch, or null on any
 * ambiguous/invalid input. Chain block timestamps in seconds must use
 * `parseBlockTimestampMs`.
 */
export function parseTimestampMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) && ms >= 0 ? ms : null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{13}$/.test(trimmed)) {
      const ms = Number(trimmed);
      return Number.isFinite(ms) && ms >= 0 ? ms : null;
    }
    const ms = Date.parse(trimmed);
    return Number.isFinite(ms) && ms >= 0 ? ms : null;
  }

  return null;
}

/**
 * Parse a chain block-header timestamp expressed in SECONDS (number or
 * numeric string) into a ms-epoch, or null on invalid/ambiguous input.
 */
export function parseBlockTimestampMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value !== 'number' && typeof value !== 'string') return null;

  const num =
    typeof value === 'string' ? (value.trim() ? Number(value.trim()) : NaN) : value;

  if (!Number.isFinite(num) || num < 0) return null;

  const ms = Math.floor(num * 1000);
  return ms >= 0 ? ms : null;
}

/**
 * Derive an absolute deadline (ms-epoch) from canonical chain data: an
 * anchor block header (block number + timestamp) and a target block number,
 * assuming the protocol's expected block interval. Fails closed (deadlineMs
 * null) when any required input is missing or invalid. A target at or before
 * the anchor resolves to the anchor timestamp (blockDelta 0), which the
 * expiry check will evaluate as already meeting the deadline.
 */
export function deriveDeadlineFromBlocks(
  anchor: ChainClockAnchor,
  targetBlockNumber: bigint | number | string | null | undefined
): BlockDeadlineProjection {
  const anchorBlockNumber = normalizeBlockNumber(anchor?.anchorBlockNumber);
  const projectBlockNumber = normalizeBlockNumber(targetBlockNumber);
  const anchorTimestampMs = parseTimestampMs(anchor?.anchorBlockTimestampMs);

  if (anchorBlockNumber === null || projectBlockNumber === null) {
    return {
      deadlineMs: null,
      blockDelta: null,
      projectBlockNumber,
      anchorBlockNumber,
      avgBlockSeconds: null,
    };
  }

  if (anchorTimestampMs === null) {
    return {
      deadlineMs: null,
      blockDelta: null,
      projectBlockNumber,
      anchorBlockNumber,
      avgBlockSeconds: null,
    };
  }

  const avgBlockSeconds = Number(anchor?.avgBlockSeconds);
  if (!Number.isFinite(avgBlockSeconds) || avgBlockSeconds <= 0) {
    return {
      deadlineMs: null,
      blockDelta: null,
      projectBlockNumber,
      anchorBlockNumber,
      avgBlockSeconds: null,
    };
  }

  const blockDelta =
    projectBlockNumber >= anchorBlockNumber
      ? projectBlockNumber - anchorBlockNumber
      : 0n;

  const driftMs = Number(blockDelta) * avgBlockSeconds * 1000;
  const deadlineMs = anchorTimestampMs + driftMs;

  return {
    deadlineMs: Number.isFinite(deadlineMs) && deadlineMs >= 0 ? deadlineMs : null,
    blockDelta: Number.isFinite(driftMs) ? Number(blockDelta) : null,
    projectBlockNumber,
    anchorBlockNumber,
    avgBlockSeconds,
  };
}

/**
 * Determine whether a canonical deadline has been reached. Account for clock
 * skew so a client clock slightly ahead of chain time never prematurely
 * expires a live deadline. Returns null (fail closed) when the deadline is
 * unknown. Boundary: deadlineMs == nowMs is treated as expired.
 */
export function isDeadlineExpired(input: {
  deadlineMs: number | null | undefined;
  nowMs: number;
  clockSkewMs?: number;
}): boolean | null {
  const { deadlineMs, nowMs, clockSkewMs = 0 } = input;

  if (typeof deadlineMs !== 'number' || !Number.isFinite(deadlineMs)) return null;
  if (!Number.isFinite(nowMs)) return null;

  const skew = Number(clockSkewMs);
  const toleratedSkew = Number.isFinite(skew) && skew > 0 ? skew : 0;

  return deadlineMs - nowMs <= toleratedSkew + EPSILON;
}

/**
 * Determine whether a canonical deadline is within a future horizon window
 * (e.g. "expires soon"), without ever signaling a past deadline. Returns
 * null (fail closed) when the deadline is unknown.
 */
export function isDeadlineWithinHorizon(input: {
  deadlineMs: number | null | undefined;
  nowMs: number;
  horizonMs: number;
  clockSkewMs?: number;
}): boolean | null {
  const { deadlineMs, nowMs, horizonMs, clockSkewMs = 0 } = input;

  if (!Number.isFinite(horizonMs) || horizonMs < 0) return null;
  if (!Number.isFinite(nowMs)) return null;

  const expired = isDeadlineExpired({ deadlineMs, nowMs, clockSkewMs });
  if (expired === true) return false;
  if (expired === null) return null;

  return deadlineMs! - nowMs <= horizonMs + EPSILON;
}

/**
 * Canonical lifecycle state for a deadline. A confirmed canonical status that
 * signals expiry always wins over clock math; otherwise the state is derived
 * from the canonical deadline with clock-skew tolerance. Unknown deadlines
 * resolve to UNKNOWN (fail closed) — never guessed.
 */
export function resolveDeadlineState(input: {
  deadlineMs: number | null | undefined;
  nowMs: number;
  clockSkewMs?: number;
  confirmedState?: DeadlineState | null | undefined;
}): DeadlineState {
  const { deadlineMs, nowMs, clockSkewMs = 0, confirmedState } = input;

  if (confirmedState === 'EXPIRED') return 'EXPIRED';

  const expired = isDeadlineExpired({ deadlineMs, nowMs, clockSkewMs });
  if (expired === null) return 'UNKNOWN';
  if (expired) return 'EXPIRED';
  if (confirmedState === 'ACTIVE') return 'ACTIVE';
  return 'ACTIVE';
}

/**
 * Format a canonical deadline for display. Locale and time zone are
 * explicit inputs (never read from the ambient environment), so server
 * shells and client hydration produce identical strings. Returns null when
 * the deadline is unknown (fail closed).
 */
export function formatDeadline(
  deadlineMs: number | null | undefined,
  context: DeadlineFormatContext = {}
): string | null {
  if (typeof deadlineMs !== 'number' || !Number.isFinite(deadlineMs)) return null;

  const locale = context.locale || DEFAULT_LOCALE;
  const timeZone = context.timeZone || DEFAULT_TIME_ZONE;

  if (timeZone === DEFAULT_TIME_ZONE) {
    return formatUtcDateTime(deadlineMs, { locale, includeSeconds: context.includeSeconds });
  }

  return formatLocalDateTime(deadlineMs, {
    locale,
    timeZone,
    includeSeconds: context.includeSeconds,
  });
}
