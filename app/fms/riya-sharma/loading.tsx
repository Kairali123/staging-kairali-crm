import { Skeleton } from "@/components/ui/skeleton"

export default function RiyaSharmaLoading() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Skeleton className="h-8 w-80" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-96" />
        <Skeleton className="h-96 md:col-span-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  )
}
