/**
 * Regression: 'unsafe-inline' must never appear in script-src in any
 * environment. This protects against accidental reintroduction of inline
 * execution.
 */
import {
  buildContentSecurityPolicy,
  createRequestNonce,
} from '@/lib/security/headers';

describe('CSP regression — no unsafe-inline in script-src', () => {
  const envScenarios = [
    {
      label: 'production',
      isDevelopment: false,
    },
    {
      label: 'development',
      isDevelopment: true,
    },
  ];

  for (const { label, isDevelopment } of envScenarios) {
    it(`script-src never contains 'unsafe-inline' — ${label}`, () => {
      const csp = buildContentSecurityPolicy({
        nonce: createRequestNonce(),
        isDevelopment,
      });

      const scriptSrc = csp
        .split(';')
        .map((directive) => directive.trim())
        .find((directive) => directive.startsWith('script-src'));

      expect(scriptSrc).toBeDefined();
      expect(scriptSrc).not.toContain("'unsafe-inline'");
    });
  }

  it('nonce rotates between requests so one compromised nonce cannot be reused', () => {
    const nonces = new Set(
      Array.from({ length: 50 }, () => createRequestNonce()),
    );

    expect(nonces.size).toBe(50);
  });
});