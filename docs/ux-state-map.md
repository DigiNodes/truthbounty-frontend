# Frozen UX/State Map

## State Architecture
1. **Idle / Empty State**: Rendered when wallet is disconnected or no active claims exist.
2. **Read / Projection State**: UI safely projects cached states from API layer.
3. **Draft / Validation State**: User constructs transactions. Forms validate statically before hitting RPC.
4. **Simulation State**: RPC dry-run. If validation fails, UI gracefully presents canonical revert reason.
5. **Pending / Submit State**: Active canonical wallet transaction. No mocked transaction hash is surfaced.
6. **Confirmed / Finality State**: Wait for canonical network finality. Reorgs are watched actively.
7. **Rejection / Fail-closed State**: User denies request in wallet, or contract asserts invalid state. Flow halts safely without orphaned UI loading indicators.

## Failure Behavior 
- Unsupported chains correctly prevent write flows.
- Stale critical data prevents transaction submission.
- Reorgs revert the UI back to previous canonical state rather than fabricating success.
