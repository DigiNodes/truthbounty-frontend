/**
 * UI-FE-063 — catalogue resolution and fallback policy tests.
 */

import {
  getCatalog,
  getMessageByPath,
  hasCatalog,
  isPseudoCatalog,
  resolveCatalog,
} from '@/i18n/fallback';
import { isPseudoLocalizedString } from '@/i18n/pseudo-locale';

describe('resolveCatalog', () => {
  test('serves the canonical catalogue for en', () => {
    const resolved = resolveCatalog('en');
    expect(resolved.locale).toBe('en');
    expect(resolved.usedFallback).toBe(false);
    expect(resolved.pseudo).toBe(false);
    expect(getCatalog('en')).toBe(resolved.messages);
  });

  test('falls back for a declared-but-unregistered locale', () => {
    const resolved = resolveCatalog('fr');
    expect(resolved.usedFallback).toBe(true);
    expect(resolved.locale).toBe('en');
    expect(hasCatalog('fr')).toBe(false);
  });

  test('falls back for an unknown locale', () => {
    const resolved = resolveCatalog('zz-ZZ');
    expect(resolved.usedFallback).toBe(true);
    expect(resolved.locale).toBe('en');
  });

  test('handles null/undefined requested locale', () => {
    expect(resolveCatalog(null).locale).toBe('en');
    expect(resolveCatalog(undefined).locale).toBe('en');
  });

  test('generates a pseudo catalogue outside production', () => {
    const resolved = resolveCatalog('en-XA', { isProduction: false });
    expect(resolved.pseudo).toBe(true);
    expect(resolved.locale).toBe('en-XA');
    const sample = getMessageByPath(resolved.messages, 'claimDetail.common.cancel');
    expect(sample).toBeDefined();
    expect(isPseudoLocalizedString(sample as string)).toBe(true);
  });

  test('never serves a pseudo catalogue in production', () => {
    const resolved = resolveCatalog('en-XA', { isProduction: true });
    expect(resolved.pseudo).toBe(false);
    expect(resolved.locale).toBe('en');
    expect(isPseudoCatalog('en-XA')).toBe(true);
    expect(isPseudoCatalog('en')).toBe(false);
  });
});

describe('getMessageByPath', () => {
  test('resolves nested keys', () => {
    const messages = { a: { b: { c: 'value' } } };
    expect(getMessageByPath(messages, 'a.b.c')).toBe('value');
  });

  test('returns undefined for missing keys', () => {
    expect(getMessageByPath({ a: 1 }, 'a.b')).toBeUndefined();
    expect(getMessageByPath(undefined, 'a')).toBeUndefined();
  });
});
