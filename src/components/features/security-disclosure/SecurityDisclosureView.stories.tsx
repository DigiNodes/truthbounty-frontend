import type { Meta, StoryObj } from '@storybook/react';
import { SecurityDisclosureView } from './SecurityDisclosureView';
import {
  CANONICAL_SECURITY_POLICY,
  VERIFIED_READY_CHANNEL_FIXTURE,
} from '@/config/security-policy';

const meta: Meta<typeof SecurityDisclosureView> = {
  title: 'Features/SecurityDisclosure/SecurityDisclosureView',
  component: SecurityDisclosureView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'UI-FE-040: Responsible Disclosure Page and Protected Boundary. Covers target scope, safe testing, report detail, prohibited actions, and fail-closed unavailable state pending protocol#24 intake decision.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SecurityDisclosureView>;

/**
 * 1. Unavailable Default State
 * Canonical default state: Web-based intake is suspended pending protocol#24.
 * Fails closed to prevent unencrypted plaintext report transmission.
 * Displays explicit zero-bounty disclaimer and safe offline alternatives.
 */
export const UnavailableDefault: Story = {
  args: {
    channelStateOverride: 'unavailable',
    initialData: CANONICAL_SECURITY_POLICY,
  },
};

/**
 * 2. Verified Ready Channel State
 * Shows verified PGP key, fingerprint, and private security advisory link.
 */
export const ReadyChannelState: Story = {
  args: {
    channelStateOverride: 'ready',
    initialData: VERIFIED_READY_CHANNEL_FIXTURE,
  },
};

/**
 * 3. Loading Channel State
 * Displays skeleton pulse placeholders while channel verification is checked.
 */
export const LoadingState: Story = {
  args: {
    channelStateOverride: 'loading',
    initialData: CANONICAL_SECURITY_POLICY,
  },
};

/**
 * 4. In-Scope Targets Focus
 * Highlights smart contracts and frontend boundaries eligible for research.
 */
export const InScopeTargetsFocus: Story = {
  args: {
    channelStateOverride: 'unavailable',
    initialData: {
      ...CANONICAL_SECURITY_POLICY,
      scopeTargets: CANONICAL_SECURITY_POLICY.scopeTargets.filter((t) => t.inScope),
    },
  },
};

/**
 * 5. Out-of-Scope Targets Focus
 * Clarifies external RPCs, biometric clouds, and domain infrastructure.
 */
export const OutOfScopeTargetsFocus: Story = {
  args: {
    channelStateOverride: 'unavailable',
    initialData: {
      ...CANONICAL_SECURITY_POLICY,
      scopeTargets: CANONICAL_SECURITY_POLICY.scopeTargets.filter((t) => !t.inScope),
    },
  },
};
