import Link from 'next/link';
import { Claim } from '@/types/claim';
import { ClaimStatusBadge } from './ClaimStatusBadge';

interface ClaimCardProps {
  claim: Claim;
}

export function ClaimCard({ claim }: ClaimCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
          <Link 
            href={`/claims/${claim.id}`}
            className="hover:text-blue-600 transition-colors"
          >
            {claim.title}
          </Link>
        </h3>
        <ClaimStatusBadge status={claim.status} />
      </div>
      
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {claim.description}
      </p>
      
      <div className="flex justify-between items-center text-xs text-gray-500">
        <div className="flex gap-4">
          <span>Verifications: {claim.verificationCount}</span>
          <span>Disputes: {claim.disputeCount}</span>
        </div>
        <span>
          {new Date(claim.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
