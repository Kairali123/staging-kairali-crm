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
import { PermissionChipDropdown, type PermissionOption, getChipStyle } from "@/components/ui/permission-chip-dropdown"
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
  X,
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
  modulePermissions?: Record<string, string[]>
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

function SecurityManagementModal({ user, onClose, onUpdated }: SecurityModalProps) {
  const [activeTab, setActiveTab] = useState<"password" | "devices" | "sessions">("password")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [copiedCurrent, setCopiedCurrent] = useState(false)
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
        setCurrentPassword(data.currentPassword || null)
      }
    } catch {
      toast.error("Failed to load device details")
    } finally {
      setIsLoadingDetails(false)
    }
  }, [user.id])

  useEffect(() => {
    setNewPassword("")
    setConfirmPassword("")
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setShowCurrentPassword(false)
    setCopiedCurrent(false)
    loadDetails()
  }, [loadDetails, user.id])

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
      setNewPassword("")
      setConfirmPassword("")
      setShowNewPassword(false)
      setShowConfirmPassword(false)
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
            <form onSubmit={handleResetPassword} className="space-y-4" autoComplete="off">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Real-Time Session Invalidation</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Updating the password will immediately invalidate all active sessions for this account. The employee will receive an instant notification on their screen and will be given a 20-second window before being redirected to the login page.
                  </p>
                </div>
              </div>

              {/* Super Admin Access: View Current Password */}
              {currentPassword && (
                <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-purple-600" />
                      Current Password
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                        Super Admin Access
                      </span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentPassword)
                        setCopiedCurrent(true)
                        toast.success("Current password copied to clipboard")
                        setTimeout(() => setCopiedCurrent(false), 2000)
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
                    >
                      {copiedCurrent ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-green-600">Copied</span>
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
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      readOnly
                      className="h-10 rounded-lg text-sm pr-10 bg-white font-mono font-medium border-purple-200 text-gray-900 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-700 focus:outline-none transition-colors cursor-pointer"
                      tabIndex={-1}
                      aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
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

              <div className="pt-1 border-t border-gray-100">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
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
                    autoComplete="new-password"
                    name="admin-reset-new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                    tabIndex={-1}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
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
                    autoComplete="new-password"
                    name="admin-reset-confirm-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
                          <p className="text-[10px] text-gray-400">
                            Last Active: {new Date(d.lastUsedAt).toLocaleString()}
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
                          <p className="text-[10px] text-gray-400">
                            Heartbeat: {new Date(s.lastHeartbeat).toLocaleString()}
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

// ─── Permission Schema & Definitions (Google Sheets Dropdown Architecture) ─────

export interface PageModuleDef {
  key: string
  label: string
  category: string
  description: string
  options: PermissionOption[]
}

export const STANDARD_PAGE_OPTIONS: PermissionOption[] = [
  { id: "view", label: "view" },
  { id: "edit", label: "edit" },
  { id: "delete", label: "delete" },
  { id: "manage", label: "manage" },
  { id: "create", label: "create" },
  { id: "viewSelf", label: "viewSelf" },
  { id: "viewAll", label: "viewAll" },
]

export const LEADS_PAGE_OPTIONS: PermissionOption[] = [
  { id: "view", label: "view" },
  { id: "edit", label: "edit" },
  { id: "delete", label: "delete" },
  { id: "manage", label: "manage" },
  { id: "create", label: "create" },
  { id: "assign", label: "assign" },
]

export const DIALSHREE_PAGE_OPTIONS: PermissionOption[] = [
  { id: "view", label: "view" },
  { id: "stage1", label: "stage1" },
  { id: "stage2", label: "stage2" },
  { id: "stage3", label: "stage3" },
  { id: "stage4", label: "stage4" },
  { id: "stage5", label: "stage5" },
  { id: "stage6", label: "stage6" },
  { id: "stage7", label: "stage7" },
  { id: "stage8", label: "stage8" },
  { id: "Executive", label: "Executive" },
  { id: "Review", label: "Review" },
  { id: "stage9", label: "stage9" },
  { id: "stage10", label: "stage10" },
  { id: "stage11", label: "stage11" },
]

export const SALES_AUDIT_PAGE_OPTIONS: PermissionOption[] = [
  { id: "view", label: "view" },
  { id: "viewSelf", label: "viewSelf" },
  { id: "viewAll", label: "viewAll" },
  { id: "write", label: "write" },
]

export const ALL_PAGE_MODULES: PageModuleDef[] = [
  // ── 1. Core Workspace & Leads
  { key: "dashboard", label: "Executive Dashboard", category: "Core Workspace & Leads", description: "Analytics & system overview", options: STANDARD_PAGE_OPTIONS },
  { key: "leads", label: "Leads Assignment & Pipeline", category: "Core Workspace & Leads", description: "Incoming leads, assignment & follow-up", options: LEADS_PAGE_OPTIONS },
  { key: "deal_assistant", label: "AI Deal Assistant", category: "Core Workspace & Leads", description: "AI qualification & deals", options: STANDARD_PAGE_OPTIONS },
  { key: "ai_voice_menu", label: "AI Voice Qualification", category: "Core Workspace & Leads", description: "Voice transcription & reports", options: STANDARD_PAGE_OPTIONS },
  { key: "ai_voice_sent", label: "AI Voice Sent Outreach", category: "Core Workspace & Leads", description: "Voice outbound outreach logs", options: STANDARD_PAGE_OPTIONS },
  { key: "ai_voice_received", label: "AI Voice Received Leads", category: "Core Workspace & Leads", description: "Inbound voice callback leads", options: STANDARD_PAGE_OPTIONS },
  { key: "ai_voice_summary", label: "AI Voice Summary Report", category: "Core Workspace & Leads", description: "AI qualification summary metrics", options: STANDARD_PAGE_OPTIONS },
  { key: "dialshree_menu", label: "DialShree Lead Qualification", category: "Core Workspace & Leads", description: "Dialer calling & callback stages", options: DIALSHREE_PAGE_OPTIONS },
  { key: "dialshree_received", label: "DialShree Received Leads", category: "Core Workspace & Leads", description: "Dialer received callback leads", options: DIALSHREE_PAGE_OPTIONS },
  { key: "dialshree_sent", label: "DialShree Sent Leads", category: "Core Workspace & Leads", description: "Dialer sent outreach leads", options: DIALSHREE_PAGE_OPTIONS },
  { key: "dialshree_summary", label: "DialShree Summary Report", category: "Core Workspace & Leads", description: "Dialer outreach summary reports", options: DIALSHREE_PAGE_OPTIONS },
  { key: "oohl_enquiry_new", label: "OOHL Enquiry Master", category: "Core Workspace & Leads", description: "OOHL inbound inquiry stages", options: DIALSHREE_PAGE_OPTIONS },

  // ── 2. Sales & Call Management
  { key: "calls", label: "Calls Master Log", category: "Sales & Call Management", description: "Call logs and calling status", options: STANDARD_PAGE_OPTIONS },
  { key: "calls_report", label: "Calls Report", category: "Sales & Call Management", description: "Call history logs & recordings", options: STANDARD_PAGE_OPTIONS },
  { key: "sales_report", label: "Sales Report", category: "Sales & Call Management", description: "Revenue statistics & conversions", options: STANDARD_PAGE_OPTIONS },
  { key: "sales_calling", label: "Sales Calling Master", category: "Sales & Call Management", description: "Daily schedules & calling sheets", options: STANDARD_PAGE_OPTIONS },
  { key: "riya_sharma", label: "Riya Sharma Portal", category: "Sales & Call Management", description: "Agent dedicated conversion tracking", options: STANDARD_PAGE_OPTIONS },
  { key: "sales_call_audit", label: "Sales Call Audit", category: "Sales & Call Management", description: "Call scorecards, scopes & HR verification", options: SALES_AUDIT_PAGE_OPTIONS },

  // ── 3. Marketing & Ads Analytics
  { key: "marketing", label: "Marketing Reports Hub", category: "Marketing & Ads Analytics", description: "Campaign performance overview", options: STANDARD_PAGE_OPTIONS },
  { key: "marketing_funnel", label: "Marketing Funnel", category: "Marketing & Ads Analytics", description: "Lead stage funnel & conversions", options: STANDARD_PAGE_OPTIONS },
  { key: "marketing_google_report", label: "Google PPC Reports", category: "Marketing & Ads Analytics", description: "Google ad spend & ROAS analytics", options: STANDARD_PAGE_OPTIONS },
  { key: "marketing_facebook_report", label: "Facebook PPC Reports", category: "Marketing & Ads Analytics", description: "Meta campaign metrics", options: STANDARD_PAGE_OPTIONS },
  { key: "google_adword_report", label: "Google Adwords Reports", category: "Marketing & Ads Analytics", description: "Adwords spend & sources", options: STANDARD_PAGE_OPTIONS },

  // ── 4. FMS & Booking Systems
  { key: "fms", label: "FMS Systems Hub", category: "FMS & Booking Systems", description: "File Management Systems core", options: STANDARD_PAGE_OPTIONS },
  { key: "bookings", label: "Bookings Intake & Manage", category: "FMS & Booking Systems", description: "Resort reservations & guests", options: STANDARD_PAGE_OPTIONS },
  { key: "team", label: "KTAHV Booking FMS", category: "FMS & Booking Systems", description: "KTAHV team bookings FMS", options: STANDARD_PAGE_OPTIONS },
  { key: "villa_raag", label: "Villa Raag Booking FMS", category: "FMS & Booking Systems", description: "Villa Raag resort reservations", options: STANDARD_PAGE_OPTIONS },
  { key: "ktahv_booking_form", label: "KTAHV Booking Intake Form", category: "FMS & Booking Systems", description: "Direct booking intake submission", options: STANDARD_PAGE_OPTIONS },
  { key: "crr_fms", label: "KTAHV CRR Calling FMS", category: "FMS & Booking Systems", description: "CRR guest follow-up & retention", options: STANDARD_PAGE_OPTIONS },
  { key: "om_fms", label: "Operations Manager FMS", category: "FMS & Booking Systems", description: "Ops management lifecycle FMS", options: STANDARD_PAGE_OPTIONS },
  { key: "task_fms", label: "FMS Bottleneck Tracker", category: "FMS & Booking Systems", description: "Pending bottlenecks & alerts", options: STANDARD_PAGE_OPTIONS },
  { key: "cold_enquiry_reverification", label: "Cold Enquiry Reverification", category: "FMS & Booking Systems", description: "Reverify cold customer leads", options: STANDARD_PAGE_OPTIONS },
  { key: "new_order_fms", label: "New Order FMS", category: "FMS & Booking Systems", description: "Product order lifecycle FMS", options: STANDARD_PAGE_OPTIONS },
  { key: "mr_fms", label: "MR FMS", category: "FMS & Booking Systems", description: "Medical rep field reporting", options: STANDARD_PAGE_OPTIONS },

  // ── 5. Financials & Invoicing
  { key: "accounts_tracker", label: "KTAHV Accounts Tracker", category: "Financials & Invoicing", description: "Reconcile booking accounts & receipts", options: STANDARD_PAGE_OPTIONS },
  { key: "payments", label: "Payments & Receipts", category: "Financials & Invoicing", description: "Financial payment records & ledger", options: STANDARD_PAGE_OPTIONS },
  { key: "invoices", label: "Billing & Invoices", category: "Financials & Invoicing", description: "Client tax invoices & receipts", options: STANDARD_PAGE_OPTIONS },
  { key: "partners", label: "Partner Systems Hub", category: "Financials & Invoicing", description: "Corporate & doctor partners", options: STANDARD_PAGE_OPTIONS },

  // ── 6. Portals & Miscellaneous Tools
  { key: "portal_hub", label: "Unified Portal Hub", category: "Portals & Miscellaneous Tools", description: "External portal shortcuts launcher", options: STANDARD_PAGE_OPTIONS },
  { key: "sales_target_portal", label: "Sales Target Portal", category: "Portals & Miscellaneous Tools", description: "Sales target portal integration", options: STANDARD_PAGE_OPTIONS },
  { key: "call_recording_portal", label: "Call Recording Portal", category: "Portals & Miscellaneous Tools", description: "IVR audio call recording archives", options: STANDARD_PAGE_OPTIONS },
  { key: "doctor_portal", label: "Doctor Portal", category: "Portals & Miscellaneous Tools", description: "Doctor consultation CMS & history", options: STANDARD_PAGE_OPTIONS },
  { key: "partner_onboard_form", label: "Partner Onboard Form", category: "Portals & Miscellaneous Tools", description: "External partner onboarding form", options: STANDARD_PAGE_OPTIONS },
  { key: "meetings", label: "Meetings Hub", category: "Portals & Miscellaneous Tools", description: "Team meeting logs & action items", options: STANDARD_PAGE_OPTIONS },

  // ── 7. Administrative & Personnel
  { key: "users", label: "View User Directory", category: "Administrative & Personnel", description: "Personnel directory & credentials", options: STANDARD_PAGE_OPTIONS },
  { key: "employee", label: "Staff Directory", category: "Administrative & Personnel", description: "Employee records & directory", options: STANDARD_PAGE_OPTIONS },
  { key: "escalations", label: "Escalations & Alerts", category: "Administrative & Personnel", description: "Operational escalation monitoring", options: STANDARD_PAGE_OPTIONS },
  { key: "guests", label: "Guest Master Records", category: "Administrative & Personnel", description: "Guest profiles & historical stays", options: STANDARD_PAGE_OPTIONS },
  { key: "helpdesk", label: "Helpdesk & Support", category: "Administrative & Personnel", description: "Support tickets & queries", options: STANDARD_PAGE_OPTIONS },
  { key: "performance", label: "Staff Performance", category: "Administrative & Personnel", description: "Team KPIs and scorecards", options: STANDARD_PAGE_OPTIONS },
  { key: "prescriptions", label: "Prescriptions Archive", category: "Administrative & Personnel", description: "Medical consultation prescriptions", options: STANDARD_PAGE_OPTIONS },
  { key: "reports", label: "Central Reports Hub", category: "Administrative & Personnel", description: "Central analytics & reports", options: STANDARD_PAGE_OPTIONS },
]

export const ROLE_DEFAULT_MODULE_MAP: Record<string, Record<string, string[]>> = {
  super_admin: { all: ["all"] },
  admin: {
    dashboard: ["view"],
    users: ["view", "create", "edit", "delete"],
    leads: ["view", "edit", "assign"],
    calls_report: ["view"],
    sales_report: ["view"],
    sales_calling: ["view"],
    marketing: ["view"],
    marketing_funnel: ["view"],
    marketing_google_report: ["view"],
    marketing_facebook_report: ["view"],
    google_adword_report: ["view"],
    fms: ["view"],
    team: ["view"],
    villa_raag: ["view"],
    ktahv_booking_form: ["view"],
    crr_fms: ["view"],
    task_fms: ["view"],
    cold_enquiry_reverification: ["view"],
    new_order_fms: ["view"],
    mr_fms: ["view"],
    deal_assistant: ["view"],
    ai_voice_menu: ["view"],
    dialshree_menu: ["view"],
    dialshree_received: ["view"],
    dialshree_sent: ["view"],
    dialshree_summary: ["view"],
    accounts_tracker: ["view"],
    partners: ["view"],
    meetings: ["view"],
    portal_hub: ["view"],
    sales_target_portal: ["view"],
    call_recording_portal: ["view"],
    doctor_portal: ["view"],
    partner_onboard_form: ["view"],
  },
  sales_manager: {
    dashboard: ["view"],
    leads: ["view", "edit", "assign"],
    calls_report: ["view"],
    sales_report: ["view"],
    sales_calling: ["view"],
    riya_sharma: ["view"],
    marketing: ["view"],
    fms: ["view"],
    team: ["view"],
    villa_raag: ["view"],
    ktahv_booking_form: ["view"],
    crr_fms: ["view"],
    deal_assistant: ["view"],
    portal_hub: ["view"],
    sales_target_portal: ["view"],
    call_recording_portal: ["view"],
    meetings: ["view"],
  },
  sales_agent: {
    dashboard: ["view"],
    leads: ["view", "edit"],
    calls_report: ["view"],
    sales_calling: ["view"],
    fms: ["view"],
    team: ["view"],
    villa_raag: ["view"],
    ktahv_booking_form: ["view"],
    deal_assistant: ["view"],
    sales_target_portal: ["view"],
  },
  operation_manager: {
    dashboard: ["view"],
    fms: ["view"],
    team: ["view"],
    villa_raag: ["view"],
    ktahv_booking_form: ["view"],
    crr_fms: ["view"],
    task_fms: ["view"],
    cold_enquiry_reverification: ["view"],
    new_order_fms: ["view"],
    mr_fms: ["view"],
    accounts_tracker: ["view"],
    meetings: ["view"],
  },
  operation_staff: {
    dashboard: ["view"],
    fms: ["view"],
    team: ["view"],
    ktahv_booking_form: ["view"],
    crr_fms: ["view"],
    task_fms: ["view"],
    cold_enquiry_reverification: ["view"],
    new_order_fms: ["view"],
  },
  account_manager: {
    dashboard: ["view"],
    accounts_tracker: ["view"],
    payments: ["view"],
    sales_report: ["view"],
    fms: ["view"],
    team: ["view"],
    villa_raag: ["view"],
    portal_hub: ["view"],
  },
  doctor: {
    dashboard: ["view"],
    doctor_portal: ["view"],
    meetings: ["view"],
    portal_hub: ["view"],
  },
}

/**
 * Robust non-destructive converter that parses existing user permissions
 * (from user.modulePermissions and user.permissions) into the per-module chip map.
 */
function parseUserPermissionsToModuleMap(
  existingModulePerms?: Record<string, string[]>,
  existingFlatPerms?: string[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {}

  // 1. If explicit module permissions map is loaded from DB
  if (existingModulePerms && typeof existingModulePerms === "object") {
    for (const [k, v] of Object.entries(existingModulePerms)) {
      if (Array.isArray(v) && v.length > 0) {
        result[k] = [...v]
      }
    }
  }

  // 2. Also parse flat permissions to ensure no existing assignments are omitted
  if (Array.isArray(existingFlatPerms)) {
    for (const p of existingFlatPerms) {
      if (!p || typeof p !== "string") continue
      if (p === "all") continue

      if (p.includes(".")) {
        const dotIdx = p.indexOf(".")
        const rawMod = p.substring(0, dotIdx)
        const mod = rawMod.replace(/-/g, "_")
        const act = p.substring(dotIdx + 1)
        if (!result[mod]) result[mod] = []
        if (!result[mod].includes(act)) {
          result[mod].push(act)
        }
      } else {
        const mod = p.replace(/-/g, "_")
        if (!result[mod]) result[mod] = []
        if (!result[mod].includes("view")) {
          result[mod].push("view")
        }
      }
    }
  }

  return result
}

interface EmployeeProfileModalProps {
  user?: ExtendedUser | User
  open: boolean
  onClose: () => void
  onSubmit: (userData: any) => Promise<void> | void
}

function EmployeeProfileModal({ user, open, onClose, onSubmit }: EmployeeProfileModalProps) {
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

  const [modulePermissions, setModulePermissions] = useState<Record<string, string[]>>({})
  const [isAllAccess, setIsAllAccess] = useState<boolean>(false)
  const [permissionSearch, setPermissionSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [customModuleInput, setCustomModuleInput] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Sync / initialize form state when modal opens
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

      const hasSuperAll =
        user?.role === "super_admin" ||
        (Array.isArray(user?.permissions) && user.permissions.includes("all"))

      setIsAllAccess(hasSuperAll)

      const initialMap = parseUserPermissionsToModuleMap(
        (user as any)?.modulePermissions,
        user?.permissions
      )

      // If new employee registration without initial perms, use role defaults
      if (!user && Object.keys(initialMap).length === 0) {
        const defaults = ROLE_DEFAULT_MODULE_MAP[formData.role] || {}
        setModulePermissions(defaults)
      } else {
        setModulePermissions(initialMap)
      }

      setPermissionSearch("")
      setShowCustomInput(false)
      setCustomModuleInput("")
    }
  }, [open, user?.id])

  if (!open) return null

  const handleRoleChange = (newRole: UserRole) => {
    setFormData(p => ({ ...p, role: newRole }))
    if (newRole === "super_admin") {
      setIsAllAccess(true)
    } else {
      setIsAllAccess(false)
      const defaults = ROLE_DEFAULT_MODULE_MAP[newRole] || {}
      setModulePermissions(defaults)
    }
  }

  const updateModuleChips = (moduleKey: string, newChips: string[]) => {
    setModulePermissions(prev => {
      const next = { ...prev }
      if (newChips.length === 0) {
        delete next[moduleKey]
      } else {
        next[moduleKey] = newChips
      }
      return next
    })
  }

  const addPagePermission = (pageKey: string) => {
    if (!pageKey) return
    setModulePermissions(prev => ({
      ...prev,
      [pageKey]: prev[pageKey] && prev[pageKey].length > 0 ? prev[pageKey] : ["view"],
    }))
    toast.success(`Added page permission for '${pageKey}'`)
  }

  const removePagePermission = (moduleKey: string) => {
    setModulePermissions(prev => {
      const next = { ...prev }
      delete next[moduleKey]
      return next
    })
  }

  const handleAddCustomModule = () => {
    const cleanKey = customModuleInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")
    if (!cleanKey) {
      toast.error("Please enter a valid page key")
      return
    }
    addPagePermission(cleanKey)
    setCustomModuleInput("")
    setShowCustomInput(false)
  }

  const toggleAllAccess = () => {
    setIsAllAccess(prev => !prev)
  }

  const selectAllView = () => {
    const newMap: Record<string, string[]> = {}
    for (const mod of ALL_PAGE_MODULES) {
      newMap[mod.key] = ["view"]
    }
    setModulePermissions(newMap)
    toast.success("All pages set to View permission")
  }

  const clearAllPermissions = () => {
    setModulePermissions({})
    setIsAllAccess(false)
    toast.info("Cleared all page permissions")
  }

  const resetToRoleDefaults = () => {
    if (formData.role === "super_admin") {
      setIsAllAccess(true)
      setModulePermissions({ all: ["all"] })
    } else {
      setIsAllAccess(false)
      const defaults = ROLE_DEFAULT_MODULE_MAP[formData.role] || {}
      setModulePermissions(defaults)
    }
    toast.success(`Reset to ${formData.role.replace(/_/g, " ")} defaults`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.employeeId.trim()) {
      toast.error("Please fill in all required fields marked with *")
      return
    }

    setSubmitting(true)
    try {
      let finalPermissions: string[] = []
      if (isAllAccess || formData.role === "super_admin") {
        finalPermissions = ["all"]
      } else {
        const permsSet = new Set<string>()
        for (const [modKey, chips] of Object.entries(modulePermissions)) {
          if (!chips || chips.length === 0) continue
          permsSet.add(modKey)
          for (const chip of chips) {
            permsSet.add(`${modKey}.${chip}`)
          }
        }
        finalPermissions = Array.from(permsSet)
      }

      await onSubmit({
        ...formData,
        permissions: finalPermissions,
        modulePermissions,
        joinDate: user?.joinDate || new Date().toISOString().split("T")[0],
      })
    } finally {
      setSubmitting(false)
    }
  }

  const F = "h-11 rounded-xl text-xs bg-slate-50/70 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 font-medium"
  const L = "text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1"

  // Filter modules according to search
  const q = permissionSearch.trim().toLowerCase()
  const filteredModules = q
    ? ALL_PAGE_MODULES.filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          m.key.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      )
    : ALL_PAGE_MODULES

  // Group modules by category
  const categoriesMap = new Map<string, PageModuleDef[]>()
  for (const m of filteredModules) {
    if (!categoriesMap.has(m.category)) {
      categoriesMap.set(m.category, [])
    }
    categoriesMap.get(m.category)!.push(m)
  }

  // Any custom modules configured for this user that are not in ALL_PAGE_MODULES
  const standardKeysSet = new Set(ALL_PAGE_MODULES.map((m) => m.key))
  const customConfiguredKeys = Object.keys(modulePermissions).filter(
    (k) => !standardKeysSet.has(k) && k !== "all"
  )

  // Unassigned modules list for the "+ Add Page Permission" dropdown
  const unassignedModules = ALL_PAGE_MODULES.filter((m) => !modulePermissions[m.key])

  const configuredPagesCount = isAllAccess
    ? ALL_PAGE_MODULES.length
    : Object.keys(modulePermissions).filter(
        (k) => modulePermissions[k] && modulePermissions[k].length > 0 && k !== "all"
      ).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 md:p-6 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex max-h-[95vh] w-full max-w-5xl xl:max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        
        {/* ── Top Header (Executive Verifier Theme) ── */}
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
                Configure employee credentials, divisional allocation &amp; granular per-page dropdown permissions
              </p>

              {/* Informative Header Tags */}
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
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className={F}
                />
              </div>

              <div className="space-y-1.5">
                <Label className={L}>
                  Official Email <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  type="email"
                  placeholder="user@kairali.com"
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  className={F}
                />
              </div>

              <div className="space-y-1.5">
                <Label className={L}>
                  Employee ID <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="e.g. K2000"
                  value={formData.employeeId}
                  onChange={e => setFormData(p => ({ ...p, employeeId: e.target.value }))}
                  className={F}
                />
              </div>

              <div className="space-y-1.5">
                <Label className={L}>Phone Number</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
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

            {/* ── SECTION 3: GOOGLE SHEETS STYLE PAGE PERMISSIONS DROPDOWNS ── */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              
              {/* Matrix Control Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Page &amp; Module Permissions
                      </h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
                        {isAllAccess ? "Full Super Admin All-Access" : `${configuredPagesCount} of ${ALL_PAGE_MODULES.length} Pages Configured`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Multi-select chip dropdowns mapped directly to database columns &amp; sheet permissions
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons & "+ Add Page Permission" */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* "+ Add Page Permission" Dropdown */}
                  <div className="relative">
                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (val === "__custom__") {
                          setShowCustomInput(true)
                        } else if (val) {
                          addPagePermission(val)
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 px-3 text-[11px] font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600 shadow-xs flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        <span>+ Add Page Permission</span>
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="__custom__" className="text-indigo-600 font-bold border-b">
                          + Add Custom Page Column...
                        </SelectItem>
                        {unassignedModules.map((m) => (
                          <SelectItem key={m.key} value={m.key} className="text-xs">
                            <span className="font-semibold">{m.label}</span>{" "}
                            <span className="text-[10px] text-slate-400 font-mono">({m.key})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Super Admin All-Access Toggle */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleAllAccess}
                    className={`h-7 px-2.5 text-[10px] font-bold rounded-lg border transition-all ${
                      isAllAccess
                        ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                        : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50"
                    }`}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {isAllAccess ? "✓ All-Access Active" : "Grant All (all)"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllView}
                    className="h-7 px-2.5 text-[10px] font-medium bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  >
                    All View
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

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllPermissions}
                    className="h-7 px-2.5 text-[10px] font-medium bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Custom Page Column Input Popover / Bar */}
              {showCustomInput && (
                <div className="p-3 bg-amber-50/80 border-b border-amber-200 flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-900">New Column:</span>
                  <Input
                    value={customModuleInput}
                    onChange={(e) => setCustomModuleInput(e.target.value)}
                    placeholder="Enter database column / page key (e.g. custom_reports)..."
                    className="h-8 text-xs bg-white rounded-lg flex-1 max-w-sm border-amber-300 font-mono"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomModule}
                    className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
                  >
                    Add Column
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowCustomInput(false)}
                    className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Search Inside Permissions */}
              <div className="p-3 bg-slate-50/60 border-b border-slate-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search page permissions by name, column key, or category (e.g. dialshree, leads, fms, audit)..."
                    value={permissionSearch}
                    onChange={e => setPermissionSearch(e.target.value)}
                    className="h-8.5 rounded-lg border-slate-200 bg-white pl-8.5 text-xs placeholder:text-slate-400 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Super Admin All-Access Banner */}
              {isAllAccess && (
                <div className="m-3 p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between gap-3 text-purple-900">
                  <div className="flex items-center gap-2.5">
                    <Shield className="h-5 w-5 text-purple-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold leading-tight">Super Admin Full System Authority Granted</p>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        This employee has unconstrained permission across all pages, modules, APIs, and administrative functions.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAllAccess(false)}
                    className="h-7 px-2.5 text-[10px] font-bold border-purple-300 text-purple-700 hover:bg-purple-100 rounded-lg shrink-0"
                  >
                    Switch to Custom Permissions
                  </Button>
                </div>
              )}

              {/* Category Page List with Multi-Select Chip Dropdowns */}
              <div className="p-4 space-y-4 max-h-[380px] overflow-y-auto">
                {Array.from(categoriesMap.entries()).map(([category, modules]) => {
                  const activeCountInCat = modules.filter(
                    (m) => modulePermissions[m.key] && modulePermissions[m.key].length > 0
                  ).length

                  return (
                    <div
                      key={category}
                      className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 shadow-2xs space-y-2.5"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{category}</span>
                          <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                            • {modules.length} available pages
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-slate-600 border border-slate-200">
                          {activeCountInCat} / {modules.length} active
                        </span>
                      </div>

                      {/* Module Rows Grid (2 Columns on large screens) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                        {modules.map((m) => {
                          const activeChips = modulePermissions[m.key] || []
                          const isConfigured = activeChips.length > 0

                          return (
                            <div
                              key={m.key}
                              className={`p-2.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                isConfigured
                                  ? "bg-white border-indigo-200 shadow-2xs"
                                  : "bg-slate-50/80 border-slate-200 text-slate-500"
                              }`}
                            >
                              {/* Left: Module Info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-bold text-slate-800 truncate">{m.label}</p>
                                  <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-slate-100 text-slate-500 border border-slate-200 truncate">
                                    col: {m.key}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{m.description}</p>
                              </div>

                              {/* Right: Dropdown + Remove */}
                              <div className="flex items-center gap-1.5 w-full sm:w-auto sm:min-w-[190px] max-w-full">
                                <div className="flex-1">
                                  <PermissionChipDropdown
                                    options={m.options}
                                    selected={activeChips}
                                    onChange={(newChips) => updateModuleChips(m.key, newChips)}
                                    placeholder="+ Select permissions"
                                  />
                                </div>

                                {isConfigured && (
                                  <button
                                    type="button"
                                    onClick={() => removePagePermission(m.key)}
                                    title="Remove this page permission"
                                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* Custom Configured Columns (if any were added) */}
                {customConfiguredKeys.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-200">
                      <span className="text-xs font-bold text-amber-900">Custom / Dynamic Page Columns</span>
                      <span className="text-[10px] text-amber-700 font-medium">
                        {customConfiguredKeys.length} custom columns
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                      {customConfiguredKeys.map((k) => (
                        <div
                          key={k}
                          className="p-2.5 rounded-xl border border-amber-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-amber-950 truncate">{k}</p>
                            <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-amber-100 text-amber-700 border border-amber-200">
                              column: {k}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 w-full sm:w-auto sm:min-w-[190px]">
                            <div className="flex-1">
                              <PermissionChipDropdown
                                options={STANDARD_PAGE_OPTIONS}
                                selected={modulePermissions[k] || []}
                                onChange={(newChips) => updateModuleChips(k, newChips)}
                                placeholder="+ Select permissions"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removePagePermission(k)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Footer Bar (Executive Verifier Pattern) ── */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 rounded-b-2xl -mx-6 -mb-5 mt-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
              <span>
                <span className="font-medium uppercase tracking-wide text-slate-400">STATUS: </span>
                <span className={`font-semibold ${formData.isActive ? "text-emerald-700" : "text-rose-700"}`}>
                  {formData.isActive ? "● Active Account" : "● Inactive Account"}
                </span>
              </span>
              <span>
                <span className="font-medium uppercase tracking-wide text-slate-400">PAGE ACCESS: </span>
                <span className="text-slate-800 font-semibold">
                  {isAllAccess
                    ? "Full System Access (Super Admin All-Access)"
                    : `${configuredPagesCount} of ${ALL_PAGE_MODULES.length} Pages Configured`}
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

      </div>
    </div>
  )
}
