import React, { Suspense, useEffect, useState } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import {
  AppErrorBoundary,
  CompositionErrorBoundary,
  RouteErrorBoundary,
  WidgetErrorBoundary,
} from '@/components/errors';
import { RouteErrorFallback } from '@/components/common/RouteErrorFallback';
import { FeatureErrorBoundary } from '@/components/common/FeatureErrorBoundary';
import { AdapterError, AuthorityDeniedError, adapterErrorFromResponse } from '@/lib/errors/classification';
import { __resetRecoveryBudgetMemory } from '@/lib/errors/recovery-budget';
import { __resetReportedReferences } from '@/lib/errors/support-report';
import { _resetTelemetryClient, initialiseTelemetry, type TelemetryEvent } from '@/lib/telemetry';
import { trackPendingTransaction } from '@/lib/pending-transactions';

const REF = /^TB-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;
const hdr = (map: Record<string, string> = {}) => ({ get: (n: string) => map[n.toLowerCase()] ?? null }) as unknown as Headers;

function Boom({ error }: { error?: unknown }): never {
  throw error ?? new Error('boom');
}

let consoleSpy: jest.SpyInstance;
beforeEach(() => {
  consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  window.sessionStorage.clear();
  window.localStorage.clear();
  __resetRecoveryBudgetMemory();
  __resetReportedReferences();
});
afterEach(() => {
  consoleSpy.mockRestore();
  _resetTelemetryClient();
});

