/**
 * Optimism / EVM blockchain explorer utilities
 */

export interface ExplorerConfig {
  name: string;
  baseUrl: string;
  transactionPath: string;
  addressPath: string;
}

// Canonical Optimism explorer configurations
export const OPTIMISM_EXPLORERS: Record<number, ExplorerConfig> = {
  // Optimism Mainnet
  10: {
    name: 'Optimism Etherscan',
    baseUrl: 'https://optimistic.etherscan.io',
    transactionPath: '/tx',
    addressPath: '/address',
  },
  // Optimism Sepolia Testnet
  11155420: {
    name: 'Optimism Sepolia Etherscan',
    baseUrl: 'https://sepolia-optimism.etherscan.io',
    transactionPath: '/tx',
    addressPath: '/address',
  },
};

export const DEFAULT_CHAIN_ID = 10;

/**
 * Get the appropriate explorer URL for a transaction hash
 * @param txHash - EVM transaction hash
 * @param chainId - Network Chain ID (defaults to 10 for Optimism Mainnet)
 * @returns Full explorer URL for the transaction
 */
export function getTransactionExplorerUrl(txHash: string, chainId: number = DEFAULT_CHAIN_ID): string {
  const explorer = OPTIMISM_EXPLORERS[chainId] || OPTIMISM_EXPLORERS[DEFAULT_CHAIN_ID];
  return `${explorer.baseUrl}${explorer.transactionPath}/${txHash}`;
}

/**
 * Get the appropriate explorer URL for an account address
 * @param address - EVM account address
 * @param chainId - Network Chain ID (defaults to 10 for Optimism Mainnet)
 * @returns Full explorer URL for the account
 */
export function getAccountExplorerUrl(address: string, chainId: number = DEFAULT_CHAIN_ID): string {
  const explorer = OPTIMISM_EXPLORERS[chainId] || OPTIMISM_EXPLORERS[DEFAULT_CHAIN_ID];
  return `${explorer.baseUrl}${explorer.addressPath}/${address}`;
}

/**
 * Opens a transaction in a new browser tab
 * @param txHash - Transaction hash
 * @param chainId - Network Chain ID (optional)
 */
export function openTransactionInExplorer(txHash: string, chainId?: number): void {
  const url = getTransactionExplorerUrl(txHash, chainId);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
