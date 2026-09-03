/**
 * V2-FE-009 + V2-FE-016 — Regression tests for removed mock, legacy, and
 * unsafe behaviours.
 *
 * These tests are the "delete-proof": they verify that removed code no longer
 * exists or no longer does unsafe things, so that future changes cannot
 * silently re-introduce fabricated state.
 *
 * Coverage:
 *  1. claimRewards() in wallet.ts throws NotImplemented (no fake hash)
 *  2. getTokenBalance() in wallet.ts throws NotImplemented
 *  3. useWallet() no longer returns a numeric `balance` field
 *  4. transaction-simulator.ts, mock-wagmi.ts and mock-wallet-provider.tsx
 *     are deleted from production (`src/lib`)
 *  5. pending-transactions storage key is v2 (old v1 key is abandoned)
 *  6. PendingTransactionEntry includes the v2 fields (txHash, chainId, machineState)
 *  7. @stellar/freighter-api is NOT imported by useAccount
 *  8. No production code fabricates hashes/addresses with Math.random
 *  9. Development fixtures (mock-data) are isolated to tests/Storybook
 * 10. Production never uses mock Worldcoin verification
 * 11. Real Web3 configuration is required (browser fail-fast)
 */

import { renderHook } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';

// Mock wagmi/rainbowkit at top level for test environment so module
// evaluation of the config (wagmi.tsx) never hits real library side-effects.
jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
  useChainId: () => 10,
  useDisconnect: () => ({ disconnect: jest.fn() }),
  http: jest.fn(),
  WagmiProvider: () => null,
}));

jest.mock('@rainbow-me/rainbowkit', () => ({
  getDefaultConfig: jest.fn(() => ({})),
  RainbowKitProvider: () => null,
  useConnectModal: () => ({ openConnectModal: jest.fn() }),
  ConnectButton: () => null,
}));

// These modules read env lazily at call time, so a static import is safe:
// the tests below swap the env vars and assert on the pure behaviour.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { shouldUseMockVerification } = require('@/config/worldcoin-client');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getWalletConnectProjectId } = require('@/config/walletconnect');

// ---------------------------------------------------------------------------
// 1 & 2. wallet.ts stubs throw NotImplemented
// ---------------------------------------------------------------------------

describe('wallet.ts — mock hash generation removed', () => {
  it('claimRewards throws a descriptive NotImplemented error', async () => {
    const { claimRewards } = await import('@/app/lib/wallet');
    await expect(claimRewards(['claim-1'])).rejects.toThrow(
      /Not implemented.*V2-FE-003/,
    );
  });

  it('claimRewards does NOT return a fabricated txHash', async () => {
    const { claimRewards } = await import('@/app/lib/wallet');
    let result: { txHash: `0x${string}` } | undefined;
    try {
      result = await claimRewards(['claim-1']);
    } catch {
      // expected
    }
    expect(result).toBeUndefined();
  });

  it('getTokenBalance throws a descriptive NotImplemented error', async () => {
    const { getTokenBalance } = await import('@/app/lib/wallet');
    await expect(getTokenBalance()).rejects.toThrow(
      /Not implemented.*V2-FE-003/,
    );
  });
});

// ---------------------------------------------------------------------------
// 3. useWallet no longer exposes a numeric balance
// ---------------------------------------------------------------------------

describe('useWallet — numeric balance removed', () => {
  it('useWallet return value does not include a balance field', async () => {
    const { useWallet } = await import('@/hooks/useWallet');
    const { result } = renderHook(() => useWallet());

    // Should have these keys
    expect(result.current).toHaveProperty('address');
    expect(result.current).toHaveProperty('chainId');
    expect(result.current).toHaveProperty('isConnected');

    // Should NOT have a numeric balance or toy methods
    expect(result.current).not.toHaveProperty('balance');
    expect(result.current).not.toHaveProperty('deposit');
    expect(result.current).not.toHaveProperty('withdraw');
  });
});

