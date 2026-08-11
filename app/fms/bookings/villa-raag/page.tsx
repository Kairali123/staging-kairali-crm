"use client"

import { useState, useRef, useEffect } from "react"
import CollectionModal from "@/components/villa-collection-model";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { BackButton } from "@/components/back-button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Receipt,
  User,
  Phone,
  Mail,
  CreditCard,
  Edit,
  Eye,
  Building,
  Trash2,
  CheckCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
  Upload,
  XCircle,
  X,
  Home,
  Sparkles,
  CalendarDays,
  BarChart3,
  Building2,
  Globe,
  PauseCircle,
} from "lucide-react"
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, Cell, Pie, PieChart } from "recharts"
function formatLabel(label: string) {
  return label
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(val: any) {
  if (val === null || val === undefined || val === "") return "-";
  const n = Number(String(val).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return String(val);
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function getBookingValue(booking: any, key: string) {
  if (!booking) return "-";

  const variants = [
    key,
    key.toLowerCase(),
    key.replace(/\s+/g, "_"),
    key.replace(/\s+/g, "").toLowerCase(),
    key.replace(/[()\/-]/g, "").replace(/\s+/g, "_").toLowerCase(),
  ];

  for (const v of variants) {
    if (booking[v] !== undefined && booking[v] !== null && booking[v] !== "") {
      return booking[v];
    }
  }
  return "-";
}
const paymentFields = [
  "Cash", "Credit Card", "Debit Card", "Quick Pay", "Payment Wallets", "Net Banking", "NEFT", "RTGS", "IMPS", "UPI", "USSD",
  "Cash Card", "Cheque / DD", "E-Collect", "Debit Note", "Credit Note", "Bills Payment", "Gift Card", "Commission", "TDS",
  "Agent Payable", "Air Pay", "Bank Transfer", "AUB Paymate", "QR Code", "Bank Deposit", "MoMo", "Bad Debts",
  "Gift Certificate", "AmEx Card", "Razor Pay", "Loyalty Rewards", "BDO- GCash/QRPH", "PALAWAN SCAN TO PAY", "HO Cash",
  "TDS ITAX", "TDS IGST", "TDS CGST", "TDS SGST", "TCS IGST", "TCS CGST", "TCS SGST", "Premier Bank", "Darasalam Bank",
  "ZAAD Shilling", "ZAAD Dollar", "E-DAHAB Shilling", "E-DAHAB Dollar", "Zomato", "Swiggy", "Cash SOS", "Dahabshil Bank",
  "Total Amount(A+B+C)", "Stay Date Room Revenue", "Stay Date Addon Revenue", "Stay Date Outlet Revenue",
  "Total Stay Date Revenue", "Total Payments", "Total Outstanding Amount", "Net Payable by Guest",
  "Net Payable by Agent", "Receipt Numbers", "Payment Notes", "Special Instruction", "Internal Notes",
  "Total tax by OTA", "Price Override", "Service Tax on Commission", "Gross amount before price override",
  "Gross amount after price override", "Price overridden by", "Complimentary Status", "Complimentary Type",
  "Discount Reason", "Room Send Bill", "Extras Send Bill", "Package Name", "VCC Mode", "Upgraded", "SOA Numbers",
  "OTA Commission", "Tax on Commission", "TCS", "TDS", "Payable By OTA"
];

interface Booking {
  id: string
  bookerName?: string
  bookingId: string
  reservationNo?: string
  bookingDateTime?: string
  guestName: string
  mobile?: string
  email?: string
  country?: string
  roomNumber?: string
  noOfRooms?: number | string
  mealPlan?: string
  checkIn: string
  checkInTime?: string
  checkOut: string
  checkOutTime?: string
  lengthOfStay?: number
  villaType: string
  villaNumber: string
  roomName: string
  roomCategory?: string
  plan: string
  roomPrice?: number
  discountTotal?: number
  netPayable?: number
  addOnsPrice?: number
  invoiceAmount?: number
  totalPayments?: number
  totalPax?: number
  payAtHotel?: boolean | string
  amount: number
  receivedAmount: number
  totalRoomCost?: number
  addonsTotal?: number
  subTotalAmount?: number
  taxesAmount?: number
  paymentsAmount?: number
  netPaymentsByGuest?: number
  netPayableAtHotel?: number
  approvedTillDate: string
  status: "confirmed" | "no show" | "cancelled" | "payment_pending" | "auto_release"
  assignedTo: string
  team: "sales" | "accounts"
  createdDate: string
  lastUpdated: string
  lastModifiedBy?: string
  source: string
  sourceType?: string
  bookingSubSource?: string
  bookingType?: string
  paymentStatus: string
  salesTeamStatus: "pending" | "in_progress" | "completed" | "on_hold"
  accountsVerifyStatus: "payment_verified" | "approval_verified" | "booking_cancelled" | "pending" | "under_review"
  frontOfficeStatus: "pms_verified_done" | "booking_cancelled" | "pending" | "processing"
  paymentSettlementStatus: "full_payment_received" | "booking_cancelled" | "partial_payment" | "pending"
  bookingStatus?: string
  cancellationRemarks?: string
  complimentaryStatus?: string
  receivedPercentage?: number
  salesperson?: string
  contactNumber?: string
  totalAmount?: string
  paidAmount?: string
  paymentRecords?: Array<{
    amount: number
    method: string
    date: string
    receiptNumber?: string
    collectedBy?: string
    note?: string
  }>
  invoiceNumber?: string
  invoiceUrl?: string
  InvoiceHistoryLink?: string
  PaymentCollectionHistoryLink?: string
}

function matchBookingSource(
  source?: string,
  filter?: string,
  sourceType?: string,
  bookingSubSource?: string
) {
  const s = (source || "").toLowerCase()
  const st = (sourceType || "").toLowerCase()
  const sub = (bookingSubSource || "").toLowerCase()

  if (!filter || filter === "all") return true

  switch (filter) {
    case "direct":
      return (
        s.includes("direct") ||
        s.includes("offline")

      )

    case "online":
      // ❗ explicitly EXCLUDE OTA
      return (
        (
          s.includes("website") ||
          s.includes("online booking engine") ||
          s.includes("booking engine") ||
          st === "online" ||
          s.includes("meta") ||
          sub.includes("website")
        ) &&
        !s.includes("ota") &&
        !st.includes("ota")
      )

    case "ota":
      return (
        s.includes("ota") ||
        st.includes("ota") ||
        s.includes("booking.com") ||
        s.includes("agoda") ||
        s.includes("expedia")
      )

    case "agent":
      return (
        s.includes("agent") ||
        st.includes("agent")
      )

    default:
      return true
  }
}



// Helper: parse dates robustly from several common formats (ISO, timestamp, dd/mm/yyyy)
function parseMaybeDate(input: any): Date | null {
  if (!input && input !== 0) return null
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input
  if (typeof input === "number") {
    const d = new Date(input)
    return isNaN(d.getTime()) ? null : d
  }
  const s = String(input).trim()
  if (!s) return null

  // ISO-like (yyyy-mm-dd or full ISO) -> Date constructor works reliably
  if (/^\d{4}-\d{2}-\d{2}/.test(s) || s.includes("T")) {
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }

  // dd/mm/yyyy or d/m/yyyy
  const dm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dm) {
    const day = Number(dm[1]), month = Number(dm[2]) - 1, year = Number(dm[3])
    const d = new Date(year, month, day)
    return isNaN(d.getTime()) ? null : d
  }

  // fallback: try Date constructor once
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}
function getDateRange(filter: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(today)
  const end = new Date(today)

  switch (filter) {
    case "today":
      break

    case "yesterday":
      start.setDate(start.getDate() - 1)
      end.setDate(end.getDate() - 1)
      break

    case "this_week": {
      const day = today.getDay()
      const diff = today.getDate() - day + (day === 0 ? -6 : 1)
      start.setDate(diff)
      end.setDate(start.getDate() + 6)
      break
    }

    case "last_week": {
      const day = today.getDay()
      const diff = today.getDate() - day - 6
      start.setDate(diff)
      end.setDate(start.getDate() + 6)
      break
    }

    case "this_month":
      start.setDate(1)
      end.setMonth(end.getMonth() + 1, 0)
      break

    case "last_month":
      start.setMonth(start.getMonth() - 1, 1)
      end.setMonth(end.getMonth(), 0)
      break

    case "this_year":
      start.setMonth(0, 1)
      end.setMonth(11, 31)
      break

    case "last_year":
      start.setFullYear(start.getFullYear() - 1, 0, 1)
      end.setFullYear(end.getFullYear() - 1, 11, 31)
      break

    default:
      return null
  }

  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function fmtDateSafe(input: any): string {
  const d = parseMaybeDate(input)
  return d ? d.toLocaleDateString() : "-"
}
function fmtDateTimeSafe(input: any): string {
  const d = parseMaybeDate(input)
  if (!d) return "-"

  // Format: DD/MM/YYYY HH:MM:SS
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}
// Helper: map external API booking payloads (or booking objects) to normalized numeric fields
function mapExternalBookingData(payload: any) {
  try {
    let data: any = payload
    if (!data) return null
    if (typeof data === "string") {
      try {
        data = JSON.parse(data)
      } catch (e) {
        return null
      }
    }

    const getNumber = (v: any) => {
      if (v === undefined || v === null || v === "") return undefined
      const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.-]/g, ""))
      return Number.isNaN(n) ? undefined : n
    }

    const invoice = data["Invoice Amount"] ?? data["InvoiceAmount"] ?? data.invoiceAmount ?? data["Invoice Amount(INR)"]
    const amountPaid = data["Amount Paid"] ?? data["AmountPaid"] ?? data.amountPaid ?? data["Amount Received"]
    const totalRoom = data["Total Room Price"] ?? data.totalRoomPrice ?? data["TotalRoomPrice"]
    const totalAddon = data["Total Addon Price"] ?? data.totalAddonPrice ?? data["TotalAddonPrice"]
    const totalDiscount = data["Total Discount Price"] ?? data.totalDiscountPrice ?? data["TotalDiscountPrice"]
    const totalTax = data["Total Tax"] ?? data.totalTax ?? data["TotalTax"]
    const subTotalAmount = data["Sub Total"] ?? data.subTotalAmount ?? data["subTotalAmount"]
    const netPayable = data["Net Payable At Hotel"] ?? data.netPayableAtHotel ?? data["NetPayableAtHotel"]

    const mapped: any = {}
    if (invoice !== undefined) mapped.amount = getNumber(invoice)
    if (amountPaid !== undefined) mapped.receivedAmount = getNumber(amountPaid)
    if (totalRoom !== undefined) mapped.totalRoomCost = getNumber(totalRoom)
    if (totalAddon !== undefined) mapped.addonsTotal = getNumber(totalAddon)
    if (totalDiscount !== undefined) mapped.discountTotal = getNumber(totalDiscount)
    if (totalTax !== undefined) mapped.taxesAmount = getNumber(totalTax)
    if (subTotalAmount !== undefined) mapped.subTotalAmount = getNumber(subTotalAmount)
    if (netPayable !== undefined) mapped.netPayableAtHotel = getNumber(netPayable)
    if (mapped.receivedAmount !== undefined) mapped.paymentsAmount = mapped.receivedAmount

    return Object.keys(mapped).length ? mapped : null
  } catch (e) {
    return null
  }
}

function formatLengthOfStay(booking: any): string {
  // prefer explicit API fields (common variants)
  const explicit = booking.lengthOfStay ?? booking.stayLength ?? booking.nights ?? (booking as any).length_of_stay
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== "") return String(explicit)

  const ci = parseMaybeDate(booking.checkIn ?? booking["Arrival Date"] ?? booking.arrivalDate)
  const co = parseMaybeDate(booking.checkOut ?? booking["Departure Date"] ?? booking.departureDate)
  if (!ci || !co) return "-"

  const msPerDay = 1000 * 60 * 60 * 24
  const diff = Math.ceil((co.getTime() - ci.getTime()) / msPerDay)
  const nights = Math.max(1, diff)
  return `${nights} night${nights > 1 ? "s" : ""}`
}

