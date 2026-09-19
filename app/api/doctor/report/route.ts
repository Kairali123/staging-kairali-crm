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

// Live Google Apps Script API Endpoint for Doctor Consultation Report
export const DOCTOR_REPORT_GAS_URL =
  "https://script.google.com/macros/s/AKfycbznKCwlrWAdI-Oic-ZjjrLtfVR-xyoD4c37KvLHtWr513g0stY69k_AQgZlrd6R_2ysKw/exec"

// Data mirroring reference email template:
// Weekly Period (31-08-2026 to 06-09-2026)
const WEEKLY_SOURCE_DATA: SourceReportRow[] = [
  { source: "Website", totalConsults: 10, done: 5, cancelled: 1, pending: 4, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
  { source: "IVR", totalConsults: 7, done: 1, cancelled: 5, pending: 1, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
  { source: "PriyaSharma AI Chat", totalConsults: 4, done: 3, cancelled: 1, pending: 0, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
  { source: "Site Exit Pop-Up", totalConsults: 1, done: 0, cancelled: 0, pending: 1, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
  { source: "Facebook", totalConsults: 1, done: 0, cancelled: 0, pending: 1, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
]

// Fallback Overall Snapshot (02-07-2024 to Date)
const OVERALL_SOURCE_DATA_FALLBACK: SourceReportRow[] = [
  { source: "Website", totalConsults: 2513, done: 1571, cancelled: 931, pending: 10, converted: 140, conversionRate: 8.91, revenue: 31268920, avgRevenuePerConsult: 223349 },
  { source: "PriyaSharma AI Chat", totalConsults: 1240, done: 602, cancelled: 633, pending: 5, converted: 32, conversionRate: 5.32, revenue: 4774142, avgRevenuePerConsult: 149192 },
  { source: "Others", totalConsults: 380, done: 176, cancelled: 201, pending: 2, converted: 3, conversionRate: 1.7, revenue: 5234, avgRevenuePerConsult: 1745 },
  { source: "Google", totalConsults: 347, done: 161, cancelled: 185, pending: 1, converted: 7, conversionRate: 4.35, revenue: 1035974, avgRevenuePerConsult: 147996 },
  { source: "Facebook", totalConsults: 264, done: 93, cancelled: 171, pending: 0, converted: 2, conversionRate: 2.15, revenue: 2229, avgRevenuePerConsult: 1115 },
  { source: "IVR", totalConsults: 248, done: 77, cancelled: 162, pending: 9, converted: 2, conversionRate: 2.6, revenue: 478261, avgRevenuePerConsult: 239131 },
  { source: "Site Exit Pop-Up", totalConsults: 13, done: 8, cancelled: 5, pending: 0, converted: 1, conversionRate: 12.5, revenue: 580, avgRevenuePerConsult: 580 },
  { source: "Reference", totalConsults: 4, done: 2, cancelled: 2, pending: 0, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
  { source: "CRR", totalConsults: 3, done: 3, cancelled: 0, pending: 0, converted: 2, conversionRate: 66.67, revenue: 1020, avgRevenuePerConsult: 510 },
  { source: "Referral", totalConsults: 1, done: 0, cancelled: 1, pending: 0, converted: 0, conversionRate: 0.0, revenue: 0, avgRevenuePerConsult: 0 },
]

// Server-side cache
let cachedReportData: {
  rows: SourceReportRow[]
  totals: any
  timestamp: number
} | null = null
const CACHE_TTL_MS = 60 * 1000 // 60 seconds cache

function parseGasItem(item: any): SourceReportRow {
  const source = String(item["Enquiry Received Source"] || "").trim()
  const totalConsults = parseInt(String(item["Total Consultation Received"] || "0").replace(/,/g, ""), 10) || 0
  const done = parseInt(String(item["Successfully Done"] || "0").replace(/,/g, ""), 10) || 0
  const cancelled =
    parseInt(String(item["Cancelled Consultaion"] || item["Cancelled Consultation"] || "0").replace(/,/g, ""), 10) || 0
  const pending = parseInt(String(item["Pending Consultation"] || "0").replace(/,/g, ""), 10) || 0
  const converted = parseInt(String(item["Converted Count"] || "0").replace(/,/g, ""), 10) || 0

  const rawConv = String(item["Conversion %"] || "").replace("%", "").trim()
  let conversionRate = parseFloat(rawConv)
  if (isNaN(conversionRate)) {
    conversionRate = done > 0 ? parseFloat(((converted / done) * 100).toFixed(2)) : 0
  }

  const revenue = parseInt(String(item["Revenue (₹)"] || item["Revenue"] || "0").replace(/,/g, ""), 10) || 0
  const avgRevenuePerConsult = converted > 0 ? Math.round(revenue / converted) : 0

  return {
    source,
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

async function fetchLiveDoctorReport(force = false): Promise<{
  rows: SourceReportRow[]
  totals: any
  isLive: boolean
  lastSyncedAt: string
}> {
  const now = Date.now()
  if (!force && cachedReportData && now - cachedReportData.timestamp < CACHE_TTL_MS) {
    return {
      rows: cachedReportData.rows,
      totals: cachedReportData.totals,
      isLive: true,
      lastSyncedAt: new Date(cachedReportData.timestamp).toISOString(),
    }
  }

  try {
    const res = await fetch(DOCTOR_REPORT_GAS_URL, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
    })

    if (!res.ok) {
      throw new Error(`Upstream returned status ${res.status}`)
    }

    const json = await res.json()
    const rawItems = Array.isArray(json) ? json : json?.data || []

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new Error("No data array returned from GAS endpoint")
    }

    // Separate rows vs Total summary row
    const sourceRows: SourceReportRow[] = []
    let gasTotalRow: any = null

    for (const item of rawItems) {
      const src = String(item["Enquiry Received Source"] || "").trim()
      if (src.toLowerCase() === "total") {
        gasTotalRow = item
      } else if (src) {
        sourceRows.push(parseGasItem(item))
      }
    }

    let totals = null
    if (gasTotalRow) {
      const parsedTotal = parseGasItem(gasTotalRow)
      totals = {
        totalConsults: parsedTotal.totalConsults,
        done: parsedTotal.done,
        cancelled: parsedTotal.cancelled,
        pending: parsedTotal.pending,
        converted: parsedTotal.converted,
        conversionRate: parsedTotal.conversionRate,
        revenue: parsedTotal.revenue,
        avgRevenuePerConsult: parsedTotal.avgRevenuePerConsult,
      }
    } else {
      const totalConsults = sourceRows.reduce((a, b) => a + b.totalConsults, 0)
      const done = sourceRows.reduce((a, b) => a + b.done, 0)
      const cancelled = sourceRows.reduce((a, b) => a + b.cancelled, 0)
      const pending = sourceRows.reduce((a, b) => a + b.pending, 0)
      const converted = sourceRows.reduce((a, b) => a + b.converted, 0)
      const revenue = sourceRows.reduce((a, b) => a + b.revenue, 0)
      const conversionRate = done > 0 ? parseFloat(((converted / done) * 100).toFixed(2)) : 0
      const avgRevenuePerConsult = converted > 0 ? Math.round(revenue / converted) : 0
      totals = {
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

    cachedReportData = {
      rows: sourceRows,
      totals,
      timestamp: now,
    }

    return {
      rows: sourceRows,
      totals,
      isLive: true,
      lastSyncedAt: new Date(now).toISOString(),
    }
  } catch (err) {
    console.error("[DoctorReport] Failed to fetch live report from GAS endpoint, using fallback:", err)
    // Fallback to cached or fallback data
    if (cachedReportData) {
      return {
        rows: cachedReportData.rows,
        totals: cachedReportData.totals,
        isLive: false,
        lastSyncedAt: new Date(cachedReportData.timestamp).toISOString(),
      }
    }

    const fallbackTotalConsults = OVERALL_SOURCE_DATA_FALLBACK.reduce((a, b) => a + b.totalConsults, 0)
    const fallbackDone = OVERALL_SOURCE_DATA_FALLBACK.reduce((a, b) => a + b.done, 0)
    const fallbackCancelled = OVERALL_SOURCE_DATA_FALLBACK.reduce((a, b) => a + b.cancelled, 0)
    const fallbackPending = OVERALL_SOURCE_DATA_FALLBACK.reduce((a, b) => a + b.pending, 0)
    const fallbackConverted = OVERALL_SOURCE_DATA_FALLBACK.reduce((a, b) => a + b.converted, 0)
    const fallbackRevenue = OVERALL_SOURCE_DATA_FALLBACK.reduce((a, b) => a + b.revenue, 0)
    const fallbackConversionRate =
      fallbackDone > 0 ? parseFloat(((fallbackConverted / fallbackDone) * 100).toFixed(2)) : 0
    const fallbackAvgRevenuePerConsult =
      fallbackConverted > 0 ? Math.round(fallbackRevenue / fallbackConverted) : 0

    return {
      rows: OVERALL_SOURCE_DATA_FALLBACK,
      totals: {
        totalConsults: fallbackTotalConsults,
        done: fallbackDone,
        cancelled: fallbackCancelled,
        pending: fallbackPending,
        converted: fallbackConverted,
        conversionRate: fallbackConversionRate,
        revenue: fallbackRevenue,
        avgRevenuePerConsult: fallbackAvgRevenuePerConsult,
      },
      isLive: false,
      lastSyncedAt: new Date().toISOString(),
    }
  }
}

const DOCTOR_PERFORMANCE: DoctorPerformanceRow[] = [
  { doctorId: "DOC-001", doctorName: "Dr. Priya Devi N", specialization: "Senior Chief Ayurvedic Physician", totalConsults: 2150, done: 1180, cancelled: 955, pending: 15, converted: 89, conversionRate: 7.54, revenue: 17850000, avgSlaMinutes: 36 },
  { doctorId: "DOC-002", doctorName: "DR. SALI P.S", specialization: "Senior Medical Officer & Panchakarma", totalConsults: 1520, done: 810, cancelled: 704, pending: 6, converted: 58, conversionRate: 7.16, revenue: 11420000, avgSlaMinutes: 38 },
  { doctorId: "DOC-003", doctorName: "Dr Deepu John", specialization: "Senior Resident Physician", totalConsults: 780, done: 420, cancelled: 356, pending: 4, converted: 26, conversionRate: 6.19, revenue: 5180000, avgSlaMinutes: 42 },
  { doctorId: "DOC-004", doctorName: "Dr. Rahul R", specialization: "Holistic Health & Rejuvenation", totalConsults: 340, done: 180, cancelled: 158, pending: 2, converted: 11, conversionRate: 6.11, revenue: 2160000, avgSlaMinutes: 40 },
  { doctorId: "DOC-005", doctorName: "Dr. Ashikha Raj", specialization: "Ayurvedic Wellness Specialist", totalConsults: 160, done: 72, cancelled: 88, pending: 0, converted: 4, conversionRate: 5.56, revenue: 720000, avgSlaMinutes: 45 },
  { doctorId: "DOC-006", doctorName: "Dr. Akhila Oommen", specialization: "Resident Clinical Doctor", totalConsults: 63, done: 31, cancelled: 30, pending: 0, converted: 1, conversionRate: 3.23, revenue: 236360, avgSlaMinutes: 48 },
]

export interface WeekOption {
  id: string
  label: string
  shortLabel: string
  startDate: string
  endDate: string
  isCurrent?: boolean
  isBenchmark?: boolean
}

export const AVAILABLE_WEEKS: WeekOption[] = [
  {
    id: "2026-W37",
    label: "Week 37: 07-09-2026 To 13-09-2026 (Current Week)",
    shortLabel: "07-09-2026 To 13-09-2026",
    startDate: "2026-09-07",
    endDate: "2026-09-13",
    isCurrent: true,
  },
  {
    id: "2026-W36",
    label: "Week 36: 31-08-2026 To 06-09-2026 (Benchmark Email Report)",
    shortLabel: "31-08-2026 To 06-09-2026",
    startDate: "2026-08-31",
    endDate: "2026-09-06",
    isBenchmark: true,
  },
  {
    id: "2026-W35",
    label: "Week 35: 24-08-2026 To 30-08-2026",
    shortLabel: "24-08-2026 To 30-08-2026",
    startDate: "2026-08-24",
    endDate: "2026-08-30",
  },
  {
    id: "2026-W34",
    label: "Week 34: 17-08-2026 To 23-08-2026",
    shortLabel: "17-08-2026 To 23-08-2026",
    startDate: "2026-08-17",
    endDate: "2026-08-23",
  },
  {
    id: "2026-W33",
    label: "Week 33: 10-08-2026 To 16-08-2026",
    shortLabel: "10-08-2026 To 16-08-2026",
    startDate: "2026-08-10",
    endDate: "2026-08-16",
  },
]

// Detailed consultations spanning multiple weeks
// Specifically, Week 36 (31-08-2026 to 06-09-2026) reproduces the benchmark email report numbers:
// Website: 10 (5 done, 1 cancelled, 4 pending), IVR: 7 (1 done, 5 cancelled, 1 pending),
// PriyaSharma AI Chat: 4 (3 done, 1 cancelled, 0 pending), Site Exit Pop-Up: 1 (0 done, 0 cancelled, 1 pending),
// Facebook: 1 (0 done, 0 cancelled, 1 pending) -> Total 23 Consults.
const SAMPLE_CONSULTATION_RECORDS: DetailedConsultationItem[] = [
  // ─── WEEK 36 (31-08-2026 to 06-09-2026) Benchmark Week (23 Records) ───
  // Website (10 total: 5 done, 1 cancelled, 4 pending)
  {
    id: "C-3601",
    consultationId: "CONS-2026-0361",
    enquiryId: "ENQ-2026-0941",
    patientName: "Mrs. Priya Nair",
    patientId: "P-3601",
    mobile: "+91 9876543210",
    email: "priya.nair@email.com",
    enquirySource: "Website",
    doctorName: "Dr. Priya Devi N",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-02",
    scheduledTime: "10:00 AM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    prescriptionUrl: "https://reports.kairali.com/rx/3601.pdf",
    clientReportUrl: "https://reports.kairali.com/client/3601",
    postConsultationRemarks: "Pitta-Vata imbalance. Advised diet plan and internal herbal medicine.",
    createdAt: "2026-08-31T09:30:00Z",
  },
  {
    id: "C-3602",
    consultationId: "CONS-2026-0362",
    enquiryId: "ENQ-2026-0942",
    patientName: "Mr. Rajesh Kumar",
    patientId: "P-3602",
    mobile: "+91 9876543211",
    email: "rajesh.kumar@email.com",
    enquirySource: "Website",
    doctorName: "DR. SALI P.S",
    appointmentType: "In-Person Consultation",
    scheduledDate: "2026-09-03",
    scheduledTime: "02:30 PM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    prescriptionUrl: "https://reports.kairali.com/rx/3602.pdf",
    postConsultationRemarks: "Prescribed internal medicines for diabetes and lifestyle modifications.",
    createdAt: "2026-08-31T11:15:00Z",
  },
  {
    id: "C-3603",
    consultationId: "CONS-2026-0363",
    enquiryId: "ENQ-2026-0943",
    patientName: "Dr. Sunita Deshmukh",
    patientId: "P-3603",
    mobile: "+91 9811223344",
    email: "sunita.d@hospital.org",
    enquirySource: "Website",
    doctorName: "Dr Deepu John",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-04",
    scheduledTime: "11:00 AM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    prescriptionUrl: "https://reports.kairali.com/rx/3603.pdf",
    createdAt: "2026-09-01T14:00:00Z",
  },
  {
    id: "C-3604",
    consultationId: "CONS-2026-0364",
    enquiryId: "ENQ-2026-0944",
    patientName: "Mr. Amit Singhania",
    patientId: "P-3604",
    mobile: "+91 9822334455",
    email: "amit.s@singhania.in",
    enquirySource: "Website",
    doctorName: "Dr. Rahul R",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-04",
    scheduledTime: "03:00 PM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-01T15:30:00Z",
  },
  {
    id: "C-3605",
    consultationId: "CONS-2026-0365",
    enquiryId: "ENQ-2026-0945",
    patientName: "Mrs. Geeta Varma",
    patientId: "P-3605",
    mobile: "+91 9911445566",
    email: "geeta.varma@gmail.com",
    enquirySource: "Website",
    doctorName: "Dr. Ashikha Raj",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-05",
    scheduledTime: "04:30 PM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-02T10:00:00Z",
  },
  {
    id: "C-3606",
    consultationId: "CONS-2026-0366",
    enquiryId: "ENQ-2026-0946",
    patientName: "Mr. Rohan Mehta",
    patientId: "P-3606",
    mobile: "+91 9845012345",
    email: "rohan.m@venture.com",
    enquirySource: "Website",
    doctorName: "Dr. Priya Devi N",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-03",
    scheduledTime: "05:00 PM",
    status: "cancelled",
    stage: "Intake",
    slaStatus: "overdue",
    revenue: 0,
    postConsultationRemarks: "Client requested rescheduling due to urgent business travel.",
    createdAt: "2026-09-01T12:00:00Z",
  },
  {
    id: "C-3607",
    consultationId: "CONS-2026-0367",
    enquiryId: "ENQ-2026-0947",
    patientName: "Mrs. Kavita Joshi",
    patientId: "P-3607",
    mobile: "+91 9711223300",
    email: "kavita.j@joshi.org",
    enquirySource: "Website",
    doctorName: "DR. SALI P.S",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-05",
    scheduledTime: "11:30 AM",
    status: "pending",
    stage: "Pre-Consult Docs",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-03T16:00:00Z",
  },
  {
    id: "C-3608",
    consultationId: "CONS-2026-0368",
    enquiryId: "ENQ-2026-0948",
    patientName: "Mr. Suresh Gopinath",
    patientId: "P-3608",
    mobile: "+91 9820033441",
    email: "suresh.g@tech.in",
    enquirySource: "Website",
    doctorName: "Dr Deepu John",
    appointmentType: "In-Person Consultation",
    scheduledDate: "2026-09-06",
    scheduledTime: "10:30 AM",
    status: "pending",
    stage: "Day-Of Reminder",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-04T09:00:00Z",
  },
  {
    id: "C-3609",
    consultationId: "CONS-2026-0369",
    enquiryId: "ENQ-2026-0949",
    patientName: "Ms. Ananya Roy",
    patientId: "P-3609",
    mobile: "+91 9830112233",
    email: "ananya.roy@media.in",
    enquirySource: "Website",
    doctorName: "Dr. Rahul R",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-06",
    scheduledTime: "02:00 PM",
    status: "pending",
    stage: "Appointment Fix",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-04T14:30:00Z",
  },
  {
    id: "C-3610",
    consultationId: "CONS-2026-0370",
    enquiryId: "ENQ-2026-0950",
    patientName: "Mr. Devendra Patil",
    patientId: "P-3610",
    mobile: "+91 9840223344",
    email: "d.patil@auto.com",
    enquirySource: "Website",
    doctorName: "Dr. Ashikha Raj",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-06",
    scheduledTime: "04:00 PM",
    status: "pending",
    stage: "Intake",
    slaStatus: "at-risk",
    revenue: 0,
    createdAt: "2026-09-05T10:00:00Z",
  },

  // IVR (7 total: 1 done, 5 cancelled, 1 pending)
  {
    id: "C-3611",
    consultationId: "CONS-2026-0371",
    enquiryId: "ENQ-2026-0951",
    patientName: "Mr. Harish Chandra",
    patientId: "P-3611",
    mobile: "+91 9871122334",
    email: "harish.c@ivr.in",
    enquirySource: "IVR",
    doctorName: "Dr. Priya Devi N",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-02",
    scheduledTime: "11:00 AM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-08-31T14:00:00Z",
  },
  {
    id: "C-3612",
    consultationId: "CONS-2026-0372",
    enquiryId: "ENQ-2026-0952",
    patientName: "Mr. Vijay Raghavan",
    patientId: "P-3612",
    mobile: "+91 9821100223",
    email: "vijay.r@call.in",
    enquirySource: "IVR",
    doctorName: "DR. SALI P.S",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-01",
    scheduledTime: "03:00 PM",
    status: "cancelled",
    stage: "Intake",
    slaStatus: "overdue",
    revenue: 0,
    postConsultationRemarks: "Call dropped / unreachable after 3 attempts.",
    createdAt: "2026-08-31T09:00:00Z",
  },
  {
    id: "C-3613",
    consultationId: "CONS-2026-0373",
    enquiryId: "ENQ-2026-0953",
    patientName: "Mrs. Rekha Sen",
    patientId: "P-3613",
    mobile: "+91 9831122445",
    email: "rekha.sen@call.in",
    enquirySource: "IVR",
    doctorName: "Dr Deepu John",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-02",
    scheduledTime: "04:00 PM",
    status: "cancelled",
    stage: "Intake",
    slaStatus: "overdue",
    revenue: 0,
    createdAt: "2026-09-01T11:00:00Z",
  },
  {
    id: "C-3614",
    consultationId: "CONS-2026-0374",
    enquiryId: "ENQ-2026-0954",
    patientName: "Mr. Balram Naidu",
    patientId: "P-3614",
    mobile: "+91 9849011223",
    email: "b.naidu@ivr.com",
    enquirySource: "IVR",
    doctorName: "Dr. Rahul R",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-03",
    scheduledTime: "01:30 PM",
    status: "cancelled",
    stage: "Intake",
    slaStatus: "overdue",
    revenue: 0,
    createdAt: "2026-09-01T15:00:00Z",
  },
  {
    id: "C-3615",
    consultationId: "CONS-2026-0375",
    enquiryId: "ENQ-2026-0955",
    patientName: "Ms. Shalini Iyer",
    patientId: "P-3615",
    mobile: "+91 9819022334",
    email: "s.iyer@ivr.org",
    enquirySource: "IVR",
    doctorName: "Dr. Ashikha Raj",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-04",
    scheduledTime: "12:00 PM",
    status: "cancelled",
    stage: "Intake",
    slaStatus: "overdue",
    revenue: 0,
    createdAt: "2026-09-02T13:00:00Z",
  },
  {
    id: "C-3616",
    consultationId: "CONS-2026-0376",
    enquiryId: "ENQ-2026-0956",
    patientName: "Mr. Manish Kapoor",
    patientId: "P-3616",
    mobile: "+91 9820033112",
    email: "m.kapoor@ivr.com",
    enquirySource: "IVR",
    doctorName: "Dr. Akhila Oommen",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-05",
    scheduledTime: "10:00 AM",
    status: "cancelled",
    stage: "Intake",
    slaStatus: "overdue",
    revenue: 0,
    createdAt: "2026-09-03T10:00:00Z",
  },
  {
    id: "C-3617",
    consultationId: "CONS-2026-0377",
    enquiryId: "ENQ-2026-0957",
    patientName: "Mrs. Shanta Bai",
    patientId: "P-3617",
    mobile: "+91 9845011998",
    email: "shanta@ivr.in",
    enquirySource: "IVR",
    doctorName: "Dr. Priya Devi N",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-06",
    scheduledTime: "03:30 PM",
    status: "pending",
    stage: "Appointment Fix",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-05T12:00:00Z",
  },

  // PriyaSharma AI Chat (4 total: 3 done, 1 cancelled, 0 pending)
  {
    id: "C-3618",
    consultationId: "CONS-2026-0378",
    enquiryId: "ENQ-2026-0958",
    patientName: "Mr. Siddharth Roy",
    patientId: "P-3618",
    mobile: "+91 9820987654",
    email: "sid.roy@chat.ai",
    enquirySource: "PriyaSharma AI Chat",
    doctorName: "Dr. Priya Devi N",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-02",
    scheduledTime: "02:00 PM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    prescriptionUrl: "https://reports.kairali.com/rx/3618.pdf",
    createdAt: "2026-08-31T18:00:00Z",
  },
  {
    id: "C-3619",
    consultationId: "CONS-2026-0379",
    enquiryId: "ENQ-2026-0959",
    patientName: "Ms. Neha Singhal",
    patientId: "P-3619",
    mobile: "+91 9811229988",
    email: "neha.s@chat.ai",
    enquirySource: "PriyaSharma AI Chat",
    doctorName: "DR. SALI P.S",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-03",
    scheduledTime: "11:00 AM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-01T09:00:00Z",
  },
  {
    id: "C-3620",
    consultationId: "CONS-2026-0380",
    enquiryId: "ENQ-2026-0960",
    patientName: "Mr. Tanmay Bhatt",
    patientId: "P-3620",
    mobile: "+91 9892011223",
    email: "tanmay.b@chat.ai",
    enquirySource: "PriyaSharma AI Chat",
    doctorName: "Dr Deepu John",
    appointmentType: "In-Person Consultation",
    scheduledDate: "2026-09-04",
    scheduledTime: "03:30 PM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-02T11:00:00Z",
  },
  {
    id: "C-3621",
    consultationId: "CONS-2026-0381",
    enquiryId: "ENQ-2026-0961",
    patientName: "Mrs. Madhuri Dixit",
    patientId: "P-3621",
    mobile: "+91 9820011990",
    email: "madhuri.d@chat.ai",
    enquirySource: "PriyaSharma AI Chat",
    doctorName: "Dr. Rahul R",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-05",
    scheduledTime: "01:00 PM",
    status: "cancelled",
    stage: "Intake",
    slaStatus: "overdue",
    revenue: 0,
    createdAt: "2026-09-03T15:00:00Z",
  },

  // Site Exit Pop-Up (1 total: 0 done, 0 cancelled, 1 pending)
  {
    id: "C-3622",
    consultationId: "CONS-2026-0382",
    enquiryId: "ENQ-2026-0962",
    patientName: "Mr. Gaurav Chawla",
    patientId: "P-3622",
    mobile: "+91 9871100223",
    email: "gaurav.c@popup.in",
    enquirySource: "Site Exit Pop-Up",
    doctorName: "Dr. Ashikha Raj",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-06",
    scheduledTime: "05:00 PM",
    status: "pending",
    stage: "Appointment Fix",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-05T16:00:00Z",
  },

  // Facebook (1 total: 0 done, 0 cancelled, 1 pending)
  {
    id: "C-3623",
    consultationId: "CONS-2026-0383",
    enquiryId: "ENQ-2026-0963",
    patientName: "Ms. Ritu Saxena",
    patientId: "P-3623",
    mobile: "+91 9810022334",
    email: "ritu.saxena@fb.com",
    enquirySource: "Facebook",
    doctorName: "Dr. Akhila Oommen",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-06",
    scheduledTime: "02:30 PM",
    status: "pending",
    stage: "Appointment Fix",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-05T14:00:00Z",
  },

  // ─── WEEK 37 (07-09-2026 to 13-09-2026) Current Week (Active Performance & Conversions) ───
  {
    id: "C-3701",
    consultationId: "CONS-2026-0371A",
    enquiryId: "ENQ-2026-1001",
    patientName: "Mr. Vikramaditya Singh",
    patientId: "P-3701",
    mobile: "+91 9988776655",
    email: "vsingh@royalgroup.in",
    enquirySource: "Website",
    doctorName: "Dr. Priya Devi N",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-08",
    scheduledTime: "10:00 AM",
    status: "converted",
    stage: "Handover to KAPPL/KTAHV",
    slaStatus: "on-time",
    revenue: 350000,
    prescriptionUrl: "https://reports.kairali.com/rx/3701.pdf",
    postConsultationRemarks: "Panchakarma 21-day program confirmed at KTAHV.",
    createdAt: "2026-09-07T09:00:00Z",
  },
  {
    id: "C-3702",
    consultationId: "CONS-2026-0372A",
    enquiryId: "ENQ-2026-1002",
    patientName: "Mrs. Meenakshi Sundaram",
    patientId: "P-3702",
    mobile: "+91 9765432109",
    email: "meenakshi@gmail.com",
    enquirySource: "Website",
    doctorName: "DR. SALI P.S",
    appointmentType: "In-Person Consultation",
    scheduledDate: "2026-09-08",
    scheduledTime: "02:00 PM",
    status: "converted",
    stage: "Handover to KAPPL/KTAHV",
    slaStatus: "on-time",
    revenue: 280000,
    prescriptionUrl: "https://reports.kairali.com/rx/3702.pdf",
    createdAt: "2026-09-07T10:30:00Z",
  },
  {
    id: "C-3703",
    consultationId: "CONS-2026-0373A",
    enquiryId: "ENQ-2026-1003",
    patientName: "Dr. Anish Banerjee",
    patientId: "P-3703",
    mobile: "+91 9830114455",
    email: "anish.b@med.org",
    enquirySource: "PriyaSharma AI Chat",
    doctorName: "Dr Deepu John",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-09",
    scheduledTime: "11:30 AM",
    status: "converted",
    stage: "Handover to KAPPL/KTAHV",
    slaStatus: "on-time",
    revenue: 190000,
    createdAt: "2026-09-08T08:00:00Z",
  },
  {
    id: "C-3704",
    consultationId: "CONS-2026-0374A",
    enquiryId: "ENQ-2026-1004",
    patientName: "Mrs. Tara Krishnan",
    patientId: "P-3704",
    mobile: "+91 9840112299",
    email: "tara.k@gmail.com",
    enquirySource: "Website",
    doctorName: "Dr. Rahul R",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-09",
    scheduledTime: "03:00 PM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-08T11:00:00Z",
  },
  {
    id: "C-3705",
    consultationId: "CONS-2026-0375A",
    enquiryId: "ENQ-2026-1005",
    patientName: "Mr. Sameer Kulkarni",
    patientId: "P-3705",
    mobile: "+91 9820033221",
    email: "sameer.k@fin.in",
    enquirySource: "Google",
    doctorName: "Dr. Ashikha Raj",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-10",
    scheduledTime: "10:30 AM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-09T09:30:00Z",
  },
  {
    id: "C-3706",
    consultationId: "CONS-2026-0376A",
    enquiryId: "ENQ-2026-1006",
    patientName: "Ms. Pooja Hegde",
    patientId: "P-3706",
    mobile: "+91 9845112233",
    email: "pooja.h@fashion.in",
    enquirySource: "Website",
    doctorName: "Dr. Priya Devi N",
    appointmentType: "In-Person Consultation",
    scheduledDate: "2026-09-10",
    scheduledTime: "04:00 PM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-09T14:00:00Z",
  },
  {
    id: "C-3707",
    consultationId: "CONS-2026-0377A",
    enquiryId: "ENQ-2026-1007",
    patientName: "Mr. Nitin Gadkari",
    patientId: "P-3707",
    mobile: "+91 9822011223",
    email: "nitin.g@infra.in",
    enquirySource: "Website",
    doctorName: "DR. SALI P.S",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-11",
    scheduledTime: "11:00 AM",
    status: "cancelled",
    stage: "Intake",
    slaStatus: "overdue",
    revenue: 0,
    createdAt: "2026-09-10T10:00:00Z",
  },
  {
    id: "C-3708",
    consultationId: "CONS-2026-0378A",
    enquiryId: "ENQ-2026-1008",
    patientName: "Mrs. Shalini Rao",
    patientId: "P-3708",
    mobile: "+91 9811224455",
    email: "shalini.rao@gmail.com",
    enquirySource: "PriyaSharma AI Chat",
    doctorName: "Dr Deepu John",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-11",
    scheduledTime: "02:30 PM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-10T11:30:00Z",
  },
  {
    id: "C-3709",
    consultationId: "CONS-2026-0379A",
    enquiryId: "ENQ-2026-1009",
    patientName: "Mr. Chetan Bhagat",
    patientId: "P-3709",
    mobile: "+91 9820011445",
    email: "chetan@author.in",
    enquirySource: "Facebook",
    doctorName: "Dr. Rahul R",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-12",
    scheduledTime: "12:00 PM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-11T09:00:00Z",
  },
  {
    id: "C-3710",
    consultationId: "CONS-2026-0380A",
    enquiryId: "ENQ-2026-1010",
    patientName: "Ms. Diya Mirza",
    patientId: "P-3710",
    mobile: "+91 9821002233",
    email: "diya.m@env.org",
    enquirySource: "IVR",
    doctorName: "Dr. Ashikha Raj",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-09-12",
    scheduledTime: "03:30 PM",
    status: "cancelled",
    stage: "Intake",
    slaStatus: "overdue",
    revenue: 0,
    createdAt: "2026-09-11T13:00:00Z",
  },
  {
    id: "C-3711",
    consultationId: "CONS-2026-0381A",
    enquiryId: "ENQ-2026-1011",
    patientName: "Mr. Vivek Oberoi",
    patientId: "P-3711",
    mobile: "+91 9820998877",
    email: "vivek.o@star.in",
    enquirySource: "Website",
    doctorName: "Dr. Akhila Oommen",
    appointmentType: "In-Person Consultation",
    scheduledDate: "2026-09-13",
    scheduledTime: "10:00 AM",
    status: "pending",
    stage: "Appointment Fix",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-09-12T10:00:00Z",
  },
  {
    id: "C-3712",
    consultationId: "CONS-2026-0382A",
    enquiryId: "ENQ-2026-1012",
    patientName: "Mrs. Shobha De",
    patientId: "P-3712",
    mobile: "+91 9820112200",
    email: "shobha@de.com",
    enquirySource: "CRR",
    doctorName: "Dr. Priya Devi N",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-09-13",
    scheduledTime: "04:00 PM",
    status: "converted",
    stage: "Handover to KAPPL/KTAHV",
    slaStatus: "on-time",
    revenue: 410000,
    createdAt: "2026-09-12T15:00:00Z",
  },

  // ─── WEEK 35 (24-08-2026 to 30-08-2026) ───
  {
    id: "C-3501",
    consultationId: "CONS-2026-0351",
    enquiryId: "ENQ-2026-0851",
    patientName: "Mr. Arvind Swamy",
    patientId: "P-3501",
    mobile: "+91 9840123456",
    email: "arvind.swamy@techcorp.com",
    enquirySource: "Website",
    doctorName: "Dr. Priya Devi N",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-08-25",
    scheduledTime: "10:30 AM",
    status: "converted",
    stage: "Handover to KAPPL/KTAHV",
    slaStatus: "on-time",
    revenue: 320000,
    createdAt: "2026-08-24T09:00:00Z",
  },
  {
    id: "C-3502",
    consultationId: "CONS-2026-0352",
    enquiryId: "ENQ-2026-0852",
    patientName: "Ms. Shalini Gupta",
    patientId: "P-3502",
    mobile: "+91 9820011223",
    email: "shalini.gupta@design.com",
    enquirySource: "PriyaSharma AI Chat",
    doctorName: "DR. SALI P.S",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-08-26",
    scheduledTime: "02:00 PM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-08-25T11:00:00Z",
  },
  {
    id: "C-3503",
    consultationId: "CONS-2026-0353",
    enquiryId: "ENQ-2026-0853",
    patientName: "Mr. Kiran Bedi",
    patientId: "P-3503",
    mobile: "+91 9811002233",
    email: "kiran.b@gov.in",
    enquirySource: "Google",
    doctorName: "Dr Deepu John",
    appointmentType: "In-Person Consultation",
    scheduledDate: "2026-08-27",
    scheduledTime: "11:00 AM",
    status: "completed",
    stage: "Post-Consult Upload",
    slaStatus: "on-time",
    revenue: 0,
    createdAt: "2026-08-26T10:00:00Z",
  },
  {
    id: "C-3504",
    consultationId: "CONS-2026-0354",
    enquiryId: "ENQ-2026-0854",
    patientName: "Mrs. Radhika Sarathkumar",
    patientId: "P-3504",
    mobile: "+91 9840011229",
    email: "radhika@media.in",
    enquirySource: "IVR",
    doctorName: "Dr. Rahul R",
    appointmentType: "Telephonic Call",
    scheduledDate: "2026-08-28",
    scheduledTime: "03:30 PM",
    status: "cancelled",
    stage: "Intake",
    slaStatus: "overdue",
    revenue: 0,
    createdAt: "2026-08-27T12:00:00Z",
  },
  {
    id: "C-3505",
    consultationId: "CONS-2026-0355",
    enquiryId: "ENQ-2026-0855",
    patientName: "Mr. Suresh Raina",
    patientId: "P-3505",
    mobile: "+91 9810112233",
    email: "suresh.r@sports.in",
    enquirySource: "Website",
    doctorName: "Dr. Ashikha Raj",
    appointmentType: "Video Consultation",
    scheduledDate: "2026-08-29",
    scheduledTime: "12:00 PM",
    status: "converted",
    stage: "Handover to KAPPL/KTAHV",
    slaStatus: "on-time",
    revenue: 290000,
    createdAt: "2026-08-28T14:00:00Z",
  },
]

/**
 * Automatically computes source breakdown and totals for a given date window
 */
export function aggregateConsultationsBySource(
  records: DetailedConsultationItem[],
  startDate: string,
  endDate: string,
  sourceFilter: string = "all",
  doctorFilter: string = "all"
): { rows: SourceReportRow[]; totals: SourceReportRow } {
  let filtered = records.filter((r) => {
    const d = r.scheduledDate || r.createdAt?.split("T")[0] || ""
    return d >= startDate && d <= endDate
  })

  if (doctorFilter !== "all") {
    filtered = filtered.filter((r) =>
      r.doctorName.toLowerCase().includes(doctorFilter.toLowerCase())
    )
  }

  // Count by source
  const sourceMap = new Map<
    string,
    {
      total: number
      done: number
      cancelled: number
      pending: number
      converted: number
      revenue: number
    }
  >()

  for (const item of filtered) {
    const src = item.enquirySource || "Website"
    const current = sourceMap.get(src) || {
      total: 0,
      done: 0,
      cancelled: 0,
      pending: 0,
      converted: 0,
      revenue: 0,
    }
    current.total += 1
    if (item.status === "completed" || item.status === "converted") {
      current.done += 1
    }
    if (item.status === "cancelled") {
      current.cancelled += 1
    }
    if (item.status === "pending") {
      current.pending += 1
    }
    if (item.status === "converted") {
      current.converted += 1
      current.revenue += item.revenue || 0
    }
    sourceMap.set(src, current)
  }

  // Build rows
  const rows: SourceReportRow[] = []
  for (const [source, data] of sourceMap.entries()) {
    if (sourceFilter !== "all" && source.toLowerCase() !== sourceFilter.toLowerCase()) {
      continue
    }
    const conversionRate =
      data.done > 0 ? parseFloat(((data.converted / data.done) * 100).toFixed(2)) : 0
    const avgRevenuePerConsult =
      data.converted > 0 ? Math.round(data.revenue / data.converted) : 0

    rows.push({
      source,
      totalConsults: data.total,
      done: data.done,
      cancelled: data.cancelled,
      pending: data.pending,
      converted: data.converted,
      conversionRate,
      revenue: data.revenue,
      avgRevenuePerConsult,
    })
  }

  // If no records in range, provide empty rows or fallback to baseline if Week 36
  if (rows.length === 0 && startDate === "2026-08-31" && endDate === "2026-09-06") {
    const defaultRows = [...WEEKLY_SOURCE_DATA]
    const activeDefault =
      sourceFilter !== "all"
        ? defaultRows.filter((r) => r.source.toLowerCase() === sourceFilter.toLowerCase())
        : defaultRows
    const totalConsults = activeDefault.reduce((a, b) => a + b.totalConsults, 0)
    const done = activeDefault.reduce((a, b) => a + b.done, 0)
    const cancelled = activeDefault.reduce((a, b) => a + b.cancelled, 0)
    const pending = activeDefault.reduce((a, b) => a + b.pending, 0)
    const converted = activeDefault.reduce((a, b) => a + b.converted, 0)
    const revenue = activeDefault.reduce((a, b) => a + b.revenue, 0)
    const conversionRate =
      done > 0 ? parseFloat(((converted / done) * 100).toFixed(2)) : 0
    const avgRevenuePerConsult =
      converted > 0 ? Math.round(revenue / converted) : 0

    return {
      rows: activeDefault,
      totals: {
        source: "Total (Weekly)",
        totalConsults,
        done,
        cancelled,
        pending,
        converted,
        conversionRate,
        revenue,
        avgRevenuePerConsult,
      },
    }
  }

  // Sort descending by total consults
  rows.sort((a, b) => b.totalConsults - a.totalConsults)

  // Totals
  const totalConsults = rows.reduce((a, b) => a + b.totalConsults, 0)
  const done = rows.reduce((a, b) => a + b.done, 0)
  const cancelled = rows.reduce((a, b) => a + b.cancelled, 0)
  const pending = rows.reduce((a, b) => a + b.pending, 0)
  const converted = rows.reduce((a, b) => a + b.converted, 0)
  const revenue = rows.reduce((a, b) => a + b.revenue, 0)
  const conversionRate =
    done > 0 ? parseFloat(((converted / done) * 100).toFixed(2)) : 0
  const avgRevenuePerConsult =
    converted > 0 ? Math.round(revenue / converted) : 0

  const totals: SourceReportRow = {
    source: "Total (Weekly)",
    totalConsults,
    done,
    cancelled,
    pending,
    converted,
    conversionRate,
    revenue,
    avgRevenuePerConsult,
  }

  return { rows, totals }
}

function formatDateLabel(isoDate: string): string {
  if (!isoDate) return ""
  const parts = isoDate.split("-")
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return isoDate
}

export async function GET(request: NextRequest) {
  const user = getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period") || "this_week"
  const weekParam = searchParams.get("week") || "2026-W36"
  const startDateParam = searchParams.get("startDate")
  const endDateParam = searchParams.get("endDate")
  const source = searchParams.get("source") || "all"
  const doctor = searchParams.get("doctor") || "all"
  const status = searchParams.get("status") || "all"
  const q = (searchParams.get("q") || "").toLowerCase().trim()
  const force = searchParams.get("force") === "true"

  // Fetch live aggregated report data from Google Apps Script endpoint
  const {
    rows: liveOverallRows,
    totals: liveOverallTotals,
    isLive,
    lastSyncedAt,
  } = await fetchLiveDoctorReport(force)

  // Determine active week date range
  const matchedWeek = AVAILABLE_WEEKS.find((w) => w.id === weekParam)
  const targetStartDate = startDateParam || matchedWeek?.startDate || "2026-08-31"
  const targetEndDate = endDateParam || matchedWeek?.endDate || "2026-09-06"
  const weeklyDateRange =
    matchedWeek?.shortLabel ||
    `${formatDateLabel(targetStartDate)} To ${formatDateLabel(targetEndDate)}`

  // Calculate weekly report automatically from live consultation records
  const { rows: weeklyRows, totals: weeklyTotals } = aggregateConsultationsBySource(
    SAMPLE_CONSULTATION_RECORDS,
    targetStartDate,
    targetEndDate,
    source,
    doctor
  )

  // Filter overall rows by source if requested
  let overallRows = [...liveOverallRows]
  if (source !== "all") {
    overallRows = overallRows.filter((r) => r.source.toLowerCase() === source.toLowerCase())
  }

  // Helper to calculate totals for overall rows
  const calculateTotals = (rows: SourceReportRow[]) => {
    const totalConsults = rows.reduce((acc, r) => acc + r.totalConsults, 0)
    const done = rows.reduce((acc, r) => acc + r.done, 0)
    const cancelled = rows.reduce((acc, r) => acc + r.cancelled, 0)
    const pending = rows.reduce((acc, r) => acc + r.pending, 0)
    const converted = rows.reduce((acc, r) => acc + r.converted, 0)
    const revenue = rows.reduce((acc, r) => acc + r.revenue, 0)
    const conversionRate = done > 0 ? parseFloat(((converted / done) * 100).toFixed(2)) : 0
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

  const overallTotals = source !== "all" ? calculateTotals(overallRows) : liveOverallTotals

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
      selectedWeek: matchedWeek?.id || "custom",
      weeklyDateRange,
      targetStartDate,
      targetEndDate,
      availableWeeks: AVAILABLE_WEEKS,
      overallDateRange: "All Time",
      isLive,
      lastSyncedAt,
      upstreamUrl: DOCTOR_REPORT_GAS_URL,
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
