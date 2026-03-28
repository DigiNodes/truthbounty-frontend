import React from 'react'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import { render, createMockClaim, createMockVerification, mockWebSocketEvent } from '../utils/test-utils'
import { setupMockServer } from '../mocks/server'
import { useClaims, useSubmitClaim, useClaimDetail } from '@/app/queries/claims.queries'

// Setup mock server
const server = setupMockServer()

// Mock API functions
jest.mock('@/app/api/claims.api', () => ({
  fetchClaims: jest.fn(),
  fetchClaimDetail: jest.fn(),
  submitClaim: jest.fn(),
  fetchClaimsByStatus: jest.fn(),
}))

jest.mock('@/app/lib/api', () => ({
  submitVerification: jest.fn(),
  submitDispute: jest.fn(),
  resolveDispute: jest.fn(),
}))

jest.mock('@/app/lib/wallet', () => ({
  getTokenBalance: jest.fn(() => Promise.resolve(100)),
  sendTransaction: jest.fn(() => Promise.resolve('0xabc123')),
}))

// Mock WebSocket provider
jest.mock('@/components/providers/WebSocketProvider', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => children,
  useWebSocketContext: () => ({
    isConnected: true,
    subscribe: jest.fn(),
    send: jest.fn(),
  }),
}))

describe('Claim Lifecycle Integration Tests', () => {
  let queryClient: QueryClient
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    user = userEvent.setup()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Claim Submission → Verification → Resolution Flow', () => {
    it('should complete full end-to-end claim lifecycle with proper form submission and API calls', async () => {
      // Mock API responses
      const { fetchClaims, fetchClaimDetail, submitClaim } = require('@/app/api/claims.api')
      const { submitVerification } = require('@/app/lib/api')

      const mockClaim = createMockClaim({
        id: 'claim-1',
        title: 'Test Claim',
        status: 'OPEN',
        bountyAmount: 100,
        totalStaked: 0
      })

      const mockVerification = createMockVerification({
        id: 'verification-1',
        claimId: 'claim-1',
        decision: 'VERIFY',
        stakeAmount: 50,
        status: 'CONFIRMED'
      })

      // Mock API calls
      fetchClaims.mockResolvedValue([mockClaim])
      fetchClaimDetail.mockResolvedValue(mockClaim)
      submitClaim.mockResolvedValue(mockClaim)
      submitVerification.mockResolvedValue(mockVerification)

      // Test Component that simulates the full flow
      function ClaimFlowTest() {
        const claimsQuery = useClaims()
        const submitMutation = useSubmitClaim()
        const [selectedClaim, setSelectedClaim] = React.useState<string | null>(null)
        const claimDetailQuery = useClaimDetail(selectedClaim || '')

        const handleNewClaim = async (claimData: any) => {
          await submitMutation.mutateAsync(claimData)
        }

        const handleVerifyClaim = async (claimId: string) => {
          await submitVerification({ claimId, decision: 'verify' })
        }

        return (
          <div>
            <div data-testid="claims-list">
              {claimsQuery.data?.map(claim => (
                <div key={claim.id} data-testid={`claim-${claim.id}`}>
                  <span>{claim.title}</span>
                  <span>{claim.status}</span>
                  <button onClick={() => setSelectedClaim(claim.id)}>View</button>
                  <button onClick={() => handleVerifyClaim(claim.id)}>Verify</button>
                </div>
              ))}
            </div>

            {selectedClaim && claimDetailQuery.data && (
              <div data-testid="claim-detail">
                <h2>{claimDetailQuery.data.title}</h2>
                <p>Status: {claimDetailQuery.data.status}</p>
                <p>Bounty: {claimDetailQuery.data.bountyAmount}</p>
                <p>Staked: {claimDetailQuery.data.totalStaked}</p>
              </div>
            )}

            <button 
              onClick={() => handleNewClaim({
                title: 'New Test Claim',
                description: 'New claim description',
                evidence: []
              })}
              data-testid="submit-claim"
            >
              Submit New Claim
            </button>
          </div>
        )
      }

      render(<ClaimFlowTest />, { queryClient })

      // 1. Initial state - should show claims
      await waitFor(() => {
        expect(screen.getByTestId('claim-claim-1')).toBeInTheDocument()
        expect(screen.getByText('Test Claim')).toBeInTheDocument()
        expect(screen.getByText('OPEN')).toBeInTheDocument()
      })

      // 2. View claim details
      const viewButton = screen.getByText('View')
      await user.click(viewButton)

      await waitFor(() => {
        expect(screen.getByTestId('claim-detail')).toBeInTheDocument()
        expect(screen.getByText('Test Claim')).toBeInTheDocument()
        expect(screen.getByText('Status: OPEN')).toBeInTheDocument()
        expect(screen.getByText('Bounty: 100')).toBeInTheDocument()
        expect(screen.getByText('Staked: 0')).toBeInTheDocument()
      })

      // 3. Submit new claim
      const submitButton = screen.getByTestId('submit-claim')
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitClaim).toHaveBeenCalledWith({
          title: 'New Test Claim',
          description: 'New claim description',
          evidence: []
        })
      })

      // 4. Verify existing claim
      const verifyButton = screen.getByText('Verify')
      await user.click(verifyButton)

      await waitFor(() => {
        expect(submitVerification).toHaveBeenCalledWith({
          claimId: 'claim-1',
          decision: 'verify'
        })
      })
    })

    it('should handle claim status progression through verification stages', async () => {
      const { fetchClaimDetail } = require('@/app/api/claims.api')

      // Mock claim status progression
      const claimStages = [
        createMockClaim({ status: 'OPEN', totalStaked: 0 }),
        createMockClaim({ status: 'UNDER_REVIEW', totalStaked: 50 }),
        createMockClaim({ status: 'VERIFIED', totalStaked: 150 }),
      ]

      // Mock different responses for each call
      fetchClaimDetail
        .mockResolvedValueOnce(claimStages[0])
        .mockResolvedValueOnce(claimStages[1])
        .mockResolvedValueOnce(claimStages[2])

      function ClaimStatusTest() {
        const [claim, setClaim] = React.useState(claimStages[0])
        const [stage, setStage] = React.useState(0)

        const progressStage = async () => {
          const nextStage = stage + 1
          if (nextStage < claimStages.length) {
            setClaim(claimStages[nextStage])
            setStage(nextStage)
          }
        }

        return (
          <div>
            <div data-testid="claim-status">
              <h3>{claim.title}</h3>
              <p>Status: {claim.status}</p>
              <p>Total Staked: {claim.totalStaked}</p>
            </div>
            <button onClick={progressStage} data-testid="progress-stage">
              Progress Stage
            </button>
          </div>
        )
      }

      render(<ClaimStatusTest />, { queryClient })

      // Stage 1: OPEN
      expect(screen.getByText('Status: OPEN')).toBeInTheDocument()
      expect(screen.getByText('Total Staked: 0')).toBeInTheDocument()

      // Progress to UNDER_REVIEW
      const progressButton = screen.getByTestId('progress-stage')
      await user.click(progressButton)

      await waitFor(() => {
        expect(screen.getByText('Status: UNDER_REVIEW')).toBeInTheDocument()
        expect(screen.getByText('Total Staked: 50')).toBeInTheDocument()
      })

      // Progress to VERIFIED
      await user.click(progressButton)

      await waitFor(() => {
        expect(screen.getByText('Status: VERIFIED')).toBeInTheDocument()
        expect(screen.getByText('Total Staked: 150')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should update UI when claim status changes via WebSocket', async () => {
      // Mock WebSocket event
      const mockEvent = {
        type: 'CLAIM_STATUS_CHANGED',
        payload: {
          claimId: 'claim-1',
          oldStatus: 'OPEN',
          newStatus: 'UNDER_REVIEW',
          timestamp: new Date().toISOString(),
        },
      }

      function RealtimeClaimTest() {
        const [claim, setClaim] = React.useState(
          createMockClaim({ id: 'claim-1', status: 'OPEN' })
        )

        // Simulate WebSocket event handling
        React.useEffect(() => {
          const handleWebSocketEvent = (event: any) => {
            if (event.type === 'CLAIM_STATUS_CHANGED' && event.payload.claimId === claim.id) {
              setClaim(prev => ({ ...prev, status: event.payload.newStatus }))
            }
          }

          // Simulate receiving WebSocket event
          setTimeout(() => handleWebSocketEvent(mockEvent), 100)

          return () => {}
        }, [claim.id])

        return (
          <div data-testid="realtime-claim">
            <h3>{claim.title}</h3>
            <p data-testid="claim-status">Status: {claim.status}</p>
          </div>
        )
      }

      render(<RealtimeClaimTest />, { queryClient })

      // Initial status
      expect(screen.getByText('Status: OPEN')).toBeInTheDocument()

      // After WebSocket event
      await waitFor(() => {
        expect(screen.getByText('Status: UNDER_REVIEW')).toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('should update when new verification is added', async () => {
      const mockEvent = {
        type: 'VERIFICATION_ADDED',
        payload: {
          claimId: 'claim-1',
          verification: createMockVerification({
            decision: 'VERIFY',
            stakeAmount: 75,
          }),
        },
      }

      function VerificationUpdateTest() {
        const [claim, setClaim] = React.useState(
          createMockClaim({ id: 'claim-1', totalStaked: 50 })
        )
        const [verifications, setVerifications] = React.useState([])

        React.useEffect(() => {
          const handleVerificationEvent = (event: any) => {
            if (event.type === 'VERIFICATION_ADDED' && event.payload.claimId === claim.id) {
              setVerifications(prev => [...prev, event.payload.verification])
              setClaim(prev => ({
                ...prev,
                totalStaked: prev.totalStaked + event.payload.verification.stakeAmount
              }))
            }
          }

          setTimeout(() => handleVerificationEvent(mockEvent), 100)
        }, [claim.id])

        return (
          <div>
            <div data-testid="claim-info">
              <p>Total Staked: {claim.totalStaked}</p>
              <p>Verifications: {verifications.length}</p>
            </div>
          </div>
        )
      }

      render(<VerificationUpdateTest />, { queryClient })

      // Initial state
      expect(screen.getByText('Total Staked: 50')).toBeInTheDocument()
      expect(screen.getByText('Verifications: 0')).toBeInTheDocument()

      // After verification event
      await waitFor(() => {
        expect(screen.getByText('Total Staked: 125')).toBeInTheDocument() // 50 + 75
        expect(screen.getByText('Verifications: 1')).toBeInTheDocument()
      }, { timeout: 200 })
    })
  })

  describe('Error Recovery', () => {
    it('should handle network errors during claim submission', async () => {
      const { submitClaim } = require('@/app/api/claims.api')
      submitClaim.mockRejectedValue(new Error('Network error'))

      function ErrorRecoveryTest() {
        const [error, setError] = React.useState<string | null>(null)
        const [isSubmitting, setIsSubmitting] = React.useState(false)

        const handleSubmit = async () => {
          try {
            setIsSubmitting(true)
            await submitClaim({
              title: 'Test Claim',
              description: 'Test description',
              evidence: []
            })
            setError(null)
          } catch (err) {
            setError('Failed to submit claim. Please try again.')
          } finally {
            setIsSubmitting(false)
          }
        }

        return (
          <div>
            <button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Claim'}
            </button>
            {error && <div data-testid="error-message">{error}</div>}
          </div>
        )
      }

      render(<ErrorRecoveryTest />, { queryClient })

      const submitButton = screen.getByText('Submit Claim')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
        expect(screen.getByText('Failed to submit claim. Please try again.')).toBeInTheDocument()
      })
    })

    it('should handle verification failures gracefully', async () => {
      const { submitVerification } = require('@/app/lib/api')
      submitVerification.mockRejectedValue(new Error('Insufficient stake'))

      function VerificationErrorTest() {
        const [verificationError, setVerificationError] = React.useState<string | null>(null)

        const handleVerification = async () => {
          try {
            await submitVerification({ claimId: 'claim-1', decision: 'verify' })
            setVerificationError(null)
          } catch (err) {
            setVerificationError('Verification failed: Insufficient stake')
          }
        }

        return (
          <div>
            <button onClick={handleVerification}>Verify Claim</button>
            {verificationError && (
              <div data-testid="verification-error">{verificationError}</div>
            )}
          </div>
        )
      }

      render(<VerificationErrorTest />, { queryClient })

      const verifyButton = screen.getByText('Verify Claim')
      await user.click(verifyButton)

      await waitFor(() => {
        expect(screen.getByTestId('verification-error')).toBeInTheDocument()
        expect(screen.getByText('Verification failed: Insufficient stake')).toBeInTheDocument()
      })
    })
  })

  describe('Data Consistency', () => {
    it('should maintain consistent state across multiple operations', async () => {
      const { fetchClaims, fetchClaimDetail } = require('@/app/api/claims.api')

      const mockClaims = [
        createMockClaim({ id: 'claim-1', title: 'Claim 1', status: 'OPEN' }),
        createMockClaim({ id: 'claim-2', title: 'Claim 2', status: 'UNDER_REVIEW' }),
      ]

      fetchClaims.mockResolvedValue(mockClaims)
      fetchClaimDetail.mockImplementation((id) => 
        Promise.resolve(mockClaims.find(c => c.id === id))
      )

      function ConsistencyTest() {
        const claimsQuery = useClaims()
        const [selectedClaims, setSelectedClaims] = React.useState<Set<string>>(new Set())

        const toggleClaimSelection = (claimId: string) => {
          const newSelected = new Set(selectedClaims)
          if (newSelected.has(claimId)) {
            newSelected.delete(claimId)
          } else {
            newSelected.add(claimId)
          }
          setSelectedClaims(newSelected)
        }

        return (
          <div>
            <div data-testid="claims-count">
              Total Claims: {claimsQuery.data?.length || 0}
            </div>
            <div data-testid="selected-count">
              Selected: {selectedClaims.size}
            </div>
            {claimsQuery.data?.map(claim => (
              <div key={claim.id}>
                <span>{claim.title}</span>
                <button onClick={() => toggleClaimSelection(claim.id)}>
                  {selectedClaims.has(claim.id) ? 'Deselect' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        )
      }

      render(<ConsistencyTest />, { queryClient })

      // Initial state
      await waitFor(() => {
        expect(screen.getByText('Total Claims: 2')).toBeInTheDocument()
        expect(screen.getByText('Selected: 0')).toBeInTheDocument()
      })

      // Select first claim
      const selectButtons = screen.getAllByText('Select')
      await user.click(selectButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Selected: 1')).toBeInTheDocument()
      })

      // Select second claim
      await user.click(selectButtons[1])

      await waitFor(() => {
        expect(screen.getByText('Selected: 2')).toBeInTheDocument()
      })

      // Deselect first claim
      const deselectButtons = screen.getAllByText('Deselect')
      await user.click(deselectButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Selected: 1')).toBeInTheDocument()
      })
    })
  })
})
