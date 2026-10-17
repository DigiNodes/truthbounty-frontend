# Manual Assistive-Technology Acceptance Testing

## Purpose and status

This runbook defines the release acceptance sample for screen readers, keyboard
operation, magnification, and high contrast. It complements, but does not replace,
the automated checks in [Accessibility CI](./accessibility-ci.md) and
[Keyboard navigation](./keyboard-navigation.md).

**Execution status: Not run.** No manual AT results or version claims are recorded
by this change. Complete the matrix on the actual target platforms before
acceptance; an unrun cell is not a pass. Critical and blocking defects cannot be
waived.

## Guardrails

- Use an approved non-production environment and authorized test accounts.
  Do not submit real claims, votes, disputes, or transactions.
- Only report wallet, transaction, finality, permission, health, or legal state
  shown by the reviewed contract receipt or API projection. Use only approved
  test scenarios for rejected, pending, stale, wrong-chain, and recovery states.
- Treat browser storage and remote content as untrusted. Verify that missing,
  stale, wrong-chain, wrong-release, or denied contexts fail closed.
- Do not put credentials, recovery phrases, wallet secrets, personal data,
  private evidence, unredacted account identifiers, or transaction hashes in
  notes, screenshots, or follow-up issues.
- Record defects as focused follow-up issues with reproducible steps, an owner,
  severity, and redacted evidence. Do not silently waive critical/blocking
  findings.

## Environment and version record

Record exact versions from each test run; do not infer or backfill versions.
Record the operating system/build and browser version for every row, plus the
screen-reader version where applicable.

| Target                                 | Operating system/build | Browser/version | Assistive technology/version                 | Tester/date | Result  |
| -------------------------------------- | ---------------------- | --------------- | -------------------------------------------- | ----------- | ------- |
| NVDA + Chrome                          | Not run                | Not run         | Not run                                      | Not run     | Not run |
| NVDA + Firefox                         | Not run                | Not run         | Not run                                      | Not run     | Not run |
| VoiceOver + Safari                     | Not run                | Not run         | Not run                                      | Not run     | Not run |
| Keyboard only (Chrome)                 | Not run                | Not run         | N/A                                          | Not run     | Not run |
| Magnification (Chrome)                 | Not run                | Not run         | OS/browser magnifier and zoom level: not run | Not run     | Not run |
| High contrast / forced colors (Chrome) | Not run                | Not run         | OS mode and `forced-colors` state: not run   | Not run     | Not run |

For keyboard, magnification, and forced-colors runs, record the actual browser,
operating-system feature, zoom/magnification level, and whether forced-colors
was active. Use the supported OS/browser combination available to the tester;
do not describe a browser emulation as an OS high-contrast run.

## Journey sample

Run every journey against each target in the matrix below. Use the approved
release's actual routes and data; the routes listed here are starting points,
not permission to fabricate or mutate protocol state.

| ID  | Journey and starting surface                                                      | Acceptance observations                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | Claimant: `/`, open a claim, then `/claims/new`                                   | Read the page title and landmarks; browse the claims table; identify each row/action; complete and invalidate form fields without submitting a real claim; verify errors, required-field instructions, and focus.                                                                                                                        |
| J2  | Verifier/dispute: `/verifier`, a permitted claim detail, and `/disputes`          | Identify the claim and its evidence/status; inspect available verify/reject or dispute actions without submitting; distinguish empty, stale, denied, and error states; verify controls do not imply an unconfirmed outcome.                                                                                                              |
| J3  | Privileged access: `/admin`                                                       | With an account lacking the reviewed capability, confirm denial is announced and actions are unavailable. With an explicitly authorized non-production account, confirm the allowed view and its read-only or authorized actions. Never infer permission from a visible control.                                                         |
| J4  | Transaction recovery: transaction status from an approved non-production workflow | Inspect pending/confirming/failed or rejected/replaced/reorg recovery states that are actually available; verify the announcement, error/retry guidance, and focus order; confirm no success/finality is announced without authoritative receipt/projection.                                                                             |
| J5  | Status and support: global navigation/status notices and `/how-it-works`          | Locate the current status/degraded or recovery notice and its action; verify announcement and recovery guidance. Record whether a distinct approved support destination exists. Do not present `/how-it-works` as support if it is only guidance.                                                                                        |
| J6  | Consent: analytics privacy controls on the app shell                              | Navigate and choose Allow, Reject, and Manage preferences where safe; verify the current choice, focus after each transition, and fail-closed behavior when storage is unavailable. This is optional analytics consent, not legal consent. Record any separately approved legal-consent journey only if it exists in the tested release. |

