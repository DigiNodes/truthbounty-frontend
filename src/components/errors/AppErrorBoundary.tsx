'use client';

import React, { type ErrorInfo, type ReactNode } from 'react';
import { classifyError, type ClassifiedError } from '@/lib/errors/classification';
import { MAX_RETRY_ATTEMPTS, RecoveryBudget } from '@/lib/errors/recovery-budget';
import { captureBoundaryError, sanitizeScope, type BoundaryLevel } from '@/lib/errors/support-report';
import { redactError } from '@/lib/security/redaction';
import { scrubErrorInPlace } from '@/lib/errors/scrub';
import { ErrorFallback } from './ErrorFallback';

/**
 * AppErrorBoundary — UI-FE-053 (#626)
 *
 * One boundary implementation reused at three levels (route / composition /
 * widget). Behaviour is identical; only the fallback density differs.
 *
 *  - Isolation: a failure replaces only this subtree; siblings and any shell
 *    outside the boundary keep rendering. Boundaries nest — an inner boundary
 *    catches first; if its fallback itself throws, the next one out catches it.
 *  - Privacy: the caught error is classified from typed signals, then redacted
 *    IN PLACE before React logs it, so secrets never reach the console. Only
 *    allow-listed fields (reference, kind, code, source, scope, level) are sent
 *    to telemetry; the raw message is never forwarded or rendered.
 *  - Bounded recovery: retries are counted in a sliding window (default 3).
 *  - Focus: when recovery succeeds, focus returns to the element that had it
 *    before the failure (by id / data-focus-key), else the subtree's first
 *    focusable, else its heading. Focus is never taken if the person has
 *    already moved it elsewhere.
 *  - Never clears pending-transaction recovery state.
 */

export interface BoundaryFallbackContext {
  classified: ClassifiedError;
  retry: () => void;
  retriesRemaining: number;
}

export interface AppErrorBoundaryProps {
  children: ReactNode;
  /** Developer-defined scope label (lowercase, `[a-z0-9:_-]`). */
  scope: string;
  level: BoundaryLevel;
  /** When any entry changes, a caught error is cleared and the retry budget resets. */
  resetKeys?: readonly unknown[];
  onReset?: () => void;
  /** Receives only the sanitized classification — never the raw error. */
  onError?: (classified: ClassifiedError) => void;
  /** Replace the default fallback (e.g. to render navigation in a failed sidebar). */
  fallback?: (ctx: BoundaryFallbackContext) => ReactNode;
  showNavigation?: boolean;
  headingLevel?: 1 | 2 | 3;
  preserveNotice?: boolean;
  maxRetries?: number;
  onReload?: () => void;
  now?: () => Date;
}

interface State {
  classified: ClassifiedError | null;
}

function resetKeysChanged(a: readonly unknown[] = [], b: readonly unknown[] = []): boolean {
  return a.length !== b.length || a.some((item, i) => !Object.is(item, b[i]));
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function attrEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, State> {
  state: State = { classified: null };

  private readonly rootRef = React.createRef<HTMLDivElement>();
  private readonly retryBudget: RecoveryBudget;
  private lastFocusKey: string | null = null;
  private restoreFocusPending = false;

  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.retryBudget = new RecoveryBudget({ max: props.maxRetries ?? MAX_RETRY_ATTEMPTS });
  }

  static getDerivedStateFromError(error: unknown): State {
    // Classify from the untouched error first, then redact it in place so that
    // React's own console.error of the caught error cannot leak secrets.
    const classified = classifyError(error);
    try {
      redactError(error);
      // Adds email / URL / CID / bare-key / signature scrubbing that redactError doesn't cover.
      scrubErrorInPlace(error);
    } catch {
      /* fail closed: classification already captured */
    }
    return { classified };
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo): void {
    const { classified } = this.state;
    if (!classified) return;
    captureBoundaryError(classified, this.props.scope, this.props.level);
    try {
      this.props.onError?.(classified);
    } catch {
      /* never let a reporting callback break recovery */
    }
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps, prevState: State): void {
    if (this.state.classified && resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.retryBudget.reset();
      this.restoreFocusPending = false;
      this.setState({ classified: null });
      return;
    }
    if (prevState.classified && !this.state.classified && this.restoreFocusPending) {
      this.restoreFocusPending = false;
      this.restoreFocus();
    }
  }

  private handleFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target || this.state.classified) return;
    this.lastFocusKey = target.id || target.getAttribute('data-focus-key') || null;
  };

  private restoreFocus(): void {
    const root = this.rootRef.current;
    if (!root || typeof document === 'undefined') return;
    const active = document.activeElement;
    // Do not steal focus the person has already placed elsewhere.
    if (active && active !== document.body && !root.contains(active)) return;

    let target: HTMLElement | null = null;
    if (this.lastFocusKey) {
      const key = attrEscape(this.lastFocusKey);
      target = root.querySelector<HTMLElement>(`[id="${key}"], [data-focus-key="${key}"]`);
    }
    target ??= root.querySelector<HTMLElement>('[data-error-recovery-target]');
    target ??= root.querySelector<HTMLElement>(FOCUSABLE);
    if (!target) {
      const heading = root.querySelector<HTMLElement>('h1, h2, h3, [role="heading"]');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        target = heading;
      }
    }
    target?.focus();
  }

  private handleRetry = () => {
    // Spends one attempt; refuses (and keeps the fallback) when exhausted.
    if (!this.retryBudget.record()) {
      this.forceUpdate();
      return;
    }
    this.restoreFocusPending = true;
    // Safe retry: reset local error state only. Pending-transaction stores are
    // intentionally untouched so reload recovery still works.
    this.props.onReset?.();
    this.setState({ classified: null });
  };

  render(): ReactNode {
    const { classified } = this.state;
    const { scope, level } = this.props;
    const retriesRemaining = this.retryBudget.remaining();
    const max = this.props.maxRetries ?? MAX_RETRY_ATTEMPTS;

    return (
      // `display: contents` keeps this wrapper out of layout so adding a
      // boundary never changes grid/flex arrangement of its parent.
      <div
        ref={this.rootRef}
        style={{ display: 'contents' }}
        data-error-boundary={sanitizeScope(scope)}
        onFocusCapture={this.handleFocusCapture}
      >
        {classified
          ? this.props.fallback
            ? this.props.fallback({ classified, retry: this.handleRetry, retriesRemaining })
            : (
              <ErrorFallback
                classified={classified}
                scope={scope}
                level={level}
                onRetry={this.handleRetry}
                retryBudget={{ remaining: retriesRemaining, max }}
                onReload={this.props.onReload}
                showNavigation={this.props.showNavigation}
                headingLevel={this.props.headingLevel}
                preserveNotice={this.props.preserveNotice}
                now={this.props.now}
              />
            )
          : this.props.children}
      </div>
    );
  }
}

export default AppErrorBoundary;
