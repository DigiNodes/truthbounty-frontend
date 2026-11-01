/**
 * UI-FE-019 — Verification decision and authorization UI.
 *
 * Design authority: boards 05 (verification decision) and 06 (verification
 * authorize/reveal) of the approved verifier/dispute package, as reconciled by
 * the Frontend Implementation Matrix and the verifier/dispute screen
 * authority.
 *
 * Rules this component implements:
 *  - Only the verdicts the pinned ABI supports are offered. The pinned
 *    interface encodes `VerificationVerdict` as TRUE = 0 / FALSE = 1, so no
 *    abstain choice is invented.
 *  - The exact callable and its arguments are shown before anything is
 *    signed, so the wallet prompt can be reviewed against the contract.
 *  - Commit/reveal controls are rendered unavailable unless the pinned release
 *    exposes the matching entrypoint. The pinned release exposes a direct
 *    vote only, so this decision is broadcast and is never described as
 *    secret.
 *  - The authorization fails closed: an unpinned release, a failed
 *    simulation, a closed phase, a missing or wrong-chain wallet, a stake
 *    below the contract minimum, an in-flight transaction or a missing
 *    verdict each disable the action and state the reason.
 *  - Protected rationale stays local until the canonical phase permits it.
 */

'use client';

import { useId, useState } from 'react';

import { TransactionStatusBadge } from '@/components/transactions/TransactionStatusBadge';
import { isTerminal } from '@/lib/transaction-machine';

import {
  commitRevealAvailable,
  SUBMIT_VERIFICATION_FUNCTION,
  SUBMIT_VERIFICATION_SIGNATURE,
} from './abi-support';
import {
  VERDICT_CHOICES,
  VERDICT_ENCODING,
  VERDICT_LABELS,
  type AuthorizationBlocker,
  type AuthorizationReview,
  type ReleaseState,
  type SimulationState,
  type VerdictChoice,
  type VerificationDecisionContext,
  type WalletState,
} from './types';

export interface VerificationDecisionPanelProps {
  /** Contract-derived context of the verification being decided. */
  context: VerificationDecisionContext;
  /** Pinned deployment release backing the callable interface. */
  release: ReleaseState;
  /** Simulation result for the exact call shown in the review. */
  simulation: SimulationState;
  /** Wallet connection state. */
  wallet: WalletState;
  /** Private working notes. They are never published by the pinned release. */
  rationale?: string;
  /** Whether the canonical phase permits the protected rationale to be shown. */
  rationaleVisible: boolean;
  /** Invoked only when every gate has passed. */
  onAuthorize?: (review: AuthorizationReview) => void;
}

/**
 * Compares two non-negative integer strings without relying on BigInt, so the
 * comparison stays exact for token amounts of any size.
 */