## Per-target test matrix

For each cell, record `Pass`, `Fail`, or `Blocked` with a defect/follow-up
reference. Leave no blank cells on a completed run. `Not run` means acceptance
evidence is still outstanding.

| Target                                 | J1 Claimant | J2 Verifier/dispute | J3 Privileged | J4 Recovery | J5 Status/support | J6 Consent |
| -------------------------------------- | ----------- | ------------------- | ------------- | ----------- | ----------------- | ---------- |
| NVDA + Chrome                          | Not run     | Not run             | Not run       | Not run     | Not run           | Not run    |
| NVDA + Firefox                         | Not run     | Not run             | Not run       | Not run     | Not run           | Not run    |
| VoiceOver + Safari                     | Not run     | Not run             | Not run       | Not run     | Not run           | Not run    |
| Keyboard only (Chrome)                 | Not run     | Not run             | Not run       | Not run     | Not run           | Not run    |
| Magnification (Chrome)                 | Not run     | Not run             | Not run       | Not run     | Not run           | Not run    |
| High contrast / forced colors (Chrome) | Not run     | Not run             | Not run       | Not run     | Not run           | Not run    |

## Checks for every journey

- **Keyboard and focus:** traverse in a logical order with Tab and Shift+Tab;
  activate controls with Enter/Space; verify visible focus, skip links, dialog
  containment, Escape behavior, and focus restoration. No keyboard trap or
  pointer-only action is acceptable.
- **Names, roles, and states:** confirm headings, landmarks, links, buttons,
  form labels, required/invalid/disabled states, table headers and associations,
  and dialog names are understandable and match the visible UI.
- **Announcements:** verify meaningful loading, empty, stale, error, transaction,
  and recovery updates are announced once at an appropriate urgency. No
  repeated, missing, or success-shaped announcements for unverified states.
- **Visual access:** at the recorded magnification, content and controls remain
  available without clipping or unintended two-dimensional scrolling; focus,
  errors, state, and control boundaries remain perceivable in forced colors.
  Do not rely on color alone.
- **Privacy and integrity:** ensure no secrets or protected evidence are exposed
  in accessible names, announcements, or evidence. Persisted preferences and
  remote strings must not produce trusted permission, contract, or legal state.

## Findings and follow-ups

Create one focused issue per defect. Include:

- affected journey and exact route, release/commit, environment and versions;
- prerequisite state using approved non-production accounts only;
- numbered reproduction steps and expected versus actual behavior;
- impact/severity, reproducibility, and a named owner;
- redacted evidence with no user secrets or protected content.

Do not include production credentials or real transaction/claim data. Link the
resulting issue in the matching matrix cell. If a journey cannot be exercised
because the release lacks that surface or approved test context, mark it
`Blocked`, explain why, and assign the follow-up; do not mark it `Pass`.

## Known scope limitations to resolve

- The current frontend contains an optional analytics preference flow. It is
  not a legal-consent flow. No separate legal-consent surface was identified
  in the routes inspected for this runbook; the issue assignee, samueldoo, must
  identify and test the approved legal journey or record a focused follow-up.
- `/how-it-works` is explanatory content, not a dedicated support destination.
  The issue assignee, samueldoo, must identify the approved support/status
  destination or record that limitation and its owner.
- The privileged allowed state and transaction recovery scenarios require
  approved non-production capabilities and authoritative states. If those
  contexts are unavailable, mark the corresponding cells `Blocked`.

Acceptance is complete only when the environment/version record is populated,
all required matrix cells have results or explicitly owned blockers, critical
and blocking issues are fixed without waiver, and residual limitations have
named owners.

## Dependency handoff

As checked on 2026-10-15, the listed prerequisites remain open: #575 (Storybook
visual/accessibility gates), #619 (zoom, reflow, and text spacing), and #618
(async and transaction live announcements). This runbook does not mark those
dependencies complete. The #642 assignee, samueldoo, owns confirming their
completion and recording any resulting blockers before acceptance.
