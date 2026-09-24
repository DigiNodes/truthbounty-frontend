import React from 'react'
import { render } from '../utils/test-utils'
import { assertAccessible } from '../utils/axe'

// Mock dependencies
jest.mock('@/hooks/useAccount', () => ({
  useAccount: () => ({ address: '0x123' }),
  useDisconnect: () => jest.fn(),
}))

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
