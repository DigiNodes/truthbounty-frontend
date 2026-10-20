'use client';

/**
 * PendingRoleChangeList — UI-FE-030
 *
 * Makes the timelocked lifecycle of a queued grant/revoke explicit, per
 * #600's acceptance criteria: "Timelocked lifecycle and pending changes
 * are explicit." A change with no `executableAfter` is still queued, not
 * yet scheduled — the two must never look the same.
 */
import { Clock, Hourglass } from 'lucide-react';
import type { PendingRoleChange } from '@/app/types/governance-roles';

const STATE_LABEL: Record<PendingRoleChange['state'], string> = {
  idle: 'Idle',
  validating: 'Validating',
  'awaiting-signature': 'Awaiting signature',
  rejected: 'Rejected',
  submitted: 'Submitted',
  replaced: 'Replaced',
  reverted: 'Reverted',
  confirmed: 'Confirmed — awaiting timelock',
  finalized: 'Finalized',
  'projection-lag': 'Projection lag',
  reorged: 'Reorganized',
  unavailable: 'Unavailable',
};

export interface PendingRoleChangeListProps {
  changes: readonly PendingRoleChange[];
  isLoading: boolean;
}

function formatExecutableAfter(value: string | null): string {
  if (value === null) return 'Not yet scheduled';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

export function PendingRoleChangeList({ changes, isLoading }: PendingRoleChangeListProps) {
  if (isLoading) {
    return (
      <div
        data-testid="pending-role-change-list-loading"
        className="p-6 rounded-xl border border-border bg-card text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Loading pending role changes…
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div
        data-testid="pending-role-change-list-empty"
        className="p-6 rounded-xl border border-border bg-card text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        No pending role changes are reported by a canonical source.
      </div>
    );
  }

  return (
    <ul
      data-testid="pending-role-change-list"
      aria-label="Pending role changes"
      className="divide-y divide-border rounded-xl border border-border bg-card"
    >
      {changes.map((change) => {
        const scheduled = change.executableAfter !== null;
        const Icon = scheduled ? Clock : Hourglass;
        return (
          <li key={change.id} className="flex flex-col gap-1 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {change.action === 'grant' ? 'Grant' : 'Revoke'} · {change.role.label}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {STATE_LABEL[change.state]}
              </span>
            </div>
            <p className="font-mono text-xs text-muted-foreground">{change.address}</p>
            <p className="text-xs text-muted-foreground">
              Executable after: {formatExecutableAfter(change.executableAfter)}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Proposal tx: {change.proposalTxId ?? 'Not submitted'}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
