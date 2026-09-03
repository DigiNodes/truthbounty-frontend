import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ActivityAndNodes, { ActivityDatum } from './ActivityAndNodes';
import { activityData } from '@/__tests__/fixtures/mock-data';

const fixtureData: ActivityDatum[] = activityData.map((datum) => ({
  name: datum.name,
  verified: datum.verified,
  disputed: datum.disputed,
  false: datum.false,
}));

const meta: Meta<typeof ActivityAndNodes> = {
  title: 'Features/ActivityAndNodes',
  component: ActivityAndNodes,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof ActivityAndNodes>;

export const WithFixtureActivity: Story = {
  args: {
    data: fixtureData,
    isLoading: false,
  },
};

export const Empty: Story = {
  args: {
    data: [],
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    data: [],
    isLoading: true,
  },
};