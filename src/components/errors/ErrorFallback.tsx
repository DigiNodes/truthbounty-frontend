'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MdBugReport, MdCloudOff, MdErrorOutline, MdLock } from 'react-icons/md';
import type { ClassifiedError, ErrorKind } from '@/lib/errors/classification';
import { MAX_RELOAD_ATTEMPTS, RecoveryBudget } from '@/lib/errors/recovery-budget';
import { buildSupportReport, reportIncident, sanitizeScope, type BoundaryLevel } from '@/lib/errors/support-report';
import { getErrorCopy } from './error-copy';
import { RecoveryNavigation } from './RecoveryNavigation';

/**
 * Shared fallback UI for route, composition and widget error boundaries.
 * UI-FE-053 (#626)
 *
 * Accessibility (WCAG 2.2 AA):
 *  - The container is a live alert region; heading is programmatically
 *    focusable (tabIndex -1) and receives focus only when focus would
 *    otherwise be lost (activeElement is <body> or inside the failed area),
 *    so a background failure never steals focus from a field being edited.
 *  - All actions are native buttons/links with visible focus rings and a
 *    minimum 24x24 CSS px target (2.5.8). Kind is conveyed by text + icon,
 *    never colour alone (1.4.1).
 *  - Copy/report outcomes are announced through a persistent polite status region (4.1.3).
 *
 * Safety:
 *  - Renders only static copy + the sanitized correlation reference. The error
 *    message, stack and any server text are never displayed.
 *  - Denied authority offers no retry/reload/report: those would imply a fault.
 *  - Never touches pending-transaction recovery state.
 */

export interface RetryBudgetView {
  remaining: number;
  max: number;
}

export interface ErrorFallbackProps {
  classified: ClassifiedError;
  scope: string;
  level: BoundaryLevel;
  /** In-place retry (boundary reset). Omit to hide the action. */
  onRetry?: () => void;
  retryBudget?: RetryBudgetView;
  /** Override for tests; defaults to `window.location.reload()`. */
  onReload?: () => void;
  /** "Go back" action (route level). Defaults to `history.back()`. */
  onGoBack?: () => void;
  /** Render static recovery navigation (route boundaries that replace the shell). */
  showNavigation?: boolean;
  headingLevel?: 1 | 2 | 3;
  /** Show the pending-transactions-preserved notice for retryable kinds. */
  preserveNotice?: boolean;
  /** Injected for deterministic report output in tests. */
  now?: () => Date;
}

const ICONS: Record<ErrorKind, typeof MdErrorOutline> = {
  user: MdErrorOutline,
  dependency: MdCloudOff,
  denied: MdLock,
  defect: MdBugReport,
};

const KIND_TEXT_CLASS: Record<ErrorKind, string> = {
  user: 'text-warning',
  dependency: 'text-warning',
  denied: 'text-muted-foreground',
  defect: 'text-destructive',
};

const BUTTON_PRIMARY =
  'inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const BUTTON_SECONDARY =
  'inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const CONTAINER_CLASS: Record<BoundaryLevel, string> = {
  route: 'flex min-h-[50vh] items-center justify-center px-4 py-12',
  composition: 'w-full py-4',
  widget: 'w-full py-1',
};

