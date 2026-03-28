import { Skeleton } from "@/components/ui/skeleton"

export function ActivityChartSkeleton() {
  return (
    <div className="bg-[#18181b] rounded-xl p-6 h-72 flex flex-col justify-between border border-[#232329]">
      {/* Header */}
      <Skeleton className="h-5 w-40 mb-2" />

      {/* Chart area skeleton */}
      <div className="flex-1 w-full flex items-end gap-2 pb-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col gap-1 items-center">
            <div className="w-full flex flex-col gap-0.5 justify-end flex-1">
              <Skeleton className="w-full flex-1 rounded-t" style={{ height: `${Math.random() * 60 + 40}%` }} />
            </div>
            <Skeleton className="h-3 w-4 mt-2" />
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <Skeleton variant="circular" className="h-2 w-2" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}
