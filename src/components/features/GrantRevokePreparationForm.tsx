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
import { useId, useState, type FormEvent } from 'react';
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

  const actionId = useId();
  const addressId = useId();

  const handlePreview = (event: FormEvent) => {
    event.preventDefault();
    setDraft(prepareDraft({ action, roleId: null, address: address.trim() }));
  };

  return (
    <form
      onSubmit={handlePreview}
      data-testid="grant-revoke-preparation-form"
      className="flex flex-col gap-4 p-6 rounded-xl border border-border bg-card text-foreground"
    >
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <h2 className="text-sm font-semibold">Prepare a grant/revoke draft</h2>
      </div>

      <p
        role="status"
        data-testid="grant-revoke-disabled-reason"
        className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground"
      >
        {disabledReason}
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor={actionId} className="text-xs font-medium text-foreground">
          Action
        </label>
        <select
          id={actionId}
          value={action}
          onChange={(event) =>
            setAction(event.target.value === 'revoke' ? 'revoke' : 'grant')
          }
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="grant">Grant</option>
          <option value="revoke">Revoke</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={addressId} className="text-xs font-medium text-foreground">
          Account address
        </label>
        <input
          id={addressId}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="0x…"
          autoComplete="off"
          spellCheck={false}
          className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
        >
          Preview draft
        </button>
        <button
          type="button"
          disabled
          className="rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground"
        >
          Submit (unavailable)
        </button>
      </div>

      {draft && (
        <dl
          data-testid="grant-revoke-draft"
          className="flex flex-col gap-1 rounded-md border border-border p-3 text-xs"
        >
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Action</dt>
            <dd className="font-semibold text-foreground">{draft.action}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="text-foreground">
              {draft.roleId ?? 'Unresolved — no verified release manifest'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Address</dt>
            <dd className="font-mono text-foreground">{draft.address || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Warnings</dt>
            <dd className="text-foreground">
              {draft.warnings.length === 0
                ? 'None reported'
                : draft.warnings.map((warning) => warning.summary).join('; ')}
            </dd>
          </div>
        </dl>
      )}
    </form>
  );
}
