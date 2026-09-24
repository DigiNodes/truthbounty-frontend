# Frontend Architecture Documentation

## Overview

TruthBounty Frontend is a decentralized news verification platform built with Next.js 14+, React 19, and TypeScript. The architecture follows modern React patterns with a focus on real-time data synchronization, type safety, and component reusability.

## Tech Stack

### Core Framework
- **Next.js 16.1.6** - React framework with App Router
- **React 19.2.3** - UI library with latest features
- **TypeScript 5** - Type-safe development

### State Management & Data Fetching
- **@tanstack/react-query 5.28.0** - Server state management
- **WebSocket Integration** - Real-time data synchronization
- **Axios 1.6.0** - HTTP client for API calls

### UI & Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Component library (configured via components.json)
- **Lucide React** - Icon library
- **Radix UI** - Accessible component primitives

### Blockchain Integration
- **Wagmi 2.5.0** - Ethereum wallet integration
- **RainbowKit 2.0.0** - Wallet connection UI
- **Viem 2.7.0** - Ethereum TypeScript interface

### Testing & Quality
- **Jest 29.7.0** - Unit testing
- **Playwright 1.40.0** - E2E testing
- **ESLint 9** - Code linting
- **Prettier 3.1.0** - Code formatting

## Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Route group for dashboard pages
│   │   ├── claim-detail/        # Individual claim details page
│   │   ├── claims/              # Claims listing page
│   │   ├── identity/            # Identity verification page
│   │   └── page.tsx             # Dashboard home page
│   ├── api/                     # API routes
│   ├── lib/                     # App-specific utilities
│   ├── queries/                 # React Query definitions
│   │   ├── queryClient.ts       # Query client configuration
│   │   ├── queryKeys.ts         # Query key definitions
│   │   ├── claims.queries.ts    # Claim-related queries
│   │   ├── leaderboard.queries.ts # Leaderboard queries
│   │   └── user.queries.ts      # User-related queries
│   ├── types/                   # TypeScript type definitions
│   │   ├── claim.ts             # Claim types
│   │   ├── dispute.ts           # Dispute types
│   │   ├── verification.ts      # Verification types
│   │   ├── websocket.ts         # WebSocket event types
│   │   └── worldcoin.ts         # Worldcoin types
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── providers.tsx            # App-wide providers
├── components/                  # React components
│   ├── common/                  # Shared components
│   ├── features/                # Feature-specific components
│   │   ├── claim-details/       # Claim detail components
│   │   ├── claim-submission/    # Claim submission components
│   │   ├── claim-verification/  # Verification components
│   │   ├── disputes/            # Dispute components
│   │   ├── worldcoin/           # Worldcoin integration
│   │   ├── ActiveClaimsTable.tsx
│   │   ├── ActivityAndNodes.tsx
│   │   ├── ClaimRewardsPanel.tsx
│   │   ├── RealtimeActivityFeed.tsx
│   │   ├── StatsCards.tsx
│   │   └── VerificationNodes.tsx
│   ├── layout/                  # Layout components
│   ├── providers/               # Context providers
│   │   ├── QueryProvider.tsx    # React Query provider
│   │   └── WebSocketProvider.tsx # WebSocket provider
│   ├── reputation/              # Reputation system components
│   ├── transactions/            # Transaction components
│   └── ui/                      # Base UI components (shadcn/ui)
│       ├── button.tsx
│       ├── TrustIndicator.tsx
│       ├── TrustWarningBanner.tsx
│       └── WebSocketStatus.tsx
├── hooks/                       # Custom React hooks
│   ├── useClaims.ts             # Claim management hook
│   ├── useLeaderboard.ts        # Leaderboard hook
│   ├── useRealtimeClaims.ts     # Real-time claims hook
│   ├── useRealtimeData.ts       # Real-time data synchronization
│   ├── useRewards.ts            # Rewards management hook
│   ├── useUser.ts               # User data hook
│   ├── useWebSocket.ts          # WebSocket connection hook
│   └── useWorldcoinVerification.ts # Worldcoin verification hook
├── lib/                         # Utility libraries
└── data/                        # Static data or mock data
```

## State Management Architecture

### React Query Integration

The application uses TanStack Query for server state management with the following configuration:

```typescript
// src/app/queries/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 mins
      cacheTime: 1000 * 60 * 30, // 30 mins
      refetchOnWindowFocus: false,
      retry: 2,
    },
    mutations: {
      onError: (error) => console.error('Mutation error:', error),
    },
  },
});
```

### Query Key Strategy

Query keys are centralized in `src/app/queries/queryKeys.ts` following a hierarchical pattern:

```typescript
export const queryKeys = {
  claims: {
    all: ['claims'] as const,
    detail: (claimId: string) => ['claims', claimId] as const,
    byStatus: (status: string) => ['claims', 'status', status] as const,
  },
  verifications: {
    all: ['verifications'] as const,
    byClaim: (claimId: string) => ['verifications', 'claim', claimId] as const,
    byUser: (userId: string) => ['verifications', 'user', userId] as const,
  },
  // ... other query keys
};
```

## Real-Time Data Architecture

### WebSocket Integration

The application implements a robust WebSocket system for real-time updates:

#### Provider Structure
1. **WebSocketProvider** - Manages WebSocket connection state
2. **QueryProvider** - Integrates WebSocket with React Query
3. **useRealtimeData** - Syncs WebSocket events with query cache

#### Event Types
```typescript
// src/app/types/websocket.ts
export type WebSocketEvent = 
  | ClaimCreatedEvent
  | ClaimUpdatedEvent
  | ClaimStatusChangedEvent
  | VerificationAddedEvent
  | DisputeCreatedEvent
  | DisputeResolvedEvent
  | LeaderboardUpdatedEvent;
