/**
 * UI-FE-040 — Responsible Disclosure Interaction Tests
 *
 * Storybook interaction tests with play functions for scope filtering,
 * fail-closed unavailable state verification, zero-bounty check, and PGP copy interactions.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent, waitFor } from 'storybook/test';
import { SecurityDisclosureView } from './SecurityDisclosureView';
import {
  CANONICAL_SECURITY_POLICY,
  VERIFIED_READY_CHANNEL_FIXTURE,
} from '@/config/security-policy';

const meta: Meta<typeof SecurityDisclosureView> = {
  title: 'Features/SecurityDisclosure/Interactions',
  component: SecurityDisclosureView,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof SecurityDisclosureView>;

/**
 * 1. Verify Fail-Closed Unavailable Notice and Zero Bounty Disclaimer
 */
export const VerifyUnavailableAndZeroBountyNotice: Story = {
  args: {
    channelStateOverride: 'unavailable',
    initialData: CANONICAL_SECURITY_POLICY,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify main heading
    const heading = await canvas.findByRole('heading', {
      name: /responsible disclosure & security policy/i,
    });
    await expect(heading).toBeInTheDocument();

    // Verify Zero Bounty & SLA Disclaimer
    const disclaimer = await canvas.findByLabelText(/bounty and response guarantee disclaimer/i);
    await expect(disclaimer).toBeInTheDocument();
    await expect(disclaimer).toHaveTextContent(/no automatic bounty rewards or response slas/i);

    // Verify Protected Intake Boundary is in UNAVAILABLE state
    const boundaryHeading = await canvas.findByRole('heading', {
      name: /protected intake boundary: unavailable/i,
    });
    await expect(boundaryHeading).toBeInTheDocument();
    await expect(canvas.getByText(/fail-closed/i)).toBeInTheDocument();

    // Assert that NO sensitive form or textarea exists in unavailable state
    const textareas = canvasElement.querySelectorAll('textarea');
    await expect(textareas.length).toBe(0);
    const textInputs = canvasElement.querySelectorAll('input[type="text"]');
    await expect(textInputs.length).toBe(0);
  },
};

/**
 * 2. Scope Filter Interaction (All / In Scope / Out of Scope)
 */
export const FilterTargetsInteraction: Story = {
  args: {
    channelStateOverride: 'unavailable',
    initialData: CANONICAL_SECURITY_POLICY,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Initially all 6 targets should be present
    await expect(await canvas.findByText('TruthBountyCore Contract')).toBeInTheDocument();
    await expect(canvas.getByText('Third-Party RPC Node Infrastructure')).toBeInTheDocument();

    // Click "In Scope"
    const inScopeButton = canvas.getByRole('button', { name: /^in scope$/i });
    await userEvent.click(inScopeButton);

    // In-scope contract remains, out-of-scope RPC is filtered out
    await waitFor(() => {
      expect(canvas.getByText('TruthBountyCore Contract')).toBeInTheDocument();
      expect(canvas.queryByText('Third-Party RPC Node Infrastructure')).not.toBeInTheDocument();
    });

    // Click "Out of Scope"
    const outOfScopeButton = canvas.getByRole('button', { name: /^out of scope$/i });
    await userEvent.click(outOfScopeButton);

    // Out-of-scope RPC is present, in-scope contract is filtered out
    await waitFor(() => {
      expect(canvas.queryByText('TruthBountyCore Contract')).not.toBeInTheDocument();
      expect(canvas.getByText('Third-Party RPC Node Infrastructure')).toBeInTheDocument();
    });

    // Click "All"
    const allButton = canvas.getByRole('button', { name: /^all$/i });
    await userEvent.click(allButton);

    await waitFor(() => {
      expect(canvas.getByText('TruthBountyCore Contract')).toBeInTheDocument();
      expect(canvas.getByText('Third-Party RPC Node Infrastructure')).toBeInTheDocument();
    });
  },
};

/**
 * 3. Ready Channel PGP Key Expand & Copy Interaction
 */
export const ReadyChannelPgpInteraction: Story = {
  args: {
    channelStateOverride: 'ready',
    initialData: VERIFIED_READY_CHANNEL_FIXTURE,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check ready state header
    const readyHeading = await canvas.findByRole('heading', {
      name: /protected intake boundary: verified channel/i,
    });
    await expect(readyHeading).toBeInTheDocument();
    await expect(canvas.getByText(/channel ready/i)).toBeInTheDocument();

    // Fingerprint copy button
    const copyFingerprintBtn = canvas.getByRole('button', { name: /copy pgp fingerprint/i });
    await expect(copyFingerprintBtn).toBeInTheDocument();

    // Expand PGP public key block
    const expandKeyBtn = canvas.getByRole('button', { name: /view armored pgp public key/i });
    await userEvent.click(expandKeyBtn);

    // Assert key block is expanded
    await waitFor(() => {
      expect(canvas.getByText(/BEGIN PGP PUBLIC KEY BLOCK/i)).toBeInTheDocument();
    });
  },
};
