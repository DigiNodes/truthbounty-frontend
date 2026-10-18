import { AdapterError, adapterErrorFromResponse, toAdapterError } from '@/lib/errors/classification';

/**
 * API adapter helpers — UI-FE-053 (#626).
 *
 * Every failure is thrown as an `AdapterError`:
 *  - classified (user / dependency / denied / defect) from the HTTP status,
 *  - carrying a *sanitized* correlation reference (validated response header,
 *    else a locally minted one),
 *  - and NEVER carrying the response body or server text, which is untrusted.
 * The API is a read/projection layer: a failed or unreadable response is surfaced
 * as a failure, never replaced with fabricated data.
 */

async function request(input: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (error) {
    // Network failure / abort: classified without reading anything from the error text.
    throw toAdapterError(error, 'api');
  }
  return res;
}

async function readJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    // A 2xx with an unreadable body is a broken projection, not an empty success.
    throw new AdapterError({ kind: 'dependency', code: 'MALFORMED_RESPONSE', source: 'api', status: res.status });
  }
}

export async function getClaimById(id: string) {
  const res = await request(`/api/claims/${id}`);
  if (!res.ok) {
    // `CLAIM_NOT_FOUND` is kept as the message for existing recovery consumers.
    throw adapterErrorFromResponse(res, 'api', res.status === 404 ? { message: 'CLAIM_NOT_FOUND' } : {});
  }
  return readJson(res);
}

export async function submitVerification(payload: {
  claimId: string;
  decision: 'verify' | 'reject';
  stakeAmount: number;
}) {
  const res = await request('/api/verifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw adapterErrorFromResponse(res, 'api');
  return readJson(res);
}
