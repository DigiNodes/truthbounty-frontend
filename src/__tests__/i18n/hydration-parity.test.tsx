/**
 * UI-FE-063 — hydration parity tests.
 *
 * The same catalogue must render byte-identical markup on the server and on the
 * client, for both the canonical locale and a pseudo-locale. A mismatch would
 * surface as a React hydration error and, in production, as flicker / lost
 * interactions.
 */

import React from 'react';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { NextIntlClientProvider, useFormatter, useLocale, useTranslations } from 'next-intl';
import enMessages from '@/../messages/en.json';
import { pseudoLocalizeMessages } from '@/i18n/pseudo-locale';

function Shell() {
  const t = useTranslations('claimDetail.common');
  const locale = useLocale();
  const format = useFormatter();

  return (
    <div data-locale={locale} dir={locale === 'ar-XB' ? 'rtl' : 'ltr'}>
      <span data-testid="cancel">{t('cancel')}</span>
      <span data-testid="number">
        {format.number(1234567, { useGrouping: true })}
      </span>
      <span data-testid="items">
        {t('items', { count: 3 })}
      </span>
    </div>
  );
}

function tree(locale: string, messages: Record<string, unknown>) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="UTC"
      now={new Date(Date.UTC(2026, 0, 2))}
    >
      <Shell />
    </NextIntlClientProvider>
  );
}

async function hydrateAndCollectErrors(html: string, element: React.ReactElement) {
  const container = document.createElement('div');
  container.innerHTML = html;
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  };
  try {
    await act(async () => {
      hydrateRoot(container, element);
    });
  } finally {
    console.error = original;
  }
  return { container, errors };
}

const canonical = enMessages as unknown as Record<string, unknown>;
const pseudo = pseudoLocalizeMessages(enMessages as unknown as Record<string, unknown>);

describe('hydration parity — canonical locale', () => {
  test('server markup is deterministic', () => {
    const a = renderToString(tree('en', canonical));
    const b = renderToString(tree('en', canonical));
    expect(a).toBe(b);
    expect(a).toContain('Cancel');
  });

  test('client hydration matches the server without warnings', async () => {
    const html = renderToString(tree('en', canonical));
    const { container, errors } = await hydrateAndCollectErrors(
      html,
      tree('en', canonical),
    );
    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
    expect(container.querySelector('[data-testid="cancel"]')?.textContent).toBe(
      'Cancel',
    );
  });
});

describe('hydration parity — pseudo locale', () => {
  test('pseudo markup is deterministic and visibly transformed', () => {
    const a = renderToString(tree('en-XA', pseudo));
    const b = renderToString(tree('en-XA', pseudo));
    expect(a).toBe(b);
    expect(a).toContain('⟦');
    expect(a).not.toContain('>Cancel<');
  });

  test('pseudo hydration matches the server without warnings', async () => {
    const html = renderToString(tree('en-XA', pseudo));
    const { errors } = await hydrateAndCollectErrors(html, tree('en-XA', pseudo));
    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
  });

  test('locale is propagated to the DOM in both directions', () => {
    expect(renderToString(tree('en', canonical))).toContain('data-locale="en"');
    expect(renderToString(tree('en-XA', pseudo))).toContain('dir="ltr"');
    expect(renderToString(tree('ar-XB', pseudo))).toContain('dir="rtl"');
  });
});
