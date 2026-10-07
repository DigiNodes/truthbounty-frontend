import { render, screen } from '@testing-library/react';

import { StatePanel } from '../StatePanel';
import { TransactionStatePanel } from '../TransactionStatePanel';

describe('Gate C state primitives', () => {
  it('announces blocking errors without implying success', () => {
    render(
      <StatePanel
        kind="unavailable"
        title="Release unavailable"
        description="Mutations fail closed."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Mutations fail closed.');
  });

  it('marks loading state as busy', () => {
    render(
      <StatePanel
        kind="loading"
        title="Loading"
        description="Fetching canonical evidence."
      />,
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('does not describe a submitted hash as confirmation', () => {
    render(
      <TransactionStatePanel
        state="submitted"
        transactionHash="0x1111111111111111111111111111111111111111111111111111111111111111"
      />,
    );

    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(
      screen.getByText(/Protocol success is not yet confirmed/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Finalized')).not.toBeInTheDocument();
  });

  it('distinguishes confirmed from finalized', () => {
    const { rerender } = render(
      <TransactionStatePanel state="confirmed" confirmations={3} />,
    );

    expect(screen.getByText(/may not be final settlement/i)).toBeInTheDocument();

    rerender(<TransactionStatePanel state="finalized" confirmations={20} />);

    expect(screen.getByText('Finalized')).toBeInTheDocument();
    expect(
      screen.getByText(/canonical finality threshold was reached/i),
    ).toBeInTheDocument();
  });
});
