# UI-FE-063 — Pseudo-Locale, Missing-Copy, and Layout-Expansion Gates

**Issue:** [#633](https://github.com/DigiNodes/truthbounty-frontend/issues/633)
**Branch:** `feat/633-pseudo-locale-gates`
**Base:** `origin/main`

## What changed

### Locale policy (`src/i18n/config.ts`)

The locale list is now explicitly split into **shippable** and **pseudo**
locales with a single fallback authority:

- `shippableLocales` — `en` plus declared-but-untranslated locales. A locale is
  only served once a reviewed catalogue is registered (see below).
- `pseudoLocales` — `en-XA` (accented, length-expanded) and `ar-XB`
  (right-to-left bidi). Labelled "not a translation" so neither can be mistaken
  for approved copy.
- `primaryLocale` / `fallbackLocale` (`en`), `rtlLocales`, and helpers
  `isPseudoLocale`, `isShippableLocale`, `isLocale`, `isRtlLocale`,
  `isNonProductionLocale`, `getRuntimeLocales`, `resolveLocale`.

`getRuntimeLocales()` strips every pseudo-locale in production, so a pseudo tag
is never routeable in a shipped build (fail closed).

### Catalogue resolution and fallback (`src/i18n/fallback.ts`)

`CATALOGS` is the registry of reviewed catalogues (only `en` today).
`resolveCatalog()` returns `{ locale, messages, usedFallback, pseudo }`:

| Requested | Result |
|---|---|
| Registered locale | Served directly (`usedFallback: false`) |
| Pseudo-locale (non-production) | Canonical catalogue + pseudo transform (`pseudo: true`) |
| Pseudo-locale (production) | canonical `en` (`pseudo: false`) |
| Declared-but-untranslated / unknown | canonical `en` (`usedFallback: true`) |

This fixes a pre-existing bug: `config.ts` listed `es,fr,de,zh,ja` while only
`messages/en.json` existed, so a dynamic import could resolve to nothing with no
fallback. Unregistered locales now resolve deterministically to `en`.

### Pseudo-locale generation (`src/i18n/pseudo-locale.ts`)

A deterministic transform that accents copy, expands it by ~40%, and wraps each
string in `⟦…⟧` markers. It is ICU-aware:

- `{placeholders}` are preserved verbatim;
- `plural` / `select` / `selectordinal` syntax and `#` are preserved, only the
  human-readable branch copy is transformed;
- `number` / `date` / `time` format arguments pass through untouched;
- legal namespaces are excluded.

Because the transform is pure and deterministic it is safe for screenshot and
hydration comparisons.

### Missing-copy behaviour (`src/i18n/fallback.ts`, `src/i18n/request.ts`)

`getMessageFallback()` (wired into next-intl's `getMessageFallback`):

| Environment | Behaviour |
|---|---|
| Non-production | Visible marker `⟦missing:ns.key⟧` |
| Production | Canonical English copy (never a marker) |
| Legal key (both) | `[[legal-copy:unavailable]]` (fail closed) |

`onError` logs missing/formatting problems only outside production.

### Legal-copy policy (`src/i18n/legal.ts`)

Legal namespaces (`legal, terms, privacy, disclosures, consent`) are never
pseudo-localized, and `resolveLegalCopy()` returns `approved` **only** when the
requested version matches the approved version, the locale matches the approved
locale, and copy is present. Every other case returns `unavailable`, so an
approval can never be fabricated from stale or untranslated wording.

### Root layout (`src/app/layout.tsx`)

`<html>` now derives `lang` and `dir` from the active locale
(`isRtlLocale ? "rtl" : "ltr"`), and the tree is wrapped in
`NextIntlClientProvider` so client components can read the locale/messages.

### Build/CI gate (`scripts/verify-i18n-gates.mjs`)

A fail-closed gate that bundles the **real** TypeScript i18n modules with
esbuild and imports them, so it exercises shipped code rather than a copy. It
enforces six gates and is wired into `prebuild`:

1. pseudo expansion + boundary markers for every non-legal catalogue string;
2. ICU placeholder / `#` preservation;
3. unknown locale falls back to the canonical catalogue;
4. missing-copy visible in dev, safe in production;
5. legal keys never pseudo-localized and never falsely approved;
6. pseudo-locales excluded from production routing.

`npm run verify:i18n` runs it; `npm run test:i18n` runs its unit tests.

## Acceptance criteria

| Criterion | Evidence |
|---|---|
| User-facing copy is discoverable and versioned | `CATALOGS` registry + `resolveCatalog`; catalogue completeness gate |
| Missing translations are visible in non-production and safe in production | `getMessageFallback`; `fallback.test.ts`, `missing-key.test.ts`, gate |
| Expanded text does not hide actions | `pseudo-locale.spec.ts` layout assertions; long-word tests |
| Legal copy cannot silently fall back to an unapproved version | `legal.ts` fail-closed `resolveLegalCopy`; gate + unit tests |

## Tests

| Layer | File |
|---|---|
| Gate unit tests (node:test) | `scripts/__tests__/verify-i18n-gates.test.mjs` |
| Pseudo transform | `src/__tests__/i18n/pseudo-locale.test.ts` |
| Fallback / catalogue | `src/__tests__/i18n/fallback.test.ts` |
| Missing copy | `src/__tests__/i18n/missing-key.test.ts` |
| Plural + long word + dates | `src/__tests__/i18n/plural-longword.test.ts` |
| RTL / bidi | `src/__tests__/i18n/bidi.test.ts` |
| Hydration parity | `src/__tests__/i18n/hydration-parity.test.tsx` |
| Pseudo screenshots + layout | `e2e/pseudo-locale.spec.ts` |

## Notes

- Jest now transforms `@formatjs/*`, `intl-messageformat`, `next-intl`, and
  `use-intl` so the ESM-only i18n dependency graph resolves under jsdom.
- Pre-existing failures in `src/__tests__/i18n/component-integration.test.tsx`
  (missing `verification`/`common` keys in `messages/en.json`) are unrelated to
  this change and reproduce on a clean `origin/main` checkout.
