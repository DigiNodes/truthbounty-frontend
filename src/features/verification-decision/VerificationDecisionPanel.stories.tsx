import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { VerificationDecisionPanel } from './VerificationDecisionPanel';
import type {
  ReleaseState,
  SimulationState,
  VerificationDecisionContext,
  WalletState,
} from './types';

const CONTEXT: VerificationDecisionContext = {
  claimId: '42',
  target: '0x00000000000000000000000000000000000000aa',
  minStake: '1000000000000000000',
  stakeAmount: '2000000000000000000',
  deadlineIso: '2026-10-22T00:00:00.000Z',
  phase: 'commit',
  txStatus: 'idle',
};

const RELEASE: ReleaseState = {
  status: 'pinned',
  releaseTag: 'v2.4.0',
  artifactVersion: 'iv-verification-submission@v1.0.0',
};

const SIMULATION: SimulationState = { status: 'passed' };

const WALLET: WalletState = {
  status: 'connected',
  account: '0x00000000000000000000000000000000000000bb',
  chainId: 10,
};

const meta = {
  title: 'Features/VerificationDecisionPanel',
  component: VerificationDecisionPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 24, width: 640, minWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    context: CONTEXT,
    release: RELEASE,
    simulation: SIMULATION,
    wallet: WALLET,
    rationale: 'The evidence supports the claim.',
    rationaleVisible: false,
    onAuthorize: fn(),
  },
} satisfies Meta<typeof VerificationDecisionPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The authorization stays disabled until a decision is selected, and the
 * review shows the exact callable that the wallet will be asked to sign.
 */
export const Ready: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const authorize = canvas.getByTestId('authorize-decision');
    expect(authorize).toBeDisabled();

    await userEvent.click(canvas.getByLabelText(/Support the claim/));

    await expect(authorize).toBeEnabled();
    expect(canvas.getByTestId('review-signature').textContent).toContain(
      'submitVerification(uint256 claimId, uint8 verdict, uint256 stakeAmount)'
    );
  },
};

/**
 * An unpinned release or a failed simulation disables the authorization and
 * states the reason instead of failing silently.
 */
export const Blocked: Story = {
  args: {
    release: {
      status: 'unpinned',
      reasons: ['release tag is not pinned'],
    },
    simulation: { status: 'failed', reason: 'execution reverted' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText(/Support the claim/));

    expect(canvas.getByTestId('authorize-decision')).toBeDisabled();
    expect(canvas.getByTestId('blockers').textContent).toMatch(/not pinned/i);
  },
};
