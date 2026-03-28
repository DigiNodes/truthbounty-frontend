import { Skeleton } from "@/components/ui/skeleton"

export function MainClaimCardSkeleton() {
  return (
    <div className="bg-[#13141b] border border-gray-800 rounded-xl p-6 mb-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-md" />
      </div>

      {/* Title */}
      <Skeleton className="h-8 w-3/4 mb-3" />

      {/* Meta row */}
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Verification Breakdown section */}
      <div className="space-y-6">
        <div>
          <Skeleton className="h-5 w-40 mb-3" />
          <div className="flex justify-between mb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
          <Skeleton className="h-3 w-48 mt-2" />
        </div>

        {/* Confidence Score section */}
        <div>
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="flex items-center gap-4">
            <Skeleton className="flex-1 h-2.5 rounded-full" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 pt-4">
          <Skeleton className="flex-1 h-12 rounded-lg" />
          <Skeleton className="flex-1 h-12 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
