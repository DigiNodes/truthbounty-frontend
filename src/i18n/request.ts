/**
 * V2-FE-070 / UI-FE-063 — i18n Request Configuration
 *
 * Server-side configuration for next-intl.
 * This file is imported by the Next.js app to provide translations.
 *
 * UI-FE-063 wires the catalogue/fallback policy and the missing-key behaviour
 * into next-intl's `onError` / `getMessageFallback` hooks.
 */

import { getRequestConfig } from 'next-intl/server';
import { isProductionEnvironment } from './config';
import { getMessageFallback, resolveCatalog } from './fallback';

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const isProduction = isProductionEnvironment();
  const { locale, messages } = resolveCatalog(requestedLocale, {
    isProduction,
  });

  return {
    locale,
    messages,
    timeZone: 'UTC',
    now: new Date(),
    onError(error) {
      // Outside production, surface missing/formatting problems loudly so they
      // are fixed before they reach a reviewer. In production the fallback
      // policy (canonical English, legal fail-closed) already applies, so we do
      // not spam logs with untrusted input.
      if (!isProduction) {
        console.warn(`[i18n] ${error.message}`);
      }
    },
    getMessageFallback(info) {
      return getMessageFallback(info, { isProduction });
    },
  };
});
