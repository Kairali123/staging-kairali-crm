"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface LoadingSkeletonProps {
  type?: "kpi" | "channel" | "chart"
  count?: number
}

export function LoadingSkeleton({ type = "kpi", count = 1 }: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i)

  if (type === "kpi") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        {skeletons.map((i) => (
          <Card key={i} className="rounded-2xl shadow-sm border-[#dfe7e2] bg-white">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-8 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
                  <div className="h-12 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-8 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-8 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-12 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-10 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-12 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (type === "channel") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {skeletons.map((i) => (
          <Card key={i} className="rounded-2xl shadow-sm border-[#dfe7e2] bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-4 animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="grid grid-cols-4 gap-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
                <div className="h-3 bg-gray-200 rounded w-48 animate-pulse mx-auto mt-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (type === "chart") {
    return (
      <div className="space-y-6 sm:space-y-8">
        {skeletons.map((i) => (
          <Card key={i} className="rounded-2xl shadow-sm border-[#dfe7e2] bg-white">
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80 bg-gray-200 rounded-lg animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return null
}
