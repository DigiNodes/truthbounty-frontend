/**
 * EVM blockchain explorer utilities for Optimism networks
 */

export interface ExplorerConfig {
  name: string;
  baseUrl: string;
  transactionPath: string;
  addressPath: string;
}

// EVM explorer configurations (Optimism mainnet and testnet)
export const EVM_EXPLORERS: Record<number, ExplorerConfig> = {
  // Optimism Mainnet
  10: {
    name: 'Optimistic Etherscan',
    baseUrl: 'https://optimistic.etherscan.io',
    transactionPath: '/tx',
    addressPath: '/address',
  },
  // Optimism Sepolia Testnet
  11155420: {
    name: 'Optimistic Etherscan (Sepolia)',
    baseUrl: 'https://sepolia-optimism.etherscan.io',
    transactionPath: '/tx',
    addressPath: '/address',
  },
};

/**
 * Get the appropriate explorer URL for a transaction hash
 * @param txHash - Transaction hash
 * @param chainId - Chain ID (defaults to 10 for Optimism mainnet)
 * @returns Full explorer URL for the transaction
 */
export function getTransactionExplorerUrl(txHash: string, chainId: number = 10): string {
  const explorer = EVM_EXPLORERS[chainId] || EVM_EXPLORERS[10];
  return `${explorer.baseUrl}${explorer.transactionPath}/${txHash}`;
}

/**
 * Get the appropriate explorer URL for an account address
 * @param address - EVM account address
 * @param chainId - Chain ID (defaults to 10 for Optimism mainnet)
 * @returns Full explorer URL for the account
 */
export function getAccountExplorerUrl(address: string, chainId: number = 10): string {
  const explorer = EVM_EXPLORERS[chainId] || EVM_EXPLORERS[10];
  return `${explorer.baseUrl}${explorer.addressPath}/${address}`;
}

/**
 * Opens a transaction in a new browser tab
 * @param txHash - Transaction hash
 * @param chainId - Chain ID (optional)
 */
export function openTransactionInExplorer(txHash: string, chainId?: number): void {
  const url = getTransactionExplorerUrl(txHash, chainId ?? 10);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Opens an account in a new browser tab
 * @param address - Account address
 * @param chainId - Chain ID (optional)
 */
export function openAccountInExplorer(address: string, chainId?: number): void {
  const url = getAccountExplorerUrl(address, chainId ?? 10);
  window.open(url, '_blank', 'noopener,noreferrer');
}