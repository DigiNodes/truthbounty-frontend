'use client';

import { ClaimHistoryList } from '@/components/features/ClaimHistoryList';
import { useAuth } from '@/hooks/useAuth';

export default function ClaimHistoryPage() {
  const { user } = useAuth();

  if (!user?.address) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Claim History</h1>
            <p className="text-gray-600">Please connect your wallet to view your claim history.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Claim History</h1>
          <p className="text-gray-600">View all claims you've submitted and their current status.</p>
        </div>
        
        <ClaimHistoryList userAddress={user.address} />
      </div>
    </div>
  );
}
