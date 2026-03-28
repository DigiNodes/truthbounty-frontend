import { Skeleton } from "@/components/ui/skeleton"

export function VerificationNodesSkeleton() {
  return (
    <div className="bg-[#18181b] rounded-xl p-6 h-72 border border-[#232329] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-lg bg-[#232329]/50"
            >
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-[#232329] flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}
