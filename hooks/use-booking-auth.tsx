"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { BookingUser, BookingRole } from "@/types/booking"

interface BookingAuthContextType {
  user: BookingUser | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  switchRole: (role: BookingRole) => void
  hasPermission: (permission: string) => boolean
  isLoading: boolean
}

const BookingAuthContext = createContext<BookingAuthContextType | undefined>(undefined)

// Demo users for different roles
const demoUsers: Record<string, BookingUser> = {
  "admin@ktahv.com": {
    id: "1",
    name: "Admin User",
    email: "admin@ktahv.com",
    role: "ADMIN",
    permissions: ["*"], // All permissions
  },
  "reservations@ktahv.com": {
    id: "2",
    name: "Reservations Team",
    email: "reservations@ktahv.com",
    role: "RESERVATIONS",
    permissions: ["booking.create", "booking.edit", "booking.view", "payment.add", "alert.send"],
  },
  "accounts@ktahv.com": {
    id: "3",
    name: "Accounts Team",
    email: "accounts@ktahv.com",
    role: "ACCOUNTS",
    permissions: ["booking.view", "payment.view", "payment.verify", "approval.manage"],
  },
  "ml@ktahv.com": {
    id: "4",
    name: "ML Sales Lead",
    email: "ml@ktahv.com",
    role: "ML_SALES_LEAD",
    permissions: ["booking.view", "booking.finalize", "ml.remarks", "escalation.manage"],
  },
  "frontoffice@ktahv.com": {
    id: "5",
    name: "Front Office",
    email: "frontoffice@ktahv.com",
    role: "FRONT_OFFICE_PMS",
    permissions: ["booking.view"],
  },
  "doctor@ktahv.com": {
    id: "6",
    name: "Doctor Liaison",
    email: "doctor@ktahv.com",
    role: "DOCTOR_LIAISON",
    permissions: ["booking.view", "consultation.manage"],
  },
}

export function BookingAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BookingUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem("booking-user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)

    // Demo authentication - in production, this would be a real API call
    if (password === "password123" && demoUsers[email]) {
      const user = demoUsers[email]
      setUser(user)
      localStorage.setItem("booking-user", JSON.stringify(user))
      setIsLoading(false)
      return true
    }

    setIsLoading(false)
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("booking-user")
  }

  const switchRole = (role: BookingRole) => {
    if (user && user.role === "ADMIN") {
      // Only admin can switch roles
      const newUser = { ...user, role }
      setUser(newUser)
      localStorage.setItem("booking-user", JSON.stringify(newUser))
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    if (user.permissions.includes("*")) return true
    return user.permissions.includes(permission)
  }

  return (
    <BookingAuthContext.Provider
      value={{
        user,
        login,
        logout,
        switchRole,
        hasPermission,
        isLoading,
      }}
    >
      {children}
    </BookingAuthContext.Provider>
  )
}

export function useBookingAuth() {
  const context = useContext(BookingAuthContext)
  if (context === undefined) {
    throw new Error("useBookingAuth must be used within a BookingAuthProvider")
  }
  return context
}
