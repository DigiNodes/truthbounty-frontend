'use client';

import React from 'react';
import {
  Clock,
  CheckCircle2,
  Send,
  ShieldCheck,
  Eye,
  XCircle,
} from 'lucide-react';
import type { AuditLifecycleState } from '@/app/types/admin-audit';

export interface AdminAuditStatusBadgeProps {
  status: AuditLifecycleState;
  className?: string;
}

interface StatusConfig {
  label: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  description: string;
}

const STATUS_CONFIGS: Record<AuditLifecycleState, StatusConfig> = {
  requested: {
    label: 'Requested',
    badgeClass: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    icon: Clock,
    description: 'Operation requested by administrator; pending formal authorization.',
  },
  authorized: {
    label: 'Authorized',
    badgeClass: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400',
    icon: CheckCircle2,
    description: 'Cryptographic permission verified against contract roles or multisig quorum.',
  },
  submitted: {
    label: 'Submitted',
    badgeClass: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    icon: Send,
    description: 'Transaction or supervisor job submitted to sequencer pipeline.',
  },
  confirmed: {
    label: 'Confirmed',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    icon: ShieldCheck,
    description: 'On-chain execution receipt confirmed and validated on canonical EVM.',
  },
  projected: {
    label: 'Projected',
    badgeClass: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
    icon: Eye,
    description: 'Indexed read projection updated; no direct on-chain state mutation.',
  },
  failed: {
    label: 'Failed',
    badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive',
    icon: XCircle,
    description: 'Operation failed closed without side effects.',
  },
};

export function AdminAuditStatusBadge({ status, className = '' }: AdminAuditStatusBadgeProps) {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.projected;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.badgeClass} ${className}`}
      title={config.description}
      data-testid={`audit-status-badge-${status}`}
      role="status"
      aria-label={`Audit status: ${config.label}. ${config.description}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden={true} />
      <span>{config.label}</span>
    </span>
  );
}
