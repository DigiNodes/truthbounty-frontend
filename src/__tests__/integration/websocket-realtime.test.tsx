import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import { render, createMockClaim, createMockVerification, mockWebSocketEvent } from '../utils/test-utils'
import { setupMockServer } from '../mocks/server'

// Setup mock server
const server = setupMockServer()

// Mock WebSocket implementation
class MockWebSocket {
  static instances: MockWebSocket[] = []
  
  constructor(public url: string) {
    MockWebSocket.instances.push(this)
    setTimeout(() => {
      this.onopen?.(new Event('open'))
    }, 0)
  }

  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  addEventListener(event: string, handler: any) {
    switch (event) {
      case 'open':
        this.onopen = handler
        break
      case 'message':
        this.onmessage = handler
        break
      case 'error':
        this.onerror = handler
        break
      case 'close':
        this.onclose = handler
        break
    }
  }

  removeEventListener(event: string, handler: any) {
    switch (event) {
      case 'open':
        this.onopen = null
        break
      case 'message':
        this.onmessage = null
        break
      case 'error':
        this.onerror = null
        break
      case 'close':
        this.onclose = null
        break
    }
  }

  send(data: string) {
    // Mock sending - in real implementation this would send to server
  }

  close() {
    this.onclose?.(new CloseEvent('close'))
  }

  static simulateMessage(eventType: string, payload: any) {
    const message = new MessageEvent('message', {
      data: JSON.stringify({
        type: eventType,
        payload,
        timestamp: new Date().toISOString(),
      }),
    })

    this.instances.forEach(ws => {
      ws.onmessage?.(message)
    })
  }

  static clearInstances() {
    this.instances = []
  }
}

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket as any

