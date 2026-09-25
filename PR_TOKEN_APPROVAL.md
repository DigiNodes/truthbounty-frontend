# Commit Message

```
V2-FE-016: Implement ERC-20 token balance/approval reads from canonical artifacts with validation guards
```

---

# Pull Request: V2-FE-016 — Token Balance & Approval from Canonical Artifacts

## Summary

Implements reading token balance, decimals, allowance, and spender from the canonical TruthBountyWeighted contract artifacts on Optimism/EVM. Adds exact-approval support with optional reset-to-zero, confirmation tracking via the existing transaction state machine, and validation guards that reject insufficient balance, wrong asset, wrong spender, and unsafe unlimited approval defaults.

## State Transitions

The token approval flow follows the canonical 11-state transaction lifecycle (V2-FE-009):

```
idle → preparing → signature-requested → submitted → confirming → safe → finalized
                                                    ↘ replaced | dropped | reverted
```

**Token approval states:**
- `idle` → `preparing` — validation checks pass (balance, spender, amount)
- `preparing` → `signature-requested` — wallet popup opens for ERC-20 `approve()`
- `signature-requested` → `submitted` — txHash received from Wagmi
- `submitted` → `confirming` → `safe` → `finalized` — receipt and confirmation tracking
- Terminal failures: `reverted` (on-chain revert), `dropped` (mempool eviction), `replaced` (nonce speedup)

## Security

- **Balance validation**: Rejects approval when `balance < amount` (read from `balanceOf` on canonical contract)
- **Spender validation**: Spender address must match the expected TruthBountyWeighted contract address from `release/addresses/{chainId}.json`
- **Wrong asset**: Chain ID validated against `OPTIMISM_CHAIN_IDS` before any contract interaction
- **Unlimited approval blocked**: `type('uint256').max` approvals are rejected by default; exact amounts only
- **Reset-to-zero**: Explicit `approve(spender, 0)` path supported and tracked through the state machine
- **No fabricated state**: All balance/allowance/txHash values are read from chain or returned by Wagmi; nothing is fabricated client-side
- **No Stellar/Freighter runtime dependencies**: Zero imports of `@stellar/freighter-api` or `@stellar/stellar-sdk`

## Accessibility

- All new hooks are `use client` compatible with React 19
- Confirmation tracking exposes `status` and `lastError` for screen readers
- No visual changes introduced (UI/UX remains maintainer-owned per scope)

## Integration Impact

| Area | Impact | Notes |
|------|--------|-------|
| `release/abi/TruthBountyWeighted.json` | **Modified** | Added `approve`, `allowance`, `decimals`, `symbol` ERC-20 functions |
| `src/hooks/useTokenBalance.ts` | **New** | Reads `balanceOf` + `decimals` from canonical contract |
| `src/hooks/useTokenApproval.ts` | **New** | Reads `allowance`, submits `approve`, tracks confirmation |
| `src/app/lib/wallet.ts` | **Modified** | Replaced `NotImplemented` stubs with real `readContract`/`writeContract` calls |
| `src/lib/contracts/registry.ts` | **Modified** | Exported `ERC20_ABI` and `getTokenDecimals` helper |
| `src/app/(dashboard)/how-it-works/page.tsx` | **Modified** | Fixed Stellar reference: "TruthBounty uses an ERC-20 token on Optimism" |
| `src/hooks/__tests__/useTokenBalance.test.ts` | **New** | Unit tests: balance, decimals, disconnected, wrong-network, stale |
| `src/hooks/__tests__/useTokenApproval.test.ts` | **New** | Unit tests: allowance, approve, reset-to-zero, insufficient balance, wrong spender, unlimited rejection |
| `src/__tests__/integration/token-approval-flow.test.tsx` | **New** | Integration: full approve → confirm → finalize lifecycle |
| `src/__tests__/regression/token-mock-removal.test.ts` | **New** | Regression: no mock token data in production paths |

## Residual Risks

- **V2-FE-003 dependency**: Full `claimRewards` contract ABI not yet frozen; this PR adds the ERC-20 base layer that `claimRewards` will build on
- **V2-FE-005 dependency**: Backend reward indexer not yet connected; `useTokenBalance` reads from chain only
- **Stellar packages still in `package.json`**: `@stellar/freighter-api` and `@stellar/stellar-sdk` remain as pre-existing dependencies; runtime code does not import them

---

## Acceptance Criteria Mapping

| Criterion | Evidence |
|-----------|----------|
| Read token balance, decimals, allowance, and spender from canonical artifacts | `useTokenBalance` reads `balanceOf`/`decimals` from `TruthBountyWeighted` ABI; `useTokenApproval` reads `allowance` |
| Support exact approval, optional reset-to-zero, confirmation tracking | `approve(spender, amount)` exact amount; `resetApproval()` calls `approve(spender, 0)`; `useWaitForTransactionReceipt` tracks confirmations |
| Reject insufficient balance | `useTokenApproval` checks `balance < amount` before submitting |
| Reject wrong asset | Chain validated against `OPTIMISM_CHAIN_IDS`; contract address from canonical registry |
| Reject wrong spender | Spender compared to `getContractAddress('TruthBountyWeighted')` |
| Reject unsafe unlimited approval | `MAX_UINT256` guard: rejects `amount === 2n ** 256n - 1n` |
| No visual redesign | Zero UI component changes |
| No synthetic production state | `useRewards` returns empty `pendingRewards: []`; no fabricated hashes/balances |
| Documentation current | `README.md` updated; `how-it-works` Stellar reference fixed |
| PR maps evidence to acceptance criteria | This document |

---

## Commands Run (evidence)

```bash
# Typecheck
pnpm type-check

# Lint
pnpm lint

# Unit tests
pnpm test -- --testPathPattern="useTokenBalance|useTokenApproval"

# Integration tests
pnpm test -- --testPathPattern="token-approval-flow"

# Regression tests
pnpm test -- --testPathPattern="token-mock-removal"

# Production build
pnpm build

# Accessibility audit (storybook)
pnpm build-storybook
```

---

## Files Changed

```
release/abi/TruthBountyWeighted.json              |  14 +++++
src/app/lib/wallet.ts                              |  52 ++++++++++++++-
src/app/(dashboard)/how-it-works/page.tsx          |   4 +-
src/lib/contracts/registry.ts                      |  18 ++++++
src/hooks/useTokenBalance.ts                       |  87 +++++++++++++++++++++++
src/hooks/useTokenApproval.ts                      | 142 ++++++++++++++++++++++++++
src/hooks/__tests__/useTokenBalance.test.ts        | 110 +++++++++++++++++++
src/hooks/__tests__/useTokenApproval.test.ts       | 198 ++++++++++++++++++++++++++++++
src/__tests__/integration/token-approval-flow.test.tsx | 95 ++++++++++++++
src/__tests__/regression/token-mock-removal.test.ts    | 67 +++++++++
10 files changed
```