const CARD_CLASS: Record<BoundaryLevel, string> = {
  route: 'w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-center text-card-foreground shadow-sm',
  composition: 'w-full rounded-xl border border-border bg-card p-5 text-card-foreground',
  widget: 'w-full rounded-lg border border-border bg-card p-3 text-sm text-card-foreground',
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ErrorFallback({
  classified,
  scope,
  level,
  onRetry,
  retryBudget,
  onReload,
  onGoBack,
  showNavigation = false,
  headingLevel,
  preserveNotice = true,
  now,
}: ErrorFallbackProps): ReactNode {
  const safeScope = sanitizeScope(scope);
  const copy = getErrorCopy(classified);
  const Icon = ICONS[classified.kind];
  const denied = classified.kind === 'denied';
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const reloadBudget = useMemo(
    () => new RecoveryBudget({ max: MAX_RELOAD_ATTEMPTS, persistScope: `${safeScope}:${level}:reload` }),
    [safeScope, level],
  );

  // Move focus to the heading only when focus would otherwise be lost.
  useEffect(() => {
    const heading = headingRef.current;
    if (!heading || typeof document === 'undefined') return;
    const active = document.activeElement;
    const focusLost = !active || active === document.body || !!rootRef.current?.contains(active);
    if (focusLost) heading.focus();
  }, []);

  const retryExhausted = !!retryBudget && retryBudget.remaining <= 0;
  const canRetry = !denied && classified.retryable && !!onRetry && !retryExhausted;
  // `reloadTick` forces re-evaluation after a click spends budget.
  void reloadTick;
  const canReload = !denied && classified.reloadable && reloadBudget.canAttempt();
  const reloadExhausted = !denied && classified.reloadable && !reloadBudget.canAttempt();
  const canReport = classified.kind === 'dependency' || classified.kind === 'defect';
  const showGoBack = level === 'route';

  const Heading = `h${headingLevel ?? (level === 'route' ? 1 : level === 'composition' ? 2 : 3)}` as
    | 'h1'
    | 'h2'
    | 'h3';

  const handleReload = () => {
    if (!reloadBudget.record()) {
      setReloadTick((n) => n + 1);
      return;
    }
    setReloadTick((n) => n + 1);
    (onReload ?? (() => window.location.reload()))();
  };

  const handleReport = async () => {
    const input = { classified, scope: safeScope, level, now };
    const text = buildSupportReport(input);
    reportIncident(input);
    const copied = await copyText(text);
    setStatus(
      copied
        ? `Report details copied. Share reference ${classified.correlationRef} with support.`
        : `Couldn’t copy automatically. Share reference ${classified.correlationRef} with support.`,
    );
  };

  const handleGoBack = onGoBack ?? (() => window.history.back());

  return (
    <div className={CONTAINER_CLASS[level]}>
      <div
        ref={rootRef}
        role="alert"
        aria-live={denied ? 'polite' : 'assertive'}
        aria-atomic="true"
        data-testid="error-fallback"
        data-error-kind={classified.kind}
        data-error-code={classified.code}
        data-boundary-level={level}
        data-boundary-scope={safeScope}
        className={CARD_CLASS[level]}
      >
        <div className={level === 'widget' ? 'flex items-start gap-2 text-left' : 'flex flex-col items-center gap-3'}>
          <Icon aria-hidden="true" className={`${KIND_TEXT_CLASS[classified.kind]} ${level === 'widget' ? 'mt-0.5 h-5 w-5 shrink-0' : 'h-9 w-9'}`} />
          <div className={level === 'widget' ? 'min-w-0 flex-1' : ''}>
            <Heading
              ref={headingRef}
              tabIndex={-1}
              className={`${level === 'route' ? 'text-xl' : level === 'composition' ? 'text-lg' : 'text-sm'} font-semibold tracking-tight text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              {copy.title}
            </Heading>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.description}</p>

            {!denied && preserveNotice && level !== 'widget' ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Your pending transactions are preserved. Retry is safe and will not submit a duplicate transaction.
              </p>
            ) : null}

            {retryBudget && canRetry ? (
              <p className="mt-1 text-xs text-muted-foreground" data-testid="retry-budget">
                {retryBudget.remaining} of {retryBudget.max} retries left
              </p>
            ) : null}
            {retryExhausted ? (
              <p className="mt-2 text-sm text-foreground" data-testid="retry-exhausted">
                Retry limit reached. {classified.reloadable ? 'Reload the page or ' : ''}
                {level === 'route' ? 'choose another page below.' : 'continue using the rest of the page.'}
              </p>
            ) : null}
            {reloadExhausted ? (
              <p className="mt-2 text-sm text-foreground" data-testid="reload-exhausted">
                Reload limit reached for now. Please choose another page.
              </p>
            ) : null}

            <p className="mt-2 text-xs text-muted-foreground">
              Reference:{' '}
              <code className="select-all rounded bg-accent px-1.5 py-0.5 font-mono text-foreground" data-testid="correlation-ref">
                {classified.correlationRef}
              </code>
            </p>
          </div>
        </div>

        <div className={`mt-4 flex flex-wrap gap-2 ${level === 'widget' ? 'justify-start' : 'justify-center'}`}>
          {canRetry ? (
            <button type="button" onClick={onRetry} className={BUTTON_PRIMARY}>
              Try again
            </button>
          ) : null}
          {canReload ? (
            <button type="button" onClick={handleReload} className={canRetry ? BUTTON_SECONDARY : BUTTON_PRIMARY}>
              Reload page
            </button>
          ) : null}
          {canReport ? (
            <button type="button" onClick={handleReport} className={BUTTON_SECONDARY}>
              Copy error report
            </button>
          ) : null}
          {showGoBack ? (
            <button type="button" onClick={handleGoBack} className={BUTTON_SECONDARY}>
              Go back
            </button>
          ) : null}
        </div>

        {showNavigation ? <RecoveryNavigation className="mt-4 border-t border-border pt-3" /> : null}
      </div>
      {/* Sibling (not nested) live region so report outcomes are announced once. */}
      <p role="status" aria-live="polite" className="sr-only" data-testid="error-status">
        {status}
      </p>
    </div>
  );
}
