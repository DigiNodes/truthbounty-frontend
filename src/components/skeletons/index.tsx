import { StatsCardsSkeleton } from "./StatsCardsSkeleton"
import { ActiveClaimsTableSkeleton } from "./ActiveClaimsTableSkeleton"
import { VerificationNodesSkeleton } from "./VerificationNodesSkeleton"
import { ClaimRewardsPanelSkeleton } from "./ClaimRewardsPanelSkeleton"
import { ActivityChartSkeleton } from "./ActivityChartSkeleton"
import { MainClaimCardSkeleton } from "./MainClaimCardSkeleton"
import { ClaimDetailsSkeleton } from "./ClaimDetailsSkeleton"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <StatsCardsSkeleton />
      <ClaimRewardsPanelSkeleton />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <ActivityChartSkeleton />
        </div>
        <div className="xl:col-span-1">
          <VerificationNodesSkeleton />
        </div>
      </div>
      <ActiveClaimsTableSkeleton />
    </div>
  )
}

export {
  StatsCardsSkeleton,
  ActiveClaimsTableSkeleton,
  VerificationNodesSkeleton,
  ClaimRewardsPanelSkeleton,
  ActivityChartSkeleton,
  MainClaimCardSkeleton,
  ClaimDetailsSkeleton,
}
