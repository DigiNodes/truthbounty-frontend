/**
 * Regression guard: production UI paths must not import mock data.
 *
 * These tests do a fast static scan of the source files for the 5 audit
 * targets identified in the mock-removal issue. They catch any accidental
 * re-introduction of mock-data imports before the code ships.
 *
 * Adding a new audit target: add its path to AUDIT_TARGETS below.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../');

function src(relative: string) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf-8');
}

// The symbols that were removed from production code in this issue.
const BANNED_SYMBOLS = [
  'platformStats',
  'activityData',
  'verificationNodes',
  'activeClaims',
  'claimableRewards',
];

const AUDIT_TARGETS = [
  'components/features/StatsCards.tsx',
  'components/features/ActivityAndNodes.tsx',
  'components/features/VerificationNodes.tsx',
  'components/features/ActiveClaimsTable.tsx',
  'hooks/useRewards.ts',
];

describe('no mock-data imports in production UI paths', () => {
  for (const target of AUDIT_TARGETS) {
    it(`${target} does not import from @/data/mock-data`, () => {
      const content = src(target);
      expect(content).not.toMatch(/from ['"]@\/data\/mock-data['"]/);
    });
  }

  it('mock-data.ts does not export the banned UI symbols', () => {
    const content = src('data/mock-data.ts');
    for (const symbol of BANNED_SYMBOLS) {
      expect(content).not.toMatch(new RegExp(`export (const|function|type) ${symbol}\\b`));
    }
  });

  it('no production source outside __tests__ imports the banned symbols from mock-data', () => {
    // Walk src/, skip __tests__ and *.stories.*
    function walk(dir: string): string[] {
      return fs.readdirSync(dir).flatMap((entry) => {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) {
          if (entry === '__tests__' || entry === 'node_modules') return [];
          return walk(full);
        }
        if (/\.(ts|tsx)$/.test(entry) && !/\.stories\./.test(entry)) {
          return [full];
        }
        return [];
      });
    }

    const files = walk(ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (!content.includes('@/data/mock-data')) continue;

      const hasBanned = BANNED_SYMBOLS.some((sym) =>
        content.includes(sym)
      );
      if (hasBanned) {
        violations.push(path.relative(ROOT, file));
      }
    }

    expect(violations).toEqual([]);
  });

  it('useTrust does not use Math.random for trust values', () => {
    const content = src('components/hooks/useTrust.ts');
    expect(content).not.toContain('Math.random');
  });
});
