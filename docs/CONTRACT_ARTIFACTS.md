# Contract Release Artifacts

The frontend consumes a pinned TruthBounty V2 release package under `release/`.

## Layout

- `manifest.json` — protocol version, chain ID, contract topology
- `addresses/<chainId>.json` — deployed addresses
- `abi/*.json` — contract ABIs
- `events/event-schema.json` — indexed event schema version
- `parameters/<chainId>.json` — on-chain parameter snapshot
- `roles/<chainId>.json` — role holder addresses
- `checksums.json` — SHA-256 checksums for every tracked file

## Verification

```bash
pnpm verify-artifacts
pnpm type-check
pnpm test src/lib/contracts
pnpm build
```

Build runs `verify-artifacts` automatically via `prebuild`.

## Environment

- `NEXT_PUBLIC_PROTOCOL_RELEASE` — optional pin (defaults to manifest `protocolVersion`)
- `TRUTHBOUNTY_ARTIFACT_DIR` — optional override for the release directory (CI/build only)

Diagnostics: `GET /api/protocol`
