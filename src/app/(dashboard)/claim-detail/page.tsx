"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// This page redirects to the proper dynamic route
export default function ClaimDetailRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to claims list since we don't have a specific claim ID
    router.replace("/dashboard/claims");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to claims...</p>
      </div>
    </div>
  );
}