export function compareDecimalStrings(a: string, b: string): number {
  const normalize = (value: string): string => {
    const trimmed = value.trim().replace(/^0+(?=\d)/, '');
    return trimmed === '' ? '0' : trimmed;
  };
  const left = normalize(a);
  const right = normalize(b);
  if (left.length !== right.length) {
    return left.length < right.length ? -1 : 1;
  }
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function walletChainId(wallet: WalletState): number | null {
  if (wallet.status === 'connected') {
    return wallet.chainId;
  }
  if (wallet.status === 'wrong-chain') {
    return wallet.chainId;
  }
  return null;
}

function walletAccount(wallet: WalletState): string | null {
  return wallet.status === 'connected' ? wallet.account : null;
}

export function VerificationDecisionPanel({
  context,
  release,
  simulation,
  wallet,
  rationale,
  rationaleVisible,
  onAuthorize,
}: VerificationDecisionPanelProps) {
  const baseId = useId();
  const blockersId = `${baseId}-blockers`;
  const [verdict, setVerdict] = useState<VerdictChoice | null>(null);

  const stakeTooSmall =
    compareDecimalStrings(context.stakeAmount, context.minStake) < 0;
  const transactionInFlight =
    context.txStatus !== 'idle' && !isTerminal(context.txStatus);

  const blockers: AuthorizationBlocker[] = [];
  if (release.status !== 'pinned') {
    blockers.push({
      code: 'release-unpinned',
      message:
        'The protocol release is not pinned, so no contract call can be authorized.',
    });
  }
  if (simulation.status === 'failed') {
    blockers.push({
      code: 'simulation-failed',
      message: `The transaction simulation failed: ${simulation.reason}`,
    });
  }
  if (context.phase === 'closed') {
    blockers.push({
      code: 'phase-closed',
      message: 'The verification round is closed; no decision can be submitted.',
    });
  }
  if (wallet.status === 'disconnected') {
    blockers.push({
      code: 'wallet-disconnected',
      message: 'Connect a wallet before authorizing a decision.',
    });
  }
  if (wallet.status === 'wrong-chain') {
    blockers.push({
      code: 'wrong-chain',
      message: `Switch to chain ${wallet.expectedChainId} before authorizing a decision.`,
    });
  }
  if (stakeTooSmall) {
    blockers.push({
      code: 'stake-below-minimum',
      message: `The stake must be at least ${context.minStake} base units.`,
    });
  }
  if (transactionInFlight) {
    blockers.push({
      code: 'transaction-in-flight',
      message: 'A decision is already in flight; wait for it to settle.',
    });
  }
  if (verdict === null) {
    blockers.push({
      code: 'no-verdict-selected',
      message: 'Select a decision before authorizing.',
    });
  }

  const review: AuthorizationReview = {
    functionName: SUBMIT_VERIFICATION_FUNCTION,
    signature: SUBMIT_VERIFICATION_SIGNATURE,
    args: [
      { name: 'claimId', type: 'uint256', value: context.claimId },
      {
        name: 'verdict',
        type: 'uint8',
        value: verdict === null ? '—' : String(VERDICT_ENCODING[verdict]),
      },
      { name: 'stakeAmount', type: 'uint256', value: context.stakeAmount },
    ],
    target: context.target,
    chainId: walletChainId(wallet),
    account: walletAccount(wallet),
    verdict,
    verdictEncoding: verdict === null ? null : VERDICT_ENCODING[verdict],
    stakeAmount: context.stakeAmount,
  };

  const canAuthorize = blockers.length === 0;

  return (
    <section
      aria-labelledby={`${baseId}-heading`}
      className="space-y-4 rounded-lg border p-4"
      data-testid="verification-decision-panel"
    >
      <h2 id={`${baseId}-heading`} className="text-lg font-semibold">
        Verification decision
      </h2>

      <p className="text-sm">
        Claim <span data-testid="decision-claim-id">{context.claimId}</span> ·
        phase {context.phase} · deadline {context.deadlineIso}
      </p>

      <fieldset className="space-y-2">
        <legend className="font-medium">Your decision</legend>
        {VERDICT_CHOICES.map((choice) => (
          <label key={choice} className="flex items-center gap-2">
            <input
              type="radio"
              name={`${baseId}-verdict`}
              value={choice}
              checked={verdict === choice}
              onChange={() => setVerdict(choice)}
            />
            <span>{VERDICT_LABELS[choice]}</span>
            <span className="text-xs opacity-70">
              (verdict {VERDICT_ENCODING[choice]})
            </span>
          </label>
        ))}
      </fieldset>

      <section aria-labelledby={`${baseId}-review-heading`}>
        <h3 id={`${baseId}-review-heading`} className="font-medium">
          Authorization review
        </h3>
        <dl className="mt-2 space-y-1 text-sm">
          <div>
            <dt className="inline font-medium">Function: </dt>
            <dd className="inline" data-testid="review-signature">
              <code>{review.signature}</code>
            </dd>
          </div>
          {review.args.map((arg) => (
            <div key={arg.name}>
              <dt className="inline font-medium">{arg.name}: </dt>
              <dd className="inline" data-testid={`review-arg-${arg.name}`}>
                <code>
                  {arg.type} {arg.value}
                </code>
              </dd>
            </div>
          ))}
          <div>
            <dt className="inline font-medium">Target: </dt>
            <dd className="inline" data-testid="review-target">
              <code>{context.target ?? 'not pinned'}</code>
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">Chain: </dt>
            <dd className="inline" data-testid="review-chain">
              <code>{review.chainId ?? 'not connected'}</code>
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">Account: </dt>
            <dd className="inline" data-testid="review-account">
              <code>{review.account ?? 'not connected'}</code>
            </dd>
          </div>
        </dl>
      </section>

      {commitRevealAvailable() ? null : (
        <p
          data-testid="commit-reveal-unavailable"
          className="rounded border p-3 text-sm"
        >
          Commit and reveal are unavailable: the pinned release exposes a
          direct vote only, so this decision is broadcast on chain and is
          never described as secret.
        </p>
      )}

      <section aria-labelledby={`${baseId}-rationale-heading`}>
        <h3 id={`${baseId}-rationale-heading`} className="font-medium">
          Rationale
        </h3>
        {rationaleVisible ? (
          <p data-testid="rationale-visible">{rationale ?? ''}</p>
        ) : (
          <p data-testid="rationale-sealed" className="text-sm">
            Your rationale stays local. The pinned release does not commit it,
            so it is never published.
          </p>
        )}
      </section>

      <div className="flex items-center gap-3">
        <TransactionStatusBadge status={context.txStatus} />
        <button
          type="button"
          disabled={!canAuthorize}
          onClick={() => onAuthorize?.(review)}
          data-testid="authorize-decision"
        >
          Authorize decision
        </button>
      </div>

      {blockers.length > 0 ? (
        <div role="alert" aria-labelledby={blockersId} data-testid="blockers">
          <h3 id={blockersId} className="font-medium">
            Authorization unavailable
          </h3>
          <ul className="list-disc pl-5 text-sm">
            {blockers.map((blocker) => (
              <li key={blocker.code}>{blocker.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
