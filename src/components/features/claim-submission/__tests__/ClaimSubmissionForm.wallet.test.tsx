import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// --- Mocks ----------------------------------------------------------------

// Hooks the form depends on.
let mockAccount: { address: string; displayName: string } | null = null;
const mockSetAllowed = jest.fn();
const mockMutateAsync = jest.fn();

jest.mock('@/hooks/useAccount', () => ({
  useAccount: () => mockAccount,
}));

jest.mock('@/components/hooks/useTrust', () => ({
  useTrust: () => ({
    reputation: 100,
    accountAgeDays: 365,
    isVerified: true,
    suspicious: false,
  }),
}));

jest.mock('@/components/ui/TrustScoreTooltip', () => ({
  __esModule: true,
  default: () => <span data-testid="trust-tooltip" />,
}));

jest.mock('@/app/queries/claims.queries', () => ({
  useSubmitClaim: () => ({
    mutateAsync: mockMutateAsync,
    isLoading: false,
  }),
}));

jest.mock('@stellar/freighter-api', () => ({
  setAllowed: (...args: unknown[]) => mockSetAllowed(...args),
}));

// Imported AFTER mocks.
import ClaimSubmissionForm from '../ClaimSubmissionForm';

const CONNECTED = { address: 'GABCDEF1234567890', displayName: 'GABC...7890' };

function fillValidForm() {
  fireEvent.change(screen.getByPlaceholderText('Title'), {
    target: { value: 'A real claim title' },
  });
  fireEvent.change(screen.getByPlaceholderText('Category'), {
    target: { value: 'Politics' },
  });
  fireEvent.change(screen.getByPlaceholderText('Impact'), {
    target: { value: 'High' },
  });
  fireEvent.change(screen.getByPlaceholderText('Source'), {
    target: { value: 'https://example.com/source' },
  });
  fireEvent.change(screen.getByPlaceholderText('Description'), {
    target: { value: 'A sufficiently long description.' },
  });
}

beforeEach(() => {
  mockAccount = null;
  mockSetAllowed.mockReset();
  mockMutateAsync.mockReset();
  mockMutateAsync.mockResolvedValue(undefined);
});

// --- Tests ----------------------------------------------------------------

describe('ClaimSubmissionForm - wallet gate', () => {
  it('shows the Connect Wallet banner when no wallet is connected', () => {
    mockAccount = null;
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    expect(screen.getByTestId('connect-wallet-banner')).toBeInTheDocument();
    expect(screen.getByTestId('connect-wallet-button')).toBeInTheDocument();
  });

  it('hides the Connect Wallet banner when a wallet is connected', () => {
    mockAccount = CONNECTED;
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    expect(screen.queryByTestId('connect-wallet-banner')).not.toBeInTheDocument();
  });

  it('disables the submit button while the wallet is disconnected', () => {
    mockAccount = null;
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    const submit = screen.getByTestId('submit-claim-button');
    expect(submit).toBeDisabled();
    expect(submit).toHaveTextContent(/connect wallet to submit/i);
  });

  it('enables the submit button once a wallet is connected', () => {
    mockAccount = CONNECTED;
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    const submit = screen.getByTestId('submit-claim-button');
    expect(submit).not.toBeDisabled();
    expect(submit).toHaveTextContent(/^submit$/i);
  });

  it('triggers Freighter setAllowed when the Connect Wallet button is clicked', () => {
    mockAccount = null;
    render(<ClaimSubmissionForm onClose={jest.fn()} />);
    fireEvent.click(screen.getByTestId('connect-wallet-button'));
    expect(mockSetAllowed).toHaveBeenCalledTimes(1);
  });
});

describe('ClaimSubmissionForm - submit guard', () => {
  it('does NOT call the submit mutation when no wallet is connected', async () => {
    mockAccount = null;
    const onClose = jest.fn();
    render(<ClaimSubmissionForm onClose={onClose} />);

    fillValidForm();
    fireEvent.submit(screen.getByTestId('submit-claim-button').closest('form')!);

    await waitFor(() => {
      // An inline error must be shown to the user.
      expect(
        screen.getByText(/connect your wallet before submitting/i)
      ).toBeInTheDocument();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls the submit mutation when the wallet is connected and form is valid', async () => {
    mockAccount = CONNECTED;
    const onClose = jest.fn();
    const onSubmit = jest.fn();
    render(<ClaimSubmissionForm onSubmit={onSubmit} onClose={onClose} />);

    fillValidForm();
    fireEvent.submit(screen.getByTestId('submit-claim-button').closest('form')!);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      title: 'A real claim title',
      category: 'Politics',
      impact: 'High',
      source: 'https://example.com/source',
      description: 'A sufficiently long description.',
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Protocol invariant: submit-allowed ⇔ wallet-connected', () => {
  const cases: Array<[string, typeof CONNECTED | null, boolean]> = [
    ['no wallet', null, false],
    ['connected wallet', CONNECTED, true],
  ];

  test.each(cases)(
    '%s ⇒ submit enabled = %p AND mutation runs = %p',
    async (_label, account, expectEnabled) => {
      mockAccount = account;
      render(<ClaimSubmissionForm onClose={jest.fn()} />);

      const submit = screen.getByTestId('submit-claim-button');

      // UI invariant
      if (expectEnabled) {
        expect(submit).not.toBeDisabled();
      } else {
        expect(submit).toBeDisabled();
        expect(screen.getByTestId('connect-wallet-banner')).toBeInTheDocument();
      }

      // Behavioural invariant: mutation only runs when wallet is connected.
      fillValidForm();
      fireEvent.submit(submit.closest('form')!);

      if (expectEnabled) {
        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
      } else {
        // Give the handler a tick to (not) run.
        await Promise.resolve();
        expect(mockMutateAsync).not.toHaveBeenCalled();
      }
    }
  );
});
