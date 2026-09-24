/**
 * Tests for EVM explorer URL generation (Optimism mainnet + Sepolia).
 */

import {
  DEFAULT_CHAIN_ID,
  getAccountExplorerUrl,
  getTransactionExplorerUrl,
} from '@/lib/explorer';

describe('EVM Explorer URLs', () => {
  const mockTxHash =
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';

  it('generates the Optimism mainnet transaction URL', () => {
    expect(getTransactionExplorerUrl(mockTxHash, 10)).toBe(
      `https://optimistic.etherscan.io/tx/${mockTxHash}`,
    );
  });

  it('generates the Optimism Sepolia transaction URL', () => {
    expect(getTransactionExplorerUrl(mockTxHash, 11155420)).toBe(
      `https://sepolia-optimism.etherscan.io/tx/${mockTxHash}`,
    );
  });

  it('generates the Optimism mainnet account URL', () => {
    expect(getAccountExplorerUrl(mockAddress, 10)).toBe(
      `https://optimistic.etherscan.io/address/${mockAddress}`,
    );
  });

  it('generates the Optimism Sepolia account URL', () => {
    expect(getAccountExplorerUrl(mockAddress, 11155420)).toBe(
      `https://sepolia-optimism.etherscan.io/address/${mockAddress}`,
    );
  });

  it('defaults to Optimism mainnet when no chain ID is supplied', () => {
    expect(getTransactionExplorerUrl(mockTxHash)).toBe(
      `https://optimistic.etherscan.io/tx/${mockTxHash}`,
    );
    expect(DEFAULT_CHAIN_ID).toBe(10);
  });

  it('falls back to Optimism mainnet for an unknown chain ID', () => {
    expect(getTransactionExplorerUrl(mockTxHash, 999999)).toBe(
      `https://optimistic.etherscan.io/tx/${mockTxHash}`,
    );
  });
});
