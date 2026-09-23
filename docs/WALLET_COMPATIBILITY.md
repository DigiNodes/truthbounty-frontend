# Wallet Integration Compatibility Matrix

**V2-FE-142** — Connector capability detection, UI state model, and failure behavior.

---

## Overview

The Wallet Integration Compatibility Matrix gives users and developers a clear view of which wallet connectors work on the supported Optimism/EVM chains, what capabilities they expose, and why a connector may be in a degraded or incompatible state.

This feature is **Optimism/EVM only**. No Stellar, Soroana, Freighter, or alternate-chain runtime is included or planned.

---

## Supported Networks

| Network | Chain ID |
|---------|----------|
| OP Mainnet | `10` |
| OP Sepolia | `11155420` |

Any connector connected to a chain outside this list is treated as **unsupported** and the UI fails closed — the connector is shown as degraded, not compatible.

---

## UI State Model

The matrix derives its rendering state from `MatrixUIState`:

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| `loading` | Detection in progress | Skeleton rows, `aria-live="polite"` announcement |
| `empty` | No connectors found | Empty-state message with install guidance |
| `error` | Detection threw an error | Error alert with message + "Retry" button |
| `ready` | Detection complete | Full connector table |

States are deterministic: given the same wagmi connector list and account state, the matrix always produces the same output.

---

## Connector Capability Flags

Each connector is evaluated for the following capabilities:

| Capability | Description |
|-----------|-------------|
| `canSwitchChain` | `wallet_switchEthereumChain` is available |
| `canAddChain` | `wallet_addEthereumChain` is available |
| `canSign` | `personal_sign` / `eth_sign` is available |
| `canSignTypedData` | `eth_signTypedData_v4` is available |
| `canWatchAsset` | `wallet_watchAsset` is available |
| `isEIP1193` | Connector exposes the EIP-1193 `request` interface |
| `isEIP6963` | Connector was discovered via EIP-6963 (MIPD) |

Capability detection is **fail-closed**: if a method cannot be confirmed, the flag is `false`.

---

## Failure Modes

| Failure Mode | Cause | User Impact |
|-------------|-------|-------------|
| `none` | All checks pass | Fully compatible |
| `disconnected` | Connector not currently active | Not usable until connected |
| `unsupported_chain` | Connected chain is not OP Mainnet or OP Sepolia | Must switch network |
| `missing_capability` | Connector lacks `canSign` or `isEIP1193` | Cannot sign transactions |
| `provider_unavailable` | Provider object could not be resolved | Connector is broken |
| `unknown` | Unclassified failure | Investigate via browser console |

---

## Supported Connectors

The matrix supports any wagmi-compatible connector. Tested known connectors:

| Connector | Type | Notes |
|-----------|------|-------|
| MetaMask | `injected` | Full capability, EIP-6963 |
| Coinbase Wallet | `injected` | Full capability |
| WalletConnect | `walletConnect` | Sign + switch chain; `canAddChain` not guaranteed |
| Rainbow | `injected` | Full capability |
| Any EIP-6963 wallet | `injected` | Detected automatically |

---

## Hook: `useWalletCompatibility`

```ts
import { useWalletCompatibility } from '@/hooks/useWalletCompatibility';

const matrix = useWalletCompatibility();
// matrix.uiState — 'loading' | 'empty' | 'error' | 'ready'
// matrix.connectors — ConnectorCompatibilityEntry[]
// matrix.activeConnectorCompatible — boolean
// matrix.refresh() — force re-detection
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `detectionDelayMs` | `number` | `0` | Debounce delay for re-detection; useful for tests |

The hook wraps `buildCompatibilityMatrix` (a pure function in `src/lib/wallet-compatibility.ts`) with live wagmi state from `useAccount` and `useConnectors`.

---

## Components

### `WalletCompatibilityMatrix`

Full table UI component.

```tsx
import { WalletCompatibilityMatrix } from '@/components/wallet';
import { useWalletCompatibility } from '@/hooks/useWalletCompatibility';

function MyPage() {
  const matrix = useWalletCompatibility();
  return (
    <WalletCompatibilityMatrix
      matrix={matrix}
      onRefresh={matrix.refresh}
    />
  );
}
```

Handles all four UI states automatically. Accessible: `role="table"` with column `scope` headers, `aria-live` announcements, keyboard navigation.

### `WalletCompatibilityBadge`

Per-connector inline badge.

```tsx
import { WalletCompatibilityBadge } from '@/components/wallet';

<WalletCompatibilityBadge
  entry={connectorEntry}
  showCapabilities={true}   // optional: show capability list
/>
```

Badge variants: `compatible` (green), `degraded` (yellow), `incompatible` (red), `disconnected` (grey).

---

## Accessibility

- No colour-only communication: icon symbols + text labels accompany every state.
- `role="status"` on badges; `role="alert"` on the error state.
- `aria-live="polite"` on loading and summary regions.
- Table uses proper `scope="col"` / `scope="row"` attributes.
- Reduced-motion safe: no CSS animations on skeleton rows.
- All states pass `jest-axe` WCAG AA checks.

---

## Architecture

```
src/
  lib/
    wallet-compatibility.ts       # Type model + pure utility functions
  hooks/
    useWalletCompatibility.ts     # Wagmi adapter hook
  components/
    wallet/
      WalletCompatibilityBadge.tsx   # Per-connector badge
      WalletCompatibilityMatrix.tsx  # Full table UI
      index.ts                       # Barrel export
      __tests__/
        WalletCompatibilityMatrix.test.tsx
  hooks/__tests__/
    useWalletCompatibility.test.ts
docs/
  WALLET_COMPATIBILITY.md           # This file
```

---

## Security Invariants

- Never fabricates chain state, capabilities, or connection status.
- Fails closed: unknown connectors get `false` for all capabilities.
- Unsupported chains render as degraded — protocol actions remain disabled.
- No production mocks, placeholder addresses, or hidden admin bypasses.
- Optimism/EVM only; no alternate-chain runtime code introduced.

---

## Testing

Run unit tests:
```bash
pnpm test src/hooks/__tests__/useWalletCompatibility.test.ts
```

Run component + accessibility tests:
```bash
pnpm test src/components/wallet/__tests__/WalletCompatibilityMatrix.test.tsx
```

Run all tests:
```bash
pnpm test
```

---

## Related

- `src/hooks/useWallet.ts` — Wallet lifecycle (connect, disconnect, reconnect)
- `src/hooks/useWalletNetwork.ts` — Chain support and switch/add chain logic
- `docs/ux/TRANSACTION_STATE_MODEL.md` — Transaction state model
- `src/lib/transaction-state.ts` — Transaction state machine
