"use client"

import React from "react"
import { PerformanceProvider } from "@/hooks/use-performance"
import { CallsProvider } from "@/hooks/use-calls"

export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <CallsProvider>
      <PerformanceProvider>{children}</PerformanceProvider>
    </CallsProvider>
  )
}
