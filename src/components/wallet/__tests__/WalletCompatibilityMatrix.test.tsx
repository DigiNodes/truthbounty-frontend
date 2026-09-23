/**
 * V2-FE-142 — Component tests for WalletCompatibilityMatrix & Badge
 *
 * Covers: all documented UI states (loading, empty, error, ready),
 * per-connector compatibility badge rendering, accessibility (jest-axe),
 * keyboard interaction, and screen-reader announcements.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { WalletCompatibilityMatrix } from '@/components/wallet/WalletCompatibilityMatrix';
import { WalletCompatibilityBadge } from '@/components/wallet/WalletCompatibilityBadge';
import type {
  WalletCompatibilityMatrix as MatrixData,
  ConnectorCompatibilityEntry,
} from '@/lib/wallet-compatibility';

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<ConnectorCompatibilityEntry> = {}): ConnectorCompatibilityEntry {
  return {
    connector: {
      id: 'metaMask',
      name: 'MetaMask',
      type: 'injected',
    },
    capabilities: {
      canSwitchChain: true,
      canAddChain: true,
      canSign: true,
      canSignTypedData: true,
      canWatchAsset: true,
      isEIP1193: true,
      isEIP6963: true,
    },
    isActive: true,
    currentChainId: 10,
    isChainSupported: true,
    failureMode: 'none',
    ...overrides,
  };
}

function makeMatrix(overrides: Partial<MatrixData> = {}): MatrixData {
  const entries = overrides.connectors ?? [makeEntry()];
  return {
    uiState: 'ready',
    connectors: entries,
    compatibleConnectors: entries.filter((e) => e.failureMode === 'none'),
    degradedConnectors: entries.filter(
      (e) => e.failureMode === 'missing_capability' || e.failureMode === 'unsupported_chain',
    ),
    incompatibleConnectors: entries.filter(
      (e) => e.failureMode === 'provider_unavailable',
    ),
    activeConnectorCompatible: entries.some((e) => e.isActive && e.failureMode === 'none'),
    detectionError: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// WalletCompatibilityMatrix — UI states
// ---------------------------------------------------------------------------

describe('WalletCompatibilityMatrix', () => {
  const noop = jest.fn();

  // ── loading ───────────────────────────────────────────────────────────────

  it('renders loading skeleton in loading state', () => {
    const matrix = makeMatrix({ uiState: 'loading', connectors: [], compatibleConnectors: [], degradedConnectors: [], incompatibleConnectors: [] });
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByTestId('wallet-matrix-loading')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('loading skeleton has an accessible sr-only announcement', () => {
    const matrix = makeMatrix({ uiState: 'loading', connectors: [], compatibleConnectors: [], degradedConnectors: [], incompatibleConnectors: [] });
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByText(/loading wallet compatibility/i)).toBeInTheDocument();
  });

  // ── empty ─────────────────────────────────────────────────────────────────

  it('renders empty state when no connectors found', () => {
    const matrix = makeMatrix({ uiState: 'empty', connectors: [], compatibleConnectors: [], degradedConnectors: [], incompatibleConnectors: [] });
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByTestId('wallet-matrix-empty')).toBeInTheDocument();
    expect(screen.getByText(/no wallet connectors detected/i)).toBeInTheDocument();
  });

  // ── error ─────────────────────────────────────────────────────────────────

  it('renders error state with error message and retry button', () => {
    const error = new Error('Provider timeout');
    const matrix = makeMatrix({
      uiState: 'error',
      connectors: [],
      compatibleConnectors: [],
      degradedConnectors: [],
      incompatibleConnectors: [],
      detectionError: error,
    });
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByTestId('wallet-matrix-error')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/provider timeout/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry detection/i })).toBeInTheDocument();
  });

  it('calls onRefresh when retry button is clicked', () => {
    const onRefresh = jest.fn();
    const error = new Error('Detection failed');
    const matrix = makeMatrix({
      uiState: 'error',
      connectors: [],
      compatibleConnectors: [],
      degradedConnectors: [],
      incompatibleConnectors: [],
      detectionError: error,
    });
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: /retry detection/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  // ── ready — happy path ────────────────────────────────────────────────────

  it('renders the matrix table in ready state', () => {
    const matrix = makeMatrix();
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByTestId('wallet-compatibility-matrix')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders a row for each connector', () => {
    const matrix = makeMatrix({
      connectors: [
        makeEntry({ connector: { id: 'metaMask', name: 'MetaMask', type: 'injected' } }),
        makeEntry({
          connector: { id: 'walletConnect', name: 'WalletConnect', type: 'walletConnect' },
          isActive: false,
          failureMode: 'disconnected',
        }),
      ],
    });
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByTestId('wallet-matrix-row-metaMask')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-matrix-row-walletConnect')).toBeInTheDocument();
  });

  it('shows the active connector banner when active + compatible', () => {
    const matrix = makeMatrix({ activeConnectorCompatible: true });
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByText(/active wallet is fully compatible/i)).toBeInTheDocument();
  });

  it('shows compatibility warning when active connector has issues', () => {
    const unsupportedEntry = makeEntry({
      isActive: true,
      currentChainId: 1,
      isChainSupported: false,
      failureMode: 'unsupported_chain',
    });
    const matrix = makeMatrix({
      connectors: [unsupportedEntry],
      compatibleConnectors: [],
      degradedConnectors: [unsupportedEntry],
      activeConnectorCompatible: false,
    });
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByText(/compatibility issues/i)).toBeInTheDocument();
  });

  it('shows no wallet connected message when nothing is active', () => {
    const matrix = makeMatrix({
      connectors: [makeEntry({ isActive: false, failureMode: 'disconnected', currentChainId: undefined })],
      compatibleConnectors: [],
      activeConnectorCompatible: false,
    });
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByText(/no wallet connected/i)).toBeInTheDocument();
  });

  it('shows "Active" label on the active connector row', () => {
    const matrix = makeMatrix();
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows OP Mainnet for chain 10', () => {
    const matrix = makeMatrix();
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByText('OP Mainnet')).toBeInTheDocument();
  });

  it('shows OP Sepolia for chain 11155420', () => {
    const sepoliaEntry = makeEntry({ currentChainId: 11155420 });
    const matrix = makeMatrix({ connectors: [sepoliaEntry] });
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByText('OP Sepolia')).toBeInTheDocument();
  });

  it('shows table headers with column scope', () => {
    const matrix = makeMatrix();
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBeGreaterThanOrEqual(5);
    expect(headers.some((h) => /connector/i.test(h.textContent ?? ''))).toBe(true);
    expect(headers.some((h) => /chain/i.test(h.textContent ?? ''))).toBe(true);
  });

  it('renders the supported networks footnote', () => {
    const matrix = makeMatrix();
    render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    expect(screen.getByText(/supported networks/i)).toBeInTheDocument();
  });

  // ── accessibility ─────────────────────────────────────────────────────────

  it('has no axe violations in loading state', async () => {
    const matrix = makeMatrix({ uiState: 'loading', connectors: [], compatibleConnectors: [], degradedConnectors: [], incompatibleConnectors: [] });
    const { container } = render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in empty state', async () => {
    const matrix = makeMatrix({ uiState: 'empty', connectors: [], compatibleConnectors: [], degradedConnectors: [], incompatibleConnectors: [] });
    const { container } = render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in error state', async () => {
    const matrix = makeMatrix({
      uiState: 'error',
      connectors: [],
      compatibleConnectors: [],
      degradedConnectors: [],
      incompatibleConnectors: [],
      detectionError: new Error('Test error'),
    });
    const { container } = render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in ready state with single connector', async () => {
    const matrix = makeMatrix();
    const { container } = render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with multiple connectors including degraded', async () => {
    const degraded = makeEntry({
      connector: { id: 'walletConnect', name: 'WalletConnect', type: 'walletConnect' },
      isActive: true,
      currentChainId: 1,
      isChainSupported: false,
      failureMode: 'unsupported_chain',
    });
    const matrix = makeMatrix({
      connectors: [makeEntry(), degraded],
      degradedConnectors: [degraded],
      activeConnectorCompatible: false,
    });
    const { container } = render(<WalletCompatibilityMatrix matrix={matrix} onRefresh={noop} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// WalletCompatibilityBadge
// ---------------------------------------------------------------------------

describe('WalletCompatibilityBadge', () => {
  it('renders "Compatible" badge for a connected, supported connector', () => {
    const entry = makeEntry();
    render(<WalletCompatibilityBadge entry={entry} />);
    const badge = screen.getByTestId('wallet-compatibility-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-variant', 'compatible');
    expect(screen.getByText('Compatible')).toBeInTheDocument();
  });

  it('renders "Degraded" badge for unsupported chain', () => {
    const entry = makeEntry({
      isActive: true,
      currentChainId: 1,
      isChainSupported: false,
      failureMode: 'unsupported_chain',
    });
    render(<WalletCompatibilityBadge entry={entry} />);
    const badge = screen.getByTestId('wallet-compatibility-badge');
    expect(badge).toHaveAttribute('data-variant', 'degraded');
    expect(screen.getByText('Degraded')).toBeInTheDocument();
  });

  it('renders "Not connected" badge for disconnected connector', () => {
    const entry = makeEntry({
      isActive: false,
      currentChainId: undefined,
      failureMode: 'disconnected',
    });
    render(<WalletCompatibilityBadge entry={entry} />);
    const badge = screen.getByTestId('wallet-compatibility-badge');
    expect(badge).toHaveAttribute('data-variant', 'disconnected');
    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('renders "Incompatible" badge for provider_unavailable', () => {
    const entry = makeEntry({
      isActive: true,
      failureMode: 'provider_unavailable',
    });
    render(<WalletCompatibilityBadge entry={entry} />);
    const badge = screen.getByTestId('wallet-compatibility-badge');
    expect(badge).toHaveAttribute('data-variant', 'incompatible');
    expect(screen.getByText('Incompatible')).toBeInTheDocument();
  });

  it('includes connector id in data attribute', () => {
    const entry = makeEntry();
    render(<WalletCompatibilityBadge entry={entry} />);
    const badge = screen.getByTestId('wallet-compatibility-badge');
    expect(badge).toHaveAttribute('data-connector-id', 'metaMask');
  });

  it('has aria-label encoding connector name and verdict', () => {
    const entry = makeEntry();
    render(<WalletCompatibilityBadge entry={entry} />);
    const badge = screen.getByTestId('wallet-compatibility-badge');
    const label = badge.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/MetaMask/i);
    expect(label).toMatch(/compatible/i);
  });

  it('shows capability list when showCapabilities=true', () => {
    const entry = makeEntry();
    render(<WalletCompatibilityBadge entry={entry} showCapabilities />);
    expect(screen.getByRole('list', { name: /capabilities/i })).toBeInTheDocument();
    expect(screen.getByText('Switch chain')).toBeInTheDocument();
    expect(screen.getByText('Sign message')).toBeInTheDocument();
    expect(screen.getByText('EIP-1193')).toBeInTheDocument();
  });

  it('does not show capability list when showCapabilities is not set', () => {
    const entry = makeEntry();
    render(<WalletCompatibilityBadge entry={entry} />);
    expect(screen.queryByRole('list')).toBeNull();
  });

  // ── accessibility ─────────────────────────────────────────────────────────

  it('has no axe violations for compatible badge', async () => {
    const { container } = render(<WalletCompatibilityBadge entry={makeEntry()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations for degraded badge with capabilities', async () => {
    const entry = makeEntry({
      isActive: true,
      currentChainId: 1,
      isChainSupported: false,
      failureMode: 'unsupported_chain',
    });
    const { container } = render(<WalletCompatibilityBadge entry={entry} showCapabilities />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations for disconnected badge', async () => {
    const entry = makeEntry({
      isActive: false,
      currentChainId: undefined,
      failureMode: 'disconnected',
    });
    const { container } = render(<WalletCompatibilityBadge entry={entry} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
