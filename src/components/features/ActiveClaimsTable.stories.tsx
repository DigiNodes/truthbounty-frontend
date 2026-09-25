import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ActiveClaimsTable, { ActiveClaimRow } from './ActiveClaimsTable';
import { activeClaims } from '@/__tests__/fixtures/mock-data';

const fixtureRows: ActiveClaimRow[] = activeClaims.map((claim) => ({
  category: claim.category,
  impact: claim.impact,
  title: claim.title,
  source: claim.source,
  status: claim.status,
  confidence: claim.confidence,
  votes: claim.votes,
  stake: claim.stake,
  time: claim.time,
  actions: claim.actions,
}));

const meta: Meta<typeof ActiveClaimsTable> = {
  title: 'Features/ActiveClaimsTable',
  component: ActiveClaimsTable,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof ActiveClaimsTable>;

export const WithFixtureClaims: Story = {
  args: {
    claims: fixtureRows,
    isLoading: false,
  },
};

export const Empty: Story = {
  args: {
    claims: [],
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    claims: [],
    isLoading: true,
  },
};