"use client"

import React, { useState } from "react";
import { ClaimSubmissionForm, type ClaimFormData } from "@/components/features/claim-submission";
import { FaGithub, FaDiscord, FaCog } from "react-icons/fa";
import { HiOutlineDocumentText } from "react-icons/hi";
import { 
  MdRssFeed, 
  MdDashboard, 
  MdAddCircleOutline, 
  MdGavel, 
  MdVerifiedUser, 
  MdAnalytics 
} from "react-icons/md";

const navItems = [
  { label: "Claims Feed", icon: MdRssFeed },
  { label: "My Dashboard", icon: MdDashboard },
  { label: "Submit Claim", icon: MdAddCircleOutline },
  { label: "Active Disputes", icon: MdGavel },
  { label: "Verifiers", icon: MdVerifiedUser },
  { label: "Analytics", icon: MdAnalytics },
];

const Sidebar = () => {
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSubmit = (data: ClaimFormData) => {
    // TODO: Integrate with backend or state
    // For now, just log
    console.log("Claim submitted:", data);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#18181b] rounded-lg border border-[#232329] text-white"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        flex flex-col w-64 h-full bg-card border-r border-border text-foreground
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center h-16 px-6 py-6 font-bold text-lg tracking-tight border-b border-border">
          <span className="bg-[#5b5bf6] rounded-full w-8 h-8 flex items-center justify-center mr-2">{/* Logo */}
            <span className="font-bold text-white">T</span>
          </span>
           TruthBounty
         
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center px-3 py-3 rounded-lg hover:bg-accent cursor-pointer text-sm font-medium"
              onClick={() => {
                if (item.label === "Submit Claim") setShowClaimModal(true);
                setIsMobileMenuOpen(false);
              }}
            >
              <item.icon className="w-5 h-5 text-[#a1a1aa]" />
              <span className="ml-3">{item.label}</span>
            </div>
          ))}
          <div className="mt-8">
            <div className="flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] cursor-pointer text-sm font-medium">
              <HiOutlineDocumentText className="w-4 h-4 text-[#a1a1aa]" />
              <span className="ml-3">Documentation</span>
            </div>
            <div className="flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] cursor-pointer text-sm font-medium">
              <FaGithub className="w-4 h-4 text-[#a1a1aa]" />
              <span className="ml-3">GitHub</span>
            </div>
            <div className="flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] cursor-pointer text-sm font-medium">
              <FaDiscord className="w-4 h-4 text-[#a1a1aa]" />
              <span className="ml-3">Discord</span>
            </div>
            <div className="flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] cursor-pointer text-sm font-medium">
              <FaCog className="w-4 h-4 text-[#a1a1aa]" />
              <span className="ml-3">Settings</span>
            </div>
          </div>
        </nav>
        <div className="p-4">
          {/* User profile or Worldcoin badge placeholder */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5b5bf6] to-[#232329] flex items-center justify-center text-white font-bold text-lg cursor-pointer hover:opacity-90 transition-opacity">
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
