# V2 Transaction UX State Model

All protocol write hooks and screens implement this shared state model.

| State | Meaning | Required UX |
|---|---|---|
| `idle` | No action started | Show eligibility and prerequisites |
| `validating` | Local/chain preconditions checked | Preserve form and show progress |
| `approvalRequired` | ERC-20 allowance insufficient | Explain separate approval transaction |
| `awaitingSignature` | Wallet request open | Show exact action/network/value |
| `rejected` | User rejected request | Preserve form; safe retry |
| `submitted` | Hash returned, not yet confirmed | Link hash and warn not final |
| `replaced` | Original tx replaced | Follow replacement hash |
| `confirming` | Canonical receipt observed | Show confirmations/finality status |
| `confirmed` | Receipt succeeded | Refresh projections; distinguish from finality |
| `finalized` | Finality policy satisfied | Show durable success |
| `reverted` | Receipt failed | Decode safe error and recovery |
| `dropped` | No canonical receipt within policy | Offer reconciliation/retry guidance |
| `reorged` | Previously observed receipt orphaned | Remove success and reconcile |
| `configurationError` | Chain/address/ABI mismatch | Fail closed; no signature action |

## Invariants

- A timer cannot transition a transaction to success.
- A simulated result cannot be displayed as a receipt.
- Hashes come only from the wallet/provider.
- Account or chain changes invalidate incompatible prepared intent.
- UI and cache reconcile to the canonical replacement or reorg outcome.
- Forms preserve user-authored content after recoverable failure.
