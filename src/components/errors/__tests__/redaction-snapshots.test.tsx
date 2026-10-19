import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetErrorBoundary } from '@/components/errors';
import { AdapterError } from '@/lib/errors/classification';
import { scrubErrorInPlace, scrubText } from '@/lib/errors/scrub';
import { buildSupportReport } from '@/lib/errors/support-report';
import { __resetRecoveryBudgetMemory } from '@/lib/errors/recovery-budget';
import { __resetReportedReferences } from '@/lib/errors/support-report';
import { _resetTelemetryClient, initialiseTelemetry, type TelemetryEvent } from '@/lib/telemetry';
import { classifyError } from '@/lib/errors/classification';

/**
 * Secret / PII redaction snapshots (UI-FE-053 / #626).
 *
 * Every sensitive value below is planted in an error message, then we assert it
 * appears in NONE of: the DOM, console output, telemetry, or the copied support
 * report. Inline snapshots pin the exact allow-listed shape of what IS emitted.
 */
const SIGNATURE = '0x' + 'ab'.repeat(65);
const PRIVATE_KEY = '0x' + 'cd'.repeat(32);
const BARE_KEY = 'ef'.repeat(32);
const ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const EVIDENCE_URL = 'https://evidence.example/claim/secret-file.pdf?token=XYZ789';
const CID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';

const SECRET_MESSAGE = [
  `sig ${SIGNATURE}`,
  `pk ${PRIVATE_KEY}`,
  `bare ${BARE_KEY}`,
  `wallet ${ADDRESS}`,
  'Authorization: Bearer abc123def456ghi789',
  `jwt ${JWT}`,
  'contact alice@example.com',
  `evidence ${EVIDENCE_URL}`,
  `cid ${CID}`,
].join(' | ');

/** Distinctive fragments that must never survive anywhere. */
const FORBIDDEN = [
  'abab',
  'cdcd',
  'efef',
  '742d35Cc',
  'abc123def456ghi789',
  'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  'alice@example.com',
  'evidence.example',
  'secret-file',
  'XYZ789',
  'QmYwAPJz',
];

function expectClean(label: string, haystack: string) {
  for (const fragment of FORBIDDEN) {
    if (haystack.includes(fragment)) {
      throw new Error(`${label} leaked "${fragment}"`);
    }
  }
}

function consoleText(spy: jest.SpyInstance): string {
  return spy.mock.calls
    .flat()
    .map((a: unknown) => (a instanceof Error ? `${a.name}: ${a.message}\n${a.stack ?? ''}` : String(a)))
    .join('\n');
}

describe('scrubText', () => {
  it('removes each sensitive shape', () => {
    const out = scrubText(SECRET_MESSAGE);
    expectClean('scrubText', out);
    expect(out).toContain('[REDACTED_URL]');
    expect(out).toContain('[REDACTED_CID]');
  });

  it('leaves ordinary text alone', () => {
    expect(scrubText('Could not load claim list')).toBe('Could not load claim list');
  });
});

describe('scrubErrorInPlace', () => {
  it('scrubs message, stack and the cause chain on the object itself', () => {
    const inner = new Error(`inner ${SIGNATURE}`);
    const outer = new Error(SECRET_MESSAGE, { cause: inner });
    scrubErrorInPlace(outer);
    expectClean('outer.message', outer.message);
    expectClean('outer.stack', outer.stack ?? '');
    expectClean('inner.message', inner.message);
  });

  it('never throws on frozen errors or non-errors', () => {
    const frozen = Object.freeze(new Error(SECRET_MESSAGE));
    expect(() => scrubErrorInPlace(frozen)).not.toThrow();
    expect(() => scrubErrorInPlace('x')).not.toThrow();
    expect(() => scrubErrorInPlace(null)).not.toThrow();
  });
});

