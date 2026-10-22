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
        className="flex flex-col items-center gap-2 p-8 rounded-xl border border-dashed border-border text-center"
      >
        <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">No role membership to display</p>
        <p className="text-xs text-muted-foreground max-w-prose">
          Membership is sourced from pinned contract events once a verified release manifest
          resolves the role identifiers.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-x-auto" data-testid="role-member-list">
      <table className="w-full text-xs">
        <caption className="sr-only">Current role membership</caption>
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th scope="col" className="p-3 font-semibold">
              Role
            </th>
            <th scope="col" className="p-3 font-semibold">
              Address
            </th>
            <th scope="col" className="p-3 font-semibold">
              Granted
            </th>
            <th scope="col" className="p-3 font-semibold">
              Audit reference
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={`${member.role.roleId}-${member.address}`}
              className="border-b border-border last:border-0"
            >
              <td className="p-3 font-medium text-foreground">{member.role.label}</td>
              <td className="p-3 font-mono text-foreground">
                {member.address.slice(0, 6)}…{member.address.slice(-4)}
              </td>
              <td className="p-3 text-muted-foreground">{member.grantedAt}</td>
              <td className="p-3 font-mono text-muted-foreground">
                {member.grantedByTxId.slice(0, 10)}…
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
