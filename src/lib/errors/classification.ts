/**
 * Error classification — UI-FE-053 (#626)
 *
 * Distinguishes four failure kinds so the UI never mislabels one as another:
 *
 *  - `user`        the person can fix it (rejected wallet prompt, wrong network,
 *                  not found, rejected input).
 *  - `dependency`  something this view depends on is unavailable (API, RPC,
 *                  network, lazy chunk). Data is not shown as confirmed.
 *  - `denied`      authority was denied (401/403, missing role, disabled
 *                  capability). This is a decision, NOT a technical error.
 *  - `defect`      an unexpected application fault (render/hydration/etc.).
 *
 * Trust model: API, wallet, route and user content are untrusted. Classification
 * therefore relies ONLY on typed signals — an `AdapterError` instance, numeric
 * HTTP statuses, and well-known wallet/RPC error names and numeric codes.
 * Free-text error messages are never used to decide `denied`; the only message
 * matching is for two framework-owned strings (lazy-chunk load, hydration).
 * Unknown input fails closed to `defect`.
 */

import { resolveCorrelationReference, readCorrelationCandidate, type HeaderReader } from './correlation';

export type ErrorKind = 'user' | 'dependency' | 'denied' | 'defect';

export type ErrorSource = 'api' | 'rpc' | 'wallet' | 'chunk' | 'render' | 'hydration' | 'unknown';

export interface AdapterErrorInit {
  kind: ErrorKind;
  /** Stable, upper-snake-case machine code. Never contains user/server text. */
  code: string;
  source: ErrorSource;
  status?: number;
  /** Untrusted candidate reference (e.g. from a response header). */
  correlationRef?: unknown;
  /** Whether re-running the same operation can plausibly succeed. */
  retryable?: boolean;
  /** Optional safe message. Defaults to the code so raw server text never leaks. */
  message?: string;
}

/**
 * Error thrown by API/RPC/wallet adapters. Carries a *sanitized* correlation
 * reference and a pre-classified kind. Raw response bodies are never attached.
 */
export class AdapterError extends Error {
  readonly kind: ErrorKind;
  readonly code: string;
  readonly source: ErrorSource;
  readonly status?: number;
  readonly retryable: boolean;
  readonly correlationRef: string;
  readonly correlationOrigin: 'adapter' | 'local';
  readonly correlationRejected: boolean;

