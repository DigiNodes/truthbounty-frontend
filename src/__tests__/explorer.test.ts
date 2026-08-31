/**
 * Tests for EVM explorer URL generation (Optimism mainnet + Sepolia testnet)
 */

import { describe, it, expect } from '@jest/globals';
import { getTransactionExplorerUrl, getAccountExplorerUrl } from '@/lib/explorer';

describe('EVM Explorer URLs', () => {
  const mockTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';

  it('should generate correct transaction explorer URL for Optimism mainnet', () => {
    const url = getTransactionExplorerUrl(mockTxHash, 10);
    expect(url).toBe(
      `https://optimistic.etherscan.io/tx/${mockTxHash}`
    );
  });

  it('should generate correct transaction explorer URL for Optimism Sepolia', () => {
    const url = getTransactionExplorerUrl(mockTxHash, 11155420);
    expect(url).toBe(
      `https://sepolia-optimism.etherscan.io/tx/${mockTxHash}`
    );
  });

  it('should generate correct account explorer URL for Optimism mainnet', () => {
    const url = getAccountExplorerUrl(mockAddress, 10);
    expect(url).toBe(
      `https://optimistic.etherscan.io/address/${mockAddress}`
    );
  });

  it('should default to Optimism mainnet when no chainId specified', () => {
    const url = getTransactionExplorerUrl(mockTxHash);
    expect(url).toBe(
      `https://optimistic.etherscan.io/tx/${mockTxHash}`
    );
  });

  it('should fall back to Optimism mainnet for unknown chain ids', () => {
    const url = getTransactionExplorerUrl(mockTxHash, 999);
    expect(url).toBe(
      `https://optimistic.etherscan.io/tx/${mockTxHash}`
    );
  });
});
