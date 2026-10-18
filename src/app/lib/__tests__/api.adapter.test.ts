import { getClaimById, submitVerification } from '../api';
import { AdapterError, classifyError } from '@/lib/errors/classification';

const SIGNATURE = '0x' + 'ab'.repeat(65);

function mockFetchOnce(init: { status: number; headers?: Record<string, string>; body?: unknown; reject?: Error }) {
  const impl = init.reject
    ? jest.fn().mockRejectedValue(init.reject)
    : jest.fn().mockResolvedValue({
        ok: init.status >= 200 && init.status < 300,
        status: init.status,
        headers: { get: (n: string) => init.headers?.[n.toLowerCase()] ?? null },
        json: async () => init.body,
      });
  (global as unknown as { fetch: unknown }).fetch = impl;
  return impl;
}

async function caught(promise: Promise<unknown>): Promise<AdapterError> {
  try {
    await promise;
  } catch (e) {
    return e as AdapterError;
  }
  throw new Error('expected rejection');
}

describe('API adapter → correlation references (UI-FE-053)', () => {
  it('returns parsed JSON on success', async () => {
    mockFetchOnce({ status: 200, body: { id: '1' } });
    await expect(getClaimById('1')).resolves.toEqual({ id: '1' });
  });

  it('503 → dependency failure carrying the server reference', async () => {
    mockFetchOnce({ status: 503, headers: { 'x-request-id': 'TB-7K2M-9QXD-4HFA' } });
    const err = await caught(getClaimById('1'));
    expect(err).toBeInstanceOf(AdapterError);
    expect(err).toMatchObject({ kind: 'dependency', source: 'api', status: 503, correlationRef: 'TB-7K2M-9QXD-4HFA' });
  });

  it('403 → denied authority, never a technical error', async () => {
    mockFetchOnce({ status: 403, headers: { 'x-correlation-id': 'TB-AAAA-BBBB-CCCC' } });
    const err = await caught(submitVerification({ claimId: '1', decision: 'verify', stakeAmount: 1 }));
    expect(classifyError(err)).toMatchObject({ kind: 'denied', retryable: false, reloadable: false });
  });

  it('404 keeps the CLAIM_NOT_FOUND message for existing recovery consumers', async () => {
    mockFetchOnce({ status: 404 });
    const err = await caught(getClaimById('nope'));
    expect(err.message).toBe('CLAIM_NOT_FOUND');
    expect(err.kind).toBe('user');
  });

  it('network failure → dependency failure; raw error text (which may hold a URL/token) is dropped', async () => {
    mockFetchOnce({ status: 0, reject: new TypeError('Failed to fetch https://api.example/x?token=SECRET') });
    const err = await caught(getClaimById('1'));
    expect(err).toMatchObject({ kind: 'dependency', code: 'NETWORK_UNAVAILABLE' });
    expect(JSON.stringify({ m: err.message, c: err.code })).not.toMatch(/SECRET|token|https/);
  });

  it('a signature smuggled into a correlation header is dropped and replaced locally', async () => {
    mockFetchOnce({ status: 500, headers: { 'x-request-id': SIGNATURE } });
    const err = await caught(getClaimById('1'));
    expect(err.correlationOrigin).toBe('local');
    expect(err.correlationRejected).toBe(true);
    expect(err.correlationRef).toMatch(/^TB-/);
    expect(err.correlationRef + err.message).not.toContain('abab');
  });

  it('the response body is never read into the error', async () => {
    mockFetchOnce({ status: 500, body: { error: `leaked ${SIGNATURE} secret-token` } });
    const err = await caught(getClaimById('1'));
    expect(JSON.stringify(err, Object.getOwnPropertyNames(err))).not.toMatch(/leaked|secret-token|abab/);
  });

  it('a 200 with an unreadable body is a broken projection, not an empty success', async () => {
    (global as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });
    const err = await caught(getClaimById('1'));
    expect(err).toMatchObject({ kind: 'dependency', code: 'MALFORMED_RESPONSE' });
  });
});
