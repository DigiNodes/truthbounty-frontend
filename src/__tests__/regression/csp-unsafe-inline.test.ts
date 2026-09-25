/**
 * Regression: 'unsafe-inline' must never appear in script-src in any
 * environment. This protects against accidental reintroduction of inline
 * execution (e.g. a dev shortcut that gets committed to main).
 */
import { buildCsp, generateNonce } from '@/lib/csp';

describe('CSP regression — no unsafe-inline in script-src', () => {
  const envScenarios: Array<{ label: string; env: Record<string, string> }> = [
    {
      label: 'no env vars set (defaults)',
      env: {},
    },
    {
      label: 'production-like env vars',
      env: {
        NEXT_PUBLIC_API_URL: 'https://api.truthbounty.xyz',
        NEXT_PUBLIC_WS_URL: 'wss://ws.truthbounty.xyz',
        NEXT_PUBLIC_OPTIMISM_RPC_URL: 'https://opt-mainnet.g.alchemy.com/v2/key',
        NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL: 'https://opt-sepolia.g.alchemy.com/v2/key',
      },
    },
    {
      label: 'localhost dev env vars',
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
        NEXT_PUBLIC_WS_URL: 'ws://localhost:8080/ws',
      },
    },
  ];

  for (const { label, env } of envScenarios) {
    it(`script-src never contains 'unsafe-inline' — ${label}`, () => {
      const saved: Record<string, string | undefined> = {};
      for (const [key, val] of Object.entries(env)) {
        saved[key] = process.env[key];
        process.env[key] = val;
      }

      try {
        const csp = buildCsp(generateNonce());
        const scriptSrc = csp
          .split(';')
          .map((d) => d.trim())
          .find((d) => d.startsWith('script-src'));

        expect(scriptSrc).toBeDefined();
        expect(scriptSrc).not.toContain("'unsafe-inline'");
      } finally {
        for (const [key, val] of Object.entries(saved)) {
          if (val === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = val;
          }
        }
      }
    });
  }

  it('nonce rotates between requests so one compromised nonce cannot be reused', () => {
    const nonces = new Set(Array.from({ length: 50 }, () => generateNonce()));
    // 50 independent nonces should all be unique
    expect(nonces.size).toBe(50);
  });
});
