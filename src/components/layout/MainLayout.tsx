import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import TrustWarningBanner from "@/components/ui/TrustWarningBanner";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-[#131316]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
      {/* banner warns about Sybil/low-trust accounts */}
      <TrustWarningBanner />
        <main className="flex-1 overflow-y-auto p-8 bg-[#131316]">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
