/**
 * V2-FE-070 / UI-FE-063 — Internationalization Configuration
 *
 * Core i18n setup for TruthBounty frontend.
 * Supports locale detection, message loading, and formatting.
 *
 * UI-FE-063 adds:
 * - an explicit primary/fallback locale policy, and
 * - non-production pseudo-locales used to expose hard-coded copy, missing
 *   translations, and layout expansion before a translation is ever approved.
 *
 * Pseudo-locales are never routable in production and never satisfy a real
 * translation requirement.
 */

/**
 * Locales whose catalogues may ship to production, in priority order.
 * `en` is the canonical source of truth; the remaining locales are declared
 * but only become usable once a reviewed catalogue exists.
 */
export const shippableLocales = ['en', 'es', 'fr', 'de', 'zh', 'ja'] as const;

/**
 * Non-production pseudo-locales (UI-FE-063).
 *
 * - `en-XA` — accented, length-expanded English. Any string that is NOT drawn
 *   from the catalogue renders as plain ASCII, so hard-coded copy becomes
 *   obvious while expansion exposes truncation and overflow.
 * - `ar-XB` — right-to-left bidi pseudo-locale used to exercise RTL readiness.
 *
 * Neither tag is a real translation and neither may be presented as approved
 * copy. They are stripped from production routing (`getRuntimeLocales`).
 */
export const pseudoLocales = ['en-XA', 'ar-XB'] as const;

/** Every locale tag the codebase understands (shippable first). */
export const locales = [...shippableLocales, ...pseudoLocales] as const;

export type ShippableLocale = (typeof shippableLocales)[number];
export type PseudoLocale = (typeof pseudoLocales)[number];
export type Locale = ShippableLocale | PseudoLocale;

/** The canonical locale every catalogue is authored in. */
export const primaryLocale: Locale = 'en';

/** Locale used for detection/routing and as the last-resort fallback. */
export const defaultLocale: Locale = 'en';

/** Locale whose copy is served when a requested catalogue is incomplete. */
export const fallbackLocale: Locale = 'en';

/** Locale tags whose scripts are right-to-left (RTL readiness). */
export const rtlLocales: readonly string[] = ['ar-XB'];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  zh: '中文',
  ja: '日本語',
  // Pseudo-locales are labelled so a reviewer can never mistake them for real.
  'en-XA': 'Pseudo (Accented) — not a translation',
  'ar-XB': 'Pseudo (Bidi) — not a translation',
};

/** True when running a production bundle. */
export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Type guard for a non-production pseudo-locale tag. */
export function isPseudoLocale(
  locale: string | undefined | null,
): locale is PseudoLocale {
  return (
    typeof locale === 'string' &&
    (pseudoLocales as readonly string[]).includes(locale)
  );
}

/** Type guard for a shippable locale tag. */
export function isShippableLocale(
  locale: string | undefined | null,
): locale is ShippableLocale {
  return (
    typeof locale === 'string' &&
    (shippableLocales as readonly string[]).includes(locale)
  );
}

/** Type guard for any understood locale tag. */
export function isLocale(locale: string | undefined | null): locale is Locale {
  return (
    typeof locale === 'string' && (locales as readonly string[]).includes(locale)
  );
}

/** Whether a locale's script lays out right-to-left. */
export function isRtlLocale(locale: string | undefined | null): boolean {
  return typeof locale === 'string' && rtlLocales.includes(locale);
}

/**
 * Pseudo-locales are only addressable outside production. In production they
 * behave like any other missing locale and fall back to the primary locale.
 */
export function isNonProductionLocale(
  locale: string | undefined | null,
): boolean {
  return !isProductionEnvironment() && isPseudoLocale(locale);
}

/**
 * Locales addressable in the current environment.
 * Production excludes every pseudo-locale (fail closed).
 */
export function getRuntimeLocales(): Locale[] {
  return isProductionEnvironment()
    ? [...shippableLocales]
    : [...shippableLocales, ...pseudoLocales];
}

/**
 * Resolve an arbitrary tag to the locale that should actually be served.
 * Unknown tags and pseudo-locales in production resolve to `fallbackLocale`.
 */
export function resolveLocale(locale: string | undefined | null): Locale {
  if (isNonProductionLocale(locale)) return locale as PseudoLocale;
  if (isShippableLocale(locale)) return locale;
  return fallbackLocale;
}

/**
 * Configuration for next-intl.
 * This is used by the middleware and in the root layout.
 */
export const i18nConfig = {
  locales: getRuntimeLocales(),
  defaultLocale,
  localePrefix: 'as-needed' as const,
};