describe('render failures', () => {
  it.each([
    ['route', RouteErrorBoundary, 'h1'],
    ['composition', CompositionErrorBoundary, 'h2'],
    ['widget', WidgetErrorBoundary, 'h3'],
  ] as const)('%s boundary renders an accessible fallback with a reference', (level, Boundary, tag) => {
    render(
      <Boundary scope={`test:${level}`}>
        <Boom />
      </Boundary>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-boundary-level', level);
    expect(alert).toHaveAttribute('data-error-kind', 'defect');
    expect(alert.querySelector(tag)).not.toBeNull();
    expect(screen.getByTestId('correlation-ref').textContent).toMatch(REF);
  });

  it('never renders the error message', () => {
    render(
      <WidgetErrorBoundary scope="test:msg">
        <Boom error={new Error('internal detail: stack at Foo (bar.tsx:1:1)')} />
      </WidgetErrorBoundary>,
    );
    expect(document.body.textContent).not.toMatch(/internal detail|bar\.tsx/);
  });

  it('fails closed on non-Error throwables', () => {
    for (const thrown of ['a string', 42, null, { kind: 'denied' }]) {
      const { unmount } = render(
        <WidgetErrorBoundary scope="test:weird">
          <Boom error={thrown} />
        </WidgetErrorBoundary>,
      );
      expect(screen.getByRole('alert')).toHaveAttribute('data-error-kind', 'defect');
      unmount();
    }
  });
});

describe('isolation and nested boundaries', () => {
  it('one widget failure does not blank siblings, its composition, or navigation', () => {
    render(
      <div>
        <nav aria-label="Main">
          <a href="/treasury">Treasury</a>
        </nav>
        <CompositionErrorBoundary scope="board">
          <h2>Claims board</h2>
          <WidgetErrorBoundary scope="chart">
            <Boom />
          </WidgetErrorBoundary>
          <p>Other widget</p>
        </CompositionErrorBoundary>
      </div>,
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveAttribute('data-boundary-level', 'widget');
    expect(screen.getByRole('link', { name: 'Treasury' })).toBeInTheDocument();
    expect(screen.getByText('Claims board')).toBeInTheDocument();
    expect(screen.getByText('Other widget')).toBeInTheDocument();
  });

  it('the innermost boundary catches first; the outer one stays idle', () => {
    render(
      <RouteErrorBoundary scope="outer">
        <p>outer content</p>
        <CompositionErrorBoundary scope="middle">
          <WidgetErrorBoundary scope="inner">
            <Boom />
          </WidgetErrorBoundary>
        </CompositionErrorBoundary>
      </RouteErrorBoundary>,
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveAttribute('data-boundary-scope', 'inner');
    expect(screen.getByText('outer content')).toBeInTheDocument();
  });

  it('if a fallback itself throws, the next boundary out catches it', () => {
    render(
      <CompositionErrorBoundary scope="outer">
        <WidgetErrorBoundary
          scope="inner"
          fallback={() => {
            throw new Error('fallback failed');
          }}
        >
          <Boom />
        </WidgetErrorBoundary>
      </CompositionErrorBoundary>,
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveAttribute('data-boundary-scope', 'outer');
  });

  it('sibling boundaries fail independently', () => {
    render(
      <>
        <WidgetErrorBoundary scope="a">
          <Boom />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary scope="b">
          <p>b ok</p>
        </WidgetErrorBoundary>
      </>,
    );
    expect(screen.getByText('b ok')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('the boundary wrapper does not take part in layout', () => {
    const { container } = render(
      <WidgetErrorBoundary scope="layout">
        <p>child</p>
      </WidgetErrorBoundary>,
    );
    expect((container.firstElementChild as HTMLElement).style.display).toBe('contents');
  });

  it('FeatureErrorBoundary (existing call sites) delegates to the shared composition boundary', () => {
    render(
      <FeatureErrorBoundary scope="evidence">
        <Boom />
      </FeatureErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveAttribute('data-boundary-level', 'composition');
    expect(screen.getByRole('alert')).toHaveAttribute('data-boundary-scope', 'feature:evidence');
  });
});

describe('lazy-chunk failure', () => {
  it('offers reload (not retry — React.lazy caches the rejected import) and is classified as a dependency failure', async () => {
    const user = userEvent.setup();
    const onReload = jest.fn();
    const Lazy = React.lazy(() =>
      Promise.reject(Object.assign(new Error('Loading chunk 9 failed.'), { name: 'ChunkLoadError' })),
    );
    render(
      <CompositionErrorBoundary scope="lazy" onReload={onReload}>
        <Suspense fallback={<p>loading…</p>}>
          <Lazy />
        </Suspense>
      </CompositionErrorBoundary>,
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-error-kind', 'dependency');
    expect(alert).toHaveAttribute('data-error-code', 'CHUNK_LOAD_FAILED');
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reload page/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});

describe('hydration failure', () => {
  it('a client-side throw while hydrating server HTML is caught, classified and recoverable by reload', async () => {
    let isClient = false;
    const hydrationMessage = "Hydration failed because the server rendered HTML didn't match the client.";
    function Mismatch() {
      if (isClient) throw new Error(hydrationMessage);
      return <p>server markup</p>;
    }
    const tree = (
      <WidgetErrorBoundary scope="hydration" onReload={() => undefined}>
        <Mismatch />
      </WidgetErrorBoundary>
    );
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = renderToString(tree);
    expect(container.textContent).toContain('server markup');

    isClient = true;
    await act(async () => {
      hydrateRoot(container, tree, { onRecoverableError: () => undefined });
    });

    const alert = within(container).getByRole('alert');
    expect(alert).toHaveAttribute('data-error-code', 'HYDRATION_MISMATCH');
    expect(alert).toHaveAttribute('data-error-kind', 'defect');
    expect(within(container).getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(within(container).queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    container.remove();
  });
});

describe('adapter failures surface a sanitized correlation reference', () => {
  it('shows the validated server reference verbatim', () => {
    render(
      <WidgetErrorBoundary scope="adapter">
        <Boom error={adapterErrorFromResponse({ status: 503, headers: hdr({ 'x-request-id': 'TB-7K2M-9QXD-4HFA' }) }, 'api')} />
      </WidgetErrorBoundary>,
    );
    expect(screen.getByTestId('correlation-ref')).toHaveTextContent('TB-7K2M-9QXD-4HFA');
    expect(screen.getByRole('alert')).toHaveAttribute('data-error-kind', 'dependency');
    expect(screen.getByRole('alert')).toHaveAttribute('data-error-code', 'UPSTREAM_UNAVAILABLE');
  });

  it('replaces an unsafe adapter reference (signature/token) with a local one', () => {
    const signature = '0x' + 'ab'.repeat(65);
    render(
      <WidgetErrorBoundary scope="adapter">
        <Boom error={adapterErrorFromResponse({ status: 500, headers: hdr({ 'x-request-id': signature }) }, 'api')} />
      </WidgetErrorBoundary>,
    );
    expect(screen.getByTestId('correlation-ref').textContent).toMatch(REF);
    expect(document.body.innerHTML).not.toContain('abab');
  });

  it('RPC/wallet failures are classified by their typed signals', () => {
    render(
      <WidgetErrorBoundary scope="rpc">
        <Boom error={Object.assign(new Error('x'), { name: 'HttpRequestError' })} />
      </WidgetErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveAttribute('data-error-code', 'RPC_UNAVAILABLE');
  });
});

describe('denied authority is never presented as a technical error', () => {
  it.each([
    ['AuthorityDeniedError', () => new AuthorityDeniedError('verifier_role_required')],
    ['HTTP 403', () => adapterErrorFromResponse({ status: 403, headers: hdr() }, 'api')],
    ['HTTP 401', () => adapterErrorFromResponse({ status: 401, headers: hdr() }, 'api')],
  ])('%s', (_label, make) => {
    render(
      <CompositionErrorBoundary scope="denied">
        <Boom error={make()} />
      </CompositionErrorBoundary>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-error-kind', 'denied');
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(alert).toHaveTextContent(/not a technical error/i);
    expect(alert).not.toHaveTextContent(/something went wrong|fault on our side|unavailable/i);
    expect(
      screen.queryByRole('button', { name: /try again|reload page|copy error report/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/pending transactions/i)).not.toBeInTheDocument();
  });

  it('a 5xx dependency failure is not presented as a denial', () => {
    render(
      <CompositionErrorBoundary scope="x">
        <Boom error={adapterErrorFromResponse({ status: 503, headers: hdr() }, 'api')} />
      </CompositionErrorBoundary>,
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent(/access restricted|access decision/i);
  });
});

describe('user errors', () => {
  it('a declined wallet prompt is a user error: retry offered, no "report a bug" action', () => {
    render(
      <WidgetErrorBoundary scope="wallet">
        <Boom error={Object.assign(new Error('x'), { name: 'UserRejectedRequestError' })} />
      </WidgetErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveAttribute('data-error-kind', 'user');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy error report/i })).not.toBeInTheDocument();
  });
});

describe('bounded recovery (no loops)', () => {
  it('retry is withdrawn after the budget is spent, with an accessible explanation', async () => {
    const user = userEvent.setup();
    render(
      <WidgetErrorBoundary scope="loop">
        <Boom />
      </WidgetErrorBoundary>,
    );
    for (const left of [3, 2, 1]) {
      expect(screen.getByTestId('retry-budget')).toHaveTextContent(`${left} of 3 retries left`);
      await user.click(screen.getByRole('button', { name: /try again/i }));
    }
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('retry-exhausted')).toHaveTextContent(/retry limit reached/i);
    // The page is still usable: the alert is intact and nothing re-throws/loops.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('recovery is never automatic', () => {
    const renders = jest.fn();
    function Counted(): never {
      renders();
      throw new Error('x');
    }
    jest.useFakeTimers();
    render(
      <WidgetErrorBoundary scope="auto">
        <Counted />
      </WidgetErrorBoundary>,
    );
    const afterMount = renders.mock.calls.length;
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(renders.mock.calls.length).toBe(afterMount);
    jest.useRealTimers();
  });

  it('changing resetKeys (e.g. navigation) clears the error and restores the budget', async () => {
    const user = userEvent.setup();
    let throwing = true;
    const Flaky = () => (throwing ? <Boom /> : <p>recovered</p>);
    const view = (key: string) => (
      <WidgetErrorBoundary scope="keys" resetKeys={[key]}>
        <Flaky />
      </WidgetErrorBoundary>
    );
    const { rerender } = render(view('/a'));
    for (let i = 0; i < 3; i += 1) await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();

    throwing = false;
    rerender(view('/b'));
    expect(screen.getByText('recovered')).toBeInTheDocument();

    throwing = true;
    rerender(view('/c'));
    expect(screen.getByTestId('retry-budget')).toHaveTextContent('3 of 3 retries left');
  });

  it('reload is bounded and persists across reloads (sessionStorage)', async () => {
    const user = userEvent.setup();
    const onReload = jest.fn();
    const make = () => (
      <WidgetErrorBoundary scope="reload" onReload={onReload}>
        <Boom error={adapterErrorFromResponse({ status: 503, headers: hdr() }, 'api')} />
      </WidgetErrorBoundary>
    );
    const first = render(make());
    await user.click(screen.getByRole('button', { name: /reload page/i }));
    first.unmount(); // simulate the page reloading
    render(make());
    await user.click(screen.getByRole('button', { name: /reload page/i }));
    expect(onReload).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: /reload page/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('reload-exhausted')).toBeInTheDocument();
  });

  it('never clears pending-transaction recovery state across error, retry and reload', async () => {
    const user = userEvent.setup();
    trackPendingTransaction({
      id: 'tx-1',
      kind: 'verification',
      title: 'Verify claim',
      description: 'pending verification',
      txHash: ('0x' + '3'.repeat(64)) as `0x${string}`,
      chainId: 10,
      machineState: 'submitted',
    });
    window.localStorage.setItem('tb-tx-v2:tx-1', JSON.stringify({ v: 2 }));
    render(
      <WidgetErrorBoundary scope="tx" onReload={() => undefined}>
        <Boom error={adapterErrorFromResponse({ status: 503, headers: hdr() }, 'api')} />
      </WidgetErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: /try again/i }));
    await user.click(screen.getByRole('button', { name: /reload page/i }));
    expect(window.localStorage.getItem('truthbounty-pending-transactions-v2')).toContain('tx-1');
    expect(window.localStorage.getItem('tb-tx-v2:tx-1')).toContain('2');
  });
});

describe('focus management', () => {
  function Trigger() {
    const [boom, setBoom] = useState(false);
    if (boom) throw new Error('late failure');
    return (
      <button type="button" id="save-btn" onClick={() => setBoom(true)}>
        Run
      </button>
    );
  }

  it('moves focus to the fallback heading when focus would otherwise be lost', async () => {
    const user = userEvent.setup();
    render(
      <WidgetErrorBoundary scope="focus">
        <Trigger />
      </WidgetErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(screen.getByRole('heading')).toHaveFocus();
  });

  it('does NOT steal focus from a field the person is using elsewhere', () => {
    const listeners = new Set<() => void>();
    function LateBomb() {
      const [boom, setBoom] = useState(false);
      useEffect(() => {
        const l = () => setBoom(true);
        listeners.add(l);
        return () => void listeners.delete(l);
      }, []);
      if (boom) throw new Error('background failure');
      return <p>ok</p>;
    }
    render(
      <>
        <label>
          Notes
          <input />
        </label>
        <WidgetErrorBoundary scope="nosteal">
          <LateBomb />
        </WidgetErrorBoundary>
      </>,
    );
    const input = screen.getByLabelText('Notes');
    input.focus();
    act(() => listeners.forEach((l) => l()));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('restores focus to the previously focused element after a successful recovery', async () => {
    const user = userEvent.setup();
    let setBoomExternal: (v: boolean) => void = () => undefined;
    function Harness() {
      const [boom, setBoom] = useState(false);
      setBoomExternal = setBoom;
      return (
        <WidgetErrorBoundary scope="restore">
          <Child boom={boom} onBoom={() => setBoom(true)} />
        </WidgetErrorBoundary>
      );
    }
    function Child({ boom, onBoom }: { boom: boolean; onBoom: () => void }) {
      if (boom) throw new Error('x');
      return (
        <button type="button" id="save-btn" onClick={onBoom}>
          Run
        </button>
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => setBoomExternal(false)); // the underlying cause clears
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.getElementById('save-btn')).toHaveFocus();
  });

  it('after recovery with nothing focusable, focus lands on a heading rather than <body>', async () => {
    const user = userEvent.setup();
    let throwing = true;
    const Static = () =>
      throwing ? (
        <Boom />
      ) : (
        <section>
          <h3>Recovered content</h3>
        </section>
      );
    render(
      <WidgetErrorBoundary scope="heading">
        <Static />
      </WidgetErrorBoundary>,
    );
    throwing = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByRole('heading', { name: 'Recovered content' })).toHaveFocus();
  });
});

/** user-event installs its own clipboard on setup(), so mock it AFTER setup(). */
function installClipboard(writeText: jest.Mock) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

describe('report action (privacy-safe)', () => {
  let writeText: jest.Mock;
  let events: TelemetryEvent[];

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined);
    events = [];
    initialiseTelemetry({ enabled: true, release: 'test-release', transport: (e) => void events.push(e) });
  });

  it('copies an allow-listed report, emits one incident, and announces the outcome', async () => {
    const user = userEvent.setup();
    installClipboard(writeText);
    render(
      <WidgetErrorBoundary scope="report">
        <Boom error={adapterErrorFromResponse({ status: 503, headers: hdr({ 'x-request-id': 'TB-7K2M-9QXD-4HFA' }) }, 'api')} />
      </WidgetErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: /copy error report/i }));

    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('Reference: TB-7K2M-9QXD-4HFA');
    expect(copied).toContain('Code: UPSTREAM_UNAVAILABLE');
    expect(copied).toContain('Category: Dependency failure');
    expect(await screen.findByText(/report details copied.*TB-7K2M-9QXD-4HFA/i)).toBeInTheDocument();
    expect(screen.getByTestId('error-status')).toHaveAttribute('role', 'status');

    const incidents = events.filter((e) => e.message === 'user_reported_error');
    expect(incidents).toHaveLength(1);
    expect(incidents[0].context).toMatchObject({ correlationRef: 'TB-7K2M-9QXD-4HFA', kind: 'dependency', scope: 'report' });

    // Reporting again re-copies but does not spam telemetry.
    await user.click(screen.getByRole('button', { name: /copy error report/i }));
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(events.filter((e) => e.message === 'user_reported_error')).toHaveLength(1);
  });

  it('is honest when the clipboard is unavailable: still shows the reference to quote', async () => {
    const user = userEvent.setup();
    installClipboard(writeText);
    writeText.mockRejectedValue(new Error('denied'));
    render(
      <WidgetErrorBoundary scope="report">
        <Boom error={adapterErrorFromResponse({ status: 503, headers: hdr({ 'x-request-id': 'TB-7K2M-9QXD-4HFA' }) }, 'api')} />
      </WidgetErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: /copy error report/i }));
    expect(await screen.findByText(/couldn.t copy automatically.*TB-7K2M-9QXD-4HFA/i)).toBeInTheDocument();
    expect(screen.getByTestId('correlation-ref')).toHaveTextContent('TB-7K2M-9QXD-4HFA');
  });

  it('boundary telemetry forwards only allow-listed context and never the raw message', () => {
    render(
      <WidgetErrorBoundary scope="telemetry">
        <Boom error={new Error('token=SUPERSECRET evidence https://x.example/file.pdf')} />
      </WidgetErrorBoundary>,
    );
    const ev = events.find((e) => e.category === 'boundary_error');
    expect(ev).toBeDefined();
    expect(ev!.message).toBe('UNEXPECTED_ERROR');
    expect(Object.keys(ev!.context).sort()).toEqual(
      ['correlationRef', 'correlationRejected', 'kind', 'level', 'scope', 'source'].sort(),
    );
    expect(JSON.stringify(ev)).not.toMatch(/SUPERSECRET|x\.example/);
  });
});

describe('RouteErrorFallback (Next.js error.tsx)', () => {
  it('classifies, shows a reference, keeps recovery navigation available, and bounds reset()', async () => {
    const user = userEvent.setup();
    const reset = jest.fn();
    const make = () => <RouteErrorFallback error={new Error('fail')} reset={reset} scope="Claim detail" />;
    const first = render(make());
    expect(screen.getByTestId('correlation-ref').textContent).toMatch(REF);
    expect(within(screen.getByRole('navigation', { name: /recovery navigation/i })).getAllByRole('link').length).toBeGreaterThan(0);

    for (let i = 0; i < 3; i += 1) await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();

    // A remount (Next re-renders error.tsx) cannot reset the count.
    first.unmount();
    render(make());
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    expect(reset).toHaveBeenCalledTimes(3);
  });

  it('a 403 surfaced to a route boundary shows a denial with navigation, not a fault', () => {
    const err = Object.assign(new AdapterError({ kind: 'denied', code: 'AUTHORITY_DENIED', source: 'api', status: 403 }), {});
    render(<RouteErrorFallback error={err} reset={() => undefined} scope="Admin" />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-error-kind', 'denied');
    expect(screen.queryByRole('button', { name: /try again|reload/i })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /recovery navigation/i })).toBeInTheDocument();
  });

  it('includes the Next.js digest in the copied report only when it is a short numeric string', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const err = Object.assign(new Error('x'), { digest: '2345678901' });
    render(<RouteErrorFallback error={err} reset={() => undefined} scope="Dashboard" />);
    await user.click(screen.getByRole('button', { name: /copy error report/i }));
    expect(writeText.mock.calls[0][0]).toContain('Digest: 2345678901');
  });
});

describe('AppErrorBoundary misc', () => {
  it('invokes onError with the sanitized classification only', () => {
    const onError = jest.fn();
    render(
      <AppErrorBoundary scope="cb" level="widget" onError={onError}>
        <Boom error={new Error('secret message')} />
      </AppErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(onError.mock.calls[0])).not.toContain('secret message');
  });

  it('a throwing onError callback cannot break recovery UI', () => {
    render(
      <AppErrorBoundary
        scope="cb"
        level="widget"
        onError={() => {
          throw new Error('reporter broke');
        }}
      >
        <Boom />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('invalid scope labels are replaced, never echoed into the DOM', () => {
    render(
      <AppErrorBoundary scope='"><img src=x onerror=alert(1)>' level="widget">
        <Boom />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveAttribute('data-boundary-scope', 'unknown');
    expect(document.querySelector('img')).toBeNull();
  });
});
