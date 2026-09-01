import type React from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { CallsProvider } from "@/hooks/use-calls"

export default function CallsLayout({ children }: { children: React.ReactNode }) {
  return (
    <CallsProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </CallsProvider>
  )
}
