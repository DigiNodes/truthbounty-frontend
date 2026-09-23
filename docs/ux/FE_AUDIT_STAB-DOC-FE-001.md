# STAB-DOC-FE-001 — Frontend Screen, Route & Role Coverage Audit

**Type:** Evidence-only inventory (no product/redesign changes, no new authority or permissions).
**Approved runtime:** Optimism/EVM.
**Audited against (UX authority):**
- `docs/ux/INFORMATION_ARCHITECTURE.md` (primary navigation, route map, claim-detail hierarchy, information-state requirements)
- `docs/ux/TRANSACTION_STATE_MODEL.md` (transaction lifecycle states)
- `docs/ux/DESIGN_SYSTEM.md` (responsive/accessibility expectations)

**Method:** static inventory of `src/app` route segments, `src/components/layout/Sidebar.tsx` navigation, and per-screen data/state handling on `main`. Every claim below cites a repository path. This document proposes no new roles, routes, or authority; it only classifies what exists against the published authority so maintainers can convert verified gaps into separate implementation issues.

> **Note on role authority:** the issue lists a maintainer-approved *role/capability matrix* as a dependency. No such matrix file exists in the repo at audit time (`docs/` contains IA, design-system, transaction-state, and `SIWE_AUTH.md` only). Role columns below are therefore **inferred** from the IA primary navigation and the role/actor fields in `src/app/types/{claim,verification,dispute}.ts`, and are flagged as *unverified* pending the published matrix — not proposed as authority.

---

## 1. Implemented route inventory

Route groups live under `src/app/(dashboard)/`; the `(dashboard)` group segment does **not** add a `/dashboard` URL prefix.

| URL | Screen / file | Primary goal | Data / tx authority | Inferred roles | Classification |
|---|---|---|---|---|---|
| `/` | `(dashboard)/page.tsx` → `components/features/ActiveClaimsTable` | Active-claims feed | API projection (`app/queries/claims.queries.ts` `useClaims`) | Any visitor | **Maps to authority `/claims`** (URL differs) |
| `/claims/[id]` | `(dashboard)/claims/[id]/page.tsx` (`'use client'`, 284 ln) | Claim lifecycle / evidence / verification / stake action | API projection + receipt status | Any visitor; wallet for actions | **Implemented** (authority `/claims/[claimId]`; param named `id`) |
| `/claim-detail` | `(dashboard)/claim-detail/page.tsx` (`ClaimDetailRedirectPage`) | Legacy redirect | — | — | **Dead redirect** → target route does not exist (see §5) |
| `/how-it-works` | `(dashboard)/how-it-works/page.tsx` (303 ln) | Protocol explainer | Static content | Any visitor | **Partial** of authority `/protocol` (only "how it works" sub-item) |
| `/identity` | `(dashboard)/identity/page.tsx` (`IdentityPage`, 131 ln) | Session / identity | Wallet + non-authoritative API (`api/identity`) | Wallet-connected user | **Partial** of authority `/settings` (only session/identity) |
| `/api/claims`, `/api/identity`, `/api/protocol` | `src/app/api/**/route.ts` | Route handlers (non-screen) | Projection/read layer | — | Support endpoints (out of screen scope) |

## 2. Authority route-map coverage

Authority route map: `docs/ux/INFORMATION_ARCHITECTURE.md` → "Route map".

| Authority route | Purpose (authority) | Implemented? | Evidence / classification |
|---|---|---|---|
| `/claims` | Searchable claim feed | **Partial** | Feed exists at `/` via `ActiveClaimsTable`; not at `/claims`, and no search/filter surfaced. |
| `/claims/[claimId]` | Claim lifecycle detail | **Yes** | `(dashboard)/claims/[id]/page.tsx` (param `id`, not `claimId`). |
| `/claims/new` | Build & submit claim tx | **Gap** | No submit route/screen. |
| `/verify` | Claims accepting verification | **Gap** | No route/screen. |
| `/disputes` | Challenge windows / appeals | **Gap** | No route/screen (dispute *types* exist in `src/app/types/dispute.ts`). |
| `/activity` | Wallet-scoped activity | **Gap** | No route/screen. |
| `/rewards` | Entitlements / withdrawals | **Gap** | No route/screen. |
| `/protocol` | Network/release/contract provenance | **Partial** | Only `/how-it-works`; params/supported-assets/provenance not routed. |
| `/settings` | Wallet/session/preferences | **Partial** | Only `/identity` (session/identity); wallet/network + notification/accessibility prefs not routed. |

