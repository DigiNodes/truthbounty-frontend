/**
 * Accessibility checks for Responsible Disclosure & Protected Intake Boundary (UI-FE-040)
 * Runs jest-axe on both Unavailable and Ready states to ensure 0 violations (WCAG 2.2 AA).
 */

import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SecurityDisclosureView } from '@/components/features/security-disclosure';
import {
  CANONICAL_SECURITY_POLICY,
  VERIFIED_READY_CHANNEL_FIXTURE,
} from '@/config/security-policy';

expect.extend(toHaveNoViolations);

describe('SecurityDisclosureView Accessibility (a11y)', () => {
  it('has 0 axe violations in canonical Unavailable (fail-closed) state', async () => {
    const { container } = render(
      <main id="main-content">
        <SecurityDisclosureView
          channelStateOverride="unavailable"
          initialData={CANONICAL_SECURITY_POLICY}
        />
      </main>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has 0 axe violations in verified Ready channel state', async () => {
    const { container } = render(
      <main id="main-content">
        <SecurityDisclosureView
          channelStateOverride="ready"
          initialData={VERIFIED_READY_CHANNEL_FIXTURE}
        />
      </main>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has 0 axe violations in Loading state', async () => {
    const { container } = render(
      <main id="main-content">
        <SecurityDisclosureView
          channelStateOverride="loading"
          initialData={CANONICAL_SECURITY_POLICY}
        />
      </main>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
