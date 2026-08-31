import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock wagmi so the hook can be tested without a real wallet connection.
let mockAddress: string | null = null
let mockIsConnected = false

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: mockAddress, isConnected: mockIsConnected }),
}))

afterEach(() => {
  jest.clearAllMocks()
})

describe('useAccount', () => {
  test('returns null when no wallet is connected', () => {
    const { useAccount } = require('../useAccount')

    function TestComp() {
      const account = useAccount()
      return <div data-testid="addr">{account?.address ?? 'null'}</div>
    }

    render(<TestComp />)
    expect(screen.getByTestId('addr')).toHaveTextContent('null')
  })

  test('returns the EVM address and a short display name when connected', () => {
    mockIsConnected = true
    mockAddress = '0x1234567890abcdef1234567890abcdef12345678'
    const { useAccount } = require('../useAccount')

    function TestComp() {
      const account = useAccount()
      return (
        <div>
          <span data-testid="addr">{account?.address ?? 'null'}</span>
          <span data-testid="display">{account?.displayName ?? 'null'}</span>
        </div>
      )
    }

    render(<TestComp />)
    expect(screen.getByTestId('addr')).toHaveTextContent(
      '0x1234567890abcdef1234567890abcdef12345678'
    )
    expect(screen.getByTestId('display')).toHaveTextContent('0x12...5678')
  })

  test('returns null when an address is present but the wallet is disconnected', () => {
    mockIsConnected = false
    mockAddress = '0x1234567890abcdef1234567890abcdef12345678'
    const { useAccount } = require('../useAccount')

    function TestComp() {
      const account = useAccount()
      return <div data-testid="addr">{account?.address ?? 'null'}</div>
    }

    render(<TestComp />)
    expect(screen.getByTestId('addr')).toHaveTextContent('null')
  })
})
