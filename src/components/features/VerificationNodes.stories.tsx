import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import VerificationNodes, { VerificationNode } from './VerificationNodes';
import { verificationNodes } from '@/__tests__/fixtures/mock-data';

const fixtureNodes: VerificationNode[] = verificationNodes.map((node) => ({
  name: node.name,
  status: node.status as VerificationNode['status'],
  uptime: node.uptime,
  location: node.location,
}));

const meta: Meta<typeof VerificationNodes> = {
  title: 'Features/VerificationNodes',
  component: VerificationNodes,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof VerificationNodes>;

export const WithFixtureNodes: Story = {
  args: {
    nodes: fixtureNodes,
    isLoading: false,
  },
};

export const Empty: Story = {
  args: {
    nodes: [],
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    nodes: [],
    isLoading: true,
  },
};