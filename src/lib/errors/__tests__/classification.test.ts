import {
  AdapterError,
  AuthorityDeniedError,
  adapterErrorFromResponse,
  classifyError,
  toAdapterError,
  type ErrorKind,
} from '../classification';

const headers = (map: Record<string, string> = {}) =>
  ({ get: (n: string) => map[n.toLowerCase()] ?? null }) as unknown as Headers;

describe('HTTP status → kind (adapterErrorFromResponse)', () => {
  const cases: Array<[number, ErrorKind, string, boolean]> = [
    [401, 'denied', 'AUTHENTICATION_REQUIRED', false],
    [403, 'denied', 'AUTHORITY_DENIED', false],
    [404, 'user', 'NOT_FOUND', false],
    [400, 'user', 'REQUEST_REJECTED', false],
    [409, 'user', 'REQUEST_REJECTED', false],
    [422, 'user', 'REQUEST_REJECTED', false],
    [408, 'dependency', 'REQUEST_TIMEOUT', true],
    [429, 'dependency', 'RATE_LIMITED', true],
    [500, 'dependency', 'UPSTREAM_UNAVAILABLE', true],
    [502, 'dependency', 'UPSTREAM_UNAVAILABLE', true],
    [503, 'dependency', 'UPSTREAM_UNAVAILABLE', true],
    [418, 'defect', 'UNEXPECTED_RESPONSE', false],
    [302, 'defect', 'UNEXPECTED_RESPONSE', false],
  ];

  it.each(cases)('status %i → %s (%s, retryable=%s)', (status, kind, code, retryable) => {
    const err = adapterErrorFromResponse({ status, headers: headers() }, 'api');
    expect(err).toBeInstanceOf(AdapterError);
    expect({ kind: err.kind, code: err.code, retryable: err.retryable, status: err.status }).toEqual({
      kind,
      code,
      retryable,
      status,
    });
  });

  it('carries a validated server correlation reference', () => {
    const err = adapterErrorFromResponse(
      { status: 503, headers: headers({ 'x-request-id': 'TB-7K2M-9QXD-4HFA' }) },
      'api',
    );
    expect(err.correlationRef).toBe('TB-7K2M-9QXD-4HFA');
    expect(err.correlationOrigin).toBe('adapter');
  });

  it('drops an unsafe server reference and mints a local one', () => {
    const sig = '0x' + 'ab'.repeat(65);
    const err = adapterErrorFromResponse({ status: 500, headers: headers({ 'x-request-id': sig }) }, 'api');
    expect(err.correlationOrigin).toBe('local');
    expect(err.correlationRef).not.toContain('abab');
  });

  it('never puts server-provided text in the error message', () => {
    const err = adapterErrorFromResponse({ status: 500, headers: headers() }, 'api');
    expect(err.message).toBe('UPSTREAM_UNAVAILABLE');
  });
});

describe('denied authority is never mislabelled as a technical error', () => {
  it('401/403 are denied and never retryable or reloadable', () => {
    for (const status of [401, 403]) {
      const c = classifyError(adapterErrorFromResponse({ status, headers: headers() }));
      expect(c.kind).toBe('denied');
      expect(c.retryable).toBe(false);
      expect(c.reloadable).toBe(false);
    }
  });

  it('AuthorityDeniedError is denied, not retryable, not reloadable', () => {
    expect(classifyError(new AuthorityDeniedError('verifier_role_required'))).toMatchObject({
      kind: 'denied',
      code: 'DENIED_VERIFIER_ROLE_REQUIRED',
      retryable: false,
      reloadable: false,
    });
  });

  it('a plain Error whose MESSAGE says "forbidden/403/denied" is NOT treated as denied (untrusted text)', () => {
    for (const message of ['403 Forbidden', 'access denied', 'unauthorized', 'FORBIDDEN']) {
      expect(classifyError(new Error(message)).kind).toBe('defect');
    }
  });

  it('a look-alike object claiming kind=denied is not trusted', () => {
    const spoof = Object.assign(new Error('x'), { kind: 'denied', name: 'AdapterError' });
    expect(classifyError(spoof).kind).toBe('defect');
  });

  it('a body claiming denial cannot downgrade a 503 into a denial', () => {
    const err = Object.assign(new Error('boom'), { status: 503, kind: 'denied', response: { data: { kind: 'denied' } } });
    expect(classifyError(err).kind).toBe('dependency');
  });
});

