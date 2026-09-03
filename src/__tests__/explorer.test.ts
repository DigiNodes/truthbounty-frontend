/**
 * Tests for Optimism EVM explorer URL generation
 */

// NOTE: no @jest/globals import — jest globals are typed via @types/jest.
import { getTransactionExplorerUrl, getAccountExplorerUrl } from '@/lib/explorer';

describe('Optimism Explorer URLs', () => {
  const mockTxHash =
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  const mockAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

  it('generates Optimism mainnet transaction URL', () => {
    const url = getTransactionExplorerUrl(mockTxHash, 10);
    expect(url).toBe(
      `https://optimistic.etherscan.io/tx/${mockTxHash}`,
    );
  });

  it('generates Optimism Sepolia transaction URL', () => {
    const url = getTransactionExplorerUrl(mockTxHash, 11155420);
    expect(url).toBe(
      `https://sepolia-optimism.etherscan.io/tx/${mockTxHash}`,
    );
  });

  it('generates account explorer URL for Optimism mainnet', () => {
    const url = getAccountExplorerUrl(mockAddress, 10);
    expect(url).toBe(
      `https://optimistic.etherscan.io/address/${mockAddress}`,
    );
  });

  it('falls back to Optimism mainnet for unknown chain IDs', () => {
    const url = getTransactionExplorerUrl(mockTxHash, 999);
    expect(url).toBe(
      `https://optimistic.etherscan.io/tx/${mockTxHash}`,
    );
  });
});
