'use client';

/**
 * V2-FE-142 — WalletCompatibilityBadge
 *
 * Accessible per-connector capability badge.  Shows a visual indicator of
 * whether a connector is fully compatible, degraded, or incompatible for the
 * current Optimism/EVM context.
 *
 * Accessibility:
 *  - Uses role="status" for the badge container.
 *  - aria-label encodes both the connector name and compatibility verdict.
 *  - No colour-only communication: icons + text labels convey state.
 *  - Reduced-motion safe: no CSS transitions that could cause vestibular harm.
 */

import React from 'react';
import type { ConnectorCompatibilityEntry, ConnectorFailureMode } from '@/lib/wallet-compatibility';

// ---------------------------------------------------------------------------
// Badge variant derives from failure mode
// ---------------------------------------------------------------------------

type BadgeVariant = 'compatible' | 'degraded' | 'incompatible' | 'disconnected';

function variantFromFailureMode(
  mode: ConnectorFailureMode,
  isActive: boolean,
): BadgeVariant {
  if (mode === 'none' && isActive) return 'compatible';
  if (mode === 'disconnected' || !isActive) return 'disconnected';
  if (mode === 'unsupported_chain' || mode === 'missing_capability') return 'degraded';
  return 'incompatible';
}

const VARIANT_LABELS: Record<BadgeVariant, string> = {
  compatible: 'Compatible',
  degraded: 'Degraded',
  incompatible: 'Incompatible',
  disconnected: 'Not connected',
};

const VARIANT_ICONS: Record<BadgeVariant, string> = {
  compatible: '✓',
  degraded: '⚠',
  incompatible: '✗',
  disconnected: '○',
};

const VARIANT_COLORS: Record<BadgeVariant, React.CSSProperties> = {
  compatible: {
    backgroundColor: '#d1fae5',   // green-100
    color: '#065f46',             // green-800
    borderColor: '#a7f3d0',       // green-200
  },
  degraded: {
    backgroundColor: '#fef3c7',   // yellow-100
    color: '#92400e',             // yellow-800
    borderColor: '#fde68a',       // yellow-200
  },
  incompatible: {
    backgroundColor: '#fee2e2',   // red-100
    color: '#991b1b',             // red-800
    borderColor: '#fca5a5',       // red-200
  },
  disconnected: {
    backgroundColor: '#f3f4f6',   // gray-100
    color: '#374151',             // gray-700
    borderColor: '#d1d5db',       // gray-300
  },
};

// ---------------------------------------------------------------------------
// Capability detail row
// ---------------------------------------------------------------------------

interface CapabilityRowProps {
  label: string;
  supported: boolean;
}

function CapabilityRow({ label, supported }: CapabilityRowProps) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        fontSize: '0.75rem',
        color: supported ? '#065f46' : '#6b7280',
      }}
    >
      <span aria-hidden="true" style={{ fontWeight: 700 }}>
        {supported ? '✓' : '–'}
      </span>
      <span>{label}</span>
      <span className="sr-only">{supported ? 'supported' : 'not supported'}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// WalletCompatibilityBadge
// ---------------------------------------------------------------------------

export interface WalletCompatibilityBadgeProps {
  /** The connector entry to render. */
  entry: ConnectorCompatibilityEntry;
  /**
   * Whether to show the capability detail list below the badge.
   * Defaults to false (badge-only view).
   */
  showCapabilities?: boolean;
  /** Additional CSS class for the outer wrapper. */
  className?: string;
}

export function WalletCompatibilityBadge({
  entry,
  showCapabilities = false,
  className,
}: WalletCompatibilityBadgeProps) {
  const variant = variantFromFailureMode(entry.failureMode, entry.isActive);
  const label = VARIANT_LABELS[variant];
  const icon = VARIANT_ICONS[variant];
  const colorStyle = VARIANT_COLORS[variant];

  const connectorDisplayName = entry.connector.name || entry.connector.id;

  const ariaLabel = [
    connectorDisplayName,
    label,
    entry.currentChainId
      ? `chain ${entry.currentChainId}`
      : 'no chain',
  ].join(' — ');

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.5rem' }}
    >
      {/* Main badge */}
      <span
        role="status"
        aria-label={ariaLabel}
        data-testid="wallet-compatibility-badge"
        data-connector-id={entry.connector.id}
        data-variant={variant}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          padding: '0.2rem 0.55rem',
          borderRadius: '9999px',
          border: '1px solid',
          fontSize: '0.75rem',
          fontWeight: 600,
          lineHeight: 1.5,
          ...colorStyle,
        }}
      >
        <span aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </span>

      {/* Optional capability detail list */}
      {showCapabilities && (
        <ul
          aria-label={`${connectorDisplayName} capabilities`}
          style={{ listStyle: 'none', padding: 0, margin: 0 }}
        >
          <CapabilityRow label="Switch chain" supported={entry.capabilities.canSwitchChain} />
          <CapabilityRow label="Add chain" supported={entry.capabilities.canAddChain} />
          <CapabilityRow label="Sign message" supported={entry.capabilities.canSign} />
          <CapabilityRow label="Sign typed data" supported={entry.capabilities.canSignTypedData} />
          <CapabilityRow label="Watch asset" supported={entry.capabilities.canWatchAsset} />
          <CapabilityRow label="EIP-1193" supported={entry.capabilities.isEIP1193} />
          <CapabilityRow label="EIP-6963" supported={entry.capabilities.isEIP6963} />
        </ul>
      )}
    </div>
  );
}

export default WalletCompatibilityBadge;
