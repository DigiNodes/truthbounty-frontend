# Worldcoin Verification UI Components

This directory contains the UI components for Worldcoin identity verification in the TruthBounty platform.

## Overview

Worldcoin verification provides Sybil-resistant identity verification using zero-knowledge proofs. This enables the platform to ensure each user is a unique human without compromising privacy.

## Components

### WorldcoinVerifyButton

The primary action button for initiating verification.

```tsx
import { WorldcoinVerifyButton } from "@/components/features/worldcoin";

<WorldcoinVerifyButton
  walletAddress="0x..."
  onVerificationStart={() => console.log("Starting...")}
  onVerificationComplete={(success) => console.log("Done:", success)}
/>;
```

**Props:**

- `walletAddress?: string` - User's wallet address
- `onVerificationStart?: () => void` - Callback when verification begins
- `onVerificationComplete?: (success: boolean) => void` - Callback when verification completes
- `disabled?: boolean` - Disable the button
- `className?: string` - Additional CSS classes

### VerificationStatusIndicator

Displays the current verification status with appropriate styling.

```tsx
import { VerificationStatusIndicator } from "@/components/features/worldcoin";

<VerificationStatusIndicator
  status="SUCCESS"
  verificationLevel="orb"
  expiresAt="2025-12-31T00:00:00Z"
/>;
```

**Props:**

- `status: WorldcoinVerificationStatus` - Current verification status
- `verificationLevel?: 'orb' | 'device'` - Type of verification
- `expiresAt?: string` - Expiration date (ISO string)
- `className?: string` - Additional CSS classes
- `showLabel?: boolean` - Show status label (default: true)

### VerificationSuccessCard

Success confirmation card shown after successful verification.

```tsx
import { VerificationSuccessCard } from "@/components/features/worldcoin";

<VerificationSuccessCard
  verificationLevel="orb"
  verifiedAt="2024-02-26T00:00:00Z"
  expiresAt="2025-02-26T00:00:00Z"
  onClose={() => setShowSuccess(false)}
/>;
```

**Props:**

- `verificationLevel: 'orb' | 'device'` - Type of verification
- `verifiedAt: string` - Verification date (ISO string)
- `expiresAt?: string` - Expiration date (ISO string)
- `onClose?: () => void` - Callback to dismiss the card

### VerificationErrorCard

Error card shown when verification fails.

```tsx
import { VerificationErrorCard } from "@/components/features/worldcoin";

<VerificationErrorCard
  error="Verification failed"
  errorCode="NETWORK_ERROR"
  onRetry={() => handleRetry()}
  onDismiss={() => setShowError(false)}
/>;
```

**Props:**

- `error: string` - Error message
- `errorCode?: string` - Error code for debugging
- `onRetry?: () => void` - Callback to retry verification
- `onDismiss?: () => void` - Callback to dismiss the card

### WorldcoinInfoTooltip

Informational tooltip explaining why verification matters.

```tsx
import { WorldcoinInfoTooltip } from "@/components/features/worldcoin";

<WorldcoinInfoTooltip />;
```

### WorldcoinVerificationPanel

Complete verification panel with all states and flows.

```tsx
import { WorldcoinVerificationPanel } from "@/components/features/worldcoin";

<WorldcoinVerificationPanel
  walletAddress="0x..."
  onVerificationChange={(verified) => console.log("Verified:", verified)}
  compact={false}
/>;
```

**Props:**

- `walletAddress?: string` - User's wallet address
- `onVerificationChange?: (verified: boolean) => void` - Callback when verification status changes
- `compact?: boolean` - Use compact layout (default: false)

## Hook

### useWorldcoinVerification

React hook for managing verification state.

```tsx
import { useWorldcoinVerification } from "@/hooks/useWorldcoinVerification";

const { verification, status, isLoading, error, verify, refresh, isVerified } =
  useWorldcoinVerification({
    walletAddress: "0x...",
    autoCheck: true,
  });
```

**Options:**

- `walletAddress?: string` - User's wallet address
- `autoCheck?: boolean` - Auto-check status on mount (default: true)

**Returns:**

- `verification: WorldcoinVerification | null` - Verification data
- `status: WorldcoinVerificationStatus` - Current status
- `isLoading: boolean` - Loading state
- `error: string | null` - Error message
- `verify: () => Promise<void>` - Trigger verification
- `refresh: () => Promise<void>` - Refresh status
- `isVerified: boolean` - Whether user is verified

## Types

### WorldcoinVerificationStatus

```typescript
type WorldcoinVerificationStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUCCESS"
  | "FAILED"
  | "EXPIRED";
```

### WorldcoinVerification

```typescript
interface WorldcoinVerification {
  id: string;
  walletAddress: string;
  status: WorldcoinVerificationStatus;
  result?: WorldcoinVerificationResult;
  verifiedAt?: string;
  expiresAt?: string;
  error?: string;
}
```

## Integration

### Backend API Endpoints

The components expect these API endpoints:

1. **POST /api/identity/worldcoin/verify**
   - Submit verification proof
   - Body: `{ walletAddress, proof, merkle_root, nullifier_hash, verification_level }`
   - Returns: `WorldcoinVerification`

2. **GET /api/identity/worldcoin/status?wallet={address}**
   - Get verification status
   - Returns: `WorldcoinVerification | null`

### Worldcoin IDKit Integration

In production, integrate with Worldcoin's IDKit:

```tsx
import { IDKitWidget } from "@worldcoin/idkit";

<IDKitWidget
  app_id="app_staging_..."
  action="verify-identity"
  onSuccess={(result) => submitWorldcoinVerification(walletAddress, result)}
  onError={(error) => console.error(error)}
/>;
```

## Demo

Visit `/identity` to see the complete verification flow in action.

## Testing

For development, the components use mock verification that simulates the Worldcoin flow. To test different states:

```javascript
// Set verified state
localStorage.setItem(
  "trustInfo",
  JSON.stringify({
    isVerified: true,
    reputation: 85,
    accountAgeDays: 30,
    suspicious: false,
  }),
);
```

## Benefits of Verification

- **Sybil Resistance**: Prevents fake accounts and manipulation
- **Higher Trust Score**: Increases reputation and credibility
- **Increased Limits**: Higher stake amounts and priority access
- **Privacy Preserved**: Zero-knowledge proofs protect identity

## Resources

- [Worldcoin Documentation](https://worldcoin.org/how-it-works)
- [IDKit Integration Guide](https://docs.worldcoin.org/idkit)
- [Zero-Knowledge Proofs](https://worldcoin.org/privacy)
