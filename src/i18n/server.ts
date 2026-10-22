/**
 * UI-FE-063 — Server-side locale helpers.
 *
 * Small, dependency-safe wrappers used by server components/layouts to read the
 * active locale without crashing when next-intl request context is unavailable
 * (e.g. during static analysis or isolated unit tests).
 */

import { getLocale } from 'next-intl/server';
import { defaultLocale, type Locale } from './config';

/**
 * Resolve the active request locale, falling back to the default locale when no
 * next-intl request context is available.
 */
export async function getRequestLocale(): Promise<Locale> {
  try {
    return (await getLocale()) as Locale;
  } catch {
    return defaultLocale;
  }
}
