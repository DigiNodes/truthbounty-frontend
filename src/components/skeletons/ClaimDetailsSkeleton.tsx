import { Skeleton } from "@/components/ui/skeleton"

export function ClaimDetailsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Warning banner placeholder */}
      <div className="hidden" />

      {/* Main content card */}
      <div className="card p-6 bg-[#18181b] border border-[#232329] rounded-xl space-y-4">
        {/* Title */}
        <Skeleton className="h-7 w-3/4" />

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Status */}
        <div className="mt-3 flex items-center gap-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Additional info grid */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}
