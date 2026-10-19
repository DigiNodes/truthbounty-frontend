# Dispute Opening Bond Flow - Test Plan

## Test Suite Overview

### Unit Tests
Location: `src/components/features/disputes/__tests__/`

1. **OpenDispute.bond-approval.test.tsx** (NEW)
2. **OpenDispute.readiness.test.tsx** (EXISTING)
3. **OpenDispute.focus.test.tsx** (EXISTING)

### Integration Tests
Location: `src/__tests__/integration/`

1. **dispute-opening.test.tsx** (EXISTING)
2. **disputes-queries.test.tsx** (EXISTING)
3. **approval-adversarial.test.tsx** (EXISTING)

### Accessibility Tests
Location: `src/__tests__/accessibility/`

1. **approval-components.test.tsx** (EXISTING)

---

## New Test Coverage: Bond Approval Integration

### Test File: `OpenDispute.bond-approval.test.tsx`

#### Test Suite 1: ERC-20 Bond Token Approval Gate

**Test 1.1: Shows bond approval step when bond token is ERC-20**
```typescript
it('shows bond approval step when bond token is ERC-20')
```
- **Given:** Modal opened with ERC-20 bond token
- **When:** Component renders
- **Then:** 
  - "Step 1: Approve Bond Token" is visible
  - "Step 2: Reason for Dispute" is visible
  - Approve button is present

**Test 1.2: Disables confirm button until bond approval completes**
```typescript
it('disables confirm button until bond approval completes')
```
- **Given:** ERC-20 bond, approval needed
- **When:** User fills reason
- **Then:**
  - Confirm button is disabled
  - Button text is "Approve Bond First"

**Test 1.3: Enables confirm button after bond approval succeeds**
```typescript
it('enables confirm button after bond approval succeeds')
```
- **Given:** ERC-20 bond, approval completed
- **When:** User fills reason
- **Then:**
  - Confirm button is enabled
  - "Bond token approved" checkmark shown
  - No approve button visible

**Test 1.4: Calls approve when user clicks approve button**
```typescript
it('calls approve when user clicks approve button')
```
- **Given:** Approval needed
- **When:** User clicks "Approve BOND"
- **Then:** `mockBondApprove` called once

**Test 1.5: Shows approval in-progress state**
```typescript
it('shows approval in-progress state')
```
- **Given:** Approval transaction pending
- **When:** Component renders
- **Then:**
  - "Approving..." text shown
  - Button is disabled
  - aria-busy="true"

**Test 1.6: Allows retry after approval rejection**
```typescript
it('allows retry after approval rejection')
```
- **Given:** User rejected approval in wallet
- **When:** Component renders
- **Then:**
  - Retry button is enabled
  - Click calls reset() then approve()

**Test 1.7: Shows error state with retry option after approval failure**
```typescript
it('shows error state with retry option after approval failure')
```
- **Given:** Approval failed (e.g., "Insufficient gas")
- **When:** Component renders
- **Then:**
  - Error message displayed
  - Retry button shown
  - Click calls reset() then approve()

**Test 1.8: Prevents modal close while approval is in progress**
```typescript
it('prevents modal close while approval is in progress')
```
- **Given:** Approval awaiting signature
- **When:** User presses Escape or clicks close
- **Then:** Modal remains open

**Test 1.9: Displays allowance status when checking**
```typescript
it('displays allowance status when checking')
```
- **Given:** Allowance being fetched
- **When:** Component renders
- **Then:** "Checking allowance…" shown

**Test 1.10: Shows insufficient allowance when allowance < required**
```typescript
it('shows insufficient allowance when allowance < required')
```
- **Given:** Allowance is 0.5 ETH, required is 1 ETH
- **When:** Component renders
- **Then:** Approve button shown

**Test 1.11: Does not block submission when bond approval succeeds**
```typescript
it('does not block submission when bond approval succeeds')
```
- **Given:** Approval succeeded, reason filled
- **When:** User submits form
- **Then:** submitDispute called

#### Test Suite 2: Native ETH Bond (No Approval)

**Test 2.1: Does not show bond approval step for native ETH bonds**
```typescript
it('does not show bond approval step for native ETH bonds')
```
- **Given:** Bond token is undefined (native ETH)
- **When:** Component renders
- **Then:**
  - No "Step 1" label
  - No "Step 2" label
  - No approve button

**Test 2.2: Enables confirm button immediately for native ETH**
```typescript
it('enables confirm button immediately for native ETH')
```
- **Given:** Native ETH bond, reason filled
- **When:** Component renders
- **Then:** Confirm button is enabled

**Test 2.3: Submits dispute without waiting for approval**
```typescript
it('submits dispute without waiting for approval')
```
- **Given:** Native ETH bond
- **When:** User submits
- **Then:**
  - submitDispute called
  - approve NOT called

#### Test Suite 3: Accessible Feedback

