

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
 <div className="min-h-screen bg-[#0a0a0f] text-gray-300 font-sans p-6 md:p-8">
      <div className="max-w-6xl mx-auto mb-6">
        <button className="flex items-center text-sm text-white hover:text-gray-300 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Claims
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col">
          <MainClaimCard data={claimData} />
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