// ---------------------------------------------------------------------------
// 4. Production mock modules are deleted (V2-FE-016)
// ---------------------------------------------------------------------------

const SRC_ROOT = path.resolve(__dirname, '../../');

function expectFileAbsent(relPath: string) {
  const filePath = path.join(SRC_ROOT, relPath);
  expect(fs.existsSync(filePath)).toBe(false);
}

describe('production mock modules deleted (V2-FE-016)', () => {
  it('src/lib/mock-wagmi.ts is deleted — only the test-boundary copy may remain', () => {
    expectFileAbsent('lib/mock-wagmi.ts');
    const testCopy = path.join(SRC_ROOT, '__tests__/mocks/wagmi/mock-wagmi.ts');
    expect(fs.existsSync(testCopy)).toBe(true);
  });

  it('src/lib/mock-wallet-provider.tsx is deleted', () => {
    expectFileAbsent('lib/mock-wallet-provider.tsx');
  });

  it('src/lib/transaction-simulator.ts is deleted', () => {
    expectFileAbsent('lib/transaction-simulator.ts');
  });

  it('stray backend/Stellar files are not part of the frontend', () => {
    expectFileAbsent('CorrectRewardClaim');
    expectFileAbsent('evidence');
  });
});

// ---------------------------------------------------------------------------
// 5. pending-transactions uses v2 storage key
// ---------------------------------------------------------------------------

