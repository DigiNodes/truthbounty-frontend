/**
 * Bounded recovery — UI-FE-053 (#626)
 *
 * Recovery actions must not be able to loop. Every "Try again" and "Reload"
 * is counted inside a sliding window; once the budget is spent the action is
 * withdrawn and the person is offered a stable alternative (navigate away,
 * report). Recovery is never automatic — only an explicit user action spends
 * budget — so this bounds repeated *manual* retries against a persistent fault.
 *
 * Storage safety: reload attempts persist in `sessionStorage` under the
 * `tb-err-budget:` prefix so they survive the reload itself. This module never
 * reads, writes or clears pending-transaction recovery keys
 * (`truthbounty-pending-transactions-v2`, `tb-tx-v2:*`). When storage is
 * unavailable it falls back to memory.
 */

export const MAX_RETRY_ATTEMPTS = 3;
export const MAX_RELOAD_ATTEMPTS = 2;
export const RECOVERY_WINDOW_MS = 5 * 60 * 1000;

const STORAGE_PREFIX = 'tb-err-budget:';
const memoryStore = new Map<string, number[]>();

function safeScopeKey(scope: string): string {
  return scope.toLowerCase().replace(/[^a-z0-9:_-]/g, '-').slice(0, 64) || 'unknown';
}

function getSessionStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export interface RecoveryBudgetOptions {
  max: number;
  windowMs?: number;
  now?: () => number;
  /** When set, attempts persist in sessionStorage under this scope (survives reload). */
  persistScope?: string;
}

export class RecoveryBudget {
  private readonly max: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly storageKey: string | null;
  private attempts: number[] = [];

  constructor(options: RecoveryBudgetOptions) {
    this.max = options.max;
    this.windowMs = options.windowMs ?? RECOVERY_WINDOW_MS;
    this.now = options.now ?? Date.now;
    this.storageKey = options.persistScope ? `${STORAGE_PREFIX}${safeScopeKey(options.persistScope)}` : null;
  }

  private load(): number[] {
    if (!this.storageKey) return this.attempts;
    const storage = getSessionStorage();
    try {
      const raw = storage?.getItem(this.storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((n): n is number => typeof n === 'number');
      }
    } catch {
      /* fall through to memory */
    }
    return memoryStore.get(this.storageKey) ?? [];
  }

  private save(attempts: number[]): void {
    this.attempts = attempts;
    if (!this.storageKey) return;
    memoryStore.set(this.storageKey, attempts);
    try {
      getSessionStorage()?.setItem(this.storageKey, JSON.stringify(attempts));
    } catch {
      /* memory fallback already set */
    }
  }

  private live(): number[] {
    const cutoff = this.now() - this.windowMs;
    return this.load().filter((t) => t > cutoff);
  }

  used(): number {
    return this.live().length;
  }

  remaining(): number {
    return Math.max(0, this.max - this.used());
  }

  canAttempt(): boolean {
    return this.remaining() > 0;
  }

  /** Spend one attempt. Returns false (and spends nothing) when exhausted. */
  record(): boolean {
    const live = this.live();
    if (live.length >= this.max) return false;
    this.save([...live, this.now()]);
    return true;
  }

  reset(): void {
    this.save([]);
  }
}

/** Test helper: clear in-memory fallback state. */
export function __resetRecoveryBudgetMemory(): void {
  memoryStore.clear();
}
