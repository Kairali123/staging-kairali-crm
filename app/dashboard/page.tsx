"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────────────────────

interface FmsCard {
  type: "fms"
  name: string
  href: string
  icon: string
  desc: string
  pending: number
  pendingPct: string
  delay: string
  permission?: string
}

interface StandardCard {
  type: "report" | "other"
  name: string
  href: string
  icon: string
  desc: string
  permission?: string
}

type QuickCard = FmsCard | StandardCard

// ─── Constants (outside component to avoid recreation on every render) ────────

const allCards: QuickCard[] = [
  {
    type: "fms",
    name: "KTAHV Booking FMS",
    href: "/fms/bookings/team",
    icon: "🏝️",
    desc: "Team Booking Management",
    pending: 10,
    pendingPct: "2%",
    delay: "3 Days",
    permission: "team.view",
  },
  {
    type: "fms",
    name: "Villa Raag Booking FMS",
    href: "/fms/bookings/villa-raag",
    icon: "🏖️",
    desc: "Villa Raag Booking Management",
    pending: 5,
    pendingPct: "1%",
    delay: "1 Day",
    permission: "villa_raag.view",
  },
  {
    type: "fms",
    name: "KTAHV CRR Calling FMS",
    href: "/crr-fms",
    icon: "🏖️",
    desc: "KTAHV CRR Calling Management",
    pending: 5,
    pendingPct: "1%",
    delay: "1 Day",
    permission: "crr_fms.view",
  },
  {
    type: "fms",
    name: "FMS Pending Bottleneck Tracker",
    href: "/fms/pending-tasks",
    icon: "📈",
    desc: "Pending Task Management",
    pending: 5,
    pendingPct: "1%",
    delay: "1 Day",
    permission: "task_fms.view",
  },
  {
    type: "fms",
    name: "K-Serve Billing Auditor",
    href: "/ksereve-billing-auditer",
    icon: "📞",
    desc: "Call Recording Audit & Reconciliation",
    pending: 4,
    pendingPct: "12%",
    delay: "2 Days",
    permission: "bill_fms.view",
  },
  {
    type: "report",
    name: "New Order FMS",
    href: "/new-order-fms",
    icon: "📦",
    desc: "Manage and track new orders",
    permission: "new-order-fms.view",
  },
  {
    type: "report",
    name: "Sales Report",
    href: "/sales/reports",
    icon: "📈",
    desc: "View sales analytics",
    permission: "sales_report.view",
  },
  {
    type: "report",
    name: "Calls Report",
    href: "/calls/reports",
    icon: "📞",
    desc: "View call logs & performance",
    permission: "calls_report.view",
  },
  {
    type: "report",
    name: "Facebook Reports",
    href: "/marketing/facebook-ppc",
    icon: "📘",
    desc: "Facebook ads performance",
    permission: "marketing_facebook_report.view",
  },
  {
    type: "report",
    name: "Cold Enquiry Reverification",
    href: "/fms/enquiry-reverification",
    icon: "📞",
    desc: "Manage and track cold enquiry re-verification",
    permission: "cold_enquiry_reverification.view",
  },

  {
    type: "report",
    name: "Google PPC Reports",
    href: "/marketing/google-ppc",
    icon: "🔍",
    desc: "Google PPC ads reports",
    permission: "marketing_google_report.view",
  },
  {
    type: "report",
    name: "Google Adword Reports",
    href: "/google-adword-reports",
    icon: "📊",
    desc: "Google Ads campaign expense data",
    permission: "google_adword_report.view",
  },
  {
    type: "other",
    name: "Lead Assignment",
    href: "/leads/assign",
    icon: "🎯",
    desc: "Assign and manage leads",
    permission: "leads.view",
  },
  {
    type: "other",
    name: "AI Deal Assistant",
    href: "/deal-assistant",
    icon: "✨",
    desc: "Track stalled leads & auto-draft follow-ups",
    permission: "deal_assistant.view",
  },
  {
    type: "other",
    name: "Marketing Funnel",
    href: "/marketing-funnel",
    icon: "📈",
    desc: "Marketing funnel analytics",
    permission: "marketing_funnel.view",
  },
  {
    type: "other",
    name: "Partner Onboarding",
    href: "/partners",
    icon: "🤝",
    desc: "Manage partner leads",
    permission: "partners.view",
  },
  {
    type: "other",
    name: "AI Voice — Sent",
    href: "/voicecall/data/sent",
    icon: "🎙️",
    desc: "AI outreach log & KServe callbacks",
    permission: "ai_voice_sent.view",
  },
  {
    type: "other",
    name: "AI Voice — Received",
    href: "/voicecall/data/received",
    icon: "🎙️",
    desc: "AI outreach log & KServe callbacks",
    permission: "ai_voice_received.view",
  }
  ,
  {
    type: "other",
    name: "AI Voice — Summary Report",
    href: "/voicecall/summary",
    icon: "🤖",
    desc: "Lead qualification analytics & charts",
    permission: "ai_voice_summary.view",
  },
  {
    type: "other",
    name: "AI Voice — Non-Qualified",
    href: "/voicecall/non-qualified",
    icon: "🤖",
    desc: "Lead qualification analytics & charts",
    permission: "ai_voice_non_qualified.view",
  },
  {
    type: "other",
    name: "KTAHV Accounts Tracker",
    href: "/accounts-tracker",
    icon: "📊",
    desc: "Manage accounts tracking",
    permission: "accounts_tracker.view",
  },

  {
    type: "other",
    name: "Riya Sharma",
    href: "/riya-sharma",
    icon: "🎙️",
    desc: "complaints analytics",
    permission: "riya_sharma.view",
  },
  {
    type: "other",
    name: "Meeting Insights",
    href: "/meetings",
    icon: "🤖",
    desc: "AI - Meeting summaries, action items, and follow-ups",
    permission: "meetings.view",
  },
  {
    type: "other",
    name: "MR FMS",
    href: "/MR-FMS",
    icon: "📘",
    desc: "Manage MR FMS",
    permission: "mr-fms.view",
  }

]

