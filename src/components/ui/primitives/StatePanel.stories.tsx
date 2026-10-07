import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/components/ui/button';
import { StatePanel } from './StatePanel';

const meta: Meta<typeof StatePanel> = {
  title: 'Gate C/Primitives/StatePanel',
  component: StatePanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onAction: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof StatePanel>;

export const Loading: Story = {
  args: {
    kind: 'loading',
    title: 'Loading canonical claim state',
    description: 'Waiting for the selected release and public projection.',
  },
};

export const Empty: Story = {
  args: {
    kind: 'empty',
    title: 'No claims match these filters',
    description: 'Change or clear the filters to explore other public claims.',
    actionLabel: 'Clear filters',
  },
};

export const Error: Story = {
  args: {
    kind: 'error',
    title: 'Claims could not be loaded',
    description: 'The request failed without changing any protocol state.',
    actionLabel: 'Try again',
  },
};

export const Stale: Story = {
  args: {
    kind: 'stale',
    title: 'Projection may be delayed',
    description: 'Public chain evidence remains canonical while the indexer catches up.',
    actionLabel: 'Refresh projection',
  },
};

export const Disabled: Story = {
  args: {
    kind: 'disabled',
    title: 'Action not available yet',
    description: 'Complete the required canonical prerequisites before continuing.',
  },
};

export const Unavailable: Story = {
  args: {
    kind: 'unavailable',
    title: 'Release configuration unavailable',
    description: 'Mutations fail closed until a verified release manifest is available.',
    actionLabel: 'View service status',
  },
};

export const Denied: Story = {
  args: {
    kind: 'denied',
    title: 'Capability required',
    description: 'The selected context does not grant authority for this operation.',
  },
};

export const Matrix: Story = {
  render: () => (
    <div className="grid gap-4">
      <StatePanel kind="loading" title="Loading" description="Canonical data is being requested." />
      <StatePanel kind="empty" title="Empty" description="There is no canonical content to display." />
      <StatePanel kind="error" title="Error" description="The request failed safely." />
      <StatePanel kind="stale" title="Stale" description="Projection freshness is outside policy." />
      <StatePanel kind="disabled" title="Disabled" description="Prerequisites are incomplete." />
      <StatePanel kind="unavailable" title="Unavailable" description="Required runtime configuration is absent." />
      <StatePanel kind="denied" title="Denied" description="Canonical capability evidence is missing." />
      <Button type="button" className="w-fit">Keyboard target after the matrix</Button>
    </div>
  ),
};
