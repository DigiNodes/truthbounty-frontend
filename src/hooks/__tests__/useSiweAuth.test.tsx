import { act, renderHook } from '@testing-library/react';

import { useSiweAuth } from '../useSiweAuth';
import { createBrowserSessionStore } from '@/lib/auth/session-store';
import type { SiweApiClient } from '@/lib/auth/siwe-client';

jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ isConnected: false, address: undefined })),
  useChainId: jest.fn(() => 10),
  useSignMessage: jest.fn(() => ({
    signMessage: jest.fn(async ({ message }: { message: string }) => '0x' + 'ab'.repeat(65)),
  })),
}));

// Deterministic signature recovery so the hook's client-side account check
// does not depend on real elliptic-curve crypto over a fake signature.
jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  recoverMessageAddress: jest.fn(
    async () => '0x742d35cc6634c0532925a3b844bc9e7595f0eb1e',
  ),
}));

const ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
const NOW = Date.parse('2026-08-31T12:00:00.000Z');

const DOMAIN = 'truthbounty.app';
const MESSAGE = `${DOMAIN} wants you to sign in with your Ethereum account:
${ADDRESS}

Sign in to TruthBounty.

URI: https://truthbounty.app
Version: 1
Chain ID: 10
Nonce: abc123XYZ
Issued At: 2026-08-31T00:00:00.000Z
Expiration Time: 2026-09-01T00:00:00.000Z`;

function makeApiClient(overrides: Partial<SiweApiClient> = {}): SiweApiClient {
  return {
    async requestChallenge() {
      return {
        message: MESSAGE,
        nonce: 'abc123XYZ',
        address: ADDRESS.toLowerCase(),
        chainId: 10,
        issuedAt: '2026-08-31T00:00:00.000Z',
        expirationTime: '2026-09-01T00:00:00.000Z',
        domain: DOMAIN,
        uri: 'https://truthbounty.app',
        version: '1',
      };
    },
    async submitVerification() {
      return {
        token: 'token-abc',
        expiresAt: new Date(NOW + 60_000).toISOString(),
        address: ADDRESS.toLowerCase(),
        chainId: 10,
      };
    },
    async revokeSession() {},
    ...overrides,
  };
}

function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

function renderAuth(opts: {
  api?: SiweApiClient;
  signMessage?: (m: string) => Promise<`0x${string}`>;
  storage?: ReturnType<typeof makeStorage>;
  address?: string | null;
  chainId?: number | null;
} = {}) {
  const storage = opts.storage ?? makeStorage();
  const sessionStore = createBrowserSessionStore({ storage, now: () => NOW });
  return renderHook(() =>
    useSiweAuth({
      apiClient: opts.api ?? makeApiClient(),
      sessionStore,
      accountOverride: { address: opts.address ?? ADDRESS, chainId: opts.chainId ?? 10 },
      signMessage: opts.signMessage,
      now: () => NOW,
    }),
  );
}