  constructor(init: AdapterErrorInit) {
    super(init.message ?? init.code);
    this.name = 'AdapterError';
    this.kind = init.kind;
    this.code = init.code;
    this.source = init.source;
    this.status = init.status;
    this.retryable = init.retryable ?? defaultRetryable(init.kind);
    const resolved = resolveCorrelationReference(init.correlationRef);
    this.correlationRef = resolved.reference;
    this.correlationOrigin = resolved.origin;
    this.correlationRejected = resolved.rejected;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type DenialReason =
  | 'wallet_disconnected'
  | 'wrong_chain'
  | 'verifier_role_required'
  | 'admin_role_required'
  | 'feature_disabled'
  | 'unauthorized';

/** Throw this from a component/hook when authority is denied. Never a technical error. */
export class AuthorityDeniedError extends AdapterError {
  readonly reason: DenialReason;

  constructor(reason: DenialReason = 'unauthorized', correlationRef?: unknown) {
    super({
      kind: 'denied',
      code: `DENIED_${reason.toUpperCase()}`,
      source: 'unknown',
      retryable: false,
      correlationRef,
    });
    this.name = 'AuthorityDeniedError';
    this.reason = reason;
  }
}

export interface ClassifiedError {
  kind: ErrorKind;
  code: string;
  source: ErrorSource;
  status?: number;
  /** Safe to display and to quote to support. */
  correlationRef: string;
  correlationOrigin: 'adapter' | 'local';
  /** True when an adapter supplied a reference that failed validation. */
  correlationRejected: boolean;
  /** Whether an in-place retry can plausibly help. Denied is always false. */
  retryable: boolean;
  /** Whether a full reload is a sensible recovery (chunk/hydration/dependency/defect). */
  reloadable: boolean;
  /** Opaque Next.js server digest, only when it is a short numeric string. */
  digest?: string;
}

function defaultRetryable(kind: ErrorKind): boolean {
  return kind !== 'denied';
}

// ---------------------------------------------------------------------------
// Signal helpers (all defensive — inputs are untrusted)
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readString(obj: Record<string, unknown> | null, key: string): string | undefined {
  const v = obj?.[key];
  return typeof v === 'string' ? v : undefined;
}

function readNumber(obj: Record<string, unknown> | null, key: string): number | undefined {
  const v = obj?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** Walk `cause` chains (viem/wagmi wrap errors) with a hard depth bound. */
function causeChain(error: unknown, max = 6): unknown[] {
  const chain: unknown[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current !== undefined && current !== null && chain.length < max && !seen.has(current)) {
    chain.push(current);
    seen.add(current);
    current = asRecord(current)?.cause;
  }
  return chain;
}

function httpStatusOf(error: unknown): number | undefined {
  const rec = asRecord(error);
  const direct = readNumber(rec, 'status') ?? readNumber(rec, 'statusCode');
  if (direct !== undefined) return direct;
  // axios-style: error.response.status
  return readNumber(asRecord(rec?.response), 'status');
}

function headersOf(error: unknown): HeaderReader | null {
  const rec = asRecord(error);
  const h = asRecord(rec?.headers) ?? asRecord(asRecord(rec?.response)?.headers);
  if (!h) return null;
  if (typeof (h as { get?: unknown }).get === 'function') return h as unknown as HeaderReader;
  // Plain-object (axios) headers: adapt to the reader interface.
  return {
    get: (name: string) => {
      const v = h[name] ?? h[name.toLowerCase()];
      return typeof v === 'string' ? v : null;
    },
  };
}

// Wallet / RPC signals. Names and numeric codes are standardised (EIP-1193,
// JSON-RPC, viem). They are NOT derived from message text.
const WALLET_REJECTED_NAMES = new Set(['UserRejectedRequestError']);
const WRONG_CHAIN_NAMES = new Set(['ChainMismatchError', 'ChainNotConfiguredError', 'SwitchChainError']);
const RPC_NAMES = new Set([
  'HttpRequestError',
  'TimeoutError',
  'RpcRequestError',
  'InternalRpcError',
  'ProviderDisconnectedError',
  'ChainDisconnectedError',
  'WebSocketRequestError',
]);
const CONTRACT_REJECTED_NAMES = new Set(['ContractFunctionRevertedError', 'ContractFunctionExecutionError']);

const CHUNK_LOAD_PATTERN =
  /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;
const HYDRATION_PATTERN =
  /Hydration failed|Text content does not match server-rendered HTML|There was an error while hydrating|did not match\. Server:/i;

function nameOf(error: unknown): string {
  const rec = asRecord(error);
  return readString(rec, 'name') ?? '';
}

function messageOf(error: unknown): string {
  const rec = asRecord(error);
  return readString(rec, 'message') ?? (typeof error === 'string' ? error : '');
}

function classifyHttpStatus(status: number): Pick<AdapterErrorInit, 'kind' | 'code' | 'retryable'> {
  if (status === 401) return { kind: 'denied', code: 'AUTHENTICATION_REQUIRED', retryable: false };
  if (status === 403) return { kind: 'denied', code: 'AUTHORITY_DENIED', retryable: false };
  if (status === 404) return { kind: 'user', code: 'NOT_FOUND', retryable: false };
  if (status === 408) return { kind: 'dependency', code: 'REQUEST_TIMEOUT', retryable: true };
  if (status === 429) return { kind: 'dependency', code: 'RATE_LIMITED', retryable: true };
  if (status === 400 || status === 409 || status === 410 || status === 422) {
    return { kind: 'user', code: 'REQUEST_REJECTED', retryable: false };
  }
  if (status >= 500 && status <= 599) {
    return { kind: 'dependency', code: 'UPSTREAM_UNAVAILABLE', retryable: true };
  }
  // Unknown status: do not guess. Fail closed to a defect.
  return { kind: 'defect', code: 'UNEXPECTED_RESPONSE', retryable: false };
}

// ---------------------------------------------------------------------------
// Adapter-facing constructors
// ---------------------------------------------------------------------------

/**
 * Build an `AdapterError` from a failed `Response`. Reads (and validates) the
 * correlation header; never reads the body, so server text cannot leak into the UI.
 */
export function adapterErrorFromResponse(
  response: Pick<Response, 'status' | 'headers'>,
  source: Extract<ErrorSource, 'api' | 'rpc'> = 'api',
  overrides: Partial<Pick<AdapterErrorInit, 'message' | 'code'>> = {},
): AdapterError {
  const mapped = classifyHttpStatus(response.status);
  return new AdapterError({
    ...mapped,
    code: overrides.code ?? mapped.code,
    message: overrides.message,
    source,
    status: response.status,
    correlationRef: readCorrelationCandidate(response.headers) ?? undefined,
  });
}

/**
 * Normalise anything thrown inside an adapter into an `AdapterError`.
 * Already-classified errors pass through untouched (so a reference is minted once).
 */
export function toAdapterError(error: unknown, source: ErrorSource = 'unknown'): AdapterError {
  if (error instanceof AdapterError) return error;
  const c = classifyError(error, { source });
  return new AdapterError({
    kind: c.kind,
    code: c.code,
    source: c.source,
    status: c.status,
    retryable: c.retryable,
    correlationRef: c.correlationOrigin === 'adapter' ? c.correlationRef : undefined,
  });
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export interface ClassifyOptions {
  /** Source to assume when the error itself does not say. */
  source?: ErrorSource;
  /** Next.js `error.digest` (server-render failures). */
  digest?: string;
}

function finish(
  base: {
    kind: ErrorKind;
    code: string;
    source: ErrorSource;
    status?: number;
    retryable: boolean;
    reloadable: boolean;
  },
  correlationCandidate: unknown,
  digest?: string,
): ClassifiedError {
  const resolved = resolveCorrelationReference(correlationCandidate);
  return {
    ...base,
    // Denied authority is never retryable or reloadable — those would imply a fault.
    retryable: base.kind === 'denied' ? false : base.retryable,
    reloadable: base.kind === 'denied' ? false : base.reloadable,
    correlationRef: resolved.reference,
    correlationOrigin: resolved.origin,
    correlationRejected: resolved.rejected,
    ...(digest && /^[0-9]{4,20}$/.test(digest) ? { digest } : {}),
  };
}

export function classifyError(error: unknown, options: ClassifyOptions = {}): ClassifiedError {
  const fallbackSource = options.source ?? 'render';

  // 1. Pre-classified adapter errors (instanceof only — never trust a look-alike object).
  if (error instanceof AdapterError) {
    return {
      kind: error.kind,
      code: error.code,
      source: error.source,
      status: error.status,
      // Denied authority is never retryable or reloadable — that would imply a fault.
      retryable: error.kind === 'denied' ? false : error.retryable,
      reloadable: error.kind === 'dependency' || error.kind === 'defect',
      correlationRef: error.correlationRef,
      correlationOrigin: error.correlationOrigin,
      correlationRejected: error.correlationRejected,
      ...(options.digest && /^[0-9]{4,20}$/.test(options.digest) ? { digest: options.digest } : {}),
    };
  }

  const chain = causeChain(error);

  // 2. Wallet / RPC signals by standardised name or numeric code.
  for (const item of chain) {
    const rec = asRecord(item);
    const name = nameOf(item);
    const code = readNumber(rec, 'code');

    if (WALLET_REJECTED_NAMES.has(name) || code === 4001) {
      return finish(
        { kind: 'user', code: 'WALLET_REQUEST_DECLINED', source: 'wallet', retryable: true, reloadable: false },
        undefined,
        options.digest,
      );
    }
    if (code === -32002) {
      return finish(
        { kind: 'user', code: 'WALLET_REQUEST_PENDING', source: 'wallet', retryable: true, reloadable: false },
        undefined,
        options.digest,
      );
    }
    if (WRONG_CHAIN_NAMES.has(name) || code === 4902 || code === 4901) {
      return finish(
        { kind: 'user', code: 'WRONG_CHAIN', source: 'wallet', retryable: true, reloadable: false },
        undefined,
        options.digest,
      );
    }
    if (RPC_NAMES.has(name) || (code !== undefined && code <= -32000 && code >= -32099) || code === -32603) {
      return finish(
        { kind: 'dependency', code: 'RPC_UNAVAILABLE', source: 'rpc', retryable: true, reloadable: true },
        undefined,
        options.digest,
      );
    }
    if (CONTRACT_REJECTED_NAMES.has(name)) {
      return finish(
        { kind: 'user', code: 'CONTRACT_REQUEST_REJECTED', source: 'rpc', retryable: false, reloadable: false },
        undefined,
        options.digest,
      );
    }
  }

  // 3. Framework-owned conditions (the only message matching we do).
  const message = messageOf(error);
  const name = nameOf(error);
  if (name === 'ChunkLoadError' || CHUNK_LOAD_PATTERN.test(message)) {
    // React.lazy caches a rejected import, so an in-place retry would re-throw
    // the same rejection. Reload is the correct recovery.
    return finish(
      { kind: 'dependency', code: 'CHUNK_LOAD_FAILED', source: 'chunk', retryable: false, reloadable: true },
      undefined,
      options.digest,
    );
  }
  if (HYDRATION_PATTERN.test(message)) {
    return finish(
      { kind: 'defect', code: 'HYDRATION_MISMATCH', source: 'hydration', retryable: false, reloadable: true },
      undefined,
      options.digest,
    );
  }

  // 4. HTTP-shaped errors (axios, fetch wrappers) — numeric status only.
  const status = httpStatusOf(error);
  if (status !== undefined) {
    const mapped = classifyHttpStatus(status);
    return finish(
      {
        ...mapped,
        retryable: mapped.retryable ?? false,
        source: 'api',
        status,
        reloadable: mapped.kind === 'dependency',
      },
      readCorrelationCandidate(headersOf(error)) ?? undefined,
      options.digest,
    );
  }
  const axiosCode = readString(asRecord(error), 'code');
  if (axiosCode === 'ERR_NETWORK' || axiosCode === 'ECONNABORTED' || axiosCode === 'ETIMEDOUT') {
    return finish(
      { kind: 'dependency', code: 'NETWORK_UNAVAILABLE', source: 'api', retryable: true, reloadable: true },
      undefined,
      options.digest,
    );
  }
  // fetch() rejects with TypeError on network failure.
  if (name === 'TypeError' && /failed to fetch|network ?error|load failed/i.test(message)) {
    return finish(
      { kind: 'dependency', code: 'NETWORK_UNAVAILABLE', source: 'api', retryable: true, reloadable: true },
      undefined,
      options.digest,
    );
  }
  if (name === 'AbortError') {
    return finish(
      { kind: 'user', code: 'REQUEST_CANCELLED', source: fallbackSource, retryable: true, reloadable: false },
      undefined,
      options.digest,
    );
  }

  // 5. Anything else is an application defect (fail closed).
  return finish(
    { kind: 'defect', code: 'UNEXPECTED_ERROR', source: fallbackSource, retryable: true, reloadable: true },
    undefined,
    options.digest,
  );
}

/** Human label for a kind. Kept here so every surface uses identical wording. */
export const ERROR_KIND_LABEL: Record<ErrorKind, string> = {
  user: 'Needs your attention',
  dependency: 'Dependency failure',
  denied: 'Access denied',
  defect: 'Application defect',
};