```

#### Real-time Data Flow
1. WebSocket event received
2. Event parsed and typed
3. Query cache invalidated/updated
4. Components automatically re-render with new data

## Component Architecture

### Feature-Based Organization

Components are organized by features rather than type:

- **claims/** - All claim-related components
- **verification/** - Verification workflow components
- **disputes/** - Dispute management components
- **worldcoin/** - Identity verification components

### Provider Pattern

Global state is managed through context providers:

```typescript
// src/app/providers.tsx
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      {children}
    </QueryProvider>
  );
}

// src/components/providers/QueryProvider.tsx
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider config={wsConfig}>
        <RealtimeDataSync />
        {children}
      </WebSocketProvider>
    </QueryClientProvider>
  );
}
```

### Custom Hooks Pattern

Business logic is encapsulated in custom hooks:

```typescript
// Example: useClaims hook
export function useClaims() {
  return useQuery({
    queryKey: queryKeys.claims.all,
    queryFn: fetchClaims,
    // ... other options
  });
}
```

## Data Flow Patterns

### 1. Server Data Flow
```
API → React Query → Component → UI
```

### 2. Real-time Data Flow
```
WebSocket Event → useRealtimeData → Query Cache → Component → UI
```

### 3. User Interaction Flow
```
User Action → Component → Mutation Hook → API → WebSocket Broadcast → All Clients
```

### 4. Blockchain Integration Flow
```
User Action → Wagmi Hook → Smart Contract → Transaction → Indexer → API → Frontend
```

## Type System Architecture

### Core Domain Types

```typescript
// Claims
interface Claim {
  id: string;
  title: string;
  description: string;
  claimantAddress: string;
  status: ClaimStatus;
  bountyAmount: number;
  totalStaked: number;
  evidence: Evidence[];
  createdAt: string;
  updatedAt: string;
}

// Verifications
interface Verification {
  id: string;
  claimId: string;
  verifierAddress: string;
  decision: VerificationDecision;
  stakeAmount: number;
  status: VerificationStatus;
  transactionHash?: string;
  createdAt: string;
  confirmedAt?: string;
}
```

### Event Types for WebSocket

All WebSocket events are strongly typed for type safety:

```typescript
interface ClaimCreatedEvent {
  type: 'CLAIM_CREATED';
  payload: Claim;
  timestamp: string;
}
```

## Performance Optimizations

### 1. Query Optimization
- **Stale Time**: 5 minutes for balanced freshness
- **Cache Time**: 30 minutes to reduce API calls
- **Selective Refetching**: Disabled on window focus

### 2. Component Optimization
- **React.memo**: Used for expensive components
- **useMemo**: For computed values
- **useCallback**: For event handlers

### 3. Bundle Optimization
- **Dynamic Imports**: For large components
- **Code Splitting**: Automatic with Next.js App Router

## Security Architecture

### 1. Trust System
- **Trust Indicators**: Visual warnings for low-trust accounts
- **Trust Scores**: Based on reputation, verification, and activity
- **Sybil Protection**: Worldcoin integration

### 2. Data Validation
- **TypeScript**: Compile-time type checking
- **Zod**: Runtime validation (where implemented)
- **API Validation**: Server-side validation

### 3. Wallet Security
- **Wagmi**: Secure wallet connection management
- **RainbowKit**: Standardized wallet UI
- **Transaction Signing**: Client-side transaction validation

## Testing Architecture

### 1. Unit Testing
- **Jest**: Test runner
- **Testing Library**: Component testing utilities
- **Mock Services**: For API and WebSocket mocking

### 2. E2E Testing
- **Playwright**: Cross-browser E2E testing
- **Page Object Model**: Maintainable test structure

### 3. Integration Testing
- **React Query Testing**: Testing query behavior
- **WebSocket Testing**: Testing real-time features

## Development Workflow

### 1. Component Development
1. Create component in appropriate feature folder
2. Define TypeScript interfaces
3. Implement with hooks for business logic
4. Add unit tests
5. Add integration tests if needed

### 2. State Management
1. Define query keys in `queryKeys.ts`
2. Create query functions in appropriate `.queries.ts` file
3. Create custom hook in `hooks/` folder
4. Use in components

### 3. Real-time Features
1. Define event type in `websocket.ts`
2. Add handler in `useRealtimeData.ts`
3. Test WebSocket integration
4. Add fallback UI for connection issues

## Best Practices

### 1. Code Organization
- **Feature-based**: Group related functionality
- **Consistent naming**: Follow established patterns
- **Type safety**: Strict TypeScript configuration

### 2. Performance
- **Lazy loading**: Load code as needed
- **Memoization**: Prevent unnecessary re-renders
- **Optimistic updates**: Improve perceived performance

### 3. Accessibility
- **Semantic HTML**: Proper element usage
- **ARIA labels**: Screen reader support
- **Keyboard navigation**: Full keyboard accessibility

### 4. Error Handling
- **Error boundaries**: Catch React errors
- **Fallback UI**: Graceful degradation
- **User feedback**: Clear error messages

## Future Architecture Considerations

### 1. Scalability
- **Micro-frontends**: Potential for feature isolation
- **Service Workers**: Offline functionality
- **CDN Integration**: Global performance

### 2. Multi-chain Support
- **Chain abstraction**: Generic blockchain interface
- **Chain-specific adapters**: Pluggable chain implementations
- **Cross-chain bridges**: Multi-chain functionality

### 3. Advanced Features
- **AI Integration**: Automated claim analysis
- **Graph QL**: More efficient data fetching
- **WebAssembly**: Performance-critical computations

---

## Local Draft State Model (V2-FE-105)

### Motivation

Claim creation is a multi-field, latency-sensitive user journey. Losing form progress due to a wallet rejection, browser refresh, or accidental navigation is a poor experience. Local drafts allow the UI to persist work-in-progress without inventing protocol state.

### Invariants

1. **Drafts are purely local.** They live in `localStorage` under the key `tb:claim-drafts` and are never transmitted to the chain or the API.
2. **No fabricated protocol state.** A `ClaimDraft` object carries only the fields the user has typed: `title`, `category`, `impact`, `source`, `description`, and pre-submission evidence attachments. It explicitly MUST NOT contain `txHash`, `claimId`, `status`, `bountyAmount`, `rewards`, or any on-chain identifier.
3. **Discard on success.** When a claim transaction is successfully submitted, the active draft is deleted (`deleteDraft(draftId)`) so the protocol ledger (chain + indexer) becomes the canonical record — not localStorage.
4. **Never auto-discard on timeout or navigation.** Drafts persist until the user explicitly deletes them or a successful submission discards the active draft. Stale drafts (> 7 days old) are flagged in the UI but never silently removed.

### Data Model

```typescript
// src/hooks/useClaimDrafts.ts

