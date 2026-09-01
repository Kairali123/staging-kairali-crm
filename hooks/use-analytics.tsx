"use client"

import type React from "react"
import { useState, createContext, useContext } from "react"
import type { AnalyticsData, ReportFilter } from "@/types/analytics"

const mockAnalyticsData: AnalyticsData = {
  sales: {
    totalRevenue: 2450000,
    monthlyRevenue: 245000,
    conversionRate: 18.5,
    avgDealSize: 15000,
    salesByAgent: [
      { name: "Priya Nair", amount: 450000, deals: 30 },
      { name: "Ravi Kumar", amount: 380000, deals: 25 },
      { name: "Meera Pillai", amount: 320000, deals: 22 },
      { name: "Suresh Nair", amount: 290000, deals: 19 },
    ],
    revenueByMonth: [
      { month: "Jan", revenue: 180000 },
      { month: "Feb", revenue: 220000 },
      { month: "Mar", revenue: 245000 },
      { month: "Apr", revenue: 280000 },
      { month: "May", revenue: 310000 },
      { month: "Jun", revenue: 290000 },
    ],
    topServices: [
      { service: "Ayurvedic Consultation", revenue: 850000, count: 120 },
      { service: "Panchakarma Treatment", revenue: 650000, count: 85 },
      { service: "Wellness Package", revenue: 480000, count: 95 },
    ],
  },
  leads: {
    totalLeads: 1250,
    convertedLeads: 231,
    conversionRate: 18.5,
    leadsBySource: [
      { source: "Website", count: 450, conversion: 22.1 },
      { source: "Social Media", count: 320, conversion: 18.8 },
      { source: "Referral", count: 280, conversion: 25.4 },
      { source: "Direct Call", count: 200, conversion: 12.5 },
    ],
    leadsByStatus: [
      { status: "New", count: 125 },
      { status: "Contacted", count: 340 },
      { status: "Qualified", count: 285 },
      { status: "Converted", count: 231 },
      { status: "Lost", count: 269 },
    ],
    leadTrends: [
      { date: "2024-01-15", leads: 45, conversions: 8 },
      { date: "2024-01-16", leads: 52, conversions: 12 },
      { date: "2024-01-17", leads: 38, conversions: 7 },
      { date: "2024-01-18", leads: 61, conversions: 15 },
      { date: "2024-01-19", leads: 48, conversions: 9 },
    ],
    avgResponseTime: 2.3,
  },
  performance: {
    totalEmployees: 45,
    activeEmployees: 42,
    avgProductivity: 78.5,
    topPerformers: [
      { name: "Priya Nair", score: 95.2, calls: 180, conversions: 34 },
      { name: "Ravi Kumar", score: 92.8, calls: 165, conversions: 31 },
      { name: "Meera Pillai", score: 89.4, calls: 155, conversions: 28 },
      { name: "Suresh Nair", score: 87.1, calls: 142, conversions: 25 },
    ],
    departmentPerformance: [
      { department: "Sales", avgScore: 85.2, employees: 12 },
      { department: "Customer Service", avgScore: 82.8, employees: 8 },
      { department: "Operations", avgScore: 79.4, employees: 15 },
      { department: "Admin", avgScore: 76.1, employees: 10 },
    ],
    productivityTrends: [
      { date: "2024-01-15", productivity: 76.2 },
      { date: "2024-01-16", productivity: 78.5 },
      { date: "2024-01-17", productivity: 75.8 },
      { date: "2024-01-18", productivity: 81.2 },
      { date: "2024-01-19", productivity: 78.5 },
    ],
  },
  fms: {
    totalBookings: 485,
    completedBookings: 421,
    completionRate: 86.8,
    totalComplaints: 23,
    resolvedComplaints: 19,
    resolutionRate: 82.6,
    bookingsByService: [
      { service: "Ayurvedic Consultation", count: 185 },
      { service: "Panchakarma Treatment", count: 142 },
      { service: "Wellness Package", count: 98 },
      { service: "Health Checkup", count: 60 },
    ],
    complaintsByCategory: [
      { category: "Service Quality", count: 8 },
      { category: "Billing", count: 6 },
      { category: "Staff Behavior", count: 5 },
      { category: "Facility", count: 4 },
    ],
    avgResolutionTime: 2.1,
  },
  helpdesk: {
    totalTickets: 156,
    resolvedTickets: 134,
    resolutionRate: 85.9,
    avgResolutionTime: 1.8,
    ticketsByCategory: [
      { category: "IT", count: 68 },
      { category: "HR", count: 32 },
      { category: "Facilities", count: 28 },
      { category: "Finance", count: 18 },
      { category: "General", count: 10 },
    ],
    slaCompliance: 92.3,
    escalationRate: 8.7,
  },
  executive: {
    totalRevenue: 2450000,
    revenueGrowth: 15.8,
    customerSatisfaction: 4.2,
    employeeProductivity: 78.5,
    operationalEfficiency: 84.2,
    leadConversionRate: 18.5,
    systemUptime: 99.2,
    costPerAcquisition: 2800,
  },
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData>(mockAnalyticsData)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<ReportFilter>({
    dateRange: {
      from: "2024-01-01",
      to: "2024-01-31",
    },
  })

  const generateReport = async (reportType: string, customFilters?: ReportFilter) => {
    setLoading(true)
    try {
      // Simulate report generation
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const reportData = {
        type: reportType,
        filters: customFilters || filters,
        generatedAt: new Date().toISOString(),
        data: data,
      }

      return { success: true, data: reportData }
    } catch (error) {
      return { success: false, error: "Failed to generate report" }
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: "pdf" | "excel" | "csv", reportData: any) => {
    setLoading(true)
    try {
      // Simulate export
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // In real implementation, this would generate and download the file
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `report-${Date.now()}.${format === "excel" ? "xlsx" : format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to export report" }
    } finally {
      setLoading(false)
    }
  }

  const updateFilters = (newFilters: Partial<ReportFilter>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  return {
    data,
    filters,
    loading,
    generateReport,
    exportReport,
    updateFilters,
  }
}

type AnalyticsContextType = ReturnType<typeof useAnalytics>

const AnalyticsContext = createContext<AnalyticsContextType | null>(null)

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const analytics = useAnalytics()
  return <AnalyticsContext.Provider value={analytics}>{children}</AnalyticsContext.Provider>
}

export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error("useAnalyticsContext must be used within AnalyticsProvider")
  }
  return context
}
