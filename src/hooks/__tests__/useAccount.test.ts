import { renderHook } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('useAccount (EVM/Wagmi)', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('returns formatted address and displayName when connected', async () => {
    jest.doMock('wagmi', () => ({
      useAccount: () => ({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
        chainId: 10,
        isConnected: true,
      }),
      useDisconnect: () => ({
        disconnect: jest.fn(),
      }),
    }))

    const { useAccount } = await import('../useAccount')
    const { result } = renderHook(() => useAccount())

    expect(result.current).not.toBeNull()
    expect(result.current?.address).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E')
    expect(result.current?.displayName).toBe('0x742d…eB1E')
    expect(result.current?.chainId).toBe(10)
    expect(result.current?.isConnected).toBe(true)
  })

  test('returns null when disconnected', async () => {
    jest.doMock('wagmi', () => ({
      useAccount: () => ({
        address: undefined,
        chainId: undefined,
        isConnected: false,
      }),
      useDisconnect: () => ({
        disconnect: jest.fn(),
      }),
    }))

    const { useAccount } = await import('../useAccount')
    const { result } = renderHook(() => useAccount())

    expect(result.current).toBeNull()
  })
})
