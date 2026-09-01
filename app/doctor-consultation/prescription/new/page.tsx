"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Save, Eye, FileText, User, Stethoscope, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

interface PrescriptionForm {
  consultationId: string
  patientName: string
  patientId: string
  patientAge: string
  patientGender: string
  patientPhone: string
  patientEmail: string
  consultationDate: string
  doctorName: string
  doctorLicense: string
  symptoms: string
  diagnosis: string
  medications: Medication[]
  recommendations: string
  followUpDate: string
  notes: string
}

export default function NewPrescription() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const consultationId = searchParams.get("consultation")

  const [form, setForm] = useState<PrescriptionForm>({
    consultationId: consultationId || "",
    patientName: "",
    patientId: "",
    patientAge: "",
    patientGender: "",
    patientPhone: "",
    patientEmail: "",
    consultationDate: "",
    doctorName: "",
    doctorLicense: "",
    symptoms: "",
    diagnosis: "",
    medications: [],
    recommendations: "",
    followUpDate: "",
    notes: "",
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (consultationId) {
      fetchConsultationData()
    } else {
      setLoading(false)
    }
  }, [consultationId])

  const fetchConsultationData = async () => {
    try {
      const response = await fetch(`/api/doctor/consultations/${consultationId}`)
      const consultation = await response.json()

      setForm((prev) => ({
        ...prev,
        patientName: consultation.patientName,
        patientId: consultation.patientId,
        patientAge: consultation.patientAge || "",
        patientGender: consultation.patientGender || "",
        patientPhone: consultation.patientPhone || "",
        patientEmail: consultation.patientEmail || "",
        consultationDate: consultation.scheduledDate,
        doctorName: consultation.doer,
        doctorLicense: "MD-12345", // This would come from doctor profile
      }))

      setLoading(false)
    } catch (error) {
      console.error("Error fetching consultation data:", error)
      setLoading(false)
    }
  }

  const addMedication = () => {
    const newMedication: Medication = {
      id: Date.now().toString(),
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    }
    setForm((prev) => ({
      ...prev,
      medications: [...prev.medications, newMedication],
    }))
  }

  const updateMedication = (id: string, field: keyof Medication, value: string) => {
    setForm((prev) => ({
      ...prev,
      medications: prev.medications.map((med) => (med.id === id ? { ...med, [field]: value } : med)),
    }))
  }

  const removeMedication = (id: string) => {
    setForm((prev) => ({
      ...prev,
      medications: prev.medications.filter((med) => med.id !== id),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/prescriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const result = await response.json()
      if (response.ok) {
        router.push(`/doctor-consultation/prescription/preview/${result.id}`)
      } else {
        console.error("Error saving prescription:", result.error)
      }
    } catch (error) {
      console.error("Error saving prescription:", error)
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    // Store form data in sessionStorage for preview
    sessionStorage.setItem("prescriptionPreview", JSON.stringify(form))
    window.open("/doctor-consultation/prescription/preview/temp", "_blank")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2f6b4f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/doctor-consultation">
            <Button
              variant="outline"
              size="sm"
              className="border-[#2f6b4f] text-[#2f6b4f] hover:bg-[#2f6b4f] hover:text-white bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1f2a2e]">Create Prescription</h1>
            <p className="text-gray-600">Generate prescription for patient consultation</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/doctor-consultation">
            <Button
              variant="outline"
              className="border-[#2f6b4f] text-[#2f6b4f] hover:bg-[#2f6b4f] hover:text-white bg-transparent"
            >
              Back to Overview
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Information */}
          <Card className="border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-[#1f2a2e] flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patientName" className="text-[#9a16ff]">
                    Patient Name *
                  </Label>
                  <Input
                    id="patientName"
                    value={form.patientName}
                    onChange={(e) => setForm((prev) => ({ ...prev, patientName: e.target.value }))}
                    className="border-[#9a16ff] focus:border-[#9a16ff]"
                    placeholder="Enter patient name"
                  />
                </div>
                <div>
                  <Label htmlFor="patientId" className="text-gray-600">
                    Patient ID
                  </Label>
                  <Input id="patientId" value={form.patientId} readOnly className="bg-gray-50 border-[#dfe7e2]" />
                </div>
                <div>
                  <Label htmlFor="patientAge" className="text-[#9a16ff]">
                    Age *
                  </Label>
                  <Input
                    id="patientAge"
                    value={form.patientAge}
                    onChange={(e) => setForm((prev) => ({ ...prev, patientAge: e.target.value }))}
                    className="border-[#9a16ff] focus:border-[#9a16ff]"
                    placeholder="Enter age"
                  />
                </div>
                <div>
                  <Label htmlFor="patientGender" className="text-[#9a16ff]">
                    Gender *
                  </Label>
                  <Select
                    value={form.patientGender}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, patientGender: value }))}
                  >
                    <SelectTrigger className="border-[#9a16ff] focus:border-[#9a16ff]">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="patientPhone" className="text-[#9a16ff]">
                    Phone *
                  </Label>
                  <Input
                    id="patientPhone"
                    value={form.patientPhone}
                    onChange={(e) => setForm((prev) => ({ ...prev, patientPhone: e.target.value }))}
                    className="border-[#9a16ff] focus:border-[#9a16ff]"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="patientEmail" className="text-[#9a16ff]">
                    Email *
                  </Label>
                  <Input
                    id="patientEmail"
                    type="email"
                    value={form.patientEmail}
                    onChange={(e) => setForm((prev) => ({ ...prev, patientEmail: e.target.value }))}
                    className="border-[#9a16ff] focus:border-[#9a16ff]"
                    placeholder="Enter email address"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Doctor Information */}
          <Card className="border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-[#1f2a2e] flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Doctor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="doctorName" className="text-[#9a16ff]">
                    Doctor Name *
                  </Label>
                  <Input
                    id="doctorName"
                    value={form.doctorName}
                    onChange={(e) => setForm((prev) => ({ ...prev, doctorName: e.target.value }))}
                    className="border-[#9a16ff] focus:border-[#9a16ff]"
                    placeholder="Enter doctor name"
                  />
                </div>
                <div>
                  <Label htmlFor="doctorLicense" className="text-[#9a16ff]">
                    License Number *
                  </Label>
                  <Input
                    id="doctorLicense"
                    value={form.doctorLicense}
                    onChange={(e) => setForm((prev) => ({ ...prev, doctorLicense: e.target.value }))}
                    className="border-[#9a16ff] focus:border-[#9a16ff]"
                    placeholder="Enter license number"
                  />
                </div>
                <div>
                  <Label htmlFor="consultationDate" className="text-gray-600">
                    Consultation Date
                  </Label>
                  <Input
                    id="consultationDate"
                    value={form.consultationDate}
                    readOnly
                    className="bg-gray-50 border-[#dfe7e2]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clinical Information */}
          <Card className="border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-[#1f2a2e] flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Clinical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="symptoms" className="text-[#9a16ff]">
                  Symptoms *
                </Label>
                <Textarea
                  id="symptoms"
                  value={form.symptoms}
                  onChange={(e) => setForm((prev) => ({ ...prev, symptoms: e.target.value }))}
                  className="border-[#9a16ff] focus:border-[#9a16ff]"
                  placeholder="Describe patient symptoms..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="diagnosis" className="text-[#9a16ff]">
                  Diagnosis *
                </Label>
                <Textarea
                  id="diagnosis"
                  value={form.diagnosis}
                  onChange={(e) => setForm((prev) => ({ ...prev, diagnosis: e.target.value }))}
                  className="border-[#9a16ff] focus:border-[#9a16ff]"
                  placeholder="Enter diagnosis..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Medications */}
          <Card className="border-[#dfe7e2]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#1f2a2e]">Medications</CardTitle>
                <Button onClick={addMedication} size="sm" className="bg-[#2f6b4f] hover:bg-[#2f6b4f]/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Medication
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {form.medications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No medications added yet</p>
              ) : (
                <div className="space-y-4">
                  {form.medications.map((medication, index) => (
                    <Card key={medication.id} className="border-[#9a16ff]">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-[#1f2a2e]">Medication {index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMedication(medication.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-[#9a16ff]">Medicine Name *</Label>
                            <Input
                              value={medication.name}
                              onChange={(e) => updateMedication(medication.id, "name", e.target.value)}
                              className="border-[#9a16ff] focus:border-[#9a16ff]"
                              placeholder="Enter medicine name"
                            />
                          </div>
                          <div>
                            <Label className="text-[#9a16ff]">Dosage *</Label>
                            <Input
                              value={medication.dosage}
                              onChange={(e) => updateMedication(medication.id, "dosage", e.target.value)}
                              className="border-[#9a16ff] focus:border-[#9a16ff]"
                              placeholder="e.g., 500mg"
                            />
                          </div>
                          <div>
                            <Label className="text-[#9a16ff]">Frequency *</Label>
                            <Select
                              value={medication.frequency}
                              onValueChange={(value) => updateMedication(medication.id, "frequency", value)}
                            >
                              <SelectTrigger className="border-[#9a16ff] focus:border-[#9a16ff]">
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="once-daily">Once Daily</SelectItem>
                                <SelectItem value="twice-daily">Twice Daily</SelectItem>
                                <SelectItem value="thrice-daily">Thrice Daily</SelectItem>
                                <SelectItem value="four-times-daily">Four Times Daily</SelectItem>
                                <SelectItem value="as-needed">As Needed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[#9a16ff]">Duration *</Label>
                            <Input
                              value={medication.duration}
                              onChange={(e) => updateMedication(medication.id, "duration", e.target.value)}
                              className="border-[#9a16ff] focus:border-[#9a16ff]"
                              placeholder="e.g., 7 days"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-[#9a16ff]">Instructions *</Label>
                            <Textarea
                              value={medication.instructions}
                              onChange={(e) => updateMedication(medication.id, "instructions", e.target.value)}
                              className="border-[#9a16ff] focus:border-[#9a16ff]"
                              placeholder="Special instructions for taking this medication..."
                              rows={2}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-[#1f2a2e]">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recommendations" className="text-[#9a16ff]">
                  Recommendations *
                </Label>
                <Textarea
                  id="recommendations"
                  value={form.recommendations}
                  onChange={(e) => setForm((prev) => ({ ...prev, recommendations: e.target.value }))}
                  className="border-[#9a16ff] focus:border-[#9a16ff]"
                  placeholder="General recommendations for the patient..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="followUpDate" className="text-[#9a16ff]">
                    Follow-up Date *
                  </Label>
                  <Input
                    id="followUpDate"
                    type="date"
                    value={form.followUpDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, followUpDate: e.target.value }))}
                    className="border-[#9a16ff] focus:border-[#9a16ff]"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes" className="text-[#9a16ff]">
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="border-[#9a16ff] focus:border-[#9a16ff]"
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card className="border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-[#1f2a2e]">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handlePreview}
                variant="outline"
                className="w-full border-[#b6864a] text-[#b6864a] hover:bg-[#b6864a] hover:text-white bg-transparent"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Prescription
              </Button>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-[#2f6b4f] hover:bg-[#2f6b4f]/90">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Prescription"}
              </Button>
            </CardContent>
          </Card>

          {/* Consultation Info */}
          {consultationId && (
            <Card className="border-[#dfe7e2]">
              <CardHeader>
                <CardTitle className="text-[#1f2a2e]">Consultation Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-600">Consultation ID</Label>
                  <p className="text-[#1f2a2e] font-mono text-sm">{consultationId}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Patient</Label>
                  <p className="text-[#1f2a2e]">{form.patientName}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Date</Label>
                  <p className="text-[#1f2a2e]">{form.consultationDate}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guidelines */}
          <Card className="border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-[#1f2a2e]">Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Fields marked with purple labels are required</li>
                <li>• Ensure all medication details are accurate</li>
                <li>• Include clear instructions for each medication</li>
                <li>• Set appropriate follow-up dates</li>
                <li>• Review prescription before saving</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