describe('wallet / RPC signals', () => {
  const named = (name: string, extra: Record<string, unknown> = {}) =>
    Object.assign(new Error('x'), { name, ...extra });

  it('rejected wallet prompt is a user error', () => {
    expect(classifyError(named('UserRejectedRequestError'))).toMatchObject({
      kind: 'user',
      code: 'WALLET_REQUEST_DECLINED',
      source: 'wallet',
    });
    expect(classifyError(named('Error', { code: 4001 })).code).toBe('WALLET_REQUEST_DECLINED');
  });

  it('pending wallet request (-32002) is a user error', () => {
    expect(classifyError(named('Error', { code: -32002 })).code).toBe('WALLET_REQUEST_PENDING');
  });

  it('wrong chain is a user-correctable error, not a technical one', () => {
    for (const e of [named('ChainMismatchError'), named('SwitchChainError'), named('Error', { code: 4902 })]) {
      expect(classifyError(e)).toMatchObject({ kind: 'user', code: 'WRONG_CHAIN' });
    }
  });

  it('RPC transport failures are dependency failures', () => {
    for (const e of [
      named('HttpRequestError'),
      named('TimeoutError'),
      named('Error', { code: -32603 }),
      named('Error', { code: -32005 }),
    ]) {
      expect(classifyError(e)).toMatchObject({ kind: 'dependency', code: 'RPC_UNAVAILABLE', source: 'rpc' });
    }
  });

  it('finds the signal through a viem-style cause chain', () => {
    const inner = named('UserRejectedRequestError');
    const outer = Object.assign(new Error('wrapped'), { cause: Object.assign(new Error('mid'), { cause: inner }) });
    expect(classifyError(outer).code).toBe('WALLET_REQUEST_DECLINED');
  });

  it('survives a circular cause chain', () => {
    const a: Error & { cause?: unknown } = new Error('a');
    const b: Error & { cause?: unknown } = new Error('b');
    a.cause = b;
    b.cause = a;
    expect(() => classifyError(a)).not.toThrow();
  });
});

describe('framework conditions', () => {
  it('lazy-chunk failure → dependency, reload (NOT retry: React.lazy caches the rejection)', () => {
    for (const e of [
      Object.assign(new Error('Loading chunk 42 failed.'), { name: 'ChunkLoadError' }),
      new Error('Failed to fetch dynamically imported module: https://x/y.js'),
      new TypeError('error loading dynamically imported module'),
    ]) {
      expect(classifyError(e)).toMatchObject({
        kind: 'dependency',
        code: 'CHUNK_LOAD_FAILED',
        source: 'chunk',
        retryable: false,
        reloadable: true,
      });
    }
  });

  it('hydration mismatch → defect, reload', () => {
    expect(
      classifyError(new Error("Hydration failed because the server rendered HTML didn't match the client.")),
    ).toMatchObject({ kind: 'defect', code: 'HYDRATION_MISMATCH', source: 'hydration', retryable: false, reloadable: true });
  });

  it('network failures (fetch TypeError / axios ERR_NETWORK) are dependency failures', () => {
    expect(classifyError(new TypeError('Failed to fetch')).code).toBe('NETWORK_UNAVAILABLE');
    expect(classifyError(Object.assign(new Error('x'), { code: 'ERR_NETWORK' })).kind).toBe('dependency');
  });

  it('axios-style response status + header are used', () => {
    const e = Object.assign(new Error('x'), {
      response: { status: 503, headers: { 'x-request-id': 'TB-7K2M-9QXD-4HFA' } },
    });
    expect(classifyError(e)).toMatchObject({ kind: 'dependency', correlationRef: 'TB-7K2M-9QXD-4HFA' });
  });
});

describe('fail closed', () => {
  it.each([null, undefined, 42, 'a string', {}, []])('unknown thrown value %p is an application defect', (thrown) => {
    const c = classifyError(thrown);
    expect(c.kind).toBe('defect');
    expect(c.code).toBe('UNEXPECTED_ERROR');
    expect(c.correlationRef).toMatch(/^TB-/);
  });

  it('only a short numeric digest is surfaced', () => {
    expect(classifyError(new Error('x'), { digest: '2345678901' }).digest).toBe('2345678901');
    expect(classifyError(new Error('x'), { digest: '0x' + 'ab'.repeat(32) }).digest).toBeUndefined();
    expect(classifyError(new Error('x'), { digest: 'secret-token-abc' }).digest).toBeUndefined();
  });
});

describe('toAdapterError', () => {
  it('passes AdapterErrors through untouched (reference minted once)', () => {
    const original = new AdapterError({ kind: 'dependency', code: 'X', source: 'api' });
    expect(toAdapterError(original)).toBe(original);
  });

  it('normalises raw errors without leaking their message', () => {
    const e = toAdapterError(new TypeError('Failed to fetch https://x?token=abc123'), 'api');
    expect(e).toMatchObject({ kind: 'dependency', code: 'NETWORK_UNAVAILABLE' });
    expect(e.message).toBe('NETWORK_UNAVAILABLE');
  });
});
