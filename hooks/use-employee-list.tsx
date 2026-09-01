"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { toast } from "sonner"

export interface User {
  id: string
  email: string
  name: string
  role: string
  department: string
  company: string
  permissions: string[]
  employeeId: string
  phone: string
  joinDate: string
  isActive: boolean
  reportingTo?: string
  action?: Record<string, string>
}





const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyAJuushBcFxdon4YG2sQCLqiYZV6RvpJlUWzyHFqkeCbOfyYqZiBcGSPKNVTouY01w/exec"
const EmployeeListContext = createContext<{
  users: User[]
} | undefined>(undefined)
export function EmployeeListProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])

  const mapSheetToUser = (email: string, data: any): User => {
    return {
      id: data["EMPLOYEE ID"] || email,
      email: data["Email ID"] || email,
      name: data["ALL USERS"]?.trim() || "",
      role: data["DESIGNATION"]?.toLowerCase().replace(/\s+/g, "_") || "",
      department: data["DEPARTMENT"] || "",
      company: data["COMPANY TYPE"] || "",
      permissions: [],
      employeeId: data["EMPLOYEE ID"] || "",
      phone: data["  MOBILE NO"] || "",
      joinDate: data["Date Of Joining"] || "",
      isActive: data["JOINED STATUS"] !== "LEFT",
      reportingTo: data["Reporting Manager"] || "",
      action: {},
    }
  }

  const fetchUsers = async () => {
    try {
      const url = new URL(SCRIPT_URL)
      url.searchParams.append("action", "onlyActive")

      const res = await fetch(url.toString())
      const data = await res.json()

      const mappedUsers: User[] = Object.entries(data).map(([email, value]: any) =>
        mapSheetToUser(email, value)
      )

      setUsers(mappedUsers)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load employees")
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return (
    <EmployeeListContext.Provider
      value={{
        users,
      }}
    >
      {children}
    </EmployeeListContext.Provider>
  )
}

export function useEmployeeList() {
  const context = useContext(EmployeeListContext)
  if (!context) {
    throw new Error("useEmployeeList must be used within an EmployeeListProvider")
  }
  return context
}

export function getAllEmployees() {
  const context = useContext(EmployeeListContext)
  if (!context) {
    throw new Error("getAllEmployees must be used within an EmployeeListProvider")
  }
  return context.users
}