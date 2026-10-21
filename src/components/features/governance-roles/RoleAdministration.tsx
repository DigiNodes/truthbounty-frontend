'use client';

/**
 * RoleAdministration — UI-FE-030
 *
 * Governance role membership, pending timelocked changes, separation-of-
 * duty warnings, and authority-source transparency, for the Governance
 * operator context defined in ROLE_AND_CAPABILITY_MATRIX.md.
 *
 * Conforms to #600's acceptance criteria:
 * - No immediate direct role mutation is exposed (GrantRevokePreparationForm
 *   always renders its submit control disabled, with the reason stated).
 * - Timelocked lifecycle and pending changes are explicit
 *   (PendingRoleChangeList distinguishes queued-but-unscheduled from
 *   executable-after-timestamp).
 * - Stale role evidence fails closed (manifestUnavailable renders the
 *   explicit RoleAdministrationUnavailableState boundary; no list ever
 *   shows fixture or inferred data).
 *
 * Per ROLE_AND_CAPABILITY_MATRIX.md's canonical mapping rule: roles may only
 * be sourced from pinned contracts. Until the versioned release manifest
 * (STAB-FE-005 / #560) is published and verified, there is no legitimate
 * source for this data, so every shape here can resolve to `unavailable`,
 * and no production code may synthesize a role from a hardcoded name or
 * fixture.
 *
 * Per ADMIN_AUTHORITY_BOUNDARY.md's implementation approval rule, this
 * screen defaults to the unavailable boundary because #600 does not (yet)
 * link the exact contract function, authorization check, audit event and
 * release-manifest field a mutation-capable implementation requires. When
 * STAB-FE-005 (#560) publishes a verified manifest, wire the real data
 * into useRoleAdministrationData — this component's rendering logic does
 * not need to change.
 */
import { useState } from 'react';
import { RefreshCw, ShieldOff } from 'lucide-react';
import { useRoleAdministrationData, type UseRoleAdministrationDataReturn } from '@/hooks/useRoleAdministrationData';
import { RoleAdministrationUnavailableState } from './RoleAdministrationUnavailableState';
import { RoleMemberList } from './RoleMemberList';
import { PendingRoleChangeList } from './PendingRoleChangeList';
import { SeparationOfDutyNotice } from './SeparationOfDutyNotice';
import { AuthoritySourceSummary } from './AuthoritySourceSummary';
import { GrantRevokePreparationForm } from './GrantRevokePreparationForm';
export type GovernanceSurfaceState =
  | 'loading' | 'empty' | 'stale' | 'offline' | 'unavailable'
  | 'error' | 'denied' | 'not-found' | 'wrong-chain'
  | 'changed-account' | 'changed-release'
  | 'revoked-authority' | 'expired-authority';

export type GovernanceMutationState =
  | 'idle' | 'submitting' | 'success' | 'error';
/** Applicable-surface states per FRONTEND_IMPLEMENTATION_MATRIX.md. */
export type GovernanceSurfaceState =
  | 'loading'
  | 'empty'
  | 'stale'
  | 'offline'
  | 'unavailable'
  | 'error'
  | 'denied'
  | 'not-found'
  | 'wrong-chain'
  | 'changed-account'
  | 'changed-release'
  | 'revoked-authority'
  | 'expired-authority';

/** Mutation-capable composition states per FRONTEND_IMPLEMENTATION_MATRIX.md. */
export type GovernanceMutationState =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'error';

export interface RoleAdministrationProps {
  className?: string;
  testDataOverride?: UseRoleAdministrationDataReturn;
}

export function RoleAdministration({ className = '', testDataOverride }: RoleAdministrationProps) {
  if (testDataOverride) {
    return <RoleAdministrationContent className={className} data={testDataOverride} />;
  }
  return <RoleAdministrationConnected className={className} />;
}

function RoleAdministrationConnected({ className = '' }: { className?: string }) {
  const hookData = useRoleAdministrationData();
  return <RoleAdministrationContent className={className} data={hookData} />;
}

