import React from 'react';
import { render, screen } from '@testing-library/react';
import { classifyRouteError } from '../errors';
import { AdapterError, AuthorityDeniedError } from '@/lib/errors/classification';
import { RouteErrorFallback } from '@/components/common/RouteErrorFallback';

describe('classifyRouteError', () => {
  it('maps typed signals', () => {
    expect(classifyRouteError(Object.assign(new Error('x'), { status: 403 }))).toBe('authorization');
    expect(classifyRouteError(Object.assign(new Error('x'), { status: 404 }))).toBe('missing-resource');
    expect(classifyRouteError(Object.assign(new Error('x'), { status: 503 }))).toBe('dependency');
    expect(classifyRouteError(Object.assign(new Error('x'), { code: 'CONFIG_MISSING' }))).toBe('configuration');
  });

  it('understands AdapterError / AuthorityDeniedError', () => {
    expect(classifyRouteError(new AuthorityDeniedError('admin_role_required'))).toBe('authorization');
    expect(classifyRouteError(new AdapterError({ kind: 'user', code: 'NOT_FOUND', source: 'api' }))).toBe('missing-resource');
    expect(classifyRouteError(new AdapterError({ kind: 'dependency', code: 'X', source: 'api' }))).toBe('dependency');
  });

  it('never infers authorization from message text', () => {
    expect(classifyRouteError(new Error('403 forbidden permission denied'))).toBe('unknown');
  });

  it.each([null, undefined, 'str', 7])('fails closed on %p', (v) => expect(classifyRouteError(v)).toBe('unknown'));
});

describe('RouteErrorFallback kind prop', () => {
  beforeEach(() => window.sessionStorage.clear());
  const r = (kind?: Parameters<typeof RouteErrorFallback>[0]['kind']) =>
    render(<RouteErrorFallback error={new Error('x')} reset={() => undefined} scope="Claim detail" kind={kind} />);

  it('authorization → denial: no retry/reload/report', () => {
    r('authorization');
    expect(screen.getByRole('alert')).toHaveAttribute('data-error-kind', 'denied');
    expect(screen.queryByRole('button', { name: /try again|reload|copy error report/i })).not.toBeInTheDocument();
  });

  it('missing-resource → user error without a pointless retry', () => {
    r('missing-resource');
    expect(screen.getByRole('alert')).toHaveAttribute('data-error-code', 'NOT_FOUND');
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('configuration → no retry (it cannot help)', () => {
    r('configuration');
    expect(screen.getByRole('alert')).toHaveAttribute('data-error-code', 'CONFIGURATION_ERROR');
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('dependency → retry, reload and report offered', () => {
    r('dependency');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy error report/i })).toBeInTheDocument();
  });
});
