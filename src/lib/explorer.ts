/**
 * Stellar blockchain explorer utilities
 */

export interface ExplorerConfig {
  name: string;
  baseUrl: string;
  transactionPath: string;
}

// Stellar explorer configurations
export const STELLAR_EXPLORERS: Record<number, ExplorerConfig> = {
  // Stellar Public Network
  1: {
    name: 'Stellar Expert',
    baseUrl: 'https://steexp.com',
    transactionPath: '/tx',
  },
  // Stellar Testnet
  // Note: Stellar testnet uses the same explorer but different URL
};

/**
 * Get the appropriate explorer URL for a transaction hash
 * @param txHash - Transaction hash
 * @param network - Network ID (defaults to 1 for public network)
 * @returns Full explorer URL for the transaction
 */
export function getTransactionExplorerUrl(txHash: string, network: number = 1): string {
  const explorer = STELLAR_EXPLORERS[network] || STELLAR_EXPLORERS[1];
  return `${explorer.baseUrl}${explorer.transactionPath}/${txHash}`;
}

/**
 * Get the appropriate explorer URL for an account address
 * @param address - Stellar account address
 * @param network - Network ID (defaults to 1 for public network)
 * @returns Full explorer URL for the account
 */
export function getAccountExplorerUrl(address: string, network: number = 1): string {
  const explorer = STELLAR_EXPLORERS[network] || STELLAR_EXPLORERS[1];
  return `${explorer.baseUrl}/account/${address}`;
}

/**
 * Opens a transaction in a new browser tab
 * @param txHash - Transaction hash
 * @param network - Network ID (optional)
 */
export function openTransactionInExplorer(txHash: string, network?: number): void {
  const url = getTransactionExplorerUrl(txHash, network);
  window.open(url, '_blank', 'noopener,noreferrer');
}
