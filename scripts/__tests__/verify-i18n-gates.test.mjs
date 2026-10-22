import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findI18nGateViolations,
  evaluateGates,
  flattenMessages,
  loadI18nApi,
  ROOT,
} from '../verify-i18n-gates.mjs';

const api = await loadI18nApi({ root: ROOT });

test('i18n gate — full pipeline reports no violations', async () => {
  const violations = await findI18nGateViolations({ root: ROOT });
  assert.deepEqual(violations, []);
});

test('i18n gate — canonical catalogue is populated', () => {
  const messages = api.getCatalog(api.primaryLocale);
  const leaves = flattenMessages(messages);
  assert.ok(Object.keys(leaves).length > 0, 'catalogue has leaf strings');
  for (const ns of api.LEGAL_NAMESPACES) {
    assert.equal(typeof ns, 'string');
  }
});

test('i18n gate — pseudo strings expand and carry boundary markers', () => {
  const source = 'Submit claim';
  const out = api.pseudoLocalizeString(source);
  assert.ok([...out].length > [...source].length, 'expanded');
  assert.ok(api.isPseudoLocalizedString(out), 'wrapped');
});

test('i18n gate — placeholders survive the pseudo transform', () => {
  const source = 'Wallet {address} disconnected';
  const out = api.pseudoLocalizeString(source);
  assert.ok(out.includes('{address}'));
});

test('i18n gate — ICU plural structure is preserved', () => {
  const source = '{count, plural, =1 {1 item} other {# items}}';
  const out = api.pseudoLocalizeString(source);
  assert.ok(out.includes('plural'));
  assert.ok(out.includes('=1'));
  assert.ok(out.includes('other'));
  assert.ok(out.includes('#'));
});

test('i18n gate — legal namespaces are never pseudo-localized', () => {
  const out = api.pseudoLocalizeMessages({
    copy: 'Plain copy.',
    terms: { title: 'Terms of Use' },
    privacy: { body: 'Privacy body.' },
  });
  assert.ok(api.isPseudoLocalizedString(out.copy));
  assert.equal(out.terms.title, 'Terms of Use');
  assert.equal(out.privacy.body, 'Privacy body.');
});

test('i18n gate — legal copy fails closed unless approved', () => {
  assert.equal(api.resolveLegalCopy({}).status, 'unavailable');
  assert.equal(
    api.resolveLegalCopy({ requestedVersion: '1', approvedVersion: '2' }).status,
    'unavailable',
  );
  assert.equal(
    api.resolveLegalCopy({
      requestedVersion: '2',
      approvedVersion: '2',
      locale: 'en',
      approvedLocale: 'en',
      copy: 'Approved wording.',
    }).status,
    'approved',
  );
});

test('i18n gate — missing copy is visible in dev and safe in production', () => {
  const dev = api.getMessageFallback(
    { namespace: 'claim', key: 'doesNotExist' },
    { isProduction: false },
  );
  assert.ok(api.isMissingKeyMarker(dev), 'dev shows marker');

  const prod = api.getMessageFallback(
    { namespace: 'claim', key: 'doesNotExist' },
    { isProduction: true },
  );
  assert.ok(!api.isMissingKeyMarker(prod), 'prod hides marker');

  const legal = api.getMessageFallback(
    { namespace: 'terms', key: 'doesNotExist' },
    { isProduction: true },
  );
  assert.equal(legal, api.LEGAL_COPY_UNAVAILABLE, 'legal fails closed');
});

test('i18n gate — pseudo-locales are excluded from production', () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const runtime = api.getRuntimeLocales();
    for (const pseudo of api.pseudoLocales) {
      assert.ok(!runtime.includes(pseudo), `${pseudo} excluded`);
    }
    const resolved = api.resolveCatalog('en-XA', { isProduction: true });
    assert.equal(resolved.pseudo, false);
    assert.equal(resolved.locale, api.fallbackLocale);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }

  // Non-production: pseudo catalogue is generated and flagged.
  const devPseudo = api.resolveCatalog('en-XA', { isProduction: false });
  assert.equal(devPseudo.pseudo, true);
  assert.equal(devPseudo.locale, 'en-XA');

  assert.deepEqual(evaluateGates(api, { isProduction: false }), []);
});
