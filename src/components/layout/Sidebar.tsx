import React, { useState } from "react";
import { ClaimSubmissionForm, ClaimFormData } from "@/components/features/claim-submission";
import { FaGithub, FaDiscord, FaCog } from "react-icons/fa";
import { HiOutlineDocumentText } from "react-icons/hi";

const navItems = [
  { label: "Claims Feed", icon: "feed" },
  { label: "My Dashboard", icon: "dashboard" },
  { label: "Submit Claim", icon: "plus" },
  { label: "Active Disputes", icon: "disputes" },
  { label: "Verifiers", icon: "verifiers" },
  { label: "Analytics", icon: "analytics" },
];

const Sidebar = () => {
  const [showClaimModal, setShowClaimModal] = useState(false);

  const handleSubmit = (data: ClaimFormData) => {
    // TODO: Integrate with backend or state
    // For now, just log
    console.log("Claim submitted:", data);
  };

  return (
    <>
      <aside className="flex flex-col w-64 h-full bg-[#18181b] border-r border-[#232329] text-white">
        <div className="flex items-center h-16 px-6 font-bold text-lg tracking-tight border-b border-[#232329]">
          <span className="bg-[#5b5bf6] rounded-full w-8 h-8 flex items-center justify-center mr-2">{/* Logo */}
            <span className="font-bold text-white">T</span>
          </span>
          TruthBounty
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] cursor-pointer text-sm font-medium"
              onClick={() => {
                if (item.label === "Submit Claim") setShowClaimModal(true);
              }}
            >
              {/* TODO: Add icons */}
              <span className="ml-2">{item.label}</span>
            </div>
          ))}
          <div className="mt-8">
            <div className="flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] cursor-pointer text-sm font-medium">
              <HiOutlineDocumentText className="w-4 h-4" />
              <span className="ml-2">Documentation</span>
            </div>
            <div className="flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] cursor-pointer text-sm font-medium">
              <FaGithub className="w-4 h-4" />
              <span className="ml-2">GitHub</span>
            </div>
            <div className="flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] cursor-pointer text-sm font-medium">
              <FaDiscord className="w-4 h-4" />
              <span className="ml-2">Discord</span>
            </div>
            <div className="flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] cursor-pointer text-sm font-medium">
              <FaCog className="w-4 h-4" />
              <span className="ml-2">Settings</span>
            </div>
          </div>
        </nav>
        <div className="p-4">
          {/* User profile or Worldcoin badge placeholder */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5b5bf6] to-[#232329] flex items-center justify-center text-white font-bold text-lg">
            {/* User */}
            <span>🪪</span>
          </div>
        </div>
      </aside>
      {showClaimModal && (
        <ClaimSubmissionForm
          onSubmit={handleSubmit}
          onClose={() => setShowClaimModal(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
