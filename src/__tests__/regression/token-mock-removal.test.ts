/**
 * Token Mock Removal — Regression tests (V2-FE-016)
 *
 * Ensures that:
 *  1. No mock token data is seeded in production hooks
 *  2. No fabricated balances, hashes, or allowance values exist in production paths
 *  3. Stellar/Freighter is NOT imported by any token-related module
 *  4. wallet.ts claimRewards still throws NotImplemented
 *  5. useTokenBalance/useTokenApproval only use canonical contract reads
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFileContent(relativePath: string): string {
  const root = process.cwd();
  return readFileSync(join(root, relativePath), 'utf8');
}

/** Extract import lines from file content. */
function getImportLines(content: string): string[] {
  return content
    .split('\n')
    .filter((line) => line.trimStart().startsWith('import '));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Token mock removal — Regression', () => {
  // -------------------------------------------------------------------------
  // 1. No mock token data in production hooks
  // -------------------------------------------------------------------------

  it('useTokenBalance does not contain hardcoded balance fixtures', () => {
    const content = readFileContent('src/hooks/useTokenBalance.ts');
    const lines = content
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'));

    // Should not have hardcoded numeric balances in code (not comments)
    const codeLines = lines.join('\n');
    expect(codeLines).not.toMatch(/balance\s*=\s*\d+/);
    expect(codeLines).not.toContain('1000');
    expect(codeLines).not.toContain('1500');
    expect(codeLines).not.toContain('9999');
  });

  it('useTokenApproval does not contain hardcoded allowance fixtures', () => {
    const content = readFileContent('src/hooks/useTokenApproval.ts');
    const lines = content
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'));

    const codeLines = lines.join('\n');
    expect(codeLines).not.toMatch(/allowance\s*=\s*\d+/);
    expect(codeLines).not.toContain('5000');
    expect(codeLines).not.toContain('10000');
  });

  it('useRewards does not seed fabricated claimable rewards', () => {
    const content = readFileContent('src/hooks/useRewards.ts');

    // pendingRewards should initialize to empty array, not fixtures
    expect(content).toContain('useState<ClaimableReward[]>([])');
    expect(content).not.toMatch(/pendingRewards.*=.*\[[\s\S]*claimId/);
  });

  // -------------------------------------------------------------------------
  // 2. No fabricated hashes or values
  // -------------------------------------------------------------------------

  it('wallet.ts does not use Math.random for hash generation', () => {
    const content = readFileContent('src/app/lib/wallet.ts');
    const lines = content
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'));

    const codeLines = lines.join('\n');
    expect(codeLines).not.toContain('Math.random');
  });

  it('useTokenBalance does not set txHash', () => {
    const content = readFileContent('src/hooks/useTokenBalance.ts');
    expect(content).not.toContain('txHash');
  });

  it('useTokenApproval txHash comes only from writeContractAsync', () => {
    const content = readFileContent('src/hooks/useTokenApproval.ts');

    // txHash should be set from writeContractAsync result, not fabricated
    expect(content).toContain('writeContractAsync');
    // No hardcoded hash strings
    const lines = content
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'));
    const codeLines = lines.join('\n');
    expect(codeLines).not.toMatch(/txHash\s*=\s*'0x/);
  });

  // -------------------------------------------------------------------------
  // 3. No Stellar/Freighter imports in token paths
  // -------------------------------------------------------------------------

  it('useTokenBalance does not import Stellar/Freighter', () => {
    const content = readFileContent('src/hooks/useTokenBalance.ts');
    const imports = getImportLines(content);

    expect(
      imports.some(
        (i) => i.includes('@stellar/freighter-api') || i.includes('@stellar/stellar-sdk'),
      ),
    ).toBe(false);
  });

  it('useTokenApproval does not import Stellar/Freighter', () => {
    const content = readFileContent('src/hooks/useTokenApproval.ts');
    const imports = getImportLines(content);

    expect(
      imports.some(
        (i) => i.includes('@stellar/freighter-api') || i.includes('@stellar/stellar-sdk'),
      ),
    ).toBe(false);
  });

  it('wallet.ts does not import Stellar/Freighter', () => {
    const content = readFileContent('src/app/lib/wallet.ts');
    const imports = getImportLines(content);

    expect(
      imports.some(
        (i) => i.includes('@stellar/freighter-api') || i.includes('@stellar/stellar-sdk'),
      ),
    ).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 4. claimRewards stub still throws NotImplemented
  // -------------------------------------------------------------------------

  it('claimRewards in wallet.ts still throws NotImplemented', async () => {
    const { claimRewards } = await import('@/app/lib/wallet');

    await expect(claimRewards(['test-id'])).rejects.toThrow(
      /Not implemented.*V2-FE-003/,
    );
  });

  // -------------------------------------------------------------------------
  // 5. Canonical contract reads are used (not hardcoded addresses)
  // -------------------------------------------------------------------------

  it('useTokenBalance uses getContractAddress from registry', () => {
    const content = readFileContent('src/hooks/useTokenBalance.ts');
    expect(content).toContain("getContractAddress('TruthBountyWeighted')");
    expect(content).toContain("from '@/lib/contracts/registry'");
  });

  it('useTokenApproval uses getContractAddress from registry', () => {
    const content = readFileContent('src/hooks/useTokenApproval.ts');
    expect(content).toContain("getContractAddress('TruthBountyWeighted')");
    expect(content).toContain("from '@/lib/contracts/registry'");
  });

  it('wallet.ts uses getContractAddress from registry', () => {
    const content = readFileContent('src/app/lib/wallet.ts');
    expect(content).toContain("getContractAddress('TruthBountyWeighted')");
    expect(content).toContain("from '@/lib/contracts/registry'");
  });

  // -------------------------------------------------------------------------
  // 6. Validation guards present
  // -------------------------------------------------------------------------

  it('useTokenApproval rejects MAX_UINT256 by default', () => {
    const content = readFileContent('src/hooks/useTokenApproval.ts');
    expect(content).toContain('MAX_UINT256');
    expect(content).toContain('Unlimited approval rejected');
  });

  it('useTokenApproval checks balance before approving', () => {
    const content = readFileContent('src/hooks/useTokenApproval.ts');
    expect(content).toContain('balanceOf');
    expect(content).toContain('Insufficient balance');
  });

  it('useTokenApproval validates spender against canonical address', () => {
    const content = readFileContent('src/hooks/useTokenApproval.ts');
    expect(content).toContain('getContractAddress');
  });

  // -------------------------------------------------------------------------
  // 7. how-it-works Stellar reference fixed
  // -------------------------------------------------------------------------

  it('how-it-works page no longer references Stellar for tokens', () => {
    const content = readFileContent(
      'src/app/(dashboard)/how-it-works/page.tsx',
    );

    // Check that the FAQ answer about tokens doesn't mention Stellar
    const tokenFaqMatch = content.match(
      /What tokens are used.*?a:\s*'(.*?)'/s,
    );
    if (tokenFaqMatch) {
      expect(tokenFaqMatch[1]).not.toContain('Stellar');
      expect(tokenFaqMatch[1]).toContain('ERC-20 token on Optimism');
    }
  });
});
