import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasDoctorConsultationAccess } from "@/lib/authz"

export async function POST(request: NextRequest) {
  const user = getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasDoctorConsultationAccess(user)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const body = await request.json()

  // Mock prescription save logic
  const prescriptionId = `P-${Date.now()}`

  const prescribedBy = String(user?.name || user?.fullName || user?.email || "").trim() || "Unknown"
  console.log("Saving prescription:", { id: prescriptionId, prescribedBy })

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return NextResponse.json({ id: prescriptionId })
}
