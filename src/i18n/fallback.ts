/**
 * UI-FE-063 — Catalogue resolution, fallback policy, and missing-key behaviour.
 *
 * Policy:
 * - `en` is the canonical catalogue. Other declared locales only become usable
 *   once a reviewed catalogue is registered in `CATALOGS`.
 * - A missing key is **visible** outside production (`⟦missing:ns.key⟧`) and
 *   **safe** in production (resolved to the canonical English copy).
 * - Legal namespaces fail closed in every environment: a missing or unapproved
 *   legal string renders an explicit unavailable marker rather than shipping
 *   untranslated/older wording as current.
 */

import enMessages from '../../messages/en.json';
import {
  fallbackLocale,
  isNonProductionLocale,
  isPseudoLocale,
  isProductionEnvironment,
  isShippableLocale,
  primaryLocale,
  resolveLocale,
  type Locale,
} from './config';
import { pseudoLocalizeMessages } from './pseudo-locale';
import { LEGAL_COPY_UNAVAILABLE, isLegalKey } from './legal';

export type Messages = Record<string, unknown>;

/**
 * Catalogues that ship with the app. Register a new locale here once its
 * `messages/<locale>.json` has been reviewed. A declared-but-unregistered
 * locale always falls back to the canonical catalogue.
 */
export const CATALOGS: Record<string, Messages> = {
  [primaryLocale]: enMessages as unknown as Messages,
};

/** Marker used to make a missing translation obvious outside production. */
export const MISSING_KEY_OPEN = '⟦missing:';
export const MISSING_KEY_CLOSE = '⟧';

/** Build the visible missing-key marker for a fully-qualified key path. */
export function makeMissingKeyMarker(keyPath: string): string {
  return `${MISSING_KEY_OPEN}${keyPath}${MISSING_KEY_CLOSE}`;
}

/** True when a rendered string is a missing-key marker. */
export function isMissingKeyMarker(value: string): boolean {
  return value.startsWith(MISSING_KEY_OPEN) && value.endsWith(MISSING_KEY_CLOSE);
}

/** Whether a reviewed catalogue is registered for a locale. */
export function hasCatalog(locale: string | undefined | null): boolean {
  return typeof locale === 'string' && locale in CATALOGS;
}

/** Return the registered catalogue for a locale, if any. */
export function getCatalog(
  locale: string | undefined | null,
): Messages | undefined {
  return typeof locale === 'string' ? CATALOGS[locale] : undefined;
}

/** Resolve a dotted key path against a nested catalogue. */
export function getMessageByPath(
  messages: Messages | undefined,
  keyPath: string,
): string | undefined {
  if (!messages) return undefined;
  let current: unknown = messages;
  for (const segment of keyPath.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' ? current : undefined;
}

export interface ResolvedCatalog {
  /** Locale actually used to render (after pseudo/fallback resolution). */
  locale: Locale;
  messages: Messages;
  /** True when the requested catalogue was unavailable and en was used. */
  usedFallback: boolean;
  /** True when a non-production pseudo-locale transform was applied. */
  pseudo: boolean;
}

/**
 * Resolve the catalogue served for a requested locale.
 *
 * - Pseudo-locales (non-production only) are produced from the canonical
 *   catalogue via the deterministic pseudo transform.
 * - A registered locale is served directly.
 * - Anything else (declared-but-untranslated, unknown, pseudo in production)
 *   falls back to the canonical catalogue with `usedFallback: true`.
 */
export function resolveCatalog(
  requestedLocale: string | undefined | null,
  options: { isProduction?: boolean } = {},
): ResolvedCatalog {
  const isProduction = options.isProduction ?? isProductionEnvironment();
  const canonical = CATALOGS[primaryLocale] ?? {};

  if (!isProduction && isNonProductionLocale(requestedLocale)) {
    return {
      locale: resolveLocale(requestedLocale),
      messages: pseudoLocalizeMessages(canonical),
      usedFallback: true,
      pseudo: true,
    };
  }

  const requested = resolveLocale(requestedLocale);
  if (isShippableLocale(requestedLocale) && hasCatalog(requestedLocale)) {
    return {
      locale: requested,
      messages: getCatalog(requestedLocale) as Messages,
      usedFallback: false,
      pseudo: false,
    };
  }

  return {
    locale: fallbackLocale,
    messages: canonical,
    usedFallback: true,
    pseudo: false,
  };
}

export interface MessageFallbackInfo {
  key: string;
  namespace?: string;
}

/**
 * next-intl `getMessageFallback` implementation.
 *
 * Non-production → visible marker. Production → canonical English. Legal keys →
 * fail closed in every environment.
 */
export function getMessageFallback(
  info: MessageFallbackInfo,
  options: { isProduction?: boolean } = {},
): string {
  const isProduction = options.isProduction ?? isProductionEnvironment();
  const keyPath = info.namespace ? `${info.namespace}.${info.key}` : info.key;

  if (isLegalKey(keyPath)) return LEGAL_COPY_UNAVAILABLE;

  if (isProduction) {
    return getMessageByPath(CATALOGS[primaryLocale], keyPath) ?? keyPath;
  }
  return makeMissingKeyMarker(keyPath);
}

/**
 * Whether a missing-key error should be surfaced. Legal namespaces are never
 * logged as translatable copy.
 */
export function shouldWarnOnMissingKey(keyPath: string): boolean {
  return !isLegalKey(keyPath);
}

/** True when a locale is a pseudo transform of the canonical catalogue. */
export function isPseudoCatalog(locale: string | undefined | null): boolean {
  return isNonProductionLocale(locale) && isPseudoLocale(locale);
}