interface DraftEvidenceItem {
  id: string;           // local crypto.randomUUID()
  uri: string;          // https:// or ipfs:// URI
  digest?: string;      // optional SHA-256 hex (integrity hint, not on-chain)
  label?: string;       // human-readable annotation
}

interface ClaimDraft {
  id: string;           // local crypto.randomUUID()
  title: string;
  category: string;
  impact: string;
  source: string;
  description: string;
  evidence: DraftEvidenceItem[];
  savedAt: string;      // ISO-8601 timestamp
  // 🚫 NO txHash, claimId, status, bountyAmount, rewards
}
```

### Lifecycle

```
Form opens → createDraft() (new id)
    ↓
User types → useDebounce(300 ms) → saveDraft(id, fields)
    ↓
User clicks "Drafts" → DraftManager opens → lists saved drafts
    ↓
User clicks "Restore" → fields hydrated → draftRestored banner shown
    ↓
User submits successfully → deleteDraft(id) → onClose()
    ↓
(On failure) draft is NOT deleted; user can fix and retry
```

### Key Files

| File | Role |
|------|------|
| `src/hooks/useClaimDrafts.ts` | Hook: CRUD over localStorage, staleness annotation |
| `src/components/features/claim-submission/DraftManager.tsx` | Accessible draft list with Restore/Delete |
| `src/components/features/claim-submission/ClaimSubmissionForm.tsx` | Auto-save, restore, evidence attachment |

### Evidence Attachment (Pre-Submission)

Evidence items (`DraftEvidenceItem`) are local-only before a claim is created. They are intended to help the user gather reference links before submission. **No IPFS upload is performed** by the draft system; the IPFS viewer and `useEvidenceRegistration` hook handle on-chain evidence *after* a claim exists on-chain.

- Only `https://` and `ipfs://` URIs are accepted (validated client-side).
- An optional content digest (SHA-256 or SHA-512 hex) helps reviewers verify integrity offline.
- Secrets detected in URIs (e.g. `?password=…`) are rejected at the input layer.

### Staleness

Drafts older than 7 days (`DRAFT_TTL_MS`) are annotated with `isStale: true` by `useClaimDrafts`. The UI displays a visible badge and may advise the user to verify that sources are still accurate. Stale drafts are never auto-deleted.

---

## Conclusion

The TruthBounty frontend architecture is designed to be:

- **Scalable**: Modular structure supports growth
- **Maintainable**: Clear separation of concerns
- **Performant**: Optimized for real-time updates
- **Type-safe**: Comprehensive TypeScript usage
- **User-friendly**: Focus on UX and accessibility

This architecture provides a solid foundation for building a decentralized verification platform that can evolve with changing requirements while maintaining code quality and developer productivity.
