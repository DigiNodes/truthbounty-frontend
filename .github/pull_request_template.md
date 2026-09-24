## Linked task

Closes: <!-- exactly one active V2-FE issue -->
Head SHA reviewed: `<!-- full SHA -->`

## Summary

<!-- Explain the smallest cohesive user journey or frontend capability. -->

## Scope and assignment

- [ ] The linked issue has the exact `Stellar Wave` label.
- [ ] The PR author is assigned or explicitly approved by a maintainer.
- [ ] This PR resolves one task and all dependencies are safely completed.

## Architecture, UX, and security

- [ ] Optimism/EVM wallet tooling and canonical ABI/address artifacts are used.
- [ ] No fabricated calldata, gas, transaction hash, receipt, reward, reputation, or settlement is presented.
- [ ] Contracts remain authoritative and the API remains a projection/read layer.
- [ ] Unsupported chain, missing configuration, stale critical data, rejection, revert, replacement, finality, and reorg states fail safely.
- [ ] Keyboard, focus, screen-reader, responsive, and reduced-motion behavior was considered.
- [ ] No Stellar/Soroban/Freighter runtime, secret, placeholder address, or production mock is bundled.

## Validation

- [ ] Lint, typecheck, unit tests, and production build pass.
- [ ] Wallet/provider integration tests pass.
- [ ] Accessibility and E2E tests pass.
- [ ] Bundle, dependency, security, and artifact-drift checks pass.
- [ ] Required human CODEOWNER approval applies to this exact head SHA.
