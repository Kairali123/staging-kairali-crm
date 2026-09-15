import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/authz"

export interface SourceReportRow {
  source: string
  totalConsults: number
  done: number
  cancelled: number
  pending: number
  converted: number
  conversionRate: number
  revenue: number
  avgRevenuePerConsult: number
}

export interface DoctorPerformanceRow {
  doctorId: string
  doctorName: string
  specialization: string
  totalConsults: number
  done: number
  cancelled: number
  pending: number
  converted: number
  conversionRate: number
  revenue: number
  avgSlaMinutes: number
}

export interface DetailedConsultationItem {
  id: string
  consultationId: string
  enquiryId: string
  patientName: string
  patientId: string
  mobile: string
  email: string
  enquirySource: string
  doctorName: string
  appointmentType: string
  scheduledDate: string
  scheduledTime: string
  status: "completed" | "pending" | "cancelled" | "converted"
  stage: string
  slaStatus: "on-time" | "at-risk" | "overdue"
  revenue: number
  prescriptionUrl?: string
  clientReportUrl?: string
  doshaReportUrl?: string
  postConsultationRemarks?: string
  createdAt: string
}

// Data mirroring reference email template:
// Weekly Period (31-08-2026 to 06-09-2026)
const WEEKLY_SOURCE_DATA: SourceReportRow[] = [
  { source: "Website", totalConsults: 10, done: 5, cancelled: 1, pending: 4, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
  { source: "IVR", totalConsults: 7, done: 1, cancelled: 5, pending: 1, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
  { source: "PriyaSharma AI Chat", totalConsults: 4, done: 3, cancelled: 1, pending: 0, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
  { source: "Site Exit Pop-Up", totalConsults: 1, done: 0, cancelled: 0, pending: 1, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
  { source: "Facebook", totalConsults: 1, done: 0, cancelled: 0, pending: 1, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
]

// Overall Total (02-07-2024 to 06-09-2026)
const OVERALL_SOURCE_DATA: SourceReportRow[] = [
  { source: "Website", totalConsults: 2488, done: 1552, cancelled: 924, pending: 11, converted: 140, conversionRate: 9.02, revenue: 31268920, avgRevenuePerConsult: 223349 },
  { source: "PriyaSharma AI Chat", totalConsults: 1231, done: 600, cancelled: 628, pending: 3, converted: 32, conversionRate: 5.33, revenue: 4774142, avgRevenuePerConsult: 149191 },
  { source: "Others", totalConsults: 374, done: 175, cancelled: 197, pending: 1, converted: 2, conversionRate: 1.14, revenue: 2429, avgRevenuePerConsult: 1214 },
  { source: "Google", totalConsults: 346, done: 161, cancelled: 184, pending: 1, converted: 7, conversionRate: 4.35, revenue: 1035974, avgRevenuePerConsult: 147996 },
  { source: "Facebook", totalConsults: 264, done: 93, cancelled: 170, pending: 1, converted: 2, conversionRate: 2.15, revenue: 2229, avgRevenuePerConsult: 1114 },
  { source: "IVR", totalConsults: 230, done: 75, cancelled: 149, pending: 6, converted: 2, conversionRate: 2.67, revenue: 478261, avgRevenuePerConsult: 239130 },
  { source: "Site Exit Pop-Up", totalConsults: 13, done: 8, cancelled: 4, pending: 1, converted: 1, conversionRate: 12.5, revenue: 580, avgRevenuePerConsult: 580 },
  { source: "Reference", totalConsults: 4, done: 2, cancelled: 2, pending: 0, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
  { source: "CRR", totalConsults: 3, done: 3, cancelled: 0, pending: 0, converted: 2, conversionRate: 66.67, revenue: 1020, avgRevenuePerConsult: 510 },
  { source: "Referral", totalConsults: 1, done: 0, cancelled: 1, pending: 0, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
]

const DOCTOR_PERFORMANCE: DoctorPerformanceRow[] = [
  { doctorId: "DOC-001", doctorName: "Dr. Riya Sharma", specialization: "Senior Ayurveda Specialist", totalConsults: 1840, done: 1020, cancelled: 736, pending: 84, converted: 84, conversionRate: 8.24, revenue: 18540000, avgSlaMinutes: 38 },
  { doctorId: "DOC-002", doctorName: "Dr. Amit Patel", specialization: "Panchakarma & Wellness Expert", totalConsults: 1420, done: 780, cancelled: 588, pending: 52, converted: 52, conversionRate: 6.67, revenue: 11230000, avgSlaMinutes: 44 },
  { doctorId: "DOC-003", doctorName: "Dr. Ananya Sen", specialization: "Holistic Health Specialist", totalConsults: 980, done: 535, cancelled: 411, pending: 34, converted: 34, conversionRate: 6.36, revenue: 5240000, avgSlaMinutes: 41 },
  { doctorId: "DOC-004", doctorName: "Dr. Vikram Malhotra", specialization: "Ayurvedic Physician", totalConsults: 714, done: 334, cancelled: 362, pending: 18, converted: 18, conversionRate: 5.39, revenue: 2553555, avgSlaMinutes: 49 },
]

const SAMPLE_CONSULTATION_RECORDS: DetailedConsultationItem[] = [
  {
    id: "C-1001",
    consultationId: "CONS-2026-001",
    enquiryId: "ENQ-2026-0941",
    patientName: "Mrs. Priya Nair",
    patientId: "P-2001",
    mobile: "+91 9876543210",
    email: "priya.nair@email.com",
    enquirySource: "Website",
    doctorName: "Dr. Riya Sharma",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-04",
    scheduledTime: "10:00 AM",
    status: "converted",
    stage: "Handover to KAPPL/KTAHV",
    slaStatus: "on-time",
    revenue: 250000,
    prescriptionUrl: "https://reports.kairali.com/rx/001.pdf",
    clientReportUrl: "https://reports.kairali.com/client/001",
    doshaReportUrl: "https://reports.kairali.com/dosha/001",
    postConsultationRemarks: "Pitta-Vata imbalance. Recommended 14-day Panchakarma package at KTAHV resort.",
    createdAt: "2026-09-01T09:30:00Z",
  },
  {
    id: "C-1002",
    consultationId: "CONS-2026-002",
    enquiryId: "ENQ-2026-0942",
    patientName: "Mr. Rajesh Kumar",
    patientId: "P-2002",
    mobile: "+91 9876543211",
    email: "rajesh.kumar@email.com",
    enquirySource: "PriyaSharma AI Chat",
    doctorName: "Dr. Amit Patel",
    appointmentType: "In-Person Consultation",
    scheduledDate: "2026-09-05",
    scheduledTime: "02:30 PM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 15000,
    prescriptionUrl: "https://reports.kairali.com/rx/002.pdf",
    clientReportUrl: "https://reports.kairali.com/client/002",
    postConsultationRemarks: "Prescribed internal medicines for diabetes and lifestyle modifications.",
    createdAt: "2026-09-02T11:15:00Z",
  },
  {
    id: "C-1003",
    consultationId: "CONS-2026-003",
    enquiryId: "ENQ-2026-0943",
    patientName: "Dr. Sunita Deshmukh",
    patientId: "P-2003",
    mobile: "+91 9811223344",
    email: "sunita.d@hospital.org",
    enquirySource: "Google",
    doctorName: "Dr. Ananya Sen",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-06",
    scheduledTime: "11:00 AM",
    status: "converted",
    stage: "Handover to KAPPL/KTAHV",
    slaStatus: "on-time",
    revenue: 420000,
    prescriptionUrl: "https://reports.kairali.com/rx/003.pdf",
    clientReportUrl: "https://reports.kairali.com/client/003",
    doshaReportUrl: "https://reports.kairali.com/dosha/003",
    postConsultationRemarks: "Booked 21-day Rejuvenation Package with custom Rasayana therapy.",
    createdAt: "2026-09-03T14:00:00Z",
  },
  {
    id: "C-1004",
    consultationId: "CONS-2026-004",
    enquiryId: "ENQ-2026-0944",
    patientName: "Mr. Vikramaditya Singh",
    patientId: "P-2004",
    mobile: "+91 9988776655",
    email: "vsingh@royalgroup.in",
    enquirySource: "IVR",
    doctorName: "Dr. Vikram Malhotra",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-07",
    scheduledTime: "04:00 PM",
    status: "pending",
    stage: "Day-Of Reminder",
    slaStatus: "at-risk",
    revenue: 0,
    clientReportUrl: "https://reports.kairali.com/client/004",
    postConsultationRemarks: "Awaiting patient confirmation for pre-consultation medical records.",
    createdAt: "2026-09-06T10:00:00Z",
  },
  {
    id: "C-1005",
    consultationId: "CONS-2026-005",
    enquiryId: "ENQ-2026-0945",
    patientName: "Mrs. Meenakshi Sundaram",
    patientId: "P-2005",
    mobile: "+91 9765432109",
    email: "meenakshi@gmail.com",
    enquirySource: "Site Exit Pop-Up",
    doctorName: "Dr. Riya Sharma",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-08",
    scheduledTime: "03:00 PM",
    status: "pending",
    stage: "Appointment Fix",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-06T16:45:00Z",
  },
  {
    id: "C-1006",
    consultationId: "CONS-2026-006",
    enquiryId: "ENQ-2026-0946",
    patientName: "Mr. Arvind Swamy",
    patientId: "P-2006",
    mobile: "+91 9840123456",
    email: "arvind.swamy@techcorp.com",
    enquirySource: "Facebook",
    doctorName: "Dr. Amit Patel",
    appointmentType: "In-Person Consultation",
    scheduledDate: "2026-09-03",
    scheduledTime: "12:00 PM",
    status: "cancelled",
    stage: "Intake",
    slaStatus: "overdue",
    revenue: 0,
    postConsultationRemarks: "Patient rescheduled due to travel conflict; no answer on follow up call.",
    createdAt: "2026-09-01T08:20:00Z",
  },
  {
    id: "C-1007",
    consultationId: "CONS-2026-007",
    enquiryId: "ENQ-2026-0947",
    patientName: "Ms. Shalini Gupta",
    patientId: "P-2007",
    mobile: "+91 9820011223",
    email: "shalini.gupta@design.com",
    enquirySource: "CRR",
    doctorName: "Dr. Ananya Sen",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-05",
    scheduledTime: "05:00 PM",
    status: "converted",
    stage: "Handover to KAPPL/KTAHV",
    slaStatus: "on-time",
    revenue: 180000,
    prescriptionUrl: "https://reports.kairali.com/rx/007.pdf",
    clientReportUrl: "https://reports.kairali.com/client/007",
    postConsultationRemarks: "Repeat customer from CRR drive. Booked Detox Program.",
    createdAt: "2026-09-02T15:30:00Z",
  },
]

export async function GET(request: NextRequest) {
  const user = getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period") || "this_week"
  const source = searchParams.get("source") || "all"
  const doctor = searchParams.get("doctor") || "all"
  const status = searchParams.get("status") || "all"
  const q = (searchParams.get("q") || "").toLowerCase().trim()

  // Calculate totals helper
  const calculateTotals = (rows: SourceReportRow[]) => {
    const totalConsults = rows.reduce((acc, r) => acc + r.totalConsults, 0)
    const done = rows.reduce((acc, r) => acc + r.done, 0)
    const cancelled = rows.reduce((acc, r) => acc + r.cancelled, 0)
    const pending = rows.reduce((acc, r) => acc + r.pending, 0)
    const converted = rows.reduce((acc, r) => acc + r.converted, 0)
    const revenue = rows.reduce((acc, r) => acc + r.revenue, 0)
    const conversionRate = totalConsults > 0 ? parseFloat(((converted / totalConsults) * 100).toFixed(2)) : 0
    const avgRevenuePerConsult = converted > 0 ? Math.round(revenue / converted) : 0

    return {
      totalConsults,
      done,
      cancelled,
      pending,
      converted,
      conversionRate,
      revenue,
      avgRevenuePerConsult,
    }
  }

  // Filter sources if requested
  let weeklyRows = [...WEEKLY_SOURCE_DATA]
  let overallRows = [...OVERALL_SOURCE_DATA]

  if (source !== "all") {
    weeklyRows = weeklyRows.filter((r) => r.source.toLowerCase() === source.toLowerCase())
    overallRows = overallRows.filter((r) => r.source.toLowerCase() === source.toLowerCase())
  }

  const weeklyTotals = calculateTotals(weeklyRows)
  const overallTotals = calculateTotals(overallRows)

  // Filter detailed consultations
  let detailed = [...SAMPLE_CONSULTATION_RECORDS]
  if (source !== "all") {
    detailed = detailed.filter((c) => c.enquirySource.toLowerCase() === source.toLowerCase())
  }
  if (doctor !== "all") {
    detailed = detailed.filter((c) => c.doctorName.toLowerCase().includes(doctor.toLowerCase()))
  }
  if (status !== "all") {
    detailed = detailed.filter((c) => c.status === status)
  }
  if (q) {
    detailed = detailed.filter(
      (c) =>
        c.patientName.toLowerCase().includes(q) ||
        c.consultationId.toLowerCase().includes(q) ||
        c.enquiryId.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.email.toLowerCase().includes(q)
    )
  }

  return NextResponse.json({
    meta: {
      generatedAt: new Date().toISOString(),
      period,
      weeklyDateRange: "31-08-2026 To 06-09-2026",
      overallDateRange: "02-07-2024 To 06-09-2026",
    },
    weeklyReport: {
      rows: weeklyRows,
      totals: weeklyTotals,
    },
    overallReport: {
      rows: overallRows,
      totals: overallTotals,
    },
    doctorsPerformance: DOCTOR_PERFORMANCE,
    detailedConsultations: detailed,
  })
}
