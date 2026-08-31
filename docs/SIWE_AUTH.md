# V2-FE-007 — EIP-4361 SIWE Authentication Client

Implements EIP-4361 (Sign-In With Ethereum) client-side authentication for the
TruthBounty frontend. The backend is the authority for challenge generation and
signature verification; the client displays the backend's exact SIWE message
verbatim and submits it unchanged.

## Architecture

```
Wallet (wagmi)                      Backend API
   │  useAccount / useChainId            │  POST /auth/siwe/challenge
   │  useSignMessage                     │  POST /auth/siwe/verify
   └──────────┬──────────────────────────┘  POST /auth/siwe/revoke
              ▼
      ┌─────────────────┐
      │  useSiweAuth     │  orchestration hook (src/hooks/useSiweAuth.ts)
      └─────────────────┘
        ├─ siwe-client.ts   EIP-4361 parser, validators, fetch client, error taxonomy
        └─ session-store.ts approved client boundary (sessionStorage) for session
```

- `src/lib/auth/siwe-types.ts` — `SiweChallenge`, `SiweStatus`, `SiweFailureKind`,
  `SiweSession`, `SiweVerifyRequest`, failure taxonomy.
- `src/lib/auth/siwe-client.ts` — `parseSiweMessage`, `addressesEqual`,
  `validateChallengeAgainstWallet`, `validateChallenge`, `classifySiweHttpError`,
  `createSiweApiClient`. Messages are **never fabricated** — the client always signs
  the message string returned by the backend challenge endpoint.
- `src/lib/auth/session-store.ts` — `createBrowserSessionStore` (sessionStorage),
  `createMemorySessionStore` (tests), `isSessionActive`. Session material is stored
  and rotated only through this approved boundary.
- `src/hooks/useSiweAuth.ts` — wagmi + viem wiring, injectable `apiClient`,
  `sessionStore`, `accountOverride`, `signMessage`, `now` for deterministic tests.
- `src/context/SiweAuthProvider.tsx` — app-level session context, wrapped in
  `src/app/providers.tsx` (no visual/layout change).

## Error handling

| Condition | `SiweFailureKind` |
|---|---|
| Wrong connected account | `WRONG_ACCOUNT` |
| Wrong chain / chain mismatch | `WRONG_CHAIN` |
| User rejected signature | `USER_REJECTED` |
| Nonce expired / stale challenge | `NONCE_EXPIRED` |
| Challenge replay | `REPLAYED` |
| Malformed message | `INVALID_MESSAGE` |
| HTTP/auth failure | `UNAUTHORIZED` / `NETWORK` |

## Acceptance criteria → evidence

- **Display backend SIWE message verbatim** — `useSiweAuth` returns
  `displayMessage` set from the challenge `message` string; integration test
  asserts the verify body `message` equals the challenge `message` unchanged
  (`src/__tests__/integration/siwe-auth.test.tsx`).
- **Nonce expiry** — `classifySiweHttpError` maps stale/nonce errors to
  `NONCE_EXPIRED`; integration test asserts no session persists after a 401
  `nonce_expired` (`siwe-auth.test.tsx`).
- **User rejection** — `signAndSubmit` maps rejected signature to
  `USER_REJECTED` (`src/hooks/__tests__/useSiweAuth.test.tsx`).
- **Wrong account / wrong chain** — `validateChallengeAgainstWallet` compares the
  challenge address/chainId against the connected wallet before signing.
- **Replay responses** — verify errors classify to `REPLAYED`; hook drops the
  challenge and stays unauthenticated.
- **Session store/rotation** — `createBrowserSessionStore` persists and rotates
  session material through the approved boundary; `isSessionActive` enforces
  expiry using an injectable clock.
- **Tests** — 47 tests pass: `siwe-client.test.ts` (34), `session-store.test.ts`,
  `useSiweAuth.test.tsx`, `siwe-auth.test.tsx` (integration).

## Baseline failures (pre-existing, unrelated to this change)

- **Lint** — fails to load config on pristine main:
  `ConfigError: Config "jsx-a11y/recommended": Key "plugins": Cannot redefine plugin "jsx-a11y"`.
- **Type-check** — 31 errors on pristine main, all in two untouched test files:
  `src/__tests__/integration/claim-submission.test.tsx` (6) and
  `src/hooks/__tests__/useAccount.test.ts` (25).
- **Test suite** — 21 suites fail on pristine main (identical set before and
  after this change); this change adds 0 new failures and 4 passing suites
  (47 new tests, all passing).