describe('WebSocket Real-time Integration Tests', () => {
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
    MockWebSocket.clearInstances()
  })

  afterEach(() => {
    MockWebSocket.clearInstances()
  })

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection', async () => {
      function WebSocketTest() {
        const [isConnected, setIsConnected] = React.useState(false)
        const [lastMessage, setLastMessage] = React.useState<any>(null)

        React.useEffect(() => {
          const ws = new MockWebSocket('ws://localhost:8080')
          
          ws.addEventListener('open', () => {
            setIsConnected(true)
          })

          ws.addEventListener('message', (event: MessageEvent) => {
            const data = JSON.parse(event.data)
            setLastMessage(data)
          })

          return () => {
            ws.close()
          }
        }, [])

        return (
          <div>
            <div data-testid="connection-status">
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            {lastMessage && (
              <div data-testid="last-message">
                {lastMessage.type}: {JSON.stringify(lastMessage.payload)}
              </div>
            )}
          </div>
        )
      }

      render(<WebSocketTest />, { queryClient })

      // Should connect automatically
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument()
      })
    })

    it('should handle connection errors', async () => {
      class FailingWebSocket extends MockWebSocket {
        constructor(url: string) {
          super(url)
          setTimeout(() => {
            this.onerror?.(new Event('error'))
          }, 10)
        }
      }

      global.WebSocket = FailingWebSocket as any

      function WebSocketErrorTest() {
        const [error, setError] = React.useState<string | null>(null)

        React.useEffect(() => {
          const ws = new FailingWebSocket('ws://localhost:8080')
          
          ws.addEventListener('error', () => {
            setError('Connection failed')
          })

          return () => {
            ws.close()
          }
        }, [])

        return (
          <div>
            {error && <div data-testid="error">{error}</div>}
          </div>
        )
      }

      render(<WebSocketErrorTest />, { queryClient })

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument()
        expect(screen.getByText('Connection failed')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Claim Updates', () => {
    it('should update UI when claim is created', async () => {
      const newClaim = createMockClaim({
        id: 'new-claim',
        title: 'New Real-time Claim',
        status: 'OPEN'
      })

      function ClaimUpdatesTest() {
        const [claims, setClaims] = React.useState([createMockClaim()])
        const [lastEvent, setLastEvent] = React.useState<string | null>(null)

        React.useEffect(() => {
          const ws = new MockWebSocket('ws://localhost:8080')
          
          ws.addEventListener('message', (event: MessageEvent) => {
            const data = JSON.parse(event.data)
            setLastEvent(data.type)
            
            if (data.type === 'CLAIM_CREATED') {
              setClaims(prev => [...prev, data.payload])
            }
          })

          return () => {
            ws.close()
          }
        }, [])

        return (
          <div>
            <div data-testid="claims-count">{claims.length}</div>
            <div data-testid="last-event">{lastEvent || 'None'}</div>
            {claims.map(claim => (
              <div key={claim.id} data-testid={`claim-${claim.id}`}>
                {claim.title}
              </div>
            ))}
          </div>
        )
      }

      render(<ClaimUpdatesTest />, { queryClient })

      // Initial state
      expect(screen.getByTestId('claims-count')).toHaveTextContent('1')
      expect(screen.getByTestId('last-event')).toHaveTextContent('None')

      // Simulate new claim created
      MockWebSocket.simulateMessage('CLAIM_CREATED', newClaim)

      await waitFor(() => {
        expect(screen.getByTestId('claims-count')).toHaveTextContent('2')
        expect(screen.getByTestId('last-event')).toHaveTextContent('CLAIM_CREATED')
        expect(screen.getByTestId('claim-new-claim')).toBeInTheDocument()
        expect(screen.getByText('New Real-time Claim')).toBeInTheDocument()
      })
    })

    it('should update claim status in real-time', async () => {
      const mockClaim = createMockClaim({
        id: 'claim-1',
        title: 'Status Change Claim',
        status: 'OPEN'
      })

      function ClaimStatusTest() {
        const [claim, setClaim] = React.useState(mockClaim)

        React.useEffect(() => {
          const ws = new MockWebSocket('ws://localhost:8080')
          
          ws.addEventListener('message', (event: MessageEvent) => {
            const data = JSON.parse(event.data)
            
            if (data.type === 'CLAIM_STATUS_CHANGED' && data.payload.claimId === claim.id) {
              setClaim(prev => ({
                ...prev,
                status: data.payload.newStatus
              }))
            }
          })

          return () => {
            ws.close()
          }
        }, [claim.id])

        return (
          <div>
            <h3>{claim.title}</h3>
            <div data-testid="claim-status">{claim.status}</div>
          </div>
        )
      }

      render(<ClaimStatusTest />, { queryClient })

      // Initial status
      expect(screen.getByTestId('claim-status')).toHaveTextContent('OPEN')

      // Simulate status change
      MockWebSocket.simulateMessage('CLAIM_STATUS_CHANGED', {
        claimId: 'claim-1',
        oldStatus: 'OPEN',
        newStatus: 'UNDER_REVIEW'
      })

      await waitFor(() => {
        expect(screen.getByTestId('claim-status')).toHaveTextContent('UNDER_REVIEW')
      })
    })

    it('should handle multiple simultaneous updates', async () => {
      const mockClaim = createMockClaim({ id: 'claim-1', totalStaked: 0 })
      const verification1 = createMockVerification({ claimId: 'claim-1', stakeAmount: 50 })
      const verification2 = createMockVerification({ claimId: 'claim-1', stakeAmount: 75 })

      function MultipleUpdatesTest() {
        const [claim, setClaim] = React.useState(mockClaim)
        const [verifications, setVerifications] = React.useState([])
        const [updateCount, setUpdateCount] = React.useState(0)

        React.useEffect(() => {
          const ws = new MockWebSocket('ws://localhost:8080')
          
          ws.addEventListener('message', (event: MessageEvent) => {
            const data = JSON.parse(event.data)
            setUpdateCount(prev => prev + 1)
            
            if (data.type === 'VERIFICATION_ADDED' && data.payload.claimId === claim.id) {
              const verification = data.payload.verification
              setVerifications(prev => [...prev, verification])
              setClaim(prev => ({
                ...prev,
                totalStaked: prev.totalStaked + verification.stakeAmount
              }))
            }
          })

          return () => {
            ws.close()
          }
        }, [claim.id])

        return (
          <div>
            <div data-testid="update-count">{updateCount}</div>
            <div data-testid="total-staked">{claim.totalStaked}</div>
            <div data-testid="verification-count">{verifications.length}</div>
          </div>
        )
      }

      render(<MultipleUpdatesTest />, { queryClient })

      // Initial state
      expect(screen.getByTestId('update-count')).toHaveTextContent('0')
      expect(screen.getByTestId('total-staked')).toHaveTextContent('0')
      expect(screen.getByTestId('verification-count')).toHaveTextContent('0')

      // Simulate multiple verifications
      MockWebSocket.simulateMessage('VERIFICATION_ADDED', {
        claimId: 'claim-1',
        verification: verification1
      })

      MockWebSocket.simulateMessage('VERIFICATION_ADDED', {
        claimId: 'claim-1',
        verification: verification2
      })

      await waitFor(() => {
        expect(screen.getByTestId('update-count')).toHaveTextContent('2')
        expect(screen.getByTestId('total-staked')).toHaveTextContent('125') // 0 + 50 + 75
        expect(screen.getByTestId('verification-count')).toHaveTextContent('2')
      })
    })
  })

  describe('Leaderboard Updates', () => {
    it('should update leaderboard in real-time', async () => {
      const leaderboardUpdate = {
        address: '0x1234567890123456789012345678901234567890',
        reputation: 100,
        verifications: 10
      }

      function LeaderboardTest() {
        const [leaderboard, setLeaderboard] = React.useState([
          { address: '0x0987654321098765432109876543210987654321', reputation: 80, verifications: 8 }
        ])
        const [lastUpdate, setLastUpdate] = React.useState<string | null>(null)

        React.useEffect(() => {
          const ws = new MockWebSocket('ws://localhost:8080')
          
          ws.addEventListener('message', (event: MessageEvent) => {
            const data = JSON.parse(event.data)
            setLastUpdate(data.type)
            
            if (data.type === 'LEADERBOARD_UPDATED') {
              setLeaderboard(prev => {
                const updated = [...prev]
                const existingIndex = updated.findIndex(item => item.address === data.payload.address)
                
                if (existingIndex >= 0) {
                  updated[existingIndex] = data.payload
                } else {
                  updated.push(data.payload)
                }
                
                return updated.sort((a, b) => b.reputation - a.reputation)
              })
            }
          })

          return () => {
            ws.close()
          }
        }, [])

        return (
          <div>
            <div data-testid="last-update">{lastUpdate || 'None'}</div>
            <div data-testid="leaderboard-size">{leaderboard.length}</div>
            {leaderboard.map((entry, index) => (
              <div key={entry.address} data-testid={`leaderboard-${index}`}>
                {entry.address}: {entry.reputation} rep
              </div>
            ))}
          </div>
        )
      }

      render(<LeaderboardTest />, { queryClient })

      // Initial state
      expect(screen.getByTestId('leaderboard-size')).toHaveTextContent('1')
      expect(screen.getByTestId('last-update')).toHaveTextContent('None')

      // Simulate leaderboard update
      MockWebSocket.simulateMessage('LEADERBOARD_UPDATED', leaderboardUpdate)

      await waitFor(() => {
        expect(screen.getByTestId('leaderboard-size')).toHaveTextContent('2')
        expect(screen.getByTestId('last-update')).toHaveTextContent('LEADERBOARD_UPDATED')
        expect(screen.getByTestId('leaderboard-0')).toHaveTextContent('0x1234567890123456789012345678901234567890: 100 rep')
      })
    })
  })

  describe('Dispute Resolution', () => {
    it('should handle dispute events', async () => {
      const disputeEvent = {
        disputeId: 'dispute-1',
        claimId: 'claim-1',
        challenger: '0x1234567890123456789012345678901234567890',
        reason: 'False claim'
      }

      function DisputeTest() {
        const [disputes, setDisputes] = React.useState([])
        const [disputeCount, setDisputeCount] = React.useState(0)

        React.useEffect(() => {
          const ws = new MockWebSocket('ws://localhost:8080')
          
          ws.addEventListener('message', (event: MessageEvent) => {
            const data = JSON.parse(event.data)
            
            if (data.type === 'DISPUTE_CREATED') {
              setDisputes(prev => [...prev, data.payload])
              setDisputeCount(prev => prev + 1)
            } else if (data.type === 'DISPUTE_RESOLVED') {
              setDisputes(prev => 
                prev.map(d => d.id === data.payload.disputeId ? data.payload : d)
              )
            }
          })

          return () => {
            ws.close()
          }
        }, [])

        return (
          <div>
            <div data-testid="dispute-count">{disputeCount}</div>
            {disputes.map(dispute => (
              <div key={dispute.disputeId} data-testid={`dispute-${dispute.disputeId}`}>
                {dispute.reason}
              </div>
            ))}
          </div>
        )
      }

      render(<DisputeTest />, { queryClient })

      // Initial state
      expect(screen.getByTestId('dispute-count')).toHaveTextContent('0')

      // Simulate dispute created
      MockWebSocket.simulateMessage('DISPUTE_CREATED', disputeEvent)

      await waitFor(() => {
        expect(screen.getByTestId('dispute-count')).toHaveTextContent('1')
        expect(screen.getByTestId('dispute-dispute-1')).toHaveTextContent('False claim')
      })

      // Simulate dispute resolved
      MockWebSocket.simulateMessage('DISPUTE_RESOLVED', {
        ...disputeEvent,
        resolution: 'UPHELD',
        timestamp: new Date().toISOString()
      })

      await waitFor(() => {
        // Dispute count should remain the same (resolved, not removed)
        expect(screen.getByTestId('dispute-count')).toHaveTextContent('1')
      })
    })
  })

  describe('Connection Resilience', () => {
    it('should handle reconnection', async () => {
      function ReconnectionTest() {
        const [connectionStatus, setConnectionStatus] = React.useState('Disconnected')
        const [reconnectAttempts, setReconnectAttempts] = React.useState(0)

        React.useEffect(() => {
          let ws: MockWebSocket | null = null
          let reconnectTimeout: NodeJS.Timeout | null = null

          const connect = () => {
            ws = new MockWebSocket('ws://localhost:8080')
            
            ws.addEventListener('open', () => {
              setConnectionStatus('Connected')
            })

            ws.addEventListener('close', () => {
              setConnectionStatus('Disconnected')
              setReconnectAttempts(prev => prev + 1)
              
              // Simulate reconnection attempt
              reconnectTimeout = setTimeout(() => {
                connect()
              }, 1000)
            })
          }

          connect()

          return () => {
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout)
            }
            if (ws) {
              ws.close()
            }
          }
        }, [])

        return (
          <div>
            <div data-testid="connection-status">{connectionStatus}</div>
            <div data-testid="reconnect-attempts">{reconnectAttempts}</div>
          </div>
        )
      }

      render(<ReconnectionTest />, { queryClient })

      // Should connect initially
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected')
      })

      // Simulate connection loss
      MockWebSocket.instances.forEach(ws => ws.close())

      // Should show disconnected and attempt reconnection
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected')
        expect(screen.getByTestId('reconnect-attempts')).toHaveTextContent('1')
      }, { timeout: 2000 })

      // Should reconnect
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected')
      }, { timeout: 3000 })
    })
  })
})
