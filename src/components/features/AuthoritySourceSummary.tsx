'use client';

/**
 * AuthoritySourceSummary — UI-FE-030
 *
 * Shows where each piece of role data is allowed to come from, per
 * FRONTEND_IMPLEMENTATION_MATRIX.md's canonical source classes table.
 * "Every production field must identify a source class in fixtures and
 * adapters" — this makes that identification visible to the operator
 * rather than just enforced internally.
 */
import type { GovernanceAuthoritySource, GovernanceSourceClass } from '@/app/types/governance-roles';

const SOURCE_LABEL: Record<GovernanceSourceClass, string> = {
  'pinned-contract': 'Pinned contract',
  'fresh-api-projection': 'Fresh API projection',
  'verified-release-manifest': 'Verified release manifest',
  'wallet-session-local': 'Wallet / session / local',
  'approved-content': 'Approved content',
};

export interface AuthoritySourceSummaryProps {
  sources: readonly GovernanceAuthoritySource[];
}

export function AuthoritySourceSummary({ sources }: AuthoritySourceSummaryProps) {
  return (
    <div
      data-testid="authority-source-summary"
      className="rounded-xl border border-border bg-card overflow-x-auto"
    >
      <table className="w-full text-left text-xs">
        <caption className="sr-only">
          Allowed source class and availability for each displayed role field
        </caption>
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">
              Field
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Source class
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Availability
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-3 py-4 text-muted-foreground">
                No source classes are declared for this screen.
              </td>
            </tr>
          ) : (
            sources.map((source) => (
              <tr
                key={`${source.field}:${source.source}`}
                className="border-b border-border last:border-0"
              >
                <th scope="row" className="px-3 py-2 font-medium text-foreground">
                  {source.field}
                </th>
                <td className="px-3 py-2 text-muted-foreground">
                  {SOURCE_LABEL[source.source]}
                </td>
                <td className="px-3 py-2">
                  {source.unavailableReason ? (
                    <span className="text-muted-foreground">{source.unavailableReason}</span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">Available</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
