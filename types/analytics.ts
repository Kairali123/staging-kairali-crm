export interface AnalyticsData {
  sales: SalesAnalytics
  leads: LeadAnalytics
  performance: PerformanceAnalytics
  fms: FMSAnalytics
  helpdesk: HelpdeskAnalytics
  executive: ExecutiveKPIs
  referrals?: ReferralAnalytics
  complaints?: ComplaintAnalytics
  feedback?: FeedbackAnalytics
}

export interface SalesAnalytics {
  totalRevenue: number
  monthlyRevenue: number
  conversionRate: number
  avgDealSize: number
  salesByAgent: Array<{ name: string; amount: number; deals: number }>
  revenueByMonth: Array<{ month: string; revenue: number }>
  topServices: Array<{ service: string; revenue: number; count: number }>
}

export interface LeadAnalytics {
  totalLeads: number
  convertedLeads: number
  conversionRate: number
  leadsBySource: Array<{ source: string; count: number; conversion: number }>
  leadsByStatus: Array<{ status: string; count: number }>
  leadTrends: Array<{ date: string; leads: number; conversions: number }>
  avgResponseTime: number
}

export interface PerformanceAnalytics {
  totalEmployees: number
  activeEmployees: number
  avgProductivity: number
  topPerformers: Array<{ name: string; score: number; calls: number; conversions: number }>
  departmentPerformance: Array<{ department: string; avgScore: number; employees: number }>
  productivityTrends: Array<{ date: string; productivity: number }>
}

export interface FMSAnalytics {
  totalBookings: number
  completedBookings: number
  completionRate: number
  totalComplaints: number
  resolvedComplaints: number
  resolutionRate: number
  bookingsByService: Array<{ service: string; count: number }>
  complaintsByCategory: Array<{ category: string; count: number }>
  avgResolutionTime: number
}

export interface HelpdeskAnalytics {
  totalTickets: number
  resolvedTickets: number
  resolutionRate: number
  avgResolutionTime: number
  ticketsByCategory: Array<{ category: string; count: number }>
  slaCompliance: number
  escalationRate: number
}

export interface ExecutiveKPIs {
  totalRevenue: number
  revenueGrowth: number
  customerSatisfaction: number
  employeeProductivity: number
  operationalEfficiency: number
  leadConversionRate: number
  systemUptime: number
  costPerAcquisition: number
}

export interface ReferralAnalytics {
  totalReferrals: number
  conversionRate: number
  topReferrers: Array<{ name: string; count: number; reward: number }>
}

export interface ComplaintAnalytics {
  totalComplaints: number
  resolutionRate: number
  topCategories: Array<{ category: string; count: number; severity: string }>
}

export interface FeedbackAnalytics {
  avgRating: number
  totalReviews: number
  ratingDistribution: Array<{ rating: number; count: number; percentage: number }>
}

export interface ReportFilter {
  dateRange: {
    from: string
    to: string
  }
  department?: string
  company?: "KAPPL" | "KTAHV"
  category?: string
  status?: string
}
