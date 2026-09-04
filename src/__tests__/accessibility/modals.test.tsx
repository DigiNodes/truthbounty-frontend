import React from 'react'
import { render } from '../utils/test-utils'
import { assertAccessible } from '../utils/axe'

// Mock dependencies
jest.mock('@/hooks/useAccount', () => ({
  useAccount: () => ({ address: '0x123' }),
  useDisconnect: () => jest.fn(),
}))

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x123', isConnected: true }),
  useChainId: () => 11155420,
  usePublicClient: () => ({
    waitForTransactionReceipt: jest.fn(),
    simulateContract: jest.fn(),
  }),
  useReadContract: () => ({ data: 0n }),
  useWriteContract: () => ({ writeContractAsync: jest.fn() }),
  useConnectors: () => [],
  useConnect: () => ({
    connect: jest.fn(),
    connectors: [],
    isPending: false,
  }),
}))

// Claim contract config is required by useCreateClaimTransaction during render.
process.env.NEXT_PUBLIC_BOUNTY_CLAIM_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E'
process.env.NEXT_PUBLIC_BOUNTY_ASSET = '0x1234567890123456789012345678901234567890'
process.env.NEXT_PUBLIC_CLAIM_AMOUNT = '1000000000000000000'
process.env.NEXT_PUBLIC_CLAIM_CONFIG_HASH = '0xabc'
process.env.NEXT_PUBLIC_EXPECTED_CHAIN_ID = '11155420'

jest.mock('@/app/queries/claims.queries', () => ({
  useSubmitClaim: () => ({ mutateAsync: jest.fn(), isLoading: false }),
}))

jest.mock('@/components/hooks/useTrust', () => ({
  useTrust: () => ({
    reputation: 50,
    isVerified: true,
    accountAgeDays: 30,
    suspicious: false,
  }),
}))

jest.mock('@/components/providers/FeatureFlagProvider', () => ({
  useFeatureFlags: () => ({ isEnabled: () => true }),
}))

jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    connectionState: 'connected',
    lastMessage: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: () => jest.fn(),
    send: jest.fn(),
  }),
}))

describe('Accessibility: Modals and Dialogs', () => {
  it('ClaimSubmissionForm should have no axe violations', async () => {
    const ClaimSubmissionForm = (await import('@/components/features/claim-submission/ClaimSubmissionForm')).default
    const { container } = render(
      <ClaimSubmissionForm onSubmit={jest.fn()} onClose={jest.fn()} />
    )
    await assertAccessible(container)
  })

  it('TrustExplanationModal should have no axe violations', async () => {
    const TrustExplanationModal = (await import('@/components/ui/TrustExplanationModal')).default
    const { container } = render(
      <TrustExplanationModal onClose={jest.fn()} />
    )
    await assertAccessible(container)
  })
})
