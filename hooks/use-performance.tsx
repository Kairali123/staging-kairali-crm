"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { EmployeeMetrics, TeamPerformance, PerformanceAlert } from "@/types/performance"
import { useAuth } from "@/hooks/use-auth"
import { useCalls } from "@/hooks/use-calls"
import { useLeads } from "@/hooks/use-leads"

interface PerformanceContextType {
  employeeMetrics: EmployeeMetrics[]
  teamPerformance: TeamPerformance[]
  performanceAlerts: PerformanceAlert[]
  getEmployeeMetrics: (employeeId: string, dateRange?: { start: string; end: string }) => EmployeeMetrics[]
  getTeamMetrics: (teamId: string) => TeamPerformance | null
  getRankings: (period: "daily" | "weekly" | "monthly" | "yearly") => EmployeeMetrics[]
  getPerformanceAlerts: (employeeId?: string) => PerformanceAlert[]
  updateEmployeeTarget: (
    employeeId: string,
    targets: { daily: number; weekly: number; monthly: number },
  ) => Promise<void>
  resolveAlert: (alertId: string) => Promise<void>
  isLoading: boolean
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined)

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const { user, getAllUsers } = useAuth()
  const { agentPerformance } = useCalls()
  const { leads, stats } = useLeads()
  const [employeeMetrics, setEmployeeMetrics] = useState<EmployeeMetrics[]>([])
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([])
  const [performanceAlerts, setPerformanceAlerts] = useState<PerformanceAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Calculate AI-based performance score
  const calculatePerformanceScore = (metrics: Partial<EmployeeMetrics>): number => {
    const {
      conversionRate = 0,
      targetPercentage = 0,
      responseTime = 24,
      timelyFollowUps = 0,
      delayedFollowUps = 0,
      totalCalls = 0,
      liveCallTime = 0,
      totalWorkHours = 8,
    } = metrics

    // Scoring factors (out of 100)
    const conversionScore = Math.min(conversionRate * 2, 25) // Max 25 points for 12.5%+ conversion
    const targetScore = Math.min(targetPercentage / 4, 25) // Max 25 points for 100%+ target achievement
    const responseScore = Math.max(25 - responseTime / 2, 0) // Max 25 points for <2 hour response
    const timelinessScore =
      timelyFollowUps > 0 ? Math.min((timelyFollowUps / (timelyFollowUps + delayedFollowUps)) * 15, 15) : 0 // Max 15 points
    const activityScore = totalCalls > 0 ? Math.min((liveCallTime / (totalWorkHours * 3600)) * 10, 10) : 0 // Max 10 points

    return Math.round(conversionScore + targetScore + responseScore + timelinessScore + activityScore)
  }

  // Generate mock performance data
  useEffect(() => {
    const users = getAllUsers()
    const today = new Date().toISOString().split("T")[0]

    const mockMetrics: EmployeeMetrics[] = users
      .filter((u) => u.role === "sales_agent" || u.role === "sales_manager")
      .map((employee, index) => {
        const baseMetrics = {
          employeeId: employee.id,
          date: today,
          loginTime: `${8 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60)
            .toString()
            .padStart(2, "0")}:00`,
          totalWorkHours: 7 + Math.random() * 2,
          dialerActiveTime: 4 + Math.random() * 3,
          appsheetActiveTime: 2 + Math.random() * 2,
          pauseTime: Math.random() * 60,
          liveCallTime: 3 + Math.random() * 4,

          totalCalls: 20 + Math.floor(Math.random() * 40),
          newCalls: 10 + Math.floor(Math.random() * 20),
          followUpCalls: 5 + Math.floor(Math.random() * 15),
          connectedCalls: 15 + Math.floor(Math.random() * 25),
          conversionCalls: Math.floor(Math.random() * 5),

          newLeadsAssigned: 5 + Math.floor(Math.random() * 10),
          followUpsPending: Math.floor(Math.random() * 8),
          leadsConverted: Math.floor(Math.random() * 3),
          conversionAmount: Math.floor(Math.random() * 50000),
          conversionRate: Math.random() * 15,

          dailyTarget: employee.targets?.daily || 30,
          targetAchieved: 0,
          targetPercentage: 0,
          responseTime: 1 + Math.random() * 6,
          delayedFollowUps: Math.floor(Math.random() * 5),
          timelyFollowUps: 10 + Math.floor(Math.random() * 15),

          performanceScore: 0,
          rank: 0,
          efficiency: 70 + Math.random() * 30,
          quality: 60 + Math.random() * 40,
        }

        baseMetrics.targetPercentage = (baseMetrics.totalCalls / baseMetrics.dailyTarget) * 100
        baseMetrics.targetAchieved = Math.min(baseMetrics.totalCalls, baseMetrics.dailyTarget)
        baseMetrics.performanceScore = calculatePerformanceScore(baseMetrics)

        return baseMetrics
      })

    // Sort by performance score and assign ranks
    mockMetrics.sort((a, b) => b.performanceScore - a.performanceScore)
    mockMetrics.forEach((metric, index) => {
      metric.rank = index + 1
    })

    setEmployeeMetrics(mockMetrics)

    // Generate performance alerts
    const alerts: PerformanceAlert[] = []
    mockMetrics.forEach((metric) => {
      if (metric.targetPercentage < 50) {
        alerts.push({
          id: `alert-${metric.employeeId}-target`,
          employeeId: metric.employeeId,
          type: "target_miss",
          message: `Daily target achievement is only ${metric.targetPercentage.toFixed(1)}%`,
          severity: metric.targetPercentage < 25 ? "critical" : "high",
          createdAt: new Date().toISOString(),
          resolved: false,
        })
      }

      if (metric.responseTime > 4) {
        alerts.push({
          id: `alert-${metric.employeeId}-response`,
          employeeId: metric.employeeId,
          type: "response_delay",
          message: `Average response time is ${metric.responseTime.toFixed(1)} hours`,
          severity: metric.responseTime > 8 ? "critical" : "medium",
          createdAt: new Date().toISOString(),
          resolved: false,
        })
      }

      if (metric.performanceScore < 40) {
        alerts.push({
          id: `alert-${metric.employeeId}-performance`,
          employeeId: metric.employeeId,
          type: "low_performance",
          message: `Performance score is ${metric.performanceScore}/100`,
          severity: "high",
          createdAt: new Date().toISOString(),
          resolved: false,
        })
      }
    })

    setPerformanceAlerts(alerts)

    // Generate team performance
    const teams: TeamPerformance[] = [
      {
        teamId: "sales-team-1",
        teamName: "Sales Team Alpha",
        managerId: "2",
        totalMembers: mockMetrics.length,
        activeMembers: mockMetrics.filter((m) => m.totalCalls > 0).length,
        teamScore: Math.round(mockMetrics.reduce((sum, m) => sum + m.performanceScore, 0) / mockMetrics.length),
        totalCalls: mockMetrics.reduce((sum, m) => sum + m.totalCalls, 0),
        totalConversions: mockMetrics.reduce((sum, m) => sum + m.conversionCalls, 0),
        totalRevenue: mockMetrics.reduce((sum, m) => sum + m.conversionAmount, 0),
        avgResponseTime: mockMetrics.reduce((sum, m) => sum + m.responseTime, 0) / mockMetrics.length,
      },
    ]

    setTeamPerformance(teams)
  }, [getAllUsers])

  const getEmployeeMetrics = (employeeId: string, dateRange?: { start: string; end: string }): EmployeeMetrics[] => {
    return employeeMetrics.filter(
      (metric) =>
        metric.employeeId === employeeId &&
        (!dateRange || (metric.date >= dateRange.start && metric.date <= dateRange.end)),
    )
  }

  const getTeamMetrics = (teamId: string): TeamPerformance | null => {
    return teamPerformance.find((team) => team.teamId === teamId) || null
  }

  const getRankings = (period: "daily" | "weekly" | "monthly" | "yearly"): EmployeeMetrics[] => {
    // For now, return daily rankings. In real implementation, filter by period
    return [...employeeMetrics].sort((a, b) => b.performanceScore - a.performanceScore)
  }

  const getPerformanceAlerts = (employeeId?: string): PerformanceAlert[] => {
    return performanceAlerts
      .filter((alert) => !employeeId || alert.employeeId === employeeId)
      .filter((alert) => !alert.resolved)
  }

  const updateEmployeeTarget = async (
    employeeId: string,
    targets: { daily: number; weekly: number; monthly: number },
  ) => {
    // Update employee targets - in real implementation, this would call an API
    setEmployeeMetrics((prev) =>
      prev.map((metric) =>
        metric.employeeId === employeeId
          ? { ...metric, dailyTarget: targets.daily, targetPercentage: (metric.totalCalls / targets.daily) * 100 }
          : metric,
      ),
    )
  }

  const resolveAlert = async (alertId: string) => {
    setPerformanceAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, resolved: true } : alert)))
  }

  return (
    <PerformanceContext.Provider
      value={{
        employeeMetrics,
        teamPerformance,
        performanceAlerts,
        getEmployeeMetrics,
        getTeamMetrics,
        getRankings,
        getPerformanceAlerts,
        updateEmployeeTarget,
        resolveAlert,
        isLoading,
      }}
    >
      {children}
    </PerformanceContext.Provider>
  )
}

export function usePerformance() {
  const context = useContext(PerformanceContext)
  if (context === undefined) {
    throw new Error("usePerformance must be used within a PerformanceProvider")
  }
  return context
}
