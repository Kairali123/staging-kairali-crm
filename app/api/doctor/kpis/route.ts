import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasDoctorConsultationAccess } from "@/lib/authz"

const mockKPIs = {
  totalConsultations: 247,
  completedConsultations: 198,
  pendingConsultations: 49,
  prescriptionsIssued: 186,
  avgTATMinutes: 42,
  convertedCount: 148, // 75% of completed consultations
  conversionPercentage: 60, // (converted / total) * 100
  revenue: 495000, // converted * average consultation fee
  stageBreakup: [
    { stage: "Intake", count: 15, pending: 8, overdue: 2 },
    { stage: "Appointment Fix", count: 12, pending: 5, overdue: 1 },
    { stage: "Pre-Consult Docs", count: 18, pending: 10, overdue: 3 },
    { stage: "Day-Of Reminder", count: 22, pending: 12, overdue: 0 },
    { stage: "Post-Consult Upload", count: 35, pending: 8, overdue: 4 },
    { stage: "Handover", count: 145, pending: 6, overdue: 1 },
  ],
  trend: [
    { date: "2024-01-01", consultations: 45, prescriptions: 38 },
    { date: "2024-01-02", consultations: 52, prescriptions: 44 },
    { date: "2024-01-03", consultations: 48, prescriptions: 41 },
    { date: "2024-01-04", consultations: 61, prescriptions: 53 },
    { date: "2024-01-05", consultations: 58, prescriptions: 49 },
    { date: "2024-01-06", consultations: 67, prescriptions: 59 },
  ],
}

export async function GET(request: NextRequest) {
  const user = getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasDoctorConsultationAccess(user)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)

  // Extract optional filters
  const doctorId = searchParams.get("doctorId")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const property = searchParams.getAll("property[]")
  const stage = searchParams.getAll("stage[]")
  const status = searchParams.getAll("status[]")
  const doer = searchParams.getAll("doer[]")
  const q = searchParams.get("q")

  // In a real implementation, these filters would be applied to the database query
  console.log("KPI filters:", { doctorId, dateFrom, dateTo, property, stage, status, doer, q })

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  return NextResponse.json(mockKPIs)
}
