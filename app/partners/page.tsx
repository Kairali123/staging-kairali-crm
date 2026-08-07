"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import { BackButton } from "@/components/back-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
    Search, Filter, Eye, Pencil, X, Users, Globe, Building2,
    ChevronUp, ChevronDown, ChevronsUpDown, CheckCircle2, XCircle,
    Clock, AlertCircle, AlertTriangle, Calendar, DollarSign, BarChart3,
    UserCheck, FileText, RefreshCw, Handshake, Ban, ShieldCheck,
    ExternalLink, Hash, Zap, Bot, CheckSquare, Activity, Plus,
    TrendingUp, Flame, ChevronRight, MessageSquare, ClipboardList,
    Star, Award, Target, CreditCard, Lightbulb, ZapIcon
} from "lucide-react"
import ContactCaptureModal, { type ContactCaptureData } from "@/components/contact-capture-modal"
import Part2Modal, { type Part2Data } from "@/components/parner-qualify-modal"
import Part3Modal, { type Part3Data } from "@/components/billing-and-partner-intelligance-modal"


// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface B2BLead {
    _rowIndex: number
    Timestamp: string; Lead_ID: string; Business_Name: string
    Contact_Person: string; Email: string; Phone: string
    Country: string; Category: string; Business_Phone: string
    Position: string; Event_Place: string; Event_Name: string
    Event_Date: string; Website: string; Address: string
    Second_Email: string; Attended_By: string; Ways_to_Contact: string
    Card_Image_URL: string; Potential_Business_Rs: string
    Client_Capacity: string; Brand_Business_Unit_Interest: string
    Healing_Village_Details: string; Villa_Raag_Details: string
    Kairali_Products_Details: string; Training_Education_Details: string
    Kairali_Centers_Details: string; Focus_Needs: string
    Previous_Ayurveda_Experience: string; How_Did_You_Hear: string
    Remarks: string; Assigned_To: string; Next_Followup_Date: string
    Followup_Status: string; Consent: string
    Assigned_To_CRR: string; Next_Followup_Date_CRR: string
    Followup_Status_CRR: string; sentToCallsheet: string
    Lead_Type: string; Planned_CRR: string; Actual_CRR: string
    Delay_CRR: string; Remarks_CRR: string; Status_CRR: string
    Status: string; Priority: string; Behavior_Classification: string
    Reinitiate_Recommendation: string; Last_Activity: string
    Gmail_Thread_ID: string; OpenAI_Thread_ID: string
    Created_Date: string; Sent_Date: string; Last_Modified: string
    Subject: string; Error: string; Next_Followup_Date_AI: string
    Follow_Up_Reason: string; Client_Stage: string
    Human_Actively_Engaged: string; Last_Human_Interaction_Date: string
    Last_AI_Analysis: string; Client_Pattern: string
    Min_Follow_Up_Gap_Hours: string; Total_Emails_Sent: string
    Total_Emails_Received: string; Engagement_State: string
    Last_Open_Date: string; Last_Click_Date: string
    Days_Since_Last_Email: string; Months_Since_Last_Engagement: string
    Last_Contact_Type: string; Phase: string
    Reengagement_Attempted: string; Sunset_Status: string
    part1_JSON?: string
    part2_JSON?: string
    part3_JSON?: string
}

interface TravelAgent {
    _rowIndex: number
    Timestamp: string; ID: string; Agency_Name: string
    Category: string; Commission_Type: string; Currency: string
    Contact_Person: string; Mobile: string; Email_ID: string
    Country_Code: string; Website: string; Country: string
    State: string; City: string; Agreement_Copy_Link: string
    Taking_Care_1: string; Other_Documents_Link: string
    Office_Contact: string; Taking_Care_2: string
    Agency_Address: string; Pincode: string; Years_Experience: string
    Specialization: string; GST_Number: string; PAN_Number: string
    Aadhar_Number: string; Account_Number: string; IFSC_Code: string
    Bank_Name: string; Upload_GST_Cert: string; Upload_PAN_Card: string
    Upload_Aadhar_Card: string; Upload_Cancelled_Cheque: string
    Upload_Logo: string; Remarks: string; Referral_Code: string
    Taking_Care_3: string; Company_Related_To: string; Commission_Pct: string
    TA_Profile_Link: string; Last_Sale_Days_Old: string
    Total_Bookings_Given: string; Total_Sale_Given: string
    Rank: string; NBD_CRR: string; Planned: string; Actual: string
    Time_Delay: string; Doer: string; Verified_Status: string
    Verifier_Remarks: string; Verified_Commission_Pct: string
    Valid_Till_Date: string
    GST_Cert_Verified: boolean; PAN_Card_Verified: boolean
    Aadhar_Card_Verified: boolean; Bank_Details_Verified: boolean
    Agency_Address_Verified: boolean; Phone_Number_Verified: boolean
    Email_ID_Verified: boolean; Website_Validity_Checked: boolean
    Experience_Verified: boolean
    Email_To_TA_Done: string; Email_Alert_To_Employee: string
    WhatsApp_Alert_To_Employee: string; HT_Create_Threshold: string
}

interface RejectedPartner {
    _rowIndex: number
    Timestamp: string; Lead_ID: string; Business_Name: string
    Contact_Person: string; Email: string; Phone: string
    Country: string; Category: string; Client_Stage: string
    Priority: string; Assigned_To: string
    Potential_Business_Rs: string
    Rejection_Category: string; Rejection_Remarks: string
    Rejected_By_Name: string
}

