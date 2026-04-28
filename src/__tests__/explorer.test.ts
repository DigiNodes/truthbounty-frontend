/**
 * Tests for Stellar explorer URL generation
 */

import { describe, it, expect } from 'vitest';
import { getTransactionExplorerUrl, getAccountExplorerUrl } from '@/lib/explorer';

describe('Stellar Explorer URLs', () => {
  const mockTxHash = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  const mockAddress = 'GD5XQKZLQNXJY5L7F5RQ5Y7K2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6';

  it('should generate correct transaction explorer URL for public network', () => {
    const url = getTransactionExplorerUrl(mockTxHash, 1);
    expect(url).toBe('https://steexp.com/tx/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
  });

  it('should generate correct account explorer URL for public network', () => {
    const url = getAccountExplorerUrl(mockAddress, 1);
    expect(url).toBe('https://steexp.com/account/GD5XQKZLQNXJY5L7F5RQ5Y7K2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6');
  });

  it('should default to public network when no network specified', () => {
    const url = getTransactionExplorerUrl(mockTxHash);
    expect(url).toBe('https://steexp.com/tx/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
  });

  it('should handle unknown network by falling back to public network', () => {
    const url = getTransactionExplorerUrl(mockTxHash, 999);
    expect(url).toBe('https://steexp.com/tx/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
  });
});
