"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import type { BookingEntry, ComplaintEntry, FMSStats } from "@/types/fms"

// Mock Google Sheets API integration
const mockBookings: BookingEntry[] = [
  {
    id: "1",
    clientName: "Rajesh Kumar",
    phoneNumber: "+91 9876543210",
    email: "rajesh@email.com",
    service: "Ayurvedic Consultation",
    appointmentDate: "2024-01-20",
    appointmentTime: "10:00 AM",
    status: "confirmed",
    assignedDoctor: "Dr. Priya Nair",
    department: "Ayurveda",
    remarks: "First time patient",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
    createdBy: "reception_001",
  },
  {
    id: "2",
    clientName: "Meera Pillai",
    phoneNumber: "+91 9876543211",
    service: "Panchakarma Treatment",
    appointmentDate: "2024-01-21",
    appointmentTime: "2:00 PM",
    status: "pending",
    department: "Panchakarma",
    createdAt: "2024-01-16T11:30:00Z",
    updatedAt: "2024-01-16T11:30:00Z",
    createdBy: "sales_002",
  },
]

const mockComplaints: ComplaintEntry[] = [
  {
    id: "1",
    complaintId: "COMP-2024-001",
    clientName: "Suresh Nair",
    phoneNumber: "+91 9876543212",
    email: "suresh@email.com",
    complaintType: "service",
    priority: "high",
    description: "Treatment was not effective as promised",
    status: "in-progress",
    assignedTo: "Dr. Anand Kumar",
    department: "Quality Assurance",
    createdAt: "2024-01-18T14:30:00Z",
    updatedAt: "2024-01-19T10:15:00Z",
    createdBy: "customer_service",
  },
  {
    id: "2",
    complaintId: "COMP-2024-002",
    clientName: "Lakshmi Menon",
    phoneNumber: "+91 9876543213",
    complaintType: "billing",
    priority: "medium",
    description: "Incorrect billing amount charged",
    status: "resolved",
    assignedTo: "Accounts Team",
    department: "Billing",
    resolution: "Amount refunded and corrected",
    createdAt: "2024-01-17T16:45:00Z",
    updatedAt: "2024-01-19T09:30:00Z",
    resolvedAt: "2024-01-19T09:30:00Z",
    createdBy: "billing_dept",
  },
]

function useFMSHook() {
  const [bookings, setBookings] = useState<BookingEntry[]>(mockBookings)
  const [complaints, setComplaints] = useState<ComplaintEntry[]>(mockComplaints)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<FMSStats>({
    totalBookings: 0,
    todayBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    totalComplaints: 0,
    openComplaints: 0,
    resolvedComplaints: 0,
    avgResolutionTime: 0,
  })

  useEffect(() => {
    calculateStats()
  }, [bookings, complaints])

  const calculateStats = () => {
    const today = new Date().toISOString().split("T")[0]

    const newStats: FMSStats = {
      totalBookings: bookings.length,
      todayBookings: bookings.filter((b) => b.appointmentDate === today).length,
      pendingBookings: bookings.filter((b) => b.status === "pending").length,
      completedBookings: bookings.filter((b) => b.status === "completed").length,
      totalComplaints: complaints.length,
      openComplaints: complaints.filter((c) => c.status === "open" || c.status === "in-progress").length,
      resolvedComplaints: complaints.filter((c) => c.status === "resolved").length,
      avgResolutionTime: 2.5, // Mock average in days
    }

    setStats(newStats)
  }

  const createBooking = async (booking: Omit<BookingEntry, "id" | "createdAt" | "updatedAt">) => {
    setLoading(true)
    try {
      // Simulate Google Sheets API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const newBooking: BookingEntry = {
        ...booking,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setBookings((prev) => [...prev, newBooking])
      return { success: true, data: newBooking }
    } catch (error) {
      return { success: false, error: "Failed to create booking" }
    } finally {
      setLoading(false)
    }
  }

  const updateBooking = async (id: string, updates: Partial<BookingEntry>) => {
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id ? { ...booking, ...updates, updatedAt: new Date().toISOString() } : booking,
        ),
      )
      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to update booking" }
    } finally {
      setLoading(false)
    }
  }

  const createComplaint = async (complaint: Omit<ComplaintEntry, "id" | "complaintId" | "createdAt" | "updatedAt">) => {
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const newComplaint: ComplaintEntry = {
        ...complaint,
        id: Date.now().toString(),
        complaintId: `COMP-${new Date().getFullYear()}-${String(complaints.length + 1).padStart(3, "0")}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setComplaints((prev) => [...prev, newComplaint])
      return { success: true, data: newComplaint }
    } catch (error) {
      return { success: false, error: "Failed to create complaint" }
    } finally {
      setLoading(false)
    }
  }

  const updateComplaint = async (id: string, updates: Partial<ComplaintEntry>) => {
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      setComplaints((prev) =>
        prev.map((complaint) =>
          complaint.id === id
            ? {
                ...complaint,
                ...updates,
                updatedAt: new Date().toISOString(),
                resolvedAt: updates.status === "resolved" ? new Date().toISOString() : complaint.resolvedAt,
              }
            : complaint,
        ),
      )
      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to update complaint" }
    } finally {
      setLoading(false)
    }
  }

  const syncWithGoogleSheets = async () => {
    setLoading(true)
    try {
      // Simulate Google Sheets sync
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return { success: true, message: "Data synchronized successfully" }
    } catch (error) {
      return { success: false, error: "Sync failed" }
    } finally {
      setLoading(false)
    }
  }

  return {
    bookings,
    complaints,
    stats,
    loading,
    createBooking,
    updateBooking,
    createComplaint,
    updateComplaint,
    syncWithGoogleSheets,
  }
}

const FMSContext = createContext<ReturnType<typeof useFMSHook> | null>(null)

export function FMSProvider({ children }: { children: React.ReactNode }) {
  const fms = useFMSHook()
  return <FMSContext.Provider value={fms}>{children}</FMSContext.Provider>
}

export function useFMSContext() {
  const context = useContext(FMSContext)
  if (!context) {
    throw new Error("useFMSContext must be used within FMSProvider")
  }
  return context
}

// Export the hook for direct usage
export const useFMS = useFMSHook
