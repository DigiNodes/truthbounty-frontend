import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecurityDisclosureView } from '../SecurityDisclosureView';
import {
  CANONICAL_SECURITY_POLICY,
  VERIFIED_READY_CHANNEL_FIXTURE,
} from '@/config/security-policy';

describe('SecurityDisclosureView', () => {
  it('renders all required sections and headings cleanly', () => {
    render(<SecurityDisclosureView />);

    // 1. Header
    expect(
      screen.getByRole('heading', {
        name: /responsible disclosure & security policy/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/Release: v2.0.0-sepolia/i)).toBeInTheDocument();
    expect(screen.getByText(/Optimism \(EVM\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero-Telemetry Route/i)).toBeInTheDocument();

    // 2. Zero Bounty & SLA Disclaimer
    expect(
      screen.getByText(/Important Notice: No Automatic Bounty Rewards or Response SLAs/i)
    ).toBeInTheDocument();

    // 3. Protected Intake Boundary
    expect(
      screen.getByRole('heading', {
        name: /protected intake boundary: unavailable \(fail-closed\)/i,
      })
    ).toBeInTheDocument();

    // 4. Target Scope & Eligibility Boundaries
    expect(
      screen.getByRole('heading', {
        name: /target scope & eligibility boundaries/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('TruthBountyCore Contract')).toBeInTheDocument();
    expect(screen.getByText('Third-Party RPC Node Infrastructure')).toBeInTheDocument();

    // 5. Safe Harbor Section
    expect(
      screen.getByRole('heading', {
        name: /security research safe harbor/i,
      })
    ).toBeInTheDocument();

    // 6. Prohibited Section
    expect(
      screen.getByRole('heading', {
        name: /strictly prohibited testing & activities/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Denial of Service (DoS / DDoS)')).toBeInTheDocument();
    expect(screen.getByText('Social Engineering & Phishing')).toBeInTheDocument();
    expect(screen.getByText('Private Key & Secret Exfiltration')).toBeInTheDocument();

    // 7. Report Requirements
    expect(
      screen.getByRole('heading', {
        name: /vulnerability report requirements/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Step-by-Step Reproduction')).toBeInTheDocument();
    expect(screen.getByText('Proof of Concept (PoC)')).toBeInTheDocument();
  });

  it('provides a keyboard-accessible skip link', () => {
    render(<SecurityDisclosureView />);
    const skipLink = screen.getByText('Skip to Target Scope');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#security-scope-heading');
  });

  it('filters targets dynamically on user interaction', () => {
    render(<SecurityDisclosureView />);

    // Click "In Scope"
    const inScopeBtn = screen.getByRole('button', { name: /^in scope$/i });
    fireEvent.click(inScopeBtn);

    expect(screen.getByText('TruthBountyCore Contract')).toBeInTheDocument();
    expect(
      screen.queryByText('Third-Party RPC Node Infrastructure')
    ).not.toBeInTheDocument();

    // Click "Out of Scope"
    const outOfScopeBtn = screen.getByRole('button', { name: /^out of scope$/i });
    fireEvent.click(outOfScopeBtn);

    expect(
      screen.queryByText('TruthBountyCore Contract')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Third-Party RPC Node Infrastructure')).toBeInTheDocument();
  });

  it('renders verified ready state when channel is verified', () => {
    render(
      <SecurityDisclosureView
        channelStateOverride="ready"
        initialData={VERIFIED_READY_CHANNEL_FIXTURE}
      />
    );

    expect(
      screen.getByRole('heading', {
        name: /protected intake boundary: verified channel/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/CHANNEL READY/i)).toBeInTheDocument();
  });
});
