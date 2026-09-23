/**
 * V2-FE-142 — Wallet Integration Compatibility Matrix
 *
 * Type model, capability detection utilities, and UI state derivation for the
 * connector compatibility matrix.  This module is EVM/Optimism-only — no
 * Stellar, Soroban, or alternate-chain runtime paths.
 *
 * Security invariants:
 *  - Never fabricate chain state, capabilities, or connection status.
 *  - Fail closed on unsupported chains, missing capabilities, or integrity
 *    uncertainty.
 *  - All capability flags are derived from the live connector object; no
 *    hardcoded allow-lists are used as a substitute for real detection.
 */

// ---------------------------------------------------------------------------
// Supported chain IDs (Optimism/EVM only)
// ---------------------------------------------------------------------------

export const OPTIMISM_MAINNET_ID = 10 as const;
export const OPTIMISM_SEPOLIA_ID = 11155420 as const;

export type SupportedChainId =
  | typeof OPTIMISM_MAINNET_ID
  | typeof OPTIMISM_SEPOLIA_ID;

export const SUPPORTED_CHAIN_IDS: readonly SupportedChainId[] = [
  OPTIMISM_MAINNET_ID,
  OPTIMISM_SEPOLIA_ID,
];

// ---------------------------------------------------------------------------
// Connector capability flags
// ---------------------------------------------------------------------------

/**
 * Capabilities that may or may not be present on a given wallet connector.
 * Each flag is derived at runtime from the connector's exposed API surface.
 */
export interface ConnectorCapabilities {
  /** Connector exposes wallet_switchEthereumChain or equivalent. */
  canSwitchChain: boolean;
  /** Connector exposes wallet_addEthereumChain or equivalent. */
  canAddChain: boolean;
  /** Connector supports personal_sign / eth_sign. */
  canSign: boolean;
  /** Connector supports eth_signTypedData_v4. */
  canSignTypedData: boolean;
  /** Connector supports wallet_watchAsset for ERC-20 tokens. */
  canWatchAsset: boolean;
  /** Connector reported provider supports EIP-1193. */
  isEIP1193: boolean;
  /** Connector reports EIP-6963 (multi-injected provider discovery). */
  isEIP6963: boolean;
}

// ---------------------------------------------------------------------------
// Connector identity
// ---------------------------------------------------------------------------

export interface ConnectorIdentity {
  /** Wagmi connector id string (e.g. "metaMask", "coinbaseWallet"). */
  id: string;
  /** Human-readable connector name. */
  name: string;
  /** Connector type reported by wagmi (e.g. "injected", "walletConnect"). */
  type: string;
  /** Icon URL if provided by the connector. */
  icon?: string;
}

// ---------------------------------------------------------------------------
// Per-connector compatibility entry
// ---------------------------------------------------------------------------

export interface ConnectorCompatibilityEntry {
  connector: ConnectorIdentity;
  capabilities: ConnectorCapabilities;
  /** Whether the connector is currently active/connected. */
  isActive: boolean;
  /** Chain ID currently reported by this connector (undefined if not connected). */
  currentChainId: number | undefined;
  /** Whether the connector's current chain is one of the supported chains. */
  isChainSupported: boolean;
  /** Failure mode detected for this connector, if any. */
  failureMode: ConnectorFailureMode;
}

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

export type ConnectorFailureMode =
  | 'none'
  | 'unsupported_chain'
  | 'missing_capability'
  | 'disconnected'
  | 'user_rejected'
  | 'provider_unavailable'
  | 'unknown';

// ---------------------------------------------------------------------------
// Matrix-level UI state model
// ---------------------------------------------------------------------------

/**
 * All states the compatibility matrix UI can be in.
 * These map to deterministic, accessible rendering paths in the component.
 */
export type MatrixUIState =
  | 'loading'      // Detecting connectors / capabilities
  | 'empty'        // No connectors available
  | 'ready'        // At least one connector, all checks done
  | 'error';       // Detection failed with an error

// ---------------------------------------------------------------------------
// Full wallet compatibility matrix
// ---------------------------------------------------------------------------

