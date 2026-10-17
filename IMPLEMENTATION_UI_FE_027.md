# UI-FE-027 — Immutable Administrative Audit Trail (#596)

**Issue**: [#596 UI-FE-027 — Build Immutable Administrative Audit Trail](https://github.com/DigiNodes/truthbounty-frontend/issues/596)  
**Branch**: `feat/ui-fe-027-administrative-audit-trail`  
**Route**: `/admin/audit`  
**Complexity**: High (200 pts)  
**Visual Authority**: [Administrative Audit Trail Board](https://www.drips.network/external/https%3A%2F%2Fgithub.com%2FDigiNodes%2Ftruthbounty-protocol%2Fblob%2Fmain%2Fdesigns%2Ffrontend-v2%2Fprivileged%2Fboards%2F06-administrative-audit-trail.svg)

---

## 1. Problem Context & Architectural Invariants

Privileged operators, DAO guardians, and protocol auditors require an immutable, source-labelled, exportable audit trail without secrets, credentials, or mutable records.

### Canonical Constraints & Enforcements
1. **Zero Authority Invention**: UI context, wallet connection, or projection API data never grant authority. Mutations are canonical contract-driven; API projection data is freshness-labelled read-only data.
2. **Fail-Closed Gate**: Unauthenticated callers, non-admin addresses, and mismatched chains receive `AdminUnauthorizedState` immediately (`403 Forbidden`). Zero audit data is leaked or projected in unauthorized states.
3. **Protected Values & Secret Sanitization**: Deep sanitization strips JWT tokens, Bearer headers, and inline secrets (`privateKey`, `secret`, `password`, `token`, `cookie`, `seed`, `mnemonic`) using `[REDACTED_SECRET]`.
4. **CWE-1236 Defense (CSV Formula Injection)**: All CSV exports prefix any cell starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single quote (`'`) to neutralize spreadsheet execution attacks.
5. **Distinct Lifecycle States**: The 6 operational lifecycle states (`requested`, `authorized`, `submitted`, `confirmed`, `projected`, `failed`) are rendered with distinct semantic badges, icons, and accessible labels. Confirmation is never conflated with projection.
6. **Strictly Read-Only**: Records are immutable views with no mutate, update, or delete actions.

---

## 2. Architecture & File Structure

```
src/
├── app/
│   ├── (dashboard)/admin/audit/
│   │   └── page.tsx                         # Next.js App Router privileged route (/admin/audit)
│   ├── api/
│   │   ├── admin.api.ts                     # Client API adapter (fetchAdminAuditRecords)
│   │   └── admin/audit/
│   │       └── route.ts                     # Secure GET endpoint with admin validation & filtering
│   └── types/
│       └── admin-audit.ts                   # Core TypeScript types and contracts
├── components/
│   └── features/admin-audit/
│       ├── AdminAuditCards.tsx              # Responsive mobile card layout with semantic headings
│       ├── AdminAuditExportButton.tsx       # Export menu for sanitized CSV & JSON downloads
│       ├── AdminAuditFilters.tsx            # Search, capability, lifecycle, & date filters
│       ├── AdminAuditPagination.tsx         # Accessible pagination (<nav aria-label="Audit log pagination">)
│       ├── AdminAuditStatusBadge.tsx        # Visual badge indicator for the 6 lifecycle states
│       ├── AdminAuditTable.tsx              # Desktop tabular view with expandable details & copy buttons
│       ├── AdminAuditTrailView.tsx          # Composite container managing telemetry, staleness, & fail-closed states
│       ├── AdminAuditTrailView.stories.tsx  # Storybook stories for all 7 scoped states
│       ├── AdminAuditTrailView.interaction.stories.tsx # Play-function interaction tests
│       ├── index.ts                         # Public feature barrel exports
│       └── __tests__/
│           └── AdminAuditTrailView.test.tsx # Component integration tests (17 tests)
├── hooks/
│   └── useAdminAuditTrail.ts                # React hook managing query, freshness (>45s), staleness, & export
├── lib/
│   ├── export/
│   │   ├── audit-export.ts                  # Deterministic sanitized JSON & CSV generator
│   │   └── __tests__/
│   │       └── audit-export.test.ts         # Export unit tests (10 tests)
│   └── security/
│       ├── audit-sanitizer.ts               # Secret scanning, redaction, & CSV formula injection defense
│       └── __tests__/
│           └── audit-sanitizer.test.ts      # Sanitizer security tests (11 tests)
└── __tests__/
    └── accessibility/
        └── admin-audit.a11y.test.tsx        # axe-core WCAG 2.2 AA accessibility checks (5 tests)
```

---

## 3. Scoped UI States & Storybook Coverage

| State | Implementation & Presentation | Storybook Story |
|---|---|---|
| **Authorized (Ready)** | Table (desktop) & Cards (mobile) with copyable values, external explorer links, expandable payloads | `AuthorizedDefault` |
| **Loading** | Accessible skeleton placeholders with `aria-busy="true"` | `LoadingState` |
| **Stale Telemetry** | Banner warning when last sync > 45s: `Audit Trail Telemetry Stale` with refresh action | `StaleTelemetryState` |
| **Unavailable** | Banner warning when indexing service is unavailable or degraded | `UnavailableServiceState` |
| **Unauthorized (Denied)** | Fail-closed security card: `Access Restricted` with operator details | `UnauthorizedDeniedState` |
| **Empty Results** | Empty state when search or filter matches 0 records with reset filter action | `EmptyResultsState` |
| **Pagination** | Multi-page pagination controls with entries counter and direct page jumping | `MultiPagePaginationState` |

---

## 4. Test Verification Matrix

All 44 tests across 5 test suites pass with zero failures:

1. **Security Sanitizer (`src/lib/security/__tests__/audit-sanitizer.test.ts`)**
   - Redacts JWT tokens, Bearer authorization headers, and inline credentials.
   - Preserves legitimate Optimism addresses (`0x...`) and 64-character transaction hashes.
   - Neutralizes CWE-1236 formula injection in CSV exports (`=cmd`, `@SUM`, `+calc`, `-1+1`, tabs).
   - Deeply sanitizes complex nested objects and invalid input types.

2. **Sanitized Export (`src/lib/export/__tests__/audit-export.test.ts`)**
   - Deterministic JSON export with ISO timestamps, schema version, and metadata.
   - Deterministic CSV export with RFC 4180 escaping and quote wrapping.
   - Complete secret scrubbing from both CSV and JSON exported payloads.

3. **API Client (`src/app/api/admin/__tests__/admin.api.test.ts`)**
   - Calls `/api/admin/audit` with correct query parameters and `x-admin-address` header.
   - Propagates 403 Forbidden errors fail-closed.

4. **Component Integration (`src/components/features/admin-audit/__tests__/AdminAuditTrailView.test.tsx`)**
   - 17 interaction tests covering loading, authorized table, unauthorized fail-closed denial, mobile cards, row expansion, filter changes, pagination, copy buttons, and export triggers.

5. **Accessibility CI Gate (`src/__tests__/accessibility/admin-audit.a11y.test.tsx`)**
   - 5 axe-core WCAG 2.2 AA tests with 0 violations across Ready, Denied, Stale, Unavailable, and Empty states.
   - Passes `scripts/verify-accessibility.mjs` checking 19 test files and 12 canonical states with zero skips.

---

## 5. Storybook Interaction Tests

Play functions defined in `AdminAuditTrailView.interaction.stories.tsx` using `@storybook/test`:
- `SearchFilterInteraction`: Verifies user typing and query value retention.
- `ExpandRowDetailsInteraction`: Clicks details toggle and asserts request/result payloads expand.
- `ExportDropdownInteraction`: Opens export menu, triggers CSV sanitized download, and asserts completion feedback.
