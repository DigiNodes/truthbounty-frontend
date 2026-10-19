# Dispute Opening and Challenge Bond Flow

## Overview
V2-FE-049: Implements the complete dispute opening workflow with bond approval integration, fail-closed validation, and accessible user feedback.

## Architecture

### Core Components

1. **OpenDispute Component** (`src/components/features/disputes/OpenDispute.tsx`)
   - Modal dialog for opening disputes
   - Integrates bond approval for ERC-20 tokens
   - Step-by-step workflow with accessible feedback
   - Fail-closed validation at every stage

2. **Bond Approval Integration**
   - Uses `useERC20Approval` hook for token approval lifecycle
   - Supports native ETH (no approval) and ERC-20 bond tokens
   - Shows approval status with `AllowanceDisplay` and `ApprovalButton`
   - Blocks dispute submission until approval completes

3. **Validation Gates**
   - Context validation (eligibility, deadline, bond requirements)
   - Wallet readiness (connection, network, contract version)
   - Bond approval status (for ERC-20 tokens)
   - Form validation (reason length, required fields)

### Data Flow

```
User Opens Modal
    ↓
Fetch Dispute Context (useDisputeContext)
    ├─ Provisional Outcome
    ├─ Deadline Window
    ├─ Bond Requirements
    └─ Wallet Eligibility
    ↓
[If ERC-20 Bond Token]
    ↓
Check Token Allowance (useERC20Allowance)
    ↓
Display Approval Button (needs-approval)
    ↓
User Clicks Approve
    ↓
Submit approve() Transaction (useERC20Approval)
    ↓
Wait for Receipt (useWaitForTransactionReceipt)
    ↓
Refresh Allowance (refetch from chain)
    ↓
Show "Bond token approved" ✓
    ↓
[End If]
    ↓
User Fills Reason
    ↓
User Clicks "Confirm Dispute"
    ↓
Validate Inputs (validateDispute)
    ↓
Simulate Transaction (simulateDispute)
    ↓
Submit Dispute (submitDispute)
    ↓
Wait for Receipt (useDisputeReconciliation)
    ↓
Extract disputeId from logs
    ↓
Success Callback → Close Modal
```

## Key Features

### 1. Bond Approval Gate
- **Native ETH bonds**: No approval needed, bond sent as transaction value
- **ERC-20 tokens**: Requires approval before dispute submission
- **Status display**: Shows current allowance vs. required amount
- **Step labeling**: "Step 1: Approve Bond Token" → "Step 2: Reason"

### 2. Fail-Closed Validation
- Context must load successfully
- Wallet must be connected to correct network
- Contract address must match canonical release
- Bond approval must succeed (for ERC-20)
- All validation gates checked before submission
- Never fabricates transaction hashes or dispute IDs

### 3. Accessible Feedback
- **Live regions**: Screen reader announcements for state changes
- **ARIA labels**: Descriptive labels on all interactive elements
- **Error messages**: Clear, actionable error text
- **Loading states**: Disabled buttons with spinner + descriptive text
- **Success states**: Visual + auditory confirmation

### 4. Error Recovery
- **Approval rejection**: Shows retry button, calls reset() then approve()
- **Approval failure**: Displays error message with retry option
- **Validation errors**: Lists all validation failures with specific reasons
- **Simulation errors**: Shows revert reason from contract
- **Network errors**: Prompts user to switch network

## Security Guarantees

1. **No Fabrication**
   - Transaction hashes come from wagmi only
   - Dispute IDs extracted from on-chain logs only
   - Gas estimates from RPC, never hardcoded
   - Allowance values from contract reads only

2. **Canonical ABI Authority**
   - Function discovery from pinned ABI
   - No hardcoded selectors or calldata
   - Fails closed if ABI doesn't declare dispute function

3. **Receipt-Driven State**
   - Allowance refresh triggered by receipt, not timer
   - Bond lock confirmed from transaction logs
   - No optimistic updates without confirmation

4. **Untrusted Input Handling**
   - All API/RPC responses validated
   - Address format validation before use
   - Chain ID checked against supported networks
   - Bond amounts validated as exact bigint matches

## Testing

### Test Coverage

1. **Bond Approval Integration** (`OpenDispute.bond-approval.test.tsx`)
   - ERC-20 token approval workflow
   - Native ETH bond (no approval)
   - Approval states: needs-approval, pending, approved, rejected, error
   - Combined validation gates
   - Accessible feedback
   - Error recovery

2. **Write Readiness** (`OpenDispute.readiness.test.tsx`)
   - Wallet connection validation
   - Network validation
   - Contract version validation
   - Never reports success without real transaction

3. **Focus Management** (`OpenDispute.focus.test.tsx`)
   - Focus trap during modal open
   - First focusable element (textarea)
   - Escape key closes modal
   - Cannot close while transaction in-flight

### Running Tests

```bash
# Run all dispute tests
npm test -- disputes

# Run specific test file
npm test -- OpenDispute.bond-approval

# Watch mode
npm test -- --watch OpenDispute
```

## Dependencies

- **V2-FE-016**: ERC-20 approval hooks (`useERC20Approval`, `useERC20Allowance`)
- **V2-FE-100**: Write readiness gate (`useWriteReadiness`)
- Wagmi/Viem for contract interactions
- React Query for cache invalidation

## Future Enhancements

1. **Permit Signatures** (ERC-2612)
   - Gas-less approval via off-chain signatures
   - Falls back to standard approval for non-permit tokens

2. **Multi-Token Support**
   - Allow bond payment in multiple tokens
   - Token selection dropdown
   - Dynamic bond amount calculation

3. **Batch Operations**
   - Approve + submit in single transaction (if contract supports)
   - Reduces user interactions from 2 to 1

## Related Files

- `src/hooks/useDisputeContext.ts` - Context fetching
- `src/hooks/useDisputeSubmission.ts` - Validation and submission
- `src/hooks/useDisputeReconciliation.ts` - Receipt confirmation
- `src/hooks/useERC20Approval.ts` - Approval state machine
- `src/components/ui/ApprovalButton.tsx` - Approval UI
- `src/components/ui/AllowanceDisplay.tsx` - Allowance display
- `src/app/types/dispute.ts` - Type definitions
