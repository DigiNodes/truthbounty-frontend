"use client";

import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import StatsCards from "@/components/features/StatsCards";
import ActivityAndNodes from "@/components/features/ActivityAndNodes";
import VerificationNodes from "@/components/features/VerificationNodes";
import ActiveClaimsTable from "@/components/features/ActiveClaimsTable";
import ClaimRewardsPanel from "@/components/features/ClaimRewardsPanel";
import { useClaims } from "@/app/queries/claims.queries";
import { DashboardSkeleton } from "@/components/skeletons";

const DashboardPage = () => {
  const { isLoading: claimsLoading } = useClaims();

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
        <ActiveClaimsTable isLoading={claimsLoading} />
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
