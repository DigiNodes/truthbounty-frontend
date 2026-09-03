/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Only treat `*.test.*` / `*.spec.*` as suites. The jest default ALSO runs
  // any file under a `__tests__` directory — which executed helpers and
  // fixtures (mocks/handlers.ts, __tests__/fixtures/mock-data.ts, …) as
  // empty suites. e2e/*.spec.ts is Playwright-only and runs via `test:e2e`.
  testMatch: [
    '<rootDir>/src/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.spec.{js,jsx,ts,tsx}',
  ],
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/app/layout.tsx',
    '!src/app/providers.tsx',
  ],
  // coverageThreshold is intentionally left unset: the repo's suite is only
  // now being brought to green and thresholds would block CI.
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = async (...args) => {
  const config = await createJestConfig(customJestConfig)(...args)

  // next/jest prepends patterns that ignore ALL of node_modules (including
  // pnpm's `.pnpm` store) — wagmi / rainbowkit ship untranspiled ESM there,
  // so without this override jest crashes with 'Cannot use import statement
  // outside a module'. Whitelist the pnpm store plus the ESM packages; SWC
  // (via next/jest's transform) converts them to CJS on the fly.
  config.transformIgnorePatterns = [
    '/node_modules/(?!(\.pnpm|@rainbow-me|wagmi|@wagmi|@coinbase|@walletconnect|zustand|use-sync-external-store|@tanstack|viem))/',
  ]

  return config
}