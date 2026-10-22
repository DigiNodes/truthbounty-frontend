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

export function PendingRoleChangeList({ changes, isLoading }: PendingRoleChangeListProps) {
  if (isLoading) {
    return (
      <div
        data-testid="pending-role-change-list-loading"
        className="p-6 rounded-xl border border-border bg-card text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Loading pending changes…
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div
        data-testid="pending-role-change-list-empty"
        className="flex flex-col items-center gap-2 p-8 rounded-xl border border-dashed border-border text-center"
      >
        <Hourglass className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">No pending role changes</p>
        <p className="text-xs text-muted-foreground max-w-prose">
          Queued grant/revoke actions and their timelock readiness will appear here once sourced
          from the governance contract.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" data-testid="pending-role-change-list">
      {changes.map((change) => (
        <li
          key={change.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl border border-border bg-card text-xs"
        >
          <div>
            <p className="font-semibold text-foreground">
              {change.action === 'grant' ? 'Grant' : 'Revoke'} {change.role.label}
            </p>
            <p className="font-mono text-muted-foreground">
              {change.address.slice(0, 6)}…{change.address.slice(-4)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {change.executableAfter
                ? `Executable after ${change.executableAfter}`
                : 'Not yet queued for execution'}
            </span>
            <span className="px-2 py-0.5 rounded-full border border-border font-medium text-foreground">
              {STATE_LABEL[change.state]}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
