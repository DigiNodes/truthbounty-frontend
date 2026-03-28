import { Skeleton } from "@/components/ui/skeleton"

export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-[#18181b] rounded-xl p-6 flex flex-col items-center justify-center border border-[#232329]"
        >
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}
