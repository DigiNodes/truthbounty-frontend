'use client';

/**
 * RoleMemberList — UI-FE-030
 *
 * Renders canonical role membership. Every row's grant timestamp and
 * audit/tx identifier must trace to a pinned-contract event — this
 * component never infers membership from a legacy role name.
 */
import { Users } from 'lucide-react';
import type { RoleMember } from '@/app/types/governance-roles';

export interface RoleMemberListProps {
  members: readonly RoleMember[];
  isLoading: boolean;
}

function formatGrantedAt(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

export function RoleMemberList({ members, isLoading }: RoleMemberListProps) {
  if (isLoading) {
    return (
      <div
        data-testid="role-member-list-loading"
        className="p-6 rounded-xl border border-border bg-card text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Loading role membership…
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div
        data-testid="role-member-list-empty"
        className="p-6 rounded-xl border border-border bg-card text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        No role membership is available from a canonical source yet.
      </div>
    );
  }

  return (
    <ul
      data-testid="role-member-list"
      aria-label="Role membership"
      className="divide-y divide-border rounded-xl border border-border bg-card"
    >
      {members.map((member) => (
        <li
          key={`${member.role.roleId}:${member.address}`}
          className="flex flex-col gap-1 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {member.role.label}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{member.address}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Granted {formatGrantedAt(member.grantedAt)}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            Grant tx: {member.grantedByTxId}
          </p>
        </li>
      ))}
    </ul>
  );
}