describe('pending-transactions — v2 storage key', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes to the v2 key, not v1', async () => {
    const { trackPendingTransaction } = await import('@/lib/pending-transactions');
    trackPendingTransaction({
      id: 'key-test',
      kind: 'rewards',
      title: 'Test',
      description: 'Key test',
      txHash: null,
      chainId: null,
      machineState: 'idle',
    });

    // v2 key present
    expect(localStorage.getItem('truthbounty-pending-transactions-v2')).not.toBeNull();
    // v1 key absent
    expect(localStorage.getItem('truthbounty-pending-transactions')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. PendingTransactionEntry includes v2 fields
// ---------------------------------------------------------------------------

describe('PendingTransactionEntry — v2 fields present', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and reads back txHash, chainId, and machineState', async () => {
    const { trackPendingTransaction, getPendingTransactions } =
      await import('@/lib/pending-transactions');

    trackPendingTransaction({
      id: 'v2-fields-test',
      kind: 'verification',
      title: 'Verification',
      description: 'V2 fields test',
      txHash:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      chainId: 10,
      machineState: 'submitted',
    });

    const entries = getPendingTransactions();
    expect(entries).toHaveLength(1);
    expect(entries[0].txHash).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(entries[0].chainId).toBe(10);
    expect(entries[0].machineState).toBe('submitted');
  });

  it('filters out stale v1 entries that lack machineState', async () => {
    // Write a stale v1 entry to the v2 key
    const stale = JSON.stringify([
      {
        id: 'stale-no-machine-state',
        kind: 'rewards',
        title: 'Old',
        description: 'Old entry',
        createdAt: Date.now(),
        // missing txHash, chainId, machineState
      },
    ]);
    localStorage.setItem('truthbounty-pending-transactions-v2', stale);

    const { getPendingTransactions } = await import('@/lib/pending-transactions');
    const entries = getPendingTransactions();
    // Stale entry filtered because it lacks `machineState`
    expect(entries.find((e) => e.id === 'stale-no-machine-state')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 7. useAccount does NOT import from @stellar/freighter-api
// ---------------------------------------------------------------------------

describe('useAccount — Stellar/Freighter dependency removed', () => {
  it('useAccount source code does not contain @stellar/freighter-api import', () => {
    const filePath = path.resolve(__dirname, '../../hooks/useAccount.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).not.toContain("from '@stellar/freighter-api'");
    expect(content).not.toContain('from "@stellar/freighter-api"');
  });
});

// ---------------------------------------------------------------------------
// 8. No production code fabricates hashes/addresses with Math.random
// ---------------------------------------------------------------------------

describe('production code — no synthetic hashes or addresses (V2-FE-016)', () => {
  it('useAppealParticipation does not fabricate a transaction hash', () => {
    const filePath = path.resolve(__dirname, '../../hooks/useAppealParticipation.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).not.toContain('Math.random');
    expect(content).not.toContain('mockTxHash');
  });

  it('identity page connects a real wallet instead of minting a mock address', () => {
    const filePath = path.resolve(__dirname, '../../app/(dashboard)/identity/page.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).not.toContain('Math.random');
    expect(content).not.toContain('mockAddress');
    expect(content).toContain('useConnectModal');
  });

  it('useTrust does not fabricate random trust values', () => {
    const filePath = path.resolve(__dirname, '../../components/hooks/useTrust.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).not.toContain('Math.random');
  });
});

// ---------------------------------------------------------------------------
// 9. Development fixtures are isolated to tests/Storybook
// ---------------------------------------------------------------------------

function collectProductionFiles(dir: string, results: string[] = []): string[] {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'stories') {
        collectProductionFiles(full, results);
      }
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.stories.ts') &&
      !entry.name.endsWith('.stories.tsx')
    ) {
      results.push(full);
    }
  }
  return results;
}

describe('development fixtures isolated to tests and Storybook (V2-FE-016)', () => {
  it('no production file imports the mock-data fixture module', () => {
    const productionRoots = ['app', 'components', 'config', 'context', 'hooks', 'lib'];
    const files = productionRoots.flatMap((root) =>
      collectProductionFiles(path.join(SRC_ROOT, root)),
    );

    expect(files.length).toBeGreaterThan(0);

    const offenders = files.filter((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      return (
        content.includes('@/data/mock-data') ||
        content.includes('@/__tests__/fixtures/mock-data')
      );
    });

    expect(offenders).toEqual([]);
  });

  it('fixture module lives under the test boundary', () => {
    const fixturePath = path.join(SRC_ROOT, '__tests__/fixtures/mock-data.ts');
    expect(fs.existsSync(fixturePath)).toBe(true);
    // Deprecated production location must not exist
    expectFileAbsent('data/mock-data.ts');
  });
});

// ---------------------------------------------------------------------------
// 10. Production never uses mock Worldcoin verification
// ---------------------------------------------------------------------------

describe('worldcoin-client — production never mocks verification (V2-FE-016)', () => {
  it('shouldUseMockVerification returns false in production even when unconfigured', () => {
    const env = process.env as Record<string, string | undefined>;
    const prevNodeEnv = env.NODE_ENV;
    const prevAppId = env.NEXT_PUBLIC_WORLDCOIN_APP_ID;
    env.NODE_ENV = 'production';
    delete env.NEXT_PUBLIC_WORLDCOIN_APP_ID;

    try {
      expect(shouldUseMockVerification()).toBe(false);
    } finally {
      env.NODE_ENV = prevNodeEnv ?? 'test';
      if (prevAppId === undefined) {
        delete process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID;
      } else {
        process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID = prevAppId;
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 11. Fail clearly when real Web3 configuration is absent
// ---------------------------------------------------------------------------

describe('web3 config — fail clearly when absent (V2-FE-016)', () => {
  it('walletconnect guard throws a descriptive error in the browser when the project id is missing', () => {
    const prevProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

    try {
      expect(() => getWalletConnectProjectId()).toThrow(
        /NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID/,
      );
    } finally {
      if (prevProjectId === undefined) {
        delete process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      } else {
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = prevProjectId;
      }
    }
  });

  it('walletconnect guard returns the configured project id', () => {
    expect(getWalletConnectProjectId()).toBe(
      'test-fixture-walletconnect-project-id',
    );
  });
});