export default function VillaRaagBookingPage() {
  const tableRef = useRef<HTMLDivElement | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Local helper functions for data normalization
  function getNumeric(item: any, ...keys: string[]) {
    for (const k of keys) {
      if (!item || !(k in item)) continue;
      const raw = item[k];
      if (raw === null || raw === undefined || raw === "") continue;
      if (typeof raw === "number") {
        if (!Number.isNaN(raw)) return raw;
        continue;
      }
      const cleaned = String(raw).replace(/[^0-9.-]/g, "");
      if (cleaned === "") continue;
      const n = Number(cleaned);
      if (!Number.isNaN(n)) return n;
    }
    return undefined;
  }

  function getString(item: any, ...keys: string[]) {
    for (const k of keys) {
      if (!item || !(k in item)) continue;
      const v = item[k];
      if (v === null || v === undefined) continue;
      const s = String(v).trim();
      if (s !== "" && s.toUpperCase() !== "NULL") return s;
    }
    return undefined;
  }

  const fetchBookings = async () => {
    setLoading(true)
    setError(null)
    try {
      const pageSize = 100
      let page = 1
      let totalCount = Number.POSITIVE_INFINITY
      const data: any[] = []

      while (data.length < totalCount) {
        const res = await fetch(`/api/villa-bookings?page=${page}&limit=${pageSize}`)
        if (!res.ok) throw new Error("Failed to fetch villa bookings")
        const result = await res.json()
        const pageRows = Array.isArray(result.bookings) ? result.bookings : []
        data.push(...pageRows)
        totalCount = Number.isFinite(Number(result.totalCount)) ? Number(result.totalCount) : data.length
        if (pageRows.length < pageSize) break
        page += 1
      }

      const formatted = data.map((item: any, index: number) => {
        const invoiceAmount = getNumeric(item, "invoice_amount") ?? 0
        const receivedAmount = getNumeric(item, "total_received_amount") ?? 0

        const statusRaw = (getString(item, "booking_status") || "").toLowerCase()
        let status: any
        if (statusRaw.includes("cancel")) status = "cancelled"
        else if (statusRaw.includes("no show")) status = "no show"
        else if (statusRaw.includes("hold")) status = "hold"
        else if (statusRaw.includes("confirm")) status = "confirmed"
        else status = "pending"

        const percentReceived = getNumeric(item, "percent_received_amount") ??
          (invoiceAmount === 0
            ? (receivedAmount > 0 ? 100 : 0)
            : Math.round((receivedAmount / invoiceAmount) * 100))

        const paymentStatus =
          percentReceived >= 100 ? "paid" : percentReceived > 0 ? "partial" : "pending"

        const sourceRaw = (getString(item, "booking_source") || "").toUpperCase()
        let source: string
        if (sourceRaw === "DIRECT" || sourceRaw === "OFFLINE_AGENT") {
          source = "Direct Booking"
        } else if (sourceRaw === "BOOKING_ENGINE") {
          source = "Online Booking Engine"
        } else if (sourceRaw === "OTA") {
          source = "OTA"
        } else {
          source = getString(item, "booking_source") || "API Import"
        }

        const sourceType = getString(item, "source_type") || ""

        const payAtHotelRaw = (getString(item, "pay_at_hotel") || "").toLowerCase()
        const payAtHotel =
          payAtHotelRaw === "yes" || payAtHotelRaw === "true" || payAtHotelRaw === "1"
            ? true
            : payAtHotelRaw === "no" || payAtHotelRaw === "false" || payAtHotelRaw === "0"
              ? false
              : undefined

        const compRaw = (getString(item, "complimentary_status") || "").toLowerCase()
        const complimentary =
          compRaw === "" ? null
            : ["yes", "true", "1"].includes(compRaw) ? true
              : ["no", "false", "0"].includes(compRaw) ? false
                : getString(item, "complimentary_status")

        const receivedAmountSingle = getNumeric(item, "received_amount")
        const paymentRecords = receivedAmountSingle
          ? [{
            amount: receivedAmountSingle,
            method: getString(item, "payment_mode") || "Unknown",
            date: item["payment_received_datetime"] || item["booking_date_time"] || "",
            receiptNumber: getString(item, "receipt_transaction_number"),
            collectedBy: getString(item, "payment_collection_by"),
          }]
          : []

        const id = String(
          (getString(item, "unique_id") ||
            getString(item, "booking_id") ||
            getString(item, "reservation_number") ||
            "") + "-" + index
        )

        return {
          id,
          bookingId: getString(item, "booking_id") || "",
          reservationNo: getString(item, "reservation_number") || "",
          bookingDateTime: item["booking_date_time"] || "",

          guestName: getString(item, "name_of_client") || "",
          bookerName: getString(item, "name_of_the_booker") || "",
          mobile: getString(item, "mobile") || "",
          email: getString(item, "guest_email") || "",
          country: getString(item, "country") || "",

          checkIn: item["arrival_date"] || "",
          checkInTime: item["check_in_time"] || "",
          checkOut: item["departure_date"] || "",
          checkOutTime: item["check_out_time"] || "",
          lengthOfStay: getNumeric(item, "length_of_stay", "total_room_nights"),

          mealPlan: getString(item, "meal_plan_type", "meal_plans") || "",
          plan: getString(item, "meal_plan_type", "meal_plans") || "",

          villaType: "Villa Raag",
          villaNumber: getString(item, "room_no") || "N/A",
          roomName: getString(item, "room_category") || "N/A",
          roomCategory: getString(item, "room_category") || "",
          noOfRooms: getNumeric(item, "no_of_rooms"),
          totalPax: getNumeric(item, "total_pax", "number_of_adults") ?? 0,

          amount: invoiceAmount,
          receivedAmount,
          totalRoomCost: getNumeric(item, "room_price"),
          addonsTotal: getNumeric(item, "add_ons_price"),
          outletRevenue: getNumeric(item, "outlet_price"),
          discountTotal: Math.abs(getNumeric(item, "discount_amount") ?? 0),
          taxesAmount: getNumeric(item, "taxes"),
          subTotalAmount: getNumeric(item, "subtotal"),
          netPayable: getNumeric(item, "net_payable_a") ?? invoiceAmount,
          finalTotalAmount: invoiceAmount,
          paymentsAmount: receivedAmount,
          netPaymentsByGuest: getNumeric(item, "net_payable_by_guest"),
          netPayableAtHotel: getNumeric(item, "net_payable_a"),

          invoiceNumber: getString(item, "invoice_number") || "",
          invoiceUrl: getString(item, "invoice_url") || "",
          InvoiceHistoryLink: getString(item, "invoice_history_url") || "",
          PaymentCollectionHistoryLink: getString(item, "payment_collection_history_link") || "",
          cancellationRemarks: getString(item, "cancellation_remarks") || "",

          approvedTillDate: "",
          status,
          assignedTo: getString(item, "booking_taken_by") || "",
          salesperson: getString(item, "booking_taken_by") || "",
          contactNumber: getString(item, "mobile") || "",
          team: "sales",
          createdDate: item["booking_date_time"] || "",
          lastUpdated: item["last_edit_date"] || "",
          lastModifiedOn: item["last_edit_date"] || "",
          lastModifiedBy: getString(item, "last_modified_by") || "",

          source,
          sourceType,
          bookingSubSource: sourceType,
          bookingType: getString(item, "booking_type") || "",

          paymentStatus,
          receivedPercentage: percentReceived,
          payAtHotel,
          complimentary,
          complimentaryStatus: getString(item, "complimentary_status") || "",

          salesTeamStatus:
            status === "cancelled" ? "completed"
              : status === "hold" ? "on_hold"
                : status === "confirmed" ? "completed"
                  : "pending",
          accountsVerifyStatus:
            status === "cancelled" ? "booking_cancelled"
              : paymentStatus === "paid" ? "payment_verified"
                : "pending",
          frontOfficeStatus:
            status === "cancelled" ? "booking_cancelled"
              : status === "confirmed" ? "pms_verified_done"
                : "pending",
          paymentSettlementStatus:
            status === "cancelled" ? "booking_cancelled"
              : paymentStatus === "paid" ? "full_payment_received"
                : paymentStatus === "partial" ? "partial_payment"
                  : "pending",

          totalAmount: String(invoiceAmount || 0),
          paidAmount: String(receivedAmount || 0),
          paymentRecords,
        }
      })
      setBookings(formatted)
    } catch (err: any) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const [tempSearch, setTempSearch] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [teamFilter, setTeamFilter] = useState<string>("all")
  const [bookingDateFilter, setBookingDateFilter] = useState<string>("this_week")
  const [checkInFilter, setCheckInFilter] = useState<string>("all")
  const [checkOutFilter, setCheckOutFilter] = useState<string>("all")
  type ActiveDateType = "booking" | "checkin" | "checkout" | null
  const [activeDateType, setActiveDateType] = useState<ActiveDateType>(null)
  const [assignedFilter, setAssignedFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" })
  const [sortField, setSortField] = useState<keyof Booking>("createdDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string>("")
  const [cancelReason, setCancelReason] = useState<string>("")
  const [cancelRemarks, setCancelRemarks] = useState<string>("")

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null)
  const [paymentData, setPaymentData] = useState({
    receivedAmount: "",
    currency: "INR",
    paymentMode: "",
    receivedDate: "",
    receiptNumber: "",
    screenshot: null as File | null,
    paymentLocation: "",
    paymentCollectedBy: "",
  })

  const [viewMode, setViewMode] = useState<"table" | "chart">("table")

  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null)
  const [showBillCollectionModal, setShowBillCollectionModal] = useState(false)
  const [selectedBookingForBillCollection, setSelectedBookingForBillCollection] = useState<Booking | null>(null)
  const [showCollectionPopup, setShowCollectionPopup] = useState(false)
  const [selectedBookingForCollection, setSelectedBookingForCollection] = useState<Booking | null>(null)
  const [collectionReceipts, setCollectionReceipts] = useState<any[]>([])
  const [gasDetails, setGasDetails] = useState<{ folio?: string; mobile?: string; checkInLabel?: string } | null>(null)
  const [loadingCollection, setLoadingCollection] = useState(false)

  const ADDON_API_URL = "https://script.google.com/macros/s/AKfycbzXpMajQyAnBMYWCTm8jzG5_HUPtIuUa_Wz7Nz40O92JsCiv8JSXclD70EJYU1_WTGmlw/exec"
  const OUTLET_API_URL = "https://script.google.com/macros/s/AKfycbxdLHJ-2btHbpgZiQ3970BX-ZA7kZCvS94DbRzXLESxVhe_F49I_5NBXGVtcCtwRKl6/exec"

  // Pagination for Active Villa Bookings
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(5)
  // Pagination for Cancelled Villa Bookings
  const [cancelledPage, setCancelledPage] = useState<number>(1)
  const [cancelledItemsPerPage, setCancelledItemsPerPage] = useState<number>(5)

  const filterByDates = (booking: Booking) => {

    /* ================= BOOKING DATE ================= */
    if (bookingDateFilter !== "all") {
      const bookingDate =
        parseMaybeDate(booking.bookingDateTime) ??
        parseMaybeDate(booking.createdDate)

      if (!bookingDate) return false

      if (bookingDateFilter === "custom" && activeDateType === "booking") {
        if (customDateRange.start && customDateRange.end) {
          const start = new Date(customDateRange.start)
          const end = new Date(customDateRange.end)
          start.setHours(0, 0, 0, 0)
          end.setHours(23, 59, 59, 999)

          if (bookingDate < start || bookingDate > end) return false
        }
      } else {
        const range = getDateRange(bookingDateFilter)
        if (range && (bookingDate < range.start || bookingDate > range.end)) {
          return false
        }
      }
    }

    /* ================= CHECK-IN DATE ================= */
    if (checkInFilter !== "all") {
      const bookingIn =
        parseMaybeDate(booking.checkIn) ??
        parseMaybeDate(booking.createdDate)

      if (!bookingIn) return false

      if (checkInFilter === "custom" && activeDateType === "checkin") {
        if (customDateRange.start && customDateRange.end) {
          const start = new Date(customDateRange.start)
          const end = new Date(customDateRange.end)
          start.setHours(0, 0, 0, 0)
          end.setHours(23, 59, 59, 999)

          if (bookingIn < start || bookingIn > end) return false
        }
      } else {
        const range = getDateRange(checkInFilter)
        if (range && (bookingIn < range.start || bookingIn > range.end)) {
          return false
        }
      }
    }

    /* ================= CHECK-OUT DATE ================= */
    if (checkOutFilter !== "all") {
      const bookingOut = parseMaybeDate(booking.checkOut)
      if (!bookingOut) return false

      if (checkOutFilter === "custom" && activeDateType === "checkout") {
        if (customDateRange.start && customDateRange.end) {
          const start = new Date(customDateRange.start)
          const end = new Date(customDateRange.end)
          start.setHours(0, 0, 0, 0)
          end.setHours(23, 59, 59, 999)

          if (bookingOut < start || bookingOut > end) return false
        }
      } else {
        const range = getDateRange(checkOutFilter)
        if (range && (bookingOut < range.start || bookingOut > range.end)) {
          return false
        }
      }
    }

    return true
  }

  const getStayingStatus = (booking: Booking) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const checkIn = booking.checkIn ? new Date(booking.checkIn) : null
    const checkOut = booking.checkOut ? new Date(booking.checkOut) : null

    if (!checkIn || !checkOut) {
      return { label: "Unknown", className: "bg-gray-100 text-gray-700 border-gray-300" }
    }

    checkIn.setHours(0, 0, 0, 0)
    checkOut.setHours(0, 0, 0, 0)

    if (today < checkIn) {
      return {
        label: "Upcoming",
        className: "bg-blue-100 text-blue-800 border-blue-300",
      }
    }

    if (today >= checkIn && today <= checkOut) {
      return {
        label: "Staying",
        className: "bg-emerald-100 text-emerald-800 border-emerald-300",
      }
    }

    if (today > checkOut) {
      return {
        label: "Checked-Out",
        className: "bg-red-100 text-red-800 border-red-300",
      }
    }

    return { label: "Unknown", className: "bg-gray-100 text-gray-700 border-gray-300" }
  }


  // Filter and sort logic
  const filteredBookings = bookings
    .filter((booking) => {
      const q = (searchText ?? "").toLowerCase()
      const guest = (booking.guestName ?? "").toLowerCase()
      const bid = (booking.bookingId ?? "").toString().toLowerCase()
      const assigned = (booking.assignedTo ?? "").toLowerCase()
      const rno = (booking.reservationNo ?? "").toLowerCase()
      const mobile = (booking.mobile ?? booking.contactNumber ?? "")
        .toString()
        .toLowerCase()

      const email = (booking.email ?? "").toLowerCase()


      const matchesSearch =
        q === "" ||
        guest.includes(q) ||
        bid.includes(q) ||
        rno.includes(q) ||
        assigned.includes(q) ||
        mobile.includes(q) ||
        email.includes(q)

      const status = (booking.status ?? "").toString().toLowerCase()
      const salesStatus = (booking.salesTeamStatus ?? "").toString().toLowerCase()
      const accountsStatus = (booking.accountsVerifyStatus ?? "").toString().toLowerCase()
      const frontStatus = (booking.frontOfficeStatus ?? "").toString().toLowerCase()
      const paymentStatus = (booking.paymentSettlementStatus ?? "").toString().toLowerCase()

      let matchesStatus = false
      if (statusFilter === "all") {
        matchesStatus = true
      } else if (statusFilter === "canceled" || statusFilter === "cancelled") {
        matchesStatus =
          status === "canceled" ||
          status === "cancelled" ||
          salesStatus.includes("cancel") ||
          accountsStatus.includes("cancel") ||
          frontStatus.includes("cancel") ||
          paymentStatus.includes("cancel")
      } else if (statusFilter === "hold") {
        matchesStatus = status === "hold" || salesStatus.includes("hold")
      } else if (statusFilter === "no show") {
        matchesStatus = status === "no show"
      }
      else if (statusFilter === "pending") {
        const isPendingFlag = status === "pending" || salesStatus.includes("pending") || frontStatus.includes("pending")
        const isConfirmedFlag = status === "confirmed" || salesStatus.includes("completed") || frontStatus.includes("pms_verified_done")
        matchesStatus = isPendingFlag && !isConfirmedFlag
      } else {
        matchesStatus = status === statusFilter
      }
      const matchesTeam = teamFilter === "all" || (booking.team ?? "").toString() === teamFilter
      const matchesDate = filterByDates(booking)
      const matchesAssigned = assignedFilter === "all" || (booking.assignedTo ?? "").toString() === assignedFilter
      const matchesSource = matchBookingSource(
        booking.source,
        sourceFilter,
        booking.sourceType,
        booking.bookingSubSource
      )

      return matchesSearch && matchesStatus && matchesTeam && matchesDate && matchesSource && matchesAssigned
    })
    .sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })


  const onlineBookingEngine = filteredBookings.filter((b) => b.source === "Online Booking Engine").length
  const otaBookings = filteredBookings.filter((b) => b.source === "OTA").length
  const travelAgents = filteredBookings.filter((b) => b.source === "Travel Agent").length
  const referenceBookings = filteredBookings.filter(
    (b) =>
      (b.source || "").toString().toLowerCase().includes("ref") ||
      (b.source || "").toString().toLowerCase().includes("compliment") ||
      (b.source || "").toString().toLowerCase().includes("reference"),
  ).length

  const totalBookings = filteredBookings.length

  const confirmedBookings = filteredBookings.filter((b) => (b.status ?? "").toString().toLowerCase() === "confirmed").length

  const holdBookings = filteredBookings.filter((b) => {
    const s = (b.salesTeamStatus ?? "").toString().toLowerCase()
    return s === "on_hold" || s === "hold" || s.includes("hold")
  }).length

  const pendingBookings = filteredBookings.filter((b) => ((b.status ?? "").toString().toLowerCase() === "pending")).length

  const cancelledRows = filteredBookings.filter(
    (b) => (b.status ?? "").toString().toLowerCase() === "cancelled"
  )
  const cancelledBookings = cancelledRows.length

  const noShowRows = filteredBookings.filter(
    (b) => (b.status ?? "").toString().toLowerCase() === "no show"
  )

  const noShowBookings = noShowRows.length

  const noShowAmount = noShowRows.reduce(
    (sum, b) => sum + (b.amount || 0),
    0
  )


  const confirmedBookingsAll = bookings.filter((b) => (b.status ?? "").toString().toLowerCase() === "confirmed").length

  const cancelledBookingsAll = bookings.filter((b) => {
    const status = (b.status ?? "").toString().toLowerCase()
    const accounts = (b.accountsVerifyStatus ?? "").toString().toLowerCase()
    const front = (b.frontOfficeStatus ?? "").toString().toLowerCase()
    const payment = (b.paymentSettlementStatus ?? "").toString().toLowerCase()

    return (
      status === "cancelled" ||
      accounts.includes("cancel") ||
      front.includes("cancel") ||
      payment.includes("cancel")
    )
  }).length



  const bookingSourceStats = {
    offline: {
      count: filteredBookings.filter(
        (b) =>
          (b.source || "").toLowerCase().includes("direct") ||
          (b.source || "").toLowerCase().includes("offline")
      ).length,
      amount: filteredBookings
        .filter(
          (b) =>
            (b.source || "").toLowerCase().includes("direct") ||
            (b.source || "").toLowerCase().includes("offline")

        )
        .reduce((sum, b) => sum + (b.amount || 0), 0),
    },

    online: {
      count: filteredBookings.filter(
        (b) =>
          (b.source || "").toLowerCase().includes("booking") ||
          (b.source || "").toLowerCase().includes("engine") ||
          (b.source || "").toLowerCase().includes("meta")
      ).length,
      amount: filteredBookings
        .filter(
          (b) =>
            (b.source || "").toLowerCase().includes("booking") ||
            (b.source || "").toLowerCase().includes("engine") ||
            (b.source || "").toLowerCase().includes("meta")
        )
        .reduce((sum, b) => sum + (b.amount || 0), 0),
    },

    ota: {
      count: filteredBookings.filter(
        (b) => (b.source || "").toLowerCase().includes("ota")
      ).length,
      amount: filteredBookings
        .filter((b) => (b.source || "").toLowerCase().includes("ota"))
        .reduce((sum, b) => sum + (b.amount || 0), 0),
    },

    travelAgent: {
      count: filteredBookings.filter(
        (b) => (b.source || "").toLowerCase().includes("agent")
      ).length,
      amount: filteredBookings
        .filter((b) => (b.source || "").toLowerCase().includes("agent"))
        .reduce((sum, b) => sum + (b.amount || 0), 0),
    },
  }




  const totalAmount = filteredBookings.reduce((sum, booking) => sum + booking.amount, 0)
  const totalReceived = filteredBookings.reduce((sum, booking) => sum + booking.receivedAmount, 0)

  const pendingRows = filteredBookings.filter(
    (b) => (b.status ?? "").toString().toLowerCase() === "pending"
  )
  const pendingAmount = pendingRows.reduce((s, b) => s + (b.amount || 0), 0)

  const totalAmountAll = bookings.reduce((sum, booking) => sum + (booking.amount || 0), 0)
  const totalReceivedAll = bookings.reduce((sum, booking) => sum + (booking.receivedAmount || 0), 0)

  const cancelledAmount = cancelledRows.reduce((s, b) => s + (b.amount || 0), 0)

  const cancelledAmountAll = bookings.reduce((sum, booking) => {
    const status = (booking.status ?? "").toString().toLowerCase()
    const accounts = (booking.accountsVerifyStatus ?? "").toString().toLowerCase()
    const front = (booking.frontOfficeStatus ?? "").toString().toLowerCase()
    const payment = (booking.paymentSettlementStatus ?? "").toString().toLowerCase()

    const isCancelled = (
      status === "canceled" || status === "cancelled" || accounts.includes("cancel") || front.includes("cancel") || payment.includes("cancel")
    )

    return isCancelled ? sum + (booking.amount || 0) : sum
  }, 0)

  const chartData = [
    { name: "Confirmed", value: confirmedBookings, color: "#059669" },
    { name: "Pending", value: pendingBookings, color: "#d97706" },
    { name: "No Show", value: noShowBookings, color: "#f59e0b" },
    { name: "Cancelled", value: cancelledBookings, color: "#dc2626" },
    { name: "Hold", value: holdBookings, color: "#6b7280" },
  ]


  const offlineBookings = filteredBookings.filter((b) => (b.source || "") === "Direct Booking").length
  const bookingDistributionData = [
    { name: "Total Bookings", value: totalBookings, color: "#1e40af" },
    { name: "Offline Booking", value: offlineBookings, color: "#0ea5a4" },
    { name: "Online Engine", value: onlineBookingEngine, color: "#0891b2" },
    { name: "OTA Bookings", value: otaBookings, color: "#7c3aed" },
    { name: "Travel Agents", value: travelAgents, color: "#f97316" },
    { name: "Reference / Complimentary", value: referenceBookings, color: "#ef4444" },
  ]

  const bookingOverviewData = [
    { name: "Confirmed", value: confirmedBookings, color: "#059669" },
    { name: "Pending", value: pendingBookings, color: "#d97706" },
    { name: "No Show", value: noShowBookings, color: "#f59e0b" },
    { name: "Cancelled", value: cancelledBookings, color: "#dc2626" },
    { name: "Hold", value: holdBookings, color: "#6b7280" },
  ]


  const revenueChartData = [
    { name: "Amount Received", amount: totalReceived, color: "#059669" },
    { name: "Pending Amount", amount: pendingAmount, color: "#d97706" },
    { name: "No Show Amount", amount: noShowAmount, color: "#f59e0b" },
    { name: "Cancelled Amount", amount: cancelledAmount, color: "#dc2626" },
  ]


  const revenueTotal = revenueChartData.reduce((s, r) => s + (r.amount || 0), 0)

  const toCSV = (rows: any[], columns: string[]) => {
    const header = columns.join(",")
    const lines = rows.map((r) => columns.map((c) => (r[c] ?? "").toString().replace(/\"/g, '""')).join(","))
    return [header, ...lines].join("\n")
  }

  const download = (filename: string, content: string, mime = "text/csv") => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const exportBookingsCSV = () => {
    const csv = toCSV(chartData, ["name", "value"])
    download("villa-raag-bookings.csv", csv)
  }

  const exportRevenueCSV = () => {
    const csv = toCSV(revenueChartData, ["name", "amount"])
    download("villa-raag-revenue.csv", csv)
  }

  const handleSort = (field: keyof Booking) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const clearFilters = () => {
    setTempSearch("")
    setSearchText("")
    setStatusFilter("all")
    setTeamFilter("all")
    setBookingDateFilter("all")
    setCheckInFilter("all")
    setCheckOutFilter("all")
    setAssignedFilter("all")
    setSourceFilter("all")
    setCustomDateRange({ start: "", end: "" })
    setCurrentPage(1)
  }



  const SortIcon = ({ field }: { field: keyof Booking }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-gray-400" />
    return sortDirection === "asc" ? (
      <TrendingUp className="h-3 w-3 text-purple-600" />
    ) : (
      <TrendingDown className="h-3 w-3 text-purple-600" />
    )
  }

  const handleAction = (action: string, bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking) return

    switch (action) {
      case "cancel":
        setSelectedBookingId(bookingId)
        setTimeout(() => setShowCancelModal(true), 100)
        break
      case "payment_upload":
        setSelectedBookingForPayment(booking)
        setTimeout(() => setShowPaymentModal(true), 100)
        break
      case "payment_details":
        setSelectedBookingForCollection(booking)
        setCollectionReceipts([])
        setGasDetails(null)
        setLoadingCollection(true)
        setTimeout(() => setShowCollectionPopup(true), 100)

        fetch(`/api/villa-bookings?action=collection&bookingId=${booking.bookingId || booking.id}`)
          .then(res => res.json())
          .then(data => {
            if (data && Array.isArray(data)) {
              setCollectionReceipts(data)
              if (data.length > 0) {
                const first = data[0]
                setGasDetails({
                  folio: first.folio_number || null,
                  mobile: first.mobile_no || null,
                  checkInLabel: null
                })
              }
            }
          })
          .catch(err => {
            console.error("Failed to fetch collection data from MySQL:", err)
          })
          .finally(() => {
            setLoadingCollection(false)
          })
        break

      case "bill_collection_details": {
        setShowDetailsModal(false)
        setShowPaymentModal(false)

        const found = booking || bookings.find((b) => b.id === booking)
        if (!found) {
          setSelectedBookingForBillCollection(null)
          setTimeout(() => setShowBillCollectionModal(true), 50)
          break
        }

        const mapped = mapExternalBookingData(found) || mapExternalBookingData((found as any).rawPayload) || mapExternalBookingData((found as any).bookingData)
        const merged = { ...found, ...(mapped || {}) }

        setSelectedBookingForBillCollection(merged)
        setTimeout(() => setShowBillCollectionModal(true), 50)
        break
      }
      default:
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-red-100 text-red-800",
      partial: "bg-yellow-100 text-yellow-800",
    }
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"
  }

  const derivedPaymentRecords =
    selectedBookingForPayment?.paymentRecords?.length
      ? selectedBookingForPayment.paymentRecords
      : selectedBookingForPayment?.receivedAmount > 0
        ? [
          {
            date:
              selectedBookingForPayment.lastUpdated ||
              selectedBookingForPayment.createdDate,
            method:
              selectedBookingForPayment.paymentStatus || "Received",
            receiptNumber:
              selectedBookingForPayment.invoiceNumber || "-",
            collectedBy:
              selectedBookingForPayment.assignedTo ||
              selectedBookingForPayment.team ||
              "-",
          },
        ]
        : [];


  const handleCancelBooking = async () => {
    if (!cancelReason.trim() || !selectedBookingId || isSubmitting) return

    setIsSubmitting(true)
    try {
      const booking = bookings.find((b) => b.id === selectedBookingId)
      if (!booking) throw new Error("Booking not found")

      const res = await fetch("/api/villa-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          bookingId: booking.bookingId,
          cancelReason,
          cancellationRemarks: cancelRemarks,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to cancel booking")
      }

      await fetchBookings()
      setShowCancelModal(false)
      setCancelReason("")
      setCancelRemarks("")
      setSelectedBookingId("")
    } catch (err: any) {
      alert(err.message || "An error occurred while cancelling the booking.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentSubmit = async () => {
    if (
      !paymentData.receivedAmount ||
      !paymentData.paymentMode ||
      !paymentData.receivedDate ||
      !paymentData.receiptNumber ||
      !selectedBookingForPayment ||
      isSubmitting
    ) {
      return
    }

    const amount = parseFloat(paymentData.receivedAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive received amount")
      return
    }

    const pending = selectedBookingForPayment.amount - selectedBookingForPayment.receivedAmount
    if (amount > pending) {
      alert("Received amount cannot exceed the pending amount")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/villa-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment",
          bookingId: selectedBookingForPayment.bookingId,
          receivedAmount: amount,
          paymentMode: paymentData.paymentMode,
          receivedDate: paymentData.receivedDate,
          receiptNumber: paymentData.receiptNumber,
          paymentCollectedBy: paymentData.paymentCollectedBy,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to submit payment")
      }

      await fetchBookings()
      setShowPaymentModal(false)
      setSelectedBookingForPayment(null)
      setPaymentData({
        receivedAmount: "",
        currency: "INR",
        paymentMode: "",
        receivedDate: "",
        receiptNumber: "",
        screenshot: null,
        paymentLocation: "",
        paymentCollectedBy: "",
      })
    } catch (err: any) {
      alert(err.message || "An error occurred while submitting payment.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const computeReceivedPercentage = (received: number | string, total: number | string) => {
    const r = Number(received || 0)
    const t = Number(total || 0)
    return t > 0 ? Number(((r / t) * 100).toFixed(2)) : 0
  }

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)
    } catch (e) {
      return `${value.toLocaleString()}`
    }
  }

  const formatBreakdownValue = (value?: number | null, fallback?: number) => {
    const resolved = typeof value === "number" && !Number.isNaN(value) ? value : fallback
    return typeof resolved === "number" && !Number.isNaN(resolved) ? formatCurrency(resolved) : "-"
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const points = payload.map((p: any) => {
      const key = p.dataKey || p.name
      const value = p.value
      const isAmount = key === "amount"
      return {
        name: p.name || key,
        value: isAmount ? formatCurrency(value) : value?.toLocaleString?.() ?? value,
        color: p.color || p.fill || "#111",
      }
    })

    return (
      <div className="bg-white border shadow-sm rounded p-2 text-sm" role="tooltip">
        <div className="font-semibold text-slate-700 mb-1">{label}</div>
        {points.map((pt: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pt.color }} />
            <span className="text-slate-600 mr-2">{pt.name}:</span>
            <span className="font-medium text-slate-900">{pt.value}</span>
          </div>
        ))}
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-100 text-emerald-800 border-emerald-300"
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-300"
      case "payment_pending":
        return "bg-orange-100 text-orange-800 border-orange-300"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300"
      case "no show":
        return "bg-amber-100 text-amber-800 border-amber-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const renderStatusBadge = (status: string, type: string) => {
    const getStatusColor = (status: string, type: string) => {
      switch (type) {
        case "sales":
          switch (status) {
            case "completed":
              return "bg-emerald-100 text-emerald-800 border-emerald-200"
            case "in_progress":
              return "bg-purple-100 text-purple-800 border-purple-200"
            case "on_hold":
              return "bg-amber-100 text-amber-800 border-amber-200"
            default:
              return "bg-slate-100 text-slate-800 border-slate-200"
          }
        case "accounts":
          switch (status) {
            case "payment_verified":
              return "bg-emerald-100 text-emerald-800 border-emerald-200"
            case "approval_verified":
              return "bg-teal-100 text-teal-800 border-teal-200"
            case "booking_cancelled":
              return "bg-red-100 text-red-800 border-red-200"
            case "under_review":
              return "bg-purple-100 text-purple-800 border-purple-200"
            default:
              return "bg-slate-100 text-slate-800 border-slate-200"
          }
        case "frontoffice":
          switch (status) {
            case "pms_verified_done":
              return "bg-emerald-100 text-emerald-800 border-emerald-200"
            case "booking_cancelled":
              return "bg-red-100 text-red-800 border-red-200"
            case "processing":
              return "bg-purple-100 text-purple-800 border-purple-200"
            default:
              return "bg-slate-100 text-slate-800 border-slate-200"
          }
        case "payment":
          switch (status) {
            case "full_payment_received":
              return "bg-emerald-100 text-emerald-800 border-emerald-200"
            case "partial_payment":
              return "bg-amber-100 text-amber-800 border-amber-200"
            case "booking_cancelled":
              return "bg-red-100 text-red-800 border-red-200"
            default:
              return "bg-slate-100 text-slate-800 border-slate-200"
          }
        default:
          return "bg-slate-100 text-slate-800 border-slate-200"
      }
    }

    const formatStatus = (status: string) => {
      if (!status) return "Unknown"
      return status
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status, type)}`}
      >
        {formatStatus(status)}
      </span>
    )
  }

  // 🔵 No Show bookings list
  const noShowBookingsList = filteredBookings.filter(
    (b) => (b.status ?? "").toLowerCase() === "no show"
  )

  // Pagination for No Show Bookings
  const [noShowPage, setNoShowPage] = useState(1)
  const [noShowItemsPerPage, setNoShowItemsPerPage] = useState(5)

  const noShowTotalPages = Math.max(
    1,
    Math.ceil(noShowBookingsList.length / noShowItemsPerPage)
  )

  const noShowStartIndex =
    (noShowPage - 1) * noShowItemsPerPage

  const paginatedNoShowBookings = noShowBookingsList.slice(
    noShowStartIndex,
    noShowStartIndex + noShowItemsPerPage
  )

  // 🔴 Cancelled bookings list
  const cancelledBookingsList = filteredBookings.filter(
    (b) => (b.status ?? "").toLowerCase() === "cancelled"
  )

  // Paginate cancelled bookings
  const cancelledTotalPages = Math.max(
    1,
    Math.ceil(cancelledBookingsList.length / cancelledItemsPerPage)
  )

  const cancelledStartIndex =
    (cancelledPage - 1) * cancelledItemsPerPage

  const paginatedCancelledBookings = cancelledBookingsList.slice(
    cancelledStartIndex,
    cancelledStartIndex + cancelledItemsPerPage
  )


  // 🟢 Active bookings (excluding cancelled and no show)
  const activeBookings = filteredBookings.filter(
    (b) => (b.status ?? "").toLowerCase() !== "cancelled" && (b.status ?? "").toLowerCase() !== "no show"
  )


  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(1)
    setCancelledPage(1)
    setNoShowPage(1)
  }, [
    searchText,
    statusFilter,
    teamFilter,
    bookingDateFilter,
    checkInFilter,
    checkOutFilter,
    sourceFilter,
    assignedFilter,
  ])


  // Paginate active bookings
  const totalPages = Math.max(1, Math.ceil(activeBookings.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const displayedBookings = activeBookings.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => {
    const hasActiveFilter =
      (searchText && searchText.trim() !== "") ||
      statusFilter !== "all" ||
      teamFilter !== "all" ||
      checkInFilter !== "all" ||
      checkOutFilter !== "all" ||
      assignedFilter !== "all" ||
      sourceFilter !== "all"


    if (!hasActiveFilter) return

    if (filteredBookings.length === 0) return

    const t = setTimeout(() => {
      if (tableRef.current) {
        tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }, 300)

    return () => clearTimeout(t)
  }, [searchText, statusFilter, teamFilter, checkInFilter, checkOutFilter, assignedFilter, sourceFilter, filteredBookings.length])


  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-8">

            {/* Loader Animation with Logo */}
            <div className="relative flex items-center justify-center">

              {/* Spinner */}
              <div
                className="animate-spin rounded-full h-48 w-48 border-[6px]"
                style={{
                  borderColor: "rgba(201, 162, 122, 0.25)",
                  borderTopColor: "#c9a27a",
                }}
              />

              {/* Soft backdrop behind logo */}
              <div
                className="absolute rounded-full"
                style={{
                  width: "120px",
                  height: "120px",
                  background:
                    "radial-gradient(circle, rgba(201,162,122,0.15) 0%, rgba(255,255,255,0) 70%)",
                }}
              />

              {/* Company Logo */}
              <img
                src="/Villa Raag.png"
                alt="Villa Raag Logo"
                className="absolute h-28 w-auto drop-shadow-2xl"
                style={{ objectFit: "contain" }}
              />
            </div>

            {/* Text */}
            <p
              className="text-xl font-bold tracking-wide"
              style={{ color: "#c9a27a" }}
            >
              Loading Villa Raag Bookings...
            </p>
          </div>
        </div>
      </div>
    );
  }


  // Show error state if data fetch failed
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full border border-red-200">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Bookings</h2>
            <p className="text-slate-600 mb-4">{(error as Error)?.message ?? "Failed to load villa bookings. Please try again."}</p>
            <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="bg-gradient-to-r 
  from-[#a37e59] 
  via-[#c9a27a] 
  to-[#9a7551]
  border-b border-[#8b6a45]
  shadow-[0_8px_30px_rgba(154,117,81,0.35)]
">

        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <BackButton className="mb-4" />
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">

            {/* ================= LEFT SECTION ================= */}
            <div className="space-y-3 w-full">
              <div className="flex items-start sm:items-center gap-4">

                {/* ICON */}
                <div
                  className="
        h-12 w-12
        sm:h-14 sm:w-14
        lg:h-16 lg:w-16
        bg-white/20
        backdrop-blur-sm
        rounded-xl sm:rounded-2xl
        flex items-center justify-center
        shadow-lg
        border border-white/30
        flex-shrink-0
      "
                >
                  <Building
                    className="
          h-6 w-6
          sm:h-7 sm:w-7
          lg:h-9 lg:w-9
          text-white
        "
                  />
                </div>

                {/* TITLE + SUBTITLE */}
                <div className="min-w-0 flex-1">
                  <h1
                    className="
          text-2xl
          sm:text-3xl
          md:text-4xl
          lg:text-5xl
          font-bold
          text-white
          tracking-tight
          leading-tight
          break-words
        "
                  >
                    Villa Raag Booking FMS
                  </h1>

                  <p
                    className="
          text-sm
          sm:text-base
          lg:text-lg
          text-white/90
          mt-1 sm:mt-2
          font-medium
        "
                  >
                    Premium Villa Management • Real-time Analytics
                  </p>
                </div>
              </div>
            </div>

            {/* ================= RIGHT SECTION ================= */}
            <div className="flex w-full lg:w-auto justify-start lg:justify-end">
              <div
                className="
        w-full sm:w-auto
        text-left sm:text-right
        bg-white/10
        backdrop-blur-sm
        rounded-lg
        p-3 sm:p-4
        border border-white/20
      "
              >
                <p className="text-xs sm:text-sm text-blue-100 font-medium">
                  Last Updated
                </p>
                <p className="text-xs sm:text-sm font-bold text-white">
                  {new Date().toLocaleString()}
                </p>
              </div>
            </div>

          </div>


        </div>
      </div>

      <div className="w-full pt-2 pb-8 space-y-8">
        <div className="space-y-8">
          <div className="mt-2">
            <div className="rounded-xl border border-slate-200 bg-white shadow-md">

              {/* ================= HEADER ================= */}
              <div
                className="
        flex flex-col sm:flex-row
        items-start sm:items-center
        justify-between
        gap-4
        px-4 sm:px-5
        py-4
        bg-gradient-to-r from-blue-100 via-white to-indigo-100
        border-b border-slate-200
      "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
      w-9 h-9 sm:w-10 sm:h-10
      rounded-lg
      bg-gradient-to-br
      from-[#a37e59]
      via-[#c9a27a]
      to-[#9a7551]
      flex items-center justify-center
      shadow-md
      border border-[#8b6a45]/40
    "
                  >
                    <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">
                      Filters & Search
                    </h3>
                    <p className="text-xs text-slate-500">
                      Refine bookings using filters
                    </p>
                  </div>
                </div>


                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="
          w-full sm:w-auto
          bg-white
          border-slate-300
          text-slate-700
          font-medium
          hover:bg-slate-100
        "
                >
                  Clear Filters
                </Button>
              </div>

              {/* ================= CONTENT ================= */}
              <div className="px-4 sm:px-5 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">

                  {/* SEARCH */}
                  <div className="flex flex-col gap-1.5 lg:col-span-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Search Bookings
                    </Label>
                    <Input
                      placeholder="Guest name, booking ID, reservation no, mobile, email..."
                      value={tempSearch}
                      onChange={(e) => setTempSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setSearchText(tempSearch)
                      }}
                      className="h-10 w-full rounded-md border-gray-300"
                    />
                  </div>

                  {/* BOOKING DATE */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Booking Date
                    </Label>
                    <Select
                      value={bookingDateFilter}
                      onValueChange={(value) => {
                        setBookingDateFilter(value)

                        if (value === "custom") {
                          setActiveDateType("booking")
                          setCheckInFilter("all")
                          setCheckOutFilter("all")
                          setCustomDateRange({ start: "", end: "" })
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                        <SelectValue placeholder="All Dates" />
                      </SelectTrigger>
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

                  {/* CHECK-IN */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Check-In
                    </Label>
                    <Select
                      value={checkInFilter}
                      onValueChange={(value) => {
                        setCheckInFilter(value)

                        if (value === "custom") {
                          setActiveDateType("checkin")
                          setBookingDateFilter("all")
                          setCheckOutFilter("all")
                          setCustomDateRange({ start: "", end: "" })
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                        <SelectValue placeholder="All Dates" />
                      </SelectTrigger>
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

                  {/* CHECK-OUT */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Check-Out
                    </Label>
                    <Select
                      value={checkOutFilter}
                      onValueChange={(value) => {
                        setCheckOutFilter(value)

                        if (value === "custom") {
                          setActiveDateType("checkout")
                          setBookingDateFilter("all")
                          setCheckInFilter("all")
                          setCustomDateRange({ start: "", end: "" })
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                        <SelectValue placeholder="All Dates" />
                      </SelectTrigger>
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

                  {/* STATUS */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Booking Status
                    </Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="no show">No Show</SelectItem>
                        <SelectItem value="canceled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* BOOKING TAKEN */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Booking Taken
                    </Label>
                    <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                      <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {Array.from(
                          new Set(
                            bookings
                              .map((b: any) => (b.assignedTo || "").toString().trim())
                              .filter(Boolean)
                          )
                        )
                          .sort()
                          .map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* SOURCE */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Booking Source
                    </Label>
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                        <SelectValue placeholder="Total Bookings" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Total Bookings</SelectItem>
                        <SelectItem value="direct">Offline Booking</SelectItem>
                        <SelectItem value="online">Online Booking</SelectItem>
                        <SelectItem value="ota">OTA Booking</SelectItem>
                        <SelectItem value="agent">Travel Agents</SelectItem>

                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(bookingDateFilter === "custom" ||
                  checkInFilter === "custom" ||
                  checkOutFilter === "custom") && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Start Date
                        </Label>
                        <Input
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) =>
                            setCustomDateRange({ ...customDateRange, start: e.target.value })
                          }
                          className="h-10 w-full rounded-md border-gray-300"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          End Date
                        </Label>
                        <Input
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) =>
                            setCustomDateRange({ ...customDateRange, end: e.target.value })
                          }
                          className="h-10 w-full rounded-md border-gray-300"
                        />
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>


          <Card className="bg-white/90 backdrop-blur-sm border-slate-300 shadow-xl">
            <CardHeader className="p-0 -mt-6">
              <div
                className="
      flex flex-col
      sm:flex-row
      sm:items-center
      sm:justify-between
      gap-3
      px-4 sm:px-5
      py-3
      bg-gradient-to-r from-slate-100 via-white to-blue-100
      border-b border-slate-200
      rounded-t-xl
    "
              >
                {/* ================= LEFT ================= */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className="
      w-9 h-9 sm:w-10 sm:h-10
      rounded-lg
      bg-gradient-to-br
      from-[#a37e59]
      via-[#c9a27a]
      to-[#9a7551]
      flex items-center justify-center
      shadow-md
      border border-[#8b6a45]/40
      flex-shrink-0
    "
                  >
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight break-words">
                      Key Performance Indicators
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Overview of bookings & revenue
                    </p>
                  </div>
                </div>


                {/* ================= RIGHT ================= */}
                <Tabs
                  value={viewMode}
                  onValueChange={(v) => setViewMode(v as "table" | "chart")}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="bg-white border border-slate-300 shadow-sm h-9 w-full sm:w-auto">
                    <TabsTrigger
                      value="table"
                      className="
            flex-1 sm:flex-none
            data-[state=active]:bg-blue-600
            data-[state=active]:text-white
            font-semibold
            text-xs
            px-3
          "
                    >
                      Table View
                    </TabsTrigger>

                    <TabsTrigger
                      value="chart"
                      className="
            flex-1 sm:flex-none
            data-[state=active]:bg-blue-600
            data-[state=active]:text-white
            font-semibold
            text-xs
            px-3
          "
                    >
                      Chart View
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {viewMode === "table" ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-end gap-2 hidden">
                    <Button onClick={exportBookingsCSV} className="text-sm">
                      Export Bookings CSV
                    </Button>
                    <Button onClick={exportRevenueCSV} className="text-sm">
                      Export Revenue CSV
                    </Button>
                  </div>

                  {/* ================= BOOKING SOURCES ================= */}
                  <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                      Booking Sources
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      {/* TOTAL BOOKINGS */}
                      <Card className="bg-blue-50/70 border-blue-300 shadow-sm hover:shadow-md transition">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                                Total Bookings
                              </p>
                              <p className="text-xl font-bold text-slate-900 leading-none">
                                {totalBookings}
                              </p>
                              <p className="text-sm font-semibold text-emerald-700 leading-tight">
                                ₹ {Math.round(totalAmount).toLocaleString("en-IN")}
                              </p>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 rounded-full">
                                <TrendingUp className="h-3 w-3 text-blue-700" />
                                <span className="text-xs font-semibold text-blue-700">+12%</span>
                              </div>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                              <Calendar className="h-4 w-4 text-blue-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* OFFLINE */}
                      <Card className="bg-slate-50/70 border-slate-300 shadow-sm hover:shadow-md transition">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                                Offline Booking
                              </p>
                              <p className="text-xl font-bold text-slate-900 leading-none">
                                {bookingSourceStats.offline.count}
                              </p>
                              <p className="text-sm font-semibold text-emerald-700 leading-tight">
                                ₹ {Math.round(bookingSourceStats.offline.amount).toLocaleString("en-IN")}
                              </p>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full">
                                <Building2 className="h-3 w-3 text-slate-700" />
                                <span className="text-xs font-semibold text-slate-700">Direct</span>
                              </div>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4 text-slate-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* ONLINE */}
                      <Card className="bg-cyan-50/70 border-cyan-300 shadow-sm hover:shadow-md transition">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
                                Online Engine
                              </p>
                              <p className="text-xl font-bold text-slate-900 leading-none">
                                {bookingSourceStats.online.count}
                              </p>
                              <p className="text-sm font-semibold text-emerald-700 leading-tight">
                                ₹ {Math.round(bookingSourceStats.online.amount).toLocaleString("en-IN")}
                              </p>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-100 rounded-full">
                                <Globe className="h-3 w-3 text-cyan-700" />
                                <span className="text-xs font-semibold text-cyan-700">Web</span>
                              </div>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
                              <Globe className="h-4 w-4 text-cyan-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* OTA */}
                      <Card className="bg-purple-50/70 border-purple-300 shadow-sm hover:shadow-md transition">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-700">
                                OTA Bookings
                              </p>
                              <p className="text-xl font-bold text-slate-900 leading-none">
                                {bookingSourceStats.ota.count}
                              </p>
                              <p className="text-sm font-semibold text-emerald-700 leading-tight">
                                ₹ {Math.round(bookingSourceStats.ota.amount).toLocaleString("en-IN")}
                              </p>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 rounded-full">
                                <Building2 className="h-3 w-3 text-purple-700" />
                                <span className="text-xs font-semibold text-purple-700">Platform</span>
                              </div>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4 text-purple-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* TRAVEL AGENTS */}
                      <Card className="bg-orange-50/70 border-orange-300 shadow-sm hover:shadow-md transition">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                                Travel Agents
                              </p>
                              <p className="text-xl font-bold text-slate-900 leading-none">
                                {bookingSourceStats.travelAgent.count}
                              </p>
                              <p className="text-sm font-semibold text-emerald-700 leading-tight">
                                ₹ {Math.round(bookingSourceStats.travelAgent.amount).toLocaleString("en-IN")}
                              </p>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 rounded-full">
                                <Building2 className="h-3 w-3 text-orange-700" />
                                <span className="text-xs font-semibold text-orange-700">Partner</span>
                              </div>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4 text-orange-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>


                  {/* ================= BOOKING STATUS ================= */}
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                      Booking Status
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                      {/* TOTAL BOOKINGS */}
                      <Card className="bg-blue-50/70 border-blue-300 shadow-sm hover:shadow-md transition">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Total Bookings</p>
                              <p className="text-xl font-bold text-slate-900 leading-none">{totalBookings}</p>
                              <p className="text-sm font-semibold text-emerald-700 leading-tight">₹ {Math.round(totalAmount).toLocaleString("en-IN")}</p>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 rounded-full">
                                <TrendingUp className="h-3 w-3 text-blue-700" />
                                <span className="text-xs font-semibold text-blue-700">All</span>
                              </div>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                              <Calendar className="h-4 w-4 text-blue-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* CONFIRMED */}
                      <Card className="bg-emerald-50/70 border-emerald-300 shadow-sm hover:shadow-md transition">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Confirmed</p>
                              <p className="text-xl font-bold text-slate-900 leading-none">{confirmedBookings}</p>
                              <p className="text-sm font-semibold text-emerald-700 leading-tight">
                                ₹ {Math.round(filteredBookings.filter(b => (b.status ?? "").toLowerCase() === "confirmed").reduce((s, b) => s + (b.amount || 0), 0)).toLocaleString("en-IN")}
                              </p>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 rounded-full">
                                <CheckCircle className="h-3 w-3 text-emerald-700" />
                                <span className="text-xs font-semibold text-emerald-700">Active</span>
                              </div>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                              <CheckCircle className="h-4 w-4 text-emerald-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* PENDING */}
                      <Card className="bg-amber-50/70 border-amber-300 shadow-sm hover:shadow-md transition">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Pending</p>
                              <p className="text-xl font-bold text-slate-900 leading-none">{pendingBookings}</p>
                              <p className="text-sm font-semibold text-amber-700 leading-tight">₹ {Math.round(pendingAmount).toLocaleString("en-IN")}</p>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 rounded-full">
                                <Clock className="h-3 w-3 text-amber-700" />
                                <span className="text-xs font-semibold text-amber-700">Review</span>
                              </div>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                              <Clock className="h-4 w-4 text-amber-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* CANCELLED */}
                      <Card className="bg-red-50/70 border-red-300 shadow-sm hover:shadow-md transition">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">Cancelled</p>
                              <p className="text-xl font-bold text-slate-900 leading-none">{cancelledBookings}</p>
                              <p className="text-sm font-semibold text-red-700 leading-tight">₹ {Math.round(cancelledAmount).toLocaleString("en-IN")}</p>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 rounded-full">
                                <XCircle className="h-3 w-3 text-red-700" />
                                <span className="text-xs font-semibold text-red-700">Closed</span>
                              </div>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                              <XCircle className="h-4 w-4 text-red-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* NO SHOW */}
                      <Card className="bg-slate-50/70 border-slate-300 shadow-sm hover:shadow-md transition">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">No Show</p>
                              <p className="text-xl font-bold text-slate-900 leading-none">{noShowBookings}</p>
                              <p className="text-sm font-semibold text-slate-700 leading-tight">₹ {Math.round(noShowAmount).toLocaleString("en-IN")}</p>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full">
                                <PauseCircle className="h-3 w-3 text-slate-700" />
                                <span className="text-xs font-semibold text-slate-700">No Arrival</span>
                              </div>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <PauseCircle className="h-4 w-4 text-slate-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                    </div>
                  </div>

                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl p-6 border border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-blue-700" />
                          Bookings Source Distribution
                        </h3>
                        <div className="mb-4 p-3 bg-white/60 rounded-lg flex items-center justify-between">
                          <div>
                            <div className="text-xs text-slate-600">Total Bookings</div>
                            <div className="text-2xl font-bold text-slate-900">{totalBookings}</div>
                          </div>
                          <div className="text-sm text-slate-600">Filtered total based on selected filters</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                          {bookingDistributionData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between p-2 bg-white/50 rounded">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-slate-600 text-sm">{item.name}</span>
                              </div>
                              <span className="font-semibold text-slate-900 text-sm">{(item.value || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={bookingDistributionData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-45} textAnchor="end" height={80} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive>
                            {bookingDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <LabelList dataKey="value" position="top" formatter={(v: any) => v?.toLocaleString?.() ?? v} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300 ring-1 ring-slate-50">
                      <div className="mb-4 sm:mb-6">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md">
                            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Revenue Analysis</h3>
                            <p className="text-xs text-slate-500 mt-0.5 sm:mt-1 hidden sm:block">Distribution of revenue across different sources</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-gradient-to-br from-emerald-50 via-white to-slate-50 rounded-xl border border-emerald-200 ring-1 ring-emerald-100">
                        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 sm:gap-0">
                          <div className="w-full sm:w-auto">
                            <p className="text-sm font-medium text-slate-600 mb-2">Total Revenue</p>
                            <p className="text-3xl sm:text-4xl font-bold text-emerald-700 break-all">{formatCurrency(revenueTotal)}</p>
                            <p className="text-xs text-slate-500 mt-2">Across all filtered bookings</p>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto">
                            <p className="text-2xl font-bold text-slate-900">{revenueChartData.length}</p>
                            <p className="text-xs text-slate-500 mt-1">Revenue Sources</p>
                          </div>
                        </div>
                      </div>

                      <div className="relative bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 sm:p-6 md:p-10 border border-slate-200 shadow-md ring-1 ring-slate-100 mb-4 sm:mb-6">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-4">
                          <p className="text-slate-500 text-xs sm:text-sm font-semibold tracking-wide">Total Revenue</p>
                          <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-blue-700 mt-1 text-center break-all">
                            {formatCurrency(revenueTotal)}
                          </p>
                          <p className="text-slate-600 text-xs mt-1">
                            {((totalReceived / revenueTotal) * 100 || 0).toFixed(1)}% Received
                          </p>
                        </div>

                        <ResponsiveContainer width="100%" height={360} className="hidden md:block">
                          <PieChart>
                            <defs>
                              {revenueChartData.map((entry, index) => (
                                <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={entry.color} stopOpacity={0.95} />
                                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.70} />
                                </linearGradient>
                              ))}
                            </defs>
                            <Tooltip
                              contentStyle={{ backgroundColor: "#ffffff", border: "2px solid #e2e8f0", borderRadius: "14px", padding: "14px 18px", boxShadow: "0 12px 32px rgba(0,0,0,0.15)" }}
                              formatter={(value: any, name: string) => {
                                const pct = revenueTotal ? ((Number(value) / revenueTotal) * 100).toFixed(1) : "0"
                                return [`${formatCurrency(value)} (${pct}%)`, name]
                              }}
                            />
                            <Pie data={revenueChartData} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={100} outerRadius={150} paddingAngle={3} labelLine={false}
                              label={({ name, amount }) => { const pct = revenueTotal ? ((amount / revenueTotal) * 100).toFixed(1) : 0; return `${pct}%` }}
                              animationBegin={0} animationDuration={1100} animationEasing="ease-out" style={{ filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.15))" }}>
                              {revenueChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={`url(#gradient-${index})`} stroke="#ffffff" strokeWidth={3} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200">
                        <h4 className="text-sm font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
                          <div className="w-1 h-4 sm:h-5 bg-emerald-500 rounded" />
                          Revenue Breakdown by Source
                        </h4>
                        <div className="space-y-2 sm:space-y-3">
                          {revenueChartData.map((item) => {
                            const percentage = ((item.amount / revenueTotal) * 100).toFixed(1)
                            return (
                              <div key={item.name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white rounded-lg border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all duration-300 gap-2 sm:gap-0">
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 w-full sm:w-auto">
                                  <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: item.color }}></div>
                                  <span className="text-sm text-slate-700 font-medium break-words">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                  <div className="text-left sm:text-right">
                                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.amount)}</p>
                                    <p className="text-xs text-slate-500">{percentage}%</p>
                                  </div>
                                  <div className="w-16 sm:w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: item.color }}></div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-700" />
                        Bookings Status Overview
                      </h3>
                      <div className="mb-4 p-3 bg-white/60 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-xs text-slate-600">Total Bookings</div>
                          <div className="text-2xl font-bold text-slate-900">{totalBookings}</div>
                        </div>
                        <div className="text-sm text-slate-600">Filtered total based on selected filters</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2 mb-4">
                        {bookingOverviewData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between p-2 bg-white/50 rounded">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-slate-600 text-sm">{item.name}</span>
                            </div>
                            <span className="font-semibold text-slate-900 text-sm">{(item.value || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={380}>
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" horizontal={false} />
                        <XAxis type="number" stroke="#64748b" fontSize={11} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={100} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} isAnimationActive>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-vert-${index}`} fill={entry.color} />
                          ))}
                          <LabelList dataKey="value" position="right" formatter={(v: any) => v?.toLocaleString?.() ?? v} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {viewMode === "table" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* TOTAL REVENUE */}
              <Card className="bg-gradient-to-br from-indigo-700 to-indigo-800 text-white border-indigo-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <CardContent className="px-2.5 py-1.5 space-y-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[13px] font-semibold uppercase">Total Revenue</p>
                    <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                      <DollarSign className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold leading-tight">{formatCurrency(totalAmountAll)}</p>
                  <span className="flex items-center gap-1 text-[11px] leading-none">▲ +10%</span>
                </CardContent>
              </Card>

              {/* AMOUNT RECEIVED */}
              <Card className="bg-gradient-to-br from-emerald-700 to-emerald-800 text-white border-emerald-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <CardContent className="px-2.5 py-1.5 space-y-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[13px] font-semibold uppercase">Amount Received</p>
                    <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold leading-tight">{formatCurrency(totalReceivedAll)}</p>
                  <span className="flex items-center gap-1 text-[11px] leading-none">▲ +5%</span>
                </CardContent>
              </Card>

              {/* PENDING AMOUNT */}
              <Card className="bg-gradient-to-br from-amber-700 to-amber-800 text-white border-amber-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <CardContent className="px-2.5 py-1.5 space-y-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[13px] font-semibold uppercase">Pending Amount</p>
                    <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold leading-tight">{formatCurrency(totalAmountAll - totalReceivedAll - cancelledAmountAll)}</p>
                  <span className="flex items-center gap-1 text-[11px] leading-none">
                    ▼ {totalAmountAll > 0 ? `${Math.round(((totalAmountAll - totalReceivedAll - cancelledAmountAll) / totalAmountAll) * 100)}%` : "0%"}
                  </span>
                </CardContent>
              </Card>

              {/* CANCELLED AMOUNT */}
              <Card className="bg-gradient-to-br from-rose-700 to-rose-800 text-white border-rose-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <CardContent className="px-2.5 py-1.5 space-y-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[13px] font-semibold uppercase">Cancelled Amount</p>
                    <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                      <XCircle className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold leading-tight">{formatCurrency(cancelledAmountAll)}</p>
                  <span className="flex items-center gap-1 text-[11px] leading-none">
                    ▼ {totalAmountAll > 0 ? `${Math.round((cancelledAmountAll / totalAmountAll) * 100)}%` : "0%"}
                  </span>
                </CardContent>
              </Card>

            </div>
          )}


          {/* ============================= ACTIVE BOOKINGS TABLE ============================= */}
          <div ref={tableRef}>
            <Card className="bg-white/90 backdrop-blur-sm border border-[#c9a27a]/40 shadow-lg pt-0 rounded-xl overflow-hidden">
              <CardHeader className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#f5ebdf] via-[#efe1cf] to-[#e6d3bd]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#a37e59] via-[#c9a27a] to-[#9a7551] flex items-center justify-center shadow-md border border-[#8b6a45]/40">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">Active Villa Bookings</h3>
                  <Badge variant="secondary" className="ml-2 h-6 px-2.5 flex items-center bg-gradient-to-r from-[#a37e59] to-[#9a7551] text-white font-semibold text-xs border border-[#8b6a45]/40">
                    {activeBookings.length}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0 bg-[#eaf4ff]">
                <div className="overflow-x-auto bg-[#eaf4ff]">
                  <Table className="min-w-full">
                    <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
                      <TableRow className="border-blue-300">
                        <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("createdDate")}>
                          <div className="flex items-center gap-2">Booking Date<SortIcon field="createdDate" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("reservationNo")}>
                          <div className="flex items-center gap-2">Reservation No<SortIcon field="reservationNo" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("bookingId")}>
                          <div className="flex items-center gap-2">Booking ID<SortIcon field="bookingId" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("guestName")}>
                          <div className="flex items-center gap-2">Guest Name<SortIcon field="guestName" /></div>
                        </TableHead>
                        <TableHead className="font-bold text-slate-900">Contact</TableHead>
                        <TableHead className="font-bold text-slate-900">Country</TableHead>
                        <TableHead className="font-bold text-slate-900">Room Details</TableHead>
                        <TableHead className="font-bold text-slate-900">No Of Rooms</TableHead>
                        <TableHead className="font-bold text-slate-900">Plan</TableHead>
                        <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("checkIn")}>
                          <div className="flex items-center gap-2">Check In/Out<SortIcon field="checkIn" /></div>
                        </TableHead>
                        <TableHead className="font-bold text-slate-900">Staying Status</TableHead>
                        <TableHead className="font-bold text-slate-900">Length of Stay</TableHead>
                        <TableHead className="font-bold text-slate-900">Invoice No</TableHead>
                        <TableHead className="font-bold text-slate-900">Invoice URL</TableHead>
                        <TableHead className="font-bold text-slate-900">Invoice History Link</TableHead>
                        <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("totalRoomCost")}>
                          <div className="flex items-center gap-2">Total Room Cost<SortIcon field="totalRoomCost" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("discountTotal")}>
                          <div className="flex items-center gap-2">Discount<SortIcon field="discountTotal" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("netPayable")}>
                          <div className="flex items-center gap-2">Net Payable<SortIcon field="netPayable" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("addonsTotal")}>
                          <div className="flex items-center gap-2">Addons Total<SortIcon field="addonsTotal" /></div>
                        </TableHead>
                        <TableHead className="font-bold text-slate-900">Outlet Revenue</TableHead>
                        <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("totalAmount")}>
                          <div className="flex items-center gap-2">Total Amount<SortIcon field="totalAmount" /></div>
                        </TableHead>
                        <TableHead className="font-bold text-slate-900">View Collection</TableHead>
                        <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("totalPax")}>
                          <div className="flex items-center gap-2">Total Pax<SortIcon field="totalPax" /></div>
                        </TableHead>
                        <TableHead className="font-bold text-slate-900">Pay At Hotel</TableHead>
                        <TableHead className="font-bold text-slate-900">Payment Progress</TableHead>
                        <TableHead className="font-bold text-slate-900">Booking Status</TableHead>
                        <TableHead className="font-bold text-slate-900">Complimentary</TableHead>
                        <TableHead className="font-bold text-slate-900">Name of Booker</TableHead>
                        <TableHead className="font-bold text-slate-900">Booking Source</TableHead>
                        <TableHead className="font-bold text-slate-900">Booking Sub Source</TableHead>
                        <TableHead className="font-bold text-slate-900">Booking Type</TableHead>
                        <TableHead className="font-bold text-slate-900">Booking Taken</TableHead>
                        <TableHead className="font-bold text-slate-900">Last Modified On</TableHead>
                        <TableHead className="font-bold text-slate-900">Last Modified By</TableHead>
                        <TableHead className="font-bold text-slate-900 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedBookings.map((booking, index) => (
                        <TableRow
                          key={booking.id}
                          className={`border-blue-100 hover:bg-[#dae3ed] transition-colors ${index % 2 === 0 ? "bg-white" : "bg-blue-25"}`}
                        >
                          <TableCell className="font-medium text-slate-700">{fmtDateTimeSafe(booking.createdDate)}</TableCell>
                          <TableCell className="font-semibold text-blue-700">{booking.reservationNo || "-"}</TableCell>
                          <TableCell className="font-semibold text-blue-700">{booking.bookingId}</TableCell>
                          <TableCell className="font-medium text-slate-900">{booking.guestName}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="text-sm font-medium text-slate-900">{booking.mobile || booking.contactNumber || "-"}</div>
                              <div className="text-xs text-slate-500">{booking.email || "-"}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">{booking.country || "-"}</TableCell>
                          <TableCell>
                            {(() => {
                              const villaNo = String(booking.villaNumber || "").trim()
                              const rn = String(booking.roomName || "").trim()
                              const raw = String((booking as any).roomRaw || "").trim()
                              const roomDisplay = rn || raw || "-"
                              return (
                                <div className="space-y-1">
                                  <div className="font-semibold text-blue-900">{villaNo && villaNo !== "-" ? `Room No - ${villaNo}` : "-"}</div>
                                  <div className="text-sm text-slate-600">{roomDisplay}</div>
                                </div>
                              )
                            })()}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">{booking.noOfRooms || "-"}</TableCell>
                          <TableCell>
                            <Badge className="bg-pink-100 text-pink-800 border-pink-300 font-semibold">{booking.plan}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-600 font-medium">In:</span>
                                <span className="text-slate-700">{fmtDateSafe(booking.checkIn ?? booking["Arrival Date"] ?? booking.arrivalDate)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-pink-600 font-medium">Out:</span>
                                <span className="text-slate-700">{fmtDateSafe(booking.checkOut ?? booking["Departure Date"] ?? booking.departureDate)}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const status = getStayingStatus(booking)
                              return (
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${status.className}`}>
                                  {status.label}
                                </span>
                              )
                            })()}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">{formatLengthOfStay(booking)}</TableCell>
                          <TableCell className="font-medium text-slate-900 max-w-[140px] truncate">{booking.invoiceNumber || "-"}</TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {booking.invoiceUrl && (
                              <a href={booking.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View Invoice</a>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {booking.InvoiceHistoryLink && (
                              <a href={booking.InvoiceHistoryLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View History</a>
                            )}
                          </TableCell>

                          <TableCell className="font-medium text-slate-900">{booking.totalRoomCost || "-"}</TableCell>
                          <TableCell className="font-medium text-slate-900">{booking.discountTotal || "-"}</TableCell>
                          <TableCell className="font-medium text-slate-900">{booking.netPayable || "-"}</TableCell>
                          <TableCell className="font-medium text-slate-900">{booking.addonsTotal
                            ? <a href={`${ADDON_API_URL}?bookingId=${encodeURIComponent(booking.bookingId)}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline hover:text-indigo-800 font-semibold">{String(booking.addonsTotal)}</a>
                            : "-"
                          }</TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {(booking as any).outletRevenue
                              ? (
                                <a
                                  href={`${OUTLET_API_URL}?bookingId=${encodeURIComponent(booking.bookingId)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 underline hover:text-indigo-800 font-semibold"
                                >
                                  {formatCurrency((booking as any).outletRevenue)}
                                </a>
                              )
                              : "-"
                            }
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">{booking.finalTotalAmount || "-"}</TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {booking.PaymentCollectionHistoryLink ? (
                              <a
                                href={booking.PaymentCollectionHistoryLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 underline hover:text-indigo-800 font-medium"
                              >
                                View Collection
                              </a>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">{booking.totalPax ?? booking.total_pax ?? booking.pax ?? "-"}</TableCell>
                          <TableCell className="font-medium text-slate-900">{(() => {
                            const p = (booking.payAtHotel ?? (booking as any).pay_at_hotel ?? (booking as any).payAt ?? (booking as any).pay_at)
                            if (p === true || String(p).toLowerCase() === "yes") return "Yes"
                            if (p === false || String(p).toLowerCase() === "no") return "No"
                            return p ? String(p) : "-"
                          })()}</TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge className={`${getPaymentStatusBadge(booking.paymentStatus || booking.paymentStatus)} font-semibold text-xs`}>
                                  {(booking.paymentStatus || "").toString().toUpperCase().replace("_", " ")}
                                </Badge>
                                <span className="text-sm font-semibold text-slate-700">
                                  {(() => {
                                    const pct = computeReceivedPercentage(booking.receivedAmount, booking.amount)
                                    // const pct = (booking.receivedPercentage ?? computeReceivedPercentage(booking.receivedAmount, booking.amount)) as number
                                    return `${pct}%`
                                  })()}
                                </span>
                              </div>
                              <div className="w-full bg-blue-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${(booking.receivedPercentage ?? computeReceivedPercentage(booking.receivedAmount, booking.amount)) ?? 0}%` }}
                                ></div>
                              </div>
                              <p className="text-xs mt-1 font-medium text-gray-700">
                                {(Number(booking.receivedAmount) || 0).toLocaleString()} / {(Number(booking.amount) || 0).toLocaleString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusBadge(booking.status)} font-semibold`}>
                              {booking.status ? booking.status.replace("_", " ").toUpperCase() : "UNKNOWN"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {typeof (booking as any).complimentary === "boolean"
                              ? ((booking as any).complimentary ? "Yes" : "No")
                              : ((booking as any).complimentary ?? "-")}
                          </TableCell>
                          <TableCell className="text-sm text-slate-700">
                            {booking.bookerName && booking.bookerName.trim() !== "" ? booking.bookerName : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-semibold">{booking.source || "N/A"}</Badge>
                          </TableCell>
                          <TableCell>{booking.bookingSubSource || "-"}</TableCell>
                          <TableCell>{booking.bookingType || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                                {(booking.assignedTo || "Sales Executive").trim().split(/\s+/).map((n: string) => (n ? n.charAt(0).toUpperCase() : "")).join("")}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{booking.assignedTo || "Sales Executive"}</div>
                                <div className="text-xs text-slate-500">Sales Executive</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">{fmtDateTimeSafe(booking.lastModifiedOn || booking.lastModified || booking.updatedAt || booking.modifiedAt)}</TableCell>
                          <TableCell className="font-semibold text-blue-700">{booking.lastModifiedBy}</TableCell>
                          <TableCell className="font-medium text-slate-900">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-100 transition-colors">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 bg-white border border-blue-200 shadow-lg rounded-lg">
                                <DropdownMenuItem asChild>
                                  <button
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer w-full text-left"
                                    onClick={() => { setSelectedBookingForDetails(booking); setTimeout(() => setShowDetailsModal(true), 80) }}
                                    aria-label={`View details for ${booking.bookingId}`}
                                  >
                                    <Eye className="h-4 w-4 text-pink-600" />
                                    <span className="text-slate-700">View Details</span>
                                  </button>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <button
                                    onClick={() => handleAction("payment_upload", booking.id)}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer w-full text-left"
                                    aria-label={`Collect payment for ${booking.bookingId}`}
                                  >
                                    <CreditCard className="h-4 w-4 text-emerald-600" />
                                    <span className="text-slate-700">Collect Payment</span>
                                  </button>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <button
                                    onClick={() => handleAction("cancel", booking.id)}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 cursor-pointer w-full text-left"
                                    aria-label={`Cancel booking for ${booking.bookingId}`}
                                  >
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <span className="text-slate-700">Cancel Booking</span>
                                  </button>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 border-blue-200" />
                                <DropdownMenuItem asChild>
                                  <button
                                    onClick={() => handleAction("payment_details", booking.id)}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer w-full text-left"
                                    aria-label={`View payment details for ${booking.bookingId}`}
                                  >
                                    <Upload className="h-4 w-4 text-indigo-600" />
                                    <span className="text-slate-700">View Payment Collection Details</span>
                                  </button>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <button
                                    onClick={() => handleAction("bill_collection_details", booking.id)}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer w-full text-left"
                                    aria-label={`Bill details for ${booking.bookingId}`}
                                  >
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                    <span className="text-slate-700">Bill Details</span>
                                  </button>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination controls for Active Villa Bookings */}
                <div className="flex flex-col gap-3 px-4 py-3 bg-white border-t border-slate-200 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-600 text-center sm:text-left">
                    <span>
                      Showing {activeBookings.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, activeBookings.length)} of {activeBookings.length}
                    </span>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <span className="text-xs sm:text-sm">Rows per page</span>
                      <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1) }}>
                        <SelectTrigger className="h-8 w-[80px] border-slate-300"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-center">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                    <span className="text-sm text-slate-600">Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                  </div>
                  <div className="flex items-center gap-2 justify-center sm:justify-end">
                    <span className="text-sm text-slate-600">Go to</span>
                    <Input type="number" min={1} max={totalPages} className="h-8 w-[70px] text-center"
                      onKeyDown={(e) => { if (e.key === "Enter") { const page = Number((e.target as HTMLInputElement).value); if (page >= 1 && page <= totalPages) setCurrentPage(page) } }} />
                    <Button size="sm" onClick={(e) => { const input = (e.currentTarget.previousSibling as HTMLInputElement); const page = Number(input.value); if (page >= 1 && page <= totalPages) setCurrentPage(page) }}>Go</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ============================= NO SHOW TABLE ============================= */}
          <Card className="bg-white/90 backdrop-blur-sm border border-[#c9a27a]/40 shadow-lg pt-0 rounded-xl overflow-hidden">
            <CardHeader className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#fff4d6] via-[#ffefd0] to-[#ffe6b3] border-b border-amber-200/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#d97706] via-[#f59e0b] to-[#b45309] flex items-center justify-center shadow-md border border-amber-500/40">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-amber-800 leading-tight">No Show Villa Bookings</h3>
                <Badge variant="secondary" className="ml-2 h-6 px-2.5 flex items-center bg-gradient-to-r from-[#d97706] to-[#b45309] text-white font-semibold text-xs border border-amber-500/40">
                  {noShowBookingsList.length}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 bg-amber-50/60">
              <div className="overflow-x-auto bg-amber-50/60">
                <Table className="min-w-full">
                  <TableHeader className="bg-gradient-to-r from-amber-100 to-orange-100">
                    <TableRow className="border-amber-300">
                      <TableHead className="font-bold text-slate-900">Booking Date</TableHead>
                      <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("reservationNo")}>
                        <div className="flex items-center gap-2">Reservation No<SortIcon field="reservationNo" /></div>
                      </TableHead>
                      <TableHead className="font-bold text-slate-900">Booking ID</TableHead>
                      <TableHead className="font-bold text-slate-900">Guest Name</TableHead>
                      <TableHead className="font-bold text-slate-900">Contact</TableHead>
                      <TableHead className="font-bold text-slate-900">Room Details</TableHead>
                      <TableHead className="font-bold text-slate-900">Check In/Out</TableHead>
                      <TableHead className="font-bold text-slate-900">Amount</TableHead>
                      <TableHead className="font-bold text-slate-900">Addons</TableHead>
                      <TableHead className="font-bold text-slate-900">Outlet Revenue</TableHead>
                      <TableHead className="font-bold text-slate-900">View Collection</TableHead>
                      <TableHead className="font-bold text-slate-900">Invoice URL</TableHead>
                      <TableHead className="font-bold text-slate-900">Name of Booker</TableHead>
                      <TableHead className="font-bold text-slate-900">Booking Status</TableHead>
                      <TableHead className="font-bold text-slate-900">Marked By</TableHead>
                      <TableHead className="font-bold text-slate-900 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedNoShowBookings.map((booking, index) => (
                      <TableRow
                        key={booking.id}
                        className={`border-amber-100 hover:bg-amber-100/70 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-amber-25"}`}
                      >
                        <TableCell className="font-medium text-slate-700">{fmtDateTimeSafe(booking.createdDate)}</TableCell>
                        <TableCell className="font-semibold text-blue-700">{booking.reservationNo || "-"}</TableCell>
                        <TableCell className="font-semibold text-amber-700">{booking.bookingId}</TableCell>
                        <TableCell className="font-medium text-slate-900">{booking.guestName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="text-sm font-medium text-slate-900">{booking.mobile || booking.contactNumber || "-"}</div>
                            <div className="text-xs text-slate-500">{booking.email || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold text-amber-900">{booking.villaNumber ? `Room No - ${booking.villaNumber}` : "-"}</div>
                            <div className="text-sm text-slate-600">{booking.roomName || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-blue-600 font-medium">In:</span>
                              <span>{fmtDateSafe(booking.checkIn)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-pink-600 font-medium">Out:</span>
                              <span>{fmtDateSafe(booking.checkOut)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-amber-700">{formatCurrency(booking.amount)}</TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {booking.addonsTotal !== undefined && booking.addonsTotal !== null && booking.addonsTotal !== 0
                            ? <a href={`${ADDON_API_URL}?bookingId=${encodeURIComponent(booking.bookingId)}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline hover:text-indigo-800 font-semibold">{String(booking.addonsTotal)}</a>
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {(booking as any).outletRevenue
                            ? (
                              <a
                                href={`${OUTLET_API_URL}?bookingId=${encodeURIComponent(booking.bookingId)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 underline hover:text-indigo-800 font-semibold"
                              >
                                {formatCurrency((booking as any).outletRevenue)}
                              </a>
                            )
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {booking.PaymentCollectionHistoryLink ? (
                            <a
                              href={booking.PaymentCollectionHistoryLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-amber-700 underline hover:text-amber-900 font-medium"
                            >
                              View Collection
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {booking.invoiceUrl ? (
                            <a href={booking.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">View Invoice</a>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">{booking.bookerName || "-"}</TableCell>
                        <TableCell>
                          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-semibold">No Show</Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                              {(booking.lastModifiedBy || booking.assignedTo || "Sales Executive").split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 text-sm">{booking.lastModifiedBy || booking.assignedTo || "Sales Executive"}</div>
                              <div className="text-xs text-slate-500">{fmtDateSafe(booking.lastUpdated)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedBookingForDetails(booking); setTimeout(() => setShowDetailsModal(true), 80) }}>
                                <Eye className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* No Show Pagination */}
              <div className="flex flex-col gap-3 px-4 py-3 bg-white border-t border-amber-200 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-600 text-center sm:text-left">
                  <span>
                    Showing {noShowBookingsList.length === 0 ? 0 : noShowStartIndex + 1}–{Math.min(noShowStartIndex + noShowItemsPerPage, noShowBookingsList.length)} of {noShowBookingsList.length}
                  </span>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-xs sm:text-sm">Rows per page</span>
                    <Select value={String(noShowItemsPerPage)} onValueChange={(v) => { setNoShowItemsPerPage(Number(v)); setNoShowPage(1) }}>
                      <SelectTrigger className="h-8 w-[80px] border-slate-300"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <Button variant="outline" size="sm" onClick={() => setNoShowPage((p) => Math.max(1, p - 1))} disabled={noShowPage === 1}>Previous</Button>
                  <span className="text-sm text-slate-600">Page <strong>{noShowPage}</strong> of <strong>{noShowTotalPages}</strong></span>
                  <Button variant="outline" size="sm" onClick={() => setNoShowPage((p) => Math.min(noShowTotalPages, p + 1))} disabled={noShowPage === noShowTotalPages}>Next</Button>
                </div>
                <div className="flex items-center gap-2 justify-center sm:justify-end">
                  <span className="text-sm text-slate-600">Go to</span>
                  <Input type="number" min={1} max={noShowTotalPages} className="h-8 w-[70px] text-center"
                    onKeyDown={(e) => { if (e.key === "Enter") { const page = Number((e.target as HTMLInputElement).value); if (page >= 1 && page <= noShowTotalPages) setNoShowPage(page) } }} />
                  <Button size="sm" onClick={(e) => { const input = (e.currentTarget.previousSibling as HTMLInputElement); const page = Number(input.value); if (page >= 1 && page <= noShowTotalPages) setNoShowPage(page) }}>Go</Button>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* ============================= CANCELLED BOOKINGS TABLE ============================= */}
          <Card className="bg-white/90 backdrop-blur-sm border border-[#c9a27a]/40 shadow-lg pt-0 rounded-xl overflow-hidden">
            <CardHeader className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#fde8e8] via-[#fbd5d5] to-[#fecaca] border-b border-red-200/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#b91c1c] via-[#dc2626] to-[#991b1b] flex items-center justify-center shadow-md border border-red-500/40">
                  <XCircle className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-red-800 leading-tight">Cancelled Villa Bookings</h3>
                <Badge variant="secondary" className="ml-2 h-6 px-2.5 flex items-center bg-gradient-to-r from-[#b91c1c] to-[#991b1b] text-white font-semibold text-xs border border-red-500/40">
                  {cancelledBookingsList.length}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 bg-red-50/60">
              <div className="overflow-x-auto bg-red-50/60">
                <Table className="min-w-full">
                  <TableHeader className="bg-gradient-to-r from-red-100 to-rose-100">
                    <TableRow className="border-red-300">
                      <TableHead className="font-bold text-slate-900">Booking Date</TableHead>
                      <TableHead className="cursor-pointer font-bold text-slate-900 hover:text-blue-700 transition-colors" onClick={() => handleSort("reservationNo")}>
                        <div className="flex items-center gap-2">Reservation No<SortIcon field="reservationNo" /></div>
                      </TableHead>
                      <TableHead className="font-bold text-slate-900">Booking ID</TableHead>
                      <TableHead className="font-bold text-slate-900">Guest Name</TableHead>
                      <TableHead className="font-bold text-slate-900">Contact</TableHead>
                      <TableHead className="font-bold text-slate-900">Room Details</TableHead>
                      <TableHead className="font-bold text-slate-900">Check In/Out</TableHead>
                      <TableHead className="font-bold text-slate-900">Amount</TableHead>
                      <TableHead className="font-bold text-slate-900">Addons</TableHead>
                      <TableHead className="font-bold text-slate-900">Outlet Revenue</TableHead>
                      <TableHead className="font-bold text-slate-900">View Collection</TableHead>
                      <TableHead className="font-bold text-slate-900">Invoice URL</TableHead>
                      <TableHead className="font-bold text-slate-900">Name of Booker</TableHead>
                      <TableHead className="font-bold text-slate-900">Booking Status</TableHead>
                      <TableHead className="font-bold text-slate-900">Cancelled Remarks</TableHead>
                      <TableHead className="font-bold text-slate-900">Cancelled By</TableHead>
                      <TableHead className="font-bold text-slate-900 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedCancelledBookings.map((booking, index) => (
                      <TableRow
                        key={booking.id}
                        className={`border-red-100 hover:bg-red-100/70 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-red-25"}`}
                      >
                        <TableCell className="font-medium text-slate-700">{fmtDateTimeSafe(booking.createdDate)}</TableCell>
                        <TableCell className="font-semibold text-blue-700">{booking.reservationNo || "-"}</TableCell>
                        <TableCell className="font-semibold text-red-700">{booking.bookingId}</TableCell>
                        <TableCell className="font-medium text-slate-900">{booking.guestName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="text-sm font-medium text-slate-900">{booking.mobile || booking.contactNumber || "-"}</div>
                            <div className="text-xs text-slate-500">{booking.email || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const villaNo = String(booking.villaNumber || "").trim()
                            const rn = String(booking.roomName || "").trim()
                            const raw = String((booking as any).roomRaw || "").trim()
                            const roomDisplay = rn || raw || "-"
                            return (
                              <div className="space-y-1">
                                <div className="font-semibold text-red-900">{villaNo && villaNo !== "-" ? `Room No - ${villaNo}` : "-"}</div>
                                <div className="text-sm text-slate-600">{roomDisplay}</div>
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-blue-600 font-medium">In:</span>
                              <span className="text-slate-700">{fmtDateSafe(booking.checkIn)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-pink-600 font-medium">Out:</span>
                              <span className="text-slate-700">{fmtDateSafe(booking.checkOut)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-red-700">{formatCurrency(booking.amount)}</TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {booking.addonsTotal !== undefined && booking.addonsTotal !== null && booking.addonsTotal !== 0
                            ? <a href={`${ADDON_API_URL}?bookingId=${encodeURIComponent(booking.bookingId)}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline hover:text-indigo-800 font-semibold">{String(booking.addonsTotal)}</a>
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {(booking as any).outletRevenue
                            ? (
                              <a
                                href={`${OUTLET_API_URL}?bookingId=${encodeURIComponent(booking.bookingId)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 underline hover:text-indigo-800 font-semibold"
                              >
                                {formatCurrency((booking as any).outletRevenue)}
                              </a>
                            )
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {booking.PaymentCollectionHistoryLink ? (
                            <a
                              href={booking.PaymentCollectionHistoryLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-red-700 underline hover:text-red-900 font-medium"
                            >
                              View Collection
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {booking.invoiceUrl ? (
                            <a href={booking.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">View Invoice</a>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {booking.bookerName && booking.bookerName.trim() !== "" ? booking.bookerName : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-red-100 text-red-800 border border-red-300 font-semibold">Cancelled</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          <div className="text-sm text-slate-700 line-clamp-2">{booking.cancellationRemarks || "-"}</div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                              {(booking.lastModifiedBy || booking.assignedTo || "Sales Executive").trim().split(/\s+/).map((n: string) => (n ? n.charAt(0).toUpperCase() : "")).join("")}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 text-sm">{booking.lastModifiedBy || booking.assignedTo || "Sales Executive"}</div>
                              <div className="text-xs text-slate-500">{fmtDateSafe(booking.lastUpdated || booking.lastModifiedOn)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-100 transition-colors">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-white border border-red-200 shadow-lg rounded-lg">
                              <DropdownMenuItem asChild>
                                <button
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 cursor-pointer w-full text-left"
                                  onClick={() => { setSelectedBookingForDetails(booking); setTimeout(() => setShowDetailsModal(true), 80) }}
                                  aria-label={`View details for ${booking.bookingId}`}
                                >
                                  <Eye className="h-4 w-4 text-pink-600" />
                                  <span className="text-slate-700">View Details</span>
                                </button>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1 border-red-200" />
                              <DropdownMenuItem asChild>
                                <button
                                  onClick={() => handleAction("bill_collection_details", booking.id)}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 cursor-pointer w-full text-left"
                                  aria-label={`Bill details for ${booking.bookingId}`}
                                >
                                  <DollarSign className="h-4 w-4 text-emerald-600" />
                                  <span className="text-slate-700">Bill Details</span>
                                </button>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Cancelled Pagination */}
              <div className="flex flex-col gap-3 px-4 py-3 bg-white border-t border-red-200 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-600 text-center sm:text-left">
                  <span>
                    Showing {cancelledBookingsList.length === 0 ? 0 : cancelledStartIndex + 1}–{Math.min(cancelledStartIndex + cancelledItemsPerPage, cancelledBookingsList.length)} of {cancelledBookingsList.length}
                  </span>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-xs sm:text-sm">Rows per page</span>
                    <Select value={String(cancelledItemsPerPage)} onValueChange={(v) => { setCancelledItemsPerPage(Number(v)); setCancelledPage(1) }}>
                      <SelectTrigger className="h-8 w-[80px] border-slate-300"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <Button variant="outline" size="sm" onClick={() => setCancelledPage((p) => Math.max(1, p - 1))} disabled={cancelledPage === 1}>Previous</Button>
                  <span className="text-sm text-slate-600">Page <strong>{cancelledPage}</strong> of <strong>{cancelledTotalPages}</strong></span>
                  <Button variant="outline" size="sm" onClick={() => setCancelledPage((p) => Math.min(cancelledTotalPages, p + 1))} disabled={cancelledPage === cancelledTotalPages}>Next</Button>
                </div>
                <div className="flex items-center gap-2 justify-center sm:justify-end">
                  <span className="text-sm text-slate-600">Go to</span>
                  <Input type="number" min={1} max={cancelledTotalPages} className="h-8 w-[70px] text-center"
                    onKeyDown={(e) => { if (e.key === "Enter") { const page = Number((e.target as HTMLInputElement).value); if (page >= 1 && page <= cancelledTotalPages) setCancelledPage(page) } }} />
                  <Button size="sm" onClick={(e) => { const input = (e.currentTarget.previousSibling as HTMLInputElement); const page = Number(input.value); if (page >= 1 && page <= cancelledTotalPages) setCancelledPage(page) }}>Go</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancel Booking Modal */}
          <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Cancel Booking
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cancel-reason">Reason of Cancellation *</Label>
                  <Select value={cancelReason} onValueChange={setCancelReason}>
                    <SelectTrigger><SelectValue placeholder="Select cancellation reason" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guest_request">Guest Request</SelectItem>
                      <SelectItem value="payment_failure">Payment Failure</SelectItem>
                      <SelectItem value="villa_unavailable">Villa Unavailable</SelectItem>
                      <SelectItem value="medical_emergency">Medical Emergency</SelectItem>
                      <SelectItem value="weather_conditions">Weather Conditions</SelectItem>
                      <SelectItem value="travel_restrictions">Travel Restrictions</SelectItem>
                      <SelectItem value="duplicate_booking">Duplicate Booking</SelectItem>
                      <SelectItem value="policy_violation">Policy Violation</SelectItem>
                      <SelectItem value="system_error">System Error</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancel-remarks">Remarks</Label>
                  <Textarea
                    id="cancel-remarks"
                    placeholder="Enter additional remarks or details about the cancellation..."
                    value={cancelRemarks}
                    onChange={(e) => setCancelRemarks(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowCancelModal(false); setCancelReason(""); setCancelRemarks("") }}>Cancel</Button>
                <Button variant="destructive" onClick={handleCancelBooking} disabled={!cancelReason.trim()}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirm Cancellation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bill Collection Modal */}
          <Dialog open={showBillCollectionModal} onOpenChange={setShowBillCollectionModal}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-700">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  Bill Details
                </DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-4">
                {selectedBookingForBillCollection ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-3 rounded">
                        <Label className="text-slate-700">Booking ID</Label>
                        <div className="font-semibold text-slate-900">{selectedBookingForBillCollection.bookingId || selectedBookingForBillCollection.id}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <Label className="text-slate-700">Pending Amount</Label>
                        <div className="font-semibold text-slate-900">
                          {formatCurrency((selectedBookingForBillCollection.amount || 0) - (selectedBookingForBillCollection.receivedAmount || 0))}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <Label className="text-slate-700">Guest Name</Label>
                        <div className="font-semibold text-slate-900">{selectedBookingForBillCollection?.guestName ?? "N/A"}</div>
                      </div>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm ring-1 ring-slate-50">
                      <div className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 px-5 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold"></div>
                            <h4 className="font-semibold text-slate-900 text-lg">Collection Breakdown</h4>
                          </div>
                          <span className="text-sm text-slate-500">Breakdown of invoice & payments</span>
                        </div>
                      </div>

                      {(() => {
                        const booking = selectedBookingForBillCollection as any

                        const computedSubTotal =
                          typeof booking.subTotalAmount === "number" && !Number.isNaN(booking.subTotalAmount)
                            ? booking.subTotalAmount
                            : (() => {
                              const room = typeof booking.totalRoomCost === "number" ? booking.totalRoomCost : undefined
                              if (typeof room === "number") {
                                const discount = typeof booking.discountTotal === "number" ? Math.abs(booking.discountTotal) : 0
                                return room - discount
                              }
                              return undefined
                            })()

                        const computedNetPayable = (() => {
                          const subTotalAmount = computedSubTotal || 0
                          const taxes = typeof booking.taxesAmount === "number" ? booking.taxesAmount : 0
                          return subTotalAmount + taxes
                        })()

                        const computedTotalAmount = (() => {
                          const netPayable = computedNetPayable || 0
                          const addons = typeof booking.addonsTotal === "number" ? booking.addonsTotal : 0
                          return netPayable + addons
                        })()

                        const rows = [
                          { label: "Room Charges", value: formatBreakdownValue(booking.totalRoomCost, booking.amount) },
                          { label: "Discount", value: formatBreakdownValue(booking.discountTotal) },
                          { label: "Addons", value: formatBreakdownValue(booking.addonsTotal) },
                          { label: "Sub Total", value: formatBreakdownValue(booking.subTotalAmount, computedSubTotal) },
                          { label: "Taxes", value: formatBreakdownValue(booking.taxesAmount) },
                          { label: "Payments", value: formatBreakdownValue(booking.paymentsAmount, booking.receivedAmount) },
                          { label: "Net Payments by Guest", value: formatBreakdownValue(booking.amount, computedTotalAmount) },
                          { label: "Net Payments at Hotel", value: formatBreakdownValue(booking.amount, computedTotalAmount) },
                        ]

                        return (
                          <div>
                            <div className="rounded-b-md overflow-hidden border-b border-slate-200">
                              <div className="rounded-md overflow-hidden border-l border-r border-slate-200">
                                {rows.map((row, i) => {
                                  const isLast = i === rows.length - 1
                                  const isDiscount = /discount/i.test(row.label)
                                  const isPayment = /payment|payments|paid/i.test(row.label)
                                  const isNet = /net payable|net payments|net payments by guest/i.test(row.label)
                                  const isSubTotal = /sub total|subTotalAmount/i.test(row.label)

                                  let valueClass = "text-slate-900 font-semibold"
                                  if (isDiscount) valueClass = "text-rose-700 font-semibold"
                                  if (isPayment) valueClass = "text-emerald-700 font-semibold"
                                  if (isNet) valueClass = "text-emerald-800 font-bold text-lg"

                                  const showGroupSeparator = i === 2 || i === 3 || i === 6
                                  const rowBg = isSubTotal ? "bg-slate-50" : isNet ? "bg-emerald-50/60" : i % 2 === 0 ? "bg-white" : "bg-slate-50"

                                  return (
                                    <div key={`wrap-${i}`} className={`${rowBg} hover:bg-slate-50 transition-colors`}>
                                      <div className={`flex items-center justify-between px-5 py-4 ${!isLast ? "border-b border-slate-200" : ""}`}>
                                        <div className="flex items-center gap-3">
                                          <span className={`w-2.5 h-7 rounded ${isDiscount ? "bg-rose-500" : isPayment || isNet ? "bg-emerald-500" : "bg-slate-200"}`} />
                                          <div className="text-sm text-slate-700 font-medium">{row.label}</div>
                                        </div>
                                        <div className={`text-right ${valueClass} font-mono`}>{row.value}</div>
                                      </div>
                                      {showGroupSeparator && (
                                        <div key={`sep-${i}`} className="px-5">
                                          <div className="my-3 border-t-2 border-slate-300" />
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                              <div className="text-sm text-slate-700 font-medium">Outstanding / Pending</div>
                              <div className="text-lg font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded">
                                {formatBreakdownValue((booking.amount || 0) - (booking.receivedAmount || 0), 0)}
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => { setShowBillCollectionModal(false); setSelectedBookingForBillCollection(null) }}>Close</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">No booking selected.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* View Details Modal */}
          <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900">
                  <Eye className="h-5 w-5 text-pink-600" />
                  Booking Details
                </DialogTitle>
              </DialogHeader>
              <button
                aria-label="Close details"
                onClick={() => { setShowDetailsModal(false); setSelectedBookingForDetails(null) }}
                className="absolute right-3 top-3 p-1 rounded hover:bg-slate-100"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>

              <div className="py-4">
                {selectedBookingForDetails ? (
                  <div className="space-y-6">
                    <section className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
                      <header className="mb-4 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-700" />
                        <h3 className="text-sm font-bold tracking-wide text-indigo-900 uppercase">Basic Information</h3>
                      </header>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="md:col-span-2">
                          <Label className="text-xs text-slate-600">Payment Progress</Label>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="relative h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${selectedBookingForDetails.receivedPercentage || 0}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-900">{selectedBookingForDetails.receivedPercentage || 0}%</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Booking ID</Label>
                          <p className="mt-1 font-semibold text-slate-900">{selectedBookingForDetails.bookingId}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Reservation No</Label>
                          <p className="mt-1 font-semibold text-slate-900">{selectedBookingForDetails.reservationNo}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Booking Date</Label>
                          <p className="mt-1 font-medium text-slate-900">{fmtDateTimeSafe(selectedBookingForDetails.createdDate)}</p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
                      <header className="mb-4 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-700" />
                        <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-900">Financial Details</h3>
                      </header>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {[
                          ["Room Charges", formatCurrency(selectedBookingForDetails.totalRoomCost)],
                          ["Add-ons Charges", formatCurrency(selectedBookingForDetails.addonsTotal)],
                          ["Tax Amount", formatCurrency(selectedBookingForDetails.taxesAmount)],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between rounded-lg bg-white/80 px-4 py-3">
                            <Label className="text-xs text-slate-600">{label}</Label>
                            <p className="font-semibold text-slate-900">{value}</p>
                          </div>
                        ))}
                        <div className="flex justify-between rounded-lg bg-white/80 px-4 py-3">
                          <Label className="text-xs text-slate-600">Discount</Label>
                          <p className="font-semibold text-red-600">
                            {selectedBookingForDetails.discountTotal ? `- ${formatCurrency(selectedBookingForDetails.discountTotal)}` : "N/A"}
                          </p>
                        </div>
                        <div className="sm:col-span-2 flex justify-between rounded-xl bg-emerald-100 px-4 py-3">
                          <Label className="text-xs font-semibold text-emerald-900">Total Payable Amount</Label>
                          <p className="text-base font-bold text-emerald-900">{formatCurrency(selectedBookingForDetails.amount)}</p>
                        </div>
                        <div className="flex justify-between rounded-lg bg-white/80 px-4 py-3">
                          <Label className="text-xs text-slate-600">Amount Received</Label>
                          <p className="font-semibold text-emerald-700">{formatCurrency(selectedBookingForDetails.receivedAmount)}</p>
                        </div>
                        <div className="flex justify-between rounded-lg bg-white/80 px-4 py-3">
                          <Label className="text-xs text-slate-600">Pending Amount</Label>
                          <p className="font-semibold text-amber-700">{formatCurrency(selectedBookingForDetails.amount - selectedBookingForDetails.receivedAmount)}</p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5">
                      <header className="mb-4 flex items-center gap-2">
                        <Eye className="h-4 w-4 text-purple-600" />
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Guest Information</h3>
                      </header>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        {[
                          ["Guest Name", selectedBookingForDetails.guestName],
                          ["Mobile No", selectedBookingForDetails.mobile || "N/A"],
                          ["Email ID", selectedBookingForDetails.email || "N/A"],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <Label className="text-xs text-slate-600">{label}</Label>
                            <p className="mt-1 font-medium text-slate-900">{value}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-5">
                      <header className="mb-4 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-teal-700" />
                        <h3 className="text-sm font-bold uppercase tracking-wide text-teal-900">Stay Information</h3>
                      </header>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 text-sm">
                        {[
                          ["Arrival Date", fmtDateSafe(selectedBookingForDetails.checkIn)],
                          ["Departure Date", fmtDateSafe(selectedBookingForDetails.checkOut)],
                          ["Length of Stay", formatLengthOfStay(selectedBookingForDetails)],
                          ["Total Pax", selectedBookingForDetails.totalPax || (selectedBookingForDetails as any)["Total Pax"] || "N/A"],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <Label className="text-xs text-slate-600">{label}</Label>
                            <p className="mt-1 font-medium text-slate-900">{value}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5">
                      <header className="mb-4 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-600" />
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Booking Type</h3>
                      </header>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                        {[
                          ["Booking Source", selectedBookingForDetails.source],
                          ["Source Type", (selectedBookingForDetails as any).bookingSubSource || "N/A"],
                          ["Room No", selectedBookingForDetails.villaNumber],
                          ["Room Name", selectedBookingForDetails.roomName || "-"],
                          ["Meal Plan", selectedBookingForDetails.plan],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <Label className="text-xs text-slate-600">{label}</Label>
                            <p className="mt-1 font-medium text-slate-900">{value}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                      <header className="mb-4 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Booking Management</h3>
                      </header>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-slate-600">Booking Taken By</Label>
                          <p className="mt-1 font-medium text-slate-900">{selectedBookingForDetails.assignedTo || "-"}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Booking Status</Label>
                          <Badge className={`${getStatusBadge(selectedBookingForDetails.status)} mt-1`}>
                            {selectedBookingForDetails.status?.toUpperCase()}
                          </Badge>
                        </div>
                        {[
                          ["Booker Name", (selectedBookingForDetails as any).bookerName || "-"],
                          ["Booker Mobile", (selectedBookingForDetails as any).bookerMobile || "N/A"],
                          ["Booker Email", (selectedBookingForDetails as any).bookerEmail || "N/A"],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <Label className="text-xs text-slate-600">{label}</Label>
                            <p className="mt-1 font-medium text-slate-900">{value}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">No booking selected.</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowDetailsModal(false); setSelectedBookingForDetails(null) }}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>



          {/* Payment Upload Modal */}
          <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-6 rounded-lg bg-white border border-[#E7E2D3] shadow-2xl">
              {/* Top Accent Strip */}
              <div className="h-1.5 w-full shrink-0 -mt-6 -mx-6 bg-[#1F2430]" />

              <DialogHeader className="pt-2">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#1F2430]">
                  <Upload className="h-5 w-5 text-[#AE8C4A]" />
                  Payment Collection Details
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
                {selectedBookingForPayment && (
                  <div className="space-y-6">
                    {/* Divided Premium Info Bar */}
                    <div className="flex items-stretch divide-x border border-[#E7E2D3] rounded-lg overflow-hidden bg-white shadow-sm">
                      <div className="flex-1 p-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8F98]">Guest Name</span>
                        <p className="mt-1.5 text-sm font-semibold text-[#D6483F]">{selectedBookingForPayment.guestName}</p>
                      </div>
                      <div className="flex-1 p-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8F98]">Mobile</span>
                        <p className="mt-1.5 text-sm font-semibold text-[#1F2430]">{selectedBookingForPayment.mobile || "—"}</p>
                      </div>
                      <div className="flex-1 p-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8F98]">Booking Amount</span>
                        <p className="mt-1.5 text-sm font-semibold text-[#1F2430]">₹{Number(selectedBookingForPayment.amount).toLocaleString()}</p>
                      </div>
                      <div className="flex-1 p-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8F98]">Pending Amount</span>
                        <p className="mt-1.5 text-sm font-semibold text-[#2F6FE0]">
                          ₹{Number(selectedBookingForPayment.amount - selectedBookingForPayment.receivedAmount).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-[#E7E2D3] pt-5">
                      <h4 className="font-bold text-[#AE8C4A] text-xs uppercase tracking-wider">Payment Input Fields</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="receivedAmount" className="text-xs font-semibold text-slate-700">Received Amount (INR) *</Label>
                          <Input
                            id="receivedAmount"
                            type="number"
                            min="0.01"
                            step="any"
                            placeholder="Enter amount"
                            className="border-[#E7E2D3] focus-visible:ring-[#AE8C4A]"
                            value={paymentData.receivedAmount}
                            onChange={(e) => setPaymentData({ ...paymentData, receivedAmount: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="paymentMode" className="text-xs font-semibold text-slate-700">Payment Mode *</Label>
                          <Select
                            value={paymentData.paymentMode}
                            onValueChange={(v) => setPaymentData({ ...paymentData, paymentMode: v })}
                          >
                            <SelectTrigger id="paymentMode" className="border-[#E7E2D3] focus-visible:ring-[#AE8C4A]">
                              <SelectValue placeholder="Select payment mode" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-[#E7E2D3]">
                              <SelectItem value="UPI">UPI</SelectItem>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Credit Card">Credit Card</SelectItem>
                              <SelectItem value="Debit Card">Debit Card</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                              <SelectItem value="Cheque / DD">Cheque / DD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="receivedDate" className="text-xs font-semibold text-slate-700">Received Date *</Label>
                          <Input
                            id="receivedDate"
                            type="date"
                            className="border-[#E7E2D3] focus-visible:ring-[#AE8C4A]"
                            value={paymentData.receivedDate}
                            onChange={(e) => setPaymentData({ ...paymentData, receivedDate: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="receiptNumber" className="text-xs font-semibold text-slate-700">Receipt / Transaction Number *</Label>
                          <Input
                            id="receiptNumber"
                            type="text"
                            placeholder="Enter receipt/transaction number"
                            className="border-[#E7E2D3] focus-visible:ring-[#AE8C4A]"
                            value={paymentData.receiptNumber}
                            onChange={(e) => setPaymentData({ ...paymentData, receiptNumber: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="paymentCollectedBy" className="text-xs font-semibold text-slate-700">Payment Collected By</Label>
                          <Input
                            id="paymentCollectedBy"
                            type="text"
                            placeholder="Enter collector name"
                            className="border-[#E7E2D3] focus-visible:ring-[#AE8C4A]"
                            value={paymentData.paymentCollectedBy}
                            onChange={(e) => setPaymentData({ ...paymentData, paymentCollectedBy: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex gap-2 pt-4 border-t border-[#E7E2D3]">
                <Button
                  variant="outline"
                  className="border-[#E7E2D3] text-slate-700 hover:bg-[#FBF9F4] font-medium"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedBookingForPayment(null);
                    setPaymentData({ receivedAmount: "", currency: "INR", paymentMode: "", receivedDate: "", receiptNumber: "", screenshot: null, paymentLocation: "", paymentCollectedBy: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePaymentSubmit}
                  disabled={!paymentData.receivedAmount || !paymentData.paymentMode || !paymentData.receivedDate || !paymentData.receiptNumber || isSubmitting}
                  className="bg-[#1F2430] hover:bg-[#AE8C4A] text-white font-semibold shadow-sm transition-all"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Submitting..." : "Submit Payment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {selectedBookingForCollection && (
            <CollectionModal
              isOpen={showCollectionPopup}
              onClose={() => {
                setShowCollectionPopup(false)
                setSelectedBookingForCollection(null)
                setCollectionReceipts([])
                setGasDetails(null)
              }}
              bookingId={selectedBookingForCollection.bookingId || selectedBookingForCollection.id}
              guestName={selectedBookingForCollection.guestName}
              checkInLabel={fmtDateSafe(selectedBookingForCollection.checkIn)}
              mobile={
                gasDetails?.mobile !== undefined && gasDetails.mobile !== null
                  ? gasDetails.mobile
                  : selectedBookingForCollection.mobile
              }
              folio={
                gasDetails?.folio ||
                selectedBookingForCollection.invoiceNumber ||
                "VRV" + selectedBookingForCollection.bookingId
              }
              receipts={
                collectionReceipts.length > 0
                  ? collectionReceipts.map((r: any, idx: number) => {
                    const totalAmt = Number(r.received_amount) || 0
                    const recAmt = Number(r.reconciled_amount) || 0

                    let reconciledAmount = null
                    let folioAmount = 0
                    let orderAmount = 0

                    if (recAmt === totalAmt) {
                      reconciledAmount = totalAmt
                      folioAmount = totalAmt
                      orderAmount = 0
                    } else if (recAmt === 0) {
                      reconciledAmount = null
                      folioAmount = totalAmt
                      orderAmount = 0
                    } else {
                      reconciledAmount = recAmt
                      folioAmount = 0
                      orderAmount = totalAmt
                    }

                    const isAgency =
                      (selectedBookingForCollection.source || "").toLowerCase().includes("agent") ||
                      (selectedBookingForCollection.source || "").toLowerCase().includes("ota") ||
                      (selectedBookingForCollection.source || "").toLowerCase().includes("engine") ||
                      (selectedBookingForCollection.sourceType || "").toLowerCase().includes("agent") ||
                      (selectedBookingForCollection.sourceType || "").toLowerCase().includes("ota")

                    return {
                      id: String(r.id || idx + 1),
                      receiptNo: r.receipt_number && r.receipt_number !== "-" ? r.receipt_number : null,
                      date: r.payment_received_date ? fmtDateTimeSafe(r.payment_received_date) : "",
                      createdAt: r.timestamp ? fmtDateTimeSafe(r.timestamp) : (r.created_at ? fmtDateTimeSafe(r.created_at) : ""),
                      mode: r.payment_mode || "Unknown",
                      paymentType: r.payment_type !== undefined ? r.payment_type : "-",
                      status: r.received_status || "RECEIVED",
                      totalAmount: totalAmt,
                      reconciledAmount,
                      folioAmount,
                      orderAmount,
                      currency: r.currency || "INR",
                      paidBy: r.name || selectedBookingForCollection.guestName,
                      paidByType: isAgency ? "AGENCY" : "GUEST",
                      createdBy: r.payment_collected_by || null,
                      bankOrCard: null,
                      notes: r.remarks && r.remarks !== "NULL" ? r.remarks : null,
                    }
                  })
                  : (selectedBookingForCollection.paymentRecords || []).map((r: any, idx: number) => ({
                    id: String(idx + 1),
                    receiptNo: r.receiptNumber || `RCPT-${idx + 1}`,
                    date: r.date ? new Date(r.date).toLocaleString() : "",
                    createdAt: r.date ? new Date(r.date).toLocaleString() : "",
                    mode: r.method || "Unknown",
                    paymentType: "-",
                    status: "RECEIVED",
                    totalAmount: Number(r.amount) || 0,
                    reconciledAmount: Number(r.amount) || 0,
                    folioAmount: Number(r.amount) || 0,
                    orderAmount: 0,
                    currency: "INR",
                    paidBy: selectedBookingForCollection.guestName,
                    paidByType: "GUEST",
                    createdBy: r.collectedBy || "System",
                    bankOrCard: null,
                    notes: r.note || null,
                  }))
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
