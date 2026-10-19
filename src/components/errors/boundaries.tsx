'use client';

import { AppErrorBoundary, type AppErrorBoundaryProps } from './AppErrorBoundary';

type LevelProps = Omit<AppErrorBoundaryProps, 'level'>;

/**
 * Route boundary — wraps the content area of a route. Fallback is a full
 * section card. Use `showNavigation` when the boundary sits where it would
 * replace the app shell, so recovery navigation is still available.
 */
export function RouteErrorBoundary(props: LevelProps) {
  return <AppErrorBoundary headingLevel={1} {...props} level="route" />;
}

/**
 * Composition boundary — wraps one approved screen composition (a board, a
 * panel group). A failure replaces only that composition.
 */
export function CompositionErrorBoundary(props: LevelProps) {
  return <AppErrorBoundary headingLevel={2} {...props} level="composition" />;
}

/**
 * Widget boundary — wraps a single widget (card, chart, table). The fallback
 * is compact and inline.
 */
export function WidgetErrorBoundary(props: LevelProps) {
  return <AppErrorBoundary headingLevel={3} {...props} level="widget" />;
}
