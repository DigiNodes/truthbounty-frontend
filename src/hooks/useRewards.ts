'use client';

import { useRewardsClaim } from '@/hooks/useRewardsClaim';
import type { RewardsClaimStatus, ClaimableRewardItem } from '@/lib/rewards-claim';

export type ClaimStatus = RewardsClaimStatus | 'success';

export interface ExtendedRewardItem extends Partial<ClaimableRewardItem> {
  id: string;
  claimId?: string;
  amount: number | string;
  amountRaw?: string;
  amountFormatted?: string;
  category?: string;
  categoryExplanation?: string;
  reason?: string;
  title?: string;
}

export interface UseRewardsResult {
  totalClaimable: number;
  totalClaimableDisplay: string;
  pendingRewards: ExtendedRewardItem[];
  isLoading: boolean;
  loadError: string | null;
  errorMessage: string | null;
  isUnsupported: boolean;
  unsupportedReason: string | null;
  lastTxHash: `0x${string}` | null;
  receiptProjection: {
    receivedAssets: Array<{ asset: string; amount: string; symbol?: string }>;
    outstandingClaimIds: string[];
  } | null;
  claimAll: () => Promise<void>;
  status: ClaimStatus;
  refresh: () => void;
  reset: () => void;
}

export function useRewards(): UseRewardsResult {
  const claim = useRewardsClaim();

  const formattedRewards: ExtendedRewardItem[] = (claim.rewards || []).map((r) => ({
    ...r,
    claimId: r.id,
    amountRaw: typeof r.amount === 'number' ? `${r.amount} ETH` : String(r.amount),
    amountFormatted: typeof r.amount === 'number' ? `${r.amount.toFixed(4)} ETH` : String(r.amount),
    category: 'claim_bounty',
    categoryExplanation: r.reason || 'Bounty resolution reward',
  }));

  const status: ClaimStatus =
    claim.status === 'confirmed' || claim.status === 'finalized'
      ? 'success'
      : claim.status;

  return {
    totalClaimable: claim.totalClaimable,
    totalClaimableDisplay: `${claim.totalClaimable.toFixed(4)} ETH`,
    pendingRewards: formattedRewards,
    isLoading: claim.status === 'loading' || claim.status === 'awaitingSignature',
    loadError: claim.errorMessage,
    errorMessage: claim.errorMessage,
    isUnsupported: !claim.eligibility.canClaim && claim.eligibility.reason === 'wrong-chain',
    unsupportedReason: claim.eligibility.message,
    lastTxHash: claim.txHash,
    receiptProjection: null,
    claimAll: claim.claim,
    status,
    refresh: claim.refresh,
    reset: () => {},
  };
}
