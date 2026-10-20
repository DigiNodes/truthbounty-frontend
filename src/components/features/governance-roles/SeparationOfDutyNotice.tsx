'use client';

/**
 * SeparationOfDutyNotice — UI-FE-030
 *
 * Read-only authority explanation, explicitly permitted even while the
 * release manifest is unverified (ROLE_AND_CAPABILITY_MATRIX.md's
 * canonical mapping rule: "the UI may render read-only authority
 * explanations"). Content here is principle-level — it explains *why*
 * separation of duty matters for this protocol's governance/guardian
 * contexts, not a specific conflict rule invented for roles that don't
 * exist yet.
 */
import { Info, AlertTriangle, Ban } from 'lucide-react';
import type { SeparationOfDutyWarning } from '@/app/types/governance-roles';

const SEVERITY_ICON = {
  info: Info,
  caution: AlertTriangle,
  blocking: Ban,
} as const;

const SEVERITY_STYLE = {
  info: 'border-border bg-card text-foreground',
  caution: 'border-amber-500/50 bg-amber-500/10 text-foreground',
  blocking: 'border-destructive/40 bg-destructive/10 text-foreground',
} as const;

export interface SeparationOfDutyNoticeProps {
  warnings: readonly SeparationOfDutyWarning[];
}

export function SeparationOfDutyNotice({ warnings }: SeparationOfDutyNoticeProps) {
  if (warnings.length === 0) {
    return (
      <div
        data-testid="separation-of-duty-notice"
        className="p-4 rounded-xl border border-border bg-card text-xs text-muted-foreground"
      >
        <p>
          Per ADMIN_AUTHORITY_BOUNDARY.md: governance, operations and guardian contexts never
          share implied power. Role changes here will be evaluated against separation-of-duty
          rules once a verified release manifest is available — none are fabricated in advance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="separation-of-duty-notice">
      {warnings.map((warning) => {
        const Icon = SEVERITY_ICON[warning.severity];
        return (
          <div
            key={warning.id}
            role={warning.severity === 'blocking' ? 'alert' : 'status'}
            className={`flex items-start gap-3 p-4 rounded-xl border text-xs ${SEVERITY_STYLE[warning.severity]}`}
          >
            <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold">{warning.summary}</p>
              <p className="mt-1 text-muted-foreground">{warning.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
