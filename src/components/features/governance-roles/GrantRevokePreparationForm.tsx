'use client';

/**
 * GrantRevokePreparationForm — UI-FE-030
 *
 * Builds a *typed* grant/revoke draft and validates it locally. Submission
 * is always disabled here — per #600's acceptance criteria ("No immediate
 * direct role mutation is exposed") and the Action-to-interface gate for
 * governance in FRONTEND_IMPLEMENTATION_MATRIX.md ("No arbitrary call
 * composition" until pinned). This form exists so the operator can see and
 * review exactly what a change would contain before any contract interface
 * exists to submit it against — not to perform the mutation.
 */
import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import type { GrantRevokeDraft } from '@/app/types/governance-roles';

export interface GrantRevokePreparationFormProps {
  disabledReason: string;
  prepareDraft: (input: { action: 'grant' | 'revoke'; roleId: string | null; address: string }) => GrantRevokeDraft;
}

export function GrantRevokePreparationForm({ disabledReason, prepareDraft }: GrantRevokePreparationFormProps) {
  const [action, setAction] = useState<'grant' | 'revoke'>('grant');
  const [address, setAddress] = useState('');
  const [draft, setDraft] = useState<GrantRevokeDraft | null>(null);

  const handlePreview = (event: FormEvent) => {
    event.preventDefault();
    setDraft(prepareDraft({ action, roleId: null, address }));
  };

  return (
    <form
      onSubmit={handlePreview}
      className="space-y-4 p-4 rounded-xl border border-border bg-card"
      data-testid="grant-revoke-preparation-form"
    >
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">Prepare a role change</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="role-change-action" className="block text-xs font-medium text-muted-foreground mb-1">
            Action
          </label>
          <select
            id="role-change-action"
            value={action}
            onChange={(event) => setAction(event.target.value as 'grant' | 'revoke')}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="grant">Grant</option>
            <option value="revoke">Revoke</option>
          </select>
        </div>
        <div>
          <label htmlFor="role-change-address" className="block text-xs font-medium text-muted-foreground mb-1">
            Address
          </label>
          <input
            id="role-change-address"
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="0x…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-mono"
          />
        </div>
      </div>

      <button
        type="submit"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold hover:bg-accent text-foreground transition-colors"
      >
        Preview draft
      </button>

      {draft && (
        <div
          data-testid="grant-revoke-draft-preview"
          className="p-3 rounded-lg border border-border bg-background text-xs space-y-1"
        >
          <p className="font-semibold text-foreground">
            {draft.action === 'grant' ? 'Grant' : 'Revoke'} — role not yet resolvable
          </p>
          <p className="font-mono text-muted-foreground">{draft.address || '(no address entered)'}</p>
          {draft.warnings.length > 0 && (
            <ul className="list-disc list-inside text-amber-500">
              {draft.warnings.map((warning) => (
                <li key={warning.id}>{warning.summary}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        role="status"
        data-testid="grant-revoke-submit-disabled"
        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background"
      >
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title={disabledReason}
          className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground cursor-not-allowed opacity-60"
        >
          Submit unavailable
        </button>
      </div>
    </form>
  );
}
