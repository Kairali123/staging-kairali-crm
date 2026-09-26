import type { ReactNode } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function GrmLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
