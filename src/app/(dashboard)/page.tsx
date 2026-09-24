"use client";

import React from "react";
import Link from "next/link";
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-[#232329] bg-[#18181b] px-6 py-4">
          <div>
            <p className="text-sm font-medium text-white">Safe Treasury Withdrawal</p>
            <p className="text-xs text-[#a1a1aa]">
              Admin-only Optimism treasury controls with fail-closed simulation and typed confirm.
            </p>
          </div>
          <Link
            href="/treasury"
            className="text-sm font-semibold text-[#5b5bf6] underline underline-offset-2"
          >
            Open treasury UX
          </Link>
        </div>
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
