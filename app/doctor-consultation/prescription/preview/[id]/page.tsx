"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, Printer as Print, ArrowLeft } from "lucide-react"
import Link from "next/link"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

interface PrescriptionData {
  id: string
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
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    duration: string
    instructions: string
  }>
  recommendations: string
  followUpDate: string
  notes: string
  createdAt: string
}

export default function PrescriptionPreview() {
  const params = useParams()
  const prescriptionRef = useRef<HTMLDivElement>(null)
  const [prescription, setPrescription] = useState<PrescriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id === "temp") {
      // Load from sessionStorage for preview
      const previewData = sessionStorage.getItem("prescriptionPreview")
      if (previewData) {
        const data = JSON.parse(previewData)
        setPrescription({
          ...data,
          id: "temp",
          createdAt: new Date().toISOString(),
        })
      }
      setLoading(false)
    } else {
      fetchPrescription()
    }
  }, [params.id])

  const fetchPrescription = async () => {
    try {
      const response = await fetch(`/api/prescriptions/${params.id}`)
      const data = await response.json()
      setPrescription(data)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching prescription:", error)
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!prescriptionRef.current) return

    try {
      const canvas = await html2canvas(prescriptionRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`prescription-${prescription?.patientName}-${new Date().toISOString().split("T")[0]}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2f6b4f]"></div>
      </div>
    )
  }

  if (!prescription) {
    return <div>Prescription not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Hidden in print */}
      <div className="bg-white border-b border-gray-200 p-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/doctor-consultation">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[#1f2a2e]">Prescription Preview</h1>
              <p className="text-sm text-gray-600">Patient: {prescription.patientName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="border-[#b6864a] text-[#b6864a] hover:bg-[#b6864a] hover:text-white bg-transparent"
            >
              <Print className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleDownload} className="bg-[#2f6b4f] hover:bg-[#2f6b4f]/90">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Prescription Content */}
      <div className="max-w-4xl mx-auto p-4 print:p-0">
        <Card className="bg-white shadow-lg print:shadow-none print:border-none">
          <CardContent className="p-0">
            <div ref={prescriptionRef} className="p-8 print:p-6">
              {/* Header */}
              <div className="text-center mb-8 border-b-2 border-[#2f6b4f] pb-6">
                <h1 className="text-3xl font-bold text-[#2f6b4f] mb-2">KAIRALI GROUP</h1>
                <p className="text-lg text-[#b6864a] font-medium">Ayurvedic Treatment & Wellness Center</p>
                <p className="text-sm text-gray-600 mt-2">
                  📍 Kerala, India | 📞 +91-XXXX-XXXX | 📧 info@kairaligroup.com
                </p>
              </div>

              {/* Prescription Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[#1f2a2e] mb-2">PRESCRIPTION</h2>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Prescription ID: {prescription.id}</span>
                  <span>Date: {new Date(prescription.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Patient & Doctor Info */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-[#2f6b4f] mb-3">PATIENT INFORMATION</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Name:</strong> {prescription.patientName}
                    </div>
                    <div>
                      <strong>ID:</strong> {prescription.patientId}
                    </div>
                    <div>
                      <strong>Age:</strong> {prescription.patientAge} years
                    </div>
                    <div>
                      <strong>Gender:</strong> {prescription.patientGender}
                    </div>
                    <div>
                      <strong>Phone:</strong> {prescription.patientPhone}
                    </div>
                    <div>
                      <strong>Email:</strong> {prescription.patientEmail}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-[#2f6b4f] mb-3">DOCTOR INFORMATION</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Doctor:</strong> {prescription.doctorName}
                    </div>
                    <div>
                      <strong>License:</strong> {prescription.doctorLicense}
                    </div>
                    <div>
                      <strong>Consultation Date:</strong> {new Date(prescription.consultationDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical Information */}
              <div className="mb-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-[#2f6b4f] mb-2">SYMPTOMS</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{prescription.symptoms}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2f6b4f] mb-2">DIAGNOSIS</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{prescription.diagnosis}</p>
                  </div>
                </div>
              </div>

              {/* Medications */}
              <div className="mb-8">
                <h3 className="font-bold text-[#2f6b4f] mb-4 text-lg">PRESCRIBED MEDICATIONS</h3>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#2f6b4f] text-white">
                      <tr>
                        <th className="p-3 text-left">Medicine</th>
                        <th className="p-3 text-left">Dosage</th>
                        <th className="p-3 text-left">Frequency</th>
                        <th className="p-3 text-left">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescription.medications.map((med, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="p-3 font-medium">{med.name}</td>
                          <td className="p-3">{med.dosage}</td>
                          <td className="p-3">{med.frequency}</td>
                          <td className="p-3">{med.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Medication Instructions */}
                <div className="mt-4">
                  <h4 className="font-bold text-[#2f6b4f] mb-2">MEDICATION INSTRUCTIONS</h4>
                  {prescription.medications.map((med, index) => (
                    <div key={index} className="mb-2 text-sm">
                      <strong>{med.name}:</strong> {med.instructions}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="mb-8">
                <h3 className="font-bold text-[#2f6b4f] mb-2">RECOMMENDATIONS</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{prescription.recommendations}</p>
              </div>

              {/* Follow-up & Notes */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="font-bold text-[#2f6b4f] mb-2">FOLLOW-UP DATE</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {new Date(prescription.followUpDate).toLocaleDateString()}
                  </p>
                </div>
                {prescription.notes && (
                  <div>
                    <h3 className="font-bold text-[#2f6b4f] mb-2">ADDITIONAL NOTES</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{prescription.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t-2 border-[#2f6b4f] pt-6 mt-8">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Doctor's Signature</p>
                    <div className="w-48 h-16 border-b border-gray-400 flex items-end pb-2">
                      <span className="text-sm font-medium">{prescription.doctorName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      This prescription is computer generated and valid for 30 days from the date of issue.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">For any queries, please contact us at +91-XXXX-XXXX</p>
                  </div>
                </div>
              </div>

              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <div className="text-6xl font-bold text-[#2f6b4f] transform rotate-45">KAIRALI GROUP</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
