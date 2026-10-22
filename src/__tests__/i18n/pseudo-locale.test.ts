/**
 * UI-FE-063 — pseudo-locale generation tests.
 */

import {
  PSEUDO_LOCALE_DEFAULTS,
  isPseudoLocalizedString,
  pseudoLocalizeMessages,
  pseudoLocalizeString,
  transformMessage,
} from '@/i18n/pseudo-locale';

describe('pseudoLocalizeString', () => {
  test('expands copy beyond its original length', () => {
    const source = 'Submit claim';
    const out = pseudoLocalizeString(source);
    expect([...out].length).toBeGreaterThan([...source].length);
  });

  test('wraps output in boundary markers', () => {
    const out = pseudoLocalizeString('Confirm');
    expect(out.startsWith(PSEUDO_LOCALE_DEFAULTS.openMarker)).toBe(true);
    expect(out.endsWith(PSEUDO_LOCALE_DEFAULTS.closeMarker)).toBe(true);
    expect(isPseudoLocalizedString(out)).toBe(true);
  });

  test('accents characters to make pseudo copy visible', () => {
    const out = pseudoLocalizeString('abc');
    expect(out).not.toBe('abc');
    expect(out).toMatch(/[åƀç]/);
  });

  test('is deterministic', () => {
    expect(pseudoLocalizeString('Retry')).toBe(pseudoLocalizeString('Retry'));
  });

  test('returns falsy input unchanged', () => {
    expect(pseudoLocalizeString('')).toBe('');
  });
});

describe('placeholder and ICU safety', () => {
  test('preserves simple placeholders verbatim', () => {
    const out = pseudoLocalizeString('Wallet {address} disconnected');
    expect(out).toContain('{address}');
  });

  test('preserves multiple placeholders', () => {
    const out = pseudoLocalizeString('{from} → {to} for {amount}');
    expect(out).toContain('{from}');
    expect(out).toContain('{to}');
    expect(out).toContain('{amount}');
  });

  test('preserves plural syntax and the # token', () => {
    const out = transformMessage(
      '{count, plural, =0 {no items} =1 {1 item} other {# items}}',
    );
    expect(out).toContain('{count, plural,');
    expect(out).toContain('=0');
    expect(out).toContain('=1');
    expect(out).toContain('other');
    expect(out).toContain('#');
  });

  test('preserves select syntax', () => {
    const out = transformMessage(
      '{status, select, open {Open} closed {Closed} other {Unknown}}',
    );
    expect(out).toContain('{status, select,');
    expect(out).toContain('other');
  });

  test('preserves number/date format arguments verbatim', () => {
    const out = transformMessage('Total {amount, number, ::currency/USD}');
    expect(out).toContain('{amount, number, ::currency/USD}');
  });
});

describe('pseudoLocalizeMessages', () => {
  test('transforms nested copy but leaves legal namespaces untouched', () => {
    const messages = {
      claim: { title: 'Claim detail', body: 'Please review.' },
      legal: { title: 'Terms of Use' },
      terms: { body: 'Binding agreement.' },
    };
    const out = pseudoLocalizeMessages(messages);
    expect(isPseudoLocalizedString(out.claim.title)).toBe(true);
    expect(isPseudoLocalizedString(out.claim.body)).toBe(true);
    expect(out.legal.title).toBe('Terms of Use');
    expect(out.terms.body).toBe('Binding agreement.');
  });

  test('handles arrays of copy', () => {
    const out = pseudoLocalizeMessages({ steps: ['First', 'Second'] });
    expect(isPseudoLocalizedString(out.steps[0])).toBe(true);
    expect(isPseudoLocalizedString(out.steps[1])).toBe(true);
  });
});
