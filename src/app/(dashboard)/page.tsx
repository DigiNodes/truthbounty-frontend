"use client";

import React, { useMemo } from "react";
import MainLayout from "@/components/layout/MainLayout";
import StatsCards from "@/components/features/StatsCards";
import ActivityAndNodes from "@/components/features/ActivityAndNodes";
import VerificationNodes from "@/components/features/VerificationNodes";
import ActiveClaimsTable, { ActiveClaimRow } from "@/components/features/ActiveClaimsTable";
import ClaimRewardsPanel from "@/components/features/ClaimRewardsPanel";
import { useClaims } from "@/app/queries/claims.queries";
import type { Claim } from "@/app/types/claim";
import { DashboardSkeleton } from "@/components/skeletons";

const CLAIM_STATUS_LABELS: Record<Claim["status"], string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under Review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  DISPUTED: "Disputed",
};

/**
 * Maps real claim records (claims API/indexer) into table rows.
 * Fields the Claim type does not carry yet are rendered as “—” instead of
 * being fabricated (V2-FE-016: contracts/indexed projections are
 * authoritative; no synthetic protocol state).
 */
function mapClaimsToRows(claims: Claim[]): ActiveClaimRow[] {
  return claims.map((claim) => ({
    category: "—",
    impact: "—",
    title: claim.title,
    source: claim.claimantAddress,
    status: CLAIM_STATUS_LABELS[claim.status] ?? claim.status,
    confidence: "—",
    votes: "—",
    stake: `${(claim.totalStaked ?? 0).toLocaleString()} wei`,
    time: claim.createdAt
      ? new Date(claim.createdAt).toLocaleDateString()
      : "—",
    actions: "View",
  }));
}

const DashboardPage = () => {
  const { data: claims, isLoading: claimsLoading } = useClaims();

  const claimRows = useMemo(
    () => mapClaimsToRows(claims ?? []),
    [claims],
  );

  // Determine if dashboard is in loading state
  const isLoading = claimsLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <DashboardSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-8">
        <StatsCards isLoading={claimsLoading} />
        <ClaimRewardsPanel isLoading={false} />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <ActivityAndNodes isLoading={claimsLoading} />
          </div>
          <div className="xl:col-span-1">
            <VerificationNodes isLoading={claimsLoading} />
          </div>
        </div>
        <ActiveClaimsTable claims={claimRows} isLoading={claimsLoading} />
      </div>
    </MainLayout>
  );
};

export default DashboardPage;