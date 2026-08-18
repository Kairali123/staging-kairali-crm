import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasDoctorConsultationAccess } from "@/lib/authz"

// Mock historical data
const mockHistoryData = {
  byMonth: [
    { month: "Jan 2024", consultations: 45, prescriptions: 38, completionRate: 84.4 },
    { month: "Feb 2024", consultations: 52, prescriptions: 44, completionRate: 84.6 },
    { month: "Mar 2024", consultations: 48, prescriptions: 41, completionRate: 85.4 },
    { month: "Apr 2024", consultations: 61, prescriptions: 53, completionRate: 86.9 },
    { month: "May 2024", consultations: 58, prescriptions: 49, completionRate: 84.5 },
    { month: "Jun 2024", consultations: 67, prescriptions: 59, completionRate: 88.1 },
  ],
  byStage: [
    { stage: "Intake", total: 45, pending: 8, overdue: 2 },
    { stage: "Appointment Fix", total: 42, pending: 5, overdue: 1 },
    { stage: "Pre-Consult Docs", total: 38, pending: 10, overdue: 3 },
    { stage: "Day-Of Reminder", total: 52, pending: 12, overdue: 0 },
    { stage: "Post-Consult Upload", total: 65, pending: 8, overdue: 4 },
    { stage: "Handover", total: 89, pending: 6, overdue: 1 },
  ],
  byDoer: [
    { doer: "Sunaina Bali", total: 156, overdue: 8, avgDelayMin: 12 },
    { doer: "Team Ops", total: 98, overdue: 5, avgDelayMin: 18 },
    { doer: "Dr. Riya Sharma", total: 67, overdue: 2, avgDelayMin: 8 },
    { doer: "Dr. Amit Patel", total: 45, overdue: 1, avgDelayMin: 5 },
  ],
  slaBreaches: [
    { stage: "Intake", count: 12 },
    { stage: "Appointment Fix", count: 8 },
    { stage: "Pre-Consult Docs", count: 15 },
    { stage: "Day-Of Reminder", count: 3 },
    { stage: "Post-Consult Upload", count: 18 },
    { stage: "Handover", count: 6 },
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
  console.log("History filters:", { doctorId, dateFrom, dateTo, property, stage, status, doer, q })

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 400))

  return NextResponse.json(mockHistoryData)
}
