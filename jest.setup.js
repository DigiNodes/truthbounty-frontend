import '@testing-library/jest-dom'
import { queryClient } from './src/app/queries/queryClient'

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
