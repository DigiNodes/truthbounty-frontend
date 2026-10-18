# Privacy-Safe Error Boundaries & Correlation References

Implements **UI-FE-053 (#626)**. One reusable implementation, used by every
approved screen. Not a redesign of any board; no new API/contract authority.

## What it gives you

| Need | Use |
| --- | --- |
| Wrap page content | `RouteErrorBoundary` |
| Wrap one screen composition (a board, a panel group) | `CompositionErrorBoundary` |
| Wrap one widget (card, chart, table) | `WidgetErrorBoundary` |
| Next.js `error.tsx` | `RouteErrorFallback` (already wired for root, dashboard, claim detail) |
| Throw from an adapter | `adapterErrorFromResponse(res, 'api')` / `toAdapterError(e, 'rpc')` |
| Throw when authority is denied | `new AuthorityDeniedError('verifier_role_required')` |

```tsx
import { WidgetErrorBoundary } from '@/components/errors';

<WidgetErrorBoundary scope="claims:activity-chart" resetKeys={[claimId]}>
  <ActivityChart claimId={claimId} />
</WidgetErrorBoundary>
```

`scope` is a developer constant matching `[a-z0-9:_-]`, max 64. Anything else is
replaced with `unknown` and never echoed.

`MainLayout` already wraps the sidebar and topbar (widget level) and the page
content (route level, reset on navigation). A failing page therefore keeps the
shell. `FeatureErrorBoundary` now delegates to `CompositionErrorBoundary`.

## Four kinds, never mixed up

| Kind | Meaning | Offered actions |
| --- | --- | --- |
| `user` | Person can fix it (declined wallet prompt, wrong network, not found) | Try again (if sensible), Go back |
| `dependency` | API / RPC / network / lazy chunk unavailable | Try again (if retryable), Reload, Copy error report |
| `denied` | Authority denied (401/403, missing role, disabled capability) | **None of retry/reload/report.** Copy says it is an access decision, not a technical error |
| `defect` | Unexpected application fault | Try again, Reload, Copy error report |

Classification uses **typed signals only**: an `AdapterError` instance (never a
look-alike object), numeric HTTP status, and standardised wallet/RPC error
names/codes (EIP-1193, JSON-RPC, viem). Free-text messages are never used to
decide `denied`. The only message matching is for two framework-owned strings
(lazy-chunk load, hydration). Unknown input fails closed to `defect`.

Two non-obvious choices:

- **Chunk-load failure offers Reload, not Try again.** `React.lazy` caches the
  rejected import, so an in-place retry would re-throw the same rejection.
- **Wrong chain is `user`, not `denied`.** It is correctable by the person and is
  not an authority decision.

## Correlation references

Format `TB-XXXX-XXXX-XXXX` (Crockford base32, 60 random bits).

- Minted references are **random** and never derived from a wallet, signature,
  token, evidence value, route or message.
- A reference from an adapter (`x-correlation-id`, then `x-request-id`) is
  untrusted. It is shown only if it matches our format or a hyphenated UUID;
  otherwise it is dropped and a local one is minted, and `correlationRejected`
  is recorded for telemetry. A reference is accepted verbatim or not at all.
- The response **body** is never read into an error.

## Privacy

- The fallback renders static copy plus the reference. Never the message, stack,
  props, URL, wallet, or server text.
- Before React logs a caught error, `scrubErrorInPlace` rewrites its
  `message`/`stack`/`cause` chain (signatures, keys, JWT, Bearer, emails, URLs,
  CIDs, addresses). Telemetry gets only allow-listed fields
  (`correlationRef, kind, source, scope, level, correlationRejected`) and the
  machine **code** as the message.
- "Copy error report" produces an allow-listed report (reference, category,
  code, source, scope, release, time, numeric digest) and emits one
  de-duplicated telemetry incident. The UI states honestly whether the copy
  succeeded; it never claims the report was "sent".

## Bounded, accessible recovery

- Retries: 3 per sliding 5-minute window per boundary; route `reset()` is
  persisted per scope so a remount cannot reset the count. Reload: 2 per window,
  persisted in `sessionStorage` (`tb-err-budget:*`). Nothing is automatic.
- `resetKeys` (e.g. pathname) clears the error and restores the budget.
- Pending-transaction recovery keys (`truthbounty-pending-transactions-v2`,
  `tb-tx-v2:*`) are never read, written or cleared.
- Focus moves to the fallback heading **only** when focus would otherwise be
  lost; it never steals focus from a field being edited elsewhere. After a
  successful retry focus returns to the previously focused element (by `id` or
  `data-focus-key`), else the first focusable, else a heading.
- Native buttons, visible focus rings, 44px targets, kind conveyed by text and
  icon (not colour), `role="alert"` (assertive for faults, polite for denials),
  and a separate polite status region for report outcomes.

## Tests

`src/lib/errors/__tests__`, `src/components/errors/__tests__`,
`src/app/lib/__tests__/api.adapter.test.ts`,
`src/components/layout/__tests__/MainLayout.errorBoundary.test.tsx`:
render, hydration (real `hydrateRoot`), lazy-chunk, adapter and nested-boundary
failures; redaction snapshots across DOM/console/telemetry/report;
recovery-loop and focus restoration; axe at every kind × level.
