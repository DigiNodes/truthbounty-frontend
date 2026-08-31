/**
 * V2-FE-001 regression guard.
 *
 * Ensures the Stellar/Freighter runtime integration stays removed:
 *   - no `@stellar/*` dependencies in package.json
 *   - no Freighter / Stellar / steexp / soroban references in `src/`
 *
 * This test intentionally uses `fs` instead of jest module mocks so that a
 * re-import of `@stellar/freighter-api` fails CI before it can ship.
 */
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'src')

const FORBIDDEN_TOKENS = [
  '@stellar/',
  'steexp.com',
  'Freighter',
  'freighter',
  'soroban',
  'Soroban',
  'setAllowed',
]

// This guard itself must reference the forbidden tokens, so exclude it.
const SELF = 'stellar-freighter-removal.test.ts'

function collectSourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Never descend into build/generated directories.
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      files.push(...collectSourceFiles(full))
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      if (entry.name === SELF) continue
      files.push(full)
    }
  }
  return files
}

describe('V2-FE-001: Stellar / Freighter runtime integration is removed', () => {
  it('does not depend on any @stellar/* package in package.json', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    }
    const stellarDeps = Object.keys(allDeps).filter((dep) =>
      dep.startsWith('@stellar/')
    )
    expect(stellarDeps).toEqual([])
  })

  it('contains no Freighter/Stellar/steexp/soroban references in source files', () => {
    const offenders: string[] = []
    for (const file of collectSourceFiles(SRC)) {
      const content = fs.readFileSync(file, 'utf8')
      for (const token of FORBIDDEN_TOKENS) {
        if (content.includes(token)) {
          offenders.push(
            `${path.relative(SRC, file)} contains "${token}"`
          )
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('does not mock @stellar/freighter-api in any test file', () => {
    const offenders: string[] = []
    for (const file of collectSourceFiles(SRC)) {
      if (!file.includes('__tests__') && !file.endsWith('.test.tsx') && !file.endsWith('.test.ts')) {
        continue
      }
      const content = fs.readFileSync(file, 'utf8')
      if (content.includes('@stellar/freighter-api')) {
        offenders.push(path.relative(SRC, file))
      }
    }
    expect(offenders).toEqual([])
  })
})
