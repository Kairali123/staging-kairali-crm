import type React from 'react'
import { DashboardLayout } from "@/components/dashboard-layout"
import "./leadguard-globals.css";
import "./leadguard-totals.css";
import "./leadguard-enhanced.css";

export default function LeadLostMonitorLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