const cardBase =
  "group flex flex-col rounded-xl bg-white cursor-pointer text-inherit no-underline transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_28px_rgba(30,58,74,0.38)] hover:bg-[#1e3a4a]"

const borderByType: Record<string, string> = {
  fms: "border border-[#bbf7d0] shadow-[0_1px_6px_rgba(34,197,94,0.07)] hover:border-[#22c55e]",
  report: "border border-[#c7d2fe] shadow-[0_1px_6px_rgba(99,102,241,0.06)] hover:border-[#818cf8]",
  other: "border border-[#fde68a] shadow-[0_1px_6px_rgba(245,158,11,0.06)] hover:border-[#fbbf24]",
}

// ─── CursorIcon ───────────────────────────────────────────────────────────────

function CursorIcon() {
  return (
    <svg
      className="w-[13px] h-[13px]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"
      />
    </svg>
  )
}

// ─── LiveBadge ────────────────────────────────────────────────────────────────
// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [loginTime, setLoginTime] = useState<Date | null>(null)
  const [sessionDuration, setSessionDuration] = useState<string>("")
  const [lastLoginTime, setLastLoginTime] = useState<Date | null>(null)

  // Auth redirect
  useEffect(() => {
    if (!isLoading && !user) router.push("/")
  }, [user, isLoading, router])

  // Login time
  useEffect(() => {
    if (user && !loginTime) {
      const storedLogin = localStorage.getItem("loginTime")
      const storedLast = localStorage.getItem("lastLoginTime")
      if (storedLogin) {
        setLoginTime(new Date(storedLogin))
      } else {
        const now = new Date()
        setLoginTime(now)
        localStorage.setItem("loginTime", now.toISOString())
      }
      if (storedLast) setLastLoginTime(new Date(storedLast))
      localStorage.setItem("lastLoginTime", new Date().toISOString())
    }
  }, [user, loginTime])

  // Session timer
  useEffect(() => {
    if (!loginTime) return
    const update = () => {
      const diff = Date.now() - loginTime.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setSessionDuration(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [loginTime])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  // ── Permission filter ─────────────────────────────────────────────────────

  const filteredCards = allCards.filter(
    (c) =>
      !c.permission ||
      user.permissions.includes("all") ||
      user.permissions.includes(c.permission)
  )

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Main Content ── */}
      <div className="w-full px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex flex-col gap-3 sm:gap-4">

        {/* ── Welcome Banner ── */}
        <div
          className="w-full rounded-2xl overflow-hidden shadow-[0_6px_24px_rgba(15,74,87,0.3)]"
          style={{ background: "linear-gradient(135deg,#1a5c6b 0%,#0f4a57 55%,#0d3d4a 100%)" }}
        >
          <div className="px-5 py-5 sm:px-8 sm:py-[26px]">

            {/* ── MOBILE layout: stacked ── */}
            <div className="flex flex-col gap-4 sm:hidden">
              <div className="flex items-center gap-4">
                <div className="w-[60px] h-[60px] rounded-full border-[3px] border-white/35 flex-shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden bg-[#1a5c6b]">
                  <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-[1.15rem] font-semibold text-white leading-tight">Welcome back,</div>
                  <div className="text-[1.15rem] font-semibold text-yellow-400 leading-tight">{user.name}!</div>
                </div>
              </div>
              {/* Meta chips */}
              <div className="flex flex-wrap gap-[6px]">
                {[
                  { icon: "👤", label: "ID", value: user.employeeId },
                  { icon: "🏢", label: "Company", value: user.company },
                  { icon: "🏛️", label: "Dept", value: user.department },
                  { icon: "🔐", label: "Access", value: `${user.permissions.length} Modules` },
                ].map((item) => (
                  <span key={item.label} className="inline-flex items-center gap-1 bg-white/10 border border-white/15 rounded-full px-2.5 py-1 text-[0.7rem] text-slate-300">
                    <span>{item.icon}</span>
                    <span className="opacity-60">{item.label}</span>
                    <span className="font-semibold text-slate-200">{item.value}</span>
                  </span>
                ))}
              </div>
              {/* Session info */}
              <div className="bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-[0.75rem] flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span>🕐</span><span className="text-slate-400 w-[65px]">Login</span>
                  <span className="font-semibold text-slate-200 tabular-nums ml-auto">{loginTime?.toLocaleString() ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>⏱️</span><span className="text-slate-400 w-[65px]">Session</span>
                  <span className="font-semibold text-slate-200 tabular-nums ml-auto">{sessionDuration || "—"}</span>
                </div>
                {lastLoginTime && (
                  <div className="flex items-center gap-2">
                    <span>📅</span><span className="text-slate-400 w-[65px]">Last Login</span>
                    <span className="font-semibold text-slate-200 tabular-nums ml-auto">{lastLoginTime.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── DESKTOP layout: side by side ── */}
            <div className="hidden sm:flex items-center gap-[22px] flex-wrap">
              <div className="w-24 h-24 rounded-full border-[3px] border-white/35 flex-shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden bg-[#1a5c6b]">
                <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[1.9rem] font-semibold leading-tight mb-[11px]">
                  <span className="text-white">Welcome back, </span>
                  <span className="text-yellow-400">{user.name}!</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-[6px] gap-y-2 text-[0.8rem] text-slate-300">
                  <span className="flex items-center gap-[5px]">
                    <span>👤</span><span className="opacity-60">Employee ID</span>
                    <span className="font-semibold text-slate-200">{user.employeeId}</span>
                  </span>
                  <span className="text-white/20">|</span>
                  <span className="flex items-center gap-[5px]">
                    <span>🏢</span><span className="opacity-60">Company</span>
                    <span className="font-semibold text-slate-200">{user.company}</span>
                  </span>
                  <span className="text-white/20">|</span>
                  <span className="flex items-center gap-[5px]">
                    <span>🏛️</span><span className="opacity-60">Department</span>
                    <span className="font-semibold text-slate-200">{user.department}</span>
                  </span>
                  <span className="text-white/20">|</span>
                  <span className="flex items-center gap-[5px]">
                    <span>🔐</span><span className="opacity-60">Access</span>
                    <span className="font-semibold text-slate-200">{user.permissions.length} Modules</span>
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 bg-white/[0.07] border border-white/10 rounded-xl px-5 py-[14px] text-[0.8rem] flex flex-col gap-[9px] min-w-[270px]">
                <div className="flex items-center gap-3">
                  <span className="opacity-80">🕐</span>
                  <span className="text-slate-400 w-[75px] flex-shrink-0">Login</span>
                  <span className="font-semibold text-slate-200 tabular-nums">{loginTime?.toLocaleString() ?? "—"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="opacity-80">⏱️</span>
                  <span className="text-slate-400 w-[75px] flex-shrink-0">Session</span>
                  <span className="font-semibold text-slate-200 tabular-nums">{sessionDuration || "—"}</span>
                </div>
                {lastLoginTime && (
                  <div className="flex items-center gap-3">
                    <span className="opacity-80">📅</span>
                    <span className="text-slate-400 w-[75px] flex-shrink-0">Last Login</span>
                    <span className="font-semibold text-slate-200 tabular-nums">{lastLoginTime.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Quick Access Divider ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-[0.9rem] sm:text-[1rem] font-semibold text-gray-500 whitespace-nowrap px-2 tracking-wide">
            Quick Access
          </span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        {/* ── Cards Grid ── */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filteredCards.map((card) => {
            const isFms = card.type === "fms"
            return (
              <Link
                key={card.name}
                href={card.href}
                className={`${cardBase} ${borderByType[card.type]}`}
              >
                {/* ── Card Header ── */}
                <div className="p-4 pb-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.95rem] font-semibold text-[#1e3a4a] leading-snug mb-[6px] group-hover:text-white transition-colors">
                      {card.name}
                    </div>
                    <div className="text-[0.73rem] text-gray-500 leading-[1.45] group-hover:text-white/55 transition-colors">
                      {card.desc}
                    </div>
                  </div>
                  <div className="text-[1.6rem] flex-shrink-0 mt-[1px]">{card.icon}</div>
                </div>

                <hr className="mx-4 border-0 border-t border-gray-100 group-hover:border-white/10 transition-colors" />

                {/* ── Card Footer ── */}
                <div className="px-4 py-[10px] pb-[14px] flex items-center justify-start gap-[10px] mt-auto">
                  <span className="inline-flex items-center gap-[6px] bg-[#467a9a] text-white text-[0.76rem] font-semibold px-[14px] py-[7px] rounded-[7px] border border-transparent whitespace-nowrap transition-all group-hover:bg-white/[0.12] group-hover:border-white/[0.22]">
                    Open <CursorIcon />
                  </span>
                </div>

              </Link>
            )
          })}
        </div>

      </div>
    </div>
  )
}