interface BookingRecord {
    date: string
    clientName: string
    clientMobile: string
    clientEmail: string
    bookingId: string
    bookingAmount: string | number
    bookingStatus: string
    agentName: string
    agentMobile: string
    agentEmail: string
    takenBy: string
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FORM_URL = "https://script.google.com/macros/s/AKfycbxRd-RX7iZUcJ2yCXDAIS81d1SJXV08JkgalI8PYhv56ZuU3NevcxsoKQaPOcth5a5r/exec"
const FOM_URL = "https://b2b-kairali.vercel.app/login"
const EDIT_FORM_URL = FORM_URL
const BOOKING_API = "https://script.google.com/macros/s/AKfycbwLa1rvsE0ahNwMrfL0mPyaCK-0G9rm4LL7f_y0IbhaVqUXr-O1z08oLJhJJSycNKR15w/exec"

const REJECTED_STAGES = [
    "rejected", "lost", "unresponsive", "sunset",
    "dropped", "closed - lost", "do not contact",
]

const REJECTION_REASON_OPTIONS = [
    "Commission Terms Not Agreed",
    "Pricing or Commercial Misalignment",
    "Incomplete Documentation",
    "KYC / Verification Failed",
    "Insufficient Experience or Track Record",
    "Operational Capacity Not Adequate",
    "Business Not Aligned with Our Portfolio",
    "Geographic Coverage Not Suitable",
    "Duplicate / Already Onboarded",
    "Unresponsive During Onboarding",
    "Partnership Terms Declined by Applicant",
    "Low Quality or Irrelevant Leads",
    "Negative Past Performance or History",
    "Compliance or Legal Risk Identified",
    "Suspected Fraudulent Activity",
    "Other",
];

const BRAND_LABEL_MAP: Record<string, string> = {
    "healing-village": "KTAHV",
    "villa-raag": "VILLA RAAG",
    "healing-village, villa-raag": "Both",
    "villa-raag, healing-village": "Both",
    "kairali the ayurvedic healing village": "KTAHV",
    "ktahv": "KTAHV",
    "kairali ayurvedic healing village": "KTAHV",
    "villa raag": "VILLA RAAG",
    "kairali-the ayurvedic healing village-palakkad": "KTAHV",
    "villa raag goa": "VILLA RAAG",
    "kairali products": "KAPPL",
    "kairali centre": "KAC",
    "kairali equipments": "Equipment",
    "products": "KAPPL",
    "centre": "KAC",
    "equipment": "Equipment",
    "equipments": "Equipment",
}

const BRAND_ORDER = ["KTAHV", "VILLA RAAG", "KAPPL", "KAC", "Equipment", "Both"]

const PRIORITY_STYLES: Record<string, string> = {
    High: "bg-red-100 text-red-700",
    HIGH: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    Low: "bg-slate-100 text-slate-500",
    LOW: "bg-slate-100 text-slate-500",
}

const STAGE_STYLES: Record<string, string> = {
    New: "bg-blue-50    text-blue-700    border-blue-200",
    Contacted: "bg-indigo-50  text-indigo-700  border-indigo-200",
    "Follow-up": "bg-violet-50  text-violet-700  border-violet-200",
    Engaged: "bg-cyan-50    text-cyan-700    border-cyan-200",
    Interested: "bg-teal-50    text-teal-700    border-teal-200",
    Negotiation: "bg-orange-50  text-orange-700  border-orange-200",
    "Hot Lead": "bg-red-50     text-red-700     border-red-200",
    "Warm Lead": "bg-orange-50  text-orange-600  border-orange-200",
    Onboarded: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (v?: any) => {
    if (v === null || v === undefined) return "—"
    const value = String(v).trim()
    return value.length ? value : "—"
}

const fmtDate = (v?: any) => {
    if (!v) return "—"
    try {
        const d = new Date(v)
        if (isNaN(d.getTime())) return String(v)
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
    } catch {
        return String(v)
    }
}

const fmtDuration = (v?: any) => {
    if (!v) return "—"
    const s = String(v).trim()
    if (s.match(/^1899-|^1900-/)) {
        try {
            const d = new Date(s)
            const hh = d.getUTCHours()
            const mm = String(d.getUTCMinutes()).padStart(2, "0")
            return hh > 0 ? `${hh}h ${mm}m` : `${d.getUTCMinutes()}m`
        } catch { return s }
    }
    return s
}

const calculateDelay = (planned?: string, actual?: string) => {
    if (!planned || !actual) return "—"
    const p = new Date(planned).getTime()
    const a = new Date(actual).getTime()
    if (isNaN(p) || isNaN(a)) return "—"
    let diff = a - p
    if (diff < 0) diff = 0
    const totalMinutes = Math.floor(diff / (1000 * 60))
    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60
    const dd = String(days).padStart(2, "0")
    const hh = String(hours).padStart(2, "0")
    const mm = String(minutes).padStart(2, "0")
    return `${dd}:${hh}:${mm}`
}

const fmtCurrency = (n: number) => {
    return "₹" + new Intl.NumberFormat('en-US').format(Math.round(n))
}

function InfoRow({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
    return (
        <div className="flex flex-col gap-1.5 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none">{label}</span>
            <span className={`text-sm font-semibold text-slate-800 break-words leading-snug ${mono ? "font-mono text-xs text-slate-700" : ""}`}>
                {fmt(value)}
            </span>
        </div>
    )
}

function SectionCard({ title, icon, color = "blue", children }: {
    title: string; icon: React.ReactNode; color?: string; children: React.ReactNode
}) {
    const L: Record<string, string> = {
        blue: "border-l-blue-500 bg-blue-50", green: "border-l-emerald-500 bg-emerald-50",
        emerald: "border-l-emerald-500 bg-emerald-50",
        amber: "border-l-amber-500 bg-amber-50", purple: "border-l-purple-500 bg-purple-50",
        rose: "border-l-rose-500 bg-rose-50", indigo: "border-l-indigo-500 bg-indigo-50",
        slate: "border-l-slate-400 bg-slate-50", orange: "border-l-orange-500 bg-orange-50",
    }
    const H: Record<string, string> = {
        blue: "bg-blue-100 border-blue-200 text-blue-800",
        green: "bg-emerald-100 border-emerald-200 text-emerald-800",
        emerald: "bg-emerald-100 border-emerald-200 text-emerald-800",
        amber: "bg-amber-100 border-amber-200 text-amber-800",
        purple: "bg-purple-100 border-purple-200 text-purple-800",
        rose: "bg-rose-100 border-rose-200 text-rose-800",
        indigo: "bg-indigo-100 border-indigo-200 text-indigo-800",
        slate: "bg-slate-100 border-slate-200 text-slate-700",
        orange: "bg-orange-100 border-orange-200 text-orange-800",
    }
    return (
        <div className={`border-l-4 rounded-lg overflow-hidden shadow-sm ${L[color]}`}>
            <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${H[color]}`}>
                {icon}<h3 className="text-sm font-semibold tracking-wide">{title}</h3>
            </div>
            <div className="p-4 bg-white">{children}</div>
        </div>
    )
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
    return (
        <div className="flex items-center gap-2">
            {checked
                ? <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                : <div className="w-4 h-4 border-2 border-slate-300 rounded flex-shrink-0" />}
            <span className={`text-xs ${checked ? "text-emerald-700 font-medium" : "text-slate-500"}`}>{label}</span>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export default function PartnersPage() {
    const { user } = useAuth()

    const table1Ref = useRef<HTMLDivElement>(null)
    const table2Ref = useRef<HTMLDivElement>(null)
    const table3Ref = useRef<HTMLDivElement>(null)

    const [leads, setLeads] = useState<B2BLead[]>([])
    const [travelAgents, setTravelAgents] = useState<TravelAgent[]>([])
    const [rejectedPartners, setRejectedPartners] = useState<RejectedPartner[]>([])

    const [loadingLeads, setLoadingLeads] = useState(true)
    const [loadingTA, setLoadingTA] = useState(true)
    const [loadingRejected, setLoadingRejected] = useState(true)
    const [errorLeads, setErrorLeads] = useState("")
    const [errorTA, setErrorTA] = useState("")
    const [errorRejected, setErrorRejected] = useState("")

    const [search, setSearch] = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [filterPriority, setFilterPriority] = useState("all")
    const [filterStage, setFilterStage] = useState("all")
    const [filterCategory, setFilterCategory] = useState("all")
    const [filterAssigned, setFilterAssigned] = useState("all")
    const [filterVerified, setFilterVerified] = useState("all")
    const [filterTACategory, setFilterTACategory] = useState("all")
    const [filterBrand, setFilterBrand] = useState("KTAHV")
    const [filterDateRange, setFilterDateRange] = useState("today")
    const [dateRangeStart, setDateRangeStart] = useState("")
    const [dateRangeEnd, setDateRangeEnd] = useState("")

    const [sortBy, setSortBy] = useState("")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
    const [sortBy2, setSortBy2] = useState("")
    const [sortOrder2, setSortOrder2] = useState<"asc" | "desc">("asc")
    const [sortBy3, setSortBy3] = useState("")
    const [sortOrder3, setSortOrder3] = useState<"asc" | "desc">("asc")

    const [page1, setPage1] = useState(1)
    const [perPage1, setPerPage1] = useState(5)
    const [goTo1, setGoTo1] = useState("")
    const [page2, setPage2] = useState(1)
    const [perPage2, setPerPage2] = useState(5)
    const [goTo2, setGoTo2] = useState("")
    const [page3, setPage3] = useState(1)
    const [perPage3, setPerPage3] = useState(5)
    const [goTo3, setGoTo3] = useState("")

    const leadBrandMap = useMemo(() => {
        const m = new Map<string, string>()
        leads.forEach(l => {
            if (!l.Lead_ID) return
            const raw = String(l.Brand_Business_Unit_Interest || "").trim().toLowerCase()
            if (!raw) return
            m.set(l.Lead_ID, BRAND_LABEL_MAP[raw] ?? raw)
        })
        return m
    }, [leads])

    const [viewLead, setViewLead] = useState<B2BLead | null>(null)
    const [viewTA, setViewTA] = useState<TravelAgent | null>(null)
    const [viewRejected, setViewRejected] = useState<RejectedPartner | null>(null)
    const [viewLeadTab, setViewLeadTab] = useState("main_info")
    const [viewTATab, setViewTATab] = useState("agency")
    const [viewRejectedTab, setViewRejectedTab] = useState("rejection")
    const [activePart, setActivePart] = useState<"part1" | "part2" | "part3" | null>(null)
    const [activePartHasData, setActivePartHasData] = useState(false)
    const [editingLead, setEditingLead] = useState<B2BLead | null>(null)
    const [modalInitialData, setModalInitialData] = useState<Partial<ContactCaptureData>>({})
    const [isModalLocked, setIsModalLocked] = useState(false)
    const [isPart2Open, setIsPart2Open] = useState(false)
    const [selectedLeadForPart2, setSelectedLeadForPart2] = useState<B2BLead | null>(null)
    const [part2InitialData, setPart2InitialData] = useState<Partial<Part2Data>>({})
    const [isPart2Locked, setIsPart2Locked] = useState(false)

    const [isPart3Open, setIsPart3Open] = useState(false)
    const [selectedLeadForPart3, setSelectedLeadForPart3] = useState<B2BLead | null>(null)
    const [part3InitialData, setPart3InitialData] = useState<Partial<Part3Data>>({})
    const [isPart3Locked, setIsPart3Locked] = useState(false)

    const [rejectingLead, setRejectingLead] = useState<B2BLead | null>(null)
    const [rejectionCategory, setRejectionCategory] = useState("")
    const [rejectionReason, setRejectionReason] = useState("")
    const [rejectionError, setRejectionError] = useState("")
    const [isRejecting, setIsRejecting] = useState(false)

    // ── Booking Modal State ───────────────────────────────────────────────────
    const [bookingModalAgentId, setBookingModalAgentId] = useState<string | null>(null)
    const [bookingData, setBookingData] = useState<BookingRecord[]>([])
    const [bookingLoading, setBookingLoading] = useState(false)
    const [bookingError, setBookingError] = useState("")

    const openBookingModal = async (agentId: string) => {
        setBookingModalAgentId(agentId)
        setBookingData([])
        setBookingLoading(true)
        setBookingError("")
        try {
            const res = await fetch(`${BOOKING_API}?agentId=${encodeURIComponent(agentId)}`)
            const j = await res.json()
            if (j.success) setBookingData(j.data || [])
            else setBookingError(j.message || "Failed to load bookings")
        } catch {
            setBookingError("Network error — could not load bookings")
        } finally {
            setBookingLoading(false)
        }
    }

    // Part entries for cross-referencing (Locking)
    const [part1Entries, setPart1Entries] = useState<any[]>([])
    const [loadingPart1, setLoadingPart1] = useState(false)
    const [part2Entries, setPart2Entries] = useState<any[]>([])
    const [loadingPart2, setLoadingPart2] = useState(false)
    const [part3Entries, setPart3Entries] = useState<any[]>([])
    const [loadingPart3, setLoadingPart3] = useState(false)

    // ── fetches ───────────────────────────────────────────────────────────────

    const fetchLeads = useCallback(async () => {
        setLoadingLeads(true)
        setErrorLeads("")
        try {
            const res = await fetch(
                "https://script.google.com/macros/s/AKfycbwiJWIPRo4CgZIJNtTGbNk-MMfCojgJIO3R4iuzbIekTQ5QFgsTscwIlsrWzJKflUuV/exec?action=b2b",
                { cache: "no-store" }
            )
            const j = await res.json()
            if (j.status === "success") {
                setLeads(j.data)
            } else {
                setErrorLeads(j.message || "Failed to load leads")
            }
        } catch (err) {
            setErrorLeads("Network error")
        } finally {
            setLoadingLeads(false)
        }
    }, [])

    const fetchPart1Entries = useCallback(async () => {
        setLoadingPart1(true)
        try {
            const res = await fetch(`${FORM_URL}?action=getAll&part=1`, { cache: "no-store" })
            const j = await res.json()
            if (j.status === "success") setPart1Entries(j.data)
        } catch (err) {
            console.error("Failed to fetch part 1 entries", err)
        } finally {
            setLoadingPart1(false)
        }
    }, [])

    const fetchPart2Entries = useCallback(async () => {
        setLoadingPart2(true)
        try {
            const res = await fetch(`${FORM_URL}?action=getAll&part=2`, { cache: "no-store" })
            const j = await res.json()
            if (j.status === "success") setPart2Entries(j.data)
        } catch (err) {
            console.error("Failed to fetch part 2 entries", err)
        } finally {
            setLoadingPart2(false)
        }
    }, [])

    const fetchPart3Entries = useCallback(async () => {
        setLoadingPart3(true)
        try {
            const res = await fetch(`${FORM_URL}?action=getAll&part=3`, { cache: "no-store" })
            const j = await res.json()
            if (j.status === "success") setPart3Entries(j.data)
        } catch (err) {
            console.error("Failed to fetch part 3 entries", err)
        } finally {
            setLoadingPart3(false)
        }
    }, [])

    const toBool = (val: any): boolean => {
        if (typeof val === "boolean") return val
        const v = String(val).toLowerCase().trim()
        return v === "true" || v === "yes" || v === "1"
    }

    const fetchTA = useCallback(async () => {
        setLoadingTA(true)
        setErrorTA("")
        try {
            const res = await fetch(
                "https://script.google.com/macros/s/AKfycbwiJWIPRo4CgZIJNtTGbNk-MMfCojgJIO3R4iuzbIekTQ5QFgsTscwIlsrWzJKflUuV/exec?action=travel",
                { cache: "no-store" }
            )
            const j = await res.json()
            if (j.status === "success") {
                const cleanedData = j.data.map((t: any) => ({
                    ...t,
                    GST_Cert_Verified: toBool(t.GST_Cert_Verified),
                    PAN_Card_Verified: toBool(t.PAN_Card_Verified),
                    Aadhar_Card_Verified: toBool(t.Aadhar_Card_Verified),
                    Bank_Details_Verified: toBool(t.Bank_Details_Verified),
                    Agency_Address_Verified: toBool(t.Agency_Address_Verified),
                    Phone_Number_Verified: toBool(t.Phone_Number_Verified),
                    Email_ID_Verified: toBool(t.Email_ID_Verified),
                    Website_Validity_Checked: toBool(t.Website_Validity_Checked),
                    Experience_Verified: toBool(t.Experience_Verified),
                }))
                setTravelAgents(cleanedData)
            } else {
                setErrorTA(j.message || "Failed to load")
            }
        } catch {
            setErrorTA("Network error")
        } finally {
            setLoadingTA(false)
        }
    }, [])

    const fetchRejected = useCallback(async () => {
        setLoadingRejected(true)
        setErrorRejected("")
        try {
            const res = await fetch("/api/rejected-partners", { cache: "no-store" })
            const j = await res.json()
            if (j.status === "success") {
                setRejectedPartners(j.data)
            } else {
                setErrorRejected(j.message || "Failed to load rejected partners")
            }
        } catch {
            setErrorRejected("Network error")
        } finally {
            setLoadingRejected(false)
        }
    }, [])

    useEffect(() => {
        fetchLeads()
        fetchPart1Entries()
        fetchPart2Entries()
        fetchPart3Entries()
        fetchTA()
        fetchRejected()
    }, [fetchLeads, fetchPart1Entries, fetchPart2Entries, fetchPart3Entries, fetchTA, fetchRejected])

    // ── derived sets ──────────────────────────────────────────────────────────

    const onboardedIDs = useMemo(() => new Set(travelAgents.map(t => t.ID).filter(Boolean)), [travelAgents])
    const rejectedIDs = useMemo(() => new Set(rejectedPartners.map(r => r.Lead_ID).filter(Boolean)), [rejectedPartners])

    const part1DoneIDs = useMemo(() => new Set(part1Entries.map(e => String(e["CRM Contact ID"] || e.Lead_ID || e.leadId || e.id || "").trim()).filter(Boolean)), [part1Entries])
    const part2DoneIDs = useMemo(() => new Set(part2Entries.map(e => String(e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || "").trim()).filter(Boolean)), [part2Entries])
    const part3DoneIDs = useMemo(() => new Set(part3Entries.map(e => String(e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || "").trim()).filter(Boolean)), [part3Entries])

    useEffect(() => {
        if (!viewLead) return
        const id = String(viewLead.Lead_ID || "").trim()
        const hasPart1 = part1DoneIDs.has(id)
        const hasPart2 = part2DoneIDs.has(id)
        const hasPart3 = part3DoneIDs.has(id)
        if (hasPart1) setViewLeadTab("p1_overview")
        else if (hasPart2) setViewLeadTab("p2_overview")
        else if (hasPart3) setViewLeadTab("p3_overview")
        else setViewLeadTab("main_info")
    }, [viewLead, part1DoneIDs, part2DoneIDs, part3DoneIDs])

    const pendingLeads = useMemo(() =>
        leads.filter(l => {
            const stage = String(l.Client_Stage || "").toLowerCase()
            const sunset = String(l.Sunset_Status || "").toLowerCase()
            return !REJECTED_STAGES.some(s => stage.includes(s))
                && sunset !== "sunset"
                && !onboardedIDs.has(l.Lead_ID)
                && !rejectedIDs.has(l.Lead_ID)
        }), [leads, onboardedIDs, rejectedIDs])

    const selectedDateRange = useMemo(() => {
        const now = new Date()
        const startOf = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c }
        const endOf = (d: Date) => { const c = new Date(d); c.setHours(23, 59, 59, 999); return c }
        switch (filterDateRange) {
            case "today": return { from: startOf(now), to: endOf(now) }
            case "yesterday": { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: startOf(y), to: endOf(y) } }
            case "this_week": { const s = new Date(now); s.setDate(s.getDate() - s.getDay()); return { from: startOf(s), to: endOf(now) } }
            case "last_week": { const s = new Date(now); s.setDate(s.getDate() - s.getDay() - 7); const e = new Date(now); e.setDate(e.getDate() - e.getDay() - 1); return { from: startOf(s), to: endOf(e) } }
            case "this_month": return { from: startOf(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOf(now) }
            case "last_month": { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { from: startOf(s), to: endOf(e) } }
            case "this_year": return { from: startOf(new Date(now.getFullYear(), 0, 1)), to: endOf(now) }
            case "last_year": return { from: startOf(new Date(now.getFullYear() - 1, 0, 1)), to: endOf(new Date(now.getFullYear() - 1, 11, 31)) }
            case "custom": return { from: dateRangeStart ? startOf(new Date(dateRangeStart)) : null, to: dateRangeEnd ? endOf(new Date(dateRangeEnd)) : null }
            default: return { from: null as Date | null, to: null as Date | null }
        }
    }, [filterDateRange, dateRangeStart, dateRangeEnd])

    // ── filtered T1 ───────────────────────────────────────────────────────────

    const filtered1 = useMemo(() => {
        let d = [...pendingLeads].sort((a, b) => b._rowIndex - a._rowIndex)
        const safe = (v: any) => String(v ?? "").toLowerCase()
        if (search.trim()) {
            const q = search.toLowerCase()
            d = d.filter(l =>
                safe(l.Lead_ID).includes(q) || safe(l.Business_Name).includes(q) ||
                safe(l.Contact_Person).includes(q) || safe(l.Email).includes(q) ||
                String(l.Phone ?? "").includes(q) || safe(l.Country).includes(q) ||
                safe(l.Assigned_To).includes(q)
            )
        }
        if (filterPriority !== "all") d = d.filter(l => String(l.Priority ?? "").toUpperCase() === filterPriority.toUpperCase())
        if (filterStage !== "all") d = d.filter(l => String(l.Client_Stage ?? "") === filterStage)
        if (filterCategory !== "all") d = d.filter(l => String(l.Category ?? "") === filterCategory)
        if (filterAssigned !== "all") d = d.filter(l => String(l.Assigned_To ?? "") === filterAssigned)
        if (filterBrand !== "all") {
            d = d.filter(l => {
                const raw = String(l.Brand_Business_Unit_Interest || "").trim().toLowerCase()
                const label = BRAND_LABEL_MAP[raw] ?? raw
                return label === filterBrand
            })
        }
        if (filterDateRange !== "all") {
            const { from, to } = selectedDateRange
            if (from || to) {
                d = d.filter(l => {
                    if (!l.Timestamp) return false
                    const t = new Date(l.Timestamp).getTime()
                    if (from && t < from.getTime()) return false
                    if (to && t > to.getTime()) return false
                    return true
                })
            }
        }
        if (sortBy) {
            const km: Record<string, keyof B2BLead> = {
                name: "Business_Name", contact: "Contact_Person", country: "Country",
                stage: "Client_Stage", priority: "Priority", assigned: "Assigned_To",
                date: "Next_Followup_Date", t1date: "Timestamp", phone: "Phone",
            }
            const k = km[sortBy]
            if (k) {
                const dateKeys: (keyof B2BLead)[] = ["Timestamp", "Next_Followup_Date"]
                d.sort((a, b) => {
                    if (dateKeys.includes(k)) {
                        const ad = new Date(a[k] as string).getTime() || 0
                        const bd = new Date(b[k] as string).getTime() || 0
                        return sortOrder === "asc" ? ad - bd : bd - ad
                    }
                    const av = String(a[k] ?? "")
                    const bv = String(b[k] ?? "")
                    return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
                })
            }
        }
        return d
    }, [pendingLeads, search, filterPriority, filterStage, filterCategory, filterAssigned, filterBrand, filterDateRange, selectedDateRange, sortBy, sortOrder])

    // ── filtered T2 ───────────────────────────────────────────────────────────

    const filtered2 = useMemo(() => {
        let d = [...travelAgents].sort((a, b) => b._rowIndex - a._rowIndex)
        if (search.trim()) {
            const q = search.toLowerCase()
            d = d.filter(t =>
                t.Agency_Name?.toLowerCase().includes(q) || t.Contact_Person?.toLowerCase().includes(q) ||
                t.Email_ID?.toLowerCase().includes(q) || t.Country?.toLowerCase().includes(q) ||
                t.ID?.toLowerCase().includes(q)
            )
        }
        if (filterCategory !== "all") d = d.filter(t => String(t.Category ?? "") === filterCategory)
        if (filterVerified !== "all") d = d.filter(t => filterVerified === "Pending" ? !t.Verified_Status : t.Verified_Status === filterVerified)
        if (filterTACategory !== "all") d = d.filter(t => t.Category === filterTACategory)
        if (filterBrand !== "all") {
            d = d.filter(t => {
                const raw = String(t.Company_Related_To || "").trim().toLowerCase()
                const label = BRAND_LABEL_MAP[raw] ?? raw
                return label === filterBrand
            })
        }
        if (filterDateRange !== "all") {
            const { from, to } = selectedDateRange
            if (from || to) {
                d = d.filter(t => {
                    if (!t.Timestamp) return false
                    const ts = new Date(t.Timestamp).getTime()
                    if (from && ts < from.getTime()) return false
                    if (to && ts > to.getTime()) return false
                    return true
                })
            }
        }
        if (sortBy2) {
            const km2: Record<string, keyof TravelAgent> = {
                t2date: "Timestamp", t2contact: "Contact_Person", t2mobile: "Mobile",
                t2category: "Category", t2commtype: "Commission_Type", t2commpct: "Commission_Pct",
                t2rank: "Rank", t2bookings: "Total_Bookings_Given", t2sales: "Total_Sale_Given",
            }
            const k2 = km2[sortBy2]
            if (k2) {
                d.sort((a, b) => {
                    if (k2 === "Timestamp") {
                        const ad = new Date(a[k2] as string).getTime() || 0
                        const bd = new Date(b[k2] as string).getTime() || 0
                        return sortOrder2 === "asc" ? ad - bd : bd - ad
                    }
                    if (k2 === "Commission_Pct" || k2 === "Total_Bookings_Given" || k2 === "Total_Sale_Given") {
                        const an = parseFloat(String(a[k2] ?? "0").replace(/[₹,]/g, "")) || 0
                        const bn = parseFloat(String(b[k2] ?? "0").replace(/[₹,]/g, "")) || 0
                        return sortOrder2 === "asc" ? an - bn : bn - an
                    }
                    if (k2 === "Rank") {
                        const an = parseFloat(String(a[k2] ?? "0"))
                        const bn = parseFloat(String(b[k2] ?? "0"))
                        if (!isNaN(an) && !isNaN(bn)) return sortOrder2 === "asc" ? an - bn : bn - an
                    }
                    const av = String(a[k2] ?? ""), bv = String(b[k2] ?? "")
                    return sortOrder2 === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
                })
            }
        }
        return d
    }, [travelAgents, search, filterCategory, filterVerified, filterTACategory, filterBrand, filterDateRange, selectedDateRange, sortBy2, sortOrder2])

    // ── filtered T3 ───────────────────────────────────────────────────────────

    const filtered3 = useMemo(() => {
        let d = [...rejectedPartners].sort((a, b) => b._rowIndex - a._rowIndex)
        if (search.trim()) {
            const q = search.toLowerCase()
            d = d.filter(r =>
                r.Lead_ID?.toLowerCase().includes(q) || r.Business_Name?.toLowerCase().includes(q) ||
                r.Contact_Person?.toLowerCase().includes(q) || r.Country?.toLowerCase().includes(q) ||
                r.Rejected_By_Name?.toLowerCase().includes(q)
            )
        }
        if (filterPriority !== "all") d = d.filter(r => String(r.Priority ?? "").toUpperCase() === filterPriority.toUpperCase())
        if (filterStage !== "all") d = d.filter(r => String(r.Client_Stage ?? "") === filterStage)
        if (filterCategory !== "all") d = d.filter(r => String(r.Category ?? "") === filterCategory)
        if (filterAssigned !== "all") d = d.filter(r => String(r.Assigned_To ?? "") === filterAssigned)
        if (filterBrand !== "all") {
            d = d.filter(r => {
                if (!r.Lead_ID) return false
                const label = leadBrandMap.get(r.Lead_ID)
                return label === filterBrand
            })
        }
        if (filterDateRange !== "all") {
            const { from, to } = selectedDateRange
            if (from || to) {
                d = d.filter(r => {
                    const sourceTime = r.Timestamp
                    if (!sourceTime) return false
                    const ts = new Date(sourceTime).getTime()
                    if (from && ts < from.getTime()) return false
                    if (to && ts > to.getTime()) return false
                    return true
                })
            }
        }
        if (sortBy3) {
            const km3: Record<string, keyof RejectedPartner> = {
                t3lead: "Lead_ID", t3contact: "Contact_Person",
                t3country: "Country", t3category: "Category", t3stage: "Client_Stage",
            }
            const k3 = km3[sortBy3]
            if (k3) {
                d.sort((a, b) => {
                    const av = String(a[k3] ?? ""), bv = String(b[k3] ?? "")
                    return sortOrder3 === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
                })
            }
        }
        return d
    }, [rejectedPartners, search, filterPriority, filterStage, filterCategory, filterAssigned, filterBrand, leadBrandMap, filterDateRange, selectedDateRange, sortBy3, sortOrder3])

    // ── paged ─────────────────────────────────────────────────────────────────

    const paged1 = useMemo(() => filtered1.slice((page1 - 1) * perPage1, page1 * perPage1), [filtered1, page1, perPage1])
    const paged2 = useMemo(() => filtered2.slice((page2 - 1) * perPage2, page2 * perPage2), [filtered2, page2, perPage2])
    const paged3 = useMemo(() => filtered3.slice((page3 - 1) * perPage3, page3 * perPage3), [filtered3, page3, perPage3])

    const totPages1 = Math.max(1, Math.ceil(filtered1.length / perPage1))
    const totPages2 = Math.max(1, Math.ceil(filtered2.length / perPage2))
    const totPages3 = Math.max(1, Math.ceil(filtered3.length / perPage3))

    useEffect(() => setPage1(1), [search, filterPriority, filterStage, filterCategory, filterAssigned, filterBrand, filterDateRange, dateRangeStart, dateRangeEnd])
    useEffect(() => setPage2(1), [search, filterCategory, filterVerified, filterTACategory, filterDateRange, dateRangeStart, dateRangeEnd])
    useEffect(() => setPage3(1), [search, filterPriority, filterStage, filterCategory, filterAssigned, filterDateRange, dateRangeStart, dateRangeEnd])

    const hasActiveFilter = useMemo(() => Boolean(
        search.trim() || filterPriority !== "all" || filterStage !== "all" || filterCategory !== "all" ||
        filterAssigned !== "all" || filterBrand !== "all" || filterVerified !== "all" ||
        filterTACategory !== "all" || filterDateRange !== "all"
    ), [search, filterPriority, filterStage, filterCategory, filterAssigned, filterBrand, filterVerified, filterTACategory, filterDateRange])

    useEffect(() => {
        if (!hasActiveFilter) return
        const timer = setTimeout(() => {
            if (filtered1.length > 0 && table1Ref.current) table1Ref.current.scrollIntoView({ behavior: "smooth", block: "start" })
            else if (filtered2.length > 0 && table2Ref.current) table2Ref.current.scrollIntoView({ behavior: "smooth", block: "start" })
            else if (filtered3.length > 0 && table3Ref.current) table3Ref.current.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 100)
        return () => clearTimeout(timer)
    }, [hasActiveFilter, filtered1.length, filtered2.length, filtered3.length])

    // ── unique options ────────────────────────────────────────────────────────

    const uStages = useMemo(() => Array.from(new Set(pendingLeads.map(l => l.Client_Stage).filter(Boolean))).sort(), [pendingLeads])
    const uCats = useMemo(() => Array.from(new Set(pendingLeads.map(l => l.Category).filter(Boolean))).sort(), [pendingLeads])
    const uAssigned = useMemo(() => Array.from(new Set(pendingLeads.map(l => l.Assigned_To).filter(Boolean))).sort(), [pendingLeads])
    const uVerified = useMemo(() => Array.from(new Set(travelAgents.map(t => t.Verified_Status).filter(Boolean))).sort(), [travelAgents])
    const uTACats = useMemo(() => Array.from(new Set(travelAgents.map(t => t.Category).filter(Boolean))).sort(), [travelAgents])

    // ── stats ─────────────────────────────────────────────────────────────────

    const stats = useMemo(() => {
        const pUp = (priority: unknown) => String(priority ?? "").toUpperCase()
        const allFilteredTotal = filtered1.length + filtered2.length + filtered3.length
        const priorityPool = [...filtered1, ...filtered3]
        const allCountries = new Set([
            ...filtered1.map(l => l.Country).filter(Boolean),
            ...filtered2.map(t => t.Country).filter(Boolean),
            ...filtered3.map(r => r.Country).filter(Boolean),
        ])

        const brandBreakdownByIds = (ids: (string | undefined)[], total: number) => {
            const counts: Record<string, number> = {}
            ids.forEach(id => {
                if (!id) return
                const label = leadBrandMap.get(id)
                if (!label) return
                counts[label] = (counts[label] ?? 0) + 1
            })
            return Object.entries(counts)
                .sort((a, b) => {
                    const ai = BRAND_ORDER.indexOf(a[0]); const bi = BRAND_ORDER.indexOf(b[0])
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
                })
                .map(([label, count]) => {
                    const rawPct = total > 0 ? (count / total) * 100 : 0
                    const pct = rawPct > 0 && rawPct < 1 ? rawPct.toFixed(1) : Math.round(rawPct)
                    return { label, count, pct }
                })
        }

        const brandBreakdown = (pool: { Brand_Business_Unit_Interest?: string }[], total: number) => {
            const counts: Record<string, number> = {}
            pool.forEach(item => {
                const raw = String(item.Brand_Business_Unit_Interest ?? "").trim().toLowerCase()
                if (!raw) return
                const label = BRAND_LABEL_MAP[raw] ?? raw
                counts[label] = (counts[label] ?? 0) + 1
            })
            return Object.entries(counts)
                .sort((a, b) => {
                    const ai = BRAND_ORDER.indexOf(a[0]); const bi = BRAND_ORDER.indexOf(b[0])
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
                })
                .map(([label, count]) => {
                    const rawPct = total > 0 ? (count / total) * 100 : 0
                    const pct = rawPct > 0 && rawPct < 1 ? rawPct.toFixed(1) : Math.round(rawPct)
                    return { label, count, pct }
                })
        }

        const pendingBrands = brandBreakdown(filtered1, filtered1.length)

        const onboardedBrands = (() => {
            const counts: Record<string, number> = {}
            filtered2.forEach(t => {
                const raw = String(t.Company_Related_To ?? "").trim().toLowerCase()
                if (!raw) return
                const label = BRAND_LABEL_MAP[raw] ?? t.Company_Related_To
                counts[label] = (counts[label] ?? 0) + 1
            })
            if (Object.keys(counts).length === 0) return brandBreakdownByIds(filtered2.map(t => t.ID), filtered2.length)
            return Object.entries(counts)
                .sort((a, b) => {
                    const ai = BRAND_ORDER.indexOf(a[0]); const bi = BRAND_ORDER.indexOf(b[0])
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
                })
                .map(([label, count]) => {
                    const rawPct = filtered2.length > 0 ? (count / filtered2.length) * 100 : 0
                    const pct = rawPct > 0 && rawPct < 1 ? rawPct.toFixed(1) : Math.round(rawPct)
                    return { label, count, pct }
                })
        })()

        const rejectedBrands = brandBreakdownByIds(filtered3.map(r => r.Lead_ID), filtered3.length)
        const highPool = priorityPool.filter(l => pUp(l.Priority) === "HIGH")
        const highBrands = brandBreakdown(highPool as any[], highPool.length)
        const mediumPool = priorityPool.filter(l => pUp(l.Priority) === "MEDIUM")
        const mediumBrands = brandBreakdown(mediumPool as any[], mediumPool.length)
        const lowPool = priorityPool.filter(l => pUp(l.Priority) === "LOW")
        const lowBrands = brandBreakdown(lowPool as any[], lowPool.length)
        const activePool = filtered1.filter(l => l.Engagement_State?.toLowerCase() === "active")
        const activeBrands = brandBreakdown(activePool, activePool.length)
        const verifiedTAs = filtered2.filter(t => t.Verified_Status?.toLowerCase().includes("verified"))
        const verifiedBrands = brandBreakdownByIds(verifiedTAs.map(t => t.ID), verifiedTAs.length)

        const allBrandCounts: Record<string, number> = {}
        leads.forEach(l => {
            const raw = String(l.Brand_Business_Unit_Interest ?? "").trim().toLowerCase()
            if (!raw) return
            const label = BRAND_LABEL_MAP[raw] ?? raw
            allBrandCounts[label] = (allBrandCounts[label] ?? 0) + 1
        })
        const allTotal = leads.length

        const totalLeadsBrands = hasActiveFilter
            ? brandBreakdownByIds(
                [...filtered1.map(l => l.Lead_ID), ...filtered2.map(t => t.ID), ...filtered3.map(r => r.Lead_ID)],
                allFilteredTotal
            )
            : Object.entries(allBrandCounts)
                .sort((a, b) => {
                    const ai = BRAND_ORDER.indexOf(a[0]); const bi = BRAND_ORDER.indexOf(b[0])
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
                })
                .map(([label, count]) => {
                    const rawPct = allTotal > 0 ? (count / allTotal) * 100 : 0
                    const pct = rawPct > 0 && rawPct < 1 ? rawPct.toFixed(1) : Math.round(rawPct)
                    return { label, count, pct }
                })

        const getPrecisionPct = (count: number, total: number) => {
            if (total <= 0) return 0
            const p = (count / total) * 100
            return p > 0 && p < 1 ? p.toFixed(1) : Math.round(p)
        }

        const sumSales = (pool: TravelAgent[]) => pool.reduce((acc, t) => {
            const val = String(t.Total_Sale_Given || "0").replace(/[₹,\s]/g, "")
            return acc + (parseFloat(val) || 0)
        }, 0)

        const totalSales = sumSales(travelAgents)
        const filteredTotalSales = sumSales(filtered2)

        return {
            total: hasActiveFilter ? allFilteredTotal : leads.length,
            pending: pendingLeads.length, onboarded: travelAgents.length, rejected: rejectedPartners.length,
            hot: highPool.length, medium: mediumPool.length, low: lowPool.length, active: activePool.length,
            countries: allCountries.size, verified: verifiedTAs.length,
            filteredPending: filtered1.length, filteredOnboarded: filtered2.length, filteredRejected: filtered3.length,
            pendingPct: getPrecisionPct(pendingLeads.length, leads.length),
            onboardedPct: getPrecisionPct(travelAgents.length, leads.length),
            pendingBrands, onboardedBrands, rejectedBrands, highBrands, mediumBrands,
            lowBrands, activeBrands, verifiedBrands, totalLeadsBrands,
            totalSales, filteredTotalSales
        }
    }, [leads, pendingLeads, travelAgents, rejectedPartners, filtered1, filtered2, filtered3, hasActiveFilter, leadBrandMap])

    // ── sort ──────────────────────────────────────────────────────────────────

    const handleSort = (col: string) => {
        if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc")
        else { setSortBy(col); setSortOrder("asc") }
    }
    const handleSort2 = (col: string) => {
        if (sortBy2 === col) setSortOrder2(o => o === "asc" ? "desc" : "asc")
        else { setSortBy2(col); setSortOrder2("asc") }
    }
    const handleSort3 = (col: string) => {
        if (sortBy3 === col) setSortOrder3(o => o === "asc" ? "desc" : "asc")
        else { setSortBy3(col); setSortOrder3("asc") }
    }

    const SortIcon = ({ column }: { column: string }) => {
        if (sortBy !== column) return <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 text-white/50 inline" />
        return sortOrder === "asc" ? <ChevronUp className="ml-1.5 h-3.5 w-3.5 text-white inline" /> : <ChevronDown className="ml-1.5 h-3.5 w-3.5 text-white inline" />
    }
    const SortIcon2 = ({ column }: { column: string }) => {
        if (sortBy2 !== column) return <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 text-white/50 inline" />
        return sortOrder2 === "asc" ? <ChevronUp className="ml-1.5 h-3.5 w-3.5 text-white inline" /> : <ChevronDown className="ml-1.5 h-3.5 w-3.5 text-white inline" />
    }
    const SortIcon3 = ({ column }: { column: string }) => {
        if (sortBy3 !== column) return <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 text-white/50 inline" />
        return sortOrder3 === "asc" ? <ChevronUp className="ml-1.5 h-3.5 w-3.5 text-white inline" /> : <ChevronDown className="ml-1.5 h-3.5 w-3.5 text-white inline" />
    }

    const clearAll = () => {
        setSearchInput(""); setSearch(""); setFilterPriority("all"); setFilterStage("all")
        setFilterCategory("all"); setFilterAssigned("all"); setFilterVerified("all")
        setFilterTACategory("all"); setFilterBrand("all"); setFilterDateRange("all")
        setDateRangeStart(""); setDateRangeEnd("")
    }
    const clearT1 = () => {
        setSearchInput(""); setSearch(""); setFilterPriority("all"); setFilterStage("all")
        setFilterCategory("all"); setFilterAssigned("all"); setFilterBrand("all")
        setFilterDateRange("all"); setDateRangeStart(""); setDateRangeEnd("")
    }
    const clearT2 = () => { setSearch(""); setFilterVerified("all"); setFilterTACategory("all") }

    // ── actions ───────────────────────────────────────────────────────────────

    const mapLeadToCapture = (lead: B2BLead): Partial<ContactCaptureData> => ({
        dateOfContact: lead.Event_Date || lead.Timestamp?.split("T")[0] || "",
        capturedBy: lead.Attended_By || "",
        howConnected: [],
        eventPlatformReferrer: lead.Event_Name || lead.Event_Place || "",
        propertyInterest: [],
        companyName: lead.Business_Name || "",
        contactName: lead.Contact_Person || "",
        designation: lead.Position || "",
        mobile: lead.Phone || lead.Business_Phone || "",
        email: lead.Email || "",
        city: "",
        country: lead.Country || "",
        website: lead.Website || "",
        companyType: lead.Category || "",
        marketServed: [],
        enthusiasmLevel: lead.Priority === "High" || lead.Priority === "HIGH" ? "Hot — wants to work now"
            : lead.Priority === "Medium" || lead.Priority === "MEDIUM" ? "Warm — exploring" : "",
        businessPotential: lead.Potential_Business_Rs ? "High volume likely" : "",
        keyThingsSaid: lead.Remarks || "",
        materialsShared: "",
        agreedNextStep: "",
        nextStepDate: lead.Next_Followup_Date || "",
        whoFollowsUp: lead.Assigned_To || "",
        crmContactId: lead.Lead_ID || "",
        dateEnteredCrm: "",
        pipelineStage: lead.Client_Stage === "Onboarded" || lead.Client_Stage === "Negotiation" ? "Qualified"
            : lead.Client_Stage === "Interested" ? "Prospect" : "Lead",
        assignedSalesOwner: lead.Assigned_To || "",
    })

    const mapEntryToPart1 = (entry: any): Partial<ContactCaptureData> => {
        if (entry.part1_JSON) {
            try { const parsed = JSON.parse(entry.part1_JSON); if (parsed && typeof parsed === "object") return parsed } catch (e) { }
        }
        return {
            dateOfContact: entry['Date of Contact'] || '', capturedBy: entry['Captured By'] || '',
            howConnected: (entry['How Connected'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            eventPlatformReferrer: entry['Event Platform Referrer'] || '',
            propertyInterest: (entry['Property Interest'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            companyName: entry['Company Name'] || '', contactName: entry['Contact Name'] || '',
            designation: entry['Designation'] || '', mobile: entry['Mobile'] || '',
            email: entry['Email'] || '', city: entry['City'] || '', country: entry['Country'] || '',
            website: entry['Website'] || '', companyType: entry['Company Type'] || '',
            marketServed: (entry['Market Served'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            enthusiasmLevel: entry['Enthusiasm Level'] || '', businessPotential: entry['Business Potential'] || '',
            keyThingsSaid: entry['Key Things Said'] || '', materialsShared: entry['Materials Shared'] || '',
            agreedNextStep: entry['Agreed Next Step'] || '', nextStepDate: entry['Next Step Date'] || '',
            whoFollowsUp: entry['Who Follows Up'] || '', crmContactId: entry['CRM Contact ID'] || '',
            dateEnteredCrm: entry['Date Entered CRM'] || '', pipelineStage: entry['Pipeline Stage'] || '',
            assignedSalesOwner: entry['Assigned Sales Owner'] || '',
        }
    }

    const mapEntryToPart2 = (entry: any): Partial<Part2Data> => {
        if (entry.part2_JSON) {
            try { const parsed = JSON.parse(entry.part2_JSON); if (parsed && typeof parsed === "object") return parsed } catch (e) { }
        }
        return {
            partnerRef: entry['Partner Ref'] || '', callDate: entry['Call Date'] || '',
            conductedBy: entry['Conducted By'] || '', duration: entry['Call Duration'] || '',
            noteVolume: entry['Note: Volume'] || '', noteAyurveda: entry['Note: Ayurveda Experience'] || '',
            noteClients: entry['Note: Clients'] || '', noteImmediacy: entry['Note: Immediacy'] || '',
            noteExpectations: entry['Note: Expectations'] || '', noteRedFlags: entry['Note: Red Flags'] || '',
            noteOther: entry['Note: Other'] || '', s_roomnights: entry['Score: Room Nights'] || '',
            s_immediacy: entry['Score: Immediacy'] || '', s_ayurveda: entry['Score: Ayurveda'] || '',
            s_wellness: entry['Score: Wellness'] || '', s_market: entry['Score: Market'] || '',
            s_source: entry['Score: Source'] || '', s_convo: entry['Score: Conversation'] || '',
            s_align: entry['Score: Alignment'] || '', assignedTier: entry['Assigned Tier'] || '',
            commissionCat: entry['Commission Category'] || '', commissionPct: entry['Commission %'] || '',
            decidedBy: entry['Decided By'] || '', dateDecided: entry['Date Decided'] || '',
            reviewDate: entry['Review Date'] || '', commEmailDate: entry['Comm. Email Date'] || '',
            act_commEmail: String(entry['Action: Comm. Email Sent']).toLowerCase() === 'true',
            act_rateCard: String(entry['Action: Rate Card Shared']).toLowerCase() === 'true',
            act_brochure: String(entry['Action: Brochure Shared']).toLowerCase() === 'true',
            act_whatsapp: String(entry['Action: WhatsApp Added']).toLowerCase() === 'true',
            act_crmFiled: String(entry['Action: CRM Filed']).toLowerCase() === 'true',
            act_part3Flag: String(entry['Action: Part 3 Flagged']).toLowerCase() === 'true',
            additionalNotes: entry['Additional Notes'] || '',
        }
    }

    const mapEntryToPart3 = (entry: any): Partial<Part3Data> => {
        if (entry.part3_JSON) {
            try { const parsed = JSON.parse(entry.part3_JSON); if (parsed && typeof parsed === "object") return parsed } catch (e) { }
        }
        return {
            partnerCompany: entry['Partner Company'] || '', partnerId: entry['Partner ID'] || entry['Linked CRM ID'] || '',
            firstBookingRef: entry['First Booking Reference'] || entry['First Booking Ref'] || '',
            dateTriggered: entry['Date Triggered'] || '', takingCare: entry['Taking Care'] || '',
            referralCode: entry['Referral Code'] || '', category: entry['Category'] || '',
            taProfileLink: entry['TA Profile Link'] || '', legalCompanyName: entry['Legal Company Name'] || '',
            gstNo: entry['GST No.'] || '', panNo: entry['PAN No.'] || '', aadharNo: entry['Aadhar No.'] || '',
            vatTaxId: entry['VAT / Tax ID'] || '', bizRegNo: entry['Business Registration No.'] || '',
            yearsExperience: entry['Years of Experience'] || '', agencyAddress: entry['Agency Address'] || '',
            taxCity: entry['City'] || '', state: entry['State'] || '', pincode: entry['Pincode'] || '',
            taxCountry: entry['Country'] || '', countryCode: entry['Country Code'] || '',
            officeContact: entry['Office Contact Number'] || '', accountHolder: entry['Account Holder Name'] || '',
            bankName: entry['Bank Name'] || '', accountNo: entry['Account Number / IBAN'] || '',
            ifscSwift: entry['IFSC / SWIFT'] || entry['IFSC (India) / SWIFT (International)'] || '',
            branchCity: entry['Branch Name & City'] || '', accountType: entry['Account Type'] || '',
            intermediaryBank: entry['Intermediary Bank'] || '', commissionType: entry['Commission Type'] || '',
            settlementModel: entry['Settlement Model'] || '', billingCycle: entry['Billing Cycle'] || '',
            paymentMethod: (entry['Payment Method'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            billingCurrency: entry['Billing Currency'] || '', billingNotes: entry['Billing Notes'] || '',
            billingCollectedBy: entry['Billing Collected By'] || '', billingCollectedDate: entry['Billing Collected Date'] || '',
            gstCertLink: entry['GST Cert Link'] || '', panCardLink: entry['PAN Card Link'] || '',
            cancelledChequeLink: entry['Cancelled Cheque Link'] || '', agreementCopyLink: entry['Agreement Copy Link'] || '',
            logoLink: entry['Logo Link'] || '', otherDocLink: entry['Other Doc Link'] || '',
            clientTypes: (entry['Client Types'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            nationalities: (entry['Nationalities'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            otherNationalities: entry['Other Nationalities'] || '', avgGroupSize: entry['Avg Group Size'] || '',
            avgStay: entry['Avg Stay'] || '', leadTime: entry['Lead Time'] || '',
            spendPerPerson: entry['Spend Per Person'] || '',
            clientReqs: (entry['Client Reqs'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            languagesSpoken: entry['Languages Spoken'] || '', clientDistinctive: entry['Client Distinctive'] || '',
            programs: (entry['Programs'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            programGaps: entry['Program Gaps'] || '',
            supportMaterials: (entry['Support Materials'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            translationLang: entry['Translation Lang'] || '', marketProfile: entry['Market Profile'] || '',
            segmentProfile: entry['Segment Profile'] || '', aiLeadWith: entry['AI Lead With'] || '',
            aiAvoid: entry['AI Avoid'] || '', aiRespondedWell: entry['AI Responded Well'] || '',
            bestChannel: entry['Best Channel'] || '', responseSpeed: entry['Response Speed'] || '',
            commStyle: entry['Comm Style'] || '', personalNotes: entry['Personal Notes'] || '',
            remarks: entry['Remarks'] || '',
        }
    }

    const openEdit = (lead: B2BLead) => setEditingLead(lead)

    const getExistingRowIndex = (entry: any) => {
        const raw = entry?._rowIndex ?? entry?.rowIndex ?? entry?.RowIndex ?? entry?.row ?? entry?.Row ?? entry?.__rowIndex
        const n = Number(raw)
        return Number.isFinite(n) && n > 0 ? n : undefined
    }

    const safeParseJson = (value: any) => {
        if (!value || typeof value !== "string") return value && typeof value === "object" ? value : null
        try { return JSON.parse(value) } catch { return null }
    }

    const hasStoredPart1Data = (lead: B2BLead) => {
        const currentId = String(lead.Lead_ID || "").trim()
        const localJson = safeParseJson(lead.part1_JSON)
        const globalEntry = part1Entries.find(e => {
            const eid = String(e["CRM Contact ID"] || e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || e.ID || "").trim()
            return eid === currentId && eid !== ""
        })
        const globalJson = globalEntry ? safeParseJson(globalEntry.part1_JSON) : null
        return Boolean(localJson || globalJson)
    }

    const hasStoredPart2Data = (lead: B2BLead) => {
        const currentId = String(lead.Lead_ID || "").trim()
        const localJson = safeParseJson(lead.part2_JSON)
        const globalEntry = part2Entries.find(e => {
            const eid = String(e["CRM Contact ID"] || e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || e.ID || "").trim()
            return eid === currentId && eid !== ""
        })
        const globalJson = globalEntry ? safeParseJson(globalEntry.part2_JSON) : null
        return Boolean(localJson || globalJson)
    }

    const hasStoredPart3Data = (lead: B2BLead) => {
        const currentId = String(lead.Lead_ID || "").trim()
        const localJson = safeParseJson((lead as any).part3_JSON)
        const globalEntry = part3Entries.find(e => {
            const eid = String(e["CRM Contact ID"] || e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || e.ID || "").trim()
            return eid === currentId && eid !== ""
        })
        const globalJson = globalEntry ? safeParseJson(globalEntry.part3_JSON) : null
        return Boolean(localJson || globalJson)
    }

    const openPartFromView = (part: "part1" | "part2" | "part3", hasExistingData: boolean) => {
        if (!viewLead) return
        const lead = viewLead
        setActivePart(part)
        setActivePartHasData(hasExistingData)
        setViewLead(null)
        setViewLeadTab("main_info")
        void handlePartClick(part, lead)
    }

    const handlePartClick = async (part: "part1" | "part2" | "part3", lead: B2BLead) => {
        if (part === "part1") {
            setModalInitialData(mapLeadToCapture(lead))
            setEditingLead(lead)
            setIsModalLocked(false)
            setIsPart2Open(false)
            setIsPart3Open(false)
            setSelectedLeadForPart2(null)
            setSelectedLeadForPart3(null)
            let rawJson = (lead as any).part1_JSON
            if (!rawJson) {
                try {
                    const res = await fetch(`/api/get-part1?leadId=${encodeURIComponent(lead.Lead_ID)}`)
                    const j = await res.json()
                    if (j.status === "success" && j.entry) rawJson = j.entry.part1_JSON
                } catch (err) { console.error("Part1 fetch failed:", err) }
            }
            if (rawJson) {
                try { setModalInitialData(JSON.parse(rawJson)); setIsModalLocked(true) }
                catch (e) { console.error("Failed to parse part1_JSON", e); setIsModalLocked(true) }
            } else {
                const globalEntry = part1Entries.find(e => {
                    const eid = String(e["CRM Contact ID"] || e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || e.ID || "").trim()
                    return eid === String(lead.Lead_ID).trim()
                })
                if (globalEntry) { setModalInitialData(mapEntryToPart1(globalEntry)); setIsModalLocked(true) }
            }
        } else if (part === "part2") {
            setSelectedLeadForPart2(lead)
            setPart2InitialData({})
            setIsPart2Locked(false)
            setEditingLead(null)
            setIsPart3Open(false)
            setSelectedLeadForPart3(null)
            setIsPart2Open(true)
            let rawJson = (lead as any).part2_JSON
            let entryFound = false
            let rawEntry: any = null
            if (!rawJson) {
                try {
                    const res = await fetch(`/api/get-part2?leadId=${encodeURIComponent(lead.Lead_ID)}`)
                    const j = await res.json()
                    if (j.status === "success" && j.entry) { entryFound = true; rawJson = j.entry.part2_JSON; rawEntry = j.entry }
                } catch (err) { console.error("Part2 fetch failed:", err) }
            }
            if (rawJson) {
                try { setPart2InitialData(JSON.parse(rawJson)); setIsPart2Locked(true) }
                catch (e) { setPart2InitialData(rawEntry ? mapEntryToPart2(rawEntry) : {}); setIsPart2Locked(entryFound) }
            } else if (entryFound && rawEntry) { setPart2InitialData(mapEntryToPart2(rawEntry)); setIsPart2Locked(true) }
        } else if (part === "part3") {
            setSelectedLeadForPart3(lead)
            setPart3InitialData({})
            setIsPart3Locked(false)
            setEditingLead(null)
            setIsPart2Open(false)
            setSelectedLeadForPart2(null)
            setIsPart3Open(true)
            let rawJson = (lead as any).part3_JSON
            let entryFound = false
            if (!rawJson) {
                try {
                    const res = await fetch(`/api/get-part3?leadId=${encodeURIComponent(lead.Lead_ID)}`)
                    const j = await res.json()
                    if (j.status === "success" && j.entry) { entryFound = true; rawJson = j.entry.part3_JSON }
                } catch (err) { console.error("Part3 fetch failed:", err) }
            }
            if (rawJson) {
                try { setPart3InitialData(JSON.parse(rawJson)); setIsPart3Locked(true) }
                catch (e) { console.error("Failed to parse part3_JSON", e) }
            } else if (entryFound) {
                const globalEntry = part3Entries.find(e => {
                    const eid = String(e["CRM Contact ID"] || e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || e.ID || "").trim()
                    return eid === String(lead.Lead_ID).trim()
                })
                if (globalEntry) { setPart3InitialData(mapEntryToPart3(globalEntry)); setIsPart3Locked(true) }
            }
        }
    }

    const handleCaptureSubmit = async (data: ContactCaptureData) => {
        if (!editingLead) return
        const payload = {
            dateOfContact: data.dateOfContact, capturedBy: data.capturedBy,
            howConnected: Array.isArray(data.howConnected) ? data.howConnected.join(", ") : data.howConnected,
            eventPlatformReferrer: data.eventPlatformReferrer,
            propertyInterest: Array.isArray(data.propertyInterest) ? data.propertyInterest.join(", ") : data.propertyInterest,
            companyName: data.companyName, contactName: data.contactName, designation: data.designation,
            mobile: data.mobile, email: data.email, city: data.city, country: data.country,
            website: data.website, companyType: data.companyType,
            marketServed: Array.isArray(data.marketServed) ? data.marketServed.join(", ") : data.marketServed,
            enthusiasmLevel: data.enthusiasmLevel, businessPotential: data.businessPotential,
            keyThingsSaid: data.keyThingsSaid, materialsShared: data.materialsShared,
            agreedNextStep: data.agreedNextStep, nextStepDate: data.nextStepDate,
            whoFollowsUp: data.whoFollowsUp, crmContactId: data.crmContactId || editingLead.Lead_ID,
            dateEnteredCrm: data.dateEnteredCrm, pipelineStage: data.pipelineStage,
            assignedSalesOwner: data.assignedSalesOwner,
            part1_JSON: JSON.stringify(data),
            ...(activePart === "part1" && activePartHasData ? {
                _rowIndex: getExistingRowIndex(
                    part1Entries.find(e => {
                        const eid = String(e["CRM Contact ID"] || e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || e.ID || "").trim()
                        return eid === String(editingLead.Lead_ID).trim()
                    })
                ),
            } : {}),
        }
        try {
            const res = await fetch("/api/capture-partner", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
            })
            let json: any = {}
            try { json = await res.json() } catch { }
            if (res.ok && json?.status !== "error") {
                toast.success(`${editingLead.Business_Name} Data saved successfully! ✅`)
                setLeads(prev => prev.map(l => l.Lead_ID === editingLead.Lead_ID ? { ...l, part1_JSON: JSON.stringify(data) } : l))
                setEditingLead(null); setActivePart(null); setActivePartHasData(false)
            } else {
                toast.error(json?.message || "Data didn't saved, Try Again")
            }
        } catch (err) {
            console.error("Sheet submit error:", err)
            toast.error("Network error — Data didn't saved into Sheet")
        }
    }

    const handlePart2Submit = async (data: Part2Data) => {
        if (!selectedLeadForPart2) return
        const payload = {
            formPart: "Part 2", action: "qualifyPartner", sheetName: "Partner Qualifying Call",
            linkedCrmId: selectedLeadForPart2.Lead_ID,
            linkedContactName: selectedLeadForPart2.Contact_Person || "",
            linkedCompanyName: selectedLeadForPart2.Business_Name || "",
            partnerRef: data.partnerRef, callDate: data.callDate, conductedBy: data.conductedBy,
            callDuration: data.duration, noteVolume: data.noteVolume, noteAyurveda: data.noteAyurveda,
            noteClients: data.noteClients, noteImmediacy: data.noteImmediacy,
            noteExpectations: data.noteExpectations, noteRedFlags: data.noteRedFlags, noteOther: data.noteOther,
            scoreRoomNights: data.s_roomnights, scoreImmediacy: data.s_immediacy, scoreAyurveda: data.s_ayurveda,
            scoreWellness: data.s_wellness, scoreMarket: data.s_market, scoreSource: data.s_source,
            scoreConvo: data.s_convo, scoreAlign: data.s_align,
            totalScore: (parseInt(data.s_roomnights || "0") + parseInt(data.s_immediacy || "0") + parseInt(data.s_ayurveda || "0") +
                parseInt(data.s_wellness || "0") + parseInt(data.s_market || "0") + parseInt(data.s_source || "0") +
                parseInt(data.s_convo || "0") + parseInt(data.s_align || "0")).toString(),
            assignedTier: data.assignedTier, commissionCat: data.commissionCat, commissionPct: data.commissionPct,
            decidedBy: data.decidedBy, dateDecided: data.dateDecided, reviewDate: data.reviewDate,
            commEmailDate: data.commEmailDate, actCommEmail: data.act_commEmail, actRateCard: data.act_rateCard,
            actBrochure: data.act_brochure, actWhatsapp: data.act_whatsapp, actCrmFiled: data.act_crmFiled,
            actPart3Flag: data.act_part3Flag, additionalNotes: data.additionalNotes,
            part2_JSON: JSON.stringify(data),
            ...(activePart === "part2" && activePartHasData ? {
                _rowIndex: getExistingRowIndex(
                    part2Entries.find(e => {
                        const eid = String(e["CRM Contact ID"] || e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || e.ID || "").trim()
                        return eid === String(selectedLeadForPart2.Lead_ID).trim()
                    })
                ),
            } : {}),
        }
        try {
            const res = await fetch("/api/capture-partner", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
            })
            let json: any = {}
            try { json = await res.json() } catch { }
            if (res.ok && json?.status !== "error") {
                toast.success(`Part 2 for ${selectedLeadForPart2.Business_Name} saved successfully! ✅`)
                setLeads(prev => prev.map(l => l.Lead_ID === selectedLeadForPart2!.Lead_ID ? { ...l, part2_JSON: JSON.stringify(data) } as any : l))
                setIsPart2Open(false); setSelectedLeadForPart2(null); setActivePart(null); setActivePartHasData(false)
            } else {
                toast.error(json?.message || "Failed to save Part 2 data")
            }
        } catch (err) {
            toast.error("Network error while saving Part 2 data")
        }
    }

    const handlePart3Submit = async (data: Part3Data) => {
        if (!selectedLeadForPart3) return
        const payload = {
            formPart: "Part 3", action: "billingIntelligence", sheetName: "Billing & Partner Intelligence",
            linkedCrmId: selectedLeadForPart3.Lead_ID,
            linkedContactName: selectedLeadForPart3.Contact_Person || "",
            linkedCompanyName: selectedLeadForPart3.Business_Name || "",
            ...data,
            paymentMethod: Array.isArray(data.paymentMethod) ? data.paymentMethod.join(", ") : data.paymentMethod,
            clientTypes: Array.isArray(data.clientTypes) ? data.clientTypes.join(", ") : data.clientTypes,
            nationalities: Array.isArray(data.nationalities) ? data.nationalities.join(", ") : data.nationalities,
            clientReqs: Array.isArray(data.clientReqs) ? data.clientReqs.join(", ") : data.clientReqs,
            programs: Array.isArray(data.programs) ? data.programs.join(", ") : data.programs,
            supportMaterials: Array.isArray(data.supportMaterials) ? data.supportMaterials.join(", ") : data.supportMaterials,
            part3_JSON: JSON.stringify(data),
            ...(activePart === "part3" && activePartHasData ? {
                _rowIndex: getExistingRowIndex(
                    part3Entries.find(e => {
                        const eid = String(e["CRM Contact ID"] || e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || e.ID || "").trim()
                        return eid === String(selectedLeadForPart3.Lead_ID).trim()
                    })
                ),
            } : {}),
        }
        try {
            const res = await fetch("/api/capture-partner", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
            })
            let json: any = {}
            try { json = await res.json() } catch { }
            if (res.ok && json?.status !== "error") {
                toast.success(`Part 3 for ${selectedLeadForPart3.Business_Name} saved successfully! ✅`)
                setLeads(prev => prev.map(l => l.Lead_ID === selectedLeadForPart3!.Lead_ID ? { ...l, part3_JSON: JSON.stringify(data) } as any : l))
                setIsPart3Open(false); setSelectedLeadForPart3(null); setActivePart(null); setActivePartHasData(false)
            } else {
                toast.error(json?.message || "Failed to save Part 3 data")
            }
        } catch (err) {
            toast.error("Network error while saving Part 3 data")
        }
    }

    const openReject = (lead: B2BLead) => {
        setRejectingLead(lead); setRejectionReason(""); setRejectionCategory(""); setRejectionError("")
    }

    const handleRejectConfirm = async () => {
        if (!rejectionCategory) { setRejectionError("Please select a rejection reason."); return }
        if (!rejectingLead) return
        setIsRejecting(true); setRejectionError("")
        try {
            const payload = {
                Lead_ID: rejectingLead.Lead_ID, Business_Name: rejectingLead.Business_Name,
                Contact_Person: rejectingLead.Contact_Person, Email: rejectingLead.Email,
                Phone: rejectingLead.Phone, Country: rejectingLead.Country,
                Category: rejectingLead.Category, Client_Stage: rejectingLead.Client_Stage,
                Priority: rejectingLead.Priority, Assigned_To: rejectingLead.Assigned_To,
                Potential_Business_Rs: rejectingLead.Potential_Business_Rs,
                Rejection_Category: rejectionCategory, Rejection_Remarks: rejectionReason.trim(),
                Rejected_By_Name: user?.name || "Unknown",
            }
            const j = await (await fetch("/api/rejected-partners", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
            })).json()
            if (j.status === "success") {
                setRejectedPartners(p => [{ _rowIndex: p.length + 2, Timestamp: new Date().toISOString(), ...payload }, ...p])
                setLeads(p => p.filter(l => l.Lead_ID !== rejectingLead.Lead_ID))
                toast.success(`${rejectingLead.Business_Name} moved to Rejected`)
                setRejectingLead(null); setRejectionReason(""); setRejectionCategory("")
            } else { setRejectionError(j.message || "Failed. Try again.") }
        } catch { setRejectionError("Network error.") }
        finally { setIsRejecting(false) }
    }

    // ── pagination bar ────────────────────────────────────────────────────────

    const PaginationBar = ({ cur, tot, count, pp, setPP, setP, goTo, setGoTo }: {
        cur: number; tot: number; count: number; pp: number;
        setPP: (n: number) => void; setP: (n: number) => void;
        goTo: string; setGoTo: (s: string) => void;
    }) => (
        <div className="border-t border-slate-200 bg-white px-4 py-3 rounded-b-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-slate-600">
                    <span className="font-medium">Rows</span>
                    <select value={pp} onChange={e => { setPP(Number(e.target.value)); setP(1) }}
                        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span className="text-slate-400 text-xs">
                        Showing {count === 0 ? 0 : (cur - 1) * pp + 1}–{Math.min(cur * pp, count)} of {count}
                    </span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600">
                    <span>Page <span className="font-semibold">{cur}</span> of <span className="font-semibold">{tot}</span></span>
                    <div className="flex items-center gap-1">
                        <input type="number" min={1} max={tot} value={goTo} onChange={e => setGoTo(e.target.value)} placeholder="Go"
                            className="w-16 h-9 rounded-md border border-slate-300 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button onClick={() => { const p = Number(goTo); if (p >= 1 && p <= tot) { setP(p); setGoTo("") } }}
                            className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition cursor-pointer">Go</button>
                    </div>
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-2">
                    <button onClick={() => setP(Math.max(cur - 1, 1))} disabled={cur === 1}
                        className="px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer">
                        Previous
                    </button>
                    <button onClick={() => setP(Math.min(cur + 1, tot))} disabled={cur >= tot}
                        className="px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer">
                        Next
                    </button>
                </div>
            </div>
        </div>
    )

    // ── loading screen ────────────────────────────────────────────────────────

    if (loadingLeads || loadingTA || loadingRejected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <Image src="/grouploader.gif" alt="Loading" width={180} height={180} priority />
                    <p className="mt-4 text-base font-bold text-amber-700 animate-pulse">
                        Fetching Partner Onboarding System...
                    </p>
                </div>
            </div>
        )
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-10 min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/30">

            {/* ══ HERO HEADER ══════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-r from-[#6b4c2a] via-[#8b6035] to-[#7a5228] border-b border-[#5a3d1e] shadow-[0_8px_40px_rgba(80,55,25,0.5)]">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
                    <BackButton className="mb-4" />
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="space-y-3 w-full lg:flex-1 min-w-0">
                            <div className="flex items-start sm:items-center gap-4">
                                <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                                    <Handshake className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight break-words">
                                        Partner Onboarding System
                                    </h1>
                                    <p className="text-sm sm:text-base lg:text-lg text-white/90 mt-1 sm:mt-2 font-medium break-words">
                                        B2B NBD / CRR Follow-up &nbsp;·&nbsp; B2B_Leads_FMS &nbsp;·&nbsp; TravelAgentFMS
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex w-full lg:w-auto flex-wrap sm:flex-nowrap justify-start lg:justify-end items-stretch gap-3 lg:flex-shrink-0">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 flex flex-col items-center gap-2.5 w-full sm:w-auto">
                                <button
                                    onClick={() => window.open(FOM_URL, "_blank")}
                                    className="w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-semibold text-sm rounded-lg px-5 py-2.5 border border-white/30 transition-all duration-150 shadow-sm cursor-pointer whitespace-nowrap"
                                >
                                    <Plus className="h-4 w-4 flex-shrink-0" />
                                    Add New Contact
                                </button>
                                <div className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-3 h-3 text-amber-200/70 flex-shrink-0" />
                                    <span className="text-[10px] font-bold text-amber-100/60 uppercase tracking-widest">Form Pass Key</span>
                                    <span className="text-xs font-mono font-bold text-white/90">kairali</span>
                                </div>
                            </div>
                            <div className="text-right bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 flex flex-col justify-center w-full sm:w-auto">
                                <p className="text-xs text-amber-100 font-medium">Last Updated</p>
                                <p className="text-xs font-bold text-white whitespace-nowrap">{new Date().toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-10 space-y-6">

                {/* ══ FILTERS & SEARCH ═════════════════════════════════════════ */}
                <div className="w-full rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-[#6b4c2a] via-[#8b6035] to-[#7a5228] flex items-center justify-center shadow-md border border-[#5a3d1e]/40">
                                <Filter className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 leading-tight">Filters &amp; Search</h3>
                                <p className="text-xs text-slate-500">Refine Partner Onboarding System using filters</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="sm" onClick={clearAll}
                                className="cursor-pointer bg-white border-slate-300 text-slate-700 font-medium hover:bg-slate-100">
                                Clear Filters
                            </Button>
                        </div>
                    </div>

                    <div className="px-4 sm:px-6 py-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 w-full items-end">

                            <div className="flex flex-col gap-1.5 w-full">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search Contacts</Label>
                                <div className="relative w-full h-11 group">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10 opacity-70" />
                                    <Input
                                        placeholder="Name, company, email, mobile..."
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") setSearch(searchInput) }}
                                        className="pl-10 pr-10 h-full w-full rounded-lg border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 text-sm shadow-xs transition-all"
                                    />
                                    <div
                                        className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-slate-400 cursor-pointer hover:text-blue-600 transition-colors z-10"
                                        onClick={() => setSearch(searchInput)}
                                    >
                                        <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 w-full">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date Range</Label>
                                <Select value={filterDateRange} onValueChange={v => { setFilterDateRange(v); if (v !== "custom") { setDateRangeStart(""); setDateRangeEnd("") } }}>
                                    <SelectTrigger className="h-11 w-full rounded-lg border-gray-300 bg-white"><SelectValue placeholder="All Dates" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Dates</SelectItem>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="yesterday">Yesterday</SelectItem>
                                        <SelectItem value="this_week">This Week</SelectItem>
                                        <SelectItem value="last_week">Last Week</SelectItem>
                                        <SelectItem value="this_month">This Month</SelectItem>
                                        <SelectItem value="last_month">Last Month</SelectItem>
                                        <SelectItem value="this_year">This Year</SelectItem>
                                        <SelectItem value="last_year">Last Year</SelectItem>
                                        <SelectItem value="custom">Custom Range</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1.5 w-full">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</Label>
                                <Select value={filterCategory} onValueChange={setFilterCategory}>
                                    <SelectTrigger className="h-11 w-full rounded-lg border-gray-300 bg-white"><SelectValue placeholder="All Categories" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {uCats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1.5 w-full">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned To</Label>
                                <Select value={filterAssigned} onValueChange={setFilterAssigned}>
                                    <SelectTrigger className="h-11 w-full rounded-lg border-gray-300 bg-white"><SelectValue placeholder="All Assignees" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {uAssigned.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1.5 w-full">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company Related to</Label>
                                <Select value={filterBrand} onValueChange={setFilterBrand}>
                                    <SelectTrigger className="h-11 w-full rounded-lg border-gray-300 bg-white"><SelectValue placeholder="All Companies" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="KTAHV">KTAHV</SelectItem>
                                        <SelectItem value="KAPPL">KAPPL</SelectItem>
                                        <SelectItem value="KAC">KAC</SelectItem>
                                        <SelectItem value="VILLA RAAG">VILLA RAAG</SelectItem>
                                        <SelectItem value="Equipment">Equipment</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1.5 w-full">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verified Status</Label>
                                <Select value={filterVerified} onValueChange={setFilterVerified}>
                                    <SelectTrigger className="h-11 w-full rounded-lg border-gray-300 bg-white"><SelectValue placeholder="All Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        {uVerified.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                        </div>

                        {filterDateRange === "custom" && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start Date</Label>
                                    <input type="date" value={dateRangeStart} onChange={e => setDateRangeStart(e.target.value)}
                                        className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">End Date</Label>
                                    <input type="date" value={dateRangeEnd} min={dateRangeStart} onChange={e => setDateRangeEnd(e.target.value)}
                                        className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ══ KPI SECTION ══════════════════════════════════════════════ */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#6b4c2a] to-[#7a5228] flex items-center justify-center shadow-md">
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">Key Performance Indicators</h3>
                                <p className="text-xs text-slate-500">Overview of partner metrics &amp; pipeline</p>
                            </div>
                        </div>
                    </div>
                    <div className="px-4 sm:px-6 py-5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: "Total Leads", value: stats.total, sub: hasActiveFilter ? "Filtered across all tables" : "All partner records", icon: <Users className="h-4 w-4 text-blue-700" />, b: "border-blue-200", g: "from-white via-blue-50 to-blue-100/70", t: "text-blue-800", ic: "bg-blue-200/70", brands: stats.totalLeadsBrands },
                                { label: "Pending", value: stats.filteredPending, sub: stats.filteredPending !== stats.pending ? `of ${stats.pending} total` : `${stats.pendingPct}% of total`, icon: <Clock className="h-4 w-4 text-amber-700" />, b: "border-amber-200", g: "from-white via-amber-50 to-amber-100/70", t: "text-amber-800", ic: "bg-amber-200/70", brands: stats.pendingBrands },
                                { label: "Onboarded", value: <span className="flex items-baseline gap-2"><span>{stats.filteredOnboarded}</span><span className="text-xs font-semibold text-emerald-600 opacity-80">— {fmtCurrency(stats.filteredTotalSales)}</span></span>, sub: stats.filteredOnboarded !== stats.onboarded ? `of ${stats.onboarded} total` : `${stats.onboardedPct}% converted`, icon: <CheckCircle2 className="h-4 w-4 text-emerald-700" />, b: "border-emerald-200", g: "from-white via-emerald-50 to-emerald-100/70", t: "text-emerald-800", ic: "bg-emerald-200/70", brands: stats.onboardedBrands },
                                { label: "Rejected", value: stats.filteredRejected, sub: stats.filteredRejected !== stats.rejected ? `of ${stats.rejected} total` : "Closed / Lost", icon: <XCircle className="h-4 w-4 text-rose-700" />, b: "border-rose-200", g: "from-white via-rose-50 to-rose-100/70", t: "text-rose-800", ic: "bg-rose-200/70", brands: stats.rejectedBrands },
                            ].map((k, i) => (
                                <div key={i} className={`rounded-xl border ${k.b} bg-gradient-to-br ${k.g} shadow-sm hover:shadow-md transition-all duration-200 p-3`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${k.t} leading-tight`}>{k.label}</p>
                                        <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${k.ic} shrink-0`}>{k.icon}</div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mb-1.5 leading-tight">{k.sub}</p>
                                    <p className="text-[20px] font-extrabold text-slate-900 leading-none">{k.value}</p>
                                    {k.brands && k.brands.length > 0 && (
                                        <div className="mt-2.5 pt-2 border-t border-black/5 space-y-1">
                                            {k.brands.map(b => {
                                                const brandColorStyle: Record<string, string> = { "VILLA RAAG": "#d97706", "KTAHV": "#059669", "Both": "#6366f1" }
                                                const colorClass = "text-slate-600"
                                                const colorStyle = brandColorStyle[b.label] ? { color: brandColorStyle[b.label] } : {}
                                                return (
                                                    <div key={b.label} className="flex items-baseline justify-between gap-1">
                                                        <span className={`text-[10px] font-semibold ${colorClass} truncate max-w-[55%]`} style={colorStyle}>{b.label}:</span>
                                                        <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap shrink-0">
                                                            {b.count} <span className="font-normal text-slate-400">({b.pct}%)</span>
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    TABLE 1 — PENDING
                ══════════════════════════════════════════════════════════════ */}
                {filtered1.length > 0 && (
                    <div ref={table1Ref} className="bg-white border border-slate-200 rounded-xl shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-blue-200 via-white to-blue-200 border-b border-blue-200 rounded-t-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#6b4c2a] via-[#8b6035] to-[#7a5228] flex items-center justify-center shadow-md border border-[#5a3d1e]/40 flex-shrink-0">
                                    <Building2 className="h-4 w-4 sm:h-5 sm:h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">Pending Partners</h3>
                                    <p className="text-[11px] text-slate-500">{filtered1.length} of {pendingLeads.length} contacts</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs font-semibold self-start sm:self-auto">
                                {stats.pending} Pending
                            </Badge>
                        </div>

                        <div className="mt-3">
                            {errorLeads && (
                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-red-600">
                                    <AlertCircle className="h-10 w-10" />
                                    <p className="text-sm font-medium">{errorLeads}</p>
                                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={fetchLeads}>Retry</Button>
                                </div>
                            )}
                            {!errorLeads && !loadingLeads && (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 z-20 shadow-md
                                        bg-gradient-to-b from-[#1F3A5F] to-[#162B46]
                                        [&_th]:relative [&_th]:bg-[#1F3A5F] [&_th]:text-white
                                        [&_th]:font-semibold [&_th]:text-xs [&_th]:uppercase
                                        [&_th]:tracking-wide [&_th]:px-4 [&_th]:py-3
                                        [&_th]:text-center [&_th]:whitespace-nowrap
                                        [&_th]:border-r [&_th]:border-white/20 [&_th:last-child]:border-r-0">
                                            <TableRow>
                                                <TableHead>S.No</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort("t1date")}>Date <SortIcon column="t1date" /></TableHead>
                                                <TableHead>Lead ID</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort("name")}>Business Name <SortIcon column="name" /></TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort("contact")}>Contact <SortIcon column="contact" /></TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort("phone")}>Phone <SortIcon column="phone" /></TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort("country")}>Country <SortIcon column="country" /></TableHead>
                                                <TableHead>Address</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort("stage")}>Client Stage <SortIcon column="stage" /></TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort("priority")}>Priority <SortIcon column="priority" /></TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort("date")}>Next Follow-up <SortIcon column="date" /></TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort("assigned")}>Assigned To <SortIcon column="assigned" /></TableHead>
                                                <TableHead>Actions</TableHead>
                                                <TableHead>Edit & Onboard</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filtered1.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={15} className="py-16 text-center">
                                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                                            <Users className="h-10 w-10" />
                                                            <p className="text-sm font-medium">No pending partners yet</p>
                                                            <Button size="sm" variant="outline" className="cursor-pointer" onClick={clearAll}>Clear Filters</Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : paged1.map((lead, idx) => (
                                                <TableRow key={`${lead.Lead_ID}_${idx}`}
                                                    className={`border-b border-slate-100 hover:bg-amber-50/40 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                                                    <TableCell className="px-4 py-3 text-xs text-slate-400 font-mono text-center">{(page1 - 1) * perPage1 + idx + 1}</TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{fmtDate(lead.Timestamp)}</TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <span className="text-xs font-mono font-semibold bg-gradient-to-r from-[#6b4c2a]/10 to-amber-50 text-[#6b4c2a] border border-[#6b4c2a]/20 px-2 py-1 rounded-md">{fmt(lead.Lead_ID)}</span>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 min-w-[160px]">
                                                        <p className="text-sm font-semibold text-slate-800 leading-tight">{fmt(lead.Business_Name)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-sm text-slate-700">{fmt(lead.Contact_Person)}</p>
                                                        {lead.Position && <p className="text-xs text-slate-400">{lead.Position}</p>}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-xs font-mono text-slate-700">{fmt(lead.Phone)}</p>
                                                        {lead.Email && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]" title={lead.Email}>{lead.Email}</p>}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-sm text-slate-700">{fmt(lead.Country)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 max-w-[160px]">
                                                        <p className="text-xs text-slate-500 truncate" title={lead.Address}>{fmt(lead.Address)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-xs text-slate-600">{fmt(lead.Category)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        {lead.Client_Stage
                                                            ? <Badge variant="outline" className={`text-xs font-semibold border ${STAGE_STYLES[lead.Client_Stage] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>{lead.Client_Stage}</Badge>
                                                            : <span className="text-slate-300">—</span>}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        {lead.Priority
                                                            ? <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded ${PRIORITY_STYLES[lead.Priority] ?? PRIORITY_STYLES[lead.Priority?.charAt(0).toUpperCase() + lead.Priority?.slice(1).toLowerCase()] ?? "bg-slate-50 text-slate-500"}`}>{lead.Priority}</span>
                                                            : <span className="text-slate-300">—</span>}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-xs text-slate-600">{fmtDate(lead.Next_Followup_Date)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-sm text-slate-700">{fmt(lead.Assigned_To)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <Button variant="outline" size="sm"
                                                                className="cursor-pointer h-8 px-2.5 gap-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200 text-xs font-medium"
                                                                onClick={() => setViewLead(lead)}>
                                                                <Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">View</span>
                                                            </Button>
                                                            <Button variant="outline" size="sm"
                                                                className="cursor-pointer h-8 px-2.5 gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-xs font-medium"
                                                                onClick={() => openReject(lead)}>
                                                                <Ban className="h-3.5 w-3.5" /><span className="hidden sm:inline">Reject</span>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {(() => {
                                                                const currentId = String(lead.Lead_ID || "").trim()
                                                                const isPartDone = (entries: any[], doneSet: Set<string>, localJson?: string) => {
                                                                    if (localJson) return true
                                                                    if (doneSet.has(currentId)) return true
                                                                    return entries.some(e => {
                                                                        const eid = String(e["CRM Contact ID"] || e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || e.ID || "").trim()
                                                                        return eid === currentId && eid !== ""
                                                                    })
                                                                }
                                                                const p1 = isPartDone(part1Entries, part1DoneIDs, (lead as any).part1_JSON)
                                                                const p2 = isPartDone(part2Entries, part2DoneIDs, (lead as any).part2_JSON)
                                                                const p3 = isPartDone(part3Entries, part3DoneIDs, (lead as any).part3_JSON)
                                                                if (p1 && p2 && p3) {
                                                                    return (
                                                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5 px-3 py-1.5 shadow-sm">
                                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                                            <span className="font-bold uppercase tracking-tight text-[10px]">Onboarding Completed</span>
                                                                        </Badge>
                                                                    )
                                                                }
                                                                if (!p1) return (
                                                                    <Button variant="outline" size="sm" className="cursor-pointer h-8 px-3 text-xs font-medium text-amber-700 border-amber-600/30 hover:bg-amber-50 group" onClick={() => handlePartClick("part1", lead)}>
                                                                        Part 1 - Contact Capture <ChevronRight className="h-3 w-3 ml-1 text-amber-600/60 group-hover:text-amber-700 transition-colors" />
                                                                    </Button>
                                                                )
                                                                if (!p2) return (
                                                                    <Button variant="outline" size="sm" className="cursor-pointer h-8 px-3 text-xs font-medium text-emerald-700 border-emerald-600/30 hover:bg-emerald-50 group" onClick={() => handlePartClick("part2", lead)}>
                                                                        Part 2 - Qualify Conversation <ChevronRight className="h-3 w-3 ml-1 text-emerald-600/60 group-hover:text-emerald-700 transition-colors" />
                                                                    </Button>
                                                                )
                                                                if (!p3) return (
                                                                    <Button variant="outline" size="sm" className="cursor-pointer h-8 px-3 text-xs font-medium text-indigo-700 border-indigo-600/30 hover:bg-indigo-50 group" onClick={() => handlePartClick("part3", lead)}>
                                                                        Part 3 - Billing Details <ChevronRight className="h-3 w-3 ml-1 text-indigo-600/60 group-hover:text-indigo-700 transition-colors" />
                                                                    </Button>
                                                                )
                                                                return null
                                                            })()}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                            {!errorLeads && !loadingLeads && (
                                <PaginationBar cur={page1} tot={totPages1} count={filtered1.length}
                                    pp={perPage1} setPP={setPerPage1} setP={setPage1}
                                    goTo={goTo1} setGoTo={setGoTo1} />
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    TABLE 2 — ONBOARDING DONE
                ══════════════════════════════════════════════════════════════ */}
                {filtered2.length > 0 && (
                    <div ref={table2Ref} className="bg-white border border-slate-200 rounded-xl shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-green-200 via-white to-green-200 border-b border-green-200 rounded-t-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-md flex-shrink-0">
                                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">Onboarding Done</h3>
                                    <p className="text-[11px] text-slate-500">{filtered2.length} of {travelAgents.length} contacts</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-semibold">
                                    {filtered2.length} of {stats.onboarded} shown
                                </Badge>
                            </div>
                        </div>

                        <div className="mt-3">
                            {errorTA && (
                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-red-600">
                                    <AlertCircle className="h-10 w-10" /><p className="text-sm font-medium">{errorTA}</p>
                                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={fetchTA}>Retry</Button>
                                </div>
                            )}
                            {!errorTA && !loadingTA && (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 z-20 shadow-md
                                        bg-gradient-to-b from-[#065F46] to-[#047857]
                                        [&_th]:relative [&_th]:bg-[#065F46] [&_th]:text-white
                                        [&_th]:font-semibold [&_th]:text-xs [&_th]:uppercase
                                        [&_th]:tracking-wide [&_th]:px-4 [&_th]:py-3
                                        [&_th]:text-center [&_th]:whitespace-nowrap
                                        [&_th]:border-r [&_th]:border-white/20 [&_th:last-child]:border-r-0">
                                            <TableRow>
                                                <TableHead>S.No</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort2("t2date")}>Date <SortIcon2 column="t2date" /></TableHead>
                                                <TableHead>ID</TableHead>
                                                <TableHead>Agency Name</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort2("t2contact")}>Contact <SortIcon2 column="t2contact" /></TableHead>
                                                <TableHead>Office Contact no</TableHead>
                                                <TableHead>Country</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort2("t2category")}>Category <SortIcon2 column="t2category" /></TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort2("t2commtype")}>Commission Type <SortIcon2 column="t2commtype" /></TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort2("t2commpct")}>Comm % <SortIcon2 column="t2commpct" /></TableHead>
                                                <TableHead>Verified Status</TableHead>
                                                <TableHead>Valid Till</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort2("t2rank")}>Rank <SortIcon2 column="t2rank" /></TableHead>
                                                <TableHead>TA Profile</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort2("t2bookings")}>Bookings Given <SortIcon2 column="t2bookings" /></TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort2("t2sales")}>Total Sales <SortIcon2 column="t2sales" /></TableHead>
                                                <TableHead>Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filtered2.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={17} className="py-16 text-center">
                                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                                            <CheckCircle2 className="h-10 w-10" />
                                                            <p className="text-sm font-medium">No onboarded travel agents found</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : paged2.map((ta, idx) => {
                                                const ok = ta.Verified_Status?.toLowerCase().includes("verified") || ta.Verified_Status?.toLowerCase().includes("approved")
                                                return (
                                                    <TableRow key={`${ta.ID}_${idx}`}
                                                        className={`border-b border-slate-100 hover:bg-emerald-50/40 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                                                        <TableCell className="px-4 py-3 text-xs text-slate-400 font-mono text-center">{(page2 - 1) * perPage2 + idx + 1}</TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{fmtDate(ta.Timestamp)}</TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                                            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{fmt(ta.ID)}</span>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 min-w-[160px]">
                                                            <p className="text-sm font-semibold text-slate-800">{fmt(ta.Agency_Name)}</p>
                                                            {ta.Specialization && <p className="text-xs text-slate-400">{ta.Specialization}</p>}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 min-w-[180px]">
                                                            <p className="text-sm font-medium text-slate-800">{fmt(ta.Contact_Person)}</p>
                                                            <p className="text-xs font-mono text-slate-600 mt-0.5">{fmt(ta.Mobile)}</p>
                                                            {ta.Email_ID && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]" title={ta.Email_ID}>{ta.Email_ID}</p>}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                                            <p className="text-xs font-mono text-slate-700">{fmt(ta.Office_Contact)}</p>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                                            <p className="text-sm text-slate-700">{fmt(ta.Country)}</p>
                                                            {ta.City && <p className="text-xs text-slate-400">{ta.City}</p>}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                                            <p className="text-xs text-slate-600">{fmt(ta.Category)}</p>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                                            <p className="text-xs text-slate-600">{fmt(ta.Commission_Type)}</p>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                                            <p className="text-sm font-bold text-emerald-700">{ta.Commission_Pct ? `${ta.Commission_Pct}` : "—"}</p>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                                            {ta.Verified_Status
                                                                ? <Badge variant="outline" className={`text-xs border ${ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                                                                    {ok && <ShieldCheck className="h-3 w-3 mr-1 inline" />}{ta.Verified_Status}
                                                                </Badge>
                                                                : <span className="text-red-600 font-medium text-xs">Pending</span>}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                                            <p className="text-xs text-slate-600">{fmtDate(ta.Valid_Till_Date)}</p>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap text-center">
                                                            <p className="text-sm font-bold text-slate-700">{fmt(ta.Rank)}</p>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                                                            {ta.TA_Profile_Link
                                                                ? <a href={ta.TA_Profile_Link} target="_blank" rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline">
                                                                    <ExternalLink className="h-3 w-3 flex-shrink-0" /> View Profile
                                                                </a>
                                                                : <span className="text-slate-300 text-xs">—</span>}
                                                        </TableCell>
                                                        {/* ── BOOKINGS GIVEN — opens inline modal ── */}
                                                        <TableCell className="px-4 py-3 whitespace-nowrap text-center">
                                                            {ta.Total_Bookings_Given && parseInt(ta.Total_Bookings_Given) > 0
                                                                ? <button
                                                                    onClick={() => openBookingModal(ta.ID)}
                                                                    className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 transition-colors cursor-pointer">
                                                                    {ta.Total_Bookings_Given}
                                                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                                                </button>
                                                                : <p className="text-sm font-bold text-slate-800">{ta.Total_Bookings_Given ? ta.Total_Bookings_Given : "—"}</p>}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap text-center">
                                                            <p className="text-sm font-bold text-emerald-700">
                                                                {ta.Total_Sale_Given
                                                                    ? `₹${parseFloat(ta.Total_Sale_Given) % 1 === 0
                                                                        ? Math.round(parseFloat(ta.Total_Sale_Given)).toLocaleString("en-IN")
                                                                        : parseFloat(ta.Total_Sale_Given).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                                                                    : "—"}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 text-center">
                                                            <Button variant="outline" size="sm"
                                                                className="cursor-pointer h-8 px-2.5 gap-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200 text-xs font-medium"
                                                                onClick={() => setViewTA(ta)}>
                                                                <Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">View</span>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                            {!errorTA && !loadingTA && (
                                <PaginationBar cur={page2} tot={totPages2} count={filtered2.length}
                                    pp={perPage2} setPP={setPerPage2} setP={setPage2}
                                    goTo={goTo2} setGoTo={setGoTo2} />
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    TABLE 3 — REJECTED
                ══════════════════════════════════════════════════════════════ */}
                {filtered3.length > 0 && (
                    <div ref={table3Ref} className="bg-white border border-slate-200 rounded-xl shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-red-200 via-white to-red-200 border-b border-red-200 rounded-t-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center shadow-md flex-shrink-0">
                                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">Rejected Partners</h3>
                                    <p className="text-[11px] text-slate-500">{filtered3.length} of {rejectedPartners.length} contacts</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-xs font-semibold">
                                    {filtered3.length} of {stats.rejected} shown
                                </Badge>
                            </div>
                        </div>

                        <div className="mt-3">
                            {errorRejected && (
                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-rose-600">
                                    <AlertCircle className="h-10 w-10" />
                                    <p className="text-sm font-medium">{errorRejected}</p>
                                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={fetchRejected}>Retry</Button>
                                </div>
                            )}
                            {loadingRejected && !errorRejected && (
                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                                    <RefreshCw className="h-10 w-10 animate-spin text-rose-600" />
                                    <p className="text-sm font-medium">Loading rejected partners...</p>
                                </div>
                            )}
                            {!loadingRejected && !errorRejected && (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 z-20 shadow-md
                                        bg-gradient-to-b from-[#991B1B] to-[#B91C1C]
                                        [&_th]:relative [&_th]:bg-[#991B1B] [&_th]:text-white
                                        [&_th]:font-semibold [&_th]:text-xs [&_th]:uppercase
                                        [&_th]:tracking-wide [&_th]:px-4 [&_th]:py-3
                                        [&_th]:text-center [&_th]:whitespace-nowrap
                                        [&_th]:border-r [&_th]:border-white/20 [&_th:last-child]:border-r-0">
                                            <TableRow>
                                                <TableHead>S.No</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort3("t3lead")}>Lead ID <SortIcon3 column="t3lead" /></TableHead>
                                                <TableHead>Business Name</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort3("t3contact")}>Contact Person <SortIcon3 column="t3contact" /></TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort3("t3country")}>Country <SortIcon3 column="t3country" /></TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort3("t3category")}>Category <SortIcon3 column="t3category" /></TableHead>
                                                <TableHead className="cursor-pointer hover:bg-white/20 select-none" onClick={() => handleSort3("t3stage")}>Stage at Rejection <SortIcon3 column="t3stage" /></TableHead>
                                                <TableHead>Rejection Reason</TableHead>
                                                <TableHead>Rejected By</TableHead>
                                                <TableHead>Rejected At</TableHead>
                                                <TableHead>Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filtered3.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={11} className="py-16 text-center">
                                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                                            <XCircle className="h-10 w-10" />
                                                            <p className="text-sm font-medium">No rejected partners found</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : paged3.map((r, idx) => (
                                                <TableRow key={`${r.Lead_ID}_${idx}`}
                                                    className={`border-b border-slate-100 hover:bg-rose-50/30 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                                                    <TableCell className="px-4 py-3 text-xs text-slate-400 font-mono text-center">{(page3 - 1) * perPage3 + idx + 1}</TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{fmt(r.Lead_ID)}</span>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 min-w-[140px]">
                                                        <p className="text-sm font-semibold text-slate-800">{fmt(r.Business_Name)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-sm text-slate-700">{fmt(r.Contact_Person)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-sm text-slate-700">{fmt(r.Country)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-xs text-slate-600">{fmt(r.Category)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        {r.Client_Stage && <Badge variant="outline" className="text-xs border bg-slate-50 text-slate-600 border-slate-200">{r.Client_Stage}</Badge>}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 max-w-[200px]">
                                                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter truncate" title={r.Rejection_Category}>{fmt(r.Rejection_Category)}</p>
                                                        <p className="text-xs text-rose-700 font-medium truncate" title={r.Rejection_Remarks}>{fmt(r.Rejection_Remarks)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-sm text-slate-700">{fmt(r.Rejected_By_Name)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-xs text-slate-600">{fmtDate(r.Timestamp)}</p>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 text-center">
                                                        <Button variant="outline" size="sm"
                                                            className="cursor-pointer h-8 px-2.5 gap-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200 text-xs font-medium"
                                                            onClick={() => setViewRejected(r)}>
                                                            <Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">View</span>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                            {!loadingRejected && !errorRejected && (
                                <PaginationBar cur={page3} tot={totPages3} count={filtered3.length}
                                    pp={perPage3} setPP={setPerPage3} setP={setPage3}
                                    goTo={goTo3} setGoTo={setGoTo3} />
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL — VIEW LEAD (Table 1)
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={!!viewLead} onOpenChange={o => { if (!o) { setViewLead(null); setViewLeadTab("main_info") } }}>
                <DialogContent className="!w-[98vw] sm:!w-[95vw] !max-w-6xl !h-[95vh] sm:!h-[90vh] !p-0 gap-0 overflow-hidden rounded-xl flex flex-col [&>button:last-child]:hidden">
                    <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-5 flex items-start justify-between gap-2 sm:gap-3" style={{ background: "#4e6bbf" }}>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-sm sm:text-xl font-black text-white leading-tight mb-1 sm:mb-1.5 truncate">{viewLead?.Business_Name || "—"}</h2>
                            <div className="flex flex-wrap gap-1 sm:gap-1.5">
                                <span className="bg-white/15 border border-white/20 text-white text-[9px] sm:text-xs font-mono px-1.5 sm:px-2 py-0.5 rounded-lg truncate max-w-[160px] sm:max-w-none">
                                    {viewLead?.Lead_ID} &nbsp;|&nbsp; {viewLead?.Category}
                                </span>
                                {viewLead?.Client_Stage && <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px] sm:text-xs">{viewLead.Client_Stage}</Badge>}
                                {viewLead?.Priority && <Badge className={`border-0 text-[9px] sm:text-xs ${viewLead.Priority === "High" || viewLead.Priority === "HIGH" ? "bg-red-100 text-red-700" : viewLead.Priority === "Medium" || viewLead.Priority === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{viewLead.Priority}</Badge>}
                            </div>
                        </div>
                        <button onClick={() => { setViewLead(null); setViewLeadTab("main_info") }} className="cursor-pointer w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white flex-shrink-0 transition-all mt-0.5">
                            <X className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </button>
                    </div>

                    {viewLead && (
                        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                            <div className="flex md:hidden overflow-x-auto border-b border-slate-200 bg-white flex-shrink-0 scrollbar-hide">
                                {(() => {
                                    const id = String(viewLead?.Lead_ID || "").trim()
                                    const hasPart1 = id ? part1DoneIDs.has(id) : false
                                    const hasPart2 = id ? part2DoneIDs.has(id) : false
                                    const hasPart3 = id ? part3DoneIDs.has(id) : false
                                    return [
                                        { key: "main_info", label: "Main Info", Icon: Hash, show: true },
                                        { key: "p1_overview", label: "Part 1", Icon: Handshake, show: hasPart1 },
                                        { key: "p2_overview", label: "Part 2", Icon: CheckSquare, show: hasPart2 },
                                        { key: "p3_overview", label: "Part 3", Icon: CreditCard, show: hasPart3 },
                                    ].filter(tab => tab.show).map(({ key, label, Icon }) => (
                                        <button key={key} onClick={() => setViewLeadTab(key)}
                                            className={`cursor-pointer flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2.5 text-[10px] sm:text-xs font-bold whitespace-nowrap flex-shrink-0 border-b-2 transition-all ${viewLeadTab === key ? "border-blue-500 text-blue-700 bg-blue-50" : "border-transparent text-slate-500"}`}>
                                            <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${viewLeadTab === key ? "text-blue-500" : "text-slate-400"}`} />
                                            {label}
                                        </button>
                                    ))
                                })()}
                            </div>

                            <div className="hidden md:flex w-44 lg:w-52 flex-shrink-0 border-r border-slate-100 bg-white flex-col py-2 overflow-y-auto">
                                {(() => {
                                    const id = String(viewLead?.Lead_ID || "").trim()
                                    const hasPart1 = id ? part1DoneIDs.has(id) : false
                                    const hasPart2 = id ? part2DoneIDs.has(id) : false
                                    const hasPart3 = id ? part3DoneIDs.has(id) : false
                                    return [
                                        { key: "main_info", label: "Main Info", Icon: Hash, show: true },
                                        { key: "p1_overview", label: "Part 1: Contact Capture", Icon: Handshake, show: hasPart1 },
                                        { key: "p2_overview", label: "Part 2: Qualify Conversation", Icon: CheckSquare, show: hasPart2 },
                                        { key: "p3_overview", label: "Part 3: Billing & Intelligence", Icon: CreditCard, show: hasPart3 },
                                    ].filter(item => item.show).map(({ key, label, Icon }) => (
                                        <button key={key} onClick={() => setViewLeadTab(key)}
                                            className={`cursor-pointer w-full flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2.5 lg:py-3 text-left transition-all ${viewLeadTab === key ? "bg-blue-50 text-blue-700 border-r-4 border-blue-500 font-extrabold text-xs lg:text-sm" : "text-slate-600 text-xs hover:bg-slate-50 hover:text-slate-800 font-semibold"}`}>
                                            <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0 ${viewLeadTab === key ? "text-blue-500" : "text-slate-500"}`} />
                                            <span className="leading-tight">{label}</span>
                                        </button>
                                    ))
                                })()}
                            </div>

                            <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 lg:p-5 bg-slate-50">
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2.5 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                                    {viewLeadTab === "main_info" && <><Hash className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500" />Main Info — Overview</>}
                                    {viewLeadTab.startsWith("p1_") && <><Handshake className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />Part 1: Contact Capture — Overview</>}
                                    {viewLeadTab.startsWith("p2_") && <><CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />Part 2: Qualify Conversation — Overview</>}
                                    {viewLeadTab.startsWith("p3_") && <><CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-500" />Part 3: Billing & Intelligence — Overview</>}
                                </p>

                                {viewLeadTab === "main_info" && (
                                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                        <InfoRow label="Lead ID" value={viewLead.Lead_ID} mono />
                                        <InfoRow label="Name" value={viewLead.Contact_Person} />
                                        <InfoRow label="Phone" value={viewLead.Phone} mono />
                                        <InfoRow label="Email" value={viewLead.Email} />
                                        <InfoRow label="Position" value={viewLead.Position} />
                                        {viewLead.Website
                                            ? <div className="flex flex-col gap-1 bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none">Website</span><a href={viewLead.Website} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-blue-600 underline truncate font-semibold">{viewLead.Website}</a></div>
                                            : <InfoRow label="Website" value="" />}
                                        <div className="col-span-1 xs:col-span-2 sm:col-span-2 lg:col-span-3"><InfoRow label="Address" value={viewLead.Address} /></div>
                                        <InfoRow label="Lead Type" value={viewLead.Lead_Type} />
                                        <InfoRow label="Event Name" value={viewLead.Event_Name} />
                                        <InfoRow label="Event Place" value={viewLead.Event_Place} />
                                        <InfoRow label="Event Date" value={fmtDate(viewLead.Event_Date)} />
                                        <InfoRow label="Attended By" value={viewLead.Attended_By} />
                                        <InfoRow label="Ways to Contact" value={viewLead.Ways_to_Contact} />
                                        <InfoRow label="Consent" value={viewLead.Consent} />
                                        <InfoRow label="How Did You Hear" value={viewLead.How_Did_You_Hear} />
                                        <InfoRow label="Business Potential (₹)" value={viewLead.Potential_Business_Rs} />
                                        <InfoRow label="Client Capacity" value={viewLead.Client_Capacity} />
                                        <InfoRow label="Brand / Unit Interest" value={viewLead.Brand_Business_Unit_Interest} />
                                        <div className="col-span-1 xs:col-span-2 sm:col-span-2 lg:col-span-3"><InfoRow label="Previous Ayurveda Experience" value={viewLead.Previous_Ayurveda_Experience} /></div>
                                        <InfoRow label="Assigned To" value={viewLead.Assigned_To} />
                                        <InfoRow label="Next Follow-up Date" value={fmtDate(viewLead.Next_Followup_Date)} />
                                        <InfoRow label="Status" value={viewLead.Status} />
                                    </div>
                                )}

                                {/* PART 1 DATA */}
                                {(() => {
                                    const currentId = String(viewLead.Lead_ID || "").trim()
                                    const safeParse = (s: any) => { if (!s || typeof s !== "string") return s && typeof s === "object" ? s : null; try { return JSON.parse(s) } catch { return null } }
                                    const p1Local = safeParse(viewLead.part1_JSON)
                                    const p1GlobalEntry = part1Entries.find(e => { const eid = String(e["CRM Contact ID"] || e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || e.ID || "").trim(); return eid === currentId && eid !== "" })
                                    const p1GlobalJson = p1GlobalEntry ? safeParse(p1GlobalEntry.part1_JSON) : null
                                    const p1 = p1Local || p1GlobalJson || (p1GlobalEntry ? mapEntryToPart1(p1GlobalEntry) : null)
                                    if (!p1 && viewLeadTab.startsWith("p1_")) return <div className="p-8 sm:p-10 text-center bg-white border border-slate-200 rounded-xl shadow-sm"><Activity className="w-8 h-8 sm:w-10 sm:h-10 text-slate-200 mx-auto mb-3" /><p className="text-xs sm:text-sm font-medium text-slate-500">No Part 1 data captured yet.</p></div>
                                    if (!p1) return null
                                    return viewLeadTab === "p1_overview" && (
                                        <div className="flex flex-col gap-4 sm:gap-6">
                                            <SectionCard title="How We Met" icon={<Handshake className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="amber">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                                    <InfoRow label="Date of Contact" value={p1.dateOfContact} />
                                                    <InfoRow label="Captured By" value={p1.capturedBy} />
                                                    <InfoRow label="How Connected" value={Array.isArray(p1.howConnected) ? p1.howConnected.join(", ") : p1.howConnected} />
                                                    <div className="col-span-full"><InfoRow label="Event/Platform/Referrer" value={p1.eventPlatformReferrer} /></div>
                                                    <InfoRow label="Property Interest" value={Array.isArray(p1.propertyInterest) ? p1.propertyInterest.join(", ") : p1.propertyInterest} />
                                                </div>
                                            </SectionCard>
                                            <SectionCard title="Who They Are" icon={<Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="amber">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                                    <InfoRow label="Company Name" value={p1.companyName} />
                                                    <InfoRow label="Contact Name" value={p1.contactName} />
                                                    <InfoRow label="Designation" value={p1.designation} />
                                                    <InfoRow label="Mobile" value={p1.mobile} mono />
                                                    <InfoRow label="Email" value={p1.email} />
                                                    <InfoRow label="City" value={p1.city} />
                                                    <InfoRow label="Country" value={p1.country} />
                                                    <div className="col-span-full"><InfoRow label="Website" value={p1.website} /></div>
                                                </div>
                                            </SectionCard>
                                            <SectionCard title="First Impression" icon={<MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="amber">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                                    <InfoRow label="Company Type" value={p1.companyType} />
                                                    <InfoRow label="Market Served" value={Array.isArray(p1.marketServed) ? p1.marketServed.join(", ") : p1.marketServed} />
                                                    <InfoRow label="Enthusiasm Level" value={p1.enthusiasmLevel} />
                                                    <InfoRow label="Business Potential" value={p1.businessPotential} />
                                                    <div className="col-span-full"><InfoRow label="Key Things Said" value={p1.keyThingsSaid} /></div>
                                                    <div className="col-span-full"><InfoRow label="Materials Shared" value={p1.materialsShared} /></div>
                                                    <InfoRow label="Agreed Next Step" value={p1.agreedNextStep} />
                                                    <InfoRow label="Next Step Date" value={p1.nextStepDate} />
                                                    <InfoRow label="Who Follows Up" value={p1.whoFollowsUp} />
                                                </div>
                                            </SectionCard>
                                            <SectionCard title="CRM Entry Log" icon={<ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="amber">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                                    <InfoRow label="CRM Contact ID" value={p1.crmContactId} mono />
                                                    <InfoRow label="Date Entered CRM" value={p1.dateEnteredCrm} />
                                                    <InfoRow label="Pipeline Stage" value={p1.pipelineStage} />
                                                    <InfoRow label="Assigned Owner" value={p1.assignedSalesOwner} />
                                                </div>
                                            </SectionCard>
                                        </div>
                                    )
                                })()}

                                {/* PART 2 DATA */}
                                {(() => {
                                    const currentId = String(viewLead.Lead_ID || "").trim()
                                    const safeParse = (s: any) => { if (!s || typeof s !== "string") return s && typeof s === "object" ? s : null; try { return JSON.parse(s) } catch { return null } }
                                    const p2Local = safeParse(viewLead.part2_JSON)
                                    const p2GlobalEntry = part2Entries.find(e => { const eid = String(e["CRM Contact ID"] || e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || e.ID || "").trim(); return eid === currentId && eid !== "" })
                                    const p2GlobalJson = p2GlobalEntry ? safeParse(p2GlobalEntry.part2_JSON) : null
                                    const p2 = p2Local || p2GlobalJson || (p2GlobalEntry ? mapEntryToPart2(p2GlobalEntry) : null)
                                    if (!p2 && viewLeadTab.startsWith("p2_")) return <div className="p-8 sm:p-10 text-center bg-white border border-slate-200 rounded-xl shadow-sm"><Activity className="w-8 h-8 sm:w-10 sm:h-10 text-slate-200 mx-auto mb-3" /><p className="text-xs sm:text-sm font-medium text-slate-500">No Part 2 data captured yet.</p></div>
                                    if (!p2) return null
                                    return viewLeadTab === "p2_overview" && (
                                        <div className="flex flex-col gap-4 sm:gap-6">
                                            <SectionCard title="Session Details" icon={<Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="emerald">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                                                    <InfoRow label="Partner Reference" value={p2.partnerRef} />
                                                    <InfoRow label="Call Date" value={p2.callDate} />
                                                    <InfoRow label="Conducted By" value={p2.conductedBy} />
                                                    <InfoRow label="Duration" value={p2.duration} />
                                                </div>
                                            </SectionCard>
                                            <SectionCard title="Conv. Notes" icon={<FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="emerald">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                    <InfoRow label="Volume Notes" value={p2.noteVolume} />
                                                    <InfoRow label="Ayurveda Experience" value={p2.noteAyurveda} />
                                                    <InfoRow label="Clients Described" value={p2.noteClients} />
                                                    <InfoRow label="Immediacy" value={p2.noteImmediacy} />
                                                    <InfoRow label="Expectations" value={p2.noteExpectations} />
                                                    <InfoRow label="Red Flags" value={p2.noteRedFlags} />
                                                    <div className="col-span-full"><InfoRow label="Other Observations" value={p2.noteOther} /></div>
                                                </div>
                                            </SectionCard>
                                            <SectionCard title="Qualifying Score" icon={<Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="emerald">
                                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                                    <InfoRow label="Room Nights Score" value={p2.s_roomnights} />
                                                    <InfoRow label="Immediacy Score" value={p2.s_immediacy} />
                                                    <InfoRow label="Ayurveda Score" value={p2.s_ayurveda} />
                                                    <InfoRow label="Wellness Score" value={p2.s_wellness} />
                                                    <InfoRow label="Market Score" value={p2.s_market} />
                                                    <InfoRow label="Source Score" value={p2.s_source} />
                                                    <InfoRow label="Convo Score" value={p2.s_convo} />
                                                    <InfoRow label="Alignment Score" value={p2.s_align} />
                                                    <div className="col-span-2 sm:col-span-full bg-emerald-600 text-white rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg flex justify-between items-center">
                                                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-80">Total Score</span>
                                                        <span className="text-xl sm:text-2xl font-black">{(parseInt(p2.s_roomnights || 0) + parseInt(p2.s_immediacy || 0) + parseInt(p2.s_ayurveda || 0) + parseInt(p2.s_wellness || 0) + parseInt(p2.s_market || 0) + parseInt(p2.s_source || 0) + parseInt(p2.s_convo || 0) + parseInt(p2.s_align || 0))} / 100</span>
                                                    </div>
                                                </div>
                                            </SectionCard>
                                            <SectionCard title="Tier & Commission" icon={<Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="emerald">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                                    <InfoRow label="Assigned Tier" value={p2.assignedTier} />
                                                    <InfoRow label="Commission Cat" value={p2.commissionCat} />
                                                    <InfoRow label="Commission %" value={p2.commissionPct} />
                                                    <InfoRow label="Decided By" value={p2.decidedBy} />
                                                    <InfoRow label="Date Decided" value={p2.dateDecided} />
                                                    <InfoRow label="Review Date" value={p2.reviewDate} />
                                                    <InfoRow label="Email Sent On" value={p2.commEmailDate} />
                                                </div>
                                            </SectionCard>
                                            <SectionCard title="Next Actions" icon={<CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="emerald">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                    <InfoRow label="Email Sent" value={p2.act_commEmail ? "Yes" : "No"} />
                                                    <InfoRow label="Rate Card Shared" value={p2.act_rateCard ? "Yes" : "No"} />
                                                    <InfoRow label="Brochure Shared" value={p2.act_brochure ? "Yes" : "No"} />
                                                    <InfoRow label="WhatsApp Added" value={p2.act_whatsapp ? "Yes" : "No"} />
                                                    <InfoRow label="CRM Filed" value={p2.act_crmFiled ? "Yes" : "No"} />
                                                    <InfoRow label="Part 3 Flagged" value={p2.act_part3Flag ? "Yes" : "No"} />
                                                    <div className="col-span-full"><InfoRow label="Additional Notes" value={p2.additionalNotes} /></div>
                                                </div>
                                            </SectionCard>
                                        </div>
                                    )
                                })()}

                                {/* PART 3 DATA */}
                                {(() => {
                                    const currentId = String(viewLead.Lead_ID || "").trim()
                                    const safeParse = (s: any) => { if (!s || typeof s !== "string") return s && typeof s === "object" ? s : null; try { return JSON.parse(s) } catch { return null } }
                                    const p3Local = safeParse(viewLead.part3_JSON)
                                    const p3GlobalEntry = part3Entries.find(e => { const eid = String(e["CRM Contact ID"] || e["Linked CRM ID"] || e.Lead_ID || e.leadId || e.id || e.ID || "").trim(); return eid === currentId && eid !== "" })
                                    const p3GlobalJson = p3GlobalEntry ? safeParse(p3GlobalEntry.part3_JSON) : null
                                    const p3 = p3Local || p3GlobalJson || (p3GlobalEntry ? mapEntryToPart3(p3GlobalEntry) : null)
                                    if (!p3 && viewLeadTab.startsWith("p3_")) return <div className="p-8 sm:p-10 text-center bg-white border border-slate-200 rounded-xl shadow-sm"><Activity className="w-8 h-8 sm:w-10 sm:h-10 text-slate-200 mx-auto mb-3" /><p className="text-xs sm:text-sm font-medium text-slate-500">No Part 3 data captured yet.</p></div>
                                    if (!p3) return null
                                    return viewLeadTab === "p3_overview" && (
                                        <div className="flex flex-col gap-4 sm:gap-6">
                                            <SectionCard title="Trigger & Identity" icon={<Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="indigo">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                                    <InfoRow label="Partner Company" value={p3.partnerCompany} />
                                                    <InfoRow label="Partner ID" value={p3.partnerId} mono />
                                                    <InfoRow label="First Booking Ref" value={p3.firstBookingRef} />
                                                    <InfoRow label="Date Triggered" value={p3.dateTriggered} />
                                                    <InfoRow label="Staff Responsible" value={p3.takingCare} />
                                                    <InfoRow label="Referral Code" value={p3.referralCode} />
                                                    <InfoRow label="Category" value={p3.category} />
                                                    <div className="col-span-full"><InfoRow label="TA Profile Link" value={p3.taProfileLink} /></div>
                                                </div>
                                            </SectionCard>
                                            <SectionCard title="Billing Details" icon={<CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="indigo">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                                    <div className="col-span-full font-bold text-slate-800 text-xs sm:text-sm border-b pb-1 mb-1">Company & Tax</div>
                                                    <InfoRow label="Legal Name" value={p3.legalCompanyName} />
                                                    <InfoRow label="GST No." value={p3.gstNo} />
                                                    <InfoRow label="PAN No." value={p3.panNo} />
                                                    <InfoRow label="VAT / Tax ID" value={p3.vatTaxId} />
                                                    <InfoRow label="Biz Reg No." value={p3.bizRegNo} />
                                                    <InfoRow label="Experience" value={p3.yearsExperience} />
                                                    <div className="col-span-full"><InfoRow label="Address" value={p3.agencyAddress} /></div>
                                                    <div className="col-span-full font-bold text-slate-800 text-xs sm:text-sm border-b pb-1 mt-3 sm:mt-4 mb-1">Bank Details</div>
                                                    <InfoRow label="Account Holder" value={p3.accountHolder} />
                                                    <InfoRow label="Bank Name" value={p3.bankName} />
                                                    <InfoRow label="Account No." value={p3.accountNo} mono />
                                                    <InfoRow label="IFSC / SWIFT" value={p3.ifscSwift} mono />
                                                    <div className="col-span-full font-bold text-slate-800 text-xs sm:text-sm border-b pb-1 mt-3 sm:mt-4 mb-1">Commission & Billing</div>
                                                    <InfoRow label="Comm. Type" value={p3.commissionType} />
                                                    <InfoRow label="Settlement" value={p3.settlementModel} />
                                                    <InfoRow label="Billing Cycle" value={p3.billingCycle} />
                                                    <InfoRow label="Currency" value={p3.billingCurrency} />
                                                    <InfoRow label="Billing Collected By" value={p3.billingCollectedBy} />
                                                    <InfoRow label="Billing Collected Date" value={p3.billingCollectedDate} />
                                                </div>
                                            </SectionCard>
                                            <SectionCard title="Partner Intel" icon={<Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="indigo">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                                    <div className="col-span-full"><InfoRow label="Client Types" value={Array.isArray(p3.clientTypes) ? p3.clientTypes.join(", ") : p3.clientTypes} /></div>
                                                    <div className="col-span-full"><InfoRow label="Nationalities" value={Array.isArray(p3.nationalities) ? p3.nationalities.join(", ") : p3.nationalities} /></div>
                                                    <InfoRow label="Avg Stay" value={p3.avgStay} />
                                                    <InfoRow label="Avg Group Size" value={p3.avgGroupSize} />
                                                    <InfoRow label="Lead Time" value={p3.leadTime} />
                                                    <div className="col-span-full"><InfoRow label="Programs Interested" value={Array.isArray(p3.programs) ? p3.programs.join(", ") : p3.programs} /></div>
                                                    <div className="col-span-full"><InfoRow label="Support Needed" value={Array.isArray(p3.supportMaterials) ? p3.supportMaterials.join(", ") : p3.supportMaterials} /></div>
                                                </div>
                                            </SectionCard>
                                            <SectionCard title="AI Engagement" icon={<ZapIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} color="indigo">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                    <InfoRow label="Market Profile" value={p3.marketProfile} />
                                                    <InfoRow label="Segment Profile" value={p3.segmentProfile} />
                                                    <InfoRow label="Messaging Angle" value={p3.aiLeadWith} />
                                                    <InfoRow label="Avoid" value={p3.aiAvoid} />
                                                    <InfoRow label="Best Channel" value={p3.bestChannel} />
                                                    <InfoRow label="Comm. Style" value={p3.commStyle} />
                                                    <div className="col-span-full"><InfoRow label="Remarks" value={p3.remarks} /></div>
                                                </div>
                                            </SectionCard>
                                        </div>
                                    )
                                })()}

                                {/* STICKY FOOTER */}
                                <div className="sticky bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur px-3 sm:px-4 py-2.5 sm:py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                                    <div className="flex flex-col xs:flex-row sm:flex-row justify-end gap-2 sm:gap-3">
                                        <Button variant="outline" className="cursor-pointer w-full xs:w-auto sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                                            onClick={() => { setViewLead(null); setViewLeadTab("main_info") }}>
                                            Close
                                        </Button>
                                        {viewLeadTab !== "main_info" && (
                                            <Button className="cursor-pointer w-full xs:w-auto sm:w-auto text-xs sm:text-sm h-8 sm:h-9 bg-gradient-to-r from-[#6b4c2a] to-[#7a5228] text-white hover:from-[#5a3d1e]"
                                                onClick={() => {
                                                    const currentLead = viewLead
                                                    if (!currentLead) return
                                                    if (viewLeadTab.startsWith("p1_")) openPartFromView("part1", hasStoredPart1Data(currentLead))
                                                    else if (viewLeadTab.startsWith("p2_")) openPartFromView("part2", hasStoredPart2Data(currentLead))
                                                    else if (viewLeadTab.startsWith("p3_")) openPartFromView("part3", hasStoredPart3Data(currentLead))
                                                    else { setViewLead(null); setViewLeadTab("main_info"); openEdit(currentLead) }
                                                }}>
                                                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                                                Edit & Onboard
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL — VIEW TRAVEL AGENT (Table 2)
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={!!viewTA} onOpenChange={o => { if (!o) { setViewTA(null); setViewTATab("agency") } }}>
                <DialogContent className="!w-[98vw] sm:!w-[95vw] !max-w-6xl !h-[95vh] sm:!h-[90vh] !p-0 gap-0 overflow-hidden rounded-xl flex flex-col [&>button:last-child]:hidden">
                    <div className="flex-shrink-0 px-4 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-3" style={{ background: "#1a6b44" }}>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-xl font-black text-white leading-tight mb-1.5 truncate">{viewTA?.Agency_Name || "—"}</h2>
                            <div className="flex flex-wrap gap-1.5">
                                <span className="bg-white/15 border border-white/20 text-white text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-lg truncate max-w-[200px] sm:max-w-none">
                                    {viewTA?.ID} &nbsp;|&nbsp; {viewTA?.Category}
                                </span>
                                {viewTA?.Verified_Status && <Badge className={`border-0 text-[10px] sm:text-xs ${viewTA.Verified_Status.toLowerCase().includes("verified") ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{viewTA.Verified_Status}</Badge>}
                                {viewTA?.Rank && <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[10px] sm:text-xs">⭐ {viewTA.Rank}</Badge>}
                            </div>
                        </div>
                        <button onClick={() => { setViewTA(null); setViewTATab("agency") }} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white flex-shrink-0 transition-all cursor-pointer">
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>

                    {viewTA && (
                        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                            <div className="flex md:hidden overflow-x-auto border-b border-slate-200 bg-white flex-shrink-0 scrollbar-hide">
                                {[
                                    { key: "agency", label: "Agency", Icon: Building2 },
                                    { key: "documents", label: "Docs", Icon: ShieldCheck },
                                    { key: "commission", label: "Commission", Icon: DollarSign },
                                    { key: "banking", label: "Banking", Icon: FileText },
                                    { key: "performance", label: "Performance", Icon: BarChart3 },
                                    { key: "timeline", label: "Timeline", Icon: Clock },
                                ].map(({ key, label, Icon }) => (
                                    <button key={key} onClick={() => setViewTATab(key)}
                                        className={`flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold whitespace-nowrap flex-shrink-0 border-b-2 transition-all cursor-pointer ${viewTATab === key ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "border-transparent text-slate-500"}`}>
                                        <Icon className={`w-3 h-3 ${viewTATab === key ? "text-emerald-500" : "text-slate-400"}`} />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="hidden md:flex w-48 lg:w-52 flex-shrink-0 border-r border-slate-100 bg-white flex-col py-2 overflow-y-auto">
                                {[
                                    { key: "agency", label: "Agency & Contact", Icon: Building2 },
                                    { key: "documents", label: "Document Verification", Icon: ShieldCheck },
                                    { key: "commission", label: "Commission & Agreement", Icon: DollarSign },
                                    { key: "banking", label: "Billing & Banking", Icon: FileText },
                                    { key: "performance", label: "Performance Metrics", Icon: BarChart3 },
                                    { key: "timeline", label: "Verification Timeline", Icon: Clock },
                                ].map(({ key, label, Icon }) => (
                                    <button key={key} onClick={() => setViewTATab(key)}
                                        className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-xs transition-all cursor-pointer ${viewTATab === key ? "bg-emerald-50 text-emerald-700 border-r-4 border-emerald-500 font-bold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}>
                                        <Icon className={`w-4 h-4 flex-shrink-0 ${viewTATab === key ? "text-emerald-500" : "text-slate-400"}`} />
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-50">
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 sm:mb-4 flex items-center gap-2">
                                    {viewTATab === "agency" && <><Building2 className="w-3.5 h-3.5 text-emerald-500" />Agency &amp; Contact</>}
                                    {viewTATab === "documents" && <><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />Document Verification</>}
                                    {viewTATab === "commission" && <><DollarSign className="w-3.5 h-3.5 text-amber-500" />Commission &amp; Agreement</>}
                                    {viewTATab === "banking" && <><FileText className="w-3.5 h-3.5 text-blue-500" />Billing &amp; Banking</>}
                                    {viewTATab === "performance" && <><BarChart3 className="w-3.5 h-3.5 text-purple-500" />Performance Metrics</>}
                                    {viewTATab === "timeline" && <><Clock className="w-3.5 h-3.5 text-orange-500" />Verification Timeline</>}
                                </p>

                                {viewTATab === "agency" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                                        <InfoRow label="Agency Name" value={viewTA.Agency_Name} />
                                        <InfoRow label="Category" value={viewTA.Category} />
                                        <InfoRow label="Specialization" value={viewTA.Specialization} />
                                        <InfoRow label="Yrs Experience" value={viewTA.Years_Experience} />
                                        <InfoRow label="Contact Person" value={viewTA.Contact_Person} />
                                        <InfoRow label="Mobile" value={viewTA.Mobile} mono />
                                        <InfoRow label="Office Contact" value={viewTA.Office_Contact} mono />
                                        <InfoRow label="Country Code" value={viewTA.Country_Code} />
                                        <InfoRow label="Email ID" value={viewTA.Email_ID} />
                                        <InfoRow label="Country" value={viewTA.Country} />
                                        <InfoRow label="State" value={viewTA.State} />
                                        <InfoRow label="City" value={viewTA.City} />
                                        <InfoRow label="Pincode" value={viewTA.Pincode} />
                                        <InfoRow label="Referral Code" value={viewTA.Referral_Code} />
                                        <InfoRow label="Taking Care 1" value={viewTA.Taking_Care_1} />
                                        <InfoRow label="Taking Care 2" value={viewTA.Taking_Care_2} />
                                        <InfoRow label="Taking Care 3" value={viewTA.Taking_Care_3} />
                                        <InfoRow label="Company Related To" value={viewTA.Company_Related_To} />
                                        <div className="col-span-1 sm:col-span-2 md:col-span-3"><InfoRow label="Agency Address" value={viewTA.Agency_Address} /></div>
                                        {viewTA.Website && <div className="col-span-1 sm:col-span-2 flex flex-col gap-1 bg-white border border-slate-200 rounded-xl px-4 py-3"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Website</span><a href={viewTA.Website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline truncate">{viewTA.Website}</a></div>}
                                    </div>
                                )}

                                {viewTATab === "documents" && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                            <CheckItem label="GST Certificate Verified" checked={!!viewTA.GST_Cert_Verified} />
                                            <CheckItem label="PAN Card Verified" checked={!!viewTA.PAN_Card_Verified} />
                                            <CheckItem label="Aadhar Card Verified" checked={!!viewTA.Aadhar_Card_Verified} />
                                            <CheckItem label="Bank Details Verified" checked={!!viewTA.Bank_Details_Verified} />
                                            <CheckItem label="Agency Address Verified" checked={!!viewTA.Agency_Address_Verified} />
                                            <CheckItem label="Phone Number Verified" checked={!!viewTA.Phone_Number_Verified} />
                                            <CheckItem label="Email ID Verified" checked={!!viewTA.Email_ID_Verified} />
                                            <CheckItem label="Website Validity Checked" checked={!!viewTA.Website_Validity_Checked} />
                                            <CheckItem label="Experience Verified" checked={!!viewTA.Experience_Verified} />
                                        </div>
                                        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                                            <InfoRow label="Verified Status" value={viewTA.Verified_Status} />
                                            <InfoRow label="Verifier Remarks" value={viewTA.Verifier_Remarks} />
                                            <InfoRow label="Doer" value={viewTA.Doer} />
                                        </div>
                                    </div>
                                )}

                                {viewTATab === "commission" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                                        <InfoRow label="Company Related To" value={viewTA.Company_Related_To} />
                                        <InfoRow label="Commission Type" value={viewTA.Commission_Type} />
                                        <InfoRow label="Commission %" value={viewTA.Commission_Pct ? `${viewTA.Commission_Pct}` : "—"} />
                                        <InfoRow label="Verified Commission %" value={viewTA.Verified_Commission_Pct ? `${viewTA.Verified_Commission_Pct}%` : "—"} />
                                        <InfoRow label="Currency of Dealing" value={viewTA.Currency} />
                                        <InfoRow label="Valid Till Date" value={fmtDate(viewTA.Valid_Till_Date)} />
                                        <InfoRow label="NBD / CRR" value={viewTA.NBD_CRR} />
                                        {viewTA.Agreement_Copy_Link && <div className="col-span-1 sm:col-span-2 flex flex-col gap-1 bg-white border border-slate-200 rounded-xl px-4 py-3"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Agreement</span><a href={viewTA.Agreement_Copy_Link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">View Agreement</a></div>}
                                        {viewTA.TA_Profile_Link && <div className="col-span-1 sm:col-span-2 flex flex-col gap-1 bg-white border border-slate-200 rounded-xl px-4 py-3"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">TA Profile</span><a href={viewTA.TA_Profile_Link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">View Profile</a></div>}
                                    </div>
                                )}

                                {viewTATab === "banking" && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                                            <InfoRow label="GST Number" value={viewTA.GST_Number} mono />
                                            <InfoRow label="PAN Number" value={viewTA.PAN_Number} mono />
                                            <InfoRow label="Aadhar Number" value={viewTA.Aadhar_Number} mono />
                                            <InfoRow label="Account Number" value={viewTA.Account_Number} mono />
                                            <InfoRow label="IFSC Code" value={viewTA.IFSC_Code} mono />
                                            <InfoRow label="Bank Name" value={viewTA.Bank_Name} />
                                        </div>
                                        <div className="pt-4 border-t border-slate-200">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Document Links</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: "GST Certificate", url: viewTA.Upload_GST_Cert }, { label: "PAN Card", url: viewTA.Upload_PAN_Card },
                                                    { label: "Aadhar Card", url: viewTA.Upload_Aadhar_Card }, { label: "Cancelled Cheque", url: viewTA.Upload_Cancelled_Cheque },
                                                    { label: "Logo", url: viewTA.Upload_Logo }, { label: "Other Documents", url: viewTA.Other_Documents_Link },
                                                ].filter(d => d.url).map(d => (
                                                    <a key={d.label} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline bg-blue-50 px-2 py-1 rounded">
                                                        <ExternalLink className="h-3 w-3" />{d.label}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {viewTATab === "performance" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                                        <InfoRow label="Total Bookings" value={viewTA.Total_Bookings_Given} />
                                        <InfoRow label="Total Sale" value={viewTA.Total_Sale_Given} />
                                        <InfoRow label="Rank" value={viewTA.Rank} />
                                        <InfoRow label="Last Sale (Days)" value={viewTA.Last_Sale_Days_Old} />
                                        <InfoRow label="Email to TA Done" value={viewTA.Email_To_TA_Done} />
                                        <InfoRow label="Email Alert to Employee" value={viewTA.Email_Alert_To_Employee} />
                                        <InfoRow label="WhatsApp Alert to Employee" value={viewTA.WhatsApp_Alert_To_Employee} />
                                        <InfoRow label="HT Create Threshold" value={viewTA.HT_Create_Threshold} />
                                    </div>
                                )}

                                {viewTATab === "timeline" && (
                                    <div className="space-y-4">
                                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                            <table className="w-full text-xs border-collapse min-w-[400px]">
                                                <thead><tr className="bg-orange-50 border-b border-orange-200">
                                                    {["Planned", "Actual", "Time Delay", "Doer"].map(h => <th key={h} className="text-left px-3 py-2.5 font-semibold text-slate-700 border-r border-orange-200 last:border-r-0">{h}</th>)}
                                                </tr></thead>
                                                <tbody><tr>
                                                    <td className="px-3 py-2.5 text-slate-700 border-r border-orange-100">{fmtDate(viewTA.Planned)}</td>
                                                    <td className="px-3 py-2.5 text-slate-700 border-r border-orange-100">{fmtDate(viewTA.Actual)}</td>
                                                    <td className="px-3 py-2.5 border-r border-orange-100">
                                                        {calculateDelay(viewTA.Planned, viewTA.Actual) !== "—"
                                                            ? <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">{calculateDelay(viewTA.Planned, viewTA.Actual)}</Badge>
                                                            : "—"}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-slate-700">{fmt(viewTA.Doer)}</td>
                                                </tr></tbody>
                                            </table>
                                        </div>
                                        {viewTA.Remarks && <InfoRow label="Remarks" value={viewTA.Remarks} />}
                                    </div>
                                )}

                                <div className="flex justify-end mt-5 pt-4 border-t border-slate-200">
                                    <Button variant="outline" className="cursor-pointer w-full sm:w-auto" onClick={() => { setViewTA(null); setViewTATab("agency") }}>Close</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL — VIEW REJECTED (Table 3)
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={!!viewRejected} onOpenChange={o => { if (!o) { setViewRejected(null); setViewRejectedTab("rejection") } }}>
                <DialogContent className="!w-[98vw] sm:!w-[95vw] !max-w-4xl !max-h-[95vh] sm:!max-h-[90vh] !p-0 gap-0 overflow-hidden rounded-xl [&>button:last-child]:hidden">
                    <div className="flex-shrink-0 px-4 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-3" style={{ background: "#9f1239" }}>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-xl font-black text-white leading-tight mb-1.5 truncate">{viewRejected?.Business_Name || "—"}</h2>
                            <div className="flex flex-wrap gap-1.5">
                                <span className="bg-white/15 border border-white/20 text-white text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-lg truncate max-w-[200px] sm:max-w-none">
                                    {viewRejected?.Lead_ID} &nbsp;|&nbsp; {viewRejected?.Category}
                                </span>
                                <Badge className="bg-rose-200 text-rose-800 border-0 text-[10px] sm:text-xs">Rejected</Badge>
                                {viewRejected?.Priority && <Badge className={`border-0 text-[10px] sm:text-xs ${viewRejected.Priority === "High" || viewRejected.Priority === "HIGH" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{viewRejected.Priority}</Badge>}
                            </div>
                        </div>
                        <button onClick={() => { setViewRejected(null); setViewRejectedTab("rejection") }} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white flex-shrink-0 transition-all cursor-pointer">
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>

                    {viewRejected && (
                        <div className="flex flex-col md:flex-row overflow-hidden" style={{ height: "calc(95vh - 100px)" }}>
                            <div className="flex md:hidden overflow-x-auto border-b border-slate-200 bg-white flex-shrink-0 scrollbar-hide">
                                {[
                                    { key: "rejection", label: "Rejection", Icon: AlertTriangle },
                                    { key: "lead", label: "Lead Info", Icon: Building2 },
                                ].map(({ key, label, Icon }) => (
                                    <button key={key} onClick={() => setViewRejectedTab(key)}
                                        className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold whitespace-nowrap flex-shrink-0 border-b-2 transition-all cursor-pointer ${viewRejectedTab === key ? "border-rose-500 text-rose-700 bg-rose-50" : "border-transparent text-slate-500"}`}>
                                        <Icon className={`w-3 h-3 ${viewRejectedTab === key ? "text-rose-500" : "text-slate-400"}`} />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="hidden md:flex w-48 lg:w-52 flex-shrink-0 border-r border-slate-100 bg-white flex-col py-2">
                                {[
                                    { key: "rejection", label: "Rejection Info", Icon: AlertTriangle },
                                    { key: "lead", label: "Lead Details", Icon: Building2 },
                                ].map(({ key, label, Icon }) => (
                                    <button key={key} onClick={() => setViewRejectedTab(key)}
                                        className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-xs transition-all cursor-pointer ${viewRejectedTab === key ? "bg-rose-50 text-rose-700 border-r-4 border-rose-500 font-bold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}>
                                        <Icon className={`w-4 h-4 flex-shrink-0 ${viewRejectedTab === key ? "text-rose-500" : "text-slate-400"}`} />
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-50">
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 sm:mb-4 flex items-center gap-2">
                                    {viewRejectedTab === "rejection" && <><AlertTriangle className="w-3.5 h-3.5 text-rose-500" />Rejection Info</>}
                                    {viewRejectedTab === "lead" && <><Building2 className="w-3.5 h-3.5 text-slate-500" />Lead Details</>}
                                </p>

                                {viewRejectedTab === "rejection" && (
                                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 sm:p-5">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">Rejection Reason</p>
                                                <p className="text-sm font-bold text-rose-800 mb-1">{fmt(viewRejected.Rejection_Category)}</p>
                                                {viewRejected.Rejection_Remarks && <p className="text-sm text-rose-600 mt-1 leading-relaxed">{viewRejected.Rejection_Remarks}</p>}
                                                <div className="mt-3 flex flex-wrap gap-3 sm:gap-4 text-xs text-rose-500">
                                                    <span><strong>By:</strong> {fmt(viewRejected.Rejected_By_Name)}</span>
                                                    <span><strong>At:</strong> {fmtDate(viewRejected.Timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {viewRejectedTab === "lead" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                                        <InfoRow label="Lead ID" value={viewRejected.Lead_ID} mono />
                                        <InfoRow label="Business Name" value={viewRejected.Business_Name} />
                                        <InfoRow label="Contact Person" value={viewRejected.Contact_Person} />
                                        <InfoRow label="Email" value={viewRejected.Email} />
                                        <InfoRow label="Phone" value={viewRejected.Phone} mono />
                                        <InfoRow label="Country" value={viewRejected.Country} />
                                        <InfoRow label="Category" value={viewRejected.Category} />
                                        <InfoRow label="Stage at Rejection" value={viewRejected.Client_Stage} />
                                        <InfoRow label="Priority" value={viewRejected.Priority} />
                                        <InfoRow label="Assigned To" value={viewRejected.Assigned_To} />
                                        <div className="col-span-1 sm:col-span-2 md:col-span-3"><InfoRow label="Potential Business (₹)" value={viewRejected.Potential_Business_Rs} /></div>
                                    </div>
                                )}

                                <div className="flex justify-end mt-5 pt-4 border-t border-slate-200">
                                    <Button variant="outline" className="cursor-pointer w-full sm:w-auto" onClick={() => { setViewRejected(null); setViewRejectedTab("rejection") }}>Close</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL — REJECT CONFIRM
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={!!rejectingLead} onOpenChange={o => {
                if (!o && !isRejecting) { setRejectingLead(null); setRejectionReason(""); setRejectionCategory(""); setRejectionError("") }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-rose-100 flex items-center justify-center">
                                <Ban className="h-5 w-5 text-rose-600" />
                            </div>
                            <span className="text-base font-bold text-slate-800">Reject Partner</span>
                        </DialogTitle>
                    </DialogHeader>
                    {rejectingLead && <div className="space-y-4 mt-2">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-sm font-semibold text-slate-800">{rejectingLead.Business_Name}</p>
                            <p className="text-xs text-slate-500">{rejectingLead.Contact_Person} · {rejectingLead.Country}</p>
                            <span className="text-xs font-mono text-slate-400">{rejectingLead.Lead_ID}</span>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Rejection Reason <span className="text-rose-500">*</span></Label>
                            <Select value={rejectionCategory} onValueChange={val => { setRejectionCategory(val); setRejectionError("") }} disabled={isRejecting}>
                                <SelectTrigger className={`w-full ${rejectionError && !rejectionCategory ? "border-rose-400" : ""}`}>
                                    <SelectValue placeholder="Select a reason…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {REJECTION_REASON_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Textarea placeholder="Additional remarks (optional)…" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} className="resize-none mt-1" disabled={isRejecting} />
                            {rejectionError && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {rejectionError}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rejected By Name</Label>
                                <div className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center text-sm text-slate-600">{user?.name || "—"}</div>
                            </div>
                        </div>
                    </div>}
                    <DialogFooter className="mt-4 gap-2">
                        <Button variant="outline" className="cursor-pointer" disabled={isRejecting}
                            onClick={() => { setRejectingLead(null); setRejectionReason(""); setRejectionCategory(""); setRejectionError("") }}>
                            Cancel
                        </Button>
                        <Button disabled={isRejecting || !rejectionCategory} className="cursor-pointer bg-rose-600 hover:bg-rose-700 text-white" onClick={handleRejectConfirm}>
                            {isRejecting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Rejecting…</> : <><Ban className="h-4 w-4 mr-2" />Confirm Reject</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL — BOOKING HISTORY (Travel Agent)  ← NEW
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={!!bookingModalAgentId} onOpenChange={o => {
                if (!o) { setBookingModalAgentId(null); setBookingData([]); setBookingError("") }
            }}>
                <DialogContent className="!w-[98vw] sm:!w-[95vw] !max-w-5xl !max-h-[90vh] !p-0 gap-0 overflow-hidden rounded-xl flex flex-col [&>button:last-child]:hidden">

                    {/* Header */}
                    <div className="flex-shrink-0 px-4 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-3 bg-gradient-to-r from-emerald-700 to-emerald-800">
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-xl font-black text-white leading-tight mb-1">Booking History</h2>
                            <p className="text-xs sm:text-sm text-emerald-200 mt-0.5">
                                Travel Agent &nbsp;
                                <span className="font-mono bg-white/15 px-2 py-0.5 rounded text-white">{bookingModalAgentId}</span>
                            </p>
                        </div>
                        <button
                            onClick={() => { setBookingModalAgentId(null); setBookingData([]); setBookingError("") }}
                            className="cursor-pointer w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white flex-shrink-0 transition-all">
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>

                    {/* Stats Strip */}
                    {!bookingLoading && !bookingError && bookingData.length > 0 && (() => {
                        const total = bookingData.reduce((s, r) => s + (parseFloat(String(r.bookingAmount)) || 0), 0)
                        const avg = total / bookingData.length
                        return (
                            <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 bg-white">
                                {[
                                    { label: "Confirmed Bookings", value: bookingData.length, green: true },
                                    { label: "Total Revenue", value: "₹" + total.toLocaleString("en-IN", { maximumFractionDigits: 0 }) },
                                    { label: "Avg. Booking Value", value: "₹" + avg.toLocaleString("en-IN", { maximumFractionDigits: 0 }) },
                                    { label: "Latest Booking", value: bookingData[0]?.date || "—" },
                                ].map((s, i) => (
                                    <div key={i} className="px-4 py-3 border-r border-slate-200 last:border-r-0">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                                        <p className={`text-base sm:text-lg font-extrabold mt-0.5 font-mono ${s.green ? "text-emerald-600" : "text-slate-800"}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        )
                    })()}

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto bg-slate-50">
                        {bookingLoading && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500">
                                <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                                <span className="text-sm font-medium">Fetching bookings…</span>
                            </div>
                        )}
                        {bookingError && (
                            <div className="flex flex-col items-center justify-center py-20 gap-3 text-rose-600">
                                <AlertCircle className="w-9 h-9" />
                                <p className="text-sm font-medium">{bookingError}</p>
                            </div>
                        )}
                        {!bookingLoading && !bookingError && bookingData.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                                <Calendar className="w-10 h-10 opacity-40" />
                                <p className="text-sm font-medium">No confirmed bookings found for this agent.</p>
                            </div>
                        )}
                        {!bookingLoading && !bookingError && bookingData.length > 0 && (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 z-10
                                        [&_th]:bg-[#065F46] [&_th]:text-white [&_th]:text-xs
                                        [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide
                                        [&_th]:px-4 [&_th]:py-3 [&_th]:whitespace-nowrap
                                        [&_th]:border-r [&_th]:border-white/20 [&_th:last-child]:border-r-0">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Client</TableHead>
                                            <TableHead>Booking ID</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Agent</TableHead>
                                            <TableHead>Taken By</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bookingData.map((item, idx) => (
                                            <TableRow key={idx} className={`border-b border-slate-100 hover:bg-emerald-50/30 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-xs font-mono text-slate-500">{item.date || "—"}</TableCell>
                                                <TableCell className="px-4 py-3 min-w-[160px]">
                                                    <p className="text-sm font-semibold text-slate-800">{item.clientName || "—"}</p>
                                                    <p className="text-xs font-mono text-slate-500 mt-0.5">{item.clientMobile || ""}</p>
                                                    <p className="text-xs text-slate-400 truncate max-w-[180px]">{item.clientEmail || ""}</p>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap">
                                                    <span className="text-xs font-mono bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded-md">{item.bookingId || "—"}</span>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap">
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
                                                        {item.bookingStatus || "—"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap">
                                                    <span className="text-sm font-bold text-slate-800 font-mono">
                                                        ₹{(parseFloat(String(item.bookingAmount)) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 min-w-[140px]">
                                                    <p className="text-sm font-medium text-slate-700">{item.agentName || "—"}</p>
                                                    <p className="text-xs font-mono text-slate-500">{item.agentMobile || ""}</p>
                                                    <p className="text-xs text-slate-400 truncate">{item.agentEmail || ""}</p>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap">
                                                    <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded">{item.takenBy || "—"}</span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {!bookingLoading && !bookingError && bookingData.length > 0 && (
                        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 bg-white border-t border-slate-200 text-xs text-slate-400">
                            <span>{bookingData.length} booking{bookingData.length !== 1 ? "s" : ""} found</span>
                            <span>Only confirmed bookings are shown</span>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                MODALS — EDIT & ONBOARD (Part 1 / 2 / 3)
            ══════════════════════════════════════════════════════════════════ */}
            <ContactCaptureModal
                isOpen={!!editingLead}
                onClose={() => { setEditingLead(null); setActivePart(null); setActivePartHasData(false); setIsModalLocked(false); setModalInitialData({}) }}
                onSubmit={handleCaptureSubmit}
                initialData={modalInitialData}
                lockedFields={activePart ? new Set<keyof ContactCaptureData>() : isModalLocked}
                showSubmitButton={!!activePart}
            />

            <Part2Modal
                isOpen={isPart2Open}
                onClose={() => { setIsPart2Open(false); setActivePart(null); setActivePartHasData(false); setSelectedLeadForPart2(null); setPart2InitialData({}); setIsPart2Locked(false) }}
                onSubmit={handlePart2Submit}
                partnerName={selectedLeadForPart2?.Business_Name}
                initialData={part2InitialData}
                lockedFields={activePart ? new Set<string>() : isPart2Locked}
                showSubmitButton={!!activePart}
            />

            <Part3Modal
                isOpen={isPart3Open}
                onClose={() => { setIsPart3Open(false); setActivePart(null); setActivePartHasData(false); setSelectedLeadForPart3(null); setPart3InitialData({}); setIsPart3Locked(false) }}
                onSubmit={handlePart3Submit}
                partnerName={selectedLeadForPart3?.Business_Name}
                partnerId={selectedLeadForPart3?.Lead_ID}
                initialData={part3InitialData}
                lockedFields={activePart ? new Set<string>() : isPart3Locked}
                showSubmitButton={!!activePart}
            />

        </div>
    )
}
