import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenDispute } from '@/components/features/disputes/OpenDispute';
import { useDisputeSubmission } from '@/hooks/useDisputeSubmission';
import { assertAccessible } from '@/__tests__/utils/axe';
import type { ChallengeWindow } from '@/app/types/dispute';

jest.mock('@/hooks/useDisputeSubmission', () => ({
  useDisputeSubmission: jest.fn(),
}));

const mockedHook = useDisputeSubmission as jest.Mock;

const TX_HASH = `0x${'ab'.repeat(32)}`;
const NOW = BigInt(Math.floor(Date.now() / 1000));

const WINDOW: ChallengeWindow = {
  claimId: 123n,
  deadline: NOW + 86_400n,
  bond: 5n * 10n ** 18n,
  hasOpenChallenge: false,
  isOpen: true,
};

function mockHook(overrides: Record<string, unknown> = {}) {
  mockedHook.mockReturnValue({
    artifact: { isDeployed: true, disabledReasons: [], addresses: {} },
    phase: 'idle',
    error: null,
    challengeWindow: WINDOW,
    balance: 50n * 10n ** 18n,
    lastTxHash: null,
    isLoading: false,
    isConnected: true,
    isWrongNetwork: false,
    submitDispute: jest.fn(),
    refreshState: jest.fn(),
    ...overrides,
  });
}

const REASON = 'the verification signature is invalid';

function renderModal(props: Partial<React.ComponentProps<typeof OpenDispute>> = {}) {
  return render(
    <OpenDispute
      claimId="123"
      isOpen
      onClose={jest.fn()}
      onSuccess={jest.fn()}
      onError={jest.fn()}
      {...props}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHook();
});

describe('OpenDispute', () => {
  it('renders nothing while closed', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the slash/refund risk copy and the on-chain bond terms', () => {
    renderModal();
    expect(
      screen.getByText(/the bond is refunded; if it is rejected the bond may\s+be slashed/i)
    ).toBeInTheDocument();
    expect(screen.getByText('5.0000 tokens')).toBeInTheDocument();
  });

  it('shows an accessible loading state while protocol reads resolve', () => {
    mockHook({ isLoading: true, challengeWindow: null });
    renderModal();
    expect(screen.getByRole('status')).toHaveTextContent(/loading challenge terms/i);
  });

  it('fails closed with an alert when the protocol is not deployed', () => {
    mockHook({
      artifact: {
        isDeployed: false,
        disabledReasons: ['protocol release tag is not pinned'],
        addresses: {},
      },
    });
    renderModal();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/protocol release tag is not pinned/i);
    expect(screen.getByLabelText(/reason for challenge/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /confirm challenge/i })).toBeDisabled();
  });

  it('keeps submit disabled until the reason meets the minimum length', async () => {
    const user = userEvent.setup();
    renderModal();

    const submit = screen.getByRole('button', { name: /confirm challenge/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/reason for challenge/i), REASON);
    expect(submit).toBeEnabled();
  });

  it('moves focus into the dialog on open and closes on Escape', async () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    await screen.findByRole('dialog');
    expect(screen.getByLabelText(/reason for challenge/i)).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('reports the confirmed transaction hash on success', () => {
    mockHook({ phase: 'confirmed', lastTxHash: TX_HASH });
    renderModal();

    expect(
      screen.getByText(/challenge submitted and confirmed on-chain/i)
    ).toBeInTheDocument();
    expect(screen.getByText(TX_HASH)).toBeInTheDocument();
  });

  it('surfaces hook errors and keeps the form available for recovery', async () => {
    const user = userEvent.setup();
    const submitDispute = jest
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Wallet rejected'), { code: 'SUBMISSION_REJECTED' }))
      .mockResolvedValueOnce({ phase: 'confirmed', transactionHash: TX_HASH });
    mockHook({ submitDispute });
    const onError = jest.fn();
    const onSuccess = jest.fn();
    renderModal({ onError, onSuccess });

    await user.type(screen.getByLabelText(/reason for challenge/i), REASON);
    await user.click(screen.getByRole('button', { name: /confirm challenge/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/wallet rejected/i);
    expect(onError).toHaveBeenCalled();

    // Recovery: the form is not stuck busy, so the user can retry.
    const submit = screen.getByRole('button', { name: /confirm challenge/i });
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(onSuccess).toHaveBeenCalledWith(TX_HASH);
  });

  it('has no axe violations when open', async () => {
    const { container } = renderModal();
    await assertAccessible(container);
  });
});
