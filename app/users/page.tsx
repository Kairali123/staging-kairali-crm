"use client"

import type React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  ShieldCheck,
  UserCheck,
  Building2,
  ChevronRight,
  ChevronDown,
  Shield,
  KeyRound,
  Smartphone,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Lock,
  Filter,
  UserX,
  Layers,
  Sparkles,
  Download,
  Mail,
  Phone,
  LayoutGrid,
  List as ListIcon,
  Check,
  Copy,
  Clock,
  Radio,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  TrendingUp,
  Eye,
  EyeOff,
  CheckCircle,
  TableIcon,
} from "lucide-react"
import type { User, UserRole, Department } from "@/hooks/use-auth"
import { toast } from "sonner"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

const ROLE_META: Record<string, { label: string; bg: string; text: string; border: string }> = {
  super_admin:       { label: "Super Admin",    bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" },
  admin:             { label: "Admin",          bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" },
  sales_manager:     { label: "Sales Manager",  bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  sales_agent:       { label: "Sales Agent",    bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc" },
  operation_manager: { label: "Ops Manager",    bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  operation_staff:   { label: "Ops Staff",      bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
  doctor:            { label: "Doctor",         bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
  account_manager:   { label: "Acct. Manager",  bg: "#ffe4e6", text: "#9f1239", border: "#fecdd3" },
}

const COMPANY_META: Record<string, { bg: string; text: string; border: string }> = {
  KAPPL: { bg: "#ccfbf1", text: "#115e59", border: "#5eead4" },
  KTAHV: { bg: "#e0e7ff", text: "#3730a3", border: "#a5b4fc" },
  VILLARAAG: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  "Villa Raag": { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  COMMON: { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" },
  Common: { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" },
  "KTAHV | KAPPL | VILLARAAG": { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
}

function getCompanyBadgeStyle(company: string = "") {
  if (COMPANY_META[company]) return COMPANY_META[company]
  const upper = company.toUpperCase()
  if (upper.includes("VILLARAAG") && upper.includes("KAPPL")) {
    return { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" }
  }
  if (upper.includes("VILLARAAG")) {
    return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" }
  }
  if (upper.includes("COMMON") || company.includes("|")) {
    return { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" }
  }
  return { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" }
}

// Extended User Type with device metadata
interface ExtendedUser extends User {
  tokenVersion?: number
  registeredDevicesCount?: number
  activeSessionsCount?: number
  currentPassword?: string
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user, isLoading, hasPermission, getAllUsers, createUser, updateUser, deleteUser } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<ExtendedUser[]>([])
  const [isFetchingUsers, setIsFetchingUsers] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [filterDepartment, setFilterDepartment] = useState<string>("all")
  const [filterCompany, setFilterCompany] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [sortField, setSortField] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [securityUser, setSecurityUser] = useState<ExtendedUser | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [gotoPage, setGotoPage] = useState("")
  const resultRef = useRef<HTMLDivElement | null>(null)

  const isSuperAdminOrAdmin = user?.role === "super_admin" || user?.role === "admin"

  const fetchUsersFromDb = useCallback(async () => {
    setIsFetchingUsers(true)
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.users)) {
          setUsers(data.users)
          return
        }
      }
      // Fallback
      if (typeof getAllUsers === "function") {
        setUsers(getAllUsers())
      }
    } catch {
      if (typeof getAllUsers === "function") {
        setUsers(getAllUsers())
      }
    } finally {
      setIsFetchingUsers(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("users.view"))) {
      router.push("/dashboard")
    }
  }, [user, isLoading, hasPermission, router])

  useEffect(() => {
    if (user?.id) {
      if (isSuperAdminOrAdmin) {
        fetchUsersFromDb()
      } else if (typeof getAllUsers === "function") {
        setUsers(getAllUsers())
      }
    }
  }, [user?.id, isSuperAdminOrAdmin, fetchUsersFromDb])

  const availableDepartments = useMemo(() => {
    const deptSet = new Set<string>()
    const standardDepts = [
      "Sales",
      "Operations",
      "Marketing",
      "Medical",
      "Accounts",
      "Management",
      "MDO",
      "Administration",
      "HR",
      "IT",
      "Front Office",
    ]
    standardDepts.forEach((d) => deptSet.add(d))
    users.forEach((u) => {
      if (u.department && String(u.department).trim()) {
        deptSet.add(String(u.department).trim())
      }
    })
    return Array.from(deptSet).sort((a, b) => a.localeCompare(b))
  }, [users])

  const availableRoles = useMemo(() => {
    const roleSet = new Set<string>()
    const standardRoles = [
      "super_admin",
      "admin",
      "sales_manager",
      "sales_agent",
      "operation_manager",
      "operation_staff",
      "doctor",
      "account_manager",
    ]
    standardRoles.forEach((r) => roleSet.add(r))
    users.forEach((u) => {
      if (u.role && String(u.role).trim()) {
        roleSet.add(String(u.role).trim())
      }
    })
    return Array.from(roleSet).sort((a, b) => a.localeCompare(b))
  }, [users])

  const availableDivisions = useMemo(() => {
    const divSet = new Set<string>()
    const standardDivs = ["KAPPL", "KTAHV", "VILLARAAG", "COMMON"]
    standardDivs.forEach((d) => divSet.add(d))
    users.forEach((u) => {
      if (u.company && String(u.company).trim()) {
        divSet.add(String(u.company).trim())
      }
    })
    return Array.from(divSet)
  }, [users])

  const filteredUsers = useMemo(() => {
    let result = users.filter((u) => {
      const q = searchInput.toLowerCase().trim()
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)

      const matchesRole = filterRole === "all" || u.role === filterRole
      const matchesDepartment = filterDepartment === "all" || u.department === filterDepartment

      const matchesCompany = (() => {
        if (filterCompany === "ALL") return true
        if (!u.company) return false
        const userComp = String(u.company).toUpperCase()
        const selected = String(filterCompany).toUpperCase()

        if (u.company === filterCompany) return true
        if (selected === "VILLARAAG" || selected === "VILLA RAAG") {
          return userComp.includes("VILLARAAG") || userComp.includes("COMMON")
        }
        if (selected === "COMMON") {
          return userComp.includes("COMMON") || userComp.includes("|")
        }
        if (selected === "KAPPL") {
          return userComp.includes("KAPPL") || userComp.includes("COMMON")
        }
        if (selected === "KTAHV") {
          return userComp.includes("KTAHV") || userComp.includes("COMMON")
        }
        return userComp.includes(selected)
      })()

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && u.isActive) ||
        (filterStatus === "inactive" && !u.isActive)

      return matchesSearch && matchesRole && matchesDepartment && matchesCompany && matchesStatus
    })

    if (sortField) {
      result.sort((a: any, b: any) => {
        let aVal = a[sortField] || ""
        let bVal = b[sortField] || ""
        if (typeof aVal === "string") aVal = aVal.toLowerCase()
        if (typeof bVal === "string") bVal = bVal.toLowerCase()
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return result
  }, [users, searchInput, filterRole, filterDepartment, filterCompany, filterStatus, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-white" />
    ) : (
      <ArrowDown className="h-3 w-3 text-white" />
    )
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length)
  const currentTableUsers = filteredUsers.slice(startIndex, endIndex)

  const handleGotoPage = () => {
    const p = parseInt(gotoPage, 10)
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p)
      setGotoPage("")
    }
  }

  const handleCopyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email)
    setCopiedId(id)
    toast.success("Email copied to clipboard")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const exportCSV = () => {
    if (filteredUsers.length === 0) {
      toast.error("No user records to export")
      return
    }
    const headers = ["ID", "Name", "Email", "Employee ID", "Role", "Department", "Division", "Phone", "Devices", "Status"]
    const rows = filteredUsers.map((u) => [
      u.id,
      `"${u.name}"`,
      u.email,
      u.employeeId,
      u.role,
      u.department,
      u.company,
      u.phone || "",
      u.role === "super_admin" ? `${u.registeredDevicesCount || 0} (Unlimited)` : `${u.registeredDevicesCount || 0}/2`,
      u.isActive ? "Active" : "Inactive",
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `kairali_users_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("User directory exported successfully")
  }

  const resetFilters = () => {
    setSearchInput("")
    setFilterRole("all")
    setFilterDepartment("all")
    setFilterCompany("ALL")
    setFilterStatus("all")
    setSortField("name")
    setSortDirection("asc")
    setCurrentPage(1)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Loading User Directory…</p>
        </div>
      </div>
    )
  }

  if (!user || !hasPermission("users.view")) return null

  const activeCount = users.filter((u) => u.isActive).length
  const inactiveCount = users.length - activeCount
  const adminCount = users.filter((u) => u.role === "admin" || u.role === "super_admin").length
  const kapplCount = users.filter((u) => u.company === "KAPPL").length
  const ktahvCount = users.filter((u) => u.company === "KTAHV").length
  const villaraagCount = users.filter((u) => u.company?.toUpperCase().includes("VILLARAAG")).length
  const commonCount = users.filter((u) => u.company?.toUpperCase().includes("COMMON") || u.company?.includes("|")).length

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ══════════════════════════════════════════════════════════════════════
            1. HERO HEADER SECTION (Exact Lead Assignment Hub Style)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)] rounded-xl">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">

            {/* Back Button */}
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
            >
              ← Back to Dashboard
            </button>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">

              {/* Left Section - Icon + Title & Subtitle */}
              <div className="space-y-3 w-full">
                <div className="flex items-start sm:items-center gap-4">
                  {/* Icon Container */}
                  <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                    <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-white" />
                  </div>

                  {/* Title & Subtitle */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight break-words">
                        User Management Hub
                      </h1>
                      {isSuperAdminOrAdmin && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white border border-white/30 backdrop-blur-sm">
                          <Shield className="h-3.5 w-3.5 text-yellow-300" /> Super Admin Control
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base lg:text-lg text-white/90 mt-1 sm:mt-2 font-medium">
                      Manage employees, security credentials, 2-device binding, and real-time remote session controls
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Section - Action Buttons + Total Users KPI Card */}
              <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto items-center justify-start lg:justify-end gap-3">
                {isSuperAdminOrAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchUsersFromDb}
                    disabled={isFetchingUsers}
                    className="h-11 gap-2 rounded-lg bg-white/10 text-xs font-semibold text-white border-white/20 backdrop-blur-sm hover:bg-white/20 hover:text-white"
                  >
                    <RefreshCw className={`h-4 w-4 ${isFetchingUsers ? "animate-spin" : ""}`} />
                    Sync DB
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCSV}
                  className="h-11 gap-2 rounded-lg bg-white/10 text-xs font-semibold text-white border-white/20 backdrop-blur-sm hover:bg-white/20 hover:text-white"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>

                {hasPermission("users.create") && (
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="h-11 gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30"
                  >
                    <Plus className="h-4 w-4" />
                    Add Employee
                  </Button>
                )}

                {/* Total Users Counter Card */}
                <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20 shrink-0">
                  <p className="text-xs uppercase tracking-wide text-white/70 font-semibold mb-1">
                    Total Users
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
                    {users.length}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>


        {/* ══════════════════════════════════════════════════════════════════════
            2. ADVANCED FILTERS CARD (Villa Raag / KTAHV Style)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="mt-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-md">

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                    Filters &amp; Search Directory
                  </h3>
                  <p className="text-xs text-slate-500">
                    Refine personnel by search, role, department, division, and account status
                  </p>
                </div>
              </div>

              {/* Clear Filters Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="w-full sm:w-auto bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-100"
              >
                Clear Filters
              </Button>
            </div>

            {/* Filter Controls */}
            <div className="px-4 sm:px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                {/* 1. SEARCH */}
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Search Users
                  </label>
                  <Input
                    placeholder="Name, email, phone, or EMP ID…"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="h-10 w-full rounded-md border-gray-300"
                  />
                </div>

                {/* 2. ROLE */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Role Authority
                  </label>
                  <Select
                    value={filterRole}
                    onValueChange={(val) => {
                      setFilterRole(val)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {availableRoles.map((roleKey) => (
                        <SelectItem key={roleKey} value={roleKey}>
                          {ROLE_META[roleKey]?.label || roleKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. DEPARTMENT */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Department
                  </label>
                  <Select
                    value={filterDepartment}
                    onValueChange={(val) => {
                      setFilterDepartment(val)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {availableDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. COMPANY / DIVISION */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Division
                  </label>
                  <Select
                    value={filterCompany}
                    onValueChange={(val) => {
                      setFilterCompany(val)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                      <SelectValue placeholder="All Divisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Divisions</SelectItem>
                      <SelectItem value="KAPPL">KAPPL</SelectItem>
                      <SelectItem value="KTAHV">KTAHV</SelectItem>
                      <SelectItem value="VILLARAAG">Villa Raag</SelectItem>
                      <SelectItem value="COMMON">Common</SelectItem>
                      {availableDivisions
                        .filter(
                          (d) =>
                            !["ALL", "KAPPL", "KTAHV", "VILLARAAG", "COMMON", "VILLA RAAG"].includes(
                              d.toUpperCase()
                            )
                        )
                        .map((div) => (
                          <SelectItem key={div} value={div}>
                            {div}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>

          </div>
        </div>


        {/* ══════════════════════════════════════════════════════════════════════
            3. KEY PERFORMANCE INDICATORS SECTION
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="relative">
          <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl">

            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200 rounded-t-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                    Directory Key Metrics &amp; Health Overview
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Staff distribution, operational status, and privileged authority breakdown
                  </p>
                </div>
              </div>
            </div>

            {/* KPI Cards Content */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* 1. Total Registered Personnel */}
                <Card className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 border-2 border-blue-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                        Total Personnel
                      </p>
                      <p className="text-3xl font-extrabold text-blue-900 mt-2">
                        {users.length}
                      </p>
                      <p className="text-xs font-medium text-blue-700 mt-1">
                        {kapplCount} KAPPL • {ktahvCount} KTAHV {villaraagCount > 0 ? `• ${villaraagCount} VR` : ""} {commonCount > 0 ? `• ${commonCount} Common` : ""}
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg text-white">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                </Card>

                {/* 2. Active Accounts */}
                <Card className="bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200 border-2 border-emerald-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                        Active Accounts
                      </p>
                      <p className="text-3xl font-extrabold text-emerald-900 mt-2">
                        {activeCount}
                      </p>
                      <p className="text-xs font-medium text-emerald-700 mt-1">
                        {users.length > 0 ? ((activeCount / users.length) * 100).toFixed(1) : 0}% Operational
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg text-white">
                      <UserCheck className="h-6 w-6" />
                    </div>
                  </div>
                </Card>

                {/* 3. Filtered Results Shown */}
                <Card className="bg-gradient-to-br from-cyan-50 via-cyan-100 to-cyan-200 border-2 border-cyan-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide mb-1">
                        Results Shown
                      </p>
                      <p className="text-3xl font-extrabold text-cyan-900 mt-2">
                        {filteredUsers.length}
                      </p>
                      <p className="text-xs font-medium text-cyan-700 mt-1">
                        Matching Active Filters
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg text-white">
                      <Search className="h-6 w-6" />
                    </div>
                  </div>
                </Card>

                {/* 4. Admins & Super Admins */}
                <Card className="bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 border-2 border-purple-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
                        Privileged Admins
                      </p>
                      <p className="text-3xl font-extrabold text-purple-900 mt-2">
                        {adminCount}
                      </p>
                      <p className="text-xs font-medium text-purple-700 mt-1">
                        Full Access Privileges
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg text-white">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                  </div>
                </Card>

              </div>
            </div>

          </div>
        </div>


        {/* ══════════════════════════════════════════════════════════════════════
            4. MAIN USERS DATA TABLE (Exact Leads Table Structure & Theming)
        ══════════════════════════════════════════════════════════════════════ */}
        <div ref={resultRef} className="border-2 border-slate-200 rounded-xl shadow-xl bg-white overflow-hidden relative">

          {/* ---------- Table Header Strip ---------- */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b border-slate-200 rounded-t-xl shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm text-white">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">
                  Personnel Directory &amp; Security Controls
                </h3>
                <p className="text-[11px] text-slate-500">
                  {filteredUsers.length} employee{filteredUsers.length !== 1 ? "s" : ""} registered in system
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/70 border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-blue-700">
                  Total: {users.length} Users
                </span>
              </div>
            </div>
          </div>

          {/* ---------- Table Content ---------- */}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Users className="h-14 w-14 mx-auto mb-4 text-slate-300" />
              <p className="text-sm font-medium">No employees found matching the filters.</p>
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3 text-xs">
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  {/* Sticky Header with exact #1e3a5f styling */}
                  <thead
                    className="sticky top-0 z-10 border-b-2 border-slate-400 shadow"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <tr className="border-b-2 border-slate-400">
                      <th
                        scope="col"
                        onClick={() => handleSort("name")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Employee Name
                          {renderSortIcon("name")}
                        </div>
                      </th>

                      <th
                        scope="col"
                        onClick={() => handleSort("employeeId")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Employee ID
                          {renderSortIcon("employeeId")}
                        </div>
                      </th>

                      <th
                        scope="col"
                        onClick={() => handleSort("role")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Role
                          {renderSortIcon("role")}
                        </div>
                      </th>

                      <th
                        scope="col"
                        onClick={() => handleSort("department")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Department
                          {renderSortIcon("department")}
                        </div>
                      </th>

                      <th
                        scope="col"
                        onClick={() => handleSort("company")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Division
                          {renderSortIcon("company")}
                        </div>
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        Devices (Max 2)
                      </th>

                      <th
                        scope="col"
                        onClick={() => handleSort("isActive")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Status
                          {renderSortIcon("isActive")}
                        </div>
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {currentTableUsers.map((u) => {
                      const role = ROLE_META[u.role] ?? {
                        label: u.role,
                        bg: "#f1f5f9",
                        text: "#475569",
                        border: "#cbd5e1",
                      }
                      const company = COMPANY_META[u.company] ?? {
                        bg: "#f1f5f9",
                        text: "#475569",
                        border: "#cbd5e1",
                      }

                      return (
                        <tr key={u.id} className="hover:bg-blue-50/50 transition-colors">
                          {/* Employee Name */}
                          <td className="px-4 py-3 border-r border-slate-200 text-left whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white shadow-sm">
                                {getInitials(u.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 leading-tight">{u.name}</p>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                  <span className="truncate max-w-[180px]">{u.email}</span>
                                  <button
                                    onClick={() => handleCopyEmail(u.email, u.id)}
                                    className="text-slate-400 hover:text-blue-600 transition-colors"
                                    title="Copy Email"
                                  >
                                    {copiedId === u.id ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="px-4 py-3 text-center border-r border-slate-200 font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
                            {u.employeeId}
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3 text-center border-r border-slate-200 whitespace-nowrap">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                              style={{ backgroundColor: role.bg, color: role.text, borderColor: role.border }}
                            >
                              {role.label}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="px-4 py-3 text-center border-r border-slate-200 text-xs font-medium text-slate-700 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 font-medium">
                              {u.department}
                            </span>
                          </td>

                          {/* Division */}
                          <td className="px-4 py-3 text-center border-r border-slate-200 whitespace-nowrap">
                            {(() => {
                              const cs = getCompanyBadgeStyle(u.company)
                              return (
                                <span
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border"
                                  style={{ backgroundColor: cs.bg, color: cs.text, borderColor: cs.border }}
                                >
                                  {u.company}
                                </span>
                              )
                            })()}
                          </td>

                          {/* Devices Count */}
                          <td className="px-4 py-3 text-center border-r border-slate-200 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {u.role === "super_admin" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200">
                                  <Smartphone className="h-3 w-3" />
                                  {u.registeredDevicesCount || 0} (Unlimited)
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold border ${
                                    (u.registeredDevicesCount || 0) >= 2
                                      ? "bg-amber-50 text-amber-800 border-amber-300"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  }`}
                                >
                                  <Smartphone className="h-3 w-3" />
                                  {u.registeredDevicesCount || 0}/2
                                </span>
                              )}
                              {u.activeSessionsCount ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-[10px] font-bold text-emerald-800 animate-pulse">
                                  ● 1 active
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center border-r border-slate-200 whitespace-nowrap">
                            {u.isActive ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                                style={{ backgroundColor: "#dcfce7", color: "#15803d", borderColor: "#86efac" }}
                              >
                                ● Active
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                                style={{ backgroundColor: "#fee2e2", color: "#b91c1c", borderColor: "#f87171" }}
                              >
                                ○ Inactive
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {isSuperAdminOrAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSecurityUser(u)}
                                  className="h-8 px-3 text-xs font-medium border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 shadow-2xs gap-1"
                                >
                                  <Shield className="h-3.5 w-3.5" />
                                  Security
                                </Button>
                              )}
                              {hasPermission("users.edit") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingUser(u)}
                                  className="h-8 px-2.5 text-xs font-medium border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                                  title="Edit User"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {hasPermission("users.delete") && u.id !== user.id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete ${u.name}?`)) {
                                      await deleteUser(u.id)
                                      fetchUsersFromDb()
                                    }
                                  }}
                                  className="h-8 px-2.5 text-xs font-medium border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                  title="Delete User"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ══════════════════════════════════════════════════════════════════
                  5. PAGINATION FOOTER (Exact Leads Assign Page Pagination Bar)
              ══════════════════════════════════════════════════════════════════ */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-4 border-t bg-gradient-to-r from-slate-50 to-blue-50">

                {/* Left - Info */}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>Showing</span>
                  <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {filteredUsers.length > 0 ? startIndex + 1 : 0}–{endIndex}
                  </span>
                  <span>of</span>
                  <span className="font-bold text-blue-700">
                    {filteredUsers.length}
                  </span>
                  <span>users</span>
                </div>

                {/* Center - Page Numbers */}
                <div className="flex items-center gap-1">
                  {/* First page */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="h-8 w-8 p-0 text-xs"
                  >
                    «
                  </Button>

                  {/* Prev */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs"
                  >
                    ‹ Prev
                  </Button>

                  {/* Page numbers */}
                  {(() => {
                    const pages = []
                    const total = totalPages
                    const cur = currentPage
                    let start = Math.max(1, cur - 2)
                    let end = Math.min(total, cur + 2)
                    if (cur <= 3) end = Math.min(5, total)
                    if (cur >= total - 2) start = Math.max(1, total - 4)

                    if (start > 1) pages.push(<span key="s-ellipsis" className="px-1 text-slate-400">…</span>)
                    for (let i = start; i <= end; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`h-8 w-8 rounded-md text-xs font-semibold transition-all ${
                            i === cur
                              ? "bg-blue-600 text-white shadow-md border border-blue-700"
                              : "bg-white text-slate-700 border border-slate-300 hover:bg-blue-50 hover:border-blue-300"
                          }`}
                        >
                          {i}
                        </button>
                      )
                    }
                    if (end < total) pages.push(<span key="e-ellipsis" className="px-1 text-slate-400">…</span>)
                    return pages
                  })()}

                  {/* Next */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 text-xs"
                  >
                    Next ›
                  </Button>

                  {/* Last page */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-8 w-8 p-0 text-xs"
                  >
                    »
                  </Button>
                </div>

                {/* Right - Rows per page & Go to page */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Rows per page */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Rows/page</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setItemsPerPage(val)
                        setCurrentPage(1)
                      }}
                      className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Go to page */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Go to</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={gotoPage}
                      onChange={(e) => setGotoPage(e.target.value)}
                      className="h-8 w-20 rounded-md border border-slate-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Page"
                    />
                    <Button
                      size="sm"
                      className="h-8 bg-blue-600 hover:bg-blue-700"
                      onClick={handleGotoPage}
                    >
                      Go
                    </Button>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>

        {/* ── Create Employee Modal ── */}
        {isCreateDialogOpen && (
          <EmployeeProfileModal
            open={isCreateDialogOpen}
            onClose={() => setIsCreateDialogOpen(false)}
            onSubmit={async (d) => {
              try {
                await createUser(d)
                await fetchUsersFromDb()
                setIsCreateDialogOpen(false)
              } catch {}
            }}
          />
        )}

        {/* ── Edit Employee Modal ── */}
        {editingUser && (
          <EmployeeProfileModal
            user={editingUser}
            open={!!editingUser}
            onClose={() => setEditingUser(null)}
            onSubmit={async (d) => {
              try {
                await updateUser(editingUser.id, d)
                await fetchUsersFromDb()
                setEditingUser(null)
              } catch {}
            }}
          />
        )}

        {/* ── Super Admin Security & Device Management Dialog ── */}
        {securityUser && (
          <SecurityManagementModal
            user={securityUser}
            onClose={() => setSecurityUser(null)}
            onUpdated={fetchUsersFromDb}
          />
        )}

      </div>
    </DashboardLayout>
  )
}

// ─── Super Admin Security Management Modal ────────────────────────────────────

interface SecurityModalProps {
  user: ExtendedUser
  onClose: () => void
  onUpdated: () => void
}

function formatISTDateTime(val: string | Date | null | undefined): string {
  if (!val) return "—"
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return (
      d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).replace(/\b(am|pm)\b/i, (m) => m.toUpperCase()) + " (IST)"
    )
  } catch {
    return String(val) || "—"
  }
}

function SecurityManagementModal({ user, onClose, onUpdated }: SecurityModalProps) {
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === "super_admin"

  const [activeTab, setActiveTab] = useState<"password" | "devices" | "sessions">("password")
  const [currentPassword, setCurrentPassword] = useState<string>(user.currentPassword || "")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const [devices, setDevices] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoadingDetails, setIsLoadingDetails] = useState(true)

  const loadDetails = useCallback(async () => {
    setIsLoadingDetails(true)
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/sessions`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setDevices(data.devices || [])
        setSessions(data.sessions || [])
        if (typeof data.currentPassword === "string") {
          setCurrentPassword(data.currentPassword)
        }
      }
    } catch {
      toast.error("Failed to load device details")
    } finally {
      setIsLoadingDetails(false)
    }
  }, [user.id])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  const handleCopyPassword = () => {
    if (!currentPassword) {
      toast.error("No password available to copy")
      return
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(currentPassword).catch(() => {})
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = currentPassword
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
    setCopiedPassword(true)
    toast.success("Password copied to clipboard")
    setTimeout(() => setCopiedPassword(false), 2000)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setIsUpdatingPassword(true)
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update password")
      }

      toast.success(
        `Password updated for ${user.name}! The user will receive an instant real-time alert and be redirected to login.`,
        { duration: 5000 }
      )
      setCurrentPassword(newPassword.trim())
      setNewPassword("")
      setConfirmPassword("")
      loadDetails()
      onUpdated()
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleForceLogoutAll = async () => {
    if (!confirm(`Are you sure you want to log out all devices for ${user.name}?`)) return
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_all" }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`All active sessions terminated for ${user.name}`)
        loadDetails()
        onUpdated()
      } else {
        toast.error(data.error || "Failed to terminate sessions")
      }
    } catch {
      toast.error("Failed to execute force logout")
    }
  }

  const handleRevokeSid = async (sid: string) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_sid", sid }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Selected session logged out")
        loadDetails()
        onUpdated()
      } else {
        toast.error(data.error || "Failed to log out session")
      }
    } catch {
      toast.error("Failed to revoke session")
    }
  }

  const handleRemoveDevice = async (deviceId: string) => {
    if (!confirm("Remove this registered device? This frees up 1 device slot for the user.")) return
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(user.id)}/devices/${encodeURIComponent(deviceId)}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (data.success) {
        toast.success("Device removed and slot freed")
        loadDetails()
        onUpdated()
      } else {
        toast.error(data.error || "Failed to remove device")
      }
    } catch {
      toast.error("Failed to delete device")
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden border shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-50 via-indigo-50 to-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 leading-tight">
                Security &amp; Device Control
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium">
                {user.name} ({user.email}) • ID: {user.employeeId}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b bg-gray-50/80 px-6 gap-2">
          <button
            onClick={() => setActiveTab("password")}
            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors ${
              activeTab === "password"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Reset Password
          </button>
          <button
            onClick={() => setActiveTab("devices")}
            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors ${
              activeTab === "devices"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Registered Devices ({devices.length}{user.role === "super_admin" ? " - Unlimited" : "/2"})
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors ${
              activeTab === "sessions"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Laptop className="h-3.5 w-3.5" />
            Active Sessions ({sessions.filter((s) => s.isActive).length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Real-Time Session Invalidation</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Updating the password will immediately invalidate all active sessions for this account. The employee will receive an instant notification on their screen and will be given a 20-second window before being redirected to the login page.
                  </p>
                </div>
              </div>

              {/* Current Password Card - Super Admin Access */}
              {isSuperAdmin && (
                <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-semibold text-gray-900">Current Password</span>
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
                        Super Admin Access
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-800 hover:bg-purple-100/70 px-2.5 py-1 rounded-md transition-colors"
                    >
                      {copiedPassword ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      readOnly
                      value={currentPassword || ""}
                      placeholder={isLoadingDetails ? "Loading password…" : "No password set"}
                      className="h-10 w-full rounded-xl border border-purple-100 bg-white px-3.5 pr-10 text-sm font-medium tracking-wide text-gray-800 shadow-2xs focus:outline-hidden select-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-800 transition-colors p-1"
                      title={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Change / Reset Password
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password (min. 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 rounded-lg text-sm pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 rounded-lg text-sm pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} className="h-9 rounded-lg">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 shadow-sm"
                >
                  {isUpdatingPassword ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  {isUpdatingPassword ? "Updating…" : "Update Password & Invalidate Sessions"}
                </Button>
              </div>
            </form>
          )}

          {activeTab === "devices" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border">
                <span>
                  {user.role === "super_admin" ? (
                    <>Registered: <strong>{devices.length} devices</strong></>
                  ) : (
                    <>Registered: <strong>{devices.length} of 2 max devices</strong></>
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {user.role === "super_admin" ? (
                    "(Super Admin has unlimited device access)"
                  ) : (
                    "(Users cannot log in from a 3rd device unless one is removed)"
                  )}
                </span>
              </div>

              {isLoadingDetails ? (
                <div className="py-8 text-center text-xs text-gray-500">Loading devices…</div>
              ) : devices.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  No registered devices found for this user.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {devices.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border bg-white shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{d.deviceName || "Device"}</p>
                          <p className="text-[11px] text-gray-500 font-mono">
                            {d.platform} • {d.browser} • IP: {d.ipAddress || "N/A"}
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium">
                            Last Active: {formatISTDateTime(d.lastUsedAt)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveDevice(d.deviceId)}
                        className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1 rounded-lg"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "sessions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  Active Concurrency: <strong>Only 1 active device allowed simultaneously (Hotstar model)</strong>
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleForceLogoutAll}
                  className="h-8 text-xs gap-1.5 rounded-lg shadow-xs"
                >
                  <LogOut className="h-3.5 w-3.5" /> Force Logout All Devices
                </Button>
              </div>

              {isLoadingDetails ? (
                <div className="py-8 text-center text-xs text-gray-500">Loading sessions…</div>
              ) : sessions.filter((s) => s.isActive).length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">No active session records found.</div>
              ) : (
                <div className="space-y-2.5">
                  {sessions
                    .filter((s) => s.isActive)
                    .map((s) => (
                    <div
                      key={s.sid}
                      className="flex items-center justify-between p-3.5 rounded-xl border bg-white border-emerald-200 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <Laptop className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-gray-900">{s.deviceName || "Session"}</p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-2.5 w-2.5" /> ACTIVE NOW
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 font-mono">
                            IP: {s.ipAddress || "N/A"} • Platform: {s.platform || "Web"}
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium">
                            Heartbeat: {formatISTDateTime(s.lastHeartbeat)}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeSid(s.sid)}
                        className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1 rounded-lg"
                      >
                        <LogOut className="h-3 w-3" /> Log out
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── User Form ────────────────────────────────────────────────────────────────

// ─── Permission Schema & Definitions ──────────────────────────────────────────

// ─── 45 Page Permission Modules & Actions Configuration ───────────────────────────

export interface PagePermissionModule {
  key: string
  label: string
  category: string
  actions: string[]
  description: string
}

export const PAGE_PERMISSIONS_MODULES: PagePermissionModule[] = [
  // 1. Core Workspace
  {
    key: "dashboard",
    label: "Dashboard",
    category: "Core Workspace",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Analytics, summaries & system overview",
  },
  {
    key: "leads",
    label: "Leads",
    category: "Core Workspace",
    actions: ["view", "edit", "delete", "manage", "create", "assign"],
    description: "Lead pipelines, qualifications & agent allocations",
  },
  {
    key: "employee",
    label: "Employee Directory",
    category: "Core Workspace",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Employee registry & personnel records",
  },
  {
    key: "users",
    label: "User Management",
    category: "Core Workspace",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Personnel directory, credentials & role access",
  },

  // 2. Sales & Calling Management
  {
    key: "calls",
    label: "Calls",
    category: "Sales & Call Management",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Calling operations & logs",
  },
  {
    key: "calls_report",
    label: "Calls Report",
    category: "Sales & Call Management",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Call history logs & recording statistics",
  },
  {
    key: "sales_report",
    label: "Sales Report",
    category: "Sales & Call Management",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Revenue statistics & sales conversion data",
  },
  {
    key: "performance",
    label: "Performance",
    category: "Sales & Call Management",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Agent KPI & conversion performance",
  },
  {
    key: "riya_sharma",
    label: "Riya Sharma Portal",
    category: "Sales & Call Management",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Agent dedicated conversion tracking",
  },
  {
    key: "sales_call_audit",
    label: "Sales Call Audit",
    category: "Sales & Call Management",
    actions: ["view", "viewSelf", "viewAll", "write"],
    description: "QA scorecard evaluation, team reports & HR verification",
  },

  // 3. FMS & Booking Systems
  {
    key: "bookings",
    label: "Bookings",
    category: "FMS & Booking Systems",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Reservation & booking lifecycle",
  },
  {
    key: "fms",
    label: "FMS Systems Hub",
    category: "FMS & Booking Systems",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "File Management Systems directory",
  },
  {
    key: "team",
    label: "KTAHV Booking FMS",
    category: "FMS & Booking Systems",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Manage KTAHV team bookings & confirmations",
  },
  {
    key: "villa_raag",
    label: "Villa Raag FMS",
    category: "FMS & Booking Systems",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Manage Villa Raag resort reservations",
  },
  {
    key: "guests",
    label: "Guests Directory",
    category: "FMS & Booking Systems",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Guest records & booking history",
  },
  {
    key: "new-order-fms",
    label: "New Order FMS",
    category: "FMS & Booking Systems",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Product order lifecycle & dispatch",
  },
  {
    key: "crr_fms",
    label: "KTAHV CRR Calling FMS",
    category: "FMS & Booking Systems",
    actions: [
      "view",
      "stage1",
      "stage2",
      "stage3",
      "stage4",
      "stage5",
      "stage6",
      "stage7",
      "stage8",
      "Executive",
      "Senior",
      "stage9",
      "stage10",
      "stage11",
    ],
    description: "CRR guest follow-up & multi-stage retention FMS",
  },
  {
    key: "cold_enquiry_reverification",
    label: "Cold Enquiry Reverification",
    category: "FMS & Booking Systems",
    actions: [
      "view",
      "stage1",
      "stage2",
      "stage3",
      "stage4",
      "stage5",
      "stage6",
      "stage7",
      "stage8",
      "Executive",
      "Senior",
      "stage9",
      "stage10",
      "stage11",
    ],
    description: "Reverify cold customer leads across stages",
  },

  // 4. DialShree & AI Voice
  {
    key: "dialshree_menu.view",
    label: "DialShree Calling Menu",
    category: "AI Voice & DialShree",
    actions: [
      "view",
      "stage1",
      "stage2",
      "stage3",
      "stage4",
      "stage5",
      "stage6",
      "stage7",
      "stage8",
      "Executive",
      "Senior",
      "stage9",
      "stage10",
      "stage11",
    ],
    description: "DialShree calling stages & campaign menu",
  },
  {
    key: "dialshree_received.view",
    label: "DialShree Received Leads",
    category: "AI Voice & DialShree",
    actions: [
      "view",
      "stage1",
      "stage2",
      "stage3",
      "stage4",
      "stage5",
      "stage6",
      "stage7",
      "stage8",
      "Executive",
      "Senior",
      "stage9",
      "stage10",
      "stage11",
    ],
    description: "Inbound DialShree received leads & stages",
  },
  {
    key: "dialshree_sent.view",
    label: "DialShree Sent Leads",
    category: "AI Voice & DialShree",
    actions: [
      "view",
      "stage1",
      "stage2",
      "stage3",
      "stage4",
      "stage5",
      "stage6",
      "stage7",
      "stage8",
      "Executive",
      "Senior",
      "stage9",
      "stage10",
      "stage11",
    ],
    description: "Outbound DialShree campaign stages",
  },
  {
    key: "ai_voice_menu",
    label: "AI Voice Menu",
    category: "AI Voice & DialShree",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "AI automated voice calling workflow",
  },
  {
    key: "ai_voice_sent",
    label: "AI Voice Sent Calls",
    category: "AI Voice & DialShree",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Outbound AI robotic calling logs",
  },
  {
    key: "ai_voice_received",
    label: "AI Voice Received Calls",
    category: "AI Voice & DialShree",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Inbound AI callback records",
  },
  {
    key: "ai_voice_summary",
    label: "AI Voice Summary",
    category: "AI Voice & DialShree",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "AI calling analytics & qualification summaries",
  },

  // 5. Marketing & PPC Analytics
  {
    key: "marketing",
    label: "Marketing Hub",
    category: "Marketing & Analytics",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Marketing campaigns & overall analytics",
  },
  {
    key: "marketing_funnel",
    label: "Marketing Funnel",
    category: "Marketing & Analytics",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Lead stage funnel & drop-off metrics",
  },
  {
    key: "marketing_google_report",
    label: "Google PPC Reports",
    category: "Marketing & Analytics",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Google Ads campaign ROAS & expense analytics",
  },
  {
    key: "marketing_facebook_report",
    label: "Facebook PPC Reports",
    category: "Marketing & Analytics",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Meta/Facebook ad performance tracking",
  },
  {
    key: "google_adword_report",
    label: "Google Adwords Reports",
    category: "Marketing & Analytics",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Adwords spend & source attribution",
  },

  // 6. Financials & Partner Networks
  {
    key: "payments",
    label: "Payments",
    category: "Financials & Accounts",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Payment transactions & finance ledger",
  },
  {
    key: "invoices",
    label: "Invoices",
    category: "Financials & Accounts",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Invoices, billing & receipts",
  },
  {
    key: "accounts_tracker",
    label: "KTAHV Accounts Tracker",
    category: "Financials & Accounts",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Booking revenue, bank reconciliation & receipts",
  },
  {
    key: "partners",
    label: "Partners Directory",
    category: "Financials & Accounts",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Corporate & doctor referral partner directory",
  },

  // 7. Medical & Consultations
  {
    key: "consultations",
    label: "Consultations",
    category: "Medical & Consultations",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Doctor consultations & clinical case sheets",
  },
  {
    key: "prescriptions",
    label: "Prescriptions",
    category: "Medical & Consultations",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Ayurvedic medicines & prescriptions",
  },
  {
    key: "doctor_portal",
    label: "Doctor Portal",
    category: "Medical & Consultations",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Doctor consultation CMS & patient appointments",
  },

  // 8. Portals, Support & Operations
  {
    key: "portal_hub",
    label: "Unified Portal Hub",
    category: "Portals & Operations",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Access external portal launcher & shortcuts",
  },
  {
    key: "sales_target_portal",
    label: "Sales Target Portal",
    category: "Portals & Operations",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Sales target portal integration & quotas",
  },
  {
    key: "call_recording_portal",
    label: "Call Recording Portal",
    category: "Portals & Operations",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "IVR audio call recording player & archives",
  },
  {
    key: "partner_onboard_form",
    label: "Partner Onboard Form",
    category: "Portals & Operations",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "External partner onboarding intake form",
  },
  {
    key: "meetings",
    label: "Meetings Hub",
    category: "Portals & Operations",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Team meeting logs & minutes",
  },
  {
    key: "helpdesk",
    label: "Helpdesk",
    category: "Portals & Operations",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Internal support ticketing & issue tracking",
  },
  {
    key: "escalations",
    label: "Escalations",
    category: "Portals & Operations",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "Customer service escalations & resolution",
  },
  {
    key: "reports",
    label: "Reports Hub",
    category: "Portals & Operations",
    actions: ["view", "edit", "delete", "manage", "create", "viewSelf", "viewAll"],
    description: "System reports repository & exports",
  },
]

export function buildPermissionKey(moduleKey: string, action: string): string {
  if (moduleKey.includes(".view")) {
    if (action === "view") return moduleKey
    return `${moduleKey}.${action}`
  }
  return `${moduleKey}.${action}`
}

export function isActionGranted(
  permissions: string[],
  moduleKey: string,
  action: string
): boolean {
  if (permissions.includes("all")) return true
  const key = buildPermissionKey(moduleKey, action)
  if (permissions.includes(key)) return true
  if (moduleKey.includes(".view")) {
    const base = moduleKey.split(".")[0]
    if (permissions.includes(`${base}.${action}`)) return true
  }
  return false
}

// ─── Super Admin Dynamic Page Permission & Dropdown Manager Modal ─────────────

interface ManagePagePermissionsModalProps {
  open: boolean
  onClose: () => void
  modules: PagePermissionModule[]
  onModulesUpdated: (updated: PagePermissionModule[]) => void
}

function ManagePagePermissionsModal({
  open,
  onClose,
  modules,
  onModulesUpdated,
}: ManagePagePermissionsModalProps) {
  const [tab, setTab] = useState<"add_action" | "add_page">("add_action")
  // Tab 1: Add action to existing page
  const [targetModuleKey, setTargetModuleKey] = useState<string>(modules[0]?.key || "dashboard")
  const [newActionName, setNewActionName] = useState("")

  // Tab 2: Add new page permission module
  const [newPageLabel, setNewPageLabel] = useState("")
  const [newPageKey, setNewPageKey] = useState("")
  const [newPageCategory, setNewPageCategory] = useState("Custom Modules")
  const [newPageDesc, setNewPageDesc] = useState("")
  const [newPageActions, setNewPageActions] = useState("view, edit, delete, create")

  const [saving, setSaving] = useState(false)

  if (!open) return null

  const selectedTargetModule = modules.find(m => m.key === targetModuleKey)

  // 1. Add action to existing page
  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanAction = newActionName.trim().replace(/\s+/g, "_")
    if (!cleanAction) {
      toast.error("Please enter an action name (e.g. export, approve, refund, stage12)")
      return
    }
    if (!selectedTargetModule) return

    if (selectedTargetModule.actions.includes(cleanAction)) {
      toast.error(`Action '${cleanAction}' already exists in ${selectedTargetModule.label}`)
      return
    }

    const updatedActions = [...selectedTargetModule.actions, cleanAction]
    const updatedModule: PagePermissionModule = {
      ...selectedTargetModule,
      actions: updatedActions,
    }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/page-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedModule),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Action '${cleanAction}' added to ${selectedTargetModule.label}!`)
        setNewActionName("")
        const updatedList = modules.map(m => m.key === targetModuleKey ? updatedModule : m)
        onModulesUpdated(updatedList)
      } else {
        toast.error(data.error || "Failed to save action to database")
      }
    } catch {
      toast.error("Network error while saving action")
    } finally {
      setSaving(false)
    }
  }

  // 2. Remove action from existing module
  const handleRemoveAction = async (mod: PagePermissionModule, actionToRemove: string) => {
    if (mod.actions.length <= 1) {
      toast.error("Each module must retain at least 1 action (e.g. view)")
      return
    }
    if (!confirm(`Remove action '${actionToRemove}' from ${mod.label}?`)) return

    const updatedActions = mod.actions.filter(a => a !== actionToRemove)
    const updatedModule: PagePermissionModule = { ...mod, actions: updatedActions }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/page-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedModule),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Action '${actionToRemove}' removed from ${mod.label}`)
        const updatedList = modules.map(m => m.key === mod.key ? updatedModule : m)
        onModulesUpdated(updatedList)
      } else {
        toast.error(data.error || "Failed to update module")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  // 3. Create brand new page module
  const handleCreateNewPage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPageLabel.trim() || !newPageKey.trim()) {
      toast.error("Please provide both a Page Title and Module Key")
      return
    }
    const cleanKey = newPageKey.trim().toLowerCase().replace(/[^a-z0-9_\-\.]/g, "_")
    if (modules.some(m => m.key === cleanKey)) {
      toast.error(`A page with key '${cleanKey}' already exists!`)
      return
    }

    const actionsList = newPageActions
      .split(",")
      .map(a => a.trim().replace(/\s+/g, "_"))
      .filter(Boolean)

    if (!actionsList.includes("view")) {
      actionsList.unshift("view")
    }

    const newMod: PagePermissionModule = {
      key: cleanKey,
      label: newPageLabel.trim(),
      category: newPageCategory.trim() || "Custom Modules",
      description: newPageDesc.trim() || `${newPageLabel.trim()} page & feature control`,
      actions: actionsList,
    }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/page-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newMod, isCustom: true }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`New page '${newMod.label}' created with ${actionsList.length} actions!`)
        setNewPageLabel("")
        setNewPageKey("")
        setNewPageDesc("")
        setNewPageActions("view, edit, delete, create")
        const updatedList = [...modules, newMod]
        onModulesUpdated(updatedList)
        setTargetModuleKey(newMod.key)
        setTab("add_action")
      } else {
        toast.error(data.error || "Failed to create new page")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  // 4. Delete custom page module
  const handleDeleteCustomPage = async (mod: PagePermissionModule) => {
    if (!confirm(`Delete custom page permission '${mod.label}' (${mod.key})? This cannot be undone.`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/page-permissions?key=${encodeURIComponent(mod.key)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Page '${mod.label}' removed`)
        const updatedList = modules.filter(m => m.key !== mod.key)
        onModulesUpdated(updatedList)
        if (targetModuleKey === mod.key) {
          setTargetModuleKey(updatedList[0]?.key || "dashboard")
        }
      } else {
        toast.error(data.error || "Failed to delete page")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Manage Page Modules &amp; Dropdown Actions</h3>
              <p className="text-xs text-purple-100 mt-0.5">
                Add granular actions to existing pages or register brand new CRM page permissions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 pt-3">
          <button
            type="button"
            onClick={() => setTab("add_action")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              tab === "add_action"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            1. Add / Edit Actions in Existing Page
          </button>
          <button
            type="button"
            onClick={() => setTab("add_page")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              tab === "add_page"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            2. + Register New Page Module
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
          {tab === "add_action" && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Target Page Module
                </Label>
                <div className="mt-1.5">
                  <Select value={targetModuleKey} onValueChange={setTargetModuleKey}>
                    <SelectTrigger className="h-10 text-xs bg-white border-slate-300 rounded-xl">
                      <SelectValue placeholder="Select a page to modify..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[260px]">
                      {modules.map(m => (
                        <SelectItem key={m.key} value={m.key}>
                          {m.label} ({m.key}) — {m.actions.length} actions
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedTargetModule && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{selectedTargetModule.label}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">{selectedTargetModule.key} • {selectedTargetModule.category}</p>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      {selectedTargetModule.actions.length} Actions in Dropdown
                    </span>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">Current Dropdown Values:</Label>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      {selectedTargetModule.actions.map(action => (
                        <span
                          key={action}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-800 shadow-2xs"
                        >
                          <span>{action}</span>
                          <button
                            type="button"
                            title="Remove this action"
                            onClick={() => handleRemoveAction(selectedTargetModule, action)}
                            className="text-slate-400 hover:text-rose-600 font-bold ml-0.5 text-[11px]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Add action form */}
                  <form onSubmit={handleAddAction} className="pt-2 border-t border-slate-200/80 flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Type new action name (e.g. export, refund, approve, stage12)..."
                        value={newActionName}
                        onChange={e => setNewActionName(e.target.value)}
                        className="h-9 text-xs rounded-lg border-slate-300 bg-white"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={saving || !newActionName.trim()}
                      className="h-9 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                    >
                      {saving ? "Saving..." : "+ Add Action Value"}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}

          {tab === "add_page" && (
            <form onSubmit={handleCreateNewPage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Page / Module Title *
                  </Label>
                  <Input
                    placeholder="e.g. Inventory Management"
                    value={newPageLabel}
                    onChange={e => {
                      setNewPageLabel(e.target.value)
                      if (!newPageKey || newPageKey === newPageLabel.toLowerCase().replace(/[^a-z0-9]/g, "_")) {
                        setNewPageKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"))
                      }
                    }}
                    className="h-9 text-xs rounded-xl border-slate-300 mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Module Key (Database Identifier) *
                  </Label>
                  <Input
                    placeholder="e.g. inventory_management"
                    value={newPageKey}
                    onChange={e => setNewPageKey(e.target.value.toLowerCase().replace(/[^a-z0-9_\-\.]/g, "_"))}
                    className="h-9 text-xs rounded-xl border-slate-300 font-mono mt-1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Category *
                  </Label>
                  <Input
                    placeholder="e.g. Operations & Supply, Custom Modules"
                    value={newPageCategory}
                    onChange={e => setNewPageCategory(e.target.value)}
                    className="h-9 text-xs rounded-xl border-slate-300 mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Short Description
                  </Label>
                  <Input
                    placeholder="e.g. Warehouse stock & medicine supplies"
                    value={newPageDesc}
                    onChange={e => setNewPageDesc(e.target.value)}
                    className="h-9 text-xs rounded-xl border-slate-300 mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Initial Allowed Actions (Comma-Separated) *
                </Label>
                <Input
                  placeholder="view, edit, delete, create, manage, export"
                  value={newPageActions}
                  onChange={e => setNewPageActions(e.target.value)}
                  className="h-9 text-xs rounded-xl border-slate-300 mt-1"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  &apos;view&apos; will automatically be included if omitted.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="submit"
                  disabled={saving || !newPageLabel.trim() || !newPageKey.trim()}
                  className="h-9 px-6 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-md"
                >
                  {saving ? "Creating..." : "Create Page Permission"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Total Available Modules: <strong>{modules.length}</strong>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8.5 px-4 text-xs font-semibold rounded-lg"
          >
            Close
          </Button>
        </div>

      </div>
    </div>
  )
}

// Backward-compatible PERMISSION_GROUPS export
export const PERMISSION_GROUPS: {
  category: string
  description: string
  permissions: { key: string; label: string; description: string }[]
}[] = (() => {
  const catMap = new Map<string, { category: string; description: string; permissions: any[] }>()
  for (const m of PAGE_PERMISSIONS_MODULES) {
    if (!catMap.has(m.category)) {
      catMap.set(m.category, { category: m.category, description: m.description, permissions: [] })
    }
    const cat = catMap.get(m.category)!
    for (const a of m.actions) {
      cat.permissions.push({
        key: buildPermissionKey(m.key, a),
        label: `${m.label} — ${a}`,
        description: `${a} action on ${m.label}`,
      })
    }
  }
  return Array.from(catMap.values())
})()

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["all"],
  admin: [
    "dashboard.view",
    "users.view", "users.create", "users.edit", "users.delete",
    "leads.view", "leads.edit", "leads.assign",
    "calls_report.view", "sales_report.view", "sales_calling.view",
    "marketing.view", "marketing_funnel.view", "marketing_google_report.view", "marketing_facebook_report.view", "google_adword_report.view",
    "fms.view", "team.view", "villa_raag.view", "ktahv_booking_form.view", "crr_fms.view", "task_fms.view", "cold_enquiry_reverification.view", "new-order-fms.view", "mr-fms.view",
    "deal_assistant.view", "ai_voice_menu.view", "dialshree_menu.view", "dialshree_received.view", "dialshree_sent.view", "accounts_tracker.view", "partners.view", "meetings.view", "portal_hub.view", "sales_target_portal.view", "call_recording_portal.view", "doctor_portal.view", "partner_onboard_form.view"
  ],
  sales_manager: [
    "dashboard.view", "leads.view", "leads.edit", "leads.assign", "calls_report.view", "sales_report.view", "sales_calling.view", "riya_sharma.view", "marketing.view", "fms.view", "team.view", "villa_raag.view", "ktahv_booking_form.view", "crr_fms.view", "deal_assistant.view", "portal_hub.view", "sales_target_portal.view", "call_recording_portal.view", "meetings.view"
  ],
  sales_agent: [
    "dashboard.view", "leads.view", "leads.edit", "calls_report.view", "sales_calling.view", "fms.view", "team.view", "villa_raag.view", "ktahv_booking_form.view", "deal_assistant.view", "sales_target_portal.view"
  ],
  operation_manager: [
    "dashboard.view", "fms.view", "team.view", "villa_raag.view", "ktahv_booking_form.view", "crr_fms.view", "task_fms.view", "cold_enquiry_reverification.view", "new-order-fms.view", "mr-fms.view", "accounts_tracker.view", "meetings.view"
  ],
  operation_staff: [
    "dashboard.view", "fms.view", "team.view", "ktahv_booking_form.view", "crr_fms.view", "task_fms.view", "cold_enquiry_reverification.view", "new-order-fms.view"
  ],
  account_manager: [
    "dashboard.view", "accounts_tracker.view", "payments.view", "sales_report.view", "fms.view", "team.view", "villa_raag.view", "portal_hub.view"
  ],
  doctor: [
    "dashboard.view", "doctor_portal.view", "meetings.view", "portal_hub.view"
  ],
}

// ─── Executive Employee Profile & Permissions Modal (Exact CRM Design Pattern) ─

interface EmployeeProfileModalProps {
  user?: User
  open: boolean
  onClose: () => void
  onSubmit: (userData: Omit<User, "id">) => Promise<void> | void
}

function EmployeeProfileModal({ user, open, onClose, onSubmit }: EmployeeProfileModalProps) {
  const { user: currentUser } = useAuth()
  const [formData, setFormData] = useState({
    name:       user?.name       || "",
    email:      user?.email      || "",
    role:       user?.role       || ("sales_agent" as UserRole),
    department: user?.department || ("Sales" as Department),
    company:    user?.company    || "KAPPL",
    employeeId: user?.employeeId || "",
    phone:      user?.phone      || "",
    isActive:   user?.isActive   ?? true,
    shift:      user?.shift      || ("morning" as "morning" | "evening" | "night"),
  })

  const [pageModules, setPageModules] = useState<PagePermissionModule[]>(PAGE_PERMISSIONS_MODULES)
  const [isManagePermsOpen, setIsManagePermsOpen] = useState(false)

  // Load custom modules and action overrides from database
  useEffect(() => {
    if (open) {
      fetch("/api/admin/page-permissions")
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.modules) && data.modules.length > 0) {
            setPageModules(() => {
              const map = new Map(PAGE_PERMISSIONS_MODULES.map(m => [m.key, { ...m, actions: [...m.actions] }]))
              for (const custom of data.modules) {
                if (map.has(custom.key)) {
                  const existing = map.get(custom.key)!
                  map.set(custom.key, {
                    ...existing,
                    label: custom.label || existing.label,
                    category: custom.category || existing.category,
                    description: custom.description || existing.description,
                    actions: Array.from(new Set([...existing.actions, ...(custom.actions || [])])),
                  })
                } else {
                  map.set(custom.key, {
                    key: custom.key,
                    label: custom.label || custom.key,
                    category: custom.category || "Custom Modules",
                    description: custom.description || "",
                    actions: Array.isArray(custom.actions) && custom.actions.length > 0 ? custom.actions : ["view"],
                  })
                }
              }
              return Array.from(map.values())
            })
          }
        })
        .catch(err => {
          console.error("Failed to load custom page permissions:", err)
        })
    }
  }, [open])

  const [permissions, setPermissions] = useState<string[]>(() => {
    if (user?.permissions && user.permissions.length > 0) return user.permissions
    return ROLE_DEFAULT_PERMISSIONS[user?.role || "sales_agent"] || []
  })
  const [permissionSearch, setPermissionSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedPageDropdown, setSelectedPageDropdown] = useState<string>("all")
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset/sync form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        name:       user?.name       || "",
        email:      user?.email      || "",
        role:       user?.role       || ("sales_agent" as UserRole),
        department: user?.department || ("Sales" as Department),
        company:    user?.company    || "KAPPL",
        employeeId: user?.employeeId || "",
        phone:      user?.phone      || "",
        isActive:   user?.isActive   ?? true,
        shift:      user?.shift      || ("morning" as "morning" | "evening" | "night"),
      })
      setPermissions(
        user?.permissions && user.permissions.length > 0
          ? user.permissions
          : ROLE_DEFAULT_PERMISSIONS[user?.role || "sales_agent"] || []
      )
      setPermissionSearch("")
      setSelectedCategory("all")
      setSelectedPageDropdown("all")
      setOpenDropdown(null)
    }
  }, [open, user?.id])

  if (!open) return null

  const handleRoleChange = (newRole: UserRole) => {
    setFormData(p => ({ ...p, role: newRole }))
    const defaults = ROLE_DEFAULT_PERMISSIONS[newRole] || []
    setPermissions(defaults)
  }

  const togglePermission = (permKey: string) => {
    setPermissions(prev => {
      if (permKey === "all") {
        return prev.includes("all") ? [] : ["all"]
      }
      const withoutAll = prev.filter(p => p !== "all")
      if (withoutAll.includes(permKey)) {
        return withoutAll.filter(p => p !== permKey)
      } else {
        return [...withoutAll, permKey]
      }
    })
  }

  // Toggle single action for a module
  const toggleModuleAction = (moduleKey: string, action: string) => {
    const key = buildPermissionKey(moduleKey, action)
    setPermissions(prev => {
      const isCurrentlyGranted = isActionGranted(prev, moduleKey, action)
      const withoutAll = prev.filter(p => p !== "all")
      if (isCurrentlyGranted) {
        return withoutAll.filter(p => p !== key && !(moduleKey.includes(".view") && p === `${moduleKey.split(".")[0]}.${action}`))
      } else {
        return [...withoutAll, key]
      }
    })
  }

  // Toggle or set all actions for a specific module
  const setAllActionsForModule = (module: PagePermissionModule, grant: boolean) => {
    const keys = module.actions.map(a => buildPermissionKey(module.key, a))
    setPermissions(prev => {
      const withoutAll = prev.filter(p => p !== "all")
      if (grant) {
        return Array.from(new Set([...withoutAll, ...keys]))
      } else {
        return withoutAll.filter(p => !keys.includes(p) && !(module.key.includes(".view") && p.startsWith(module.key.split(".")[0])))
      }
    })
  }

  const grantViewOnlyForModule = (module: PagePermissionModule) => {
    const viewKey = buildPermissionKey(module.key, "view")
    const otherKeys = module.actions.filter(a => a !== "view").map(a => buildPermissionKey(module.key, a))
    setPermissions(prev => {
      const withoutAll = prev.filter(p => p !== "all")
      const cleaned = withoutAll.filter(p => !otherKeys.includes(p))
      return Array.from(new Set([...cleaned, viewKey]))
    })
  }

  const toggleCategory = (catPerms: { key: string }[]) => {
    const keys = catPerms.map(p => p.key)
    const allSelected = keys.every(k => permissions.includes(k) || permissions.includes("all"))
    setPermissions(prev => {
      const withoutAll = prev.filter(p => p !== "all")
      if (allSelected) {
        return withoutAll.filter(p => !keys.includes(p))
      } else {
        return Array.from(new Set([...withoutAll, ...keys]))
      }
    })
  }

  const selectAllPermissions = () => {
    const allKeys = pageModules.flatMap(m => m.actions.map(a => buildPermissionKey(m.key, a)))
    setPermissions(allKeys)
  }

  const selectViewOnlyAll = () => {
    const viewKeys = pageModules.map(m => buildPermissionKey(m.key, "view"))
    setPermissions(viewKeys)
  }

  const clearAllPermissions = () => {
    setPermissions([])
  }

  const resetToRoleDefaults = () => {
    const defaults = ROLE_DEFAULT_PERMISSIONS[formData.role] || []
    setPermissions(defaults)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.employeeId.trim()) {
      toast.error("Please fill in all required fields marked with *")
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        permissions,
        joinDate: user?.joinDate || new Date().toISOString().split("T")[0],
      })
    } finally {
      setSubmitting(false)
    }
  }

  const F = "h-11 rounded-xl text-xs bg-slate-50/70 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 font-medium"
  const L = "text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1"

  // Filter modules according to selected category, page dropdown, and search text
  const filteredModules = useMemo(() => {
    return pageModules.filter(m => {
      // Category filter
      if (selectedCategory !== "all" && m.category !== selectedCategory) {
        return false
      }
      // Direct page dropdown filter
      if (selectedPageDropdown !== "all" && m.key !== selectedPageDropdown) {
        return false
      }
      // Search filter
      if (permissionSearch.trim()) {
        const query = permissionSearch.toLowerCase()
        const matchesLabel = m.label.toLowerCase().includes(query)
        const matchesKey = m.key.toLowerCase().includes(query)
        const matchesDesc = m.description.toLowerCase().includes(query)
        const matchesCategory = m.category.toLowerCase().includes(query)
        const matchesActions = m.actions.some(a => a.toLowerCase().includes(query))
        return matchesLabel || matchesKey || matchesDesc || matchesCategory || matchesActions
      }
      return true
    })
  }, [pageModules, selectedCategory, selectedPageDropdown, permissionSearch])

  // Unique categories for filtering
  const allCategories = useMemo(() => {
    return Array.from(new Set(pageModules.map(m => m.category)))
  }, [pageModules])

  const totalPossiblePermissions = useMemo(() => {
    return pageModules.reduce((acc, m) => acc + m.actions.length, 0)
  }, [pageModules])

  const activePermissionsCount = useMemo(() => {
    if (permissions.includes("all")) return totalPossiblePermissions
    let count = 0
    for (const m of pageModules) {
      for (const a of m.actions) {
        if (isActionGranted(permissions, m.key, a)) count++
      }
    }
    return count
  }, [permissions, totalPossiblePermissions, pageModules])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 md:p-6 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex max-h-[94vh] w-full max-w-5xl xl:max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        
        {/* ── Top Header (Exact Executive Verifier Theme) ── */}
        <div className="relative flex items-start justify-between bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-5 shrink-0 rounded-t-2xl">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white font-bold text-lg shadow-inner shrink-0">
              {user ? "✓" : "👤"}
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {user ? "Executive Employee Profile & Access Control" : "Executive New Employee Registration"}
              </h2>
              <p className="text-xs text-indigo-100 mt-0.5">
                {user
                  ? `Update employee credentials, divisional allocation & module permissions`
                  : "Complete all fields below to configure employee credentials and permissions"}
              </p>

              {/* Informative Header Tags matching Executive Verifier */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-indigo-50 ring-1 ring-inset ring-white/20">
                  <span className="font-semibold text-white">Employee ID</span>
                  <span className="text-indigo-100 font-mono font-bold">{formData.employeeId || "NEW"}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-indigo-50 ring-1 ring-inset ring-white/20">
                  <span className="font-semibold text-white">Name</span>
                  <span className="text-indigo-100">{formData.name || "—"}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-indigo-50 ring-1 ring-inset ring-white/20">
                  <span className="font-semibold text-white">Division</span>
                  <span className="text-indigo-100">{formData.company}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-indigo-50 ring-1 ring-inset ring-white/20">
                  <span className="font-semibold text-white">Role Authority</span>
                  <span className="text-indigo-100">{formData.role.replace(/_/g, " ").toUpperCase()}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-indigo-50 ring-1 ring-inset ring-white/20">
                  <span className="font-semibold text-white">Status</span>
                  <span className={formData.isActive ? "text-emerald-300 font-bold" : "text-rose-300 font-bold"}>
                    {formData.isActive ? "● Active" : "● Inactive"}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 text-sm font-bold shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Modal Form Body ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            {/* ROW 1: 4-Columns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className={L}>
                  Full Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Rahul Sharma"
                  className={F}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className={L}>
                  Official Email <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. name@kairali.com"
                  className={F}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className={L}>
                  Employee ID <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={formData.employeeId}
                  onChange={e => setFormData(p => ({ ...p, employeeId: e.target.value }))}
                  placeholder="EMP-1042"
                  className={`${F} font-mono font-bold text-slate-900`}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className={L}>Phone Number</Label>
                <Input
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className={F}
                />
              </div>
            </div>

            {/* ROW 2: 5-Columns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <Label className={L}>
                  Division / Company <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formData.company}
                  onValueChange={(v: string) => setFormData(p => ({ ...p, company: v as any }))}
                >
                  <SelectTrigger className={F}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KAPPL">KAPPL</SelectItem>
                    <SelectItem value="KTAHV">KTAHV</SelectItem>
                    <SelectItem value="VILLARAAG">Villa Raag (VILLARAAG)</SelectItem>
                    <SelectItem value="COMMON">Common (COMMON)</SelectItem>
                    <SelectItem value="KTAHV | KAPPL | VILLARAAG">All Divisions (KTAHV | KAPPL | VILLARAAG)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className={L}>
                  Department <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formData.department}
                  onValueChange={(v: Department) => setFormData(p => ({ ...p, department: v }))}
                >
                  <SelectTrigger className={F}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Medical">Medical</SelectItem>
                    <SelectItem value="Accounts">Accounts</SelectItem>
                    <SelectItem value="Management">Management</SelectItem>
                    <SelectItem value="MDO">MDO</SelectItem>
                    <SelectItem value="Administration">Administration</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Front Office">Front Office</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className={L}>
                  Role Authority <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(v: UserRole) => handleRoleChange(v)}
                >
                  <SelectTrigger className={F}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin (Full Authority)</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="sales_manager">Sales Manager</SelectItem>
                    <SelectItem value="sales_agent">Sales Agent</SelectItem>
                    <SelectItem value="operation_manager">Operations Manager</SelectItem>
                    <SelectItem value="operation_staff">Operations Staff</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="account_manager">Account Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className={L}>Work Shift</Label>
                <Select
                  value={formData.shift}
                  onValueChange={(v: "morning" | "evening" | "night") => setFormData(p => ({ ...p, shift: v }))}
                >
                  <SelectTrigger className={F}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning Shift</SelectItem>
                    <SelectItem value="evening">Evening Shift</SelectItem>
                    <SelectItem value="night">Night Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className={L}>Account Status <span className="text-rose-500">*</span></Label>
                <Select
                  value={formData.isActive ? "active" : "inactive"}
                  onValueChange={(v: string) => setFormData(p => ({ ...p, isActive: v === "active" }))}
                >
                  <SelectTrigger className={F}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-emerald-700 font-semibold">● Active Account</SelectItem>
                    <SelectItem value="inactive" className="text-rose-700 font-semibold">● Inactive Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SECTION 3: PAGE PERMISSIONS MATRIX */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              
              {/* Matrix Control Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Page &amp; Module Permissions
                      </h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
                        {permissions.includes("all") ? "Full Super Admin Access" : `${activePermissionsCount} of ${totalPossiblePermissions} Actions Granted`}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                        ({pageModules.length} Total Configurable Modules)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Configure granular action-level access or select full page suites using the dropdowns below
                    </p>
                  </div>
                </div>

                {/* Fast Action Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => togglePermission("all")}
                    className={`h-7 px-2.5 text-[10px] font-bold rounded-lg border transition-all ${
                      permissions.includes("all")
                        ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                        : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50"
                    }`}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {permissions.includes("all") ? "✓ All-Access Granted" : "Grant All (all)"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllPermissions}
                    className="h-7 px-2.5 text-[10px] font-medium bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectViewOnlyAll}
                    className="h-7 px-2.5 text-[10px] font-medium bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    View Only All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllPermissions}
                    className="h-7 px-2.5 text-[10px] font-medium bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetToRoleDefaults}
                    className="h-7 px-2.5 text-[10px] font-medium bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                  >
                    Reset Defaults
                  </Button>
                  {(currentUser?.role === "super_admin" || currentUser?.role === "admin" || !currentUser) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsManagePermsOpen(true)}
                      className="h-7 px-2.5 text-[10px] font-bold bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 flex items-center gap-1 shadow-2xs"
                      title="Add more dropdown values to existing pages or create new page permissions"
                    >
                      <Sparkles className="h-3 w-3 text-purple-600" />
                      + Manage Pages &amp; Actions
                    </Button>
                  )}
                </div>
              </div>

              {/* Filtering Controls Bar: Page Dropdown, Category Dropdown, Search Input */}
              <div className="p-3 bg-slate-50/80 border-b border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-2.5">
                {/* 1. Quick Select Page Dropdown */}
                <div className="md:col-span-4">
                  <Select value={selectedPageDropdown} onValueChange={setSelectedPageDropdown}>
                    <SelectTrigger className="h-8.5 text-xs bg-white border-slate-200 rounded-lg">
                      <SelectValue placeholder="Quick-jump to page module..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="all">All Pages ({pageModules.length} modules)</SelectItem>
                      {pageModules.map(m => (
                        <SelectItem key={m.key} value={m.key}>
                          {m.label} ({m.actions.length} actions)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Category Filter Dropdown */}
                <div className="md:col-span-3">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-8.5 text-xs bg-white border-slate-200 rounded-lg">
                      <SelectValue placeholder="Filter by category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories ({allCategories.length})</SelectItem>
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Search Box */}
                <div className="md:col-span-5 relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search by module name, key, action..."
                    value={permissionSearch}
                    onChange={e => setPermissionSearch(e.target.value)}
                    className="h-8.5 rounded-lg border-slate-200 bg-white pl-8.5 pr-8 text-xs placeholder:text-slate-400 focus:border-indigo-500"
                  />
                  {permissionSearch && (
                    <button
                      type="button"
                      onClick={() => setPermissionSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Module Cards List with Dropdowns */}
              <div className="p-3.5 space-y-2.5 max-h-[380px] overflow-y-auto">
                {filteredModules.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No matching modules found for the selected criteria.
                  </div>
                ) : (
                  filteredModules.map(mod => {
                    const grantedCount = mod.actions.filter(a => isActionGranted(permissions, mod.key, a)).length
                    const isAllGranted = permissions.includes("all") || grantedCount === mod.actions.length
                    const isNoneGranted = grantedCount === 0 && !permissions.includes("all")
                    const isDropdownOpen = openDropdown === mod.key

                    return (
                      <div
                        key={mod.key}
                        className={`rounded-xl border transition-all p-3 ${
                          isAllGranted
                            ? "bg-indigo-50/40 border-indigo-200 shadow-2xs"
                            : grantedCount > 0
                            ? "bg-blue-50/25 border-blue-200"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {/* Module Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                            <Checkbox
                              id={`mod-check-${mod.key}`}
                              checked={isAllGranted}
                              onCheckedChange={(checked) => setAllActionsForModule(mod, !!checked)}
                              className="mt-0.5 sm:mt-0 rounded border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <label
                                  htmlFor={`mod-check-${mod.key}`}
                                  className="text-xs font-bold text-slate-800 cursor-pointer hover:text-indigo-600 select-none"
                                >
                                  {mod.label}
                                </label>
                                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {mod.key}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  • {mod.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate max-w-lg mt-0.5">
                                {mod.description}
                              </p>
                            </div>
                          </div>

                          {/* Action Controls & Dropdown Trigger */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {/* Access Status Badge */}
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                isAllGranted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : grantedCount > 0
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              {permissions.includes("all")
                                ? `All ${mod.actions.length} Granted`
                                : grantedCount === mod.actions.length
                                ? `All ${mod.actions.length} Granted`
                                : grantedCount > 0
                                ? `${grantedCount} of ${mod.actions.length} Allowed`
                                : "No Access"}
                            </span>

                            {/* Relative Container for the Action Dropdown */}
                            <div className="relative">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setOpenDropdown(isDropdownOpen ? null : mod.key)}
                                className={`h-7 px-2 text-[11px] font-semibold rounded-lg flex items-center gap-1 border transition-all ${
                                  isDropdownOpen
                                    ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <span>Permissions ({grantedCount})</span>
                                <ChevronDown className={`h-3 w-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                              </Button>

                              {/* Interactive Dropdown Panel */}
                              {isDropdownOpen && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setOpenDropdown(null)}
                                  />
                                  <div className="absolute right-0 top-full mt-1.5 z-50 w-72 sm:w-80 rounded-xl border border-slate-200 bg-white shadow-xl p-3 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                      <div>
                                        <div className="text-xs font-bold text-slate-800">{mod.label}</div>
                                        <div className="text-[10px] text-slate-400">Manage granular permissions</div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => setAllActionsForModule(mod, true)}
                                          className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline px-1 py-0.5"
                                        >
                                          All
                                        </button>
                                        <span className="text-slate-300 text-xs">|</span>
                                        <button
                                          type="button"
                                          onClick={() => grantViewOnlyForModule(mod)}
                                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline px-1 py-0.5"
                                        >
                                          View
                                        </button>
                                        <span className="text-slate-300 text-xs">|</span>
                                        <button
                                          type="button"
                                          onClick={() => setAllActionsForModule(mod, false)}
                                          className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:underline px-1 py-0.5"
                                        >
                                          Clear
                                        </button>
                                      </div>
                                    </div>

                                    {/* Action Checkboxes List inside Dropdown */}
                                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                      {mod.actions.map(action => {
                                        const granted = isActionGranted(permissions, mod.key, action)
                                        const actKey = buildPermissionKey(mod.key, action)
                                        return (
                                          <div
                                            key={action}
                                            onClick={() => toggleModuleAction(mod.key, action)}
                                            className={`flex items-center justify-between p-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                                              granted
                                                ? "bg-indigo-50/70 border-indigo-200 text-indigo-950 font-medium"
                                                : "bg-slate-50/50 border-slate-150 text-slate-600 hover:bg-slate-100"
                                            }`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <Checkbox
                                                checked={granted}
                                                onCheckedChange={() => toggleModuleAction(mod.key, action)}
                                                className="rounded border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                              />
                                              <span className="capitalize">{action}</span>
                                            </div>
                                            <span className="font-mono text-[9px] text-slate-400">
                                              {actKey}
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inline Action Chips for Quick Visibility & 1-Click Toggling */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-2 mt-2 border-t border-slate-100">
                          {mod.actions.map(action => {
                            const granted = isActionGranted(permissions, mod.key, action)
                            return (
                              <button
                                key={action}
                                type="button"
                                onClick={() => toggleModuleAction(mod.key, action)}
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition-all ${
                                  granted
                                    ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                }`}
                              >
                                {granted ? "✓ " : "+ "}{action}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

            </div>
          </div>

          {/* ── Footer Bar (Exact Executive Verifier Pattern) ── */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 rounded-b-2xl -mx-6 -mb-5 mt-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
              <span>
                <span className="font-medium uppercase tracking-wide text-slate-400">STATUS: </span>
                <span className={`font-semibold ${formData.isActive ? "text-emerald-700" : "text-rose-700"}`}>
                  {formData.isActive ? "● Active Account" : "● Inactive Account"}
                </span>
              </span>
              <span>
                <span className="font-medium uppercase tracking-wide text-slate-400">PERMISSIONS: </span>
                <span className="text-slate-800 font-semibold">
                  {permissions.includes("all") ? "Full System Access (Super Admin)" : `${activePermissionsCount} of ${totalPossiblePermissions} Actions Granted`}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="h-10 px-6 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 transition"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-10 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
              >
                <span>➤</span> {user ? (submitting ? "Saving..." : "Save Changes") : (submitting ? "Creating..." : "Create Employee")}
              </Button>
            </div>
          </div>
        </form>

        {/* Manage Dynamic Page Permissions & Dropdowns Modal */}
        <ManagePagePermissionsModal
          open={isManagePermsOpen}
          onClose={() => setIsManagePermsOpen(false)}
          modules={pageModules}
          onModulesUpdated={updated => setPageModules(updated)}
        />

      </div>
    </div>
  )
}
