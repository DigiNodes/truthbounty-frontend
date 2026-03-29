

"use client";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { MainClaimCard } from "@/components/features/claim-details/MainClaimCard";
import {
  claimData,
  evidences,
  timelineEvents,
  topVerifiers,
} from "@/data/mock-data";
import { ClaimStats } from "@/components/features/claim-details/ClaimStats";
import { TimelineOfEvents } from "@/components/features/claim-details/TimelineOfEvents";
import { EvidenceLinks } from "@/components/features/claim-details/EvidenceLinks";
import { TopVerifiers } from "@/components/features/claim-details/TopVerifiers";
import MainLayout from "@/components/layout/MainLayout";
import { MainClaimCardSkeleton, ClaimDetailsSkeleton } from "@/components/skeletons";

export default function ClaimsDetailsPage() {
  // Simulate loading state - in production, this would come from a query hook
  const [isLoading] = useState(false);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-[#0a0a0f] text-gray-300 font-sans p-4 sm:p-6 md:p-8">
          <div className="max-w-6xl mx-auto mb-4 sm:mb-6">
            <div className="h-8 w-32 bg-[#232329] rounded animate-pulse" />
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <MainClaimCardSkeleton />
              <div className="h-64 bg-[#232329] rounded-xl animate-pulse" />
              <div className="h-96 bg-[#232329] rounded-xl animate-pulse" />
            </div>
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="h-80 bg-[#232329] rounded-xl animate-pulse" />
              <div className="h-64 bg-[#232329] rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#0a0a0f] text-gray-300 font-sans p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto mb-4 sm:mb-6">
          <button className="flex items-center text-sm text-white hover:text-gray-300 transition-colors">
            <ArrowLeft size={16} className="mr-2" /> Back to Claims
          </button>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 flex flex-col">
            <MainClaimCard data={claimData} isLoading={isLoading} />
            <EvidenceLinks evidences={evidences} />
            <TimelineOfEvents events={timelineEvents} />
          </div>
          <div className="lg:col-span-1 flex flex-col">
            <ClaimStats data={claimData} />
            <TopVerifiers verifiers={topVerifiers} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
