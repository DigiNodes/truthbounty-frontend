# Integration Tests for Claim Flow

This directory contains comprehensive integration tests for the TruthBounty claim submission → verification → resolution flow.

## Test Structure

```
src/__tests__/
├── integration/
│   ├── claim-submission.test.tsx      # Claim submission form tests
│   ├── verification-flow.test.tsx      # Verification process tests
│   ├── claim-lifecycle.test.tsx        # End-to-end claim lifecycle tests
│   └── websocket-realtime.test.tsx     # Real-time WebSocket tests
├── utils/
│   └── test-utils.tsx                  # Shared testing utilities
├── mocks/
│   ├── handlers.ts                     # API mock handlers
│   └── server.ts                       # Mock server setup
└── README.md                           # This file
```

## Test Coverage

### 1. Claim Submission Tests (`claim-submission.test.tsx`)
- Form validation and submission
- Trust system integration
- API error handling
- Loading states
- Accessibility compliance

### 2. Verification Flow Tests (`verification-flow.test.tsx`)
- Verification actions (verify/reject)
- Stake form validation
- Claim details display
- Error handling
- Full verification workflow

### 3. Claim Lifecycle Tests (`claim-lifecycle.test.tsx`)
- Complete claim flow from submission to resolution
- Real-time status updates
- Error recovery
- Data consistency
- Multi-step workflows

### 4. WebSocket Real-time Tests (`websocket-realtime.test.tsx`)
- WebSocket connection management
- Real-time claim updates
- Leaderboard updates
- Dispute resolution events
- Connection resilience and reconnection

## Setup and Configuration

### Prerequisites
The tests require the following development dependencies:
- `@testing-library/react`
- `@testing-library/user-event`
- `@testing-library/jest-dom`
- `jest`
- `@types/jest`

### Configuration Files
- `jest.config.js` - Jest configuration with Next.js integration
- `jest.setup.js` - Global test setup with mocks and utilities

## Running Tests

```bash
# Run all integration tests
npm test -- src/__tests__/integration

# Run specific test file
npm test -- src/__tests__/integration/claim-submission.test.tsx

# Run tests with coverage
npm test -- --coverage src/__tests__/integration

# Run tests in watch mode
npm test -- --watch src/__tests__/integration
```

## Test Utilities

### Mock Data Generators
```typescript
import { createMockClaim, createMockVerification } from '../utils/test-utils'

const claim = createMockClaim({
  title: 'Test Claim',
  status: 'OPEN'
})

const verification = createMockVerification({
  decision: 'VERIFY',
  stakeAmount: 50
})
```

### API Mocking
```typescript
import { mockSubmitClaim, mockFetchError } from '../utils/test-utils'

// Mock successful API call
mockSubmitClaim(mockClaim)

// Mock API error
mockFetchError('Network error')
```

### WebSocket Event Simulation
```typescript
import { mockWebSocketEvent } from '../utils/test-utils'

// Simulate real-time event
mockWebSocketEvent('CLAIM_CREATED', {
  claimId: 'new-claim',
  title: 'New Claim'
})
```

## Test Patterns

### 1. Component Integration Tests
Test how components work together with real data flow:
```typescript
it('should submit claim and update UI', async () => {
  mockSubmitClaim(mockClaim)
  
  render(<ClaimSubmissionForm />)
  
  // Fill form and submit
  await user.type(screen.getByPlaceholderText('Title'), 'Test Claim')
  await user.click(screen.getByRole('button', { name: 'Submit' }))
  
  // Verify API was called
  await waitFor(() => {
    expect(submitClaim).toHaveBeenCalledWith(expectedPayload)
  })
})
```

### 2. Real-time Updates Tests
Test WebSocket integration:
```typescript
it('should update UI when claim status changes', async () => {
  render(<ClaimStatusComponent claim={mockClaim} />)
  
  // Simulate WebSocket event
  mockWebSocketEvent('CLAIM_STATUS_CHANGED', {
    claimId: 'claim-1',
    newStatus: 'VERIFIED'
  })
  
  // Verify UI updated
  await waitFor(() => {
    expect(screen.getByText('VERIFIED')).toBeInTheDocument()
  })
})
```

### 3. Error Handling Tests
Test error scenarios:
```typescript
it('should handle API errors gracefully', async () => {
  mockSubmitClaim.mockRejectedValue(new Error('API Error'))
  
  render(<ClaimSubmissionForm />)
  
  await user.click(screen.getByRole('button', { name: 'Submit' }))
  
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
```

## Mock Server Setup

The test suite uses a custom mock server implementation that:
- Intercepts HTTP requests
- Provides consistent mock responses
- Supports dynamic response overriding
- Handles WebSocket event simulation

### Usage
```typescript
import { setupMockServer } from '../mocks/server'

const server = setupMockServer()

// Override specific handler
server.use({
  url: '/api/claims',
  method: 'POST',
  response: { id: 'custom-claim', title: 'Custom Response' }
})
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up mocks and state between tests
- Use fresh query clients for each test

### 2. Realistic User Interactions
- Use `userEvent` for realistic user behavior
- Test keyboard navigation and accessibility
- Include loading and error states

### 3. Comprehensive Coverage
- Test happy paths and error scenarios
- Include edge cases and boundary conditions
- Verify both UI updates and API interactions

### 4. Performance Considerations
- Use appropriate timeouts for async operations
- Avoid unnecessary waiting in tests
- Mock expensive operations

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure all test dependencies are installed
```bash
npm install --save-dev @types/jest @types/react @testing-library/react
```

2. **Mock Configuration**: Check that mocks are properly set up in `jest.setup.js`

3. **Async Timeouts**: Increase timeout values for slow operations:
```typescript
it('should handle slow operations', async () => {
  // ... test code
}, { timeout: 10000 })
```

4. **WebSocket Issues**: Ensure WebSocket mock is properly configured:
```typescript
global.WebSocket = MockWebSocket
```

### Debug Tips

1. **Use `screen.debug()`** to inspect rendered DOM
2. **Add `console.log`** in test utilities for debugging
3. **Check mock call history** with `mock.calls`
4. **Verify query client state** in React Query tests

## Coverage Goals

The integration tests aim for:
- **90%+** coverage of claim-related components
- **100%** coverage of critical user flows
- **All** error scenarios tested
- **Complete** WebSocket event handling tested

## Future Enhancements

1. **Visual Regression Testing**: Add screenshot comparison tests
2. **Performance Testing**: Add render time and memory usage tests
3. **Cross-browser Testing**: Extend test suite for multiple browsers
4. **Load Testing**: Add tests for high-volume scenarios
5. **Mobile Testing**: Add mobile-specific interaction tests

## Contributing

When adding new integration tests:

1. Follow the established patterns and naming conventions
2. Add comprehensive test cases for new features
3. Update mock data generators as needed
4. Document any new test utilities or patterns
5. Ensure all tests pass before submitting PRs

## Related Documentation

- [Frontend Architecture](../../../docs/ARCHITECTURE.md)
- [Component Documentation](../../../src/components/README.md)
- [API Documentation](../../../src/app/api/README.md)
- [Jest Configuration](../../../jest.config.js)