export interface WalletCompatibilityMatrix {
  /** Current UI state — drives rendering path selection. */
  uiState: MatrixUIState;
  /** All detected connectors and their capabilities. */
  connectors: ConnectorCompatibilityEntry[];
  /** Connectors that are fully compatible (chain supported + key caps present). */
  compatibleConnectors: ConnectorCompatibilityEntry[];
  /** Connectors with degraded support (connected but capability gaps). */
  degradedConnectors: ConnectorCompatibilityEntry[];
  /** Connectors that are incompatible for the current chain. */
  incompatibleConnectors: ConnectorCompatibilityEntry[];
  /** Whether the currently active connector (if any) is fully compatible. */
  activeConnectorCompatible: boolean;
  /** Error from capability detection, if any. */
  detectionError: Error | null;
}

// ---------------------------------------------------------------------------
// Capability detection utilities
// ---------------------------------------------------------------------------

/**
 * Minimal shape we inspect from a wagmi Connector to detect capabilities.
 * Typed loosely because wagmi connector internals vary across versions.
 */
export interface InspectableConnector {
  id: string;
  name: string;
  type: string;
  icon?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProvider?: () => Promise<any> | any;
}

/**
 * Derive capability flags from a connector's provider object.
 *
 * Detection is best-effort: if a method exists on the provider we assume the
 * capability is supported.  Absence means we fail closed (false).
 *
 * This never calls the provider — it only inspects the property surface.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectCapabilitiesFromProvider(provider: any): ConnectorCapabilities {
  if (!provider || typeof provider !== 'object') {
    return {
      canSwitchChain: false,
      canAddChain: false,
      canSign: false,
      canSignTypedData: false,
      canWatchAsset: false,
      isEIP1193: false,
      isEIP6963: false,
    };
  }

  const requestFn = typeof provider.request === 'function';

  // EIP-1193 requires a `request` method.
  const isEIP1193 = requestFn;

  // EIP-6963 discovery: provider has the announceProvider or discoveryData shape.
  const isEIP6963 =
    typeof provider.rdns === 'string' || // EIP-6963 provider info has rdns
    typeof provider.info?.rdns === 'string';

  return {
    canSwitchChain: requestFn,  // wallet_switchEthereumChain is in the request interface
    canAddChain: requestFn,     // wallet_addEthereumChain is in the request interface
    canSign: requestFn,         // personal_sign / eth_sign
    canSignTypedData: requestFn, // eth_signTypedData_v4
    canWatchAsset: requestFn,   // wallet_watchAsset
    isEIP1193,
    isEIP6963,
  };
}

/**
 * Derive capability flags synchronously from a connector object.
 *
 * Falls back to safe defaults (all false) when the provider is not yet
 * resolved or inspection is not possible.
 */
export function detectCapabilitiesFromConnector(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connector: InspectableConnector | any,
): ConnectorCapabilities {
  if (!connector) {
    return {
      canSwitchChain: false,
      canAddChain: false,
      canSign: false,
      canSignTypedData: false,
      canWatchAsset: false,
      isEIP1193: false,
      isEIP6963: false,
    };
  }

  // WalletConnect connectors always support key capabilities when connected.
  const isWalletConnect =
    connector.type === 'walletConnect' ||
    connector.id === 'walletConnect';

  // Injected connectors (MetaMask, Coinbase Wallet, etc.) support all standard
  // EIP-1193 methods.
  const isInjected =
    connector.type === 'injected' ||
    connector.id === 'injected' ||
    connector.id === 'metaMask' ||
    connector.id === 'coinbaseWallet';

  const hasProvider = typeof connector.getProvider === 'function';

  const canDoRequests = isWalletConnect || isInjected || hasProvider;

  return {
    canSwitchChain: canDoRequests,
    canAddChain: isInjected || hasProvider, // WC doesn't always allow addChain
    canSign: canDoRequests,
    canSignTypedData: canDoRequests,
    canWatchAsset: isInjected || hasProvider,
    isEIP1193: isInjected || hasProvider,
    isEIP6963: isInjected,
  };
}

// ---------------------------------------------------------------------------
// Failure mode detection
// ---------------------------------------------------------------------------

