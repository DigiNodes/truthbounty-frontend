import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// We'll reset modules between tests so module-level state is fresh
beforeEach(() => {
  jest.resetModules()
  // clear localStorage
  localStorage.clear()
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('useAccount', () => {
  test('returns address when connected and updates to null on manual disconnect', async () => {
    // Mock the freighter API
    const isConnectedMock = jest.fn()
    const getAddressMock = jest.fn()

    // initial: connected
    isConnectedMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    getAddressMock.mockResolvedValue({ address: 'GABCDEF' })

    jest.doMock('@stellar/freighter-api', () => ({
      isConnected: isConnectedMock,
      getAddress: getAddressMock,
    }))

    const { useAccount } = await import('../useAccount')

    function TestComp() {
      const account = useAccount()
      return <div data-testid="addr">{account?.address ?? 'null'}</div>
    }

    render(<TestComp />)

    // Wait for initial connected address
    await waitFor(() => expect(screen.getByTestId('addr')).toHaveTextContent('GABCDEF'))

    // Now simulate manual disconnect: change mock to return false and trigger focus
    isConnectedMock.mockResolvedValue(false)

    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => expect(screen.getByTestId('addr')).toHaveTextContent('null'))
  })

  test('persists connection and respects storage changes', async () => {
    const isConnectedMock = jest.fn()
    const getAddressMock = jest.fn()

    isConnectedMock.mockResolvedValue(true)
    getAddressMock.mockResolvedValue({ address: 'XYZ12345' })

    jest.doMock('@stellar/freighter-api', () => ({
      isConnected: isConnectedMock,
      getAddress: getAddressMock,
    }))

    const { useAccount } = await import('../useAccount')

    function TestComp() {
      const account = useAccount()
      return <div data-testid="addr2">{account?.address ?? 'null'}</div>
    }

    render(<TestComp />)

    await waitFor(() => expect(screen.getByTestId('addr2')).toHaveTextContent('XYZ12345'))

    // Simulate clearing storage from another tab
    act(() => {
      localStorage.removeItem('truthbounty-wallet-connection')
      window.dispatchEvent(new StorageEvent('storage', { key: 'truthbounty-wallet-connection' }))
    })

    await waitFor(() => expect(screen.getByTestId('addr2')).toHaveTextContent('null'))
  })
})
