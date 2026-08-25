import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasDoctorConsultationAccess } from "@/lib/authz"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasDoctorConsultationAccess(user)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { id: consultationId } = await params
  const body = await request.json()

  // Mock update logic
  console.log(`Updating consultation ${consultationId}:`, body)

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Mock updated consultation data
  const updatedConsultation = {
    id: consultationId,
    patient: { name: "Mrs. Priya Nair", id: "P-2001", phone: "+91 9876543210" },
    doctor: { id: "D-001", name: "Dr. Riya Sharma" },
    scheduledAt: body.scheduledAt || new Date().toISOString(),
    endAt: body.endAt || new Date(Date.now() + 45 * 60000).toISOString(),
    durationMin: 45,
    source: "SQV",
    property: "KTAHV Kochi",
    stage: body.stageOverride || 6,
    stageLabel: "Handover to KAPPL/KTAHV",
    status: body.statusOverride || "completed",
    prescriptionIssued: true,
    problemSolver: "Sunaj Sahoo",
    doer: body.doer || "Sunaina Bali",
    links: body.links || {
      meet: "https://meet.google.com/abc-defg-hij",
      preDocs: "https://docs.google.com/forms/d/e/1FAIpQLSc...",
      nabhForm: "https://appsheet.com/start/abc123",
      postForm: "https://forms.gle/xyz789",
    },
    notes: body.notes || "Patient responded well to treatment. Follow-up scheduled.",
  }

  return NextResponse.json(updatedConsultation)
}
