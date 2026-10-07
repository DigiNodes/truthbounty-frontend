# Gate C Storybook boundary

Storybook implements the approved UX authority from
`truthbounty-protocol/docs/ux-authority` and the high-fidelity prototype in
`truthbounty-protocol/designs/frontend-v2/prototype`.

## Rules

- Stories display illustrative, visibly non-canonical data only.
- Story fixtures must remain inside `*.stories.*`, `*.test.*`, or an explicit
  `__fixtures__` directory and may never be imported by production modules.
- Components receive capability and lifecycle state from adapters; they do not
  infer protocol authority, settlement, rewards, confirmations, finality, or
  projection freshness.
- Chain-confirmed and API-projected state are separate variants.
- Optimism/EVM is the only runtime. “Stellar Wave” is a contribution-program
  label and is not product/runtime authority.
- New visual or interaction patterns require an authority mapping in the PR.

## Required state coverage

Every stateful component must cover the applicable loading, empty, stale,
disabled and error states. Transaction surfaces must distinguish pending,
confirmed, finalized, rejected, reverted, replaced, dropped, reorged and
indexer-delayed states.

## Responsive and accessibility matrix

Stories are checked at 390 px, 768 px and 1440 px, in light and dark themes.
Keyboard behavior, visible focus, semantic labels, contrast, reduced motion and
long-content behavior are required acceptance evidence.
