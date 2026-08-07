"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { useNotifications } from "@/contexts/notification-context"
import { useLeads } from "@/hooks/use-leads"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  Phone,
  PhoneCall,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  UserCog,
  UserCheck,
  Activity,
  ChevronDown,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Stethoscope,
  User,
  Database,
  TrendingUp,
  Facebook,
  Search,
  Globe,
  Instagram,
  MessageCircle,
  Mail,
  CalendarDays,
  Target,
  LineChart,
  PieChart,
  MousePointer,
  Eye,
  Share2,
  Filter,
  ShapesIcon as SalesIcon,
  Home,
  Facebook as FacebookIcon,
  IndianRupee,
  Shuffle,
  Building2,
  ExternalLink,
  LayoutGrid,
  Bell,
  RefreshCcw,
  List,
  Receipt,
  Info,
  StickyNote,
  Sparkles,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"


interface DashboardLayoutProps {
  children: React.ReactNode
}

interface Notification {
  id: string
  type: "system" | "lead" | "update"
  title: string
  body: string
  time: string
  link?: string
  read: boolean
  notifId?: string | null
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout: authLogout, hasPermission, refreshPermissions } = useAuth()
  const { clearLeadsCache, refreshLeads } = useLeads()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [fmsExpanded, setFmsExpanded] = useState(false)
  const [employeeExpanded, setEmployeeExpanded] = useState(false)
  const [marketingExpanded, setMarketingExpanded] = useState(false)
  const [doctorConsultationExpanded, setDoctorConsultationExpanded] = useState(false)
  const [salesExpanded, setSalesExpanded] = useState(false)
  const [portalHubExpanded, setPortalHubExpanded] = useState(false)
  const [voiceCallExpanded, setVoiceCallExpanded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [meetingsExpanded, setMeetingsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    checkForUpdates,
    triggerDemoNotification
  } = useNotifications()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (pathname.startsWith("/fms")) setFmsExpanded(true)
    if (pathname.startsWith("/employee")) setEmployeeExpanded(true)
    if (pathname.startsWith("/marketing")) setMarketingExpanded(true)
    if (pathname.startsWith("/doctor-consultation")) setDoctorConsultationExpanded(true)
    if (pathname.startsWith("/sales")) setSalesExpanded(true)
    if (pathname.startsWith("/voicecall")) setVoiceCallExpanded(true)
    if (pathname.startsWith("/meetings")) setMeetingsExpanded(true)
  }, [pathname])

  const handleLogout = async () => { await authLogout(); router.push("/") }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
    window.location.reload()
  }

  const handleClearCache = async () => {
    setIsClearingCache(true)
    try {
      await clearLeadsCache()
      await refreshLeads({ force: true, silent: true })
      if (refreshPermissions) {
        await refreshPermissions()
      }
    } catch (error) {
      console.error("Clear Cache failed:", error)
    } finally {
      setIsClearingCache(false)
    }
  }

  const getUserInitials = (name: string) =>
    name.split(" ").map((word) => word.charAt(0)).join("").toUpperCase().slice(0, 2)

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
    { name: "Marketing Reports", icon: TrendingUp, permission: "marketing.view" },
    { name: "Riya Sharma", href: "/riya-sharma", icon: LayoutGrid, permission: "riya_sharma.view" },
    { name: "FMS Systems", icon: FileText, permission: "fms.view" },
    { name: "Calls Report", href: "/calls/reports", icon: PhoneCall, permission: "calls_report.view" },
    { name: "Sales Report", href: "/sales/reports", icon: IndianRupee, permission: "sales_report.view" },
    { name: "Sales Calling Master", href: "/sales-calling", icon: PhoneCall, CalendarDays, permission: "sales_calling.view" },
    { name: "Leads Assignment", href: "/leads/assign", icon: Shuffle, permission: "leads.view" },
    { name: "AI Deal Assistant", href: "/deal-assistant", icon: Sparkles, permission: "deal_assistant.view" },
    // { name: "K-Serve Billing Auditor", href: "/ksereve-billing-auditer", icon: FileText, permission: "bill_fms.view" },
    { name: "AI Voice Lead Qual.", icon: Phone, permission: "ai_voice_menu.view" },
    { name: "KTAHV Accounts Tracker", href: "/accounts-tracker", icon: Receipt, permission: "accounts_tracker.view" },
    { name: "Partner Onboarding System", href: "/partners", icon: Building2, permission: "partners.view" },
    { name: "New Order FMS", href: "/new-order-fms", icon: FileText, permission: "new-order-fms.view" },
    { name: "MR FMS", href: "/MR-FMS", icon: FileText, permission: "mr-fms.view" },
    { name: "KTAHV CRR Calling FMS", href: "/crr-fms", icon: FileText, permission: "crr_fms.view" },
    { name: "KTAHV BOOKING FORM", href: "/fms/bookings/ktahv", icon: FileText, permission: "ktahv_booking_form.view", target: "_blank" },
    { name: "Unified Portal Hub", icon: LayoutGrid, permission: "portal_hub.view" },
    { name: "Meetings", href: "/meetings", icon: StickyNote, permission: "meetings.view" },
    { name: "FMS Pending Bottleneck Tracker", href: "/fms/pending-tasks", icon: FileText, permission: "task_fms.view" },
    { name: "Cold Enquiry Reverification", href: "/fms/enquiry-reverification", icon: FileText, permission: "cold_enquiry_reverification.view" },


  ]

  const marketingSubMenu = [
    { name: "Marketing Funnel", href: "/marketing-funnel", icon: Search, description: "Marketing Funnel", permission: "marketing_funnel.view" },
    { name: "Google PPC Reports", href: "/marketing/google-ppc", icon: Search, description: "Google PPC ads reports", permission: "marketing_google_report.view" },
    { name: "Facebook PPC Reports", href: "/marketing/facebook-ppc", icon: Search, description: "Facebook PPC ads reports", permission: "marketing_facebook_report.view" },
    { name: "Google Adword Reports", href: "/google-adword-reports", icon: Search, description: "Google Ads campaign expense data", permission: "google_adword_report.view" },
  ]

  const fmsSubMenu = [
    { name: "KTAHV Booking FMS", href: "/fms/bookings/team", icon: Users, permission: "team.view", description: "KTAHV booking management" },
    { name: "Villa Raag Booking FMS", href: "/fms/bookings/villa-raag", icon: Home, permission: "villa_raag.view", description: "Villa Raag FMS" },
  ]

  const employeeSubMenu = [
    { name: "Lead Search", href: "/employee/lead-search", icon: Users, description: "Search and manage leads" },
    { name: "Order Tracking", href: "/employee/order-tracking", icon: Activity, description: "Track order status" },
    { name: "Booking Status Check", href: "/employee/booking-status", icon: Calendar, description: "Check booking status" },
    { name: "Employee Help", href: "/employee/help", icon: Settings, description: "Employee support" },
  ]

  const doctorConsultationSubMenu = [
    { name: "Overview", href: "/doctor-consultation", icon: LayoutDashboard, description: "Consultation overview" },
    { name: "Calendar", href: "/doctor-consultation/calendar", icon: Calendar, description: "Consultation calendar" },
    { name: "History", href: "/doctor-consultation/history", icon: Activity, description: "Consultation history" },
    { name: "New Prescription", href: "/doctor-consultation/prescription/new", icon: FileText, description: "Create prescription" },
  ]

  const salesSubMenu = [
    { name: "Sales Analytics", href: "/sales/analytics", icon: LineChart, description: "Sales analytics dashboard" },
    { name: "Revenue Tracking", href: "/sales/revenue", icon: PieChart, description: "Track revenue" },
    { name: "Sales Pipeline", href: "/sales/pipeline", icon: Target, description: "Sales pipeline view" },
    { name: "Performance Metrics", href: "/sales/metrics", icon: BarChart3, description: "Performance metrics" },
  ]

  const portalHubSubMenu = [
    { name: "🎯 Sales Target Portal", description: "KAPPL & KTAHV", url: "https://script.google.com/macros/s/AKfycbxivpk2sKXvyzQBUQKLpJNiijjpYebjJETZn9W1yd3sa5WFvlHjik8c9JkrkC0XX399/exec", permission: "sales_target_portal.view" },
    { name: "📞 Call Recording Tracker", description: "Call recordings management", url: "https://www.kairali.ai/Google/callmanagement/", permission: "call_recording_portal.view" },
    { name: "🩺 Doctor Portal", description: "Doctor consultation CMS", url: "https://www.kairali.ai/Google/doctor_consulatation/doctor.html", permission: "doctor_portal.view" },
    // { name: "🤝 Add New Partner Contact", description: "Partner contact onboarding", url: "https://script.google.com/a/macros/kairali.com/s/AKfycbydtBk2cLDEHoYAA3IOWys3svtc-QWzQbHdRSG5WnTYi8wVRVk36mW2LHxkhveBK0HReQ/exec", permission: "partner_onboard_form.view" },
    { name: "🤝 Add New Partner Contact", description: "Partner contact onboarding", url: "https://script.google.com/macros/s/AKfycbzZx7Qb7mO4FhIkIMcILVsYk1DNsLM7ncmtpzqxBokcpX0_sbd6WeL8CFy82SlqDtdQAw/exec", permission: "partner_onboard_form.view" },
    { name: "📥 Media Download Centre", description: "Kairali media assets", url: "https://www.kairali.com/media-assets.html", permission: "portal_hub.view" },
  ]
  // const meetingsSubMenu = [
  //   { name: "View Meetings", href: "/meetings", icon: StickyNote, description: "View all meetings" },
  //   { name: "Record Meeting", href: "/meetings/record", icon: Phone, description: "Record new meeting" },
  //   { name: "Tasks", href: "/meetings/tasks", icon: List, description: "View meeting tasks" },
  // ]
  const filteredNavigation = navigation.filter(
    (item) => user?.permissions.includes("all") || hasPermission(item.permission),
  )

  const searchableItems: any[] = []
  filteredNavigation.forEach((item) => { if (item.href) searchableItems.push({ name: item.name, href: item.href, description: item.name, icon: item.icon }) })
  if (hasPermission("fms.view")) fmsSubMenu.filter((s) => !("permission" in s) || hasPermission(s.permission)).forEach((item) => searchableItems.push({ name: item.name, href: item.href, description: item.description || item.name, icon: item.icon }))
  if (hasPermission("marketing.view")) marketingSubMenu.filter((s) => !("permission" in s) || hasPermission(s.permission)).forEach((item) => searchableItems.push({ name: item.name, href: item.href, description: item.description || item.name, icon: item.icon }))
  if (hasPermission("employee.tools")) employeeSubMenu.forEach((item) => searchableItems.push({ name: item.name, href: item.href, description: item.description || item.name, icon: item.icon }))
  if (hasPermission("doctor.consultation.view")) doctorConsultationSubMenu.forEach((item) => searchableItems.push({ name: item.name, href: item.href, description: item.description || item.name, icon: item.icon }))
  if (hasPermission("dashboard.view") && user?.role !== "villa_raag_manager") salesSubMenu.forEach((item) => searchableItems.push({ name: item.name, href: item.href, description: item.description || item.name, icon: item.icon }))
  // if (hasPermission("meetings.view")) meetingsSubMenu.forEach((item) => searchableItems.push({ name: item.name, href: item.href, description: item.description || item.name, icon: item.icon }))

  const searchResults = debouncedQuery.length > 0
    ? searchableItems.filter((item) => [item.name, item.description, item.href].some((f) => f.toLowerCase().includes(debouncedQuery.toLowerCase())))
    : []

  const renderNavigationItem = (item: any, isMobile = false) => {
    if (item.name === "FMS Systems") {
      return (
        <div key={item.name}>
          <button onClick={() => setFmsExpanded(!fmsExpanded)} className={`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${pathname.startsWith("/fms") ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md" : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}`}>
            <item.icon className={`mr-3 h-5 w-5 ${pathname.startsWith("/fms") ? "text-white" : "text-blue-500"}`} />
            {item.name}
            {fmsExpanded ? <ChevronDown className={`ml-auto h-4 w-4 ${pathname.startsWith("/fms") ? "text-white" : "text-gray-500"}`} /> : <ChevronRight className={`ml-auto h-4 w-4 ${pathname.startsWith("/fms") ? "text-white" : "text-gray-500"}`} />}
          </button>
          {fmsExpanded && (
            <div className="ml-6 mt-2 space-y-1">
              {fmsSubMenu.filter((s) => !("permission" in s) || hasPermission(s.permission)).map((subItem) => (
                <Link key={subItem.name} href={subItem.href} className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${pathname === subItem.href ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-l-4 border-blue-500 shadow-sm" : "text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}`} onClick={() => isMobile && setSidebarOpen(false)}>
                  <subItem.icon className={`mr-3 h-4 w-4 ${pathname === subItem.href ? "text-blue-600" : "text-gray-500"}`} />
                  {subItem.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (item.name === "Marketing Reports") {
      return (
        <div key={item.name}>
          <button onClick={() => setMarketingExpanded(!marketingExpanded)} className={`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${pathname.startsWith("/marketing") ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md" : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}`}>
            <item.icon className={`mr-3 h-5 w-5 ${pathname.startsWith("/marketing") ? "text-white" : "text-purple-500"}`} />
            {item.name}
            {marketingExpanded ? <ChevronDown className={`ml-auto h-4 w-4 ${pathname.startsWith("/marketing") ? "text-white" : "text-gray-500"}`} /> : <ChevronRight className={`ml-auto h-4 w-4 ${pathname.startsWith("/marketing") ? "text-white" : "text-gray-500"}`} />}
          </button>
          {marketingExpanded && (
            <div className="ml-6 mt-2 space-y-1">
              {marketingSubMenu.filter((s) => !("permission" in s) || hasPermission(s.permission)).map((subItem) => (
                <Link key={subItem.name} href={subItem.href} className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${pathname === subItem.href ? "bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-l-4 border-purple-500 shadow-sm" : "text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}`} onClick={() => isMobile && setSidebarOpen(false)}>
                  <subItem.icon className={`mr-3 h-4 w-4 ${pathname === subItem.href ? "text-purple-600" : "text-gray-500"}`} />
                  {subItem.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (item.name === "Employee Tools") {
      return (
        <div key={item.name}>
          <button onClick={() => setEmployeeExpanded(!employeeExpanded)} className={`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${pathname.startsWith("/employee") ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md" : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}`}>
            <item.icon className={`mr-3 h-5 w-5 ${pathname.startsWith("/employee") ? "text-white" : "text-green-500"}`} />
            {item.name}
            {employeeExpanded ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
          </button>
          {employeeExpanded && (
            <div className="ml-6 mt-2 space-y-1">
              {employeeSubMenu.map((subItem) => (
                <Link key={subItem.name} href={subItem.href} className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${pathname === subItem.href ? "bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-l-4 border-green-500 shadow-sm" : "text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}`} onClick={() => isMobile && setSidebarOpen(false)}>
                  <subItem.icon className={`mr-3 h-4 w-4 ${pathname === subItem.href ? "text-green-600" : "text-gray-500"}`} />
                  {subItem.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (item.name === "Doctor Consultation") {
      return (
        <div key={item.name}>
          <button onClick={() => setDoctorConsultationExpanded(!doctorConsultationExpanded)} className={`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${pathname.startsWith("/doctor-consultation") ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md" : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}`}>
            <item.icon className={`mr-3 h-5 w-5 ${pathname.startsWith("/doctor-consultation") ? "text-white" : "text-teal-500"}`} />
            {item.name}
            {doctorConsultationExpanded ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
          </button>
          {doctorConsultationExpanded && (
            <div className="ml-6 mt-2 space-y-1">
              {doctorConsultationSubMenu.map((subItem) => (
                <Link key={subItem.name} href={subItem.href} className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${pathname === subItem.href ? "bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 border-l-4 border-teal-500 shadow-sm" : "text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}`} onClick={() => isMobile && setSidebarOpen(false)}>
                  <subItem.icon className={`mr-3 h-4 w-4 ${pathname === subItem.href ? "text-teal-600" : "text-gray-500"}`} />
                  {subItem.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (item.name === "Sales Management") {
      return (
        <div key={item.name}>
          <button onClick={() => setSalesExpanded(!salesExpanded)} className={`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${pathname.startsWith("/sales") ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md" : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}`}>
            <item.icon className={`mr-3 h-5 w-5 ${pathname.startsWith("/sales") ? "text-white" : "text-orange-500"}`} />
            {item.name}
            {salesExpanded ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
          </button>
          {salesExpanded && (
            <div className="ml-6 mt-2 space-y-1">
              {salesSubMenu.map((subItem) => (
                <Link key={subItem.name} href={subItem.href} className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${pathname === subItem.href ? "bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-l-4 border-orange-500 shadow-sm" : "text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}`} onClick={() => isMobile && setSidebarOpen(false)}>
                  <subItem.icon className={`mr-3 h-4 w-4 ${pathname === subItem.href ? "text-orange-600" : "text-gray-500"}`} />
                  {subItem.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (item.name === "AI Voice Lead Qual.") {
      const voiceSubMenu = [
        { name: "Sent", href: "/voicecall/data/sent", icon: Phone, permission: "ai_voice_sent.view" },
        { name: "Received", href: "/voicecall/data/received", icon: Phone, permission: "ai_voice_received.view" },
        { name: "Summary Report", href: "/voicecall/summary", icon: FileText, permission: "ai_voice_summary.view" },
        { name: "Non-Qualified", href: "/voicecall/non-qualified", icon: Phone, permission: "ai_voice_non_qualified.view" },
        { name: "K-Serve Billing Auditor", href: "/ksereve-billing-auditer", icon: FileText, permission: "bill_fms.view" },
      ]
      const isActive = pathname.startsWith("/voicecall")
      return (
        <div key={item.name}>
          <button
            onClick={() => setVoiceCallExpanded(!voiceCallExpanded)}
            className={`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-md"
              : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"
              }`}
          >
            <item.icon className={`mr-3 h-5 w-5 ${isActive ? "text-white" : "text-cyan-500"}`} />
            {item.name}
            {voiceCallExpanded
              ? <ChevronDown className={`ml-auto h-4 w-4 ${isActive ? "text-white" : "text-gray-500"}`} />
              : <ChevronRight className={`ml-auto h-4 w-4 ${isActive ? "text-white" : "text-gray-500"}`} />
            }
          </button>
          {voiceCallExpanded && (
            <div className="ml-6 mt-2 space-y-1">
              {voiceSubMenu
                .filter((s) => hasPermission(s.permission))
                .map((subItem) => (
                  <Link
                    key={subItem.name}
                    href={subItem.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${pathname === subItem.href
                      ? "bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-700 border-l-4 border-cyan-500 shadow-sm"
                      : "text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"
                      }`}
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    <subItem.icon className={`mr-3 h-4 w-4 ${pathname === subItem.href ? "text-cyan-600" : "text-gray-500"}`} />
                    {subItem.name}
                  </Link>
                ))}
            </div>
          )}
        </div>
      )
    }

    if (item.name === "Unified Portal Hub") {
      return (
        <div key={item.name}>
          <button onClick={() => setPortalHubExpanded(!portalHubExpanded)} className={`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${portalHubExpanded ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-md" : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}`}>
            <item.icon className={`mr-3 h-5 w-5 ${portalHubExpanded ? "text-white" : "text-violet-500"}`} />
            {item.name}
            {portalHubExpanded ? <ChevronDown className={`ml-auto h-4 w-4 ${portalHubExpanded ? "text-white" : "text-gray-500"}`} /> : <ChevronRight className="ml-auto h-4 w-4 text-gray-500" />}
          </button>
          {portalHubExpanded && (
            <div className="ml-6 mt-2 space-y-1">
              {portalHubSubMenu.filter((s) => !("permission" in s) || hasPermission(s.permission)).map((subItem) => (
                <a key={subItem.name} href={subItem.url} target="_blank" rel="noopener noreferrer" className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-violet-100 hover:text-violet-800" onClick={() => isMobile && setSidebarOpen(false)}>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{subItem.name}</div>
                    {subItem.description && <div className="text-xs text-gray-400 truncate">{subItem.description}</div>}
                  </div>
                  <ExternalLink className="ml-2 h-3 w-3 text-gray-400 flex-shrink-0 group-hover:text-violet-500" />
                </a>
              ))}
            </div>
          )}
        </div>
      )
    }


    return (
      <Link key={item.name} href={item.href} {...(item.target ? { target: item.target } : {})} className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${pathname === item.href ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md" : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}`} onClick={() => isMobile && setSidebarOpen(false)}>
        <item.icon className={`mr-3 h-5 w-5 ${pathname === item.href ? "text-white" : getIconColor(item.name)}`} />
        {item.name}
      </Link>
    )
  }

  const getIconColor = (itemName: string) => {
    const colorMap: { [key: string]: string } = {
      Dashboard: "text-indigo-500", "User Management": "text-orange-500", "Lead Management": "text-blue-500",
      "Lead Assignment": "text-green-500", "AI Deal Assistant": "text-violet-500", "Marketing Funnel": "text-purple-500", "Sales Conversion Report": "text-orange-500",
      "Calling Panel": "text-green-500", "Sales Report": "text-orange-500", "Calls Report": "text-green-500",
      Performance: "text-red-500", Reports: "text-purple-500", "Help Desk": "text-gray-500",
      "Sales Management": "text-orange-500", "Partner Onboarding System": "text-emerald-600",
    }
    return colorMap[itemName] || "text-gray-500"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 bg-gradient-to-r from-indigo-600 to-indigo-700">
            <div className="flex items-center gap-2">
              <img src="/kairali-logo-green-leaf-ayurveda.png" alt="Kairali Logo" className="w-10 h-10 p-1 bg-white rounded-full shadow" />
              <h1 className="text-xl font-bold text-white">Kairali Group</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="text-white hover:bg-white/20">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
            {filteredNavigation.map((item) => renderNavigationItem(item, true))}
          </nav>
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role.replace("_", " ")}</p>
                <p className="text-xs text-gray-400">{user?.employeeId}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-red-50 hover:text-red-600">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64">
        <div className="flex h-full flex-col bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-lg">
          <div className="flex h-16 items-center px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <img src="/kairali-logo-green-leaf-ayurveda.png" alt="Kairali Logo" className="w-10 h-10 p-1 bg-white rounded-full shadow" />
              <h1 className="text-xl font-bold text-white">Kairali Group</h1>
            </div>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
            {filteredNavigation.map((item) => renderNavigationItem(item))}
          </nav>
          <div className="p-4 border-t bg-gray-50 flex-shrink-0">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role.replace("_", " ")}</p>
                <p className="text-xs text-gray-400">{user?.employeeId}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-red-50 hover:text-red-600">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <img src="/kairali-logo-green-leaf-ayurveda.png" alt="Kairali Logo" className="lg:hidden w-8 h-8 p-0.5 bg-white rounded-full shadow flex-shrink-0" />
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center gap-4">
              <h2 className="text-[0.75rem] leading-tight sm:text-lg font-semibold text-gray-900 max-w-[110px] sm:max-w-none">{user?.company}<br className="sm:hidden" /><span className="sm:hidden"> </span> Kairali CRM System</h2>
              <div className="hidden md:flex flex-1 max-w-md relative">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder="Search modules, reports..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  {searchQuery.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                      {searchResults.length === 0 ? (
                        <div className="p-3 text-sm text-gray-600">No results for "{searchQuery}"</div>
                      ) : (
                        searchResults.map((result) => {
                          const IconComponent = result.icon
                          return (
                            <Link key={result.name} href={result.href} onClick={() => setSearchQuery("")} className="block px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0">
                              <div className="flex items-center gap-3">
                                <IconComponent className="h-4 w-4 text-gray-500" />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{result.name}</div>
                                  <div className="text-xs text-gray-600">{result.description}</div>
                                </div>
                              </div>
                            </Link>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative" ref={notifRef}>
                <Button variant="outline" size="sm" onClick={() => setNotifOpen((v) => !v)} className="relative hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-300 transition-all duration-200 bg-transparent">
                  <Bell className={`h-4 w-4 ${unreadCount > 0 ? "text-yellow-500" : "text-gray-500"} sm:mr-2`} />
                  <span className="hidden sm:inline">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center border-2 border-white leading-none">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                {notifOpen && (
                  <div className="fixed sm:absolute top-16 sm:top-[calc(100%+12px)] left-2 right-2 sm:left-auto sm:right-0 sm:w-[400px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-200 z-[100] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        Notifications
                        {unreadCount > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                      </h3>
                      <div className="flex items-center gap-3">
                        {/* <button onClick={() => triggerDemoNotification?.()} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider">Test Alert</button> */}
                        <div className="w-px h-3 bg-slate-200" />
                        <button onClick={markAllAsRead} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider">Mark Read</button>
                        <div className="w-px h-3 bg-slate-200" />
                        <button onClick={clearAllNotifications} className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider">Clear All</button>
                      </div>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-xl">🎉</div>
                          <p className="text-sm font-medium text-slate-500">All caught up!</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markAsRead(n.id);
                              if (n.link) window.open(n.link, "_blank");
                              setNotifOpen(false);
                            }}
                            className={`px-5 py-4 border-b border-slate-50 last:border-b-0 flex gap-4 transition-all cursor-pointer hover:bg-slate-50 ${!n.read ? "bg-blue-50/40" : ""}`}
                          >
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${n.type === 'system' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {n.type === 'system' ? <Info className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[13px] font-bold text-slate-900 truncate pr-4">{n.title}</span>
                                {!n.read && <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />}
                              </div>
                              <p className="text-[12px] text-slate-600 line-clamp-2 leading-relaxed mb-2">{n.body}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400">{new Date(n.time).toLocaleDateString()} at {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {n.notifId && <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">#{n.notifId}</span>}
                              </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeNotification(n.id) }} className="text-slate-300 hover:text-slate-500 transition-colors p-1 -mt-1 -mr-1">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                      <button onClick={() => checkForUpdates()} className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 py-2 rounded-lg transition-all w-full flex items-center justify-center gap-2 shadow-sm">
                        <RefreshCcw className="h-3 w-3" /> Check for updates now
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleClearCache} disabled={isClearingCache} className="hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-all duration-200 bg-transparent">
                <div className={`h-4 w-4 mr-2 ${isClearingCache ? "animate-spin" : ""}`}>🧹</div>
                <span className="hidden sm:inline">{isClearingCache ? "Clearing cache & refreshing..." : "Clear Cache"}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 bg-transparent">
                <div className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}>🔄</div>
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {user ? getUserInitials(user.name) : "U"}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role.replace("_", " ")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <main className="py-6 sm:py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
