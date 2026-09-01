import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasDoctorConsultationAccess } from "@/lib/authz"

// Mock prescription data
const mockPrescriptionData = {
  "P-2001": {
    id: "P-2001",
    dateTime: "2024-01-15T10:00:00Z",
    conId: "C-1001",
    name: "Mrs. Priya Nair",
    age: "45",
    gender: "Female",
    mob: "+91 9876543210",
    email: "priya.nair@email.com",
    chiefComplaints:
      "Chronic back pain, fatigue, and digestive issues. Patient reports pain worsening over the past 3 months.",
    medicalHistory: "Hypertension (controlled with medication), previous history of gastritis. No known allergies.",
    ayurvedicDiagnosis:
      "Vata-Pitta imbalance with Ama accumulation. Weak Agni leading to improper digestion and toxin buildup.",
    treatmentType: "Panchakarma",
    minimumduration: "3 weeks",
    outComeRemarks:
      "Expected significant improvement in back pain and energy levels. Follow-up consultation recommended after 2 weeks.",
    internalMed: `1. Dashmoolarishta - 20ml twice daily after meals
2. Yograj Guggulu - 2 tablets twice daily with warm water
3. Triphala Churna - 1 tsp at bedtime with warm water
4. Saraswatarishta - 15ml twice daily after meals`,
    externalMed: `1. Ksheerabala Oil - Full body massage daily before bath
2. Mahanarayana Oil - Local application on back pain areas
3. Steam bath with Dashamoola decoction - 3 times per week
4. Abhyanga with warm sesame oil - Daily morning routine`,
  },
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasDoctorConsultationAccess(user)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { id: prescriptionId } = await params

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  const prescription = mockPrescriptionData[prescriptionId as keyof typeof mockPrescriptionData]

  if (!prescription) {
    return NextResponse.json({ error: "Prescription not found" }, { status: 404 })
  }

  return NextResponse.json(prescription)
}
