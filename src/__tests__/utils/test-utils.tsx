import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WebSocketProvider } from '@/components/providers/WebSocketProvider'
import { Providers } from '@/app/providers'

// Test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

// Custom render function with providers
interface AllTheProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
  wsConfig?: any
}

const AllTheProviders = ({ children, queryClient, wsConfig }: AllTheProvidersProps) => {
  const testQueryClient = queryClient || createTestQueryClient()
  
  return (
    <QueryClientProvider client={testQueryClient}>
      <WebSocketProvider config={wsConfig || { url: 'ws://test:8080' }}>
        {children}
      </WebSocketProvider>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient
    wsConfig?: any
  }
) => {
  const { queryClient, wsConfig, ...renderOptions } = options || {}
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders queryClient={queryClient} wsConfig={wsConfig}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Mock data generators
export const createMockClaim = (overrides = {}) => ({
  id: 'claim-1',
  title: 'Test Claim',
  description: 'This is a test claim',
  claimantAddress: '0x1234567890123456789012345678901234567890',
  status: 'OPEN',
  bountyAmount: 100,
  totalStaked: 0,
  evidence: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockVerification = (overrides = {}) => ({
  id: 'verification-1',
  claimId: 'claim-1',
  verifierAddress: '0x0987654321098765432109876543210987654321',
  decision: 'VERIFY',
  stakeAmount: 50,
  status: 'PENDING',
  createdAt: '2024-01-01T01:00:00Z',
  ...overrides,
})

export const createMockTrustInfo = (overrides = {}) => ({
  isVerified: true,
  reputation: 50,
  accountAgeDays: 30,
  suspicious: false,
  ...overrides,
})

// Mock API responses
export const mockFetchClaims = (claims: any[] = [createMockClaim()]) => {
  ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(claims),
    })
  )
}

export const mockFetchClaimDetail = (claim: any = createMockClaim()) => {
  ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(claim),
    })
  )
}

export const mockSubmitClaim = (claim: any = createMockClaim()) => {
  ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(claim),
    })
  )
}

export const mockSubmitVerification = (verification: any = createMockVerification()) => {
  ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(verification),
    })
  )
}

export const mockFetchError = (message = 'API Error') => {
  ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
    Promise.resolve({
      ok: false,
      status: 500,
      statusText: message,
    })
  )
}

// Mock WebSocket events
export const mockWebSocketEvent = (eventType: string, payload: any) => {
  const event = new MessageEvent('message', {
    data: JSON.stringify({
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
    }),
  })
  
  // Find WebSocket instances and trigger the event
  const wsInstances = (global.WebSocket as jest.Mock).mock.instances
  wsInstances.forEach((ws: any) => {
    const onMessageHandler = ws.addEventListener.mock.calls.find(
      ([event]) => event === 'message'
    )?.[1]
    
    if (onMessageHandler) {
      onMessageHandler(event)
    }
  })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { customRender as render }
