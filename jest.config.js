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
  testEnvironment: 'jest-environment-jsdom',
  // Only pick up unit/integration tests. Playwright (e2e/*.spec.ts) and
  // Vitest (*.spec.ts) specs run through their own runners.
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.[jt]s?(x)',
    '<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)',
    '<rootDir>/**/*.test.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/e2e/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/app/layout.tsx',
    '!src/app/providers.tsx',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
const baseJestConfig = createJestConfig(customJestConfig)

// wagmi/viem/@wagmi/abitype/@tanstack ship ESM (and pnpm installs them under
// node_modules/.pnpm), so transform them explicitly instead of ignoring them.
// next/jest's default ignores every .pnpm package, which breaks their parsing.
module.exports = async () => {
  const config = await baseJestConfig()
  config.transformIgnorePatterns = [
    '/node_modules/(?!.pnpm)(?!(wagmi|@wagmi|viem|abitype|@tanstack)/)',
    '/node_modules/.pnpm/(?!(wagmi|@wagmi|viem|abitype|@tanstack)(@|\\+))',
    '^.+\\.module\\.(css|sass|scss)$',
  ]
  return config
}
