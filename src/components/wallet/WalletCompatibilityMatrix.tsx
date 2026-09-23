'use client';

/**
 * V2-FE-142 — WalletCompatibilityMatrix
 *
 * Full matrix UI component rendering all connected/available wallet
 * connectors with their per-connector capability and chain compatibility.
 *
 * Accessibility:
 *  - Table layout with proper scope attributes.
 *  - aria-live="polite" region for loading / error state announcements.
 *  - Keyboard-navigable rows.
 *  - No colour-only communication: text labels accompany icons.
 *  - Reduced-motion safe.
 *
 * All states handled:
 *  - loading   — skeleton / spinner while detecting connectors
 *  - empty     — no connectors found
 *  - ready     — full matrix rendered
 *  - error     — detection failed, recoverable via refresh
 */

import React from 'react';
import { WalletCompatibilityBadge } from './WalletCompatibilityBadge';
import type {
  WalletCompatibilityMatrix as MatrixData,
  ConnectorCompatibilityEntry,
} from '@/lib/wallet-compatibility';

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function MatrixLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading wallet compatibility"
      data-testid="wallet-matrix-loading"
      style={{ padding: '1rem' }}
    >
      <span className="sr-only">Loading wallet compatibility information…</span>
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          aria-hidden="true"
          style={{
            height: '2.5rem',
            background: '#e5e7eb',
            borderRadius: '0.375rem',
            marginBottom: '0.5rem',
            animation: 'none', // reduced-motion safe: no pulse
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function MatrixEmptyState() {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="wallet-matrix-empty"
      style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}
    >
      <p style={{ margin: 0 }}>No wallet connectors detected.</p>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
        Install a compatible EVM wallet extension and reload the page.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

interface MatrixErrorStateProps {
  error: Error;
  onRetry: () => void;
}

function MatrixErrorState({ error, onRetry }: MatrixErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="wallet-matrix-error"
      style={{
        padding: '1rem',
        border: '1px solid #fca5a5',
        borderRadius: '0.5rem',
        background: '#fee2e2',
        color: '#991b1b',
      }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>
        Wallet compatibility detection failed
      </p>
      <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.875rem' }}>
        {error.message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding: '0.375rem 0.75rem',
          background: '#991b1b',
          color: '#fff',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        Retry detection
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connector row
// ---------------------------------------------------------------------------

interface ConnectorRowProps {
  entry: ConnectorCompatibilityEntry;
  index: number;
}

function ConnectorRow({ entry, index }: ConnectorRowProps) {
  const chainLabel =
    entry.currentChainId === 10
      ? 'OP Mainnet'
      : entry.currentChainId === 11155420
        ? 'OP Sepolia'
        : entry.currentChainId
          ? `Chain ${entry.currentChainId}`
          : '—';

  const rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';

  return (
    <tr
      style={{ background: rowBg }}
      data-testid={`wallet-matrix-row-${entry.connector.id}`}
    >
      {/* Connector name */}
      <th
        scope="row"
        style={{
          padding: '0.75rem 1rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {entry.connector.icon && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={entry.connector.icon}
              alt=""
              aria-hidden="true"
              width={20}
              height={20}
              style={{ borderRadius: '4px', flexShrink: 0 }}
            />
          )}
          <span>{entry.connector.name || entry.connector.id}</span>
          {entry.isActive && (
            <span
              aria-label="Active"
              style={{
                fontSize: '0.65rem',
                padding: '0.1rem 0.4rem',
                background: '#dbeafe',
                color: '#1e40af',
                borderRadius: '9999px',
              }}
            >
              Active
            </span>
          )}
        </div>
      </th>

      {/* Chain */}
      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151' }}>
        <span
          style={{
            color: entry.isChainSupported ? '#065f46' : entry.currentChainId ? '#92400e' : '#6b7280',
          }}
        >
          {chainLabel}
        </span>
        {entry.currentChainId && !entry.isChainSupported && (
          <span
            className="sr-only"
          >
            — unsupported chain
          </span>
        )}
      </td>

      {/* Sign messages */}
      <td
        style={{ padding: '0.75rem 1rem', textAlign: 'center' }}
        aria-label={`Sign messages: ${entry.capabilities.canSign ? 'yes' : 'no'}`}
      >
        {entry.capabilities.canSign ? (
          <span aria-hidden="true" style={{ color: '#059669' }}>✓</span>
        ) : (
          <span aria-hidden="true" style={{ color: '#9ca3af' }}>–</span>
        )}
      </td>

      {/* Switch chain */}
      <td
        style={{ padding: '0.75rem 1rem', textAlign: 'center' }}
        aria-label={`Switch chain: ${entry.capabilities.canSwitchChain ? 'yes' : 'no'}`}
      >
        {entry.capabilities.canSwitchChain ? (
          <span aria-hidden="true" style={{ color: '#059669' }}>✓</span>
        ) : (
          <span aria-hidden="true" style={{ color: '#9ca3af' }}>–</span>
        )}
      </td>

      {/* EIP-1193 */}
      <td
        style={{ padding: '0.75rem 1rem', textAlign: 'center' }}
        aria-label={`EIP-1193: ${entry.capabilities.isEIP1193 ? 'yes' : 'no'}`}
      >
        {entry.capabilities.isEIP1193 ? (
          <span aria-hidden="true" style={{ color: '#059669' }}>✓</span>
        ) : (
          <span aria-hidden="true" style={{ color: '#9ca3af' }}>–</span>
        )}
      </td>

      {/* Status badge */}
      <td style={{ padding: '0.75rem 1rem' }}>
        <WalletCompatibilityBadge entry={entry} />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// WalletCompatibilityMatrix
// ---------------------------------------------------------------------------

export interface WalletCompatibilityMatrixProps {
  /** The pre-built matrix data (from useWalletCompatibility). */
  matrix: MatrixData;
  /** Called when the user requests a re-detection (error state). */
  onRefresh: () => void;
  /** Optional CSS class for the outer wrapper. */
  className?: string;
}

export function WalletCompatibilityMatrix({
  matrix,
  onRefresh,
  className,
}: WalletCompatibilityMatrixProps) {
  const { uiState } = matrix;

  if (uiState === 'loading') {
    return <MatrixLoadingSkeleton />;
  }

  if (uiState === 'error' && matrix.detectionError) {
    return <MatrixErrorState error={matrix.detectionError} onRetry={onRefresh} />;
  }

  if (uiState === 'empty') {
    return <MatrixEmptyState />;
  }

  // ready state
  return (
    <section
      className={className}
      aria-label="Wallet integration compatibility matrix"
      data-testid="wallet-compatibility-matrix"
    >
      {/* Summary banner */}
      <div
        aria-live="polite"
        style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#374151' }}
      >
        {matrix.activeConnectorCompatible ? (
          <span style={{ color: '#065f46' }}>
            ✓ Active wallet is fully compatible with Optimism.
          </span>
        ) : matrix.connectors.some((c) => c.isActive) ? (
          <span style={{ color: '#92400e' }}>
            ⚠ Active wallet has compatibility issues — see details below.
          </span>
        ) : (
          <span style={{ color: '#6b7280' }}>No wallet connected.</span>
        )}
      </div>

      {/* Matrix table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
          }}
          aria-label="Connector compatibility details"
        >
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th scope="col" style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                Connector
              </th>
              <th scope="col" style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                Chain
              </th>
              <th scope="col" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                Sign
              </th>
              <th scope="col" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                Switch chain
              </th>
              <th scope="col" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                EIP-1193
              </th>
              <th scope="col" style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.connectors.map((entry, i) => (
              <ConnectorRow key={entry.connector.id} entry={entry} index={i} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footnote */}
      <p
        style={{
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: '#9ca3af',
        }}
      >
        Supported networks: OP Mainnet (10), OP Sepolia (11155420).
      </p>
    </section>
  );
}

export default WalletCompatibilityMatrix;
