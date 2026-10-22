/**
 * UI-FE-063 — missing-copy behaviour tests.
 */

import {
  getMessageFallback,
  hasCatalog,
  isMissingKeyMarker,
  makeMissingKeyMarker,
  shouldWarnOnMissingKey,
} from '@/i18n/fallback';
import { LEGAL_COPY_UNAVAILABLE } from '@/i18n/legal';

describe('missing-key markers', () => {
  test('marker round-trips', () => {
    const marker = makeMissingKeyMarker('claim.title');
    expect(marker).toContain('claim.title');
    expect(isMissingKeyMarker(marker)).toBe(true);
  });

  test('ordinary copy is not a marker', () => {
    expect(isMissingKeyMarker('Claim title')).toBe(false);
  });
});

describe('getMessageFallback', () => {
  test('non-production surfaces a visible marker', () => {
    const out = getMessageFallback(
      { namespace: 'claim', key: 'missing' },
      { isProduction: false },
    );
    expect(isMissingKeyMarker(out)).toBe(true);
    expect(out).toContain('claim.missing');
  });

  test('production hides the marker', () => {
    const out = getMessageFallback(
      { namespace: 'claim', key: 'missing' },
      { isProduction: true },
    );
    expect(isMissingKeyMarker(out)).toBe(false);
    expect(out).toBe('claim.missing');
  });

  test('production resolves to canonical English copy when available', () => {
    const out = getMessageFallback(
      { namespace: 'claimDetail.common', key: 'cancel' },
      { isProduction: true },
    );
    expect(out).toBe('Cancel');
  });

  test('legal keys fail closed in every environment', () => {
    for (const isProduction of [false, true]) {
      const out = getMessageFallback(
        { namespace: 'terms', key: 'missing' },
        { isProduction },
      );
      expect(out).toBe(LEGAL_COPY_UNAVAILABLE);
    }
  });
});

describe('catalog registry', () => {
  test('the canonical locale is registered', () => {
    expect(hasCatalog('en')).toBe(true);
  });

  test('legal keys are not logged as missing translations', () => {
    expect(shouldWarnOnMissingKey('terms.clause')).toBe(false);
    expect(shouldWarnOnMissingKey('claim.title')).toBe(true);
  });
});
