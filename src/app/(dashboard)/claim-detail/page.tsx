

"use client";
import { ArrowLeft } from "lucide-react";
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



export default function ClaimsDetailsPage() {
     
  return (
    <MainLayout>
 <div className="min-h-screen bg-[#0a0a0f] text-gray-300 font-sans p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto mb-6 sm:mb-6">
        <button className="flex items-center text-sm text-white hover:text-gray-300 transition-colors py-2">
          <ArrowLeft size={16} className="mr-2 flex-shrink-0" /> <span className="truncate">Back to Claims</span>
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 flex flex-col space-y-4 sm:space-y-6">
          <MainClaimCard data={claimData} />
          <EvidenceLinks evidences={evidences} />
          <TimelineOfEvents events={timelineEvents} />
        </div>
        <div className="xl:col-span-1 flex flex-col space-y-4 sm:space-y-6">
          <ClaimStats data={claimData} />
          <TopVerifiers verifiers={topVerifiers} />
        </div>
      </div>

    </div>
    </MainLayout>
   
  );
}
