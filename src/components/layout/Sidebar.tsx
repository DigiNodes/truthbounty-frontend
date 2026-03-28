"use client"

import React, { useState, useCallback, useMemo } from "react";
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
import { useFeatureFlags } from "@/components/providers";

const Sidebar = () => {
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isEnabled } = useFeatureFlags();

  // Navigation items based on feature flags
  const navItems = useMemo(() => {
    const items = [
      { label: "Claims Feed", icon: MdRssFeed, flag: null },
      { label: "My Dashboard", icon: MdDashboard, flag: null },
      { label: "Submit Claim", icon: MdAddCircleOutline, flag: 'CLAIM_SUBMISSION' as const },
      { label: "Active Disputes", icon: MdGavel, flag: 'CLAIM_DISPUTES' as const },
      { label: "Verifiers", icon: MdVerifiedUser, flag: 'CLAIM_VERIFICATION' as const },
      { label: "Analytics", icon: MdAnalytics, flag: 'ANALYTICS_DASHBOARD' as const },
    ];
    
    // Filter items based on feature flags
    return items.filter(item => item.flag === null || isEnabled(item.flag));
  }, [isEnabled]);

  const handleSubmit = (data: ClaimFormData) => {
    // TODO: Integrate with backend or state
    // For now, just log
    console.log("Claim submitted:", data);
  };

  const handleNavClick = useCallback((label: string) => {
    if (label === "Submit Claim") setShowClaimModal(true);
    setIsMobileMenuOpen(false);
  }, []);

  const handleNavKeyDown = useCallback((event: React.KeyboardEvent, label: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavClick(label);
    }
  }, [handleNavClick]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#18181b] rounded-lg border border-[#232329] text-white"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle navigation menu"
        aria-expanded={isMobileMenuOpen}
        aria-controls="sidebar-navigation"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        id="sidebar-navigation"
        className={`
        fixed lg:static inset-y-0 left-0 z-40
        flex flex-col w-64 h-full bg-card border-r border-border text-foreground
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
        aria-label="Main navigation"
      >
        <div className="flex items-center h-16 px-6 py-6 font-bold text-lg tracking-tight border-b border-border">
          <span className="bg-[#5b5bf6] rounded-full w-8 h-8 flex items-center justify-center mr-2" aria-hidden="true">
            <span className="font-bold text-white">T</span>
          </span>
           TruthBounty
         
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto" role="navigation">
          <ul className="space-y-2" role="list">
            {navItems.map((item) => (
              <li key={item.label}>
                <button
                  className="w-full flex items-center px-3 py-3 rounded-lg hover:bg-accent text-sm font-medium text-left transition-colors"
                  onClick={() => handleNavClick(item.label)}
                  onKeyDown={(e) => handleNavKeyDown(e, item.label)}
                >
                  <item.icon className="w-5 h-5 text-[#a1a1aa]" aria-hidden="true" />
                  <span className="ml-3">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <ul className="mt-8 space-y-2" role="list">
            <li>
              <button className="w-full flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] text-sm font-medium text-left transition-colors">
                <HiOutlineDocumentText className="w-4 h-4 text-[#a1a1aa]" aria-hidden="true" />
                <span className="ml-3">Documentation</span>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] text-sm font-medium text-left transition-colors">
                <FaGithub className="w-4 h-4 text-[#a1a1aa]" aria-hidden="true" />
                <span className="ml-3">GitHub</span>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] text-sm font-medium text-left transition-colors">
                <FaDiscord className="w-4 h-4 text-[#a1a1aa]" aria-hidden="true" />
                <span className="ml-3">Discord</span>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center px-3 py-2 rounded-lg hover:bg-[#232329] text-sm font-medium text-left transition-colors">
                <FaCog className="w-4 h-4 text-[#a1a1aa]" aria-hidden="true" />
                <span className="ml-3">Settings</span>
              </button>
            </li>
          </ul>
        </nav>
        <div className="p-4">
          {/* User profile or Worldcoin badge placeholder */}
          <button 
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5b5bf6] to-[#232329] flex items-center justify-center text-white font-bold text-lg hover:opacity-90 transition-opacity"
            aria-label="User profile"
          >
            <span aria-hidden="true">🪪</span>
          </button>
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
