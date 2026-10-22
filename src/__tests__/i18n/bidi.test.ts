/**
 * UI-FE-063 — RTL readiness and bidi pseudo-locale tests.
 */

import {
  isRtlLocale,
  localeNames,
  rtlLocales,
  resolveLocale,
} from '@/i18n/config';
import { resolveCatalog } from '@/i18n/fallback';
import { pseudoLocalizeString } from '@/i18n/pseudo-locale';

describe('RTL readiness', () => {
  test('the bidi pseudo-locale is registered as RTL', () => {
    expect(rtlLocales).toContain('ar-XB');
    expect(isRtlLocale('ar-XB')).toBe(true);
    expect(isRtlLocale('en')).toBe(false);
    expect(isRtlLocale('en-XA')).toBe(false);
  });

  test('document direction derives from the locale', () => {
    const dir = (locale: string) => (isRtlLocale(locale) ? 'rtl' : 'ltr');
    expect(dir('ar-XB')).toBe('rtl');
    expect(dir('en')).toBe('ltr');
  });

  test('pseudo-locales are labelled as non-translations', () => {
    expect(localeNames['ar-XB']).toMatch(/not a translation/i);
    expect(localeNames['en-XA']).toMatch(/not a translation/i);
  });

  test('the bidi locale resolves outside production only', () => {
    expect(resolveLocale('ar-XB')).toBe('ar-XB');
    const dev = resolveCatalog('ar-XB', { isProduction: false });
    expect(dev.pseudo).toBe(true);
    const prod = resolveCatalog('ar-XB', { isProduction: true });
    expect(prod.pseudo).toBe(false);
    expect(prod.locale).toBe('en');
  });
});

describe('bidi text handling', () => {
  test('does not inject bidi control characters', () => {
    const bidiControls = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/;
    const output = pseudoLocalizeString('Switch Network');
    expect(bidiControls.test(output)).toBe(false);
  });

  test('preserves placeholders inside bidi-bearing copy', () => {
    const output = pseudoLocalizeString('المحفظة غير متصلة {address}');
    expect(output).toContain('{address}');
  });
});
