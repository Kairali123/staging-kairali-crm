export interface EmployeeMetrics {
  employeeId: string
  date: string
  loginTime: string
  logoutTime?: string
  totalWorkHours: number
  dialerActiveTime: number
  appsheetActiveTime: number
  pauseTime: number
  liveCallTime: number

  // Call Metrics
  totalCalls: number
  newCalls: number
  followUpCalls: number
  connectedCalls: number
  conversionCalls: number

  // Lead Metrics
  newLeadsAssigned: number
  followUpsPending: number
  leadsConverted: number
  conversionAmount: number
  conversionRate: number

  // Performance Metrics
  dailyTarget: number
  targetAchieved: number
  targetPercentage: number
  responseTime: number // average response time in hours
  delayedFollowUps: number
  timelyFollowUps: number

  // AI Scoring
  performanceScore: number
  rank: number
  efficiency: number
  quality: number
}

export interface TeamPerformance {
  teamId: string
  teamName: string
  managerId: string
  totalMembers: number
  activeMembers: number
  teamScore: number
  totalCalls: number
  totalConversions: number
  totalRevenue: number
  avgResponseTime: number
}

export interface PerformanceAlert {
  id: string
  employeeId: string
  type: "login_delay" | "target_miss" | "response_delay" | "low_performance" | "inactive"
  message: string
  severity: "low" | "medium" | "high" | "critical"
  createdAt: string
  resolved: boolean
}
