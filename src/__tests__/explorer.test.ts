/**
 * Tests for Optimism / EVM explorer URL generation
 */

import { getTransactionExplorerUrl, getAccountExplorerUrl, DEFAULT_CHAIN_ID } from '@/lib/explorer';

describe('Optimism Explorer URLs', () => {
  const mockTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';

  it('should generate correct transaction explorer URL for Optimism mainnet', () => {
    const url = getTransactionExplorerUrl(mockTxHash, 10);
    expect(url).toBe(`https://optimistic.etherscan.io/tx/${mockTxHash}`);
  });

  it('should generate correct transaction explorer URL for Optimism Sepolia testnet', () => {
    const url = getTransactionExplorerUrl(mockTxHash, 11155420);
    expect(url).toBe(`https://sepolia-optimism.etherscan.io/tx/${mockTxHash}`);
  });

  it('should generate correct account explorer URL for Optimism mainnet', () => {
    const url = getAccountExplorerUrl(mockAddress, 10);
    expect(url).toBe(`https://optimistic.etherscan.io/address/${mockAddress}`);
  });

  it('should generate correct account explorer URL for Optimism Sepolia testnet', () => {
    const url = getAccountExplorerUrl(mockAddress, 11155420);
    expect(url).toBe(`https://sepolia-optimism.etherscan.io/address/${mockAddress}`);
  });

  it('should default to Optimism mainnet when no chain ID is specified', () => {
    const url = getTransactionExplorerUrl(mockTxHash);
    expect(url).toBe(`https://optimistic.etherscan.io/tx/${mockTxHash}`);
    expect(DEFAULT_CHAIN_ID).toBe(10);
  });

  it('should fallback to default Optimism mainnet for unknown chain ID', () => {
    const url = getTransactionExplorerUrl(mockTxHash, 999999);
    expect(url).toBe(`https://optimistic.etherscan.io/tx/${mockTxHash}`);
  });
});