**Test 3.1: Announces approval states via live region**
```typescript
it('announces approval states via live region')
```
- **Given:** Approval pending
- **When:** Component renders
- **Then:** Live regions present with role="status"

**Test 3.2: Provides descriptive aria-label on approval button states**
```typescript
it('provides descriptive aria-label on approval button states')
```
- **Given:** Awaiting signature
- **When:** Component renders
- **Then:**
  - aria-label describes state
  - aria-busy="true"

**Test 3.3: Links approval error to button via aria-describedby**
```typescript
it('links approval error to button via aria-describedby')
```
- **Given:** Approval error occurred
- **When:** Component renders
- **Then:** Button aria-describedby points to error

#### Test Suite 4: Combined Validation Gates

**Test 4.1: Requires both bond approval AND readiness before enabling submit**
```typescript
it('requires both bond approval AND readiness before enabling submit')
```
- **Given:** Approved but wrong network
- **When:** User fills reason
- **Then:** Confirm button disabled

**Test 4.2: Requires both bond approval AND valid reason before enabling submit**
```typescript
it('requires both bond approval AND valid reason before enabling submit')
```
- **Given:** Approved but no reason
- **When:** Component renders
- **Then:** Confirm button disabled

**Test 4.3: Requires all gates to pass**
```typescript
it('requires all gates to pass: approval, readiness, reason, eligibility')
```
- **Given:** All gates pass
- **When:** Component renders
- **Then:** Confirm button enabled

#### Test Suite 5: Error Boundaries

**Test 5.1: Displays bond approval error alongside other errors**
```typescript
it('displays bond approval error alongside other errors')
```
- **Given:** Approval failed with error
- **When:** Component renders
- **Then:** Error alert shows approval failure

**Test 5.2: Prioritizes submission error over approval error**
```typescript
it('prioritizes submission error over approval error after both fail')
```
- **Given:** Both approval and submission failed
- **When:** Errors occur
- **Then:** Submission error shown (more recent)

---

## Existing Test Coverage

### OpenDispute.readiness.test.tsx

**Coverage:**
- Write readiness validation
- Network mismatch errors
- Canonical ABI gate
- Never invents success without real transaction

**Test Count:** 5 tests

### OpenDispute.focus.test.tsx

**Coverage:**
- Focus trap on modal open
- First focusable element targeting
- Escape key closes modal
- Cannot close during transaction

**Test Count:** 4 tests

### dispute-opening.test.tsx

**Coverage:**
- Complete flow: context → validate → simulate → submit → reconcile
- Error scenarios
- State transitions
- Callback integration
- Gas estimation

**Test Count:** 12 tests

### disputes-queries.test.tsx

**Coverage:**
- Query cache integration
- Mutation invalidation
- WebSocket event handling

**Test Count:** 8 tests

### approval-adversarial.test.tsx

**Coverage:**
- Adversarial approval scenarios
- Receipt failures
- Network errors during approval
- Accessible feedback

**Test Count:** 6 tests

### approval-components.test.tsx

**Coverage:**
- ApprovalButton accessibility
- AllowanceDisplay accessibility
- Keyboard navigation
- ARIA attributes
- No axe violations

**Test Count:** 10 tests

---

## Test Execution

### Running Specific Test Suites

```bash
# All dispute tests
npm test -- disputes

# Bond approval only
npm test -- OpenDispute.bond-approval

# Readiness tests
npm test -- OpenDispute.readiness

# Focus tests
npm test -- OpenDispute.focus

# Integration tests
npm test -- dispute-opening

# Accessibility tests
npm test:a11y
```

### Coverage Thresholds

Target coverage for dispute flow:
- Statements: 90%
- Branches: 85%
- Functions: 90%
- Lines: 90%

### Continuous Integration

Tests run on:
- Pull request creation
- Push to main branch
- Pre-merge checks
- Nightly builds

---

## Manual Test Scenarios

### Scenario 1: Happy Path (ERC-20 Bond)

**Steps:**
1. Connect wallet to Optimism Sepolia
2. Navigate to claim with open dispute window
3. Click "Open Dispute"
4. Verify "Step 1: Approve Bond Token" shown
5. Click "Approve BOND"
6. Approve in wallet
7. Wait for confirmation
8. Verify checkmark appears
9. Fill reason (min 10 chars)
10. Click "Confirm Dispute"
11. Confirm in wallet
12. Wait for transaction
13. Verify success callback

**Expected:**
- Modal closes
- Success message shown
- Dispute appears in list
- Cache invalidated

### Scenario 2: Happy Path (Native ETH)

**Steps:**
1. Connect wallet to Optimism Sepolia
2. Navigate to claim with native ETH bond
3. Click "Open Dispute"
4. Verify no "Step 1" shown
5. Fill reason
6. Click "Confirm Dispute"
7. Confirm in wallet
8. Wait for transaction

