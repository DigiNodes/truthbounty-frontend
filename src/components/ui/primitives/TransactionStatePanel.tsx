'use client';

import * as React from 'react';
import { ExternalLink } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';

export type TransactionUiState =
  | 'idle'
  | 'validating'
  | 'awaiting-signature'
  | 'rejected'
  | 'submitted'
  | 'replaced'
  | 'reverted'
  | 'confirmed'
  | 'finalized'
  | 'projection-lag'
  | 'reorged'
  | 'unavailable';

type BadgeTone =
  | 'neutral'
  | 'pending'
  | 'confirmed'
  | 'finalized'
  | 'orphaned'
  | 'warning'
  | 'danger'
  | 'info';

interface TransactionStateDefinition {
  label: string;
  description: string;
  tone: BadgeTone;
}

export const TRANSACTION_STATE_DEFINITIONS: Record<
  TransactionUiState,
  TransactionStateDefinition
> = {
  idle: {
    label: 'Ready',
    description: 'No transaction has been started.',
    tone: 'neutral',
  },
  validating: {
    label: 'Validating',
    description: 'Required chain, account, capability and simulation checks are running.',
    tone: 'pending',
  },
  'awaiting-signature': {
    label: 'Awaiting signature',
    description: 'Review the wallet request. No transaction has been submitted yet.',
    tone: 'pending',
  },
  rejected: {
    label: 'Rejected',
    description: 'The wallet or provider rejected authorization. No success is recorded.',
    tone: 'warning',
  },
  submitted: {
    label: 'Submitted',
    description: 'The provider accepted a transaction hash. Protocol success is not yet confirmed.',
    tone: 'info',
  },
  replaced: {
    label: 'Replaced',
    description: 'The original transaction was replaced or cancelled. Follow the canonical replacement.',
    tone: 'warning',
  },
  reverted: {
    label: 'Reverted',
    description: 'Execution failed. The originating input may still be recoverable.',
    tone: 'danger',
  },
  confirmed: {
    label: 'Confirmed',
    description: 'A receipt was observed at the configured confirmation level; this may not be final settlement.',
    tone: 'confirmed',
  },
  finalized: {
    label: 'Finalized',
    description: 'The canonical finality threshold was reached.',
    tone: 'finalized',
  },
  'projection-lag': {
    label: 'Indexer delayed',
    description: 'Chain evidence exists, but the API projection has not caught up.',
    tone: 'warning',
  },
  reorged: {
    label: 'Reorged',
    description: 'Previously observed chain state is no longer canonical and is being reconciled.',
    tone: 'orphaned',
  },
  unavailable: {
    label: 'Unavailable',
    description: 'A required provider, API, configuration or release artifact is unavailable.',
    tone: 'danger',
  },
};

export interface TransactionStatePanelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  state: TransactionUiState;
  title?: React.ReactNode;
  transactionHash?: string;
  receiptUrl?: string;
  replacementHash?: string;
  confirmations?: number;
  sourceLabel?: string;
  updatedAtLabel?: string;
  details?: React.ReactNode;
}

function shortenHash(hash: string) {
  if (hash.length <= 18) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

/**
 * Canonical transaction/projection presentation from Gate C.
 *
 * This component is deliberately presentational: callers must supply state
 * resolved from canonical chain/API evidence. It never advances state on a
 * timer and never treats a hash, click or API projection as protocol success.
 */
export function TransactionStatePanel({
  state,
  title = 'Transaction status',
  transactionHash,
  receiptUrl,
  replacementHash,
  confirmations,
  sourceLabel,
  updatedAtLabel,
  details,
  className,
  ...rest
}: TransactionStatePanelProps) {
  const definition = TRANSACTION_STATE_DEFINITIONS[state];

  return (
    <Card
      data-slot="transaction-state-panel"
      data-state={state}
      className={cn('p-5', className)}
      role={state === 'reverted' || state === 'reorged' || state === 'unavailable' ? 'alert' : 'status'}
      aria-live="polite"
      {...rest}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="tb-section text-ink">{title}</h2>
          <p className="tb-small max-w-2xl text-ink-secondary">
            {definition.description}
          </p>
        </div>
        <StatusBadge
          label={definition.label}
          tone={definition.tone}
          live
          description={definition.description}
        />
      </div>

      {(transactionHash ||
        replacementHash ||
        confirmations !== undefined ||
        sourceLabel ||
        updatedAtLabel) && (
        <dl className="mt-4 grid gap-3 border-t border-divider pt-4 text-sm sm:grid-cols-2">
          {transactionHash ? (
            <div>
              <dt className="tb-label text-ink-muted">Transaction</dt>
              <dd className="mt-1 font-mono text-ink">
                {receiptUrl ? (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-action underline-offset-4 hover:underline"
                    aria-label={`Open transaction ${transactionHash} in the block explorer`}
                  >
                    {shortenHash(transactionHash)}
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                ) : (
                  shortenHash(transactionHash)
                )}
              </dd>
            </div>
          ) : null}
          {replacementHash ? (
            <div>
              <dt className="tb-label text-ink-muted">Canonical replacement</dt>
              <dd className="mt-1 font-mono text-ink">{shortenHash(replacementHash)}</dd>
            </div>
          ) : null}
          {confirmations !== undefined ? (
            <div>
              <dt className="tb-label text-ink-muted">Confirmations observed</dt>
              <dd className="tb-data mt-1 text-ink">{confirmations}</dd>
            </div>
          ) : null}
          {sourceLabel ? (
            <div>
              <dt className="tb-label text-ink-muted">Evidence source</dt>
              <dd className="mt-1 text-ink">{sourceLabel}</dd>
            </div>
          ) : null}
          {updatedAtLabel ? (
            <div>
              <dt className="tb-label text-ink-muted">Last reconciled</dt>
              <dd className="mt-1 text-ink">{updatedAtLabel}</dd>
            </div>
          ) : null}
        </dl>
      )}

      {details ? <div className="mt-4 border-t border-divider pt-4">{details}</div> : null}
    </Card>
  );
}

export default TransactionStatePanel;
