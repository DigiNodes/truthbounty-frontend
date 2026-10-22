/**
 * UI-FE-063 — pluralization, long-word expansion, dates and numbers.
 */

import enMessages from '@/../messages/en.json';
import { pseudoLocalizeString } from '@/i18n/pseudo-locale';
import { formatDate, formatNumber } from '@/i18n/utils';
import { getPluralCategory } from '@/i18n/pluralization';

function flatten(
  messages: Record<string, unknown>,
  prefix = '',
  out: Record<string, string> = {},
) {
  for (const [key, value] of Object.entries(messages)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[next] = value;
    else if (value && typeof value === 'object')
      flatten(value as Record<string, unknown>, next, out);
  }
  return out;
}

describe('pluralization under pseudo-locale', () => {
  const leaves = flatten(enMessages as unknown as Record<string, unknown>);
  const pluralLeaves = Object.entries(leaves).filter(([, value]) =>
    /\bplural\b/.test(value),
  );

  test('the canonical catalogue exercises plural messages', () => {
    expect(pluralLeaves.length).toBeGreaterThan(0);
  });

  test.each(pluralLeaves)('preserves branch structure for %s', (_key, value) => {
    const output = pseudoLocalizeString(value);
    const branchPattern = /(?:^|[\s{])(=\d+|zero|one|two|few|many|other)\s*\{/g;
    const expected = new Set<string>();
    const actual = new Set<string>();
    let match;
    while ((match = branchPattern.exec(value)) !== null) expected.add(match[1]);
    branchPattern.lastIndex = 0;
    while ((match = branchPattern.exec(output)) !== null) actual.add(match[1]);
    expect([...expected].every((branch) => actual.has(branch))).toBe(true);
    expect(output).toContain('#');
  });
});

describe('long-word expansion', () => {
  test('a long single word expands beyond its original length', () => {
    const word = 'Internationalization';
    const output = pseudoLocalizeString(word);
    expect([...output].length).toBeGreaterThan([...word].length);
  });

  test('long words do not lose characters', () => {
    const output = pseudoLocalizeString('Verification');
    expect(output.replace(/[⟦⟧·]/g, '').length).toBeGreaterThanOrEqual(
      'Verification'.length,
    );
  });
});

describe('dates and numbers honour the locale', () => {
  test('numbers use locale separators', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
    expect(formatNumber(1234567, 'de')).toBe('1.234.567');
  });

  test('dates are locale-aware', () => {
    const value = Date.UTC(2026, 0, 2);
    expect(formatDate(value, 'en')).toMatch(/2026/);
    expect(formatDate(value, 'de')).toMatch(/2026/);
  });

  test('plural categories are computed per locale', () => {
    expect(getPluralCategory(1, 'en')).toBe('one');
    expect(getPluralCategory(2, 'en')).toBe('other');
  });
});
