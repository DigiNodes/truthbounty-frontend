import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecurityProtectedIntakeBoundary } from '../SecurityProtectedIntakeBoundary';
import {
  CANONICAL_SECURITY_POLICY,
  VERIFIED_READY_CHANNEL_FIXTURE,
} from '@/config/security-policy';

describe('SecurityProtectedIntakeBoundary', () => {
  it('renders explicit fail-closed unavailable state by default', () => {
    const onCopyMock = jest.fn();
    render(
      <SecurityProtectedIntakeBoundary
        status={CANONICAL_SECURITY_POLICY.channelStatus}
        activeState="unavailable"
        copiedTargetId={null}
        onCopyText={onCopyMock}
      />
    );

    expect(
      screen.getByRole('heading', {
        name: /protected intake boundary: unavailable \(fail-closed\)/i,
      })
    ).toBeInTheDocument();

    expect(screen.getAllByText(/fail-closed/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/DigiNodes\/truthbounty-protocol#24/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Zero-Data Collection & Telemetry Isolation Invariant/i)
    ).toBeInTheDocument();

    // Verify NO input elements exist (zero data collection)
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('renders verified ready state with PGP fingerprint and expand button', () => {
    const onCopyMock = jest.fn();
    render(
      <SecurityProtectedIntakeBoundary
        status={VERIFIED_READY_CHANNEL_FIXTURE.channelStatus}
        activeState="ready"
        copiedTargetId={null}
        onCopyText={onCopyMock}
      />
    );

    expect(
      screen.getByRole('heading', {
        name: /protected intake boundary: verified channel/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByText(/CHANNEL READY/i)).toBeInTheDocument();
    expect(screen.getByText(/3F1A 8C9D/i)).toBeInTheDocument();

    // Click copy fingerprint
    const copyFingerprintBtn = screen.getByRole('button', {
      name: /copy pgp fingerprint/i,
    });
    fireEvent.click(copyFingerprintBtn);
    expect(onCopyMock).toHaveBeenCalledWith(
      VERIFIED_READY_CHANNEL_FIXTURE.channelStatus.verifiedPgpKey!.fingerprint,
      'pgp-fingerprint'
    );

    // Expand armored key block
    const expandBtn = screen.getByRole('button', {
      name: /view armored pgp public key/i,
    });
    expect(screen.queryByText(/BEGIN PGP PUBLIC KEY BLOCK/i)).toBeNull();
    fireEvent.click(expandBtn);
    expect(screen.getByText(/BEGIN PGP PUBLIC KEY BLOCK/i)).toBeInTheDocument();
  });

  it('renders accessible loading state with aria-busy="true"', () => {
    const { container } = render(
      <SecurityProtectedIntakeBoundary
        status={CANONICAL_SECURITY_POLICY.channelStatus}
        activeState="loading"
        copiedTargetId={null}
        onCopyText={jest.fn()}
      />
    );

    const section = container.querySelector('section');
    expect(section).toHaveAttribute('aria-busy', 'true');
  });
});
