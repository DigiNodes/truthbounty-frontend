import { AdapterError } from '@/lib/errors/classification';

/**
 * Route boundary failure classification (approved route contract, UI-FE-008).
 * Route errors must distinguish authorization, configuration, dependency and
 * missing-resource failures.
 */
export type RouteErrorKind =
  | 'authorization'
  | 'configuration'
  | 'dependency'
  | 'missing-resource'
  | 'unknown';

/** Alias kept for existing `ErrorBoundary` consumers. */
export type RouteBoundaryKind = RouteErrorKind;

/**
 * Infer the route boundary kind from a caught error. Never inspects user data
 * or free-text messages — only typed signals produced by adapters: an
 * `AdapterError`, well-known status codes, error codes and error names.
 */
export function classifyRouteError(error: unknown): RouteErrorKind {
  if (!error || typeof error !== 'object') return 'unknown';

  // Adapter errors are already classified from typed signals (UI-FE-053 / #626).
  if (error instanceof AdapterError) {
    if (error.kind === 'denied') return 'authorization';
    if (error.code === 'NOT_FOUND') return 'missing-resource';
    if (error.code === 'CONFIGURATION_ERROR') return 'configuration';
    if (error.kind === 'dependency') return 'dependency';
    return 'unknown';
  }

  const anyErr = error as { name?: string; status?: number; code?: string | number };
  const status = typeof anyErr.status === 'number' ? anyErr.status : undefined;
  const code = anyErr.code !== undefined ? String(anyErr.code) : undefined;
  const name = typeof anyErr.name === 'string' ? anyErr.name : '';

  if (status === 401 || status === 403) return 'authorization';
  if (status === 404) return 'missing-resource';
  if (status === 502 || status === 503 || status === 504) return 'dependency';
  if (status === 500 || status === 0) return 'dependency';

  if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN') return 'authorization';
  if (code === 'NOT_FOUND') return 'missing-resource';
  if (code === 'CONFIG_MISSING' || code === 'CONFIG_INVALID') return 'configuration';
  if (code === 'DEPENDENCY_UNAVAILABLE' || code === 'NETWORK_ERROR') return 'dependency';

  if (name === 'AuthorizationError' || name === 'ForbiddenError') return 'authorization';
  if (name === 'ConfigurationError' || name === 'ConfigError') return 'configuration';
  if (name === 'NotFoundError') return 'missing-resource';
  if (name === 'DependencyError' || name === 'NetworkError') return 'dependency';

  return 'unknown';
}