describe('useSiweAuth', () => {
  it('requests the challenge and surfaces the exact message for signing', async () => {
    const api = makeApiClient();
    const requestSpy = jest.spyOn(api, 'requestChallenge');
    const { result } = renderAuth({ api });

    await act(async () => {
      await result.current.begin();
    });

    expect(requestSpy).toHaveBeenCalledWith({ address: ADDRESS, chainId: 10 });
    expect(result.current.status).toBe('ready-to-sign');
    // The exact backend message is displayed verbatim (no re-formatting).
    expect(result.current.displayMessage).toBe(MESSAGE);
  });

  it('completes a successful sign-and-submit and stores/rotates the session', async () => {
    const api = makeApiClient();
    const submitSpy = jest.spyOn(api, 'submitVerification');
    const { result } = renderAuth({ api });

    await act(async () => {
      await result.current.begin();
    });
    await act(async () => {
      await result.current.signAndSubmit();
    });

    expect(submitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: MESSAGE, // submitted unchanged
        address: ADDRESS.toLowerCase(),
        chainId: 10,
      }),
    );
    expect(result.current.status).toBe('authenticated');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.session?.token).toBe('token-abc');
  });

  it('hydrates an existing active session on mount', () => {
    const storage = makeStorage();
    createBrowserSessionStore({ storage, now: () => NOW }).set({
      address: ADDRESS.toLowerCase(),
      chainId: 10,
      token: 'existing',
      expiresAt: NOW + 60_000,
      issuedAt: NOW,
    });
    const { result } = renderAuth({ storage });
    expect(result.current.status).toBe('authenticated');
    expect(result.current.session?.token).toBe('existing');
  });

  it('handles user rejection as USER_REJECTED', async () => {
    const { result } = renderAuth({
      signMessage: () => {
        throw Object.assign(new Error('User rejected the request.'), { name: 'UserRejectedRequestError' });
      },
    });

    await act(async () => {
      await result.current.begin();
    });
    await act(async () => {
      await result.current.signAndSubmit();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error?.kind).toBe('USER_REJECTED');
  });

  it('handles nonce expiration as NONCE_EXPIRED during challenge request', async () => {
    const api = makeApiClient({
      requestChallenge: async () => ({
        message: MESSAGE,
        nonce: 'stale',
        address: ADDRESS.toLowerCase(),
        chainId: 10,
        issuedAt: '2026-08-01T00:00:00.000Z',
        expirationTime: '2026-08-01T00:00:00.000Z',
        domain: DOMAIN,
        uri: 'https://truthbounty.app',
        version: '1',
      }),
    });
    const { result } = renderAuth({ api });

    await act(async () => {
      await result.current.begin();
    });

    expect(result.current.error?.kind).toBe('NONCE_EXPIRED');
    expect(result.current.status).toBe('error');
  });

  it('handles a wrong account before prompting to sign', async () => {
    const api = makeApiClient({
      requestChallenge: async () => ({
        message: MESSAGE.replace(ADDRESS, '0x000000000000000000000000000000000000dead'),
        nonce: 'abc',
        address: '0x000000000000000000000000000000000000dead',
        chainId: 10,
        issuedAt: '2026-08-31T00:00:00.000Z',
        expirationTime: '2026-09-01T00:00:00.000Z',
        domain: DOMAIN,
        uri: 'https://truthbounty.app',
        version: '1',
      }),
    });
    const { result } = renderAuth({ api, address: ADDRESS, chainId: 10 });

    await act(async () => {
      await result.current.begin();
    });

    expect(result.current.error?.kind).toBe('WRONG_ACCOUNT');
    expect(result.current.status).toBe('error');
    expect(result.current.challenge).toBeNull();
  });

  it('handles a wrong chain (network mismatch) as WRONG_CHAIN', async () => {
    const { result } = renderAuth({ address: ADDRESS, chainId: 1 });

    await act(async () => {
      await result.current.begin();
    });

    expect(result.current.error?.kind).toBe('WRONG_CHAIN');
    expect(result.current.status).toBe('error');
  });

  it('handles a replay response on verification as REPLAYED and drops the challenge', async () => {
    const api = makeApiClient({
      submitVerification: async () => {
        throw Object.assign(new Error('nonce already used'), { kind: 'REPLAYED', httpStatus: 409 });
      },
    });
    const { result } = renderAuth({ api });

    await act(async () => {
      await result.current.begin();
    });
    await act(async () => {
      await result.current.signAndSubmit();
    });

    expect(result.current.error?.kind).toBe('REPLAYED');
    expect(result.current.status).toBe('error');
    expect(result.current.challenge).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears the session and returns to idle', async () => {
    const { result } = renderAuth();

    await act(async () => {
      await result.current.begin();
    });
    await act(async () => {
      await result.current.signAndSubmit();
    });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.clear();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.status).toBe('idle');
    expect(result.current.session).toBeNull();
  });
});
