feat: implement personal verification history composition (My Verifications)

Implements the `/dashboard/verifications` route (with `/verifier` legacy alias) for verifier personal history, covering all scoped states: awaiting-reveal, settlement-pending, finalized, reward, withdrawal, slashed, missed-deadline, and unavailable-reward. Links canonical contract receipts to freshness-labelled API projections. Handles delayed indexing, reorg detection/reconciliation, missed deadlines, unavailable rewards, and empty history.

Key changes:
- New route `/dashboard/verifications` with `VerifierDashboardContainer`-level access control
- `VerificationHistoryCenter` component with outcome summary cards, filterable entry list, and pending authorization/recovery section
- `useVerificationHistoryData` hook with freshness-labelled projection data (contract vs api-projection sources)
- API endpoint `/api/verifier/history` for indexer projection queries
- Route authority fixture updated to `implementationStatus: 'implemented'`
- Navigation updated with "My Verifications" in verifier group
- CenterFrame enhanced to support verifications page with proper headings and navigation
- Comprehensive test coverage: model (15), component (23), accessibility (20), hook (7)
- Storybook stories for all states including delayed indexing, reorg detected/reconciled, recovery unavailable

Architecture compliance:
- Contract-sourced data (slashing, finalized) remains authoritative
- API projections clearly labelled with freshness (stale, projection-lag, delayed-indexing)
- Withdrawal remains unavailable without pinned adapter
- Recovery references preserved as local browser state only
- No fabricated protocol outcomes or authority