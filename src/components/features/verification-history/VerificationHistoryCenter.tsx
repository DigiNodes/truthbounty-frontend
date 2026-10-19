'use client';

import React, { useId, useState } from 'react';
import Link from 'next/link';
import { Card, StatusBadge, TokenAmount } from '@/components/ui/primitives';
import { APP_ROUTES } from '@/config/navigation';
import { CenterFrame } from '@/components/features/rewards-center/CenterFrame';
import type { CenterTransaction } from '@/lib/transaction-machine/recovery-references';
import {
  displayOutcome,
  outcomeExplanations,
  sourceLabel,
  outcomeTone,
  VERIFICATION_HISTORY_OUTCOMES,
  type VerificationHistoryData,
  type VerificationHistoryEntry,
} from './model';
import styles from './verification-history-center.module.css';

export function VerificationHistoryCenter({
  data,
  transactions = [],
  recoveryUnavailable = false,
  onRefresh,
  refreshingDisabled,
}: {
  data: VerificationHistoryData;
  transactions?: readonly import('@/lib/transaction-machine/recovery-references').CenterTransaction[];
  recoveryUnavailable?: boolean;
  onRefresh?: () => void;
  refreshingDisabled?: boolean;
}) {
  const [outcome, setOutcome] = useState('all');
  const filterId = useId();
  const reasonId = useId();
  const entries = data.entries.filter(
    (entry) => outcome === 'all' || displayOutcome(entry) === outcome,
  );

  return (
    <CenterFrame
      page="verifications"
      state={data.state}
      onRefresh={onRefresh}
      refreshingDisabled={refreshingDisabled}
    >
      <div className={styles.summary} aria-label="Verification outcomes">
        {VERIFICATION_HISTORY_OUTCOMES.slice(0, 4).map((status) => {
          const matching = data.entries.filter(
            (entry) => displayOutcome(entry) === status,
          );
          return (
            <Card key={status} className="p-4 min-w-0">
              <h2 className="tb-small font-semibold capitalize">{status.replace('-', ' ')}</h2>
              <p className="mt-3 text-xl font-semibold">
                {matching.length === 1 && matching[0].amount !== null ? (
                  <TokenAmount amount={matching[0].amount} />
                ) : matching.length ? (
                  String(matching.length) + ' entries'
                ) : status === 'awaiting-reveal' && data.state === 'empty' ? (
                  'No entries'
                ) : (
                  'Unavailable'
                )}
              </p>
              <p className="tb-small mt-2 text-ink-secondary">
                {matching.length === 1 && matching[0].amount !== null
                  ? 'Asset: ' + matching[0].asset + ' · '
                  : ''}
                {outcomeExplanations[status]}
              </p>
            </Card>
          );
        })}
      </div>
      <div className={styles.columns}>
        <Card
          className="p-4 sm:p-6 min-w-0"
          role="region"
          aria-label="Verification history entries"
        >
          <div className={styles.listHeader}>
            <h2 className="tb-section">Verification history</h2>
            <div>
              <label htmlFor={filterId} className="tb-small mr-2">
                Outcome
              </label>
              <select
                id={filterId}
                className={styles.control}
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
              >
                <option value="all">All outcomes</option>
                {VERIFICATION_HISTORY_OUTCOMES.map((status) => (
                  <option key={status} value={status}>
                    {status.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="tb-small text-ink-secondary mt-2">
            Each amount retains its asset and source. Estimates never establish
            a withdrawable balance.
          </p>
          <p className="tb-small text-ink-secondary mt-2">
            {data.receivedAt
              ? `API response received ${new Date(data.receivedAt).toISOString()}. Chain freshness unknown.`
              : 'API freshness unavailable.'}
          </p>
          {data.rejectedCount > 0 && (
            <p role="alert" className="tb-small mt-3">
              Some projection entries were rejected as invalid. Displayed
              estimates are incomplete.
            </p>
          )}
          <div className="mt-4 space-y-3" aria-busy={data.state === 'loading'}>
            {entries.length === 0 ? (
              <p role="status" className="tb-small py-4">
                {data.state === 'loading'
                  ? 'Loading verification history…'
                  : 'No entries for this outcome.'}
              </p>
            ) : (
              entries.map((entry) => (
                <VerificationHistoryEntry key={entry.id} entry={entry} />
              ))
            )}
          </div>
          <div className="mt-6 border-t border-divider pt-4">
            <button
              className={styles.control}
              type="button"
              disabled
              aria-describedby={reasonId}
            >
              Review withdrawal
            </button>
            <p id={reasonId} className="tb-small mt-3 text-ink-secondary">
              Withdrawal unavailable. A pinned adapter must verify contract
              ownership, claimable amount, eligibility, release and simulation
              before authorization.
            </p>
          </div>
        </Card>
        <Card
          className="p-4 sm:p-6 min-w-0"
          role="region"
          aria-label="Pending authorization and recovery"
        >
          <h2 className="tb-section">Pending authorization</h2>
          <p className="tb-small mt-2 mb-4 text-ink-secondary">
            A hash or confirmation does not establish settled funds.
          </p>
          {transactions.length ? (
            transactions
              .slice(0, 2)
              .map((record) => (
                <VerificationTransactionReference key={record.id} record={record} />
              ))
          ) : (
            <p className="tb-small my-4">
              {recoveryUnavailable
                ? 'Browser recovery storage is unavailable. Keep any receipt references you already have.'
                : 'No saved transaction references in this browser.'}
            </p>
          )}
          <Link className={styles.control} href={APP_ROUTES.TRANSACTIONS}>
            Open transaction center
          </Link>
          <p className="tb-small mt-4 border-t border-divider pt-4 text-ink-secondary">
            Recovery states: rejected · replaced · reverted · reorged ·
            projection lag. A rejected signature creates no on-chain
            transaction.
          </p>
        </Card>
      </div>
    </CenterFrame>
  );
}

function VerificationHistoryEntry({
  entry,
}: {
  entry: VerificationHistoryEntry;
}) {
  const outcome = displayOutcome(entry);
  return (
    <article className={styles.entry} aria-label={entry.title}>
      <div className={styles.listHeader}>
        <h3 className="font-semibold capitalize">{entry.title}</h3>
        <StatusBadge
          label={outcome.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')}
          tone={outcomeTone(outcome)}
        />
      </div>
      <p className="mt-3 break-all">
        {entry.amount === null ? (
          'Amount unavailable'
        ) : (
          <TokenAmount amount={entry.amount} />
        )}
      </p>
      <p className="tb-small mt-2 break-all text-ink-secondary">
        Asset: {entry.asset}
      </p>
      <p className="tb-small mt-2 text-ink-secondary">
        {sourceLabel(entry.source)}
      </p>
      {entry.freshness.delayedIndexing && (
        <p className="tb-small mt-2 text-warning" role="status">
          Delayed indexing · projection may lag behind canonical chain state
        </p>
      )}
      {entry.reorgStatus === 'detected' && (
        <p className="tb-small mt-2 text-danger" role="alert">
          Reorg detected · outcome must be reconciled before trusting
        </p>
      )}
      {entry.reorgStatus === 'reconciled' && (
        <p className="tb-small mt-2 text-success">
          Reorg reconciled · canonical outcome confirmed
        </p>
      )}
      <Link
        className={styles.referenceLink}
        href={APP_ROUTES.CLAIM_DETAIL(entry.claimId)}
      >
        View claim{' '}
        <span className="break-all">{entry.claimId}</span>
      </Link>
      <p className="tb-small mt-2 text-ink-secondary">
        Submitted:{' '}
        <time dateTime={entry.submittedAtIso}>
          {new Date(entry.submittedAtIso).toUTCString()}
        </time>
        {entry.finalizedAtIso ? (
          <React.Fragment>
            {' '}Finalized:{' '}
            <time dateTime={entry.finalizedAtIso}>
              {new Date(entry.finalizedAtIso).toUTCString()}
            </time>
          </React.Fragment>
        ) : null}
      </p>
    </article>
  );
}

function VerificationTransactionReference({
  record,
}: {
  record: CenterTransaction;
}) {
  const { state } = record;
  const local = record.source === 'local-reference';
  const chain =
    state.chainId === 10
      ? 'Optimism Mainnet'
      : state.chainId === 11155420
        ? 'Optimism Sepolia'
        : 'Unsupported network';
  return (
    <article className={styles.entry} aria-label={record.label}>
      <h3 className="font-semibold break-words">{record.label}</h3>
      <p className="tb-small text-ink-secondary mt-2">
        {chain} · {local ? 'Local recovery reference' : 'Canonical adapter'}
      </p>
      {local ? (
        <div className="mt-3 space-y-2">
          <StatusBadge label="Reconciliation required" tone="warning" />
          <p className="tb-small">
            Saved state: {state.status}. This browser record is not evidence of
            confirmation, finality or account ownership.
          </p>
        </div>
      ) : (
        <div className={styles.canonicalStatus} data-state={state.status}>
          <p className="tb-small">
            Status: {state.status}
            {state.blockNumber !== null && ` · Receipt block ${String(state.blockNumber)}`}
            {state.confirmations !== null && (
              <React.Fragment> {state.confirmations} confirmations</React.Fragment>
            )}
          </p>
        </div>
      )}
      <details className="mt-3">
        <summary className={styles.control}>
          Recovery details for {record.label}
        </summary>
        <div className="mt-3 space-y-3">
          <p className="tb-small">
            Recovery reference: <code className="break-all">{record.id}</code>
          </p>
          <p className="tb-small text-ink-secondary">
            Account and release must be revalidated. Keep these references when
            reconnecting or changing wallets. Refresh only rereads saved
            references; it never signs, retries or resubmits a transaction.
          </p>
          {state.status === 'reorged' && (
            <p className="tb-small">
              Reorg recovery: prior confirmation must be reconciled against the
              canonical chain before any outcome is trusted.
            </p>
          )}
          {state.status === 'dropped' && (
            <p className="tb-small">
              Dropped recovery: check the nonce and canonical receipt before
              considering a new submission.
            </p>
          )}
        </div>
      </details>
    </article>
  );
}