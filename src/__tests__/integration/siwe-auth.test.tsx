import { act, renderHook } from '@testing-library/react';

import { useSiweAuth } from '@/hooks/useSiweAuth';
import { createBrowserSessionStore } from '@/lib/auth/session-store';

jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ isConnected: false, address: undefined })),
  useChainId: jest.fn(() => 10),
  useSignMessage: jest.fn(() => ({
    signMessage: jest.fn(async ({ message }: { message: string }) => '0x' + 'cd'.repeat(65)),
  })),
}));

jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  recoverMessageAddress: jest.fn(async () => SIGNER_HEX),
}));

// The integration test drives the *real* fetch-based SIWE API client, so the
// API base URL must be resolvable without throwing. We stub the fetch global
// (already mocked in jest.setup.js) to simulate the backend boundary.
const SIGNER = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
const SIGNER_HEX = '0x742d35cc6634c0532925a3b844bc9e7595f0eb1e';
const NOW = Date.parse('2026-08-31T12:00:00.000Z');

const MESSAGE = `truthbounty.app wants you to sign in with your Ethereum account:
${SIGNER}

Sign in to TruthBounty.

URI: https://truthbounty.app
Version: 1
Chain ID: 10
Nonce: abc123XYZ
Issued At: 2026-08-31T00:00:00.000Z
Expiration Time: 2026-09-01T00:00:00.000Z`;

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    async json() {
      return body;
    },
  } as Response;
}

beforeEach(() => {
  jest.resetModules();
  // Reset the global fetch mock to a per-test implementation.
  (global.fetch as jest.Mock).mockReset();
});

function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe('SIWE authentication integration (API + wallet boundary)', () => {
  it('completes a full challenge → sign → verify → session flow via the real API client', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        jsonResponse({
          message: MESSAGE,
          nonce: 'abc123XYZ',
          address: SIGNER_HEX,
          chainId: 10,
          domain: 'truthbounty.app',
          uri: 'https://truthbounty.app',
          issuedAt: '2026-08-31T00:00:00.000Z',
          expirationTime: '2026-09-01T00:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          token: 'session-token-1',
          expiresAt: new Date(NOW + 60_000).toISOString(),
          address: SIGNER_HEX,
          chainId: 10,
        }),
      );

    const storage = makeStorage();
    const sessionStore = createBrowserSessionStore({ storage, now: () => NOW });

    const { result } = renderHook(() =>
      useSiweAuth({
        apiUrl: 'https://api.truthbounty.example',
        sessionStore,
        accountOverride: { address: SIGNER, chainId: 10 },
        now: () => NOW,
      }),
    );

    await act(async () => {
      await result.current.begin();
    });
    expect(result.current.displayMessage).toBe(MESSAGE);
    expect(result.current.status).toBe('ready-to-sign');

    await act(async () => {
      await result.current.signAndSubmit();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.session?.token).toBe('session-token-1');
    expect(result.current.session?.address).toBe(SIGNER_HEX);

    // Session material was persisted through the approved boundary.
    expect(sessionStore.get()?.token).toBe('session-token-1');

    // The exact message was posted to the backend verify endpoint unchanged.
    const verifyCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(verifyCall[0]).toBe('https://api.truthbounty.example/auth/siwe/verify');
    expect(JSON.parse((verifyCall[1] as RequestInit).body as string).message).toBe(MESSAGE);
  });

  it('does not authenticate when the backend rejects verification as stale/replayed', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        jsonResponse({
          message: MESSAGE,
          nonce: 'abc123XYZ',
          address: SIGNER_HEX,
          chainId: 10,
          domain: 'truthbounty.app',
          uri: 'https://truthbounty.app',
          issuedAt: '2026-08-31T00:00:00.000Z',
          expirationTime: '2026-09-01T00:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ code: 'nonce_expired' }, 401));

    const storage = makeStorage();
    const sessionStore = createBrowserSessionStore({ storage, now: () => NOW });

    const { result } = renderHook(() =>
      useSiweAuth({
        apiUrl: 'https://api.truthbounty.example',
        sessionStore,
        accountOverride: { address: SIGNER, chainId: 10 },
        now: () => NOW,
      }),
    );

    await act(async () => {
      await result.current.begin();
    });
    await act(async () => {
      await result.current.signAndSubmit();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.status).toBe('error');
    expect(result.current.error?.kind).toBe('NONCE_EXPIRED');
    // No session persisted on a rejected verification.
    expect(sessionStore.get()).toBeNull();
  });

  it('blocks the flow when the wallet is on the wrong network', async () => {
    // Backend issues a challenge scoped to Optimism (chain 10), but the
    // wallet is connected to chain 1 → the client refuses to proceed.
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse({
        message: MESSAGE,
        nonce: 'abc123XYZ',
        address: SIGNER_HEX,
        chainId: 10,
        domain: 'truthbounty.app',
        uri: 'https://truthbounty.app',
        issuedAt: '2026-08-31T00:00:00.000Z',
        expirationTime: '2026-09-01T00:00:00.000Z',
      }),
    );

    // The verify endpoint must never be reached.
    const sessionStore = createBrowserSessionStore({
      storage: makeStorage(),
      now: () => NOW,
    });
    const { result } = renderHook(() =>
      useSiweAuth({
        apiUrl: 'https://api.truthbounty.example',
        sessionStore,
        accountOverride: { address: SIGNER, chainId: 1 },
        now: () => NOW,
      }),
    );

    await act(async () => {
      await result.current.begin();
    });

    expect(result.current.error?.kind).toBe('WRONG_CHAIN');
    expect(result.current.status).toBe('error');
    expect(sessionStore.get()).toBeNull();
  });
});
