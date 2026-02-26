import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import StatsCards from "@/components/features/StatsCards";
import ActivityAndNodes from "@/components/features/ActivityAndNodes";
import VerificationNodes from "@/components/features/VerificationNodes";
import ActiveClaimsTable from "@/components/features/ActiveClaimsTable";


const DashboardPage = () => {
  return (
    <MainLayout>
      <div className="flex flex-col gap-8">
        <StatsCards />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <ActivityAndNodes />
          </div>
          <div className="xl:col-span-1">
            <VerificationNodes />
          </div>
        </div>
        <ActiveClaimsTable />
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
