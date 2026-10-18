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
            <th scope="col" className="p-3 font-semibold">
              Field
            </th>
            <th scope="col" className="p-3 font-semibold">
              Source
            </th>
            <th scope="col" className="p-3 font-semibold">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.map((entry) => (
            <tr key={entry.field} className="border-b border-border last:border-0">
              <td className="p-3 font-medium text-foreground">{entry.field}</td>
              <td className="p-3 text-muted-foreground">{SOURCE_LABEL[entry.source]}</td>
              <td className="p-3 text-muted-foreground">
                {entry.unavailableReason ? (
                  <span className="text-amber-500">{entry.unavailableReason}</span>
                ) : (
                  <span>Available</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