## 3. Primary-navigation coverage

Authority nav (IA "Primary navigation") vs implemented `src/components/layout/Sidebar.tsx`.

| Authority nav section | In sidebar? | Evidence |
|---|---|---|
| Claims (all / detail / evidence / verification status) | **No dedicated entry** | Sidebar has no Claims link; the only in-app `Link` is `/how-it-works` (`Sidebar.tsx:173`). |
| Submit Claim | **No** | — |
| My Activity | **No** | — |
| Verifiers (open verification / disputes / reputation) | **No** | — |
| Protocol (how it works / parameters / provenance) | **Partial** | "How it works" only (`Sidebar.tsx:173`). |
| Settings (wallet/network / session / preferences) | **No sidebar entry** | `/identity` exists but is not linked from the sidebar. |
| — external resource links (docs/GitHub/Discord/bug report) | Present | `Sidebar.tsx:179–197` (`RESOURCE_LINKS.*`). |

## 4. Role & golden-journey coverage (inferred — pending authority matrix)

| Actor (inferred) | Golden journey (from IA) | Screen(s) present | Coverage |
|---|---|---|---|
| Visitor (unauthenticated) | Browse claims, read protocol | `/` feed, `/claims/[id]`, `/how-it-works` | Present |
| Claimant / submitter | Create & submit a claim | — | **Gap** (`/claims/new` missing) |
| Verifier | Find open verification, stake, submit verification | Stake UI inside `/claims/[id]`; no `/verify` index | **Partial** |
| Disputant / appellant | Open/track disputes & appeals | — | **Gap** (`/disputes` missing; types exist) |
| Wallet-connected user | Manage session/identity; view activity/rewards | `/identity` only | **Partial** (`/activity`, `/rewards` missing) |

## 5. Dead / duplicate / mismatched routes

- **Dead route `/dashboard/claims`** — referenced twice but no matching segment exists (routes live under the group `(dashboard)`, which does not prefix `/dashboard`):
  - `(dashboard)/claim-detail/page.tsx:11` → `router.replace('/dashboard/claims')`
  - `(dashboard)/how-it-works/page.tsx:292` → `href="/dashboard/claims"`
  Both navigate to a non-existent URL (404). Convertible to a fix issue.
- **`/claim-detail` redirect is doubly broken** — it exists only to `router.replace` to the dead `/dashboard/claims`, so it is both a duplicate of the claim surface and a dead redirect.
- **Param-name drift** — authority uses `[claimId]`; implementation uses `[id]` (`(dashboard)/claims/[id]/`). Cosmetic but worth aligning with the route contract.

## 6. Information-state coverage (vs IA "Information-state requirements")

IA requires every route to define loading, empty, partial, stale, degraded, error, offline and unauthorized states.

| Screen | Observed state handling | Gap vs authority |
|---|---|---|
| `/` feed | `useClaims` loading passed to `ActiveClaimsTable` (`(dashboard)/page.tsx:14,40`) | empty / error / stale / offline / unauthorized not evident |
| `/claims/[id]` | `claimNotFound` state (`claims/[id]/page.tsx:16`) | loading / empty / stale / degraded / error / offline / unauthorized + protocol-action states (wrong-chain, approval-required, rejected, confirming, finalized, reverted, dropped, reorged) not evident |
| `/identity` | Several state branches present (session/identity) | full IA state matrix not confirmed |
| `/how-it-works` | Static content | N/A (no async authority data) |

> Related V2 work already introduces some of these state surfaces as components: `src/components/transactions/*` (transaction states) and the aggregation summary from **#319**. Their absence from routed screens is the gap, not the components.

## 7. Gap register (for maintainers to convert into issues)

Evidence-only; no authority proposed here.

1. Missing routes: `/claims/new`, `/verify`, `/disputes`, `/activity`, `/rewards`; and provenance/parameters under `/protocol`, wallet/network + preferences under `/settings`.
2. Missing primary-navigation entries for Claims, Submit, My Activity, Verifiers, Settings (`src/components/layout/Sidebar.tsx`).
3. Dead route `/dashboard/claims` + broken `/claim-detail` redirect (§5).
4. Information-state gaps on `/` and `/claims/[id]` vs IA requirements (§6).
5. Route/param alignment: `/` vs authority `/claims`; `[id]` vs `[claimId]`.
6. Dependency: publish the maintainer-approved **role/capability matrix** so role coverage (§4) can be verified rather than inferred.
