/**
 * V2-FE-001 regression guard.
 *
 * Ensures the Stellar/Freighter runtime integration stays removed:
 *   - no `@stellar/*` dependencies in package.json
 *   - no Freighter / Stellar / steexp / soroban references in runtime code
 *
 * Comments and test files that *document the removal* are allowed to name the
 * old integration; what must never come back is an actual module reference
 * (import / require / jest.mock / vi.mock) or a runtime usage token.
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

function isTestFile(filePath: string): boolean {
  return (
    filePath.includes(`${path.sep}__tests__${path.sep}`) ||
    /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath)
  )
}

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

/**
 * Strip block (`/* ... *\/`) and line (`//`) comments so prose that
 * documents the Freighter removal is not mistaken for runtime usage.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
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

  it('contains no Freighter/Stellar/steexp/soroban references in runtime source code', () => {
    const offenders: string[] = []
    for (const file of collectSourceFiles(SRC)) {
      // Test files legitimately assert the removal by naming the old module.
      if (isTestFile(file)) continue
      const code = stripComments(fs.readFileSync(file, 'utf8'))
      for (const token of FORBIDDEN_TOKENS) {
        if (code.includes(token)) {
          offenders.push(`${path.relative(SRC, file)} contains "${token}"`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('does not mock or import @stellar/freighter-api in any test file', () => {
    const offenders: string[] = []
    for (const file of collectSourceFiles(SRC)) {
      if (!isTestFile(file)) continue
      const content = fs.readFileSync(file, 'utf8')
      const runtimeReference =
        /(?:jest|vi)\.mock\(\s*['"]@stellar\/freighter-api['"]/.test(content) ||
        /(?:^|\n)\s*(?:import\s+[^'"]*\s+from\s+)?['"]@stellar\/freighter-api['"]/.test(
          content
        ) ||
        /\brequire\(\s*['"]@stellar\/freighter-api['"]\s*\)/.test(content)
      if (runtimeReference) {
        offenders.push(path.relative(SRC, file))
      }
    }
    expect(offenders).toEqual([])
  })
})
