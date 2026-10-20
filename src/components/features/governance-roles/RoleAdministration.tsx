/**
 * Governance role administration — UI-FE-030
 *
 * Per ROLE_AND_CAPABILITY_MATRIX.md's canonical mapping rule: roles may only
 * be sourced from pinned contracts. Until the versioned release manifest
 * (STAB-FE-005 / #560) is published and verified, there is no legitimate
 * source for this data — so every shape here can resolve to `unavailable`,
 * and no production code may synthesize a role from a hardcoded name or
 * fixture. See ADMIN_AUTHORITY_BOUNDARY.md's implementation approval rule:
 * without an issue linking the exact contract function, authorization
 * check, audit event and release-manifest field, the only approved
 * implementation is an explicit unavailable boundary.
 */
import { AlertTriangle } from 'lucide-react';

import { AuthoritySourceSummary } from '@/components/features/AuthoritySourceSummary';
import { GrantRevokePreparationForm } from '@/components/features/GrantRevokePreparationForm';
import { PendingRoleChangeList } from '@/components/features/PendingRoleChangeList';
import { RoleAdministrationUnavailableState } from '@/components/features/RoleAdministrationUnavailableState';
import { RoleMemberList } from '@/components/features/RoleMemberList';
import { useRoleAdministrationData } from '@/hooks/useRoleAdministrationData';
import type {
  GovernanceMutationState,
  GovernanceSurfaceState,
  RoleAdministrationData,
} from '@/app/types/governance-roles';

export type { GovernanceMutationState, GovernanceSurfaceState };

const UNAUTHORIZED_FALLBACK_REASON =
  'Governance operator authorization has not been established for this session.';

const SURFACE_STATUS_MESSAGE: Partial<Record<GovernanceSurfaceState, string>> = {
  stale: 'Canonical role data is stale. Displayed values are not confirmed current.',
  offline: 'The canonical role source is unreachable. Displayed values may be outdated.',
  error: 'Canonical role data could not be loaded. No fallback data is shown.',
  denied: 'This session is not authorized to read canonical role data.',
  'not-found': 'The canonical role surface could not be found for this release.',
  'wrong-chain': 'The connected network does not match the canonical governance network.',
  'changed-account': 'The connected account changed. Re-establish authority to continue.',
  'changed-release': 'The pinned release changed. Reload canonical role data before acting.',
  'revoked-authority': 'This session’s governance authority has been revoked.',
  'expired-authority': 'This session’s governance authority has expired.',
};

export interface RoleAdministrationContentProps {
  data: RoleAdministrationData;
}

/**
 * Presentational role administration surface. Consumes an already-resolved
 * canonical projection; never fetches or invents role data itself.
 */
export function RoleAdministrationContent({ data }: RoleAdministrationContentProps) {
  if (!data.isAuthorized) {
    return (
      <RoleAdministrationUnavailableState
        reason={data.unauthorizedReason ?? UNAUTHORIZED_FALLBACK_REASON}
      />
    );
  }

  const isLoading = data.surfaceState === 'loading';
  const statusMessage = SURFACE_STATUS_MESSAGE[data.surfaceState];
  const disabledReason =
    data.manifestUnavailableReason ??
    'Role mutation is unavailable until a pinned contract interface and verified release manifest exist.';

  return (
    <div data-testid="role-administration" className="flex flex-col gap-6">
      {data.manifestUnavailable && data.manifestUnavailableReason && (
        <RoleAdministrationUnavailableState reason={data.manifestUnavailableReason} />
      )}

      {statusMessage && (
        <p
          role="alert"
          data-testid="role-administration-status"
          className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-foreground"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{statusMessage}</span>
        </p>
      )}

      {data.separationWarnings.length > 0 && (
        <section aria-labelledby="separation-warnings-heading" className="flex flex-col gap-2">
          <h2
            id="separation-warnings-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Separation-of-duty warnings
          </h2>
          <ul className="flex flex-col gap-2">
            {data.separationWarnings.map((warning) => (
              <li
                key={warning.id}
                className="rounded-xl border border-border bg-card p-4 text-xs text-foreground"
              >
                <p className="font-semibold">{warning.summary}</p>
                <p className="mt-1 text-muted-foreground">{warning.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="role-members-heading" className="flex flex-col gap-2">
        <h2
          id="role-members-heading"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Role membership
        </h2>
        <RoleMemberList members={data.members} isLoading={isLoading} />
      </section>

      <section aria-labelledby="pending-changes-heading" className="flex flex-col gap-2">
        <h2
          id="pending-changes-heading"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Pending changes
        </h2>
        <PendingRoleChangeList changes={data.pendingChanges} isLoading={isLoading} />
      </section>

      <GrantRevokePreparationForm
        disabledReason={disabledReason}
        prepareDraft={data.prepareDraft}
      />

      <section aria-labelledby="authority-sources-heading" className="flex flex-col gap-2">
        <h2
          id="authority-sources-heading"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Authority sources
        </h2>
        <AuthoritySourceSummary sources={data.authoritySources} />
      </section>
    </div>
  );
}

/**
 * Container that wires the canonical role-administration hook into the
 * presentational surface.
 */
export function RoleAdministration() {
  const data = useRoleAdministrationData();
  return <RoleAdministrationContent data={data} />;
}