export interface RoleAdministrationContentProps {
  className?: string;
  data: UseRoleAdministrationDataReturn;
}

export function RoleAdministrationContent({ className = '', data }: RoleAdministrationContentProps) {
  const {
    isAuthorized,
    unauthorizedReason,
    canonicalGovernanceOperatorAddress,
    account,
    manifestUnavailable,
    manifestUnavailableReason,
    members,
    pendingChanges,
    separationWarnings,
    authoritySources,
    prepareDraft,
    refetch,
  } = data;

  const [isRefetching, setIsRefetching] = useState(false);

  // Unauthorized: return the explicit denied state first, same ordering
  // as AdminDashboardContent.
  if (!isAuthorized) {
    return (
      <div className={`space-y-6 ${className}`} data-testid="role-administration-container">
        <div
          role="alert"
          data-testid="role-admin-denied"
          className="flex flex-col items-start gap-2 p-6 rounded-xl border border-destructive/40 bg-destructive/10 text-foreground"
        >
          <div className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-destructive shrink-0" aria-hidden="true" />
            <p className="text-sm font-semibold text-destructive">Access denied</p>
          </div>
          <p className="text-xs text-muted-foreground">{unauthorizedReason}</p>
          {canonicalGovernanceOperatorAddress && (
            <p className="text-xs text-muted-foreground font-mono">
              Required: {canonicalGovernanceOperatorAddress.slice(0, 6)}…
              {canonicalGovernanceOperatorAddress.slice(-4)}
            </p>
          )}
          {account && (
            <p className="text-xs text-muted-foreground font-mono">
              Connected: {account.slice(0, 6)}…{account.slice(-4)}
            </p>
          )}
        </div>
      </div>
    );
  }

  const handleRefetch = async () => {
    setIsRefetching(true);
    try {
      await refetch();
    } finally {
      setIsRefetching(false);
    }
  };

  return (
    <div className={`space-y-8 ${className}`} data-testid="role-administration-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Role administration</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Timelocked governance role membership and grant/revoke preparation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-accent text-foreground transition-colors disabled:opacity-60"
          aria-label="Refresh role administration data"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Sync</span>
        </button>
      </div>

      {manifestUnavailable && manifestUnavailableReason && (
        <RoleAdministrationUnavailableState reason={manifestUnavailableReason} />
      )}

      <section aria-labelledby="role-members-heading" className="space-y-3">
        <h2 id="role-members-heading" className="text-sm font-semibold text-foreground">
          Current membership
        </h2>
        <RoleMemberList members={members} isLoading={false} />
      </section>

      <section aria-labelledby="pending-changes-heading" className="space-y-3">
        <h2 id="pending-changes-heading" className="text-sm font-semibold text-foreground">
          Pending changes
        </h2>
        <PendingRoleChangeList changes={pendingChanges} isLoading={false} />
      </section>

      <section aria-labelledby="separation-of-duty-heading" className="space-y-3">
        <h2 id="separation-of-duty-heading" className="text-sm font-semibold text-foreground">
          Separation of duty
        </h2>
        <SeparationOfDutyNotice warnings={separationWarnings} />
      </section>

      <section aria-labelledby="authority-sources-heading" className="space-y-3">
        <h2 id="authority-sources-heading" className="text-sm font-semibold text-foreground">
          Authority sources
        </h2>
        <AuthoritySourceSummary sources={authoritySources} />
      </section>

      <section aria-labelledby="prepare-change-heading" className="space-y-3">
        <h2 id="prepare-change-heading" className="text-sm font-semibold text-foreground">
          Prepare a change
        </h2>
        <GrantRevokePreparationForm
          disabledReason={
            manifestUnavailableReason ?? 'Submission is unavailable until a pinned contract interface exists.'
          }
          prepareDraft={prepareDraft}
        />
      </section>
    </div>
  );
}
