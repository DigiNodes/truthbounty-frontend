import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'
import { queryClient } from './src/app/queries/queryClient'
import { TextEncoder, TextDecoder } from 'util'

// Register the jest-axe a11y matcher used by src/__tests__/utils/axe.ts
expect.extend(toHaveNoViolations)

// jsdom does not expose TextEncoder/TextDecoder, but viem (imported by the
// contracts registry and hooks) requires them at module load time.
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Test fixture: wagmi.tsx fails fast in the browser when
// NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is absent (V2-FE-016). Tests only
// need a non-empty string — production requires a real value (see
// .env.example).
process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'test-fixture-walletconnect-project-id'

// Polyfill TextEncoder/TextDecoder for libraries (e.g. viem) in the jsdom env.
// Node provides these; jsdom's global scope may not expose them to bundled code.
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('node:util')
  globalThis.TextEncoder = TextEncoder
  globalThis.TextDecoder = TextDecoder
}

// Mock WebSocket for testing
global.WebSocket = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1, // OPEN
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock localStorage with in-memory behavior so tests can observe persisted state.
const storage = new Map()
const localStorageMock = {
  getItem: jest.fn((key) => (storage.has(key) ? storage.get(key) : null)),
  setItem: jest.fn((key, value) => {
    storage.set(String(key), String(value))
  }),
  removeItem: jest.fn((key) => {
    storage.delete(String(key))
  }),
  clear: jest.fn(() => {
    storage.clear()
  }),
}
global.localStorage = localStorageMock

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  storage.clear()
  queryClient.clear()
})
