import type { Meta, StoryObj } from '@storybook/react';

import {
  TRANSACTION_STATE_DEFINITIONS,
  TransactionStatePanel,
  type TransactionUiState,
} from './TransactionStatePanel';

const illustrativeHash =
  '0x1111111111111111111111111111111111111111111111111111111111111111';

const meta: Meta<typeof TransactionStatePanel> = {
  title: 'Gate C/Primitives/TransactionStatePanel',
  component: TransactionStatePanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Presentational canonical-state surface. Story values are illustrative and must never enter production adapters.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TransactionStatePanel>;

export const Submitted: Story = {
  args: {
    state: 'submitted',
    transactionHash: illustrativeHash,
    sourceLabel: 'Illustrative provider response',
    updatedAtLabel: 'Illustrative time · 12 seconds ago',
  },
};

export const ConfirmedNotFinalized: Story = {
  args: {
    state: 'confirmed',
    transactionHash: illustrativeHash,
    confirmations: 3,
    sourceLabel: 'Illustrative Optimism receipt',
    updatedAtLabel: 'Illustrative block · 123456',
  },
};

export const IndexerDelayed: Story = {
  args: {
    state: 'projection-lag',
    transactionHash: illustrativeHash,
    confirmations: 8,
    sourceLabel: 'Illustrative chain receipt; API projection delayed',
  },
};

export const Reorged: Story = {
  args: {
    state: 'reorged',
    transactionHash: illustrativeHash,
    sourceLabel: 'Illustrative reconciliation result',
  },
};

export const CanonicalMatrix: Story = {
  render: () => (
    <div className="grid gap-4 xl:grid-cols-2">
      {(Object.keys(TRANSACTION_STATE_DEFINITIONS) as TransactionUiState[]).map(
        (state) => (
          <TransactionStatePanel
            key={state}
            state={state}
            transactionHash={
              ['submitted', 'replaced', 'reverted', 'confirmed', 'finalized', 'projection-lag', 'reorged'].includes(state)
                ? illustrativeHash
                : undefined
            }
            confirmations={state === 'confirmed' ? 3 : state === 'finalized' ? 20 : undefined}
            sourceLabel="Illustrative Storybook fixture"
          />
        ),
      )}
    </div>
  ),
};
