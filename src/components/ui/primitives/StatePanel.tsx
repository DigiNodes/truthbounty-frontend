'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Ban,
  Clock3,
  Inbox,
  LockKeyhole,
  RefreshCw,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from './Card';

export type StatePanelKind =
  | 'loading'
  | 'empty'
  | 'error'
  | 'stale'
  | 'disabled'
  | 'unavailable'
  | 'denied';

interface StatePanelStyle {
  Icon: LucideIcon;
  iconClassName: string;
  role: 'status' | 'alert';
}

const STATE_STYLES: Record<StatePanelKind, StatePanelStyle> = {
  loading: { Icon: Clock3, iconClassName: 'text-info', role: 'status' },
  empty: { Icon: Inbox, iconClassName: 'text-ink-muted', role: 'status' },
  error: { Icon: AlertTriangle, iconClassName: 'text-danger', role: 'alert' },
  stale: { Icon: RefreshCw, iconClassName: 'text-warning', role: 'status' },
  disabled: { Icon: Ban, iconClassName: 'text-ink-muted', role: 'status' },
  unavailable: { Icon: WifiOff, iconClassName: 'text-warning', role: 'alert' },
  denied: { Icon: LockKeyhole, iconClassName: 'text-danger', role: 'alert' },
};

export interface StatePanelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  kind: StatePanelKind;
  title: React.ReactNode;
  description: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  icon?: LucideIcon;
}

/**
 * Gate C state boundary for loading, empty, error, stale, disabled,
 * unavailable and denied states. It renders supplied truth only and never
 * infers capability, finality, settlement or transaction success.
 */
export function StatePanel({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled = false,
  icon,
  className,
  ...rest
}: StatePanelProps) {
  const style = STATE_STYLES[kind];
  const Icon = icon ?? style.Icon;
  const isBusy = kind === 'loading';

  return (
    <Card
      data-slot="state-panel"
      data-state={kind}
      role={style.role}
      aria-live={style.role === 'alert' ? 'assertive' : 'polite'}
      aria-busy={isBusy || undefined}
      className={cn('p-6', className)}
      {...rest}
    >
      <div className="flex max-w-2xl items-start gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full bg-canvas',
            style.iconClassName,
          )}
        >
          <Icon className={cn('size-5', isBusy && 'animate-spin')} />
        </span>
        <div className="min-w-0 space-y-2">
          <h2 className="tb-section text-ink">{title}</h2>
          <div className="tb-body text-ink-secondary">{description}</div>
          {actionLabel && onAction ? (
            <Button
              type="button"
              variant="outline"
              onClick={onAction}
              disabled={actionDisabled || isBusy}
              className="mt-2"
            >
              {actionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export default StatePanel;