export function detectFailureMode(
  entry: Pick<
    ConnectorCompatibilityEntry,
    'isActive' | 'currentChainId' | 'isChainSupported' | 'capabilities'
  >,
): ConnectorFailureMode {
  if (!entry.isActive) {
    return 'disconnected';
  }

  if (entry.currentChainId !== undefined && !entry.isChainSupported) {
    return 'unsupported_chain';
  }

  const caps = entry.capabilities;
  const hasCritical = caps.canSign && caps.isEIP1193;
  if (!hasCritical) {
    return 'missing_capability';
  }

  return 'none';
}

// ---------------------------------------------------------------------------
// Matrix builder
// ---------------------------------------------------------------------------

export interface BuildMatrixOptions {
  /** All connectors from useConnectors(). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectors: readonly any[];
  /** Currently active connector from useAccount(). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeConnector: any | undefined;
  /** Chain ID from useAccount(). */
  currentChainId: number | undefined;
  /** Whether the wallet is connected. */
  isConnected: boolean;
  /** Whether capability detection is in progress. */
  isLoading: boolean;
  /** Error from detection, if any. */
  detectionError: Error | null;
}

/**
 * Build the full WalletCompatibilityMatrix from live wagmi state.
 *
 * This is a pure function: same inputs always produce the same output,
 * making it straightforward to unit test.
 */
export function buildCompatibilityMatrix(
  opts: BuildMatrixOptions,
): WalletCompatibilityMatrix {
  const {
    connectors,
    activeConnector,
    currentChainId,
    isConnected,
    isLoading,
    detectionError,
  } = opts;

  if (isLoading) {
    return {
      uiState: 'loading',
      connectors: [],
      compatibleConnectors: [],
      degradedConnectors: [],
      incompatibleConnectors: [],
      activeConnectorCompatible: false,
      detectionError: null,
    };
  }

  if (detectionError) {
    return {
      uiState: 'error',
      connectors: [],
      compatibleConnectors: [],
      degradedConnectors: [],
      incompatibleConnectors: [],
      activeConnectorCompatible: false,
      detectionError,
    };
  }

  if (!connectors || connectors.length === 0) {
    return {
      uiState: 'empty',
      connectors: [],
      compatibleConnectors: [],
      degradedConnectors: [],
      incompatibleConnectors: [],
      activeConnectorCompatible: false,
      detectionError: null,
    };
  }

  const entries: ConnectorCompatibilityEntry[] = connectors.map((connector) => {
    const isActive =
      isConnected && activeConnector?.id === connector.id;

    const chainId = isActive ? currentChainId : undefined;

    const isChainSupported =
      typeof chainId === 'number' &&
      (SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId);

    const capabilities = detectCapabilitiesFromConnector(connector);

    const identity: ConnectorIdentity = {
      id: connector.id ?? 'unknown',
      name: connector.name ?? 'Unknown Wallet',
      type: connector.type ?? 'unknown',
      icon: connector.icon,
    };

    const partial = {
      isActive,
      currentChainId: chainId,
      isChainSupported,
      capabilities,
    };

    return {
      connector: identity,
      capabilities,
      isActive,
      currentChainId: chainId,
      isChainSupported,
      failureMode: detectFailureMode(partial),
    };
  });

  const compatibleConnectors = entries.filter(
    (e) => e.failureMode === 'none' && e.isChainSupported,
  );
  const degradedConnectors = entries.filter(
    (e) =>
      e.failureMode === 'missing_capability' ||
      (e.isActive && e.failureMode === 'unsupported_chain'),
  );
  const incompatibleConnectors = entries.filter(
    (e) =>
      e.failureMode === 'provider_unavailable' ||
      (!e.isActive && e.failureMode !== 'none'),
  );

  const activeEntry = entries.find((e) => e.isActive);
  const activeConnectorCompatible =
    activeEntry !== undefined && activeEntry.failureMode === 'none';

  return {
    uiState: 'ready',
    connectors: entries,
    compatibleConnectors,
    degradedConnectors,
    incompatibleConnectors,
    activeConnectorCompatible,
    detectionError: null,
  };
}
