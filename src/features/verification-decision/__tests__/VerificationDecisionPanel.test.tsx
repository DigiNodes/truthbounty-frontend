/**
 * UI-FE-019 — Verification decision and authorization UI.
 *
 * Covers every scoped state of the board 05/06 decision and authorization
 * flow: the supported decision choices, the exact authorization review, the
 * explicit unavailable commit/reveal state, the protected rationale, and every
 * gate that disables the authorization.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { assertAccessible } from '@/__tests__/utils/axe';

import { VerificationDecisionPanel } from '../VerificationDecisionPanel';
import type {
  ReleaseState,
  SimulationState,
  VerificationDecisionContext,
  WalletState,
} from '../types';

const CLAIM_ID = '42';
const MIN_STAKE = '1000000000000000000';
const STAKE = '2000000000000000000';
const TARGET = '0x00000000000000000000000000000000000000aa';
const ACCOUNT = '0x00000000000000000000000000000000000000bb';

const context: VerificationDecisionContext = {
  claimId: CLAIM_ID,
  target: TARGET,
  minStake: MIN_STAKE,
  stakeAmount: STAKE,
  deadlineIso: '2026-10-22T00:00:00.000Z',
  phase: 'commit',
  txStatus: 'idle',
};

const release: ReleaseState = {
  status: 'pinned',
  releaseTag: 'v2.4.0',
  artifactVersion: 'iv-verification-submission@v1.0.0',
};

const simulation: SimulationState = { status: 'passed' };

const wallet: WalletState = {
  status: 'connected',
  account: ACCOUNT,
  chainId: 10,
};

function renderPanel(overrides: {
  context?: Partial<VerificationDecisionContext>;
  release?: ReleaseState;
  simulation?: SimulationState;
  wallet?: WalletState;
  rationale?: string;
  rationaleVisible?: boolean;
  onAuthorize?: (review: unknown) => void;
} = {}) {
  return render(
    <VerificationDecisionPanel
      context={{ ...context, ...(overrides.context ?? {}) }}
      release={overrides.release ?? release}
      simulation={overrides.simulation ?? simulation}
      wallet={overrides.wallet ?? wallet}
      rationale={overrides.rationale ?? 'The evidence supports the claim.'}
      rationaleVisible={overrides.rationaleVisible ?? false}
      onAuthorize={overrides.onAuthorize}
    />
  );
}

describe('VerificationDecisionPanel', () => {
  it('offers only the verdicts the pinned ABI supports', () => {
    renderPanel();

    expect(screen.getByLabelText(/Support the claim/)).toBeTruthy();
    expect(screen.getByLabelText(/Reject the claim/)).toBeTruthy();
    expect(screen.queryByLabelText(/Abstain/i)).toBeNull();
  });

  it('shows the exact callable and its arguments in the review', () => {
    renderPanel();

    expect(screen.getByTestId('review-signature').textContent).toContain(
      'submitVerification(uint256 claimId, uint8 verdict, uint256 stakeAmount)'
    );
    expect(screen.getByTestId('review-arg-claimId').textContent).toContain(
      CLAIM_ID
    );
    expect(screen.getByTestId('review-target').textContent).toContain(TARGET);
    expect(screen.getByTestId('review-chain').textContent).toContain('10');
    expect(screen.getByTestId('review-account').textContent).toContain(ACCOUNT);
  });

  it('renders commit and reveal as unavailable for the pinned release', () => {
    renderPanel();

    expect(screen.getByTestId('commit-reveal-unavailable')).toBeTruthy();
    expect(screen.getByTestId('commit-reveal-unavailable').textContent).toMatch(
      /direct vote only/i
    );
  });

  it('keeps the protected rationale sealed until the phase permits it', () => {
    renderPanel();

    expect(screen.getByTestId('rationale-sealed')).toBeTruthy();
    expect(screen.queryByTestId('rationale-visible')).toBeNull();
    expect(screen.queryByText('The evidence supports the claim.')).toBeNull();
  });

  it('shows the rationale once the canonical phase permits it', () => {
    renderPanel({ rationaleVisible: true });

    expect(screen.getByTestId('rationale-visible').textContent).toBe(
      'The evidence supports the claim.'
    );
  });

  it('disables the authorization while the release is not pinned', () => {
    renderPanel({
      release: { status: 'unpinned', reasons: ['release tag missing'] },
    });

    expect(
      (screen.getByTestId('authorize-decision') as HTMLButtonElement).disabled
    ).toBe(true);
    expect(screen.getByTestId('blockers').textContent).toMatch(/not pinned/i);
  });

  it('disables the authorization when the simulation fails', () => {
    renderPanel({
      simulation: { status: 'failed', reason: 'execution reverted' },
    });

    expect(
      (screen.getByTestId('authorize-decision') as HTMLButtonElement).disabled
    ).toBe(true);
    expect(screen.getByTestId('blockers').textContent).toMatch(
      /execution reverted/
    );
  });

  it('disables the authorization once the phase is closed', () => {
    renderPanel({ context: { phase: 'closed' } });

    expect(
      (screen.getByTestId('authorize-decision') as HTMLButtonElement).disabled
    ).toBe(true);
    expect(screen.getByTestId('blockers').textContent).toMatch(/closed/i);
  });

  it('disables the authorization without a wallet or on the wrong chain', () => {
    const { unmount } = renderPanel({ wallet: { status: 'disconnected' } });
    expect(
      (screen.getByTestId('authorize-decision') as HTMLButtonElement).disabled
    ).toBe(true);
    unmount();

    renderPanel({
      wallet: { status: 'wrong-chain', chainId: 11155420, expectedChainId: 10 },
    });
    expect(
      (screen.getByTestId('authorize-decision') as HTMLButtonElement).disabled
    ).toBe(true);
    expect(screen.getByTestId('blockers').textContent).toMatch(/chain 10/i);
  });

  it('disables the authorization when the stake is below the contract minimum', () => {
    renderPanel({ context: { stakeAmount: '1' } });

    expect(
      (screen.getByTestId('authorize-decision') as HTMLButtonElement).disabled
    ).toBe(true);
    expect(screen.getByTestId('blockers').textContent).toMatch(/at least/i);
  });

  it('disables the authorization while a transaction is in flight', () => {
    renderPanel({ context: { txStatus: 'submitted' } });

    expect(
      (screen.getByTestId('authorize-decision') as HTMLButtonElement).disabled
    ).toBe(true);
    expect(screen.getByTestId('blockers').textContent).toMatch(/in flight/i);
  });

  it('authorizes with the exact review once every gate passes', async () => {
    const user = userEvent.setup();
    const onAuthorize = jest.fn();
    renderPanel({ onAuthorize });

    expect(
      (screen.getByTestId('authorize-decision') as HTMLButtonElement).disabled
    ).toBe(true);

    await user.click(screen.getByLabelText(/Support the claim/));

    expect(
      (screen.getByTestId('authorize-decision') as HTMLButtonElement).disabled
    ).toBe(false);

    await user.click(screen.getByTestId('authorize-decision'));

    expect(onAuthorize).toHaveBeenCalledTimes(1);
    const review = onAuthorize.mock.calls[0][0] as {
      signature: string;
      verdict: string | null;
      verdictEncoding: number | null;
      args: { name: string; value: string }[];
      target: string | null;
    };
    expect(review.signature).toBe(
      'submitVerification(uint256 claimId, uint8 verdict, uint256 stakeAmount)'
    );
    expect(review.verdict).toBe('support');
    expect(review.verdictEncoding).toBe(0);
    expect(review.target).toBe(TARGET);
    const verdictArg = review.args.find((arg) => arg.name === 'verdict');
    expect(verdictArg?.value).toBe('0');
  });

  it('encodes the reject verdict with the pinned enum value', async () => {
    const user = userEvent.setup();
    const onAuthorize = jest.fn();
    renderPanel({ onAuthorize });

    await user.click(screen.getByLabelText(/Reject the claim/));
    await user.click(screen.getByTestId('authorize-decision'));

    const review = onAuthorize.mock.calls[0][0] as {
      verdict: string | null;
      verdictEncoding: number | null;
    };
    expect(review.verdict).toBe('reject');
    expect(review.verdictEncoding).toBe(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPanel();
    await assertAccessible(container);
  });
});