**Expected:**
- No approval step
- Direct to submission
- Success callback triggered

### Scenario 3: User Rejects Approval

**Steps:**
1. Open dispute modal (ERC-20 bond)
2. Click "Approve BOND"
3. Reject in wallet
4. Verify retry button appears
5. Click retry
6. Approve in wallet

**Expected:**
- Error → Retry flow works
- Approval succeeds on retry
- Can proceed to submission

### Scenario 4: Insufficient Allowance

**Steps:**
1. Open dispute modal
2. Verify current allowance < required
3. Click "Approve BOND"
4. Approve for exact amount
5. Verify allowance increases

**Expected:**
- Shows insufficient initially
- After approval, shows sufficient
- Checkmark appears

### Scenario 5: Network Switch During Approval

**Steps:**
1. Open dispute modal
2. Click "Approve BOND"
3. Switch network in wallet before confirming
4. Verify error shown

**Expected:**
- "Wrong network" error
- Cannot proceed
- Must switch back to continue

### Scenario 6: Window Closed

**Steps:**
1. Open dispute modal
2. Wait for dispute window to close
3. Verify eligibility error

**Expected:**
- "Dispute window has closed" shown
- Approve button disabled
- Confirm button disabled

### Scenario 7: Keyboard Navigation

**Steps:**
1. Open dispute modal
2. Press Tab repeatedly
3. Verify order: approve → reason → confirm → cancel
4. Press Enter on approve button
5. After approval, press Tab to reason
6. Fill reason
7. Press Tab to confirm
8. Press Enter

**Expected:**
- Tab order logical
- Enter activates buttons
- No focus traps (except modal boundary)

### Scenario 8: Screen Reader Experience

**Steps:**
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Open dispute modal
3. Navigate with screen reader
4. Verify announcements

**Expected:**
- "Open Dispute" dialog announced
- "Step 1: Approve Bond Token" announced
- Button states announced
- "Approving..." announced
- "Bond token approved" announced
- Errors announced

---

## Regression Test Checklist

After deploying, verify:

- [ ] Existing dispute flow (no bond approval) still works
- [ ] Dispute creation succeeds on-chain
- [ ] Indexer picks up new disputes
- [ ] Cache invalidation triggers correctly
- [ ] WebSocket events processed
- [ ] No console errors
- [ ] No accessibility violations
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Mobile responsive layout maintained

---

## Performance Benchmarks

**Target Metrics:**

1. **Allowance Check**
   - Time: < 1 second
   - RPC calls: 1 (readContract)

2. **Approval Transaction**
   - Gas: < 60,000
   - Confirmation: < 15 seconds (Optimism)

3. **Dispute Submission**
   - Gas: < 200,000
   - Confirmation: < 15 seconds

4. **Modal Load**
   - Time to interactive: < 500ms
   - Layout shift: 0

5. **Memory**
   - No memory leaks on repeated open/close
   - Cleanup on unmount

---

## Test Data Requirements

**Mock Data Needed:**

1. **Claims**
   - Claim with open dispute window
   - Claim with closed window
   - Claim with active dispute

2. **Bonds**
   - Native ETH bond (bondToken: undefined)
   - ERC-20 bond (bondToken: 0x123...)
   - Various amounts

3. **Wallet States**
   - Connected (correct network)
   - Connected (wrong network)
   - Disconnected
   - Insufficient balance

4. **Approval States**
   - Zero allowance
   - Partial allowance
   - Full allowance
   - Pending transaction
   - Rejected transaction

5. **Errors**
   - RPC timeout
   - Gas estimation failure
   - Contract paused
   - Invalid signature

---

## Appendix: Test Utilities

### Helper Functions

```typescript
// Fill dispute reason
function fillReason() {
  fireEvent.change(screen.getByLabelText(/reason for dispute/i), {
    target: { value: 'This claim is incorrect because evidence is missing.' },
  });
}

// Wait for approval to complete
async function waitForApproval() {
  await waitFor(() => {
    expect(screen.getByText(/bond token approved/i)).toBeInTheDocument();
  });
}

// Submit dispute form
function submitForm() {
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
}
```

### Mock Configurations

```typescript
// ERC-20 bond context
const erc20BondContext = {
  bond: {
    bondToken: '0x1234567890123456789012345678901234567890',
    bondAmount: '1000000000000000000',
  },
};

// Native ETH bond context
const nativeBondContext = {
  bond: {
    bondToken: undefined,
    bondAmount: '1000000000000000000',
  },
};
```

---

## Conclusion

The test plan provides comprehensive coverage of:
- Bond approval integration (18 new tests)
- Existing dispute flow (35 existing tests)
- Accessibility compliance (10 tests)
- Integration scenarios (12 tests)

**Total Test Count:** 75 tests

All critical paths are covered with both unit and integration tests, ensuring the dispute opening bond flow is production-ready.
