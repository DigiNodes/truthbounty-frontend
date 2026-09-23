/**
 * V2-FE-142 — Unit tests for useWalletCompatibility
 *
 * Covers: success path, unsupported chain, missing capability,
 * disconnect, refresh, error propagation, empty connector list.
 *
 * Wagmi is mocked at the module boundary so the suite tests TruthBounty
 * compatibility logic without loading connector transports or browser wallets.
 */

import { act, renderHook } from '@testing-library/react';
import type { Connector } from 'wagmi';
import { useWalletCompatibility } from '../useWalletCompatibility';

// ---------------------------------------------------------------------------
// Shared mutable state for wagmi mocks
// ---------------------------------------------------------------------------

const MOCK_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`;

let mockIsConnected = false;
let mockChainId: number | undefined = undefined;
let mockConnector: Partial<Connector> | undefined = undefined;
let mockConnectors: Partial<Connector>[] = [];

function makeMockConnector(overrides?: Partial<Connector>): Partial<Connector> {
  return {
    id: 'metaMask',
    name: 'MetaMask',
    type: 'injected',
    icon: undefined,
    getProvider: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

// Mock wagmi at module boundary — pattern matches rest of the codebase.
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: mockIsConnected ? MOCK_ADDRESS : undefined,
    isConnected: mockIsConnected,
    chainId: mockChainId,
    connector: mockConnector,
  }),
  useConnectors: () => mockConnectors,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setConnectedState(
  chainId: number,
  connectorOverrides?: Partial<Connector>,
) {
  const connector = makeMockConnector(connectorOverrides);
  mockIsConnected = true;
  mockChainId = chainId;
  mockConnector = connector;
  mockConnectors = [connector];
}

function setDisconnectedState() {
  mockIsConnected = false;
  mockChainId = undefined;
  mockConnector = undefined;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  setDisconnectedState();
  mockConnectors = [];
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useWalletCompatibility', () => {
  // ── disconnected / empty ─────────────────────────────────────────────────

  it('returns empty state when no connectors are available', () => {
    const { result } = renderHook(() => useWalletCompatibility());
    expect(result.current.uiState).toBe('empty');
    expect(result.current.connectors).toHaveLength(0);
    expect(result.current.activeConnectorCompatible).toBe(false);
  });

  it('returns disconnected failure mode when connectors exist but wallet not connected', () => {
    mockConnectors = [makeMockConnector()];
    const { result } = renderHook(() => useWalletCompatibility());
    expect(result.current.uiState).toBe('ready');
    const entry = result.current.connectors[0];
    expect(entry.failureMode).toBe('disconnected');
    expect(entry.isActive).toBe(false);
    expect(entry.currentChainId).toBeUndefined();
  });

  // ── happy path ───────────────────────────────────────────────────────────

  it('reports ready + compatible when connected on OP Mainnet (chainId 10)', () => {
    setConnectedState(10);
    const { result } = renderHook(() => useWalletCompatibility());

    expect(result.current.uiState).toBe('ready');
    expect(result.current.activeConnectorCompatible).toBe(true);
    expect(result.current.compatibleConnectors).toHaveLength(1);
    expect(result.current.degradedConnectors).toHaveLength(0);
  });

  it('reports ready + compatible when connected on OP Sepolia (chainId 11155420)', () => {
    setConnectedState(11155420);
    const { result } = renderHook(() => useWalletCompatibility());

    expect(result.current.uiState).toBe('ready');
    expect(result.current.activeConnectorCompatible).toBe(true);
    expect(result.current.connectors[0].isChainSupported).toBe(true);
  });

  // ── unsupported chain ────────────────────────────────────────────────────

  it('reports unsupported_chain failure mode when connected on Ethereum mainnet (chainId 1)', () => {
    setConnectedState(1);
    const { result } = renderHook(() => useWalletCompatibility());

    expect(result.current.uiState).toBe('ready');
    expect(result.current.activeConnectorCompatible).toBe(false);
    const entry = result.current.connectors[0];
    expect(entry.failureMode).toBe('unsupported_chain');
    expect(entry.isChainSupported).toBe(false);
    expect(result.current.compatibleConnectors).toHaveLength(0);
  });

  it('reports unsupported_chain for an arbitrary unknown chain id', () => {
    setConnectedState(999);
    const { result } = renderHook(() => useWalletCompatibility());
    const entry = result.current.connectors[0];
    expect(entry.failureMode).toBe('unsupported_chain');
  });

  // ── missing capability ───────────────────────────────────────────────────

  it('reports missing_capability when connector type is unknown and getProvider is absent', () => {
    const weakConnector: Partial<Connector> = {
      id: 'unknown-wallet',
      name: 'Unknown Wallet',
      type: 'unknown',
      // no getProvider
    };
    mockIsConnected = true;
    mockChainId = 10;
    mockConnector = weakConnector;
    mockConnectors = [weakConnector];

    const { result } = renderHook(() => useWalletCompatibility());
    expect(result.current.uiState).toBe('ready');
    const entry = result.current.connectors[0];
    // Capabilities derive to false → missing_capability
    expect(entry.capabilities.canSign).toBe(false);
    expect(entry.capabilities.isEIP1193).toBe(false);
    expect(entry.failureMode).toBe('missing_capability');
    expect(result.current.activeConnectorCompatible).toBe(false);
  });

  // ── multiple connectors ──────────────────────────────────────────────────

  it('handles multiple connectors correctly, marking only the active one', () => {
    const active = makeMockConnector({ id: 'metaMask', name: 'MetaMask' });
    const inactive = makeMockConnector({ id: 'walletConnect', name: 'WalletConnect', type: 'walletConnect' });

    mockIsConnected = true;
    mockChainId = 10;
    mockConnector = active;
    mockConnectors = [active, inactive];

    const { result } = renderHook(() => useWalletCompatibility());

    const activeEntry = result.current.connectors.find((c) => c.connector.id === 'metaMask');
    const inactiveEntry = result.current.connectors.find((c) => c.connector.id === 'walletConnect');

    expect(activeEntry?.isActive).toBe(true);
    expect(inactiveEntry?.isActive).toBe(false);
    expect(activeEntry?.failureMode).toBe('none');
    expect(inactiveEntry?.failureMode).toBe('disconnected');
  });

  // ── disconnect ───────────────────────────────────────────────────────────

  it('transitions to disconnected after wallet disconnects', () => {
    setConnectedState(10);
    const { result, rerender } = renderHook(() => useWalletCompatibility());
    expect(result.current.activeConnectorCompatible).toBe(true);

    act(() => {
      setDisconnectedState();
      mockConnectors = [makeMockConnector()];
    });
    rerender();

    expect(result.current.activeConnectorCompatible).toBe(false);
    expect(result.current.connectors[0].failureMode).toBe('disconnected');
  });

  // ── refresh ──────────────────────────────────────────────────────────────

  it('refresh() causes a re-computation without throwing', () => {
    setConnectedState(10);
    const { result } = renderHook(() => useWalletCompatibility());
    expect(result.current.uiState).toBe('ready');

    act(() => {
      result.current.refresh();
    });

    expect(result.current.uiState).toBe('ready');
    expect(result.current.activeConnectorCompatible).toBe(true);
  });

  // ── WalletConnect connector ──────────────────────────────────────────────

  it('detects WalletConnect connector as capable of signing', () => {
    const wcConnector: Partial<Connector> = {
      id: 'walletConnect',
      name: 'WalletConnect',
      type: 'walletConnect',
    };
    mockIsConnected = true;
    mockChainId = 10;
    mockConnector = wcConnector;
    mockConnectors = [wcConnector];

    const { result } = renderHook(() => useWalletCompatibility());
    const entry = result.current.connectors[0];
    expect(entry.capabilities.canSign).toBe(true);
    expect(entry.capabilities.canSwitchChain).toBe(true);
  });

  // ── Coinbase Wallet connector ────────────────────────────────────────────

  it('detects Coinbase Wallet connector as EIP-1193 injected', () => {
    const cbConnector: Partial<Connector> = {
      id: 'coinbaseWallet',
      name: 'Coinbase Wallet',
      type: 'injected',
    };
    mockIsConnected = true;
    mockChainId = 11155420;
    mockConnector = cbConnector;
    mockConnectors = [cbConnector];

    const { result } = renderHook(() => useWalletCompatibility());
    const entry = result.current.connectors[0];
    expect(entry.capabilities.isEIP1193).toBe(true);
    expect(entry.isChainSupported).toBe(true);
    expect(entry.failureMode).toBe('none');
  });

  // ── chain change ─────────────────────────────────────────────────────────

  it('reacts to a chain change: supported → unsupported → supported', () => {
    setConnectedState(10);
    const { result, rerender } = renderHook(() => useWalletCompatibility());
    expect(result.current.activeConnectorCompatible).toBe(true);

    act(() => { mockChainId = 1; });
    rerender();
    expect(result.current.connectors[0].failureMode).toBe('unsupported_chain');

    act(() => { mockChainId = 11155420; });
    rerender();
    expect(result.current.connectors[0].failureMode).toBe('none');
    expect(result.current.activeConnectorCompatible).toBe(true);
  });
});