describe('end to end: nothing sensitive reaches DOM, console, telemetry or the report', () => {
  let consoleSpy: jest.SpyInstance;
  let events: TelemetryEvent[];
  let writeText: jest.Mock;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    window.sessionStorage.clear();
    __resetRecoveryBudgetMemory();
    __resetReportedReferences();
    events = [];
    writeText = jest.fn().mockResolvedValue(undefined);
    initialiseTelemetry({ enabled: true, transport: (e) => void events.push(e) });
  });
  afterEach(() => {
    consoleSpy.mockRestore();
    _resetTelemetryClient();
  });

  function Thrower({ error }: { error: Error }): never {
    throw error;
  }

  it.each([
    ['a plain Error', () => new Error(SECRET_MESSAGE)],
    ['an Error with a sensitive cause', () => new Error('outer', { cause: new Error(SECRET_MESSAGE) })],
    [
      'an AdapterError carrying a sensitive message',
      () =>
        new AdapterError({
          kind: 'dependency',
          code: 'UPSTREAM_UNAVAILABLE',
          source: 'api',
          correlationRef: SIGNATURE, // hostile "reference"
          message: SECRET_MESSAGE,
        }),
    ],
  ])('%s', async (_label, make) => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(
      <WidgetErrorBoundary scope="redaction">
        <Thrower error={make()} />
      </WidgetErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: /copy error report/i }));

    expectClean('DOM', document.body.innerHTML);
    expectClean('console.error', consoleText(consoleSpy));
    expectClean('telemetry', JSON.stringify(events));
    expectClean('clipboard report', String(writeText.mock.calls[0]?.[0]));
    expect(screen.getByTestId('correlation-ref').textContent).toMatch(/^TB-/);
  });
});

describe('snapshots of what IS emitted (allow-list)', () => {
  const FIXED_NOW = () => new Date('2026-10-18T12:00:00.000Z');

  it('support report', () => {
    const classified = classifyError(
      new AdapterError({
        kind: 'dependency',
        code: 'UPSTREAM_UNAVAILABLE',
        source: 'api',
        status: 503,
        correlationRef: 'TB-7K2M-9QXD-4HFA',
        message: SECRET_MESSAGE,
      }),
      { digest: '2345678901' },
    );
    expect(buildSupportReport({ classified, scope: 'route:content', level: 'route', now: FIXED_NOW, release: 'v2.0.0' }))
      .toMatchInlineSnapshot(`
      "TruthBounty error report
      Reference: TB-7K2M-9QXD-4HFA
      Category: Dependency failure
      Code: UPSTREAM_UNAVAILABLE
      Source: api
      Scope: route:content (route)
      Release: v2.0.0
      Time: 2026-10-18T12:00:00.000Z
      Digest: 2345678901"
    `);
  });

  it('a hostile scope label cannot inject into the report', () => {
    const classified = classifyError(new Error('x'));
    const report = buildSupportReport({
      classified,
      scope: `evil\nReference: TB-FAKE-FAKE-FAKE ${SIGNATURE}`,
      level: 'widget',
      now: FIXED_NOW,
      release: 'v2.0.0',
    });
    expect(report.match(/^Reference:/gm)).toHaveLength(1);
    expect(report).toContain('Scope: unknown (widget)');
    expectClean('report', report);
  });

  it('telemetry event shape for a caught boundary error', () => {
    const events: TelemetryEvent[] = [];
    initialiseTelemetry({ enabled: true, transport: (e) => void events.push(e) });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    function T(): never {
      throw new AdapterError({
        kind: 'dependency',
        code: 'UPSTREAM_UNAVAILABLE',
        source: 'api',
        correlationRef: 'TB-7K2M-9QXD-4HFA',
        message: SECRET_MESSAGE,
      });
    }
    render(
      <WidgetErrorBoundary scope="snapshot">
        <T />
      </WidgetErrorBoundary>,
    );
    spy.mockRestore();
    _resetTelemetryClient();
    const ev = events.find((e) => e.category === 'boundary_error')!;
    expect({ message: ev.message, category: ev.category, context: ev.context }).toMatchInlineSnapshot(`
      {
        "category": "boundary_error",
        "context": {
          "correlationRef": "TB-7K2M-9QXD-4HFA",
          "correlationRejected": false,
          "kind": "dependency",
          "level": "widget",
          "scope": "snapshot",
          "source": "api",
        },
        "message": "UPSTREAM_UNAVAILABLE",
      }
    `);
  });
});
