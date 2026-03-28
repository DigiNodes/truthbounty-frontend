import { Skeleton } from "@/components/ui/skeleton"

export function ClaimRewardsPanelSkeleton() {
  return (
    <div className="bg-[#18181b] rounded-xl border border-[#232329] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#232329]">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" className="h-8 w-8" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        {/* Total + Claim button */}
        <div className="flex items-center gap-4">
          <div className="text-right flex flex-col gap-1 items-end">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Reward list */}
      <div className="divide-y divide-[#232329]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-6 py-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="h-2 w-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
