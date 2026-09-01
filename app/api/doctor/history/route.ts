import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasDoctorConsultationAccess } from "@/lib/authz"

function getDynamicHistoryData() {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const now = new Date()
  const byMonth = []
  const stats = [
    { c: 45, p: 38, r: 84.4 },
    { c: 52, p: 44, r: 84.6 },
    { c: 48, p: 41, r: 85.4 },
    { c: 61, p: 53, r: 86.9 },
    { c: 58, p: 49, r: 84.5 },
    { c: 67, p: 59, r: 88.1 },
  ]
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
    const stat = stats[5 - i]
    byMonth.push({
      month: label,
      consultations: stat.c,
      prescriptions: stat.p,
      completionRate: stat.r,
    })
  }

  return {
    byMonth,
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

  return NextResponse.json(getDynamicHistoryData())
}
