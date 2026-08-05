"use client"

import { useState, useEffect, useRef, Suspense, use, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { useBookings, Booking } from "@/hooks/use-fms-bookings"
import { normalizeUserName } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { StageWisePendingsReport } from "@/components/fms/stage-wise-pendings"
import {
  BookingRowsPerPageSelect,
  BOOKING_ROWS_PER_PAGE_OPTIONS,
  DEFAULT_BOOKING_ROWS_PER_PAGE,
} from "@/components/fms/bookings/booking-rows-per-page-select"
import Image from "next/image";
// import { lazy } from "react"
// const StageWisePendingsReport = lazy(() =>
//   import("@/components/fms/stage-wise-pendings").then(module => ({
//     default: module.StageWisePendingsReport
//   }))
// )
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { showFormSubmitSuccess } from "@/utils/toast-utils"
import { submitWithGuard } from "@/utils/submit-guard"
import BookingDetailPopup from "@/components/Bookingdetailpopup"
import PaymentRecordsModal from "@/components/Paymentrecordsmodal"
import TodayStayModal from "@/components/TodayStayModal"
import InvoiceHistoryPopup from "@/components/InvoiceHistoryPopup"
import ArrivalTicketsModal from "@/components/arrivalticketmodel"
import DepartureFlightModal from "@/components/departureticketmodel"

function processDateTime(inputValue: string): string {
  if (!inputValue) return "";
  const [datePart, timePart] = inputValue.split("T");
  const now = new Date();

  if (!timePart || timePart === "00:00") {
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${datePart}T${hours}:${minutes}:${seconds}`;
  } else {
    return `${datePart}T${timePart}:00`;
  }
}

function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr || dateStr === "-") return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

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
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Edit,
  Eye,
  FileText,
  FileCheck,
  Trash2,
  CheckCircle,
  CheckCircle2,
  Building,
  Building2,
  Globe,
  CreditCard,
  Calendar,
  DollarSign,
  BarChart3,
  TrendingUp,
  TrendingDown,
  PauseCircle,
  Clock,
  Download,
  RefreshCw,
  Upload,
  ExternalLink,
  Shield,
  XCircle,
  Users,
  Loader2,
  UserCheck,
  AlertTriangle,
  Gift,
  ChevronRight,
  Info,
  Wallet, Database, LogOut,
  User,
  Tangent
} from "lucide-react"
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, PieChart, Pie, Legend } from "recharts"
import { set } from "date-fns"
import { el, fi, se } from "date-fns/locale"
import { userAgent } from "next/server"

const GLOBAL_CONVERSION_RATES: Record<string, number> = {
  INR: 1,
  USD: 85.74,
  EUR: 89.26,
  EURO: 89.26
};

function convertCurrency(amount: number, from: string, to: string): number {
  const fromRate = GLOBAL_CONVERSION_RATES[(from || "INR").toUpperCase()] ?? 1;
  const toRate = GLOBAL_CONVERSION_RATES[(to || "INR").toUpperCase()] ?? 1;
  return (amount * fromRate) / toRate;
}

// 🔥 SAME LOGIC AS ACTIVE PMS BOOKING LIST
function calculateDays(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  // Difference → convert ms → days
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function normalizeName(name?: string): string {
  return normalizeUserName(name);
}

function stageHasPlanned(stage?: { planned?: unknown } | null): boolean {
  const planned = stage?.planned;
  return typeof planned === "string" ? planned.trim() !== "" : !!planned;
}

function parseDDMMYYYYDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str || str.toLowerCase() === "null" || str.toLowerCase() === "undefined") return null;

  // Check if DD/MM/YYYY HH:mm:ss format
  const parts = str.split(" ");
  const dateParts = parts[0].split("/");
  if (dateParts.length === 3) {
    const day = String(dateParts[0]).padStart(2, "0");
    const month = String(dateParts[1]).padStart(2, "0");
    const year = dateParts[2];
    let hours = "00", minutes = "00", seconds = "00";
    if (parts[1]) {
      const timeParts = parts[1].split(":");
      hours = String(timeParts[0] || "00").padStart(2, "0");
      minutes = String(timeParts[1] || "00").padStart(2, "0");
      seconds = String(timeParts[2] || "00").padStart(2, "0");
    }
    // Parse specifically as IST (+05:30)
    const isoStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback to standard JS Date parsing
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function formatSafeDateString(dateStr: any, isLocalTime = false): string {
  const d = parseDDMMYYYYDate(dateStr);
  if (!d) return "-";
  return isLocalTime
    ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
}

function getNormalizedGroupBooking(val: any): boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") {
    return val > 0;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    const lower = trimmed.toLowerCase();
    if (lower === "true" || lower === "yes" || lower === "1") {
      return true;
    }
    if (lower === "false" || lower === "no" || lower === "0") {
      return false;
    }
    const num = Number(trimmed);
    if (!isNaN(num)) {
      return num > 0;
    }
  }
  return null;
}

function resolveGroupBooking(booking: any): string {
  const raw = booking?.rawItem || {};
  const valuesToTry = [
    raw.groupBooking,
    booking.groupBooking,
    booking.bookingDetails?.groupBooking
  ];

  for (const val of valuesToTry) {
    const normalized = getNormalizedGroupBooking(val);
    if (normalized !== null) {
      return normalized ? "Yes" : "-";
    }
  }
  return "-";
}



const mapBookingToDetail = (booking: Booking): any => {
  const raw = booking.rawItem || {};
  return {
    timestamp: raw.timestamp || "",
    bookingDateTime: raw.bookingDateTime || booking.createdDate || "",
    bookingId: raw.bookingId || booking.bookingId || "",
    guestId: raw.guestId || booking.guestId || "",
    editId: raw.editId || booking.editID || "",
    editDateTime: raw.editDateTime || booking.lastUpdated || "",
    bookingTakenBy: raw.bookingTakenBy || booking.bookingTakenBy || booking.assignedTo || "",
    bookingStatus: raw.bookingStatus || booking.status || "",
    bookingType: raw.bookingType || booking.bookingType || "",
    dataSource: raw.dataSource || booking.dataSource || "",
    clientCategory: raw.clientCategory || booking.clientCategory || "",
    clientType: raw.clientType || booking.clientType || "",

    nameOfClient: raw.nameOfClient || booking.guestName || "",
    gender: raw.gender || booking.gender || "",
    dialCountryCode: raw.dialCountryCode || booking.countryCode || "",
    mobile: raw.mobile || booking.mobile || "",
    email: raw.email || booking.email || "",
    isOPPatient: raw.isOPPatient || "",
    repeatClient: raw.repeatClient || booking.repeat || "",
    billingAddress: raw.billingAddress || booking.billingAddress || "",
    country: raw.country || booking.country || "",
    state: raw.state || booking.state || "",
    district: raw.district || booking.district || "",
    guestStatus: raw.guestStatus || booking.guestStatus || "",
    guestHistoryNote: raw.guestHistoryNote || booking.guestHistory || "",
    uploadTestReportsLink: raw.uploadTestReportsLink || "",

    arrivalDate: raw.arrivalDate || booking.checkIn || "",
    departureDate: raw.departureDate || booking.checkOut || "",
    daysOfStay: raw.daysOfStay || String(calculateDays(booking.checkIn, booking.checkOut)) || "",
    packageType: raw.packageType || "",
    roomNo: raw.roomNo || booking.roomNumber || "",
    roomType: raw.roomType || booking.roomType || "",
    roomCategory: raw.roomCategory || booking.roomCategory || "",
    numberOfAdults: raw.numberOfAdults || booking.adults || "",
    numberOfMale: raw.numberOfMale || booking.male || "",
    numberOfFemale: raw.numberOfFemale || booking.female || "",
    numberOfChildren: raw.numberOfChildren || booking.children || "",
    purposeOfStay: raw.purposeOfStay || booking.purposeOfStay || "",
    programmePackageName: raw.programmePackageName || booking.programmeName || "",
    narration: raw.narration || booking.mlRemarks || "",

    groupBooking: resolveGroupBooking(booking),
    attendeesBystander: raw.attendeesBystander || "",
    nameOfBooker: raw.nameOfBooker || "",
    bookerEmail: raw.bookerEmail || booking.bookerEmail || "",
    bookerPhoneNo: raw.bookerPhoneNo || booking.bookerPhone || "",
    companyName: raw.companyName || "",
    paymentTerms: raw.paymentTerms || "",
    paymentDate: raw.paymentDate || "",

    totalBeforeDiscount: raw.totalBeforeDiscount || String(booking.totalAmountBeforeDiscount || booking.amount || ""),
    discountPercent: raw.discountPercent || String(booking.discountPercent || ""),
    discountAmount: raw.discountAmount || String(booking.discount || ""),
    invoiceAmount: raw.invoiceAmount || String(booking.amount || ""),
    advance: raw.advance || String(booking.receivedAmount || ""),
    balance: raw.balance || String(booking.pendingAmount || booking.balance || ""),

    arrivalTime: raw.arrivalTime || booking.arrivalTime || "",
    arrivalMode: raw.arrivalMode || booking.arrivalMode || "",
    arrivalPickUp: raw.arrivalPickUp || booking.arrivalPickup || "",
    arrivalRemarks: raw.arrivalRemarks || "",
    arrivalDetails: raw.arrivalDetails || "",

    departureTime: raw.departureTime || booking.departureTime || "",
    departureMode: raw.departureMode || booking.departureMode || "",
    departurePickUp: raw.departurePickUp || booking.departurePickup || "",
    departureRemarks: raw.departureRemarks || "",
    departureDetails: raw.departureDetails || "",
  };
}






/** Per-user rows-per-page preferences for this page's bookings tables (KTAHV). */
const KTAHV_ROWS_PER_PAGE_STORAGE_PREFIX = "ktahv_fms_team_bookings_rows_per_page"

type RowsPerPageTable =
  | "pending"
  | "completed"
  | "cancelled"
  | "underAutoRelease"
  | "autoReleased"
  | "voucher"

const ROWS_PER_PAGE_TABLES: RowsPerPageTable[] = [
  "pending",
  "completed",
  "cancelled",
  "underAutoRelease",
  "autoReleased",
  "voucher",
]

function defaultRowsPerPagePrefs(): Record<RowsPerPageTable, number> {
  return {
    pending: DEFAULT_BOOKING_ROWS_PER_PAGE,
    completed: DEFAULT_BOOKING_ROWS_PER_PAGE,
    cancelled: DEFAULT_BOOKING_ROWS_PER_PAGE,
    underAutoRelease: DEFAULT_BOOKING_ROWS_PER_PAGE,
    autoReleased: DEFAULT_BOOKING_ROWS_PER_PAGE,
    voucher: DEFAULT_BOOKING_ROWS_PER_PAGE,
  }
}

function isAllowedRowsPerPage(value: unknown): boolean {
  return (BOOKING_ROWS_PER_PAGE_OPTIONS as readonly number[]).includes(Number(value))
}

export default function SalesAccountsTeamPage() {
  const [bookings, _setBookings] = useState<Booking[]>([])

  const teamPaymentBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const teamPaymentIsTypingRef = useRef(false);
  const teamApprovalBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const teamApprovalIsTypingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (teamPaymentBlurTimeoutRef.current) clearTimeout(teamPaymentBlurTimeoutRef.current);
      if (teamApprovalBlurTimeoutRef.current) clearTimeout(teamApprovalBlurTimeoutRef.current);
    };
  }, []);

  type CollectionHistoryEntry = {
    timestamp?: string
    bookingId?: string
    receivedDate?: string
    currency?: string
    receivedAmount?: string | number
    receiptNumber?: string
    paymentCollectedBy?: string
    screenshot?: string
    paymentLocation?: string
    paymentMode?: string
    pendingAmount?: string | number
    invoiceAmount?: string | number
    updateStatus?: string
    [key: string]: any
  }

  const collectionFieldIndexMap = {
    timestamp: 0,
    bookingId: 1,
    receivedDate: 2,
    currency: 3,
    receivedAmount: 4,
    receiptNumber: 5,
    paymentCollectedBy: 6,
    screenshot: 7,
    paymentLocation: 8,
    paymentMode: 9,
    pendingAmount: 10,
    invoiceAmount: 11,
    updateStatus: 12,
  } as const

  const getCollectionEntryValue = (entry: any, key: keyof typeof collectionFieldIndexMap) => {
    if (!entry) return ""
    if (!Array.isArray(entry) && typeof entry === "object" && key in entry) {
      return entry[key] ?? ""
    }
    if (Array.isArray(entry)) {
      return entry[collectionFieldIndexMap[key]] ?? ""
    }
    return ""
  }

  const validateResponse = async (response: Response) => {
    if (response.type === "opaque") {
      throw new Error("Submission sent; confirmation pending")
    }
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "")
      let parsedBody: any = null
      if (bodyText) {
        try {
          parsedBody = JSON.parse(bodyText)
        } catch {
          parsedBody = { message: bodyText }
        }
      }
      throw new Error(parsedBody?.message || `HTTP error! status: ${response.status}`);
    }
    const rawText = await response.text();
    let data: any = null
    if (rawText) {
      try {
        data = JSON.parse(rawText)
      } catch {
        data = { message: rawText }
      }
    }
    if (data?.status?.toString().toUpperCase() === "ERROR" || data?.status?.toString().toUpperCase() === "FAIL" || data?.success === false) {
      throw new Error(data?.message || "Operation failed on the server");
    }
    return data;
  };

  let { bookings: fetchedBookings, setBookings: setFetchedBookings, pendingCount, nameAliases, loading, error, refetch: refetchBookings } = useBookings();

  const setBookings = useCallback((update: Booking[] | ((prev: Booking[]) => Booking[])) => {
    _setBookings(update);
    setFetchedBookings(update);
  }, [setFetchedBookings]);
  const { user, hasActionPermission } = useAuth()
  const router = useRouter()

  const aliasLookup = useMemo(() => {
    const map: Record<string, string> = {};
    const src = nameAliases ?? {};
    for (const key in src) {
      const k = normalizeName(key).toLowerCase();
      if (k) map[k] = src[key];
    }
    return map;
  }, [nameAliases]);

  // Resolve any name variant to one canonical full name.
  const canonicalName = useCallback((name?: string): string => {
    const n = normalizeName(name);
    if (n === "") return "";
    return aliasLookup[n.toLowerCase()] ?? n;
  }, [aliasLookup]);

  // Same person only if both resolve to the SAME canonical name.
  const namesMatch = useCallback((a?: string, b?: string): boolean => {
    const ca = canonicalName(a);
    const cb = canonicalName(b);
    if (ca === "" || cb === "") return false;
    return ca === cb;
  }, [canonicalName]);

  // Helper function to determine which page role to check
  const getPageRoleForBooking = (booking: Booking): string => {
    return "ktahvPage"
  }

  const getUserWorkType = (): "sales_agent" | "account_manager" | "operation_manager" | 'fo_manager' | null => {
    // Check if we're in browser (client-side)
    if (typeof window === "undefined") return null;

    const cachedRolePermissions = localStorage.getItem("kairali_user");
    if (cachedRolePermissions) {
      try {
        const parsed = JSON.parse(cachedRolePermissions);
        return parsed.action.ktahvPage || null;
      } catch (e) {
        console.error("Failed to parse cached_role_permissions", e);
        return null;
      }
    }
    return null;
  }

  // Helper function to check if user can view a specific booking
  const canUserViewBooking = (booking: Booking): boolean => {
    if (!user) return false

    // Super admin can view all
    if (user.permissions?.includes("all")) return true

    const pageRole = getPageRoleForBooking(booking)

    // Check if user has "viewAll" permission
    if (hasActionPermission(pageRole, "viewAll")) return true

    // Check if user has "viewSelf" permission and booking is assigned to them
    if (hasActionPermission(pageRole, "viewSelf") && namesMatch(booking.assignedTo, user.name)) return true

    return false
  }

  // Helper function to check if user can perform a specific action on a booking
  const canUserPerformAction = (booking: Booking, action: string): boolean => {
    if (!user) return false

    // Admin -> Allow
    if (user.permissions?.includes("all")) return true

    const pageRole = getPageRoleForBooking(booking)

    if (action === "view" || action === "viewDetails") {
      return canUserViewBooking(booking)
    }

    let selfKey = ""
    let allKey = ""
    let timeSensitive = false

    if (action === "edit" || action === "editSelf" || action === "editAll") {
      selfKey = "editSelf"
      allKey = "editAll"
      timeSensitive = true
    } else if (action === "cancel" || action === "cancelSelf" || action === "cancelAll") {
      selfKey = "cancelSelf"
      allKey = "cancelAll"
      timeSensitive = true
    } else if (action === "payment_upload" || action === "collectionSelf" || action === "collectionAll") {
      selfKey = "collectionSelf"
      allKey = "collectionAll"
    } else if (action === "approval_upload" || action === "approvalSelf" || action === "approvalAll") {
      selfKey = "approvalSelf"
      allKey = "approvalAll"
    } else if (action === "arrival_flight" || action === "arrivalFlightSelf" || action === "arrivalFlightAll") {
      selfKey = "arrivalFlightSelf"
      allKey = "arrivalFlightAll"
    } else if (action === "departure_flight" || action === "departureFlightSelf" || action === "departureFlightAll") {
      selfKey = "departureFlightSelf"
      allKey = "departureFlightAll"
    } else if (action === "verify_accounts" || action === "accountsVerify") {
      allKey = "accountsVerify"
    } else if (action === "verify_fo" || action === "foVerify") {
      allKey = "foVerify"
    } else if (action === "verify_checkout") {
      allKey = "checkOutVerify"
    } else {
      if (action.endsWith("Self")) {
        selfKey = action
      } else if (action.endsWith("All")) {
        allKey = action
      } else {
        selfKey = `${action}Self`
        allKey = `${action}All`
      }
    }

    if (timeSensitive) {
      const currentTime = new Date()
      const checkOutTime = new Date(booking.checkOut)
      checkOutTime.setHours(12, 0, 0, 0)
      if (currentTime >= checkOutTime) {
        return false
      }
    }

    const isOwnBooking = namesMatch(booking.assignedTo, user.name)

    if (isOwnBooking) {
      if (selfKey && hasActionPermission(pageRole, selfKey)) return true
    }

    if (allKey && hasActionPermission(pageRole, allKey)) return true

    return false
  }

  // useEffect(() => {
  // }, [fetchedBookings]);

  /**
   * WHY THE SECOND STATE (bookings) IS REQUIRED:
   * The local `bookings` state is necessary because this page performs local, optimistic updates
   * (e.g., cancelling a booking, updating accounts verification status, uploading payments/approvals)
   * to immediately reflect user actions in the UI before or instead of waiting for a network refetch.
   *
   * PREVENTING FUTURE STATE DRIFT:
   * We synchronize the local state with `fetchedBookings` from the `useBookings` hook whenever the
   * fetched data changes, ensuring the page gets updated with fresh server data while still allowing
   * the user to interact with the UI responsively.
   */
  // When hook returns data, replace the local sample data while preserving local updates thereafter.
  useEffect(() => {
    try {
      if (Array.isArray(fetchedBookings)) {
        // Filter bookings based on user permissions
        const permissionFilteredBookings = fetchedBookings.filter(booking => canUserViewBooking(booking))

        _setBookings(prevBookings => {
          return permissionFilteredBookings.map(fetched => {
            const local = prevBookings.find(b => b.bookingId === fetched.bookingId);
            if (!local) return fetched;

            const updated = { ...fetched };

            // Merge sales verification status
            if (local.salesPersonStage?.["1"]?.actual && !fetched.salesPersonStage?.["1"]?.actual) {
              updated.salesPersonStage = {
                ...fetched.salesPersonStage,
                "1": { ...fetched.salesPersonStage?.["1"], ...local.salesPersonStage["1"] }
              };
            }

            // Merge accounts verification stages
            const mergedAccounts = { ...fetched.accountsPersonStage };
            let accountsChanged = false;
            [1, 2, 3].forEach(stageNum => {
              const key = stageNum.toString();
              if (local.accountsPersonStage?.[key]?.actual && !fetched.accountsPersonStage?.[key]?.actual) {
                mergedAccounts[key] = { ...fetched.accountsPersonStage?.[key], ...local.accountsPersonStage[key] };
                accountsChanged = true;
              }
            });
            if (accountsChanged) {
              updated.accountsPersonStage = mergedAccounts;
              updated.accountsVerifyStatus = local.accountsVerifyStatus;
            }

            // Merge front office stages
            const mergedFo = { ...fetched.foPersonStage };
            let foChanged = false;
            [1, 2].forEach(stageNum => {
              const key = stageNum.toString();
              if (local.foPersonStage?.[key]?.actual && !fetched.foPersonStage?.[key]?.actual) {
                mergedFo[key] = { ...fetched.foPersonStage?.[key], ...local.foPersonStage[key] };
                foChanged = true;
              }
            });
            if (foChanged) {
              updated.foPersonStage = mergedFo;
              updated.frontOfficeStatus = local.frontOfficeStatus;
            }

            // Merge checkout verification status
            if (local.checkOutPersonStage?.["1"]?.actual && !fetched.checkOutPersonStage?.["1"]?.actual) {
              updated.checkOutPersonStage = {
                ...fetched.checkOutPersonStage,
                "1": { ...fetched.checkOutPersonStage?.["1"], ...local.checkOutPersonStage["1"] }
              };
              updated.checkoutVerificationStatus = local.checkoutVerificationStatus;
              updated.checkoutVerificationRemarks = local.checkoutVerificationRemarks;
              updated.paymentSettlementStatus = local.paymentSettlementStatus;
            }

            return updated;
          });
        });
      }
    } catch (e) {
      console.error("Failed to apply fetched bookings:", e)
    }
  }, [fetchedBookings, user, hasActionPermission])


  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [teamFilter, setTeamFilter] = useState<string>("all")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("this_week")
  const [checkInFilter, setCheckInFilter] = useState<string>("all")
  const [checkOutFilter, setCheckOutFilter] = useState<string>("all")
  const [assignedFilter, setAssignedFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [dataSourceFilter, setDataSourceFilter] = useState<string>("all")
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" })
  const [sortField, setSortField] = useState<keyof Booking>("bookingId")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [viewMode, setViewMode] = useState<"table" | "chart">("table")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(DEFAULT_BOOKING_ROWS_PER_PAGE)

  // Pagination state for completed bookings table
  const [completedCurrentPage, setCompletedCurrentPage] = useState<number>(1)
  const [completedItemsPerPage, setCompletedItemsPerPage] = useState<number>(DEFAULT_BOOKING_ROWS_PER_PAGE)

  const [searchInput, setSearchInput] = useState("");
  const [collectionTillNowArr, setcollectionTillNowArr] = useState<CollectionHistoryEntry | null>(null);
  const [verifyingAccountStage, setVerifyingAccountStage] = useState<{
    stageNumber: string;
    stageData: Map<string, string>;
  }>();
  const [verifiedCollections, setVerifiedCollections] = useState<Map<string, string>>(new Map());
  const [tobeVerifiedCollections, setTobeVerifiedCollections] = useState<any[]>([]);
  // Cancelled bookings pagination
  const [cancelledCurrentPage, setCancelledCurrentPage] = useState<number>(1)
  const [cancelledItemsPerPage, setCancelledItemsPerPage] = useState<number>(DEFAULT_BOOKING_ROWS_PER_PAGE)
  // Under Auto Release Pagination
  const [underAutoCurrentPage, setUnderAutoCurrentPage] = useState<number>(1)
  const [underAutoItemsPerPage, setUnderAutoItemsPerPage] = useState<number>(DEFAULT_BOOKING_ROWS_PER_PAGE)
  // Auto Released Pagination
  const [autoReleaseCurrentPage, setAutoReleaseCurrentPage] = useState<number>(1)
  const [autoReleaseItemsPerPage, setAutoReleaseItemsPerPage] = useState<number>(DEFAULT_BOOKING_ROWS_PER_PAGE)
  // 🎁 Voucher / Complimentary Pagination
  const [voucherCurrentPage, setVoucherCurrentPage] = useState<number>(1)
  const [voucherItemsPerPage, setVoucherItemsPerPage] = useState<number>(DEFAULT_BOOKING_ROWS_PER_PAGE)

  // 💾 Rows-per-page preferences, stored per authenticated user (KTAHV)
  const rowsPerPageUserKey = useMemo(() => {
    const identity = user?.email || user?.name
    return identity ? String(identity).trim().toLowerCase() : ""
  }, [user?.email, user?.name])

  // Which user key the sizes above currently reflect. Persisting is gated on this
  // matching the live user key, so defaults can never be written over a stored
  // preference before that user's restore has been applied.
  const [rowsPerPageHydratedFor, setRowsPerPageHydratedFor] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    // No stable user key yet — stay on defaults and persist nothing.
    if (!rowsPerPageUserKey) {
      setRowsPerPageHydratedFor(null)
      return
    }

    // Start from defaults so one user's sizes never bleed into another's session.
    const prefs = defaultRowsPerPagePrefs()

    try {
      const raw = window.localStorage.getItem(`${KTAHV_ROWS_PER_PAGE_STORAGE_PREFIX}:${rowsPerPageUserKey}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          ROWS_PER_PAGE_TABLES.forEach((table) => {
            const stored = (parsed as Record<string, unknown>)[table]
            if (isAllowedRowsPerPage(stored)) prefs[table] = Number(stored)
          })
        }
      }
    } catch {
      // Malformed JSON or unavailable storage — keep the defaults.
    }

    setItemsPerPage(prefs.pending)
    setCompletedItemsPerPage(prefs.completed)
    setCancelledItemsPerPage(prefs.cancelled)
    setUnderAutoItemsPerPage(prefs.underAutoRelease)
    setAutoReleaseItemsPerPage(prefs.autoReleased)
    setVoucherItemsPerPage(prefs.voucher)

    // A size change puts its table back on page 1 — restoring is no different.
    setCurrentPage(1)
    setCompletedCurrentPage(1)
    setCancelledCurrentPage(1)
    setUnderAutoCurrentPage(1)
    setAutoReleaseCurrentPage(1)
    setVoucherCurrentPage(1)

    setRowsPerPageHydratedFor(rowsPerPageUserKey)
  }, [rowsPerPageUserKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!rowsPerPageUserKey) return
    if (rowsPerPageHydratedFor !== rowsPerPageUserKey) return

    try {
      window.localStorage.setItem(
        `${KTAHV_ROWS_PER_PAGE_STORAGE_PREFIX}:${rowsPerPageUserKey}`,
        JSON.stringify({
          pending: itemsPerPage,
          completed: completedItemsPerPage,
          cancelled: cancelledItemsPerPage,
          underAutoRelease: underAutoItemsPerPage,
          autoReleased: autoReleaseItemsPerPage,
          voucher: voucherItemsPerPage,
        })
      )
    } catch {
      // Storage unavailable or full — preferences just stay session-only.
    }
  }, [
    rowsPerPageUserKey,
    rowsPerPageHydratedFor,
    itemsPerPage,
    completedItemsPerPage,
    cancelledItemsPerPage,
    underAutoItemsPerPage,
    autoReleaseItemsPerPage,
    voucherItemsPerPage,
  ])

  // 🔥 ACTIVE BOOKINGS TABS (Pending Work / Work Done)
  const [activeBookingsTab, setActiveBookingsTab] = useState<"pending" | "completed">("pending")

  // 🔥 ACCOUNTS PERSON — 3 SUB-TABS FOR PENDING WORK TABLE
  type PendingWorkTableView = "All" | "NewBookings" | "AccountsVerify" | "FinalTransFer" | "DeleteComplete"
  const [pendingWorkTableView, setPendingWorkTableView] = useState<PendingWorkTableView>("All")

  // 🔥 FO PERSON ONLY — 2 SUB-TABS
  type FOPendingWorkTableView = "All" | "NewBookings" | "AccountsVerify" | "FinalTransFer"
  const [foPendingWorkTableView, setFOPendingWorkTableView] = useState<FOPendingWorkTableView>("All")

  // 🔥 FO + CHECKOUT combined — merged single tab bar
  type CombinedFOTabView = "All" | "NewBookings" | "AccountsVerify" | "FinalTransFer" | "CheckoutVerify"
  const [combinedFOTabView, setCombinedFOTabView] = useState<CombinedFOTabView>("All")

  // 🔥 CHECKOUT PERSON ONLY — no sub-tabs (single stage), just use All
  type CheckoutPendingWorkTableView = "All" | "CheckoutVerify"
  const [checkoutPendingWorkTableView, setCheckoutPendingWorkTableView] = useState<CheckoutPendingWorkTableView>("All")

  // const [voucherPageSize, setVoucherPageSize] = useState(10)


  const tableRef = useRef<HTMLDivElement | null>(null)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string>("")
  const [selectedTableRow, setSelectedTableRow] = useState<Record<string, string | number | undefined | null> | undefined>(undefined)
  const [cancelReason, setCancelReason] = useState<string>("")
  const [cancelRemarks, setCancelRemarks] = useState<string>("")

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null)
  const [paymentData, setPaymentData] = useState({
    amount: "",
    receivedAmount: "",
    currency: "INR",
    paymentMode: "",
    receivedDate: "",
    receiptNumber: "",
    screenshot: null as File | null,
    paymentLocation: "",
    paymentCollectedBy: "",
    pendingPaymentAmount: "",
  })
  // NEW STATE FOR PAYMENT SCREENSHOT
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);

  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedBookingForApproval, setSelectedBookingForApproval] = useState<Booking | null>(null)
  const [approvalData, setApprovalData] = useState({
    approvedBy: "",
    approveTillDate: "",
    screenshot: null as File | null,
    remarks: "",
    uploadedBy: "",
    uploadedByEmail: ""
  })

  const [showViewModal, setShowViewModal] = useState(false)
  const [viewBookingData, setViewBookingData] = useState<any>(null)

  const [paymentHistoryModal, setPaymentHistoryModal] = useState<{
    bookingId: string;
    guestName: string;
    mobile: string;
  } | null>(null)
  const [invoiceHistoryModal, setInvoiceHistoryModal] = useState<{
    bookingId: string;
    guestName: string;
    mobile: string;
  } | null>(null)

  // "checkin" | "checkout" | "inhouse" | null — drives the Today's Stay Activity popup
  const [todayStayModal, setTodayStayModal] = useState<"checkin" | "checkout" | "inhouse" | null>(null)

  const [table1Scrolled, setTable1Scrolled] = useState(false)
  const [table2Scrolled, setTable2Scrolled] = useState(false)
  const [table3Scrolled, setTable3Scrolled] = useState(false)
  const [table4Scrolled, setTable4Scrolled] = useState(false)

  // Fix: "modal hangs — must click outside once before close/scroll works"
  // Force body back to interactive whenever a portaled modal is the active top-most layer
  useEffect(() => {
    if (paymentHistoryModal || invoiceHistoryModal || todayStayModal) {
      document.body.style.pointerEvents = "auto";
    }
    return () => {
      document.body.style.pointerEvents = "";
    };
  }, [paymentHistoryModal, invoiceHistoryModal, todayStayModal]);

  // const [isDetailPopupOpen, setIsDetailPopupOpen] = useState(false);
  // const [detailPopupData, setDetailPopupData] = useState<any>(null);

  // const openBookingDetailPopup = (booking: Booking) => {
  //   const detailData = mapBookingToDetail(booking);
  //   setDetailPopupData(detailData);
  //   setIsDetailPopupOpen(true);
  // };

  const [isDetailPopupOpen, setIsDetailPopupOpen] = useState(false);
  // const [selectedBookingId, setSelectedBookingId] = useState<string>("");

  const openBookingDetailPopup = (booking: Booking) => {
    setSelectedBookingId(booking.bookingId);
    // Snapshot the table row values so the popup can diff them against fresh DB data
    const snapshot: Record<string, string | number | undefined | null> = {
      bookingId: booking.bookingId,
      piLink: booking.piLink,
      guestId: booking.guestId,
      editId: booking.editID,
      bookingTakenBy: booking.bookingTakenBy ?? booking.assignedTo,
      // bookingStatus intentionally excluded — table uses internal enum ("confirmed"),
      // DB stores display value ("Confirmed" / "Active") — not directly comparable.
      // guestStatus also excluded for same reason.
      bookingType: booking.bookingType,
      dataSource: booking.dataSource,
      clientCategory: booking.clientCategory,
      clientType: booking.clientType,
      nameOfClient: booking.guestName,
      gender: booking.gender,
      dialCountryCode: booking.countryCode,
      mobile: booking.mobile,
      email: booking.email,
      repeatClient: booking.repeat,
      billingAddress: booking.billingAddress,
      country: booking.country,
      state: booking.state,
      district: booking.district,
      // guestStatus excluded — same cross-mapping issue as bookingStatus
      guestHistoryNote: booking.guestHistory,
      arrivalDate: booking.checkIn,
      departureDate: booking.checkOut,
      roomNo: booking.roomNumber,
      roomType: booking.roomType,
      roomCategory: booking.roomCategory,
      numberOfAdults: booking.adults,
      numberOfMale: booking.male,
      numberOfFemale: booking.female,
      numberOfChildren: booking.children,
      purposeOfStay: booking.purposeOfStay,
      programmePackageName: booking.programmeName,
      narration: booking.mlRemarks,
      groupBooking: booking.groupBooking,
      bookerEmail: booking.bookerEmail,
      bookerPhoneNo: booking.bookerPhone,
      totalBeforeDiscount: booking.totalAmountBeforeDiscount ?? booking.amount,
      discountPercent: booking.discountPercent,
      discountAmount: booking.discount,
      invoiceAmount: booking.amount,
      advance: booking.receivedAmount,
      balance: booking.pendingAmount ?? booking.balance,
      arrivalTime: booking.arrivalTime,
      arrivalMode: booking.arrivalMode,
      arrivalPickUp: booking.arrivalPickup,
      departureTime: booking.departureTime,
      departureMode: booking.departureMode,
      departurePickUp: booking.departurePickup,
    };
    setSelectedTableRow(snapshot);
    setIsDetailPopupOpen(true);
  };

  const computeReceivedPercentage = (received: number | string, total: number | string) => {
    const r = Number(received || 0)
    const t = Number(total || 0)
    return t > 0 ? Math.round((r / t) * 100) : 0
  }



  const viewComputedReceivedPct = viewBookingData
    ? computeReceivedPercentage(Number(viewBookingData?.receivedAmount ?? 0), Number(viewBookingData?.originalAmount ?? 0))
    : 0

  const [showAccountsVerifyModal, setShowAccountsVerifyModal] = useState(false)
  const [selectedBookingForAccounts, setSelectedBookingForAccounts] = useState<Booking | null>(null)
  const [selectedBookingForCancelledBookings, setSelectedBookingForCancelledBookings] = useState<Booking | null>(null)
  const get = (i: number, j: number) =>
    selectedBookingForAccounts?.paymentCollectionHistory &&
      selectedBookingForAccounts.paymentCollectionHistory[i] &&
      selectedBookingForAccounts.paymentCollectionHistory[i][j]
      ? selectedBookingForAccounts.paymentCollectionHistory[i][j]
      : "";

  // ===== 3-STAGE ACCOUNTS VERIFICATION STATE =====
  const [accountsVerifyData, setAccountsVerifyData] = useState({
    // Current Stage (1, 2, or 3)
    currentStage: 1,

    // ===== STAGE 1: First Verification =====
    stage1: {
      paymentReceivedStatus: "",
      actualReceivedAmount: "",
      remarks: "",
      collections: [] as Array<{
        index: number;
        collectionDate: string;
        amount: string;
        mode: string;
        receiptNo: string;
        collectedBy: string;
        location: string;
        verifyStatus: "pending" | "verified" | "rejected";
        verifyRemarks: string;
        actualAmount: string;
      }>,
      isCompleted: false,
      submittedAt: "",
      doer: "",
    },

    // ===== STAGE 2: Second Verification =====
    stage2: {
      paymentReceivedStatus: "",
      actualReceivedAmount: "",
      remarks: "",
      collections: [] as Array<{
        index: number;
        collectionDate: string;
        amount: string;
        mode: string;
        receiptNo: string;
        collectedBy: string;
        location: string;
        verifyStatus: "pending" | "verified" | "rejected";
        verifyRemarks: string;
        actualAmount: string;
      }>,
      isCompleted: false,
      submittedAt: "",
      doer: "",
    },

    // ===== STAGE 3: Third Verification =====
    stage3: {
      paymentReceivedStatus: "",
      actualReceivedAmount: "",
      remarks: "",
      collections: [] as Array<{
        index: number;
        collectionDate: string;
        amount: string;
        mode: string;
        receiptNo: string;
        collectedBy: string;
        location: string;
        verifyStatus: "pending" | "verified" | "rejected";
        verifyRemarks: string;
        actualAmount: string;
      }>,
      isCompleted: false,
      submittedAt: "",
      doer: "",
    },

    salesAgentName: "",
    salesAgentVerified: false,
    salesAgentRemarks: "",

    uploadedScreenshot: "",
    paymentCollectionHistory: [] as Array<{
      index: number;
      collectionDate: string;
      amount: string;
      mode: string;
      receiptNo: string;
      collectedBy: string;
      location: string;
    }>,
  });

  // Helper: Get current stage data
  const getCurrentStageData = () => {
    if (accountsVerifyData.currentStage === 1) return accountsVerifyData.stage1;
    if (accountsVerifyData.currentStage === 2) return accountsVerifyData.stage2;
    return accountsVerifyData.stage3;
  };

  // Helper: Check if current stage is complete
  const isCurrentStageComplete = () => {
    const currentStage = getCurrentStageData();
    if (!currentStage) return false;

    const hasStatus = !!currentStage.paymentReceivedStatus;
    const hasAmount = currentStage.actualReceivedAmount !== undefined && currentStage.actualReceivedAmount !== null && currentStage.actualReceivedAmount !== "";
    const hasRemarks = !!(currentStage.remarks && currentStage.remarks.trim() !== "");

    return hasStatus && hasAmount && hasRemarks;
  };

  // Returns true if the check-in date is in the past or is the same as today's date
  function isCheckInPastOrToday(checkIn: string) {
    if (!checkIn) return false;

    const ci = new Date(checkIn);
    if (isNaN(ci.getTime())) return false;

    ci.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return ci <= today;
  }

  // Helper: Move to next stage
  const moveToNextStage = () => {
    if (accountsVerifyData.currentStage < 3) {
      setAccountsVerifyData({
        ...accountsVerifyData,
        currentStage: accountsVerifyData.currentStage + 1,
      });
    }
  };

  // Helper: Get verified collections count for current stage
  const getVerifiedCollectionsCount = (): number => {
    return getCurrentStageData().collections.filter(c => c.verifyStatus === "verified").length;
  };

  // ===== FO PQMS STAGE HELPERS =====
  const getFOCurrentStageData = () => {
    if (foPMSVerifyData.currentStage === 1) return foPMSVerifyData.stage1;
    return foPMSVerifyData.stage2;
  };

  const isFOCurrentStageComplete = () => {
    const currentStage = getFOCurrentStageData();
    return (
      currentStage.releasePassActionStatus &&
      currentStage.pmsBlockStatus &&
      currentStage.informedToBookingPerson &&
      currentStage.remarks &&
      currentStage.remarks.trim() !== ""
    );
  };

  const isFOStageLocked = (stageNum: number): boolean => {
    const stageData = selectedBookingForFOPMS?.foPersonStage?.[stageNum.toString()];
    const isStageActivated = stageData?.planned && stageData.planned.trim() !== "";

    // Not activated = always locked
    if (!isStageActivated) return true;

    // Get ordered list of activated FO stages
    const activatedFOStages = [1, 2].filter(n => {
      const sd = selectedBookingForFOPMS?.foPersonStage?.[n.toString()];
      return sd?.planned && sd.planned.trim() !== "";
    });

    // Get ordered list of activated Accounts stages
    const activatedAccountsStages = [1, 2, 3].filter(n => {
      const sd = selectedBookingForFOPMS?.accountsPersonStage?.[n.toString()];
      return sd?.planned && sd.planned.trim() !== "";
    });

    const foIndex = activatedFOStages.indexOf(stageNum);

    // Previous activated FO stage must be completed first
    if (foIndex > 0) {
      const prevFOStage = activatedFOStages[foIndex - 1];
      const prevFOKey = `stage${prevFOStage}` as 'stage1' | 'stage2';
      if (!foPMSVerifyData[prevFOKey].isCompleted) return true;
    }

    // Corresponding Accounts stage (by position among activated) must be completed
    const correspondingAccountsStage = activatedAccountsStages[foIndex];
    if (correspondingAccountsStage) {
      const accKey = `stage${correspondingAccountsStage}` as 'stage1' | 'stage2' | 'stage3';
      if (!accountsVerifyData[accKey].isCompleted) return true;
    }

    return false;
  };

  const isAccountSubmitEnabled = isCurrentStageComplete()

  const [showFOPMSVerifyModal, setFOPMSVerifyModal] = useState(false)
  const [selectedBookingForFOPMS, setSelectedBookingForFOPMS] = useState<Booking | null>(null)
  const [foPMSVerifyData, setFoPMSVerifyData] = useState({
    currentStage: 1,
    stage1: {
      releasePassActionStatus: "",
      pmsBlockStatus: "",
      informedToBookingPerson: "",
      remarks: "",
      isCompleted: false,
      submittedAt: "",
      doer: "",
    },
    stage2: {
      releasePassActionStatus: "",
      pmsBlockStatus: "",
      informedToBookingPerson: "",
      remarks: "",
      isCompleted: false,
      submittedAt: "",
      doer: "",
    },
  })
  const isAccountsPending = (selectedBookingForFOPMS?.accountsVerifyStatus == "" || selectedBookingForFOPMS?.accountsVerifyStatus == "pending");



  const [showCheckoutVerifyModal, setShowCheckoutVerifyModal] = useState(false)
  const [selectedBookingForCheckout, setSelectedBookingForCheckout] = useState<Booking | null>(null)
  const [checkoutVerifyData, setCheckoutVerifyData] = useState({
    paymentReceivedStatus: "",
    remarks: "",
  })

  const [showArrivalTicketModal, setShowArrivalTicketModal] = useState(false)
  const [selectedBookingForArrival, setSelectedBookingForArrival] = useState<Booking | null>(null)

  const [showDepartureTicketModal, setShowDepartureTicketModal] = useState(false)
  const [selectedBookingForDeparture, setSelectedBookingForDeparture] = useState<Booking | null>(null)

  const employeeList = [
    "Abhilash Sir",
    "Abishek Sir",
    "Ajay",
    "Ambuj",
    "Anuj Kumar Singh",
    "Arham",
    "Arul",
    "Balakrishna",
    "Dr Gokul",
    "Gaurav PPC",
    "Hariharan",
    "Himanshu",
    "KAC Order Taker",
    "Kavita",
    "Krithika",
    "Mahesh",
    "Manonmani",
    "Nagendran",
    "Pawan Kamra",
    "Puneet Endlay",
    "Pushpanshu Kumar",
    "Rajendra Kumar",
    "Rajesh Arora",
    "RAVINDRAN B",
    "Ritu Chawla",
    "Sadik Rehman",
    "SAILESH KUMAR VERMA",
    "Sakthivel S",
    "Sanjay Yadav",
    "SATISH CHANDRA GANGWAR",
    "Sini Nair",
    "Smita Ghai",
    "Sony Cherian",
    "Sunaj Sahoo",
    "S K THAKUR",
    "Thangarasu",
    "Vikash",
    "VINAYAK PANDURANGA AMBI",
    "Yuvaraj",
    "Rima Sarkar",
    "Shristi Sharma",
    "Sandeep Uniyal",
    "Mamta Kandhari",
    "Samsher Alam",
    "Gaurav Saraswat",
    "Vikesh Kumar",
    "Ravinder Kaur",
    "Bhawna Pokhriya",
    "Priyanka Yadav",
    "Geethanjali",
    "Bhuvaneshwari",
    "Vigneshkumar",
    "Krithika(Direct Task Score)",
    "Hariharan(Direct Task Score)",
    "Suriya Prakash",
    "Abhinav Sood",
    "Mathi Sekar",
    "Gita Mam",
    "KV Ramesh Sir",
    "Suresh Kumar c",
    "Karan Pahuja",
    "Yogendra",
    "Ajay Bobby Mathew",
    "Dr.Shari K",
    "Anil Faridabad Centre",
    "Gopesh",
    "Biju Rajakumaran",
    "Saba Khanam",
    "Dr. Jinky Krishnan",
    "Shibu Varghees",
    "Sunaina Bali",
    "Sajeevan K",
    "kiran Raj",
    "Manoj Kumar",
    "Biju.R",
    "Prakasan M",
    "Janardhanan M",
    "Gopi S",
    "Renuka K",
    "Sindhu V A",
    "Usha Kumari R",
    "Anilkumar C B",
    "Abilash A",
    "Sujith S",
    "Sivadas S",
    "Rohit Bafana",
    "Dr Deepu John",
    "Anoop Vijayaraj",
    "Arvind Maurya",
    "Hemant Gaur",
    "NANDHAKUMAR",
    "Abid Hussain",
    "Sheeba Dieudonne",
    "Muthukumara Raja",
    "Rajitha V",
    "N. Santhosh",
    "Jobin Abraham",
    "Manikandan K",
    "Girish Chaturvedi",
    "Ashok Sharma",
    "Sreehari R",
    "Sameer Anand",
    "Vijay Kumar",
    "Neelam",
    "Umesh Kumar",
    "Yukti Arora",
    "Deepak Arya",
    "Manoj Nair FOM",
    "Vibin S",
    "Nisha G",
    "Vikram Sain",
    "Anil K",
    "Silpa Sasi",
    "Vidisha Bahukhandi",
    "Dhaneshwar Chaturvedi",
    "Varun Chauhan",
    "Anju S",
    "Ajitha.C",
    "Devadas",
    "Manju S",
    "Remya M",
    "Sheeja R",
    "Sudhakaran T",
    "Santha C",
    "Deepthish K R",
    "Kaladharan",
    "Radha V",
    "Thangamani",
    "Kumaran.K",
    "Pankajam",
    "Renuka C",
    "Sanju U",
    "Harpal Singh",
    "Satyam Kumar",
    "KEERTHIKA DEVI",
    "Sanoj M",
    "Sarath R",
    "Dr. Rahul R",
    "Rahul Srivastava",
    "Krishnapriya K",
    "Lineesh N",
    "Mahesh K",
    "Kiran Prasad",
    "Kavita Mahawar",
    "Sonu",
    "Saju",
    "Sabareesan S",
    "Sandeep Kumar",
    "Mona Walia",
    "Tanisha Kataria",
    "Tapswani Nandan Sharma",
    "Suneel Kumar",
    "Yasil K",
    "Athulkrishna K",
    "Jayan P C",
    "UDHAYANANDHINI A",
    "Kavita (PC)",
    "Chandraprakash Parashar",
    "Nithin M",
    "Karan Pahuja (PC)",
    "Visakh R",
    "Deepratan Bande",
    "Arun",
    "Kamal Sharma",
    "Munisha",
    "AJAY SINGH RAWAT",
    "Poonam",
    "Priyanka Murugeshan",
    "Shristi",
    "Neelam Ishrani",
    "Dharmender",
    "Meena Mathur",
    "Bajrang",
    "Ajay Bobby",
    "Dr. Shari K",
    "Dr Anjana Krishnardra K",
    "Supriya Rajesh Kumar",
    "Raj Kumar",
    "Subir",
    "Masaba",
    "Naveen",
    "Amrita",
    "Dr Aiswarya N K Nair",
    "Anurag Dilip Sarkar",
    "Roshni A John",
    "Nilu",
    "Dr Sachin",
    "Ratheesh K R",
    "Sana Albi",
    "Sivasubramaniyam",
    "Saravanakumar",
    "Dhamodharan",
    "Dinesh Kumar",
    "Sabariraj M",
    "Balamurugan B",
    "Vijay Kumar V",
    "Jayan",
    "Ashin M",
    "Birender Singh Chauhan",
    "Rahul Kumar Gupta",
    "Kartik Jain",
    "Anjana Sharma",
    "Priya Sharma - AI",
    "Vyshakh K",
    "Sruthi C",
    "Rahul Raj P R",
    "Avnish Kumar Dubey",
    "Ashikha Raj",
    "Santhosh",
    "Arvind Kumar Thakur",
    "Tikam Chand Ashrani",
    "Zaki Ahmed",
    "Sharat",
    "Mayank Shekhar",
    "Snehal Narendra Mehta",
    "Astha Kumari",
    "Himanshu Kumar",
    "Anupam Singh Molpha",
    "Bonny Thomas",
    "Sajeev K",
    "Shyamdas S",
    "Pradeep Gond",
    "Deepu Sahani",
    "Sathish Kumar S",
    "Pradyumna Kumar Behera",
    "Dr. Akhila Oommen",
    "Kishore K",
    "Jayendra Singh",
    "Sujit Gautam",
    "Vishnudas S",
    "Chithra C",
    "Ravi Shankar Govindu",
    "Kamal",
    "Karthik Kumar",
    "Selvaraj T",
    "Divya Sharma",
    "Madhusudan Mandal",
    "Aakash",
    "Vishnu Prasad S",
    "Parveen Kumar",
    "Sumith S",
    "Yathipathi Sai Krishna Ramanujan",
    "Bestine Benny",
    "Sunil Gour",
    "Milan Pagi",
    "Prema Dhuri",
    "Sagar Niranjanghavatv",
    "Surjeet Kumar",
    "Pratik Karn",
    "Arundas R",
    "Sevit Dhingra",
    "Yogesh Gopalkishan Arora",
    "Manoj G",
    "Shona George",
    "Bharathi",
    "Vinod M",
    "Dhanesh M P",
    "Safad Shah K S",
    "Sarath",
    "Harish Mishra",
    "Rakesh Raja",
    "Gopal",
    "Rohit Ahuja",
    "Anil Kumar",
    "ANAGHA S",
    "Rohan Babbar",
    "Vignesh S",
    "Vishnu Prasad N",
    "Achanya B",
    "Nishant",
  ]

  // ====================================================================
  // HELPER: Initialize Accounts Verify Data from Backend API
  // ====================================================================
  const initializeAccountsVerifyDataFromAPI = (booking: Booking) => {
    const accountsStages = booking.accountsPersonStage || {};

    // Check if stage is completed (has actual completion date)
    const isStageCompleted = (stageNum: number) => {
      const stageData = accountsStages[stageNum.toString()];
      return stageData?.actual && stageData.actual.trim() !== "";
    };

    // Parse collections from booking history
    const parseCollections = () => {
      if (!booking.collectionHistory || !Array.isArray(booking.collectionHistory)) {
        return [];
      }

      return booking.collectionHistory.map((collection, idx) => ({
        index: idx,
        collectionDate: String(getCollectionEntryValue(collection, "receivedDate") || getCollectionEntryValue(collection, "timestamp") || ""),
        amount: String(getCollectionEntryValue(collection, "receivedAmount") || ""),
        mode: String(getCollectionEntryValue(collection, "paymentMode") || ""),
        receiptNo: String(getCollectionEntryValue(collection, "receiptNumber") || ""),
        collectedBy: String(getCollectionEntryValue(collection, "paymentCollectedBy") || ""),
        location: String(getCollectionEntryValue(collection, "paymentLocation") || ""),
        verifyStatus: "pending" as "pending" | "verified" | "rejected",
        verifyRemarks: "",
        actualAmount: String(getCollectionEntryValue(collection, "receivedAmount") || ""),
      }));
    };

    const collections = parseCollections();

    // Calculate total from collections
    const totalReceived = collections.reduce((sum, col) => {
      return sum + (parseFloat(col.amount) || 0);
    }, 0);

    // ✅ FIXED: Determine current stage based on completion AND activation
    // Check if stage is activated (has planned date)
    const isStageActivated = (stageNum: number) => {
      const stageData = accountsStages[stageNum.toString()];
      return stageData?.planned && stageData.planned.trim() !== "";
    };

    let currentStage = 1;

    // ✅ SKIP LOGIC: Only activated stages matter — land on first pending activated stage
    const activatedStages = [1, 2, 3].filter(n => isStageActivated(n));

    if (activatedStages.length > 0) {
      // Find first activated stage that is NOT yet completed
      const firstPending = activatedStages.find(n => !isStageCompleted(n));
      if (firstPending) {
        currentStage = firstPending;
      } else {
        // All activated stages completed — land on last activated
        currentStage = activatedStages[activatedStages.length - 1];
      }
    }
    // If no stages activated at all, default to 1

    // Initialize each stage
    const initStage = (stageNum: number) => {
      const stageData = accountsStages[stageNum.toString()] as any;
      const isCompleted = isStageCompleted(stageNum);

      // Stage-wise amount: API key `amount` → local optimistic key `actualAmount` → collection-history total
      const stageAmount =
        stageData?.amount != null && String(stageData.amount).trim() !== ""
          ? String(stageData.amount)
          : stageData?.actualAmount != null && String(stageData.actualAmount).trim() !== ""
            ? String(stageData.actualAmount)
            : totalReceived.toString();

      return {
        paymentReceivedStatus: isCompleted ? (stageData?.status || "") : "",
        actualReceivedAmount: isCompleted ? stageAmount : "",
        remarks: isCompleted ? (stageData?.remarks || "") : "",
        collections: collections,
        isCompleted: isCompleted,
        submittedAt: isCompleted ? (stageData?.actual || "") : "",
        doer: isCompleted ? (stageData?.doer || "") : "",
      };
    };

    return {
      currentStage,
      stage1: initStage(1),
      stage2: initStage(2),
      stage3: initStage(3),
      salesAgentName: booking.bookingDetails?.bookingTakenBy || "",
      salesAgentVerified: false,
      salesAgentRemarks: "",
      uploadedScreenshot: booking.paymentDetails?.uploadedScreenshot || "",
      paymentCollectionHistory: booking?.paymentCollectionHistory || [],
    };
  };


  const withSubmitGuard = async (fn: () => Promise<void>) => {
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      await fn()
      showFormSubmitSuccess()
    } finally {
      setIsSubmitting(false)
    }
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
    setSearchTerm("")
    setSearchInput("")
    setStatusFilter("all")
    setTeamFilter("all")
    setCheckInFilter("all")
    setCheckOutFilter("all")
    setAssignedFilter("all")
    setSourceFilter("all")
    setDataSourceFilter("all")
    setDateFilter("all")
    setCustomDateRange({ start: "", end: "" })
    setCurrentPage(1)
  }
  // Debounce searchTerm to avoid re-filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const filterByDates = (booking: Booking) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ---------------------------
    // 📌 1️⃣ BOOKING DATE OBJECT
    // ---------------------------
    const bookingDateObj = booking.createdDate ? new Date(booking.createdDate) : null;


    // ---------------------------
    // 📌 2️⃣ BOOKING DATE FILTERS
    // ---------------------------
    if (dateFilter && dateFilter !== "all") {
      if (!bookingDateObj) return false;

      const d = bookingDateObj;

      switch (dateFilter) {
        case "today": {
          if (d.toDateString() !== today.toDateString()) return false;
          break;
        }

        case "yesterday": {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          if (d.toDateString() !== yesterday.toDateString()) return false;
          break;
        }

        case "this_week": {
          const start = new Date(today);
          start.setDate(start.getDate() - start.getDay()); // Sunday
          const end = new Date(start);
          end.setDate(end.getDate() + 6); // Saturday

          if (d < start || d > end) return false;
          break;
        }

        case "last_week": {
          const start = new Date(today);
          start.setDate(start.getDate() - start.getDay() - 7); // previous Sunday
          const end = new Date(start);
          end.setDate(end.getDate() + 6); // previous Saturday

          if (d < start || d > end) return false;
          break;
        }

        case "this_month": {
          if (
            d.getMonth() !== today.getMonth() ||
            d.getFullYear() !== today.getFullYear()
          )
            return false;
          break;
        }

        case "last_month": {
          const last = new Date(today);
          last.setMonth(last.getMonth() - 1);

          if (
            d.getMonth() !== last.getMonth() ||
            d.getFullYear() !== last.getFullYear()
          )
            return false;
          break;
        }
        case "this_year": {
          const currentYear = new Date(today).getFullYear();
          if (d.getFullYear() !== currentYear) return false;
          break;
        }

        case "last_year": {
          const lastYear = new Date(today).getFullYear() - 1;
          if (d.getFullYear() !== lastYear) return false;
          break;
        }

        case "custom": {
          // ❌ Custom selected but date range not chosen
          if (!customDateRange.start || !customDateRange.end) {
            return false;
          }

          const start = new Date(customDateRange.start);
          const end = new Date(customDateRange.end);

          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);

          if (d < start || d > end) return false;
          break;
        }


        default:
          break;
      }

    }

    // ---------------------------
    // 📌 3️⃣ CHECK-IN FILTER
    // ---------------------------
    if (checkInFilter && checkInFilter !== "all") {
      const bookingIn = booking.checkIn ? new Date(booking.checkIn) : new Date(booking.createdDate);
      switch (checkInFilter) {
        case "today": {
          if (bookingIn.toDateString() !== today.toDateString()) return false;
          break;
        }

        case "yesterday": {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          if (bookingIn.toDateString() !== yesterday.toDateString()) return false;
          break;
        }

        case "this_week": {
          const start = new Date(today);
          start.setDate(start.getDate() - start.getDay()); // Sunday
          const end = new Date(start);
          end.setDate(end.getDate() + 6); // Saturday

          if (bookingIn < start || bookingIn > end) return false;
          break;
        }

        case "last_week": {
          const start = new Date(today);
          start.setDate(start.getDate() - start.getDay() - 7); // previous Sunday
          const end = new Date(start);
          end.setDate(end.getDate() + 6); // previous Saturday

          if (bookingIn < start || bookingIn > end) return false;
          break;
        }

        case "this_month": {
          if (
            bookingIn.getMonth() !== today.getMonth() ||
            bookingIn.getFullYear() !== today.getFullYear()
          )
            return false;
          break;
        }

        case "last_month": {
          const last = new Date(today);
          last.setMonth(last.getMonth() - 1);

          if (
            bookingIn.getMonth() !== last.getMonth() ||
            bookingIn.getFullYear() !== last.getFullYear()
          )
            return false;
          break;
        }

        case "custom": {
          // ❌ Custom selected but date range not chosen
          if (!customDateRange.start || !customDateRange.end) {
            return false;
          }

          const start = new Date(customDateRange.start);
          const end = new Date(customDateRange.end);

          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);

          if (bookingIn < start || bookingIn > end) return false;
          break;
        }


        default:
          break;
      }

    }

    // ---------------------------
    // 📌 4️⃣ CHECK-OUT FILTER
    // ---------------------------
    if (checkOutFilter && checkOutFilter !== "all") {
      const bookingOut = booking.checkOut ? new Date(booking.checkOut) : null;
      if (!bookingOut) return false;

      switch (checkOutFilter) {
        case "today": {
          if (bookingOut.toDateString() !== today.toDateString()) return false;
          break;
        }

        case "yesterday": {
          const yesterdayOut = new Date(today);
          yesterdayOut.setDate(yesterdayOut.getDate() - 1);

          if (bookingOut.toDateString() !== yesterdayOut.toDateString()) return false;
          break;
        }

        case "this_week": {
          const start = new Date(today);
          start.setDate(start.getDate() - start.getDay()); // Sunday
          const end = new Date(start);
          end.setDate(end.getDate() + 6); // Saturday

          if (bookingOut < start || bookingOut > end) return false;
          break;
        }

        case "last_week": {
          const start = new Date(today);
          start.setDate(start.getDate() - start.getDay() - 7); // previous Sunday
          const end = new Date(start);
          end.setDate(end.getDate() + 6); // previous Saturday

          if (bookingOut < start || bookingOut > end) return false;
          break;
        }

        case "this_month": {
          if (
            bookingOut.getMonth() !== today.getMonth() ||
            bookingOut.getFullYear() !== today.getFullYear()
          )
            return false;
          break;
        }

        case "last_month": {
          const last = new Date(today);
          last.setMonth(last.getMonth() - 1);

          if (
            bookingOut.getMonth() !== last.getMonth() ||
            bookingOut.getFullYear() !== last.getFullYear()
          )
            return false;
          break;
        }

        case "custom": {
          // ❌ Custom selected but date range not chosen
          if (!customDateRange.start || !customDateRange.end) {
            return false;
          }

          const startOut = new Date(customDateRange.start);
          const endOut = new Date(customDateRange.end);

          startOut.setHours(0, 0, 0, 0);
          endOut.setHours(23, 59, 59, 999);

          if (bookingOut < startOut || bookingOut > endOut) return false;
          break;
        }


        default:
          break;
      }

    }

    return true;
  };
  // 🔥 NORMALIZED BOOKING SOURCE (FINAL)
  const normalizeSource = (s: string = "") => {
    const v = s.trim().toLowerCase();

    if (v.includes("others") || !v) return "Others";

    if (
      v.includes("online") ||
      v.includes("website") ||
      v.includes("portal") ||
      v.includes("web booking") ||
      v.includes("booking engine") ||
      v.includes("engine") ||
      v.includes("web") ||
      v.includes("be")
    ) return "Online Booking Engine";

    if (
      v.includes("ota") ||
      v.includes("booking.com") ||
      v.includes("makemytrip") ||
      v.includes("agoda") ||
      v.includes("expedia") ||
      v.includes("cleartrip") ||
      v.includes("goibibo")
    ) return "OTA";

    if (v.includes("agent") || v.includes("travel") || v.includes("ta"))
      return "Travel Agent";

    if (v.includes("direct") || v.includes("offline"))
      return "Direct Booking";

    if (v.includes("referral"))
      return "Referral";

    return "Others";
  };



  // 🔥 DYNAMIC SALESPERSON LIST FROM API DATA
  const salespersonOptions = useMemo(() => {
    return Array.from(
      new Set(
        bookings
          .map(b =>
            b.assignedTo?.trim() ||
            b.bookingTakenBy?.trim() ||
            b.salesperson?.trim()
          )
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [bookings]);

  // 🔥 SALES PERSON SORTED BY MOST BOOKINGS (ACTIVE FIRST)
  const bookingTakenByOptions = Object.entries(
    bookings.reduce<Record<string, number>>((acc, b) => {
      const name =
        b.bookingTakenBy?.trim() ||
        b.assignedTo?.trim() ||
        b.salesperson?.trim();

      if (!name) return acc;

      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, count]) => ({ name, count }))
    // 🔥 MOST BOOKINGS FIRST
    .sort((a, b) => b.count - a.count);


  // 🔥 DATA SOURCE OPTIONS (FROM ACTIVE PMS BOOKINGS TABLE)
  const dataSourceOptions = useMemo(() => {
    return Array.from(
      new Set(
        bookings
          .map(b => b.dataSource?.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [bookings]);


  // Filter and sort logic (mirrors Villa Raag implementation for robustness)
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        const q = (debouncedSearchTerm ?? "").toLowerCase();
        const guest = (booking.guestName ?? "").toLowerCase();
        const bid = (booking.bookingId ?? "").toLowerCase();
        const assigned = (booking.assignedTo ?? "").toLowerCase();
        const pi = (booking.piNumber ?? "").toLowerCase();

        const matchesSearch =
          q === "" ||
          guest.includes(q) ||
          bid.includes(q) ||
          assigned.includes(q) ||
          pi.includes(q);


        const status = (booking.status ?? "").toString().toLowerCase();
        const salesStatus = (booking.salesTeamStatus ?? "").toString().toLowerCase();
        const accountsStatus = (booking.accountsVerifyStatus ?? "").toString().toLowerCase();
        const frontStatus = (booking.frontOfficeStatus ?? "").toString().toLowerCase();
        const paymentStatus = (booking.paymentSettlementStatus ?? "").toString().toLowerCase();

        let matchesStatus = false;

        if (statusFilter === "all") {
          matchesStatus = true;
        }
        else if (statusFilter === "canceled" || statusFilter === "cancelled") {
          matchesStatus = booking.cancelByUserCheck === "Cancelled";
        }
        // ✅ AUTO RELEASE STATUS FIX
        else if (statusFilter === "auto-release" || statusFilter === "Auto Release") {
          matchesStatus = booking.isAutoReleased === "Auto Released";
        }
        else if (statusFilter === "hold") {
          matchesStatus = status === "hold" || salesStatus.includes("hold");
        } else if (statusFilter === "confirmed") {
          matchesStatus = booking.verfiedOrNot === "Confirm-Verified";
        }
        else if (statusFilter === "pending") {
          // const isPendingFlag =
          //   status === "pending" ||
          //   salesStatus.includes("pending") ||
          //   frontStatus.includes("pending");
          const isPendingFlag = booking.verfiedOrNot !== "Confirm-Verified" && booking.cancelByUserCheck !== "Cancelled" && booking.isAutoReleased !== "Auto Released";

          // const isConfirmedFlag =
          //   booking.verfiedOrNot === "Confirm-Verified" ||
          //   salesStatus.includes("completed") ||
          //   frontStatus.includes("pms_verified_done");

          matchesStatus = isPendingFlag //&& !isConfirmedFlag;
        }
        else {
          matchesStatus = status === statusFilter;
        }

        const matchesTeam = teamFilter === "all" || (booking.team ?? "").toString() === teamFilter;
        const matchesDate = filterByDates(booking);
        const bookingPerson =
          booking.bookingTakenBy?.trim() ||
          booking.assignedTo?.trim() ||
          booking.salesperson?.trim() ||
          "";

        const matchesAssigned =
          assignedFilter === "all" ||
          bookingPerson === assignedFilter;


        // ✅ FIXED matchesSource (Only change)
        const matchesSource =
          sourceFilter === "all" ||
          booking.bSource === sourceFilter;

        const matchesDataSource =
          dataSourceFilter === "all" ||
          booking.dataSource === dataSourceFilter;


        return (
          matchesSearch &&
          matchesStatus &&
          matchesTeam &&
          matchesDate &&
          matchesSource &&
          matchesDataSource &&
          matchesAssigned
        );
      })
      .sort((a, b) => {
        // Convert to actual Date objects
        const aDate = new Date(a[sortField] ?? "");
        const bDate = new Date(b[sortField] ?? "");


        switch (sortField) {
          case "bookingId":
            if (a.bookingId! < b.bookingId!) return sortDirection === "asc" ? -1 : 1;
            if (a.bookingId! > b.bookingId!) return sortDirection === "asc" ? 1 : -1;
            return 0;

          case "guestName":
            if (a.guestName! < b.guestName!) return sortDirection === "asc" ? -1 : 1;
            if (a.guestName! > b.guestName!) return sortDirection === "asc" ? 1 : -1;
            return 0;

          case "amount":
            if (Number(a.amount!) < Number(b.amount!)) return sortDirection === "asc" ? -1 : 1;
            if (Number(a.amount!) > Number(b.amount!)) return sortDirection === "asc" ? 1 : -1;
            return 0;

          case "status":
            if (a.status! < b.status!) return sortDirection === "asc" ? -1 : 1;
            if (a.status! > b.status!) return sortDirection === "asc" ? 1 : -1;
            return 0;

          case "assignedTo":
            if (a.assignedTo! < b.assignedTo!) return sortDirection === "asc" ? -1 : 1;
            if (a.assignedTo! > b.assignedTo!) return sortDirection === "asc" ? 1 : -1;
            return 0;

          /* 🔥 YAHI NEW CASES ADD HUE */
          case "programmeName":
          case "bookingType":
          case "dataSource":
          case "bSource":
            if ((a as any)[sortField]! < (b as any)[sortField]!)
              return sortDirection === "asc" ? -1 : 1;
            if ((a as any)[sortField]! > (b as any)[sortField]!)
              return sortDirection === "asc" ? 1 : -1;
            return 0;

          case "checkIn":
            // Handled below (date logic)
            break;

          case "checkOut":
            // Handled below (date logic)
            break;

          case "createdDate":
            // Handled below (date logic)
            break;

          default:
            return 0;
        }


        // Handle cases where both dates are invalid
        if (isNaN(aDate.getTime()) && isNaN(bDate.getTime())) return 0;


        // If invalid date → push to bottom
        if (isNaN(aDate.getTime())) return 1;
        if (isNaN(bDate.getTime())) return -1;


        // Compare properly
        if (sortDirection === "asc") return aDate.getTime() - bDate.getTime();

        return bDate.getTime() - aDate.getTime();
      })
  }, [bookings, debouncedSearchTerm, statusFilter, teamFilter, dateFilter, checkInFilter, checkOutFilter, assignedFilter, sourceFilter, dataSourceFilter, sortField, sortDirection, customDateRange]);;

  // ---- Today's arrivals / departures (for the summary cards + popup) ----
  // Uses the full `bookings` list (not filteredBookings) so the count reflects
  // everything on the books for today regardless of whatever filters are active.
  const isSameDayAsToday = (value?: string) => {
    if (!value) return false;
    const d = new Date(value);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const isOperationallyActive = useCallback((booking: Booking) => {
    return booking.status !== "cancelled" && booking.isAutoReleased !== "Auto Released";
  }, []);

  const todayCheckIns = useMemo(() => {
    return bookings.filter((b) => isOperationallyActive(b) && isSameDayAsToday(b.checkIn));
  }, [bookings, isOperationallyActive]);

  const todayCheckOuts = useMemo(() => {
    return bookings.filter((b) => isOperationallyActive(b) && isSameDayAsToday(b.checkOut));
  }, [bookings, isOperationallyActive]);

  // Guests currently staying: checked in on/before today, checking out on/after today.
  const inHouseNow = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookings.filter((b) => {
      if (!isOperationallyActive(b)) return false;
      const ci = new Date(b.checkIn);
      const co = new Date(b.checkOut);
      if (isNaN(ci.getTime()) || isNaN(co.getTime())) return false;
      ci.setHours(0, 0, 0, 0);
      co.setHours(0, 0, 0, 0);
      return ci <= today && co >= today;
    });
  }, [bookings, isOperationallyActive]);

  // Deeper stats per list — the things that currently need opening a modal to see:
  // outstanding payment, pending FO/Accounts verification, VIP/repeat, and group bookings.
  const computeStayStats = (list: Booking[]) => {
    let paymentPendingCount = 0;
    let paymentPendingAmount = 0;
    let stagePendingCount = 0;
    let vipRepeatCount = 0;
    let groupBookingCount = 0;

    list.forEach((b) => {
      const pending = Number(String(b.pendingAmount ?? 0).replace(/[^0-9.-]/g, "")) || 0;
      if (pending > 0) {
        paymentPendingCount += 1;
        paymentPendingAmount += pending;
      }

      const accPending = b.accountsVerifyStatus === "pending" || b.accountsVerifyStatus === "under_review";
      const foStatus = (b.frontOfficeStatus || "").toLowerCase();
      const foPending = !!foStatus && foStatus !== "completed" && foStatus !== "verified";
      if (accPending || foPending) stagePendingCount += 1;

      const isRepeat =
        (b.repeat || "").toLowerCase() === "yes" ||
        (b.guestHistory || "").toLowerCase().includes("repeat") ||
        (b.clientCategory || "").toLowerCase().includes("vip");
      if (isRepeat) vipRepeatCount += 1;

      if ((b.groupBooking || "").toLowerCase() === "yes") groupBookingCount += 1;
    });

    return { paymentPendingCount, paymentPendingAmount, stagePendingCount, vipRepeatCount, groupBookingCount };
  };

  const todayCheckInStats = useMemo(() => computeStayStats(todayCheckIns), [todayCheckIns]);
  const todayCheckOutStats = useMemo(() => computeStayStats(todayCheckOuts), [todayCheckOuts]);
  const inHouseStats = useMemo(() => computeStayStats(inHouseNow), [inHouseNow]);

  // -----------------------------------------------
  // REFERRAL COUNT (UNCHANGED, JUST MORE ACCURATE)
  // -----------------------------------------------
  const referralBookings = filteredBookings.filter((b) =>
    normalizeSource(
      b.dataSource || b.bSource || b.source || ""
    ) === "Referral"
  ).length;


  // -----------------------------------------------
  // Reset pagination on filter change
  // -----------------------------------------------
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, statusFilter, teamFilter, checkInFilter, checkOutFilter, assignedFilter, sourceFilter, filteredBookings.length, activeBookingsTab])

  const getStayingStatus = (booking: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);

    if (checkIn > today) return "upcoming";
    if (checkIn <= today && checkOut >= today) return "staying";
    if (checkOut < today) return "checkedout";

    return "unknown";
  };

  // 🔥 GET USER'S WORK TYPE AND FILTER ACCORDINGLY
  const userWorkType = getUserWorkType();
  const userRoles: string[] = userWorkType
    ? userWorkType.split(",").map((r) => r.trim()).filter(Boolean)
    : [];

  // Helper — use this everywhere instead of === checks
  const hasRole = (role: string) => userRoles.includes(role);
  type StageState = "not_activated" | "pending" | "stage_cancelled" | "completed";

  const getSalesStageState = (booking: Booking): StageState => {
    const stage = booking.salesPersonStage as any;
    let hasActivated = false;
    let hasCancelled = false;
    for (const key in stage) {
      const s = stage[key];
      if (!s?.planned || s.planned.trim() === "") continue;
      hasActivated = true;
      if (!s.actual || s.actual.trim() === "") return "pending"; // planned but no actual → pending wins immediately
      if (s.status?.toLowerCase().includes("cancelled") && booking.isAutoReleased !== "Auto Released") hasCancelled = true;
    }
    if (booking.cancelByUserCheck === "Cancelled" && booking.isAutoReleased !== "Auto Released") { hasCancelled = true };
    if (!hasActivated) return "not_activated";
    return hasCancelled ? "stage_cancelled" : "completed";
  };

  // Doer-aware sales state — used ONLY for role-based bucketing (getBookingStateForUser).
  // A pending sales stage counts for the user only if they took the booking (doer match).
  // Note: returns "completed" (not "not_activated") for someone else's pending sales stage,
  // so a pure sales_agent doesn't fall through to the admin-default branch.
  // const getSalesStageStateForUser = (booking: Booking): StageState => {
  //   const stage = booking.salesPersonStage as any;
  //   let hasActivated = false;
  //   let hasCancelled = false;
  //   for (const key in stage) {
  //     const s = stage[key];
  //     if (!s?.planned || s.planned.trim() === "") continue;
  //     hasActivated = true;
  //     if (!s.actual || s.actual.trim() === "") {
  //       // pending sales stage → only the booking taker owns it
  //       if (namesMatch(s?.doer, user?.name)) return "pending";
  //       continue; // someone else's pending sales stage → not this user's work
  //     }
  //     if (s.status?.toLowerCase().includes("cancelled") && booking.isAutoReleased !== "Auto Released") hasCancelled = true;
  //   }
  //   if(namesMatch(s?.doer, user?.name) && booking.cancelByUserCheck === "Cancelled" && booking.isAutoReleased !== "Auto Released") {hasCancelled = true};
  //   if (!hasActivated) return "not_activated";
  //   return hasCancelled ? "stage_cancelled" : "completed";
  // };

  const getSalesStageStateForUser = (booking: Booking): StageState => {
    const stage = booking.salesPersonStage as any;
    let hasActivated = false;
    let hasCancelled = false;
    let isUserDoer = false; // is the logged-in user the sales doer (booking taker)?
    for (const key in stage) {
      const s = stage[key];
      if (!s?.planned || s.planned.trim() === "") continue;
      hasActivated = true;
      if (namesMatch(s?.doer, user?.name)) isUserDoer = true;
      if (!s.actual || s.actual.trim() === "") {
        // pending sales stage → only the booking taker owns it
        if (namesMatch(s?.doer, user?.name)) return "pending";
        continue; // someone else's pending sales stage → not this user's work
      }
      if (s.status?.toLowerCase().includes("cancelled") && booking.isAutoReleased !== "Auto Released") hasCancelled = true;
    }
    // booking-level cancellation counts for this user only if they took the booking (name match)
    if (isUserDoer && booking.cancelByUserCheck === "Cancelled" && booking.isAutoReleased !== "Auto Released") {
      hasCancelled = true;
    }
    if (!hasActivated) return "not_activated";
    return hasCancelled ? "stage_cancelled" : "completed";
  };

  const getAccountsStageState = (booking: Booking): StageState => {
    const stage = booking.accountsPersonStage as any;
    const keys = Object.keys(stage || {}).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
    let hasActivated = false;
    let hasCancelled = false;
    for (const key of keys) {
      const s = stage[key.toString()];
      // if (!s?.planned || s.planned.trim() === "") break; // sequential — stop at first gap

      const planned = s?.planned;
      if (typeof planned === "string" ? planned.trim() !== "" : !!planned) {
        hasActivated = true;

        if (!s.actual || s.actual.trim() == "") return "pending";
        if (s.status?.toLowerCase().includes("cancelled") && booking.isAutoReleased !== "Auto Released") hasCancelled = true;
      }
    }
    if (!hasActivated) return "not_activated";
    return hasCancelled ? "stage_cancelled" : "completed";
  };

  const getOperationStageState = (booking: Booking): StageState => {
    const stage = booking.foPersonStage as any;
    let hasActivated = false;
    let hasCancelled = false;
    for (const key in stage) {
      const s = stage[key];
      const planned = s?.planned;
      if (typeof planned === "string" ? planned.trim() !== "" : !!planned) {
        hasActivated = true;
        if (!s.actual || s.actual.trim() === "") return "pending";
        if (s.status?.toLowerCase().includes("cancelled") && booking.isAutoReleased !== "Auto Released") hasCancelled = true;
      }
    }
    if (!hasActivated) return "not_activated";
    return hasCancelled ? "stage_cancelled" : "completed";
  };

  const getFOManagerStageState = (booking: Booking): StageState => {
    const stage = booking.checkOutPersonStage as any;
    let hasActivated = false;
    let hasCancelled = false;
    for (const key in stage) {
      const s = stage[key];
      const planned = s?.planned;
      if (typeof planned === "string" ? planned.trim() !== "" : !!planned) {
        hasActivated = true;
        if (!s.actual || s.actual.trim() === "") return "pending";
        if (s.status?.toLowerCase().includes("cancelled") && booking.isAutoReleased !== "Auto Released") hasCancelled = true;
      }
    }
    if (!hasActivated) return "not_activated";
    return hasCancelled ? "stage_cancelled" : "completed";
  };

  type BookingUserState = "pending" | "stage_cancelled" | "completed" | "not_applicable";

  const getBookingStateForUser = (booking: Booking): BookingUserState => {
    // Admin/default — handled separately in each filter
    if (userRoles.length === 0) return "not_applicable";

    const roleStateMap: Record<string, () => StageState> = {
      sales_agent: () => getSalesStageStateForUser(booking),
      account_manager: () => getAccountsStageState(booking),
      operation_manager: () => getOperationStageState(booking),
      fo_manager: () => getFOManagerStageState(booking),
    };

    // Collect state for each role the user has, ignore "not_activated" roles
    const states = userRoles
      .map(role => roleStateMap[role]?.() ?? "not_activated")
      .filter(s => s !== "not_activated");

    if (states.length === 0) return "not_applicable";

    // Priority: stage_cancelled > pending > completed
    if (states.includes("stage_cancelled")) return "stage_cancelled";
    if (states.includes("pending")) return "pending";
    return "completed";
  };

  // 🔴 Helper: Get cancel reason & remarks — checks who cancelled first (Sales → Accounts → FO/PMS → Checkout)
  const getCancelledInfo = (booking: Booking): { doer: string; reason: string; remarks: string } => {
    const findCancelledStageInfo = (stageObj: any): { doer: string; remarks: string } => {
      if (!stageObj) return { doer: "", remarks: "" };
      for (const key in stageObj) {

        const s = stageObj[key];
        if (s?.actual?.trim() !== "" && s?.status?.toLowerCase().indexOf("cancelled") !== -1) {
          return {
            doer: s?.doer || "",
            remarks: s?.remarks || "",
          };
        }
      }
      return { doer: "", remarks: "" };
    };

    // Check Sales/Doer stages first
    const salesInfo = findCancelledStageInfo(booking.salesPersonStage);
    if (salesInfo.doer) {
      return {
        doer: salesInfo.doer,
        reason: booking.cancelledReason || "-", // Use cancelledReason for sales
        remarks: salesInfo.remarks || "-", // Use remarks for sales
      };
    }

    // Check Accounts stages
    const accountsInfo = findCancelledStageInfo(booking.accountsPersonStage);
    if (accountsInfo.doer) {
      return {
        doer: accountsInfo.doer,
        reason: "-", // Leave null for accounts
        remarks: accountsInfo.remarks || "-", // Leave null for accounts
      };
    }

    // Check FO stages
    const foInfo = findCancelledStageInfo(booking.foPersonStage);
    if (foInfo.doer) {
      return {
        doer: foInfo.doer,
        reason: "-", // Leave null for FO
        remarks: foInfo.remarks || "-", // Leave null for FO
      };
    }

    // Check Checkout/Other stages
    const otherInfo = findCancelledStageInfo(booking.checkOutPersonStage);
    if (otherInfo.doer) {
      return {
        doer: otherInfo.doer,
        reason: "-", // Leave null for others
        remarks: otherInfo.remarks || "-", // Leave null for others
      };
    }

    // Final fallback
    return {
      doer: booking.assignedTo || booking.bookingTakenBy || "-",
      reason: booking.cancelledReason || "-",
      remarks: booking.cancelledRemarks || "-",
    };
  };

  const getCancelInfo = (booking: Booking): { reason: string; remarks: string } => {
    const cancelledInfo = getCancelledInfo(booking);
    return {
      reason: cancelledInfo.reason,
      remarks: cancelledInfo.remarks,
    };
  };

  const getCancelledByName = (booking: Booking): string => {
    return getCancelledInfo(booking).doer;
  };
  // const activeBookings = useMemo(() => {
  //   return filteredBookings.filter((booking, ind) => {
  //     // First check if booking is not cancelled
  //     if (booking.status === "cancelled" || booking?.isAutoReleased === "Auto Released") return false;

  //     // 🔥 ROLE-BASED PLANNED FIELD CHECK
  //     // Check if the appropriate stage's "planned" field is not null based on user role

  //     // Sales Agent: Check salesPersonStage for planned date
  //     if (hasRole("sales_agent")) {
  //       const salesStage1 = booking.salesPersonStage?.["1"];
  //       return salesStage1?.planned && salesStage1.planned.trim() !== "";
  //     }

  //     // Account Manager: Check accountsPersonStage for planned date

  //     if (hasRole("account_manager")) {
  //       var stage = booking.accountsPersonStage as any;
  //       var status = false;

  //       for (var key in stage) {
  //         if (stage[key]?.planned?.trim() !== "") {
  //           status = true;
  //           break;
  //         }
  //       }

  //       return status;
  //     }

  //     // Operation Manager: Check foPersonStage for planned date
  //     if (hasRole("operation_manager")) {
  //       // const foStage1 = booking.foPersonStage?.["1"];
  //       // return foStage1?.planned && foStage1.planned.trim() !== "";
  //       var stage = booking.foPersonStage as any;
  //       var status = false;
  //       for (var key in stage) {
  //         if (stage[key]?.planned?.trim() !== "") {
  //           status = true;
  //           break;
  //         }
  //       }
  //       return status;
  //     }

  //     if (hasRole("fo_manager")) {
  //       // if(booking.bookingId == "KTAHV-PMS-4761"){
  //       // }

  //       var stage = booking?.checkOutPersonStage?.["1"]
  //       return stage?.planned && stage.planned.trim() !== "";
  //     }

  //     // Admin/Default: Show all non-cancelled bookings that have any planned date
  //     const hasSalesPlanned = booking.salesPersonStage?.["1"]?.planned &&
  //       booking.salesPersonStage["1"].planned.trim() !== "";
  //     const hasAccountsPlanned = booking.accountsPersonStage?.["1"]?.planned &&
  //       booking.accountsPersonStage["1"].planned.trim() !== "";
  //     const hasFOPlanned = booking.foPersonStage?.["1"]?.planned &&
  //       booking.foPersonStage["1"].planned.trim() !== "";

  //     // Return true if any stage has a planned date
  //     return hasSalesPlanned || hasAccountsPlanned || hasFOPlanned;
  //   });
  // }, [filteredBookings, getUserWorkType()]);

  const activeBookings = useMemo(() => {
    return filteredBookings.filter((booking) => {
      // Pre-filter: exclude cancelled
      if (booking?.isAutoReleased === "Auto Released") return false;

      // Check if cancelled (exclude cancelled bookings from active bookings list)
      const isCancelled = getSalesStageState(booking) === "stage_cancelled" ||
        getAccountsStageState(booking) === "stage_cancelled" ||
        getOperationStageState(booking) === "stage_cancelled" ||
        getFOManagerStageState(booking) === "stage_cancelled";
      if (isCancelled) return false;

      // No role assigned → admin/default fallback
      if (userRoles.length === 0 || hasRole("superVisor")) {
        const hasSalesPlanned = booking.salesPersonStage?.["1"]?.planned?.trim() !== "";
        const hasAccountsPlanned = booking.accountsPersonStage?.["1"]?.planned?.trim() !== "";
        const hasFOPlanned = booking.foPersonStage?.["1"]?.planned?.trim() !== "";
        return hasSalesPlanned || hasAccountsPlanned || hasFOPlanned;
      }

      // For each role the user has, evaluate its condition.
      // Return true if ANY role's condition passes (union logic).

      if (hasRole("sales_agent")) {
        const salesStage1 = booking.salesPersonStage?.["1"];
        if (salesStage1?.planned && salesStage1.planned.trim() !== "") return true;
      }

      if (hasRole("account_manager")) {
        const stage = booking.accountsPersonStage as any;
        for (const key in stage) {
          if (stage[key]?.planned?.trim() !== "") return true;
        }
      }

      if (hasRole("operation_manager")) {
        const stage = booking.foPersonStage as any;
        for (const key in stage) {
          if (stage[key]?.planned?.trim() !== "") return true;
        }
      }

      if (hasRole("fo_manager")) {
        const stage = booking?.checkOutPersonStage?.["1"];
        if (stage?.planned && stage.planned.trim() !== "") return true;
      }

      return false; // no role condition matched
    });
  }, [filteredBookings, userWorkType]);


  // 🔥 SPLIT ACTIVE BOOKINGS INTO PENDING WORK AND COMPLETED WORK (ROLE-BASED)
  // const pendingWorkBookings = useMemo(() => {
  //   return activeBookings.filter((booking) => {
  //     // Sales Agent: Check sales verification status
  //     if (hasRole("sales_agent")) {
  //       // return (booking.editActionStatus || "").toLowerCase() == "pending" ||
  //       //   (booking.editActionStatus || "").toLowerCase() == "";
  //       var stage = booking.salesPersonStage as any;
  //       for (var key in stage) {
  //         if (stage?.[key]?.planned.trim() !== "" && stage?.[key]?.actual.trim() === "") {
  //           return true; // PENDING work
  //         }
  //       }
  //       return false; // No pending work
  //     }

  //     // Account Manager: Check accounts verification status
  //     if (hasRole("account_manager")) {
  //       var stage = booking.accountsPersonStage as any;

  //       // Get sorted stage keys (1, 2, 3...)
  //       const stageKeys = Object.keys(stage || {})
  //         .map(Number)
  //         .filter(n => !isNaN(n))
  //         .sort((a, b) => a - b);

  //       // Check stages SEQUENTIALLY
  //       for (let i = 0; i < stageKeys.length; i++) {
  //         const currentKey = stageKeys[i].toString();
  //         const currentStage = stage[currentKey];

  //         // If stage is NOT activated (no planned), STOP checking further stages
  //         if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //           break; // Don't check any stages after this
  //         }

  //         // If stage is activated but NOT completed → PENDING
  //         if (!currentStage?.actual || currentStage.actual.trim() === "") {
  //           return true; // PENDING work
  //         }
  //       }

  //       return false; // No pending work
  //     }

  //     // Operation Manager: Check FO/Payment settlement status
  //     if (hasRole("operation_manager")) {
  //       // const foStatus = (booking.frontOfficeStatus || "").toLowerCase();
  //       // const paymentStatus = (booking.paymentSettlementStatus || "").toLowerCase();
  //       // return (foStatus == "pending" || foStatus == "")

  //       var stage = booking.foPersonStage as any;
  //       var status = (booking.frontOfficeStatus || "").toLowerCase();
  //       for (var key in stage) {
  //         if (stage?.[key]?.planned.trim() !== "" && stage?.[key]?.actual.trim() === "") {
  //           status = "pending";
  //           break;
  //         }
  //       }
  //       return status == "pending" || status == "";
  //     }

  //     if (hasRole("fo_manager")) {
  //       var stage = booking.checkOutPersonStage as any;
  //       var status = "Done";
  //       for (var key in stage) {
  //         if (stage?.[key]?.planned.trim() !== "" && stage?.[key]?.actual.trim() === "") {
  //           status = "pending";
  //           break;
  //         }
  //       }
  //       return status == "pending" || status == "";

  //     }

  //     // Default: Show all pending across all departments
  //     const isSalesPending = (booking.editActionStatus || "").toLowerCase() == "pending" ||
  //       (booking.editActionStatus || "").toLowerCase() == "";
  //     const isAccountsPending = (booking.accountsVerifyStatus || "").toLowerCase() == "pending" ||
  //       (booking.accountsVerifyStatus || "").toLowerCase() == "";
  //     const isFOPending = (booking.frontOfficeStatus || "").toLowerCase() == "pending" ||
  //       (booking.frontOfficeStatus || "").toLowerCase() == "";
  //     const isPaymentPending = (booking.paymentSettlementStatus || "").toLowerCase() == "pending" &&
  //       (booking.paymentSettlementStatus || "").toLowerCase() !== "" && booking.checkOutPersonStage["1"].planned.trim() !== "";

  //     return isSalesPending || isAccountsPending || isFOPending || isPaymentPending;
  //   });
  // }, [activeBookings, getUserWorkType()]);


  // const completedWorkBookings = activeBookings.filter((booking) => {
  //   // Sales Agent: Check sales verification is completed
  //   if (hasRole("sales_agent")) {
  //     // return (booking.editActionStatus || "").toLowerCase() !== "pending" &&
  //     //   (booking.editActionStatus || "").toLowerCase() !== "";
  //     var stage = booking.salesPersonStage as any;
  //     for (var key in stage) {
  //       if ((stage?.[key]?.planned.trim() !== "" && stage?.[key]?.actual.trim() === "") || (stage?.[key]?.planned.trim() !== "" && stage?.[key]?.actual.trim() !== "" && stage?.[key]?.status.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released")) {
  //         return false; // PENDING work found
  //       }
  //     }
  //     return true; // All work completed
  //   }

  //   // Account Manager: Check accounts verification is completed
  //   if (hasRole("account_manager")) {
  //     var stage = booking.accountsPersonStage as any;

  //     // Get sorted stage keys (1, 2, 3...)
  //     const stageKeys = Object.keys(stage || {})
  //       .map(Number)
  //       .filter(n => !isNaN(n))
  //       .sort((a, b) => a - b);

  //     // Check stages SEQUENTIALLY
  //     for (let i = 0; i < stageKeys.length; i++) {
  //       const currentKey = stageKeys[i].toString();
  //       const nextKey = stageKeys[i + 1]?.toString();

  //       const currentStage = stage[currentKey];
  //       const nextStage = nextKey ? stage[nextKey] : null;

  //       // If current stage is NOT activated, STOP checking further
  //       if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //         break; // Don't check stages beyond this
  //       }

  //       // If current stage is completed
  //       if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status.toLowerCase().indexOf("cancelled") === -1 && booking?.isAutoReleased !== "Auto Released") {
  //         // Check if next stage is NOT activated OR doesn't exist (last stage)
  //         if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
  //           return true; // WORK DONE - completed and next not activated
  //         }

  //         // If next stage IS activated, continue to check it
  //         continue;
  //       } else {
  //         // Current stage is activated but NOT completed - this is pending, not work done
  //         return false;
  //       }
  //     }

  //     return false; // No work done to show
  //   }

  //   // Operation Manager: Check FO and Payment settlement are completed
  //   if (hasRole("operation_manager")) {
  //     var stage = booking.foPersonStage as any;
  //     var status = (booking.frontOfficeStatus || "").toLowerCase();
  //     for (var key in stage) {
  //       if ((stage?.[key]?.planned.trim() !== "" && stage?.[key]?.actual.trim() === "" ) || (stage?.[key]?.planned.trim() !== "" && stage?.[key]?.actual.trim() !== "" && stage?.[key]?.status.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released")) {
  //         status = "pending";
  //         break;
  //       }
  //     }
  //     return status !== "pending" && status !== "";
  //     // const foStatus = (booking.frontOfficeStatus || "").toLowerCase();
  //     // const paymentStatus = (booking.paymentSettlementStatus || "").toLowerCase();
  //     // return (foStatus !== "pending" && foStatus !== "")
  //   }

  //   if (hasRole("fo_manager")) {
  //     var stage = booking.checkOutPersonStage as any;
  //     var status = "Done";
  //     for (var key in stage) {
  //       if (stage?.[key]?.planned.trim() !== "" && stage?.[key]?.actual.trim() === "") {
  //         status = "pending";
  //         break;
  //       }
  //     }
  //     return status !== "pending" && status !== "";
  //   }

  //   // Default: Show all completed across all departments
  //   const isSalesCompleted = (booking.editActionStatus || "").toLowerCase() !== "pending" &&
  //     (booking.editActionStatus || "").toLowerCase() !== "";
  //   const isAccountsCompleted = (booking.accountsVerifyStatus || "").toLowerCase() !== "pending" &&
  //     (booking.accountsVerifyStatus || "").toLowerCase() !== "";
  //   const isFOCompleted = (booking.frontOfficeStatus || "").toLowerCase() !== "pending" &&
  //     (booking.frontOfficeStatus || "").toLowerCase() !== "";
  //   const isPaymentCompleted = ((booking.paymentSettlementStatus || "").toLowerCase() !== "pending" &&
  //     (booking.paymentSettlementStatus || "").toLowerCase() !== "") || booking.checkOutPersonStage["1"].planned.trim() == "";

  //   return isSalesCompleted && isAccountsCompleted && isFOCompleted && isPaymentCompleted;
  // });


  // const completedWorkBookings = useMemo(() => {
  //   return activeBookings.filter((booking) => {
  //     if (hasRole("sales_agent") {
  //       var stage = booking.salesPersonStage as any;
  //       for (var key in stage) {
  //         if ((stage?.[key]?.planned.trim() !== "" && stage?.[key]?.actual.trim() === "") || (stage?.[key]?.planned.trim() !== "" && stage?.[key]?.actual.trim() !== "" && stage?.[key]?.status.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released")) {
  //           return false;
  //         }
  //       }
  //       return true;
  //     }

  //     if (hasRole("account_manager")) {
  //       var stage = booking.accountsPersonStage as any;

  //       const stageKeys = Object.keys(stage || {})
  //         .map(Number)
  //         .filter(n => !isNaN(n))
  //         .sort((a, b) => a - b);

  //       for (let i = 0; i < stageKeys.length; i++) {
  //         const currentKey = stageKeys[i].toString();
  //         const nextKey = stageKeys[i + 1]?.toString();

  //         const currentStage = stage[currentKey];
  //         const nextStage = nextKey ? stage[nextKey] : null;

  //         if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //           break;
  //         }

  //         if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status.toLowerCase().indexOf("cancelled") === -1 && booking?.isAutoReleased !== "Auto Released") {
  //           if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
  //             return true;
  //           }

  //           continue;
  //         } else {
  //           return false;
  //         }
  //       }

  //       return false;
  //     }

  //     if (hasRole("operation_manager")) {
  //       var stage = booking.foPersonStage as any;

  //       const stageKeys = Object.keys(stage || {})
  //         .map(Number)
  //         .filter(n => !isNaN(n))
  //         .sort((a, b) => a - b);

  //       for (let i = 0; i < stageKeys.length; i++) {
  //         const currentKey = stageKeys[i].toString();
  //         const nextKey = stageKeys[i + 1]?.toString();

  //         const currentStage = stage[currentKey];
  //         const nextStage = nextKey ? stage[nextKey] : null;

  //         if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //           break;
  //         }

  //         if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status.toLowerCase().indexOf("cancelled") === -1 && booking?.isAutoReleased !== "Auto Released") {
  //           if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
  //             return true;
  //           }

  //           continue;
  //         } else {
  //           return false;
  //         }
  //       }

  //       return false;
  //     }

  //     if (hasRole("fo_manager")) {
  //       var stage = booking.checkOutPersonStage as any;
  //       var status = "Done";
  //       for (var key in stage) {
  //         if (stage?.[key]?.planned.trim() !== "" && stage?.[key]?.actual.trim() === "") {
  //           status = "pending";
  //           break;
  //         }
  //       }
  //       return status !== "pending" && status !== "";
  //     }

  //     // Default: Check ALL departments are completed
  //     // 1. Check Sales
  //     const salesStage = booking.salesPersonStage as any;
  //     let isSalesCompleted = true;
  //     for (var key in salesStage) {
  //       if ((salesStage?.[key]?.planned.trim() !== "" && salesStage?.[key]?.actual.trim() === "") || (salesStage?.[key]?.planned.trim() !== "" && salesStage?.[key]?.actual.trim() !== "" && salesStage?.[key]?.status.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released")) {
  //         isSalesCompleted = false;
  //         break;
  //       }
  //     }

  //     // 2. Check Accounts (sequential logic)
  //     const accountsStage = booking.accountsPersonStage as any;
  //     let isAccountsCompleted = false;

  //     const accountStageKeys = Object.keys(accountsStage || {})
  //       .map(Number)
  //       .filter(n => !isNaN(n))
  //       .sort((a, b) => a - b);

  //     for (let i = 0; i < accountStageKeys.length; i++) {
  //       const currentKey = accountStageKeys[i].toString();
  //       const nextKey = accountStageKeys[i + 1]?.toString();

  //       const currentStage = accountsStage[currentKey];
  //       const nextStage = nextKey ? accountsStage[nextKey] : null;

  //       if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //         break;
  //       }

  //       if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status.toLowerCase().indexOf("cancelled") === -1 && booking?.isAutoReleased !== "Auto Released") {
  //         if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
  //           isAccountsCompleted = true;
  //           break;
  //         }
  //         continue;
  //       } else {
  //         break;
  //       }
  //     }

  //     // 3. Check Front Office (sequential logic)
  //     const foStage = booking.foPersonStage as any;
  //     let isFOCompleted = false;

  //     const foStageKeys = Object.keys(foStage || {})
  //       .map(Number)
  //       .filter(n => !isNaN(n))
  //       .sort((a, b) => a - b);

  //     for (let i = 0; i < foStageKeys.length; i++) {
  //       const currentKey = foStageKeys[i].toString();
  //       const nextKey = foStageKeys[i + 1]?.toString();

  //       const currentStage = foStage[currentKey];
  //       const nextStage = nextKey ? foStage[nextKey] : null;

  //       if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //         break;
  //       }

  //       if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status.toLowerCase().indexOf("cancelled") === -1 && booking?.isAutoReleased !== "Auto Released") {
  //         if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
  //           isFOCompleted = true;
  //           break;
  //         }
  //         continue;
  //       } else {
  //         break;
  //       }
  //     }

  //     // 4. Check Checkout
  //     const checkOutStage = booking.checkOutPersonStage as any;
  //     let isCheckoutCompleted = true;
  //     for (var key in checkOutStage) {
  //       if (checkOutStage?.[key]?.planned.trim() !== "" && checkOutStage?.[key]?.actual.trim() === "") {
  //         isCheckoutCompleted = false;
  //         break;
  //       }
  //     }

  //     return isSalesCompleted && isAccountsCompleted && isFOCompleted && isCheckoutCompleted;
  //   });
  // }, [activeBookings, getUserWorkType()]);


  // ── Per-role PENDING checkers ──────────────────────────────────────
  // const isSalesPending = (booking: Booking): boolean => {
  //   const stage = booking.salesPersonStage as any;
  //   for (const key in stage) {
  //     if (stage[key]?.planned?.trim() !== "" && stage[key]?.actual?.trim() === "") return true;
  //   }
  //   return false;
  // };

  // const isAccountsPending = (booking: Booking): boolean => {
  //   const stage = booking.accountsPersonStage as any;
  //   const stageKeys = Object.keys(stage || {}).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
  //   for (const key of stageKeys) {
  //     const s = stage[key.toString()];
  //     if (!s?.planned || s.planned.trim() === "") break;       // not activated → stop
  //     if (!s?.actual || s.actual.trim() === "") return true;   // activated but no actual → pending
  //   }
  //   return false;
  // };

  // const isOperationPending = (booking: Booking): boolean => {
  //   const stage = booking.foPersonStage as any;
  //   for (const key in stage) {
  //     if (stage[key]?.planned?.trim() !== "" && stage[key]?.actual?.trim() === "") return true;
  //   }
  //   return false;
  // };

  // const isFOManagerPending = (booking: Booking): boolean => {
  //   const stage = booking.checkOutPersonStage as any;
  //   for (const key in stage) {
  //     if (stage[key]?.planned?.trim() !== "" && stage[key]?.actual?.trim() === "") return true;
  //   }
  //   return false;
  // };

  // ── Per-role COMPLETED checkers ────────────────────────────────────
  // const isSalesCompleted = (booking: Booking): boolean => {
  //   const stage = booking.salesPersonStage as any;
  //   for (const key in stage) {
  //     if (
  //       (stage[key]?.planned?.trim() !== "" && stage[key]?.actual?.trim() === "") ||
  //       (stage[key]?.planned?.trim() !== "" && stage[key]?.status?.toLowerCase().includes("cancelled") && booking?.isAutoReleased !== "Auto Released")
  //     ) return false;
  //   }
  //   return true;
  // };

  // const isAccountsCompleted = (booking: Booking): boolean => {
  //   const stage = booking.accountsPersonStage as any;
  //   const stageKeys = Object.keys(stage || {}).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
  //   for (let i = 0; i < stageKeys.length; i++) {
  //     const currentKey = stageKeys[i].toString();
  //     const nextKey = stageKeys[i + 1]?.toString();
  //     const current = stage[currentKey];
  //     const next = nextKey ? stage[nextKey] : null;
  //     if (!current?.planned || current.planned.trim() === "") break;
  //     if (current?.actual?.trim() !== "" && !current?.status?.toLowerCase().includes("cancelled") && booking?.isAutoReleased !== "Auto Released") {
  //       if (!next?.planned || next.planned.trim() === "") return true; // last activated stage done
  //       continue;
  //     } else return false;
  //   }
  //   return false;
  // };

  // const isOperationCompleted = (booking: Booking): boolean => {
  //   const stage = booking.foPersonStage as any;
  //   const stageKeys = Object.keys(stage || {}).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
  //   for (let i = 0; i < stageKeys.length; i++) {
  //     const currentKey = stageKeys[i].toString();
  //     const nextKey = stageKeys[i + 1]?.toString();
  //     const current = stage[currentKey];
  //     const next = nextKey ? stage[nextKey] : null;
  //     if (!current?.planned || current.planned.trim() === "") break;
  //     if (current?.actual?.trim() !== "" && !current?.status?.toLowerCase().includes("cancelled") && booking?.isAutoReleased !== "Auto Released") {
  //       if (!next?.planned || next.planned.trim() === "") return true;
  //       continue;
  //     } else return false;
  //   }
  //   return false;
  // };

  // const isFOManagerCompleted = (booking: Booking): boolean => {
  //   const stage = booking.checkOutPersonStage as any;
  //   for (const key in stage) {
  //     if (stage[key]?.planned?.trim() !== "" && stage[key]?.actual?.trim() === "") return false;
  //   }
  //   return true;
  // };


  const pendingWorkBookings = useMemo(() => {
    return activeBookings.filter((booking) => {
      const state = getBookingStateForUser(booking);
      if (state !== "not_applicable") return state === "pending";

      // Admin default (original logic)

      // const isSalesPend = ["pending", ""].includes((booking.editActionStatus || "").toLowerCase());
      // const isAccountsPend = ["pending", ""].includes((booking.accountsVerifyStatus || "").toLowerCase());
      // const isFOPend = ["pending", ""].includes((booking.frontOfficeStatus || "").toLowerCase());
      // const isFOManagerPend = getFOManagerStageState(booking) === "pending" || getFOManagerStageState(booking) == "not_activated";
      // return isSalesPend || isAccountsPend || isFOPend || isFOManagerPend;

      const isSalesPend = getSalesStageState(booking) === "pending" || getSalesStageState(booking) === "not_activated";
      const isAccountsPend = getAccountsStageState(booking) === "pending" || getAccountsStageState(booking) === "not_activated";
      const isFOPend = getOperationStageState(booking) === "pending" || getOperationStageState(booking) === "not_activated";
      const isFOManagerPend = getFOManagerStageState(booking) === "pending" || getFOManagerStageState(booking) == "not_activated";
      return isSalesPend || isAccountsPend || isFOPend || isFOManagerPend;
    });
  }, [activeBookings, userWorkType]);

  // ===== ROLE-BASED TAB FILTER FOR PENDING WORK TABLE =====
  const pendingWorkTableBookings = useMemo(() => {
    const base = pendingWorkBookings;

    // NewBookings tab — sales stage pending AND doer = logged-in user
    const isSalesPendingForUser = (booking: any) => {
      const salesStage = booking.salesPersonStage as any;
      if (!salesStage) return false;
      for (const key in salesStage) {
        const s = salesStage[key];
        if (!s?.planned || s.planned.trim() === "") continue; // not activated
        if (!s?.actual || s.actual.trim() === "") {
          // This is the pending sales stage — check if current user is the doer
          return namesMatch(s?.doer, user?.name);
        }
      }
      return false;
    };

    const isStagePending = (booking: any, stageField: string, stageNum: number) => {
      const s = booking[stageField]?.[stageNum.toString()];
      const activated = s?.planned && s.planned.trim() !== "";
      return activated && (!s?.actual || s.actual.trim() === "");
    };

    const isBothFORoles = hasRole("operation_manager") && hasRole("fo_manager");

    // ---- ACCOUNTS MANAGER ----
    if (hasRole("account_manager")) {
      if (hasRole("sales_agent") && pendingWorkTableView === "NewBookings")
        return base.filter(b => isSalesPendingForUser(b));
      if (pendingWorkTableView === "AccountsVerify")
        return base.filter(b => isStagePending(b, "accountsPersonStage", 1));
      if (pendingWorkTableView === "FinalTransFer")
        return base.filter(b => isStagePending(b, "accountsPersonStage", 2));
      if (pendingWorkTableView === "DeleteComplete")
        return base.filter(b => isStagePending(b, "accountsPersonStage", 3));
      return base;
    }

    // ---- BOTH FO + CHECKOUT (combined tab bar) ----
    if (isBothFORoles) {
      if (hasRole("sales_agent") && combinedFOTabView === "NewBookings")
        return base.filter(b => isSalesPendingForUser(b));
      if (combinedFOTabView === "AccountsVerify")
        return base.filter(b => isStagePending(b, "foPersonStage", 1));
      if (combinedFOTabView === "FinalTransFer")
        return base.filter(b => isStagePending(b, "foPersonStage", 2));
      if (combinedFOTabView === "CheckoutVerify") {
        return base.filter(b => isStagePending(b, "checkOutPersonStage", 1));
      }
      return base;
    }

    // ---- FO ONLY (operation_manager) ----
    if (hasRole("operation_manager")) {
      if (hasRole("sales_agent") && foPendingWorkTableView === "NewBookings")
        return base.filter(b => isSalesPendingForUser(b));
      if (foPendingWorkTableView === "AccountsVerify")
        return base.filter(b => isStagePending(b, "foPersonStage", 1));
      if (foPendingWorkTableView === "FinalTransFer")
        return base.filter(b => isStagePending(b, "foPersonStage", 2));
      return base;
    }

    // ---- CHECKOUT ONLY (fo_manager) — no sub-tabs, single stage ----
    return base;
  }, [pendingWorkBookings, pendingWorkTableView, foPendingWorkTableView, combinedFOTabView, checkoutPendingWorkTableView, user?.name]);

  const completedWorkBookings = useMemo(() => {
    return activeBookings.filter((booking) => {
      const state = getBookingStateForUser(booking);

      if (state !== "not_applicable") return state === "completed";

      // Admin default (original logic — all departments must be completed)

      return getSalesStageState(booking) === "completed" &&
        getAccountsStageState(booking) === "completed" &&
        getOperationStageState(booking) === "completed" &&
        getFOManagerStageState(booking) === "completed";
    });
  }, [activeBookings, userWorkType]);


  const cancelledBookings = filteredBookings.filter((booking) => {
    if (booking.isAutoReleased === "Auto Released") return false;
    const state = getBookingStateForUser(booking);
    if (state !== "not_applicable") return state === "stage_cancelled";
    return getSalesStageState(booking) === "stage_cancelled" ||
      getAccountsStageState(booking) === "stage_cancelled" ||
      getOperationStageState(booking) === "stage_cancelled" ||
      getFOManagerStageState(booking) === "stage_cancelled";


    // const state = getBookingStateForUser(booking);
    // if (state !== "not_applicable") return state === "stage_cancelled";

    // Admin default — any stage in any department has a cancellation
    // return booking?.cancelByUserCheck === "Cancelled";

  });


  // const cancelledBookings = filteredBookings.filter((booking) => booking?.cancelByUserCheck === "Cancelled")
  // const cancelledBookings = filteredBookings.filter((booking) => {
  //   if (hasRole("sales_agent")) {
  //     // const salesStage1 = booking.salesTeamStatus;
  //     // return salesStage1.toLowerCase().indexOf("cancelled") !== -1;
  //     var stage = booking.salesPersonStage as any;
  //     for (var key in stage) {
  //       if (stage[key]?.actual?.trim() !== "" && stage[key]?.status?.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //         return true;
  //       }
  //     }
  //     return false;
  //   }

  //   // Account Manager: Check accountsPersonStage for planned date

  //   if (hasRole("account_manager")) {
  //     // const accountsStage1 = booking.accountsVerifyStatus;
  //     // return accountsStage1.toLowerCase().indexOf("cancelled") !== -1;
  //     // var stage = booking?.accountsPersonStage["1"] as any;
  //     // return stage?.status?.toLowerCase().indexOf("cancelled") != -1 && booking?.isAutoReleased !== "Auto Released" && stage?.actual?.trim() !== "";
  //     var stage = booking.accountsPersonStage as any;
  //     const stageKeys = Object.keys(stage || {})
  //       .map(Number)
  //       .filter(n => !isNaN(n))
  //       .sort((a, b) => a - b);
  //     for (let i = 0; i < stageKeys.length; i++) {
  //       const currentKey = stageKeys[i].toString();
  //       const nextKey = stageKeys[i + 1]?.toString();

  //       const currentStage = stage[currentKey];
  //       const nextStage = nextKey ? stage[nextKey] : null;

  //       if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //         break;
  //       }
  //       if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //         if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
  //           return true;
  //         }
  //         continue;
  //       } else {
  //         return false;
  //       }

  //     }
  //     return false;
  //   }

  //   // Operation Manager: Check foPersonStage for planned date
  //   if (hasRole("operation_manager")) {
  //     // const foStage1 = booking.frontOfficeStatus;
  //     // return foStage1.toLowerCase().indexOf("cancelled") !== -1;
  //     // var stage = booking?.foPersonStage["1"] as any;
  //     // return stage?.status?.toLowerCase().indexOf("cancelled") != -1 && booking?.isAutoReleased !== "Auto Released" && stage?.actual?.trim() !== "";
  //     var stage = booking.foPersonStage as any;
  //     for (var key in stage) {
  //       if (stage[key]?.actual?.trim() !== "" && stage[key]?.status?.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //         return true;
  //       }
  //     }
  //     return false;
  //   }

  //   // Admin/Default: Show all cancelled bookings
  //   // const hasSalesPlanned = booking.salesTeamStatus.toLowerCase().indexOf("cancelled") !== -1;
  //   // const hasAccountsPlanned = booking.accountsVerifyStatus.toLowerCase().indexOf("cancelled") !== -1;
  //   // const hasFOPlanned = booking.frontOfficeStatus.toLowerCase().indexOf("cancelled") !== -1;
  //   return booking?.cancelByUserCheck === "Cancelled";
  //   // Return true if any stage has a planned date
  //   // return hasSalesPlanned || hasAccountsPlanned || hasFOPlanned;
  // })

  //   const cancelledBookings = filteredBookings.filter((booking) => {
  //   if (hasRole("sales_agent")) {
  //     var stage = booking.salesPersonStage as any;
  //     for (var key in stage) {
  //       if (stage[key]?.actual?.trim() !== "" && stage[key]?.status?.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //         return true;
  //       }
  //     }
  //     return false;
  //   }

  //   if (hasRole("account_manager")) {
  //     var stage = booking.accountsPersonStage as any;
  //     const stageKeys = Object.keys(stage || {})
  //       .map(Number)
  //       .filter(n => !isNaN(n))
  //       .sort((a, b) => a - b);

  //     for (let i = 0; i < stageKeys.length; i++) {
  //       const currentKey = stageKeys[i].toString();
  //       const nextKey = stageKeys[i + 1]?.toString();

  //       const currentStage = stage[currentKey];
  //       const nextStage = nextKey ? stage[nextKey] : null;

  //       if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //         break;
  //       }

  //       if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //         if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
  //           return true;
  //         }
  //         continue;
  //       } else {
  //         return false;
  //       }
  //     }
  //     return false;
  //   }

  //   if (hasRole("operation_manager")) {
  //     var stage = booking.foPersonStage as any;
  //     for (var key in stage) {
  //       if (stage[key]?.actual?.trim() !== "" && stage[key]?.status?.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //         return true;
  //       }
  //     }
  //     return false;
  //   }

  //   if (hasRole("fo_manager")) {
  //     var stage = booking.checkOutPersonStage as any;
  //     for (var key in stage) {
  //       if (stage[key]?.actual?.trim() !== "" && stage[key]?.status?.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //         return true;
  //       }
  //     }
  //     return false;
  //   }

  //   // Default: Check ALL departments for cancellations
  //   // 1. Check if booking is marked as cancelled by user
  //   // if (booking?.cancelByUserCheck === "Cancelled") {
  //   //   return true;
  //   // }

  //   // 2. Check Sales stages for cancellation
  //   const salesStage = booking.salesPersonStage as any;
  //   for (var key in salesStage) {
  //     if (salesStage[key]?.actual?.trim() !== "" && salesStage[key]?.status?.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //       return true;
  //     }
  //   }

  //   // 3. Check Accounts stages for cancellation (sequential logic)
  //   const accountsStage = booking.accountsPersonStage as any;
  //   const stageKeys = Object.keys(accountsStage || {})
  //     .map(Number)
  //     .filter(n => !isNaN(n))
  //     .sort((a, b) => a - b);

  //   for (let i = 0; i < stageKeys.length; i++) {
  //     const currentKey = stageKeys[i].toString();
  //     const nextKey = stageKeys[i + 1]?.toString();

  //     const currentStage = accountsStage[currentKey];
  //     const nextStage = nextKey ? accountsStage[nextKey] : null;

  //     if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //       break;
  //     }

  //     if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //       if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
  //         return true;
  //       }
  //       continue;
  //     }
  //   }

  //   // 4. Check Front Office stages for cancellation
  //   const foStage = booking.foPersonStage as any;
  //   for (var key in foStage) {
  //     if (foStage[key]?.actual?.trim() !== "" && foStage[key]?.status?.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //       return true;
  //     }
  //   }

  //   // 5. Check Checkout stages for cancellation
  //   const checkOutStage = booking.checkOutPersonStage as any;
  //   for (var key in checkOutStage) {
  //     if (checkOutStage[key]?.actual?.trim() !== "" && checkOutStage[key]?.status?.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //       return true;
  //     }
  //   }

  //   return false;
  // });


  // const cancelledBookings = filteredBookings.filter((booking) => {
  //   if (booking?.cancelByUserCheck === "Cancelled" && booking?.isAutoReleased !== "Auto Released") {
  //     return true;
  //   } else {
  //     return false;
  //   }
  //   if (hasRole("sales_agent")) {
  //     var stage = booking.salesPersonStage as any;
  //     for (var key in stage) {
  //       if (stage[key]?.actual?.trim() !== "" && stage[key]?.status?.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //         return true;
  //       }
  //     }
  //     return false;
  //   }

  //   if (hasRole("account_manager")) {
  //     var stage = booking.accountsPersonStage as any;
  //     const stageKeys = Object.keys(stage || {})
  //       .map(Number)
  //       .filter(n => !isNaN(n))
  //       .sort((a, b) => a - b);

  //     for (let i = 0; i < stageKeys.length; i++) {
  //       const currentKey = stageKeys[i].toString();
  //       const nextKey = stageKeys[i + 1]?.toString();

  //       const currentStage = stage[currentKey];
  //       const nextStage = nextKey ? stage[nextKey] : null;

  //       if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //         break;
  //       }

  //       if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //         if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
  //           return true;
  //         }
  //         continue;
  //       } else {
  //         return false;
  //       }
  //     }
  //     return false;
  //   }

  //   if (hasRole("operation_manager")) {
  //     var stage = booking.foPersonStage as any;
  //     const stageKeys = Object.keys(stage || {})
  //       .map(Number)
  //       .filter(n => !isNaN(n))
  //       .sort((a, b) => a - b);

  //     for (let i = 0; i < stageKeys.length; i++) {
  //       const currentKey = stageKeys[i].toString();
  //       const nextKey = stageKeys[i + 1]?.toString();

  //       const currentStage = stage[currentKey];
  //       const nextStage = nextKey ? stage[nextKey] : null;

  //       if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //         break;
  //       }

  //       if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //         if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
  //           return true;
  //         }
  //         continue;
  //       } else {
  //         return false;
  //       }
  //     }
  //     return false;
  //   }

  //   if (hasRole("fo_manager")) {
  //     var stage = booking.checkOutPersonStage as any;
  //     for (var key in stage) {
  //       if (stage[key]?.actual?.trim() !== "" && stage[key]?.status?.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //         return true;
  //       }
  //     }
  //     return false;
  //   }

  //   // Default: Check ALL departments for cancellations
  //   // 1. Check Sales stages for cancellation
  //   const salesStage = booking.salesPersonStage as any;
  //   for (var key in salesStage) {
  //     if (salesStage[key]?.actual?.trim() !== "" && salesStage[key]?.status?.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //       return true;
  //     }
  //   }

  //   // 2. Check Accounts stages for cancellation (sequential logic)
  //   const accountsStage = booking.accountsPersonStage as any;
  //   const accountStageKeys = Object.keys(accountsStage || {})
  //     .map(Number)
  //     .filter(n => !isNaN(n))
  //     .sort((a, b) => a - b);

  //   for (let i = 0; i < accountStageKeys.length; i++) {
  //     const currentKey = accountStageKeys[i].toString();
  //     const nextKey = accountStageKeys[i + 1]?.toString();

  //     const currentStage = accountsStage[currentKey];
  //     const nextStage = nextKey ? accountsStage[nextKey] : null;

  //     if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //       break;
  //     }

  //     if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //       if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
  //         return true;
  //       }
  //       continue;
  //     }
  //   }

  //   // 3. Check Front Office stages for cancellation (sequential logic)
  //   const foStage = booking.foPersonStage as any;
  //   const foStageKeys = Object.keys(foStage || {})
  //     .map(Number)
  //     .filter(n => !isNaN(n))
  //     .sort((a, b) => a - b);

  //   for (let i = 0; i < foStageKeys.length; i++) {
  //     const currentKey = foStageKeys[i].toString();
  //     const nextKey = foStageKeys[i + 1]?.toString();

  //     const currentStage = foStage[currentKey];
  //     const nextStage = nextKey ? foStage[nextKey] : null;

  //     if (!currentStage?.planned || currentStage.planned.trim() === "") {
  //       break;
  //     }

  //     if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //       if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
  //         return true;
  //       }
  //       continue;
  //     }
  //   }

  //   // 4. Check Checkout stages for cancellation
  //   const checkOutStage = booking.checkOutPersonStage as any;
  //   for (var key in checkOutStage) {
  //     if (checkOutStage[key]?.actual?.trim() !== "" && checkOutStage[key]?.status?.toLowerCase().indexOf("cancelled") !== -1 && booking?.isAutoReleased !== "Auto Released") {
  //       return true;
  //     }
  //   }

  //   return false;
  // });
  const autoReleaseBookings = filteredBookings.filter((booking) => booking.isAutoReleased === "Auto Released")
  // 🎁 Voucher / Complimentary Bookings
  // const voucherComplimentaryBookings = filteredBookings.filter(
  //   (booking) => {
  //     if (hasRole("sales_agent")) {
  //       return booking.editActionStatus &&
  //         ["voucher", "complimentary"].includes(
  //           booking.editActionStatus.toLowerCase()
  //         )
  //     }
  //     if (hasRole("account_manager")) {
  //       return booking.accountsVerifyStatus &&
  //         ["voucher", "complimentary"].includes(
  //           booking.accountsVerifyStatus.toLowerCase()
  //         )
  //     }
  //     if (hasRole("operation_manager")) {
  //       return booking.paymentSettlementStatus &&
  //         ["voucher", "complimentary"].includes(
  //           booking.paymentSettlementStatus.toLowerCase()
  //         )
  //     }
  //     return (
  //       (booking.editActionStatus &&
  //         ["voucher", "complimentary"].includes(
  //           booking.editActionStatus.toLowerCase()
  //         )) ||
  //       (booking.accountsVerifyStatus &&
  //         ["voucher", "complimentary"].includes(
  //           booking.accountsVerifyStatus.toLowerCase()
  //         )) ||
  //       (booking.paymentSettlementStatus &&
  //         ["voucher", "complimentary"].includes(
  //           booking.paymentSettlementStatus.toLowerCase()
  //         ))
  //     );
  //   });
  const voucherComplimentaryBookings = filteredBookings.filter((booking) => {
    if (booking?.isAutoReleased === "Auto Released" || booking?.cancelByUserCheck === "Cancelled") {
      return false;
    }
    if (hasRole("sales_agent")) {
      // Check salesPersonStage for voucher/complimentary with actual date
      var stage = booking.salesPersonStage as any;
      for (var key in stage) {
        if (stage[key]?.actual?.trim() !== "" && stage[key]?.status && ["voucher", "complimentary"].includes(stage[key].status.toLowerCase())) {
          return true;
        }
      }
      return false;
    }

    if (hasRole("account_manager")) {
      // Check accountsPersonStage for voucher/complimentary (sequential logic)
      var stage = booking.accountsPersonStage as any;
      const stageKeys = Object.keys(stage || {})
        .map(Number)
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

      for (let i = 0; i < stageKeys.length; i++) {
        const currentKey = stageKeys[i].toString();
        const nextKey = stageKeys[i + 1]?.toString();

        const currentStage = stage[currentKey];
        const nextStage = nextKey ? stage[nextKey] : null;

        if (!currentStage?.planned || currentStage.planned.trim() === "") {
          break;
        }

        if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status && ["voucher", "complimentary"].includes(currentStage.status.toLowerCase())) {
          if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
            return true;
          }
        }
      }
      return false;
    }

    if (hasRole("operation_manager")) {
      // Check foPersonStage for voucher/complimentary with actual date
      var stage = booking.foPersonStage as any;
      for (var key in stage) {
        if (stage[key]?.actual?.trim() !== "" && stage[key]?.status && ["voucher", "complimentary"].includes(stage[key].status.toLowerCase())) {
          return true;
        }
      }
      return false;
    }

    if (hasRole("fo_manager")) {
      // Check checkOutPersonStage for voucher/complimentary with actual date
      var stage = booking.checkOutPersonStage as any;
      for (var key in stage) {
        if (stage[key]?.actual?.trim() !== "" && stage[key]?.status && ["voucher", "complimentary"].includes(stage[key].status.toLowerCase())) {
          return true;
        }
      }
      return false;
    }

    // Default: Check if ANY stage from ANY department has voucher/complimentary status
    // 1. Check Sales stages
    const salesStage = booking.salesPersonStage as any;
    if (salesStage) {
      for (var key in salesStage) {
        if (salesStage[key]?.actual?.trim() !== "" && salesStage[key]?.status &&
          ["voucher", "complimentary"].includes(salesStage[key].status.toLowerCase())) {
          return true;
        }
      }
    }

    // 2. Check Accounts stages (sequential logic)
    const accountsStage = booking.accountsPersonStage as any;
    if (accountsStage) {
      const stageKeys = Object.keys(accountsStage)
        .map(Number)
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

      for (let i = 0; i < stageKeys.length; i++) {
        const currentKey = stageKeys[i].toString();
        const nextKey = stageKeys[i + 1]?.toString();

        const currentStage = accountsStage[currentKey];
        const nextStage = nextKey ? accountsStage[nextKey] : null;

        if (!currentStage?.planned || currentStage.planned.trim() === "") {
          break;
        }

        if (currentStage?.actual && currentStage.actual.trim() !== "" && currentStage?.status &&
          ["voucher", "complimentary"].includes(currentStage.status.toLowerCase())) {
          if (!nextStage || !nextStage.planned || nextStage.planned.trim() === "") {
            return true;
          }
        }
      }
    }

    // 3. Check Front Office stages
    const foStage = booking.foPersonStage as any;
    if (foStage) {
      for (var key in foStage) {
        if (foStage[key]?.actual?.trim() !== "" && foStage[key]?.status &&
          ["voucher", "complimentary"].includes(foStage[key].status.toLowerCase())) {
          return true;
        }
      }
    }

    // 4. Check Checkout stages
    const checkOutStage = booking.checkOutPersonStage as any;
    if (checkOutStage) {
      for (var key in checkOutStage) {
        if (checkOutStage[key]?.actual?.trim() !== "" && checkOutStage[key]?.status &&
          ["voucher", "complimentary"].includes(checkOutStage[key].status.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  });

  // 🎁 Voucher / Complimentary Pagination
  const voucherTotalPages = Math.max(
    1,
    Math.ceil(voucherComplimentaryBookings.length / voucherItemsPerPage)
  )

  const voucherStartIndex =
    (voucherCurrentPage - 1) * voucherItemsPerPage

  const displayedVoucherBookings =
    voucherComplimentaryBookings.slice(
      voucherStartIndex,
      voucherStartIndex + voucherItemsPerPage
    )


  // Under Auto Release Bookings
  // const underAutoReleaseBookings = filteredBookings.filter((booking) => {
  //   const status = (booking.status ?? "").toLowerCase();
  //   const receivedPercent = booking.receivedPercentage ?? 0;

  //   // Example logic:
  //   // Auto release threshold (customize if needed)
  //   const isUpcomingAutoRelease =
  //     status !== "auto_release" &&             // not already auto released
  //     receivedPercent < 50 &&                  // payment less than 50%
  //     new Date(booking.checkIn) > new Date();  // future check-in

  //   return isUpcomingAutoRelease;
  // });

  const underAutoReleaseBookings = filteredBookings.filter((booking) => {
    return (
      (booking?.isAutoReleased || "")
        .toLowerCase()
        .includes("under auto")
    );
  })

  // Under Auto Release Pagination (computed after underAutoReleaseBookings is defined)
  const underAutoTotalPages = Math.max(
    1,
    Math.ceil(underAutoReleaseBookings.length / underAutoItemsPerPage)
  );

  const underAutoStartIndex = (underAutoCurrentPage - 1) * underAutoItemsPerPage;

  const displayedUnderAutoBookings = underAutoReleaseBookings.slice(
    underAutoStartIndex,
    underAutoStartIndex + underAutoItemsPerPage
  );
  // 🔥 ACTIVE BOOKINGS PAGINATION (Based on selected tab)

  const currentActiveBookingsData = pendingWorkTableBookings;
  const totalPages = Math.max(1, Math.ceil(pendingWorkTableBookings.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const displayedBookings = pendingWorkTableBookings.slice(startIndex, startIndex + itemsPerPage)

  // 🔥 COMPLETED BOOKINGS PAGINATION
  const completedTotalPages = Math.max(1, Math.ceil(completedWorkBookings.length / completedItemsPerPage))
  const completedStartIndex = (completedCurrentPage - 1) * completedItemsPerPage
  const displayedCompletedBookings = completedWorkBookings.slice(completedStartIndex, completedStartIndex + completedItemsPerPage)

  // Pagination for cancelled bookings
  const cancelledTotalPages = Math.max(1, Math.ceil(cancelledBookings.length / cancelledItemsPerPage))
  const cancelledStartIndex = (cancelledCurrentPage - 1) * cancelledItemsPerPage
  const displayedCancelledBookings = cancelledBookings.slice(cancelledStartIndex, cancelledStartIndex + cancelledItemsPerPage)

  // Pagination for auto released bookings
  const autoReleaseTotalPages = Math.max(1, Math.ceil(autoReleaseBookings.length / autoReleaseItemsPerPage))
  const autoReleaseStartIndex = (autoReleaseCurrentPage - 1) * autoReleaseItemsPerPage
  const displayedAutoReleaseBookings = autoReleaseBookings.slice(autoReleaseStartIndex, autoReleaseStartIndex + autoReleaseItemsPerPage)

  const BOOKING_STICKY_COLUMN_WIDTHS = {
    bookingDate: 100,
    bookingId: 120,
    guestName: 120,
  } as const

  const bookingStickyTableStyle: React.CSSProperties = {
    borderCollapse: "collapse",
    width: "max-content",
    minWidth: "100%",
  }

  const getStickyHeaderCellStyle = (
    isScrolled: boolean,
    colType: "bookingDate" | "bookingId" | "guestName",
    isLastSticky = false,
    zIndex = 30
  ): React.CSSProperties => {
    const widths = isScrolled
      ? { bookingDate: 100, bookingId: 120, guestName: 120 }
      : { bookingDate: 140, bookingId: 180, guestName: 300 };

    const lefts = isScrolled
      ? { bookingDate: 0, bookingId: 100, guestName: 220 }
      : { bookingDate: 0, bookingId: 140, guestName: 320 };

    const width = widths[colType];
    const left = lefts[colType];

    return {
      position: "sticky",
      left,
      top: 0,
      zIndex,
      minWidth: width,
      width,
      boxSizing: "border-box",
      overflow: "hidden",
      background: "#1F3A5F",
      backgroundClip: "padding-box",
      isolation: "isolate",
      borderRight: isLastSticky ? "2px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.15)",
      paddingLeft: isScrolled ? "6px" : "12px",
      paddingRight: isScrolled ? "6px" : "12px",
      transition: "width 200ms ease-in-out, left 200ms ease-in-out, padding 200ms ease-in-out",
    };
  }

  const getStickyBodyCellStyle = (
    isScrolled: boolean,
    colType: "bookingDate" | "bookingId" | "guestName",
    background: string,
    isLastSticky = false,
    zIndex = 20
  ): React.CSSProperties => {
    const widths = isScrolled
      ? { bookingDate: 100, bookingId: 120, guestName: 120 }
      : { bookingDate: 140, bookingId: 180, guestName: 300 };

    const lefts = isScrolled
      ? { bookingDate: 0, bookingId: 100, guestName: 220 }
      : { bookingDate: 0, bookingId: 140, guestName: 320 };

    const width = widths[colType];
    const left = lefts[colType];

    return {
      position: "sticky",
      left,
      zIndex,
      minWidth: width,
      width,
      boxSizing: "border-box",
      overflow: "hidden",
      background,
      backgroundClip: "padding-box",
      borderRight: isLastSticky ? "2px solid #e2e8f0" : "1px solid #e5e7eb",
      paddingLeft: isScrolled ? "6px" : "12px",
      paddingRight: isScrolled ? "6px" : "12px",
      transition: "width 200ms ease-in-out, left 200ms ease-in-out, padding 200ms ease-in-out, background-color 200ms ease-in-out",
    };
  }

  const formatGuestName = (name: string, isScrolled: boolean) => {
    if (!name) return "—";
    const words = name.trim().split(/\s+/);
    return (
      <div className="relative w-full overflow-hidden min-h-[48px] flex flex-col justify-center">
        {/* Single-line version */}
        <div
          className={`truncate text-left whitespace-nowrap w-full transition-all duration-200 absolute top-1/2 left-0 -translate-y-1/2 ${isScrolled ? "opacity-0 invisible pointer-events-none scale-95" : "opacity-100 visible scale-100"
            }`}
        >
          {name}
        </div>
        {/* Stacked multi-line version */}
        <div
          className={`flex flex-col items-center justify-center text-center leading-tight py-1 w-full transition-all duration-200 ${isScrolled ? "opacity-100 visible scale-100" : "opacity-0 invisible pointer-events-none scale-95 absolute"
            }`}
        >
          {words.map((word, idx) => (
            <span key={idx} className="block uppercase text-[10px] sm:text-[11px] font-semibold tracking-normal truncate max-w-full">
              {word}
            </span>
          ))}
        </div>
      </div>
    );
  }


  // -----------------------------------------------
  // 🔥 UPDATED SOURCE BREAKDOWN — NO DELETION, JUST FIXED
  // -----------------------------------------------
  const onlineBookingEngine = filteredBookings.filter(
    (b) => normalizeSource(
      b.dataSource || b.bSource || b.source || ""
    ) === "Online Booking Engine"
  ).length;

  const otaBookings = filteredBookings.filter(
    (b) => normalizeSource(
      b.dataSource || b.bSource || b.source || ""
    ) == "OTA"
  ).length;

  const travelAgents = filteredBookings.filter(
    (b) => normalizeSource(
      b.dataSource || b.bSource || b.source || ""
    ) === "Travel Agent"
  ).length;

  const othersCount = filteredBookings.filter(
    (b) => normalizeSource(
      b.dataSource || b.bSource || b.source || ""
    ) === "Others"
  ).length;
  const directBookings = filteredBookings.filter(
    b => normalizeSource(
      b.dataSource || b.bSource || b.source || ""
    ) === "Direct Booking"
  ).length;

  const referralBookingsCount = filteredBookings.filter(
    b => normalizeSource(
      b.dataSource || b.bSource || b.source || ""
    ) === "Referral"
  ).length;





  // const voucherGift = bookings.filter(
  //   b => b.source === "Voucher / Complimentary / Gift"
  // ).length;

  // const voucherGiftAmount = bookings
  //   .filter(b => b.source === "Voucher / Complimentary / Gift")
  //   .reduce((sum, b) => sum + Number(b.amount), 0);

  // Hold bookings detection (sales team status variations)
  const holdBookings = filteredBookings.filter((b) => {
    const s = (b.salesTeamStatus ?? "").toString().toLowerCase()
    return s === "on_hold" || s === "hold" || s.includes("hold")
  }).length

  const getStatusBadge = (status: string) => {
    const variants = {
      confirmed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
      payment_pending: "bg-orange-100 text-orange-800",
      "Confirm-Verified": "bg-green-100 text-green-800",
      Unverified: "bg-red-100 text-red-800",
    }
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"
  }

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-red-100 text-red-800",
      partial: "bg-yellow-100 text-yellow-800",
    }
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"
  }



  // Auto-scroll to Active PMS Bookings when filters/search produce results
  useEffect(() => {
    const hasActiveFilter =
      (debouncedSearchTerm && debouncedSearchTerm.trim() !== "") ||
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
    }, 250)

    return () => clearTimeout(t)
  }, [debouncedSearchTerm, statusFilter, teamFilter, checkInFilter, checkOutFilter, assignedFilter, sourceFilter, filteredBookings.length])

  const handleAction = (action: string, bookingId: string, booking) => {

    // Close all modals first to prevent conflicts
    setShowCancelModal(false)
    setShowPaymentModal(false)
    setShowApprovalModal(false)
    setShowAccountsVerifyModal(false)
    setFOPMSVerifyModal(false)
    setShowCheckoutVerifyModal(false)
    setShowViewModal(false)
    setShowArrivalTicketModal(false)
    setShowDepartureTicketModal(false)

    // Use setTimeout to ensure clean state transitions
    setTimeout(() => {
      switch (action) {
        case "edit": {
          const id = booking?.bookingType === "Individual" ? booking.editID : booking?.guestId
          const formType = booking?.bookingType === "Individual" ? "individual" : "group"
          if (id) {
            router.push(`/fms/bookings/ktahv?id=${encodeURIComponent(id)}&formType=${encodeURIComponent(formType)}`)
          } else {
            alert("Unable to open edit form: missing booking id.")
          }
          break
        }
        case "view":
          const booking = bookings.find((b) => b.id === bookingId)
          if (booking) {
            setViewBookingData(booking)
            setShowViewModal(true)
          }
          break
        case "cancel":
          const currentBooking = bookings.find((b) => b.id === bookingId)

          // setSelectedBookingId(bookingId)
          setSelectedBookingForCancelledBookings(currentBooking)
          setSelectedBookingId(bookingId)
          setIsCancelled(false)
          setShowCancelModal(true)
          break
        case "payment_upload":
          const paymentBooking = bookings.find((b) => b.id === bookingId)
          if (paymentBooking) {
            setSelectedBookingForPayment(paymentBooking)
            setPaymentData({
              amount: (paymentBooking.originalAmount || paymentBooking.amount || 0).toString(),
              receivedAmount: "",
              currency: "INR",
              paymentMode: "",
              receivedDate: "",
              receiptNumber: "",
              screenshot: null,
              paymentLocation: "",
              paymentCollectedBy: user?.name || "",
            })

            setShowPaymentModal(true)
          }
          break
        case "approval_upload":
          const bookingForApproval = bookings.find((b) => b.id === bookingId)
          if (bookingForApproval) {
            setSelectedBookingForApproval(bookingForApproval)
            setShowApprovalModal(true)
          }
          break
        case "verify_accounts":
          const accountsBooking = bookings.find((b) => b.id === bookingId)
          let collectionHistoryArr = accountsBooking?.paymentCollectionHistory || [];

          // If it's a string, parse it as JSON
          if (typeof collectionHistoryArr === "string") {
            try {
              collectionHistoryArr = JSON.parse(collectionHistoryArr);
            } catch (e) {
              console.error("Failed to parse paymentCollectionHistory:", e);
              collectionHistoryArr = [];
            }
          }

          // Ensure it's an array
          if (!Array.isArray(collectionHistoryArr)) {
            collectionHistoryArr = [];
          }
          const lastCollection = collectionHistoryArr?.length
            ? (() => {
              const latest = collectionHistoryArr.at(-1);
              const bookingCurrency = accountsBooking?.currency || "INR";
              const totalReceived = collectionHistoryArr.reduce((sum: number, row: any) => {
                const value = Number(getCollectionEntryValue(row, "receivedAmount")) || 0;
                const recordCurrency = getCollectionEntryValue(row, "currency") || bookingCurrency;
                const convertedValue = convertCurrency(value, recordCurrency, bookingCurrency);
                return sum + convertedValue;
              }, 0);
              return {
                ...(Array.isArray(latest)
                  ? {
                    timestamp: latest[0] || "",
                    bookingId: latest[1] || "",
                    receivedDate: latest[2] || "",
                    currency: latest[3] || "",
                    receivedAmount: latest[4] || "",
                    receiptNumber: latest[5] || "",
                    paymentCollectedBy: latest[6] || "",
                    screenshot: latest[7] || "",
                    paymentLocation: latest[8] || "",
                    paymentMode: latest[9] || "",
                    pendingAmount: latest[10] || "",
                    invoiceAmount: latest[11] || "",
                    updateStatus: latest[12] || "",
                  }
                  : latest),
                receivedAmount: totalReceived,
              };
            })()
            : null;
          if (accountsBooking) {
            setSelectedBookingForAccounts(accountsBooking)
            setcollectionTillNowArr(lastCollection)
            // Initialize data from backend API
            const initializedData = initializeAccountsVerifyDataFromAPI(accountsBooking);

            setAccountsVerifyData(initializedData);

            setShowAccountsVerifyModal(true)
          }
          break
        case "verify_fo":
          const foPMSBooking = bookings.find((b) => b.id === bookingId)
          if (foPMSBooking) {
            setSelectedBookingForFOPMS(foPMSBooking)
            const initializedData = initializeAccountsVerifyDataFromAPI(foPMSBooking);
            setAccountsVerifyData(initializedData);

            // Initialize FO data from booking if available
            const foStages = foPMSBooking.foPersonStage || {};
            const isFOStageCompleted = (stageNum: number) => {
              const stageData = foStages[stageNum.toString()];
              return stageData?.actual && stageData.actual.trim() !== "";
            };

            // ✅ FIXED: Check if FO stage is activated
            const isFOStageActivated = (stageNum: number) => {
              const stageData = foStages[stageNum.toString()];
              return stageData?.planned && stageData.planned.trim() !== "";
            };

            // ✅ SKIP LOGIC: Determine initial FO stage based on activated stages only
            const activatedFOList = [1, 2].filter(n => isFOStageActivated(n));

            let initialFOStage = activatedFOList[0] || 1; // default to first activated, or 1

            if (activatedFOList.length > 0) {
              // Find first activated FO stage that is not completed
              const firstPendingFO = activatedFOList.find(n => !isFOStageCompleted(n));
              if (firstPendingFO) {
                initialFOStage = firstPendingFO;
              } else {
                // All activated FO stages completed — land on last
                initialFOStage = activatedFOList[activatedFOList.length - 1];
              }
            }

            setFoPMSVerifyData({
              currentStage: initialFOStage,
              stage1: {
                releasePassActionStatus: isFOStageCompleted(1) ? (foStages['1']?.status || "") : "",
                pmsBlockStatus: isFOStageCompleted(1) ? (foStages['1']?.pmsBlockStatus || "") : "",
                informedToBookingPerson: isFOStageCompleted(1) ? (foStages['1']?.informed || "") : "",
                remarks: isFOStageCompleted(1) ? (foStages['1']?.remarks || "") : "",
                isCompleted: isFOStageCompleted(1),
                submittedAt: isFOStageCompleted(1) ? (foStages['1']?.actual || "") : "",
                doer: isFOStageCompleted(1) ? (foStages['1']?.doer || "") : "",
              },
              stage2: {
                releasePassActionStatus: isFOStageCompleted(2) ? (foStages['2']?.status || "") : "",
                pmsBlockStatus: isFOStageCompleted(2) ? (foStages['2']?.pmsBlockStatus || "") : "",
                informedToBookingPerson: isFOStageCompleted(2) ? (foStages['2']?.informed || "") : "",
                remarks: isFOStageCompleted(2) ? (foStages['2']?.remarks || "") : "",
                isCompleted: isFOStageCompleted(2),
                submittedAt: isFOStageCompleted(2) ? (foStages['2']?.actual || "") : "",
                doer: isFOStageCompleted(2) ? (foStages['2']?.doer || "") : "",
              },
            });

            setFOPMSVerifyModal(true)
          }
          break
        case "verify_checkout":
          const checkoutBooking = bookings.find((b) => b.id === bookingId)
          if (checkoutBooking) {
            setSelectedBookingForCheckout(checkoutBooking)
            setCheckoutVerifyData({
              paymentReceivedStatus: checkoutBooking.checkOutPersonStage?.["1"]?.status || "",
              remarks: checkoutBooking.checkOutPersonStage?.["1"]?.remarks || "",
            })
            setShowCheckoutVerifyModal(true)
          }
          break
        case "arrival_flight":
          const arrivalBooking = bookings.find((b) => b.id === bookingId)
          if (arrivalBooking) {
            setSelectedBookingForArrival(arrivalBooking)
            setShowArrivalTicketModal(true)
          }
          break
        case "departure_flight":
          const departureBooking = bookings.find((b) => b.id === bookingId)
          if (departureBooking) {
            setSelectedBookingForDeparture(departureBooking)
            setShowDepartureTicketModal(true)
          }
          break
      }
    }, 50)
  }

  const handleCancelBooking = async () => {
    // 🔴 VALIDATION
    const isCancellationValid = cancelReason && cancelRemarks?.trim()?.length > 0;

    if (!isCancellationValid) {
      toast.error("Reason and Remarks are mandatory for cancellation");
      return;
    }

    setIsSubmitting(true);
    try {
      const submitUrl = "/api/ktahv-bookings/actions/cancellation";

      const response = await fetch(submitUrl, {
        method: "POST",
        body: JSON.stringify({
          bookingId: selectedBookingForCancelledBookings?.bookingId,
          reason: cancelReason,
          remarks: cancelRemarks,
        }),
      });
      const data = await validateResponse(response);

      toast.success("Booking cancelled successfully");
      setIsCancelled(true);
      const cancelledAt = new Date().toISOString();
      const cancelledBy = user?.email || user?.name || "Current User";

      // Update local state
      setBookings(prevBookings => prevBookings.map((b) =>
      ((b.id === selectedBookingId || b.bookingId === selectedBookingForCancelledBookings?.bookingId)
        ? {
          ...b,
          status: "cancelled" as const,
          cancelByUserCheck: "Cancelled",
          cancelledReason: cancelReason,
          cancelledRemarks: cancelRemarks,
          editActionStatus: "cancelled",
          salesPersonStage: {
            ...b.salesPersonStage,
            "1": b.salesPersonStage?.["1"] ? {
              ...b.salesPersonStage["1"],
              status: "Cancelled",
              actual: b.salesPersonStage["1"].actual || cancelledAt,
              remarks: `${cancelReason} - ${cancelRemarks}`,
              doer: cancelledBy,
            } : b.salesPersonStage?.["1"],
          },
          accountsPersonStage: {
            ...b.accountsPersonStage,
            "1": b.accountsPersonStage?.["1"] ? {
              ...b.accountsPersonStage["1"],
              status: "Cancelled",
              actual: b.accountsPersonStage["1"].actual || cancelledAt,
              remarks: `${cancelReason} - ${cancelRemarks}`,
              doer: cancelledBy,
            } : b.accountsPersonStage?.["1"],
          },
          foPersonStage: {
            ...b.foPersonStage,
            "1": b.foPersonStage?.["1"] ? {
              ...b.foPersonStage["1"],
              status: "Cancelled",
              actual: b.foPersonStage["1"].actual || cancelledAt,
              remarks: `${cancelReason} - ${cancelRemarks}`,
              doer: cancelledBy,
            } : b.foPersonStage?.["1"],
          },
          checkOutPersonStage: {
            ...b.checkOutPersonStage,
            "1": b.checkOutPersonStage?.["1"] ? {
              ...b.checkOutPersonStage["1"],
              status: "Cancelled",
              actual: b.checkOutPersonStage["1"].actual || cancelledAt,
              remarks: `${cancelReason} - ${cancelRemarks}`,
              doer: cancelledBy,
            } : b.checkOutPersonStage?.["1"],
          },
        }
        : b)
      ));

      await refetchBookings();

      // Close modal after a short delay to show success state if needed, or close immediately
      setTimeout(() => {
        setShowCancelModal(false);
        setSelectedBookingId("");
        setCancelReason("");
        setCancelRemarks("");
        setIsCancelled(false); // Reset for next use
        setIsSubmitting(false);
      }, 1500);

    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred during cancellation");
      setIsSubmitting(false);
    }
  }

  const compressImage = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    try {
      if (!file.type.startsWith("image/")) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(",")[1] || "")
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        return { base64, mimeType: file.type }
      }

      if (typeof window !== "undefined" && "createImageBitmap" in window) {
        const bitmap = await createImageBitmap(file)
        const maxWidth = 1200
        const maxHeight = 1200
        let width = bitmap.width
        let height = bitmap.height

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, width, height)
          bitmap.close()
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75)
          return { base64: dataUrl.split(",")[1] || "", mimeType: "image/jpeg" }
        }
        bitmap.close()
      }
    } catch (err) {
      console.warn("Fast compression fallback to FileReader:", err)
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(",")[1] || "")
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    return { base64, mimeType: file.type }
  }

  const handlePaymentSubmit = () =>
    submitWithGuard(
      isSubmitting,
      setIsSubmitting,
      async () => {
        // 🔴 VALIDATION (same rules, better UX)
        if (
          !paymentData.receivedAmount ||
          !paymentData.paymentMode ||
          !paymentData.receivedDate ||
          !paymentData.receiptNumber ||
          !paymentData.screenshot
        ) {
          throw new Error("Please fill all required fields")
        }

        const inputDate = new Date(paymentData.receivedDate);
        if (isNaN(inputDate.getTime())) {
          throw new Error("Invalid Received Date")
        }
        if (inputDate > new Date()) {
          throw new Error("Received Date cannot be in the future")
        }

        const amountToValidate = Number(paymentData.receivedAmount) || 0;
        if (amountToValidate <= 0) {
          throw new Error("Received amount must be greater than zero");
        }
        const totalPayable = Number(selectedBookingForPayment?.originalAmount || selectedBookingForPayment?.amount || 0)
        const alreadyReceived = getTotalReceivedRaw(selectedBookingForPayment)
        const outstanding = Math.max(0, totalPayable - alreadyReceived)
        if (totalPayable > 0 && amountToValidate > outstanding) {
          throw new Error(`Received amount cannot exceed outstanding balance of ${outstanding}`)
        }

        let screenshotData = {}

        // 🔴 FILE → BASE64 (OPTIMIZED WITH CANVAS COMPRESSION FOR FAST SUBMIT)
        if (paymentData.screenshot) {
          const maxSize = 5 * 1024 * 1024 // 5MB
          if (paymentData.screenshot.size > maxSize) {
            throw new Error("File size should not exceed 5MB")
          }

          const compressed = await compressImage(paymentData.screenshot)

          screenshotData = {
            base64: compressed.base64,
            mimeType: compressed.mimeType,
            fileName: paymentData.screenshot.name,
            fileSize: paymentData.screenshot.size,
          }
        }

        const submitUrl = "/api/ktahv-bookings/actions/payment"

        // 🔴 API CALL (PAYLOAD UNCHANGED)
        const response = await fetch(submitUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            paymentData: {
              bookingId: selectedBookingForPayment?.bookingId,
              amount: paymentData.amount,
              receivedAmount: paymentData.receivedAmount,
              currency: paymentData.currency,
              paymentMode: paymentData.paymentMode,
              receivedDate: paymentData.receivedDate,
              receiptNumber: paymentData.receiptNumber,
              screenshot: screenshotData,
              paymentLocation: paymentData.paymentLocation,
              paymentCollectedBy: paymentData.paymentCollectedBy,
              pendingPaymentAmount: paymentData.pendingPaymentAmount,
            },
          }),
        })
        console.log(JSON.stringify({
          paymentData: {
            bookingId: selectedBookingForPayment?.bookingId,
            amount: paymentData.amount,
            receivedAmount: paymentData.receivedAmount,
            currency: paymentData.currency,
            paymentMode: paymentData.paymentMode,
            receivedDate: paymentData.receivedDate,
            receiptNumber: paymentData.receiptNumber,
            screenshot: screenshotData,
            paymentLocation: paymentData.paymentLocation,
            paymentCollectedBy: paymentData.paymentCollectedBy,
            pendingPaymentAmount: paymentData.pendingPaymentAmount,
          },
        }))
        debugger
        const data = await validateResponse(response)
        await refetchBookings()
      },
      {
        successMessage: "Payment uploaded successfully",
        onSuccess: () => {
          // ✅ RESET ONLY ON SUCCESS
          setShowPaymentModal(false)
          setSelectedBookingForPayment(null)
          setPaymentData({
            amount: selectedBookingForPayment?.amount.toString() || "",
            receivedAmount: "",
            currency: "INR",
            paymentMode: "",
            receivedDate: "",
            receiptNumber: "",
            screenshot: null,
            paymentLocation: "",
            paymentCollectedBy: "",
          })
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to upload payment"
          )
        },
      }
    )


  const handleApprovalSubmit = async () =>
    submitWithGuard(
      isSubmitting,
      setIsSubmitting,
      async () => {
        if (
          !approvalData.approvedBy ||
          !approvalData.approveTillDate ||
          !approvalData.screenshot ||
          !approvalData.remarks ||
          !approvalData.remarks.trim()
        ) {
          throw new Error("Please fill all required fields")
        }

        const selectedDate = new Date(approvalData.approveTillDate)
        selectedDate.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (selectedDate < today) {
          throw new Error("Approve Till Date must not be in the past")
        }

        let screenshotData = {}

        // 🔴 Convert screenshot to base64 (OPTIMIZED WITH CANVAS COMPRESSION FOR FAST SUBMIT)
        if (approvalData.screenshot) {
          const maxSize = 5 * 1024 * 1024 // 5MB
          if (approvalData.screenshot.size > maxSize) {
            throw new Error("File size should not exceed 5MB")
          }

          const compressed = await compressImage(approvalData.screenshot)

          screenshotData = {
            base64: compressed.base64,
            mimeType: compressed.mimeType,
            fileName: approvalData.screenshot.name,
            fileSize: approvalData.screenshot.size,
          }
        }

        const submitUrl = "/api/ktahv-bookings/actions/approval"

        // 🔴 API CALL (PAYLOAD SAME)
        const response = await fetch(submitUrl, {
          method: "POST",
          body: JSON.stringify({
            bookingId: selectedBookingForApproval?.bookingId,
            clientName: selectedBookingForApproval?.guestName,
            approvedBy: approvalData.approvedBy,
            approveTillDate: approvalData.approveTillDate,
            screenshot: screenshotData,
            remarks: approvalData.remarks,
            uploadedBy: user?.name,
            uploadedByEmail: user?.email,

          }),
        })

        const data = await validateResponse(response)
        await refetchBookings()
      },
      {
        successMessage: "Approval uploaded successfully",
        onSuccess: () => {
          // ✅ reset ONLY on success
          setShowApprovalModal(false)
          setSelectedBookingForApproval(null)
          setApprovalData({
            approvedBy: "",
            approveTillDate: "",
            screenshot: null,
            remarks: "",
            uploadedBy: "",
            uploadedByEmail: "",
          })
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to upload approval"
          )
        },
      }
    )


  // const handleAccountsVerifySubmit = () => {
  //   if (!accountsVerifyData.paymentReceivedStatus) {
  //     alert("Please select payment received status")
  //     return
  //   }

  //   var submitUrl = "https://script.google.com/macros/s/AKfycbwpbLZ2qiWthyEBKoTovx40lgclcqe8FdwoaurGdWJJ3MJ0F7KjnrJdO0wGJVkw_tOm/exec";
  //   // You can use fetch or axios to send a POST request to the server
  //   // Example using fetch:
  //   submitUrl = submitUrl + "?action=accountStatusUpdate1";
  //   fetch(submitUrl, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       id: selectedBookingForAccounts?.bookingId,
  //       paymentReceivedStatus: accountsVerifyData.paymentReceivedStatus || "",
  //       actualReceivedAmount: accountsVerifyData.actualReceivedAmount || "",
  //       remarks: accountsVerifyData.remarks || "",
  //     }),
  //   })
  //     .then((response) => response.json())
  //     .then((data) => {
  //     })
  //     .catch((error) => {
  //       console.error("Error:", error);
  //     });


  //     booking: selectedBookingForAccounts,
  //     accountsVerifyData,
  //   })

  //   // Reset modal state
  //   setShowAccountsVerifyModal(false)
  //   setSelectedBookingForAccounts(null)
  //   setAccountsVerifyData({
  //     paymentReceivedStatus: "",
  //     actualReceivedAmount: "",
  //     remarks: "",
  //   })
  // }

  const handleAccountsVerifySubmit = async () => {
    if (isSubmitting) return

    const currentStageKey = accountsVerifyData.currentStage === 1 ? 'stage1'
      : accountsVerifyData.currentStage === 2 ? 'stage2'
        : 'stage3';

    const currentStage = accountsVerifyData[currentStageKey];
    const currentStagePlan = selectedBookingForAccounts?.accountsPersonStage?.[accountsVerifyData.currentStage.toString()];

    if (!stageHasPlanned(currentStagePlan)) {
      toast.error(`Stage ${accountsVerifyData.currentStage} is locked until planned is filled`)
      return
    }

    // Validate current stage only (not all 3)
    if (!currentStage.paymentReceivedStatus || !currentStage.actualReceivedAmount || !currentStage.remarks || !currentStage.remarks.trim()) {
      toast.error(`Please complete Stage ${accountsVerifyData.currentStage} verification fields`)
      return
    }

    try {
      setIsSubmitting(true)

      const submitUrl = "/api/ktahv-bookings/actions/accounts"

      const response = await fetch(submitUrl, {
        method: "POST",
        body: JSON.stringify({
          id: selectedBookingForAccounts?.bookingId,
          currentStage: accountsVerifyData.currentStage,
          stageVerification: {
            stageNumber: accountsVerifyData.currentStage,
            paymentReceivedStatus: currentStage.paymentReceivedStatus,
            actualReceivedAmount: currentStage.actualReceivedAmount,
            remarks: currentStage.remarks,
            collectionsVerification: currentStage.collections.map(c => ({
              index: c.index,
              verifyStatus: c.verifyStatus,
              verifyRemarks: c.verifyRemarks,
              actualAmount: c.actualAmount,
            })),
            collectionsVerified: currentStage.collections.filter(c => c.verifyStatus === "verified").length,
            totalCollections: currentStage.collections.length,
          },
          // Add cumulative data if this is the last activated stage
          ...(() => {
            const activatedForPayload = [1, 2, 3].filter(n => {
              const sd = selectedBookingForAccounts?.accountsPersonStage?.[n.toString()];
              return sd?.planned && sd.planned.trim() !== "";
            });
            const isLast = activatedForPayload[activatedForPayload.length - 1] === accountsVerifyData.currentStage;
            return isLast ? {
              allStagesData: {
                stage1: accountsVerifyData.stage1,
                stage2: accountsVerifyData.stage2,
                stage3: accountsVerifyData.stage3,
                allStagesCompleted: true,
              }
            } : {};
          })()
        }),
      })

      const data = await validateResponse(response)

      // Mark current stage as completed
      const updatedAccountsVerifyData = {
        ...accountsVerifyData,
        [currentStageKey]: {
          ...currentStage,
          isCompleted: true,
          submittedAt: new Date().toISOString(),
          doer: user?.email || user?.name || "Current User",
        }
      };

      // ✅ SKIP LOGIC: Determine last activated stage dynamically
      const activatedAccountsList = [1, 2, 3].filter(n => {
        const sd = selectedBookingForAccounts?.accountsPersonStage?.[n.toString()];
        return sd?.planned && sd.planned.trim() !== "";
      });
      const isLastActivatedStage = activatedAccountsList[activatedAccountsList.length - 1] === accountsVerifyData.currentStage;
      const canonicalAccountsStatus = String(
        data?.accountsVerifyStatus ??
        data?.status ??
        currentStage.paymentReceivedStatus ??
        "payment_verified"
      )

      setBookings(prevBookings =>
        prevBookings.map(booking => {
          if (booking.bookingId !== selectedBookingForAccounts?.bookingId) {
            return booking;
          }

          const updateAccountsStage = { ...booking.accountsPersonStage };
          updateAccountsStage[accountsVerifyData.currentStage.toString()] = {
            status: currentStage.paymentReceivedStatus,
            actualAmount: currentStage.actualReceivedAmount,
            amount: currentStage.actualReceivedAmount, // align with API key
            remarks: currentStage.remarks,
            actual: updatedAccountsVerifyData[currentStageKey].submittedAt,
            planned: booking?.accountsPersonStage?.[accountsVerifyData.currentStage.toString()]?.
              planned || ""
          }

          return {
            ...booking,
            accountsPersonStage: updateAccountsStage,
            accountsVerifyStatus: canonicalAccountsStatus,
          }
        }
        ))

      await refetchBookings()

      if (isLastActivatedStage) {
        toast.success("All activated stages verified and submitted successfully!")

        // Reset and close modal
        setShowAccountsVerifyModal(false)
        setSelectedBookingForAccounts(null)
        setAccountsVerifyData({
          currentStage: 1,
          stage1: {
            paymentReceivedStatus: "",
            actualReceivedAmount: "",
            remarks: "",
            collections: [],
            isCompleted: false,
            submittedAt: "",
            doer: "",
          },
          stage2: {
            paymentReceivedStatus: "",
            actualReceivedAmount: "",
            remarks: "",
            collections: [],
            isCompleted: false,
            submittedAt: "",
            doer: "",
          },
          stage3: {
            paymentReceivedStatus: "",
            actualReceivedAmount: "",
            remarks: "",
            collections: [],
            isCompleted: false,
            submittedAt: "",
            doer: "",
          },
          salesAgentName: "",
          salesAgentVerified: false,
          salesAgentRemarks: "",
          uploadedScreenshot: "",
          paymentCollectionHistory: [],
        })
      } else {
        // Move to next ACTIVATED stage (skip non-activated)
        const currentIndex = activatedAccountsList.indexOf(accountsVerifyData.currentStage);
        const nextActivatedStage = activatedAccountsList[currentIndex + 1];

        if (nextActivatedStage) {
          setAccountsVerifyData({
            ...updatedAccountsVerifyData,
            currentStage: nextActivatedStage,
          });
          toast.success(`Stage ${accountsVerifyData.currentStage} submitted! Moving to Stage ${nextActivatedStage}`);
        }
      }

    } catch (error) {
      console.error("Error:", error)
      toast.error(`Failed to submit Stage ${accountsVerifyData.currentStage}`)
    } finally {
      setIsSubmitting(false)
    }
  }




  const handleFOPMSVerifySubmit = async () => {
    if (isSubmitting) return

    const currentStageKey = foPMSVerifyData.currentStage === 1 ? 'stage1' : 'stage2';
    const currentStage = foPMSVerifyData[currentStageKey];
    const currentStagePlan = selectedBookingForFOPMS?.foPersonStage?.[foPMSVerifyData.currentStage.toString()];

    if (!stageHasPlanned(currentStagePlan)) {
      toast.error(`FO Stage ${foPMSVerifyData.currentStage} is locked until planned is filled`)
      return
    }

    // Validate current stage only (not all 2)
    if (!currentStage.releasePassActionStatus || !currentStage.pmsBlockStatus || !currentStage.informedToBookingPerson || !currentStage.remarks || !currentStage.remarks.trim()) {
      toast.error(`Please complete Stage ${foPMSVerifyData.currentStage} verification fields`)
      return
    }

    try {
      setIsSubmitting(true)

      const submitUrl = "/api/ktahv-bookings/actions/fo-pms"

      const response = await fetch(submitUrl, {
        method: "POST",
        body: JSON.stringify({
          id: selectedBookingForFOPMS?.bookingId,
          currentStage: foPMSVerifyData.currentStage,
          stageVerification: {
            stageNumber: foPMSVerifyData.currentStage,
            passActionStatus: currentStage.releasePassActionStatus,
            pmsBlockStatus: currentStage.pmsBlockStatus,
            informedToBookingPerson: currentStage.informedToBookingPerson,
            remarks: currentStage.remarks,
          },
          // Add cumulative data if this is the last activated FO stage
          ...(() => {
            const activatedFOForPayload = [1, 2].filter(n => {
              const sd = selectedBookingForFOPMS?.foPersonStage?.[n.toString()];
              return sd?.planned && sd.planned.trim() !== "";
            });
            const isLastFO = activatedFOForPayload[activatedFOForPayload.length - 1] === foPMSVerifyData.currentStage;
            return isLastFO ? {
              allStagesData: {
                stage1: foPMSVerifyData.stage1,
                stage2: foPMSVerifyData.stage2,
                allStagesCompleted: true,
              }
            } : {};
          })()
        }),
      })

      const data = await validateResponse(response)
      const canonicalFoStatus = String(
        data?.frontOfficeStatus ??
        data?.status ??
        currentStage.releasePassActionStatus ??
        "pms_verified_done"
      )

      // Mark current stage as completed
      const updatedFoPMSVerifyData = {
        ...foPMSVerifyData,
        [currentStageKey]: {
          ...currentStage,
          isCompleted: true,
          submittedAt: new Date().toISOString(),
          doer: user?.email || user?.name || "Current User",
        }
      };

      setBookings(prevBookings =>
        prevBookings.map(booking => {
          if (booking.bookingId === selectedBookingForFOPMS?.bookingId) {
            const updatedFoPersonStage = { ...booking.foPersonStage };
            updatedFoPersonStage[foPMSVerifyData.currentStage.toString()] = {
              status: currentStage.releasePassActionStatus,
              pmsBlockStatus: currentStage.pmsBlockStatus,
              informed: currentStage.informedToBookingPerson,
              remarks: currentStage.remarks,
              actual: updatedFoPMSVerifyData[currentStageKey].submittedAt,
              planned: booking?.foPersonStage?.[foPMSVerifyData.currentStage.toString()]?.planned || ""
            }
            return {
              ...booking,
              foPersonStage: updatedFoPersonStage,
              frontOfficeStatus: canonicalFoStatus,
            }
          }
          return booking;
        })
      )

      // ✅ SKIP LOGIC: Determine last activated FO stage dynamically
      const activatedFOListFinal = [1, 2].filter(n => {
        const sd = selectedBookingForFOPMS?.foPersonStage?.[n.toString()];
        return sd?.planned && sd.planned.trim() !== "";
      });
      const isLastFOStage = activatedFOListFinal[activatedFOListFinal.length - 1] === foPMSVerifyData.currentStage;

      // If final activated FO stage, update booking status and close
      if (isLastFOStage) {
        setBookings(prevBookings =>
          prevBookings.map(booking =>
            booking.bookingId === selectedBookingForFOPMS?.bookingId
              ? {
                ...booking,
                frontOfficeStatus: canonicalFoStatus,
              }
              : booking
          )
        )

        await refetchBookings()

        toast.success("All activated FO stages verified and submitted successfully!")

        // Reset and close modal
        setFOPMSVerifyModal(false)
        setSelectedBookingForFOPMS(null)
        setFoPMSVerifyData({
          currentStage: 1,
          stage1: {
            releasePassActionStatus: "",
            pmsBlockStatus: "",
            informedToBookingPerson: "",
            remarks: "",
            isCompleted: false,
            submittedAt: "",
            doer: "",
          },
          stage2: {
            releasePassActionStatus: "",
            pmsBlockStatus: "",
            informedToBookingPerson: "",
            remarks: "",
            isCompleted: false,
            submittedAt: "",
            doer: "",
          },
        })
      } else {
        // Move to next ACTIVATED FO stage (skip non-activated)
        const currentFOIndex = activatedFOListFinal.indexOf(foPMSVerifyData.currentStage);
        const nextActivatedFOStage = activatedFOListFinal[currentFOIndex + 1];

        if (nextActivatedFOStage) {
          setFoPMSVerifyData({
            ...updatedFoPMSVerifyData,
            currentStage: nextActivatedFOStage,
          });
          toast.success(`FO Stage ${foPMSVerifyData.currentStage} submitted! Moving to Stage ${nextActivatedFOStage}`);
        }
      }

    } catch (error) {
      console.error("Error:", error)
      toast.error(`Failed to submit Stage ${foPMSVerifyData.currentStage}`)
    } finally {
      setIsSubmitting(false)
    }
  }



  const handleCheckoutVerifySubmit = async () => {
    if (isSubmitting) return

    if (!stageHasPlanned(selectedBookingForCheckout?.checkOutPersonStage?.["1"])) {
      toast.error("Checkout Verify is locked until planned is filled")
      return
    }

    if (!checkoutVerifyData.paymentReceivedStatus || !checkoutVerifyData.remarks || !checkoutVerifyData.remarks.trim()) {
      toast.error("Please complete all required fields")
      return
    }

    if (paymentData.receivedDate) {
      const inputDate = new Date(paymentData.receivedDate);
      if (!isNaN(inputDate.getTime()) && inputDate > new Date()) {
        toast.error("Received Date cannot be in the future")
        return
      }
    }

    try {
      setIsSubmitting(true)

      const submitUrl = "/api/ktahv-bookings/actions/checkout"

      const response = await fetch(submitUrl, {
        method: "POST",
        body: JSON.stringify({
          id: selectedBookingForCheckout?.bookingId,
          paymentReceivedStatus: checkoutVerifyData.paymentReceivedStatus,
          remarks: checkoutVerifyData.remarks,
          paymentData: paymentData,
        }),
      })

      const data = await validateResponse(response)
      const canonicalCheckoutStatus = String(
        data?.checkoutVerificationStatus ??
        data?.status ??
        checkoutVerifyData.paymentReceivedStatus ??
        "Completed"
      )

      // ✅ LOCAL STATE UPDATE
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking.bookingId === selectedBookingForCheckout?.bookingId
            ? {
              ...booking,
              checkoutVerificationStatus:
                canonicalCheckoutStatus,
              checkoutVerificationRemarks: checkoutVerifyData.remarks,
              paymentReceivedDate: new Date(paymentData.receivedDate),
              paymentMode: paymentData.paymentMode,
              paymentReceiptNumber: paymentData.receiptNumber,
              receivedAmount: Number(paymentData.receivedAmount),
              checkOutPersonStage: {
                ...booking.checkOutPersonStage,
                "1": {
                  ...booking.checkOutPersonStage?.["1"],
                  actual: new Date().toISOString(),
                  status: checkoutVerifyData.paymentReceivedStatus,
                  remarks: checkoutVerifyData.remarks,
                  doer: user?.email || user?.name || "Current User",
                }
              },
            }
            : booking
        )
      )

      await refetchBookings()

      // ✅ SUCCESS TOAST
      toast.success("Checkout verified and submitted successfully")

      // ✅ CLOSE + RESET
      setShowCheckoutVerifyModal(false)
      setSelectedBookingForCheckout(null)
      setPaymentData({
        amount: selectedBookingForCheckout?.amount.toString() || "",
        receivedAmount: "",
        currency: selectedBookingForCheckout?.currency || "INR",
        paymentMode: "",
        receivedDate: "",
        receiptNumber: "",
        screenshot: null,
        paymentLocation: "",
        paymentCollectedBy: "",
      })
      setCheckoutVerifyData({
        paymentReceivedStatus: "",
        remarks: "",
      })
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to submit checkout verification")
    } finally {
      setIsSubmitting(false)
    }
  }


  const SortIcon = ({ field }: { field: keyof Booking }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const totalBookings = filteredBookings.length
  // 🔥 STATUS-WISE TOTAL AMOUNTS
  const totalBookingAmount = filteredBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  const confirmedAmount = filteredBookings
    .filter((b) => b.verfiedOrNot === "Confirm-Verified")
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const pendingAmountStatus = filteredBookings
    .filter((b) => b.status === "pending" || b.status === "payment_pending")
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const cancelledAmountStatus = filteredBookings
    .filter((b) => {
      if (hasRole("sales_agent")) {
        var stage = b?.salesPersonStage as any;
        for (var key in stage) {
          if (stage?.[key]?.status.trim().toLowerCase().indexOf("cancelled") > -1 && stage?.[key]?.actual.trim() !== "" && b?.isAutoReleased !== "Auto Released") {
            return true; // PENDING work
          }
        }
        return false; // No pending work
      }
      if (hasRole("account_manager")) {
        var stage = b?.accountsPersonStage["1"] as any;
        if (stage?.status.trim().toLowerCase().indexOf("cancelled") > -1 && stage?.actual.trim() !== "" && b?.isAutoReleased !== "Auto Released") {
          return true; // PENDING work
        }
        return false; // No pending work
      }
      if (hasRole("operation_manager")) {
        var stage = b?.foPersonStage["1"] as any;
        if (stage?.status.trim().toLowerCase().indexOf("cancelled") > -1 && stage?.actual.trim() !== "" && b?.isAutoReleased !== "Auto Released") {
          return true; // PENDING work
        }
        return false; // No pending work
      }
      return b?.cancelByUserCheck === "Cancelled"
    })
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const autoReleaseAmount = filteredBookings
    .filter((b) => b.isAutoReleased == "Auto Released")
    .reduce((sum, b) => sum + (b.amount || 0), 0);


  // 🔥 SOURCE-WISE TOTAL AMOUNTS
  const onlineAmount = filteredBookings
    .filter((b) => b.bSource === "Online Reservation")
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const otaAmount = filteredBookings
    .filter((b) => b.bSource === "OTA")
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const travelAgentAmount = filteredBookings
    .filter((b) => b.bSource === "Travel Agent")
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const directAmount = filteredBookings
    .filter((b) => b.bSource === "Offline")
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const referralAmount = filteredBookings
    .filter((b) => b.bSource === "Referral")
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const otherSourceAmount = filteredBookings
    .filter((b) => b.bSource === "Others")
    .reduce((sum, b) => sum + (b.amount || 0), 0);


  const CONVERSION_RATES: Record<string, number> = { INR: 1, USD: 85.74, EURO: 89.26 };
  const getTotalReceivedRaw = (b: any) => Number(b?.totalAmountReceived ?? b?.paidAmount ?? b?.receivedAmount ?? 0);
  const getReceivedINR = (b: Booking) => {
    const cur = String(b.currency || "INR").toUpperCase();
    const rate = CONVERSION_RATES[cur] ?? 1;
    return getTotalReceivedRaw(b) * rate;
  };

  useEffect(() => {
    if (!selectedBookingForPayment) {
      if (paymentData.pendingPaymentAmount !== "") {
        setPaymentData((prev) => ({
          ...prev,
          pendingPaymentAmount: "",
        }));
      }
      return;
    }

    // originalAmt and receivedAmt are already in the booking's native currency (e.g. USD, EUR, INR)
    const originalAmt = Number(selectedBookingForPayment.originalAmount || selectedBookingForPayment.amount || 0);
    const receivedAmt = getTotalReceivedRaw(selectedBookingForPayment);

    // Booking original currency and its exchange rate relative to INR
    const bookingCur = String(selectedBookingForPayment.currency || "INR").toUpperCase();
    const bookingRate = bookingCur === "USD" ? 85.74 : (bookingCur === "EURO" || bookingCur === "EUR" ? 89.26 : 1);

    // Input currency and its exchange rate relative to INR
    const cur = String(paymentData.currency || "INR").toUpperCase();
    const inputRate = cur === "USD" ? 85.74 : (cur === "EURO" || cur === "EUR" ? 89.26 : 1);

    // Convert new input amount to booking's native currency
    const newInputAmt = (parseFloat(String(paymentData.receivedAmount)) || 0);
    const newInputInBookingCurrency = (newInputAmt * inputRate) / bookingRate;

    // Remaining in booking's native currency (can be negative if overpaid)
    const remainingInBookingCurrency = originalAmt - receivedAmt - newInputInBookingCurrency;

    const pendingVal = remainingInBookingCurrency.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    if (paymentData.pendingPaymentAmount !== pendingVal) {
      setPaymentData((prev) => ({
        ...prev,
        pendingPaymentAmount: pendingVal,
      }));
    }
  }, [
    paymentData.receivedAmount,
    paymentData.currency,
    selectedBookingForPayment,
  ]);

  const totalReceivedINR = filteredBookings.reduce((sum, booking) => sum + getReceivedINR(booking), 0)
  const totalReceived = totalReceivedINR; // backwards compatibility

  const activeBookingsList = filteredBookings.filter(b => b.status !== "cancelled" && b.isAutoReleased !== "Auto Released");
  const activeCollectionsINR = activeBookingsList.reduce((sum, b) => sum + getReceivedINR(b), 0);
  const activeOutstandingValue = activeBookingsList.reduce((sum, b) => {
    const outstanding = (b.amount || 0) - getReceivedINR(b);
    return sum + Math.max(0, outstanding);
  }, 0);

  const cancelledBookingsList = filteredBookings.filter(b => b.status === "cancelled" && b.isAutoReleased !== "Auto Released");
  const cancelledCollectionsINR = cancelledBookingsList.reduce((sum, b) => sum + getReceivedINR(b), 0);
  const cancelledGrossValue = cancelledBookingsList.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalAmount = totalReceived + activeOutstandingValue + cancelledGrossValue + autoReleaseAmount;

  const confirmedBookings = filteredBookings.filter((b) => b.verfiedOrNot == "Confirm-Verified").length
  const pendingBookings = filteredBookings.filter((b) => b.status === "pending").length
  const cancelledCount = cancelledBookings.length
  const autoReleaseCount = autoReleaseBookings.length
  const cancelledByUserCount = filteredBookings.filter((b) => {
    // return b?.cancelByUserCheck === "Cancelled"
    if (hasRole("sales_agent")) {
      var stage = b?.salesPersonStage as any;
      for (var key in stage) {
        if (stage?.[key]?.status.trim().toLowerCase().indexOf("cancelled") > -1 && stage?.[key]?.actual.trim() !== "" && b?.isAutoReleased !== "Auto Released") {
          return true; // PENDING work
        }
      }
      return false; // No pending work
    }
    if (hasRole("account_manager")) {
      var stage = b?.accountsPersonStage["1"] as any;
      if (stage?.status.trim().toLowerCase().indexOf("cancelled") > -1 && stage?.actual.trim() !== "" && b?.isAutoReleased !== "Auto Released") {
        return true; // PENDING work
      }
      return false; // No pending work
      // return b?.accountsVerifyStatus.toLowerCase().indexOf("cancelled") !== -1;
    }
    if (hasRole("operation_manager")) {
      var stage = b?.foPersonStage["1"] as any;
      if (stage?.status.trim().toLowerCase().indexOf("cancelled") > -1 && stage?.actual.trim() !== "" && b?.isAutoReleased !== "Auto Released") {
        return true; // PENDING work
      }
      return false; // No pending work
      // return b?.frontOfficeStatus.toLowerCase().indexOf("cancelled") !== -1;
    }

    return b?.cancelByUserCheck === "Cancelled"
  }).length


  const chartData = [
    { name: "Total Bookings", value: totalBookings, color: "#1e40af" },
    { name: "Confirmed", value: confirmedBookings, color: "#059669" },
    { name: "Hold", value: holdBookings, color: "#d97706" },
    { name: "Cancelled", value: cancelledCount, color: "#dc2626" },
    { name: "Auto Release", value: autoReleaseCount, color: "#0891b2" },
  ]


  // Pending amount: sum of unpaid portion for bookings whose primary status is 'pending' (exclude cancelled)
  const pendingAmount = activeBookingsList.reduce((sum, b) => {
    const outstanding = (b.amount || 0) - getReceivedINR(b);
    return sum + Math.max(0, outstanding);
  }, 0)

  const revenueChartData = [
    { name: "Total Revenue", amount: totalAmount, color: "#6d28d9" },
    { name: "Amount Received", amount: activeCollectionsINR + cancelledCollectionsINR, color: "#65a30d" },
    { name: "Pending Amount", amount: activeOutstandingValue, color: "#d97706" },
  ]

  const cancelledAmount = cancelledGrossValue

  // Expand revenue data to include cancelled amount for the analytic bar chart
  const revenueSummary = [
    { name: "Received", amount: totalReceived, color: "#10b981" },
    { name: "Pending", amount: activeOutstandingValue, color: "#f59e0b" },
    { name: "Cancelled", amount: cancelledGrossValue + autoReleaseAmount, color: "#ef4444" },
  ]

  // Currency formatter used by KPI cards/charts
  const formatCurrency = (value: number) => {
    try {
      const rounded = Math.round(Number(value || 0));
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }).format(rounded);
    } catch (e) {
      return `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
    }
  };

  function getCurrencySymbol(currencyCode = "INR") {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'symbol'
    })
      .format(0)
      .replace(/\d|[.,\s]/g, '');
  }



  // Booking distribution by source (used in Chart View)
  const sourceBuckets: Record<string, number> = {}

  filteredBookings.forEach((b) => {
    const key = normalizeSource(b.bSource || b.source || "")  // ✅ CORRECT
    sourceBuckets[key] = (sourceBuckets[key] || 0) + 1
  })

  const bookingDistributionData = [
    {
      name: "Online Booking Engine",
      value: filteredBookings.filter((b) => b.bSource === "Online Reservation").length,
      color: "#2563eb",
    },
    {
      name: "OTA",
      value: filteredBookings.filter((b) => b.bSource === "OTA").length,
      color: "#16a34a",
    },
    {
      name: "Travel Agent",
      value: filteredBookings.filter((b) => b.bSource === "Travel Agent").length,
      color: "#f97316",
    },
    {
      name: "Direct / Offline",
      value: filteredBookings.filter((b) => b.bSource === "Offline").length,
      color: "#7c3aed",
    },
    {
      name: "Referral",
      value: filteredBookings.filter((b) => b.bSource === "Referral").length,
      color: "#ec4899",
    },
    {
      name: "Others",
      value: filteredBookings.filter((b) => b.bSource === "Others").length,
      color: "#64748b",
    },
  ].filter(item => item.value > 0);


  // Performance trends from booking status (counts by status)
  var statusCounts = {
    Confirmed: filteredBookings.filter((b) => (b.verfiedOrNot || "").toString().toLowerCase() === "confirm-verified").length,
    Pending: 0,
    // Pending: filteredBookings.filter((b) => (b.status || "").toString().toLowerCase() === "pending" || (b.status || "").toString().toLowerCase() === "payment_pending").length,
    // Hold: filteredBookings.filter((b) => ((b as any).salesTeamStatus || "").toString().toLowerCase().includes("hold")).length,
    Cancelled: filteredBookings.filter((b) => (b.cancelByUserCheck || "").toString().toLowerCase() === "cancelled").length,
    AutoRelease: filteredBookings.filter((b) => (b.isAutoReleased || "").toString().toLowerCase() === "auto released").length,
  };

  statusCounts.Pending = totalBookings - (
    (statusCounts.Confirmed || 0) +
    (statusCounts.Cancelled || 0) +
    (statusCounts.AutoRelease || 0)
  )

  // const statusTrendData = Object.keys(statusCounts).map((k) => ({ status: k, count: (statusCounts as any)[k] }))
  const statusTrendData = [
    { name: "Total Bookings", value: totalBookings },
    { name: "Confirmed", value: statusCounts.Confirmed },
    { name: "Pending", value: statusCounts.Pending },
    { name: "Cancelled", value: statusCounts.Cancelled },
    { name: "Auto Release", value: statusCounts.AutoRelease },
  ]

  const renderStatusBadge = (status: string, type: string) => {
    const getStatusColor = (status: string, type: string) => {
      // switch (type) {
      //   case "sales":
      //     switch (status) {
      //       case "Verified":
      //         return "bg-green-100 text-green-800 border-green-200";
      //       case "Under Auto Release":
      //         return "bg-orange-100 text-orange-800 border-orange-200";
      //       case "Pending":
      //         return "bg-gray-100 text-gray-800 border-gray-200";
      //       default:
      //         return "bg-gray-100 text-gray-800 border-gray-200";
      //     }

      //   case "accounts":
      //     switch (status) {
      //       case "payment_verified":
      //         return "bg-green-100 text-green-800 border-green-200"
      //       case "approval_verified":
      //         return "bg-lime-100 text-lime-800 border-lime-200"
      //       case "booking_cancelled":
      //         return "bg-red-100 text-red-800 border-red-200"
      //       case "under_review":
      //         return "bg-teal-100 text-teal-800 border-teal-200"
      //       default:
      //         return "bg-gray-100 text-gray-800 border-gray-200"
      //     }
      //   case "frontoffice":
      //     switch (status) {
      //       case "pms_verified_done":
      //         return "bg-green-100 text-green-800 border-green-200"
      //       case "booking_cancelled":
      //         return "bg-red-100 text-red-800 border-red-200"
      //       case "processing":
      //         return "bg-teal-100 text-teal-800 border-teal-200"
      //       default:
      //         return "bg-gray-100 text-gray-800 border-gray-200"
      //     }
      //   case "payment":
      //     switch (status) {
      //       case "full_payment_received":
      //         return "bg-green-100 text-green-800 border-green-200"
      //       case "partial_payment":
      //         return "bg-yellow-100 text-yellow-800 border-yellow-200"
      //       case "booking_cancelled":
      //         return "bg-red-100 text-red-800 border-red-200"
      //       default:
      //         return "bg-gray-100 text-gray-800 border-gray-200"
      //     }
      //   default:
      //     return "bg-gray-100 text-gray-800 border-gray-200"
      // }
      switch (type) {
        case "sales":
          switch (status) {
            case "Verified":
            case "Edit Required":
              return "bg-[#eafffa] text-[#064f01] border-[#1b6e3aa8]";
            case "Under Auto Release":
              return "bg-gray-100 text-orange-800 border-orange-200";
            case "Pending":
              return "bg-orange-100 text-gray-800 border-gray-200";
            case "Cancelled":
            case "Booking Cancelled":
              return "bg-red-100 text-red-800 border-red-200";
            case "Complimentary":
              return "bg-purple-100 text-purple-800 border-purple-200";
            case "Voucher":
              return "bg-blue-100 text-blue-800 border-blue-200";
            default:
              return "bg-orange-100 text-gray-800 border-gray-200";
          }

        // case "accounts":
        //   switch (status) {
        //     case "Verified":
        //       return "bg-green-100 text-green-800 border-green-200"
        //     case "Pending":
        //       return "bg-orange-100 text-gray-800 border-gray-200"
        //     case "Cancelled":
        //       return "bg-red-100 text-red-800 border-red-200"
        //     default:
        //       return "bg-orange-100 text-gray-800 border-gray-200"
        //   }
        case "accounts":
          switch (status) {
            case "Payment Received":
              return "bg-[#eafffa] text-[#064f01] border-[#1b6e3aa8]"

            case "Payment Received Status":
              return "bg-[#eafffa] text-[#064f01] border-[#1b6e3aa8]"

            case "Payment Not Received But Approval Taken":
              return "bg-yellow-100 text-yellow-800 border-yellow-200"

            case "Payment Not Received":
              return "bg-orange-100 text-orange-800 border-orange-200"

            case "Booking Cancelled":
              return "bg-red-100 text-red-800 border-red-200"

            case "Voucher":
              return "bg-blue-100 text-blue-800 border-blue-200"

            case "Complimentary":
              return "bg-purple-100 text-purple-800 border-purple-200"

            default:
              return "bg-orange-100 text-gray-800 border-gray-200"
          }

        // case "frontoffice":
        //   switch (status) {
        //     case "Verified":
        //       return "bg-green-100 text-green-800 border-green-200"
        //     case "Pending":
        //       return "bg-orange-100 text-gray-800 border-gray-200"
        //     case "Cancelled":
        //       return "bg-red-100 text-red-800 border-red-200"
        //     default:
        //       return "bg-orange-100 text-gray-800 border-gray-200"
        //   }
        case "frontoffice":
          switch (status) {
            // ✅ VERIFIED
            case "PASS-No Action":
            case "PASS-":
            case "Complimentary-No Action":
            case "Voucher-No Action":
              return "bg-[#eafffa] text-[#064f01] border-[#1b6e3aa8]"

            // ❌ CANCELLED
            case "Booking Cancelled-Booking Cancelled":
            case "Booking Cancelled-No Action":
            case "PASS-Booking Cancelled":
            case "Complimentary-Booking Cancelled":
            case "Voucher-Booking Cancelled":
            case "-Booking Cancelled":
              return "bg-red-100 text-red-800 border-red-200"

            // ⏳ PENDING / NO ACTION
            case "-No Action":
            case "Booking Cancelled-":
              return "bg-orange-100 text-gray-800 border-gray-200"

            default:
              return "bg-orange-100 text-gray-800 border-gray-200"
          }

        case "checkout payment":
          switch (status) {
            case "Verified":
            case "Done":
            case "Auto-Done":
              return "bg-[#eafffa] text-[#064f01] border-[#1b6e3aa8]"
            case "Pending":
              return "bg-orange-100 text-gray-800 border-gray-200"
            case "Cancelled":
              return "bg-red-100 text-red-800 border-red-200"
            default:
              return "bg-orange-100 text-gray-800 border-gray-200"
          }
        default:
          return "bg-orange-100 text-gray-800 border-gray-200"
      }
    }

    const formatStatus = (status: string) => {
      if (!status) return "Unknown"
      return `${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} Verify Status - ${status
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")}`
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status, type)}`}
      >
        {formatStatus(status, type)}
      </span>
    )
  }


  const renderStatusBadgeForDelay = (delay: string, bStatus: string) => {
    const getStatusColorForDelay = (delay: string, bStatus: string) => {
      var type = delay.indexOf("-") == -1 ? "Positive" : "Negative";
      var fullStatus = type == "Positive" && bStatus != "" && bStatus != "pending" ? "Positive-Done" : type == "Positive" ? "Positive" : type == "Negative" ? "Negative" : "Unknown";
      switch (fullStatus) {
        case "Negative":
          return "bg-[#eafffa] text-[#064f01] border-[#1b6e3aa8]"
        case "Positive-Done":
          return "bg-red-100 text-red-800 border-red-200"
        case "Positive":
          return "bg-orange-100 text-gray-800 border-gray-200"
        default:
          return "bg-gray-100 text-gray-800 border-gray-200"
      }
    }

    // const formatStatus = (status: string) => {
    //   if (!status) return "Unknown"
    //   return `${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} Verify Status - ${status
    //     .split("_")
    //     .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    //     .join(" ")}`
    // }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColorForDelay(delay, bStatus)}`}
      >
        {delay}
      </span>
    )
  }

  const getSalesPersonVerifyStatus = (b: Booking) => {
    const hasPI = Boolean(b.piNumber);
    const hasDataUpdated = Boolean(b.verfiedOrNot && b.verfiedOrNot !== "");
    const hasPaymentUploaded = Number(b.receivedAmount || 0) > 0;
    const hasApprovalUploaded = Boolean(b.approvedTillDate);

    // 1️⃣ Verified
    if (hasPI && hasDataUpdated && hasPaymentUploaded && hasApprovalUploaded) {
      return "Verified";
    }

    // 2️⃣ Under Auto Release
    if (String(b.status).toLowerCase() === "auto_release") {
      return "Under Auto Release";
    }

    // 3️⃣ Pending
    return "Pending";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Image
            src="/grouploader.gif"
            alt="Loading bookings"
            width={200}   // 🔥 increased for better visibility
            height={200}
            priority
            className="animate-pulse"
          />

          <p className="mt-4 text-base font-bold text-emerald-600 animate-pulse">
            Fetching latest bookings...
          </p>



        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 overflow-x-hidden">
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-violet-600 border-b border-teal-400 shadow-2xl">
        <div className="w-full px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
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
                <div className="min-w-0">
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
                    KTAHV New Booking Sales FMS
                  </h1>

                  <p
                    className="
                text-sm
                sm:text-base
                lg:text-lg
                text-teal-50
                mt-1 sm:mt-2
                font-medium
              "
                  >
                    Team Management • Real-time PMS Analytics
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
                <p className="text-xs sm:text-sm text-teal-100 font-medium">
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


      <div className="w-full px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">

        {/* ================= LOAD / REFRESH FAILURE ================= */}
        {error && bookings.length === 0 && (
          <div className="rounded-xl border border-red-300 bg-red-50 shadow-md p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-red-800 leading-tight">
                  Unable to load bookings
                </h3>
                <p className="text-xs sm:text-sm text-red-700 mt-1">
                  We couldn&apos;t reach the bookings service, so no bookings could be shown. This is not an
                  empty result — please retry.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchBookings()}
                className="w-full sm:w-auto bg-white border-red-300 text-red-700 font-medium hover:bg-red-100 flex-shrink-0"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* ================= REFRESH FAILED, SHOWING RETAINED ROWS ================= */}
        {error && bookings.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 shadow-md p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-900 leading-tight">
                    Latest refresh failed
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Showing the bookings loaded earlier. They may be out of date.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchBookings()}
                className="w-full sm:w-auto bg-white border-amber-300 text-amber-800 font-medium hover:bg-amber-100 flex-shrink-0"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* ================= SUCCESSFUL EMPTY RESULT ================= */}
        {!loading && !error && bookings.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-md p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">
                  No bookings found
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Bookings loaded successfully, but there are none visible to you right now.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchBookings()}
                className="w-full sm:w-auto bg-white border-slate-300 text-slate-700 font-medium hover:bg-slate-100 flex-shrink-0"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* ================= FILTERS & SEARCH ================= */}
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
        bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50
        border-b border-slate-200
      "
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-teal-600 flex items-center justify-center shadow-sm">
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
              <div className="px-4 sm:px-5 py-5 space-y-4">

                {/* ================= ROW 1 ================= */}
                <div
                  className="
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-6
          gap-4
        "
                >
                  {/* SEARCH */}
                  <div className="lg:col-span-2">
                    <Label className="text-xs text-slate-500 mb-1 block uppercase">
                      Search Bookings
                    </Label>
                    <Input
                      placeholder="Guest name, Booking ID,PI Number, Salesperson..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && setSearchTerm(searchInput)}
                      className="h-10 w-full rounded-md border-gray-300"
                    />
                  </div>

                  {/* BOOKING DATE */}
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block uppercase">
                      Booking Date
                    </Label>
                    <Select
                      value={dateFilter}
                      onValueChange={(value) => {
                        setDateFilter(value)

                        // 🔥 reset Check-In & Check-Out when Booking Date is used
                        setCheckInFilter("all")
                        setCheckOutFilter("all")
                        setCustomDateRange({ start: "", end: "" })

                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-11 sm:h-10 w-full rounded-md border-gray-300 text-xs sm:text-sm">
                        <SelectValue placeholder="All Dates" />
                      </SelectTrigger>

                      <SelectContent className="max-w-[calc(100vw-2rem)] text-xs sm:text-sm">
                        {/* ✅ NEW OPTION */}
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
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block uppercase">
                      Check-In
                    </Label>
                    <Select
                      value={checkInFilter}
                      onValueChange={(value) => {
                        setCheckInFilter(value)

                        // 🔥 reset booking date when Check-In is used
                        setDateFilter("all")
                        setCustomDateRange({ start: "", end: "" })
                        setCheckOutFilter("all")


                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-11 sm:h-10 w-full rounded-md border-gray-300 text-xs sm:text-sm">
                        <SelectValue placeholder="All Dates" />
                      </SelectTrigger>

                      <SelectContent className="max-w-[calc(100vw-2rem)] text-xs sm:text-sm">
                        <SelectItem value="all" disabled>Select Check-In</SelectItem>
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
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block uppercase">
                      Check-Out
                    </Label>
                    <Select
                      value={checkOutFilter}
                      onValueChange={(value) => {
                        setCheckOutFilter(value)

                        // 🔥 reset booking date when Check-Out is used
                        setDateFilter("all")
                        setCustomDateRange({ start: "", end: "" })
                        setCheckInFilter("all")

                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                        <SelectValue placeholder="All Dates" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all" disabled>Select Check-Out</SelectItem>
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
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block uppercase">
                      Booking Status
                    </Label>
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value.toLowerCase())}
                    >
                      <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="auto-release">Auto Release</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ================= ROW 2 ================= */}
                <div
                  className="
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-6
          gap-4
        "
                >
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block uppercase">
                      Booking Taken
                    </Label>
                    <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                      <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {[...salespersonOptions]
                          .sort(
                            (a, b) =>
                              bookings.filter(
                                bk =>
                                  (bk.bookingTakenBy || bk.assignedTo) === b
                              ).length -
                              bookings.filter(
                                bk =>
                                  (bk.bookingTakenBy || bk.assignedTo) === a
                              ).length
                          )
                          .map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1">
                    <Label className="text-xs text-slate-500 mb-1 block uppercase">
                      Data Source
                    </Label>

                    <Select value={dataSourceFilter} onValueChange={setDataSourceFilter}>
                      <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                        <SelectValue placeholder="All Data Sources" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">All Data Sources</SelectItem>

                        {dataSourceOptions.map((src) => (
                          <SelectItem key={src} value={src}>
                            {src}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block uppercase">
                      Booking Source
                    </Label>
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                        <SelectValue placeholder="Total Bookings" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Total Bookings</SelectItem>
                        <SelectItem value="Online Reservation">Online</SelectItem>
                        <SelectItem value="Offline">Offline</SelectItem>
                        <SelectItem value="OTA">OTA</SelectItem>
                        <SelectItem value="Travel Agent">Travel Agents</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ================= CUSTOM DATE RANGE ================= */}
                {(dateFilter === "custom" ||
                  checkInFilter === "custom" ||
                  checkOutFilter === "custom") && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label className="text-xs text-slate-500 mb-1 block uppercase">
                          Start Date
                        </Label>
                        <Input
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) =>
                            setCustomDateRange({
                              ...customDateRange,
                              start: e.target.value,
                            })
                          }
                          className="h-10 w-full rounded-md border-gray-300"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-slate-500 mb-1 block uppercase">
                          End Date
                        </Label>
                        <Input
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) =>
                            setCustomDateRange({
                              ...customDateRange,
                              end: e.target.value,
                            })
                          }
                          className="h-10 w-full rounded-md border-gray-300"
                        />
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>



          <Card className="rounded-xl bg-white/90 backdrop-blur-sm border border-slate-300 shadow-xl">

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
      bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50
      border-b border-slate-200
      rounded-t-xl
    "
              >
                {/* ================= LEFT ================= */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>

                  <div className="min-w-0">
                    <h3
                      className="
            text-sm
            sm:text-base
            font-semibold
            text-slate-800
            leading-tight
            break-words
          "
                    >
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
                      className="flex-1 sm:flex-none data-[state=active]:bg-teal-600 data-[state=active]:text-white font-semibold text-xs px-3"
                    >
                      Table View
                    </TabsTrigger>
                    <TabsTrigger
                      value="chart"
                      className="flex-1 sm:flex-none data-[state=active]:bg-teal-600 data-[state=active]:text-white font-semibold text-xs px-3"
                    >
                      Chart View
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="px-5 pt-3 pb-4">
              {viewMode === "table" ? (
                <div className="space-y-5">
                  <div className="border border-slate-200 rounded-xl p-4 bg-white">
                    <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                      Today's Stay Activity
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-2.5">
                      <Card
                        onClick={() => setTodayStayModal("checkin")}
                        className="border border-indigo-300 bg-indigo-50 shadow-sm rounded-lg cursor-pointer hover:shadow-md hover:border-indigo-400 transition-all"
                      >
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-indigo-700 uppercase leading-tight">
                              Today's Check-Ins
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-indigo-900 leading-tight">
                            {todayCheckIns.length}
                          </p>

                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-medium text-indigo-700">
                            {todayCheckInStats.paymentPendingCount > 0 && (
                              <span>💳 {todayCheckInStats.paymentPendingCount} pending</span>
                            )}
                            {todayCheckInStats.stagePendingCount > 0 && (
                              <span>⏳ {todayCheckInStats.stagePendingCount} stage pending</span>
                            )}
                            {todayCheckInStats.vipRepeatCount > 0 && (
                              <span>⭐ {todayCheckInStats.vipRepeatCount} VIP/repeat</span>
                            )}
                            {todayCheckInStats.groupBookingCount > 0 && (
                              <span>👥 {todayCheckInStats.groupBookingCount} group</span>
                            )}
                          </div>

                          <span className="flex items-center gap-1 text-[11px] text-indigo-700 leading-none">
                            Click to view guest list →
                          </span>
                        </CardContent>
                      </Card>

                      <Card
                        onClick={() => setTodayStayModal("checkout")}
                        className="border border-rose-300 bg-rose-50 shadow-sm rounded-lg cursor-pointer hover:shadow-md hover:border-rose-400 transition-all"
                      >
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-rose-700 uppercase leading-tight">
                              Today's Check-Outs
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-rose-600 flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-rose-900 leading-tight">
                            {todayCheckOuts.length}
                          </p>

                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-medium text-rose-700">
                            {todayCheckOutStats.paymentPendingCount > 0 && (
                              <span>💳 {todayCheckOutStats.paymentPendingCount} pending</span>
                            )}
                            {todayCheckOutStats.stagePendingCount > 0 && (
                              <span>⏳ {todayCheckOutStats.stagePendingCount} stage pending</span>
                            )}
                            {todayCheckOutStats.vipRepeatCount > 0 && (
                              <span>⭐ {todayCheckOutStats.vipRepeatCount} VIP/repeat</span>
                            )}
                            {todayCheckOutStats.groupBookingCount > 0 && (
                              <span>👥 {todayCheckOutStats.groupBookingCount} group</span>
                            )}
                          </div>

                          <span className="flex items-center gap-1 text-[11px] text-rose-700 leading-none">
                            Click to view guest list →
                          </span>
                        </CardContent>
                      </Card>

                      <Card
                        onClick={() => setTodayStayModal("inhouse")}
                        className="border border-teal-300 bg-teal-50 shadow-sm rounded-lg cursor-pointer hover:shadow-md hover:border-teal-400 transition-all"
                      >
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-teal-700 uppercase leading-tight">
                              In-House Now
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-teal-600 flex items-center justify-center flex-shrink-0">
                              <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-teal-900 leading-tight">
                            {inHouseNow.length}
                          </p>

                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-medium text-teal-700">
                            {inHouseStats.paymentPendingCount > 0 && (
                              <span>💳 {inHouseStats.paymentPendingCount} pending</span>
                            )}
                            {inHouseStats.stagePendingCount > 0 && (
                              <span>⏳ {inHouseStats.stagePendingCount} stage pending</span>
                            )}
                            {inHouseStats.vipRepeatCount > 0 && (
                              <span>⭐ {inHouseStats.vipRepeatCount} VIP/repeat</span>
                            )}
                            {inHouseStats.groupBookingCount > 0 && (
                              <span>👥 {inHouseStats.groupBookingCount} group</span>
                            )}
                          </div>

                          <span className="flex items-center gap-1 text-[11px] text-teal-700 leading-none">
                            Click to view guest list →
                          </span>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-white">
                    <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                      Booking Status
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-2.5">
                      <Card className="border border-teal-300 bg-teal-50 shadow-sm rounded-lg">
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-teal-700 uppercase leading-tight">
                              Total Bookings
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-teal-600 flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-teal-900 leading-tight">
                            {totalBookings}
                          </p>

                          <p className="text-[11px] font-medium text-teal-700 leading-tight">
                            {formatCurrency(totalBookingAmount)}
                          </p>

                          <span className="flex items-center gap-1 text-[11px] text-teal-700 leading-none">
                            ▲
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="border border-green-300 bg-green-50 shadow-sm rounded-lg">
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-green-700 uppercase leading-tight">
                              Confirmed / Verified
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-green-600 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-green-900 leading-tight">
                            {confirmedBookings}
                          </p>

                          <p className="text-[11px] font-medium text-green-700 leading-tight">
                            {formatCurrency(confirmedAmount)}
                          </p>

                          <span className="flex items-center gap-1 text-[11px] text-green-700 leading-none">
                            ▲ Active
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="border border-amber-300 bg-amber-50 shadow-sm rounded-lg">
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-amber-700 uppercase leading-tight">
                              UnVerified
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-amber-600 flex items-center justify-center flex-shrink-0">
                              <PauseCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-amber-900 leading-tight">
                            {totalBookings - (confirmedBookings + cancelledByUserCount + autoReleaseCount)}
                          </p>

                          <p className="text-[11px] font-medium text-amber-700 leading-tight">
                            {formatCurrency(totalBookingAmount - (confirmedAmount + cancelledAmountStatus + autoReleaseAmount))}
                          </p>

                          <span className="flex items-center gap-1 text-[11px] text-amber-700 leading-none">
                            ⏸ On Hold
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="border border-red-300 bg-red-50 shadow-sm rounded-lg">
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-red-700 uppercase leading-tight">
                              Cancelled by User
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-red-600 flex items-center justify-center flex-shrink-0">
                              <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-red-900 leading-tight">
                            {cancelledByUserCount}
                          </p>

                          <p className="text-[11px] font-medium text-red-700 leading-tight">
                            {formatCurrency(cancelledAmountStatus)}
                          </p>

                          <span className="flex items-center gap-1 text-[11px] text-red-700 leading-none">
                            ▼ -5%
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="border border-sky-300 bg-sky-50 shadow-sm rounded-lg">
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-sky-700 uppercase leading-tight">
                              Auto Release
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-sky-600 flex items-center justify-center flex-shrink-0">
                              <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-sky-900 leading-tight">
                            {autoReleaseCount}
                          </p>

                          <p className="text-[11px] font-medium text-sky-700 leading-tight">
                            {formatCurrency(autoReleaseAmount)}
                          </p>

                          <span className="flex items-center gap-1 text-[11px] text-sky-700 leading-none">
                            ↻ Auto
                          </span>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-white">
                    <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                      Booking Sources
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-2.5">
                      <Card className="border border-teal-300 bg-teal-50 shadow-sm rounded-lg">
                        <CardContent className="px-2.5 py-1.5 space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[13px] font-semibold text-teal-700 uppercase">
                              Total Bookings
                            </p>
                            <div className="w-6 h-6 rounded-md bg-teal-600 flex items-center justify-center">
                              <Calendar className="h-3.5 w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-2xl font-bold text-teal-900 leading-tight">
                            {totalBookings}
                          </p>

                          <p className="text-[11px] font-medium text-teal-700 leading-tight">
                            {formatCurrency(totalBookingAmount)}
                          </p>

                          <span className="flex items-center gap-1 text-[11px] text-teal-700 leading-none">
                            ▲ +12%
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="border border-slate-300 bg-slate-50 shadow-sm rounded-lg">
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-slate-700 uppercase leading-tight">
                              Offline Booking
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-600 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                            {filteredBookings.filter((b) => b.bSource === "Offline").length}
                          </p>

                          <p className="text-[11px] font-medium text-slate-700 leading-tight">
                            {formatCurrency(directAmount)}
                          </p>

                          <span className="flex items-center gap-1 text-[11px] text-slate-700 leading-none">
                            Direct
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="border border-sky-300 bg-sky-50 shadow-sm rounded-lg">
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-sky-700 uppercase leading-tight">
                              Online Booking
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-sky-600 flex items-center justify-center flex-shrink-0">
                              <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-sky-900 leading-tight">
                            {filteredBookings.filter((b) => b.bSource === "Online Reservation").length}
                          </p>

                          <p className="text-[11px] font-medium text-sky-700 leading-tight">
                            {formatCurrency(onlineAmount)}
                          </p>

                          <span className="flex items-center gap-1 text-[11px] text-sky-700 leading-none">
                            Web
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="border border-fuchsia-300 bg-fuchsia-50 shadow-sm rounded-lg">
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-fuchsia-700 uppercase leading-tight">
                              OTA Bookings
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-fuchsia-600 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-fuchsia-900 leading-tight">
                            {filteredBookings.filter((b) => b.bSource === "OTA").length}
                          </p>

                          <p className="text-[11px] font-medium text-fuchsia-700 leading-tight">
                            {formatCurrency(otaAmount)}
                          </p>

                          <span className="flex items-center gap-1 text-[11px] text-fuchsia-700 leading-none">
                            Platform
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="border border-orange-300 bg-orange-50 shadow-sm rounded-lg">
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-orange-700 uppercase leading-tight">
                              Travel Agents
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-orange-600 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-orange-900 leading-tight">
                            {filteredBookings.filter((b) => b.bSource === "Travel Agent").length}
                          </p>

                          <p className="text-[11px] font-medium text-orange-700 leading-tight">
                            {formatCurrency(travelAgentAmount)}
                          </p>

                          <span className="flex items-center gap-1 text-[11px] text-orange-700 leading-none">
                            Partner
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="border border-gray-300 bg-gray-50 shadow-sm rounded-lg">
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-gray-700 uppercase leading-tight">
                              Others
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gray-600 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                            {filteredBookings.filter((b) => b.bSource === "Others").length}
                          </p>

                          <p className="text-[11px] font-medium text-gray-700 leading-tight">
                            {formatCurrency(otherSourceAmount)}
                          </p>

                          <span className="flex items-center gap-1 text-[11px] text-gray-700 leading-none">
                            Gift
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="border border-emerald-300 bg-emerald-50 shadow-sm rounded-lg">
                        <CardContent className="px-3 sm:px-2.5 py-2 sm:py-1.5 space-y-1.5 sm:space-y-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] sm:text-[13px] font-semibold text-emerald-700 uppercase leading-tight">
                              Referral
                            </p>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-emerald-600 flex items-center justify-center flex-shrink-0">
                              <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </div>
                          </div>

                          <p className="text-xl sm:text-2xl font-bold text-emerald-900 leading-tight">
                            {filteredBookings.filter((b) => b.bSource === "Referral").length}
                          </p>

                          <p className="text-[11px] font-medium text-emerald-700 leading-tight">
                            {formatCurrency(referralAmount)}
                          </p>

                          <span className="flex items-center gap-1 text-[11px] text-emerald-700 leading-none">
                            Referral
                          </span>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-teal-50 to-slate-50 rounded-xl p-4 sm:p-6 border border-teal-200 shadow-sm">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
                        <span>Bookings Source Distribution</span>
                      </h3>

                      <div className="mb-3 sm:mb-4 p-3 bg-white/60 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                          <div>
                            <div className="text-xs text-slate-600">Total Bookings</div>
                            <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalBookings}</div>
                          </div>
                          <div className="text-xs sm:text-sm text-slate-600">Filtered total based on selected filters</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 sm:mb-4">
                        {bookingDistributionData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between p-2 bg-white/50 rounded min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                              <span className="text-slate-600 text-xs sm:text-sm truncate">{item.name}</span>
                            </div>
                            <span className="font-semibold text-slate-900 text-xs sm:text-sm ml-2 flex-shrink-0">{(item.value || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      <div className="w-full relative" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "white",
                                border: "1px solid #cbd5e1",
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                            />
                            <Pie
                              data={bookingDistributionData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius="35%"
                              outerRadius="70%"
                              paddingAngle={4}
                              labelLine={false}
                              label={false}
                            >
                              {bookingDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <text
                              x="50%"
                              y="50%"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className="text-xl sm:text-2xl font-bold fill-slate-900"
                            >
                              {totalBookings}
                            </text>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-lime-50 to-slate-50 rounded-xl p-6 border border-lime-200 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5 text-lime-600" />
                        Revenue Analysis
                      </h3>
                      <div className="mb-4 p-3 bg-white/60 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-xs text-slate-600">Total Amount</div>
                          <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalAmount)}</div>
                        </div>
                        {/* <div className="text-sm text-slate-600">Filtered total based on selected filters</div> */}
                      </div>

                      <div className="grid grid-cols-1 gap-2 mb-4">
                        {revenueSummary.map((item) => (
                          <div key={item.name} className="flex items-center justify-between p-2 bg-white/50 rounded">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-slate-600 text-sm">{item.name}</span>
                            </div>
                            <span className="font-semibold text-slate-900 text-sm">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>

                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={revenueSummary}
                          margin={{ top: 30, right: 20, left: 20, bottom: 60 }}
                          barCategoryGap="20%"
                        >
                          <defs>
                            <linearGradient id="revBarGrad" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#c7b2ff" stopOpacity={0.95} />
                              <stop offset="100%" stopColor="#f8fafc" stopOpacity={0.95} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e6eef8" />
                          <XAxis
                            dataKey="name"
                            stroke="#0f172a"
                            angle={-35}
                            textAnchor="end"
                            height={80}
                            interval={0}
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis
                            stroke="#0f172a"
                            width={70}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip
                            formatter={(value) => `₹${value.toLocaleString()}`}
                            contentStyle={{ backgroundColor: "white", border: "1px solid #cbd5e1", borderRadius: 8 }}
                          />
                          <Bar
                            dataKey="amount"
                            radius={[8, 8, 0, 0]}
                            isAnimationActive
                            animationDuration={800}
                            maxBarSize={80}
                          >
                            {revenueSummary.map((entry, index) => (
                              <Cell key={`revbar-${index}`} fill={entry.color} />
                            ))}
                            <LabelList
                              dataKey="amount"
                              position="top"
                              formatter={(v) => `₹${((v || 0) / 1000).toFixed(0)}k`}
                              style={{ fontSize: 10, fill: '#0f172a', fontWeight: 600 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-teal-50 rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
                      Performance Trends
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={statusTrendData}
                        margin={{ top: 20, right: 20, left: 10, bottom: 60 }}
                      >
                        <defs>
                          <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5a4" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e6eef8" />
                        <XAxis
                          dataKey="name"
                          stroke="#0f172a"
                          angle={-35}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          stroke="#0f172a"
                          width={60}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#0ea5a4"
                          strokeWidth={3}
                          dot={{ fill: "#0ea5a4", r: 5 }}
                          activeDot={{ r: 7 }}
                          isAnimationActive
                          animationDuration={900}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {viewMode === "table" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Revenue Card */}
            <Card className="bg-gradient-to-br from-indigo-700 to-indigo-800 text-white border-indigo-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="px-2.5 py-1.5 space-y-1">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[13px] font-semibold uppercase">
                    Total Revenue
                  </p>
                  <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                    <DollarSign className="h-3.5 w-3.5" />
                  </div>
                </div>

                <p className="text-2xl font-bold leading-tight">
                  {formatCurrency(totalAmount)}
                </p>

                <span className="flex items-center gap-1 text-[11px] leading-none">
                  ▲ +10%
                </span>
              </CardContent>
            </Card>

            {/* Amount Received Card */}
            <Card className="bg-gradient-to-br from-emerald-700 to-emerald-800 text-white border-emerald-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="px-2.5 py-1.5 space-y-1">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[13px] font-semibold uppercase">
                    Amount Received
                  </p>
                  <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </div>
                </div>

                <p className="text-2xl font-bold leading-tight">
                  {formatCurrency(totalReceived)}
                </p>

                <span className="flex items-center gap-1 text-[11px] leading-none">
                  ▲ +5%
                </span>
              </CardContent>
            </Card>

            {/* Pending Amount Card */}
            <Card className="bg-gradient-to-br from-amber-700 to-amber-800 text-white border-amber-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="px-2.5 py-1.5 space-y-1">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[13px] font-semibold uppercase">
                    Pending Amount
                  </p>
                  <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                </div>

                <p className="text-2xl font-bold leading-tight">
                  {formatCurrency(activeOutstandingValue)}
                </p>

                <span className="flex items-center gap-1 text-[11px] leading-none">
                  ▼ {totalAmount > 0
                    ? `${Math.round((activeOutstandingValue / totalAmount) * 100)}%`
                    : "0%"}
                </span>
              </CardContent>
            </Card>

            {/* Cancelled Amount Card */}
            <Card className="bg-gradient-to-br from-rose-700 to-rose-800 text-white border-rose-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="px-2.5 py-1.5 space-y-1">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[13px] font-semibold uppercase">
                    Cancelled Amount
                  </p>
                  <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                    <XCircle className="h-3.5 w-3.5" />
                  </div>
                </div>

                <p className="text-2xl font-bold leading-tight">
                  {formatCurrency(cancelledAmount + autoReleaseAmount)}
                </p>

                <span className="flex items-center gap-1 text-[11px] leading-none">
                  ▼ {totalAmount > 0
                    ? `${Math.round(((cancelledAmount + autoReleaseAmount) / totalAmount) * 100)}%`
                    : "0%"}
                </span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* <StageWisePendingsReport /> */}
        <Suspense fallback={
          <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Stage-Wise Pending Report</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Loading analysis data...</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4 py-12">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-blue-400 opacity-20"></div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-gray-700">Processing Stage Data</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                  <span>Fetching bookings across all stages</span>
                </div>
              </div>
            </CardContent>
          </Card>
        }>
          <StageWisePendingsReport pendingCount={pendingCount} loading={loading} />
        </Suspense>
        {underAutoReleaseBookings.length > 0 && (
          <Card className="pt-0 ">
            <CardHeader
              className="
    flex items-center justify-between
    px-5 py-2
    bg-[#FFD6D3]
  "
            >
              {/* LEFT */}
              <div className="flex items-center gap-3 ">
                <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center shadow-sm ">
                  <Clock className="w-5 h-5 text-white" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-800 leading-tight ">
                    Bookings Scheduled for Auto Release
                  </h3>
                </div>
                <Badge
                  variant="secondary"
                  className="ml-2 bg-orange-100 text-orange-800 font-semibold text-xs"
                >
                  {underAutoReleaseBookings.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[420px] overflow-y-auto">
              <div className="overflow-x-auto bg-[#FFD6D3]">
                <Table className="bg-transparent">
                  <TableHeader
                    className="
    sticky top-0 z-20
    shadow-md

    bg-gradient-to-b from-[#1F3A5F] to-[#162B46]

    /* BASE TH STYLE */
    [&_th]:relative
    [&_th]:bg-transparent
    [&_th]:text-white
    [&_th]:font-semibold
    [&_th]:text-sm
    [&_th]:uppercase
    [&_th]:tracking-wide
    [&_th]:px-4
    [&_th]:py-3
    [&_th]:text-center

    /* COLUMN DIVIDERS */
    [&_th]:border-r
    [&_th]:border-white/20
    [&_th:last-child]:border-r-0
  "
                  >

                    <TableRow className="border-b-2 border-orange-300">
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Booking Date</TableHead>

                      <TableHead>Guest Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Programme Name</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>

                      <TableHead>Amount</TableHead>
                      <TableHead>Salesperson</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Payment Progress</TableHead>
                      <TableHead>Approval Details</TableHead>
                      <TableHead>Auto Release Reason</TableHead>
                      {/* <TableHead>Accounts Verify Status</TableHead>
                      <TableHead>Front Office PMS Verify Status</TableHead>
                      <TableHead>On Checkout Status</TableHead> */}
                      <TableHead>PI Link</TableHead>
                      <TableHead className="text-center">PI Number</TableHead>
                      <TableHead>Release Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody
                    className="
    [&_tr]:bg-[#FFD6D3]
    [&_tr:hover]:bg-blue-200
    transition-colors duration-150
  "
                  >

                    {underAutoReleaseBookings.map((booking) => (
                      <TableRow key={booking.id} className="opacity-75">
                        <TableCell className="font-medium">{booking.bookingId}</TableCell>
                        <TableCell className="text-sm text-slate-700">{new Date(booking.createdDate || booking.lastUpdated).toLocaleDateString()}</TableCell>

                        <TableCell>{booking.guestName}</TableCell>
                        <TableCell>{booking.mobile ?? booking.mobile ?? "-"}</TableCell>
                        <TableCell>{booking.programmeName}</TableCell>
                        <TableCell>{booking.checkIn}</TableCell>
                        <TableCell>{booking.checkOut}</TableCell>
                        <TableCell className="font-medium">{getCurrencySymbol(String(booking.currency).slice(0, 3))} {booking?.originalAmount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm font-medium">
                              {booking.bookingTakenBy?.split(" ").map((n) => n[0]).join("") || "N/A"}
                            </div>
                            <span className="text-sm">{booking.bookingTakenBy || "Not Assigned"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* {renderStatusBadge( */}
                          {booking.dataSource || ""}
                          {/* )} */}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`${getPaymentStatusBadge(
                                  booking.paymentStatus || booking.paymentStatus
                                )} font-semibold text-xs`}
                              >
                                {(booking.paymentStatus || "")
                                  .toString()
                                  .toUpperCase()
                                  .replace("_", " ")}
                              </Badge>

                              <span className="text-sm font-semibold text-slate-700">
                                {computeReceivedPercentage(
                                  booking.receivedAmount,
                                  booking.amount
                                )}%
                              </span>
                            </div>

                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${booking.paymentStatus === "paid"
                                  ? "bg-gradient-to-r from-green-500 to-green-600"
                                  : booking.paymentStatus === "partial"
                                    ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                    : booking.paymentStatus === "pending"
                                      ? "bg-gradient-to-r from-red-400 to-red-600"
                                      : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                                  }`}
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      computeReceivedPercentage(
                                        booking.receivedAmount,
                                        booking.originalAmount
                                      )
                                    )
                                  )}%`,
                                }}
                              ></div>
                            </div>

                            <p className="text-xs mt-1 font-medium text-gray-700">
                              {getCurrencySymbol(String(booking.currency).slice(0, 3))}{(Number(booking.receivedAmount) || 0).toLocaleString()} / {getCurrencySymbol(String(booking.currency).slice(0, 3))}{(Number(booking.originalAmount) || 0).toLocaleString()}
                            </p>
                            <p className="text-xs mt-1 text-slate-500">
                              <span className="font-medium">Payment Screenshot:</span>{" "}
                              {booking.uploadScreenShot ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-blue-600"
                                  onClick={() => window.open(booking.uploadScreenShot, "_blank")}
                                >
                                  View
                                </Button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </p>
                            <p className="text-xs mt-1 text-slate-500">
                              <span className="font-medium">Payment History:</span>{" "}
                              {Number(booking.receivedAmount) > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPaymentHistoryModal({
                                      bookingId: booking.bookingId,
                                      guestName: booking.guestName,
                                      mobile: booking.mobile || "",
                                    })
                                  }
                                  className="text-blue-600 hover:underline"
                                >
                                  View History
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-700 space-y-1">
                          {/* APPROVAL GIVEN DATE */}
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Upload Date:</span>{" "}
                            {booking.approvalGivenDate
                              ? new Date(booking.approvalGivenDate).toLocaleDateString()
                              : "-"}
                          </div>

                          {/* APPROVED TILL DATE */}
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Approved Till:</span>{" "}
                            {booking.approvedTillDate
                              ? new Date(booking.approvedTillDate).toLocaleDateString()
                              : "-"}
                          </div>

                          {/* screen shot */}

                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Approval Screenshot:</span>
                            {booking.approvalScreenShot ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-600"
                                onClick={() =>
                                  window.open(booking.approvalScreenShot, "_blank")
                                }
                              >
                                View
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}

                          </div>

                        </TableCell>
                        {/* <TableCell>
                          {renderStatusBadge(booking.status ? booking.status.toUpperCase() : "UNKNOWN", "status")}
                        </TableCell> */}
                        <TableCell className="text-sm text-gray-600">
                          {booking?.autoReleaseNotes ? (
                            <span className="font-semibold text-gray-900">
                              {booking.autoReleaseNotes}
                            </span>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>

                        {/* <TableCell
                          className="
    font-bold
    text-sm
    uppercase
    tracking-wide
    bg-orange-50
    border-l-4 border-orange-500
    px-3 py-2
  "
                        >
                          {renderStatusBadge(
                            ["Payment Verified", "Approval Verified", "Booking Cancelled"][Math.floor(Math.random() * 3)],
                            "accounts"
                          )}
                        </TableCell> */}


                        {/* <TableCell
                          className="
    font-bold
    text-sm
    uppercase
    tracking-wide
    bg-blue-50
    border-l-4 border-blue-500
    px-3 py-2
  "
                        >
                          {renderStatusBadge(
                            ["PMS Verified Done", "Booking Cancelled"][Math.floor(Math.random() * 2)],
                            "frontoffice"
                          )}
                        </TableCell> */}


                        {/* <TableCell>
                          {renderStatusBadge(
                            ["Full Payment Received", "Partial Payment", "Booking Cancelled"][Math.floor(Math.random() * 3)],
                            "checkout"
                          )}
                        </TableCell> */}
                        <TableCell>
                          {booking.piLink ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(booking.piLink, "_blank")}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              PI Link
                            </Button>
                          ) :
                            <span className="text-gray-400 text-sm">No PI</span>
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          {booking?.piNumber ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs cursor-default"
                              title="PI Number"
                            >
                              {booking.piNumber}
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {booking.autoReleasedAt ? new Date(booking.autoReleasedAt).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {booking.checkInIdExist === true && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBookingDetailPopup(booking);
                                }}
                                className="h-8 px-2 text-xs flex items-center gap-1 border-blue-200 hover:border-blue-400 bg-white text-blue-700"
                                title="Booking Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>CheckIn Details</span>
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" portal={false}>
                                {/* <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open("https://www.kairali.com/GoogleScript/KTAHV_Reservation_form/", "_blank");
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem> */}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTimeout(() => handleAction("view", booking.id), 0);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {/* <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction("accounts_verify", booking.id);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Accounts Verify
                                </DropdownMenuItem> */}
                                {/* <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction("fo_verify", booking.id);
                                  }}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  FO PMS Verify
                                </DropdownMenuItem> */}
                                {/* <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction("checkout_verify", booking.id);
                                  }}
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  On Checkout Collection Verify
                                </DropdownMenuItem> */}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {underAutoTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 px-3 sm:px-4 py-3 border-t bg-slate-50">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={underAutoCurrentPage === 1}
                    onClick={() =>
                      setUnderAutoCurrentPage((p) => Math.max(1, p - 1))
                    }
                    className="w-full sm:w-auto h-10 sm:h-9"
                  >
                    Previous
                  </Button>

                  <span className="text-xs sm:text-sm font-medium text-slate-700 text-center">
                    Page {underAutoCurrentPage} of {underAutoTotalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={underAutoCurrentPage === underAutoTotalPages}
                    onClick={() =>
                      setUnderAutoCurrentPage((p) =>
                        Math.min(underAutoTotalPages, p + 1)
                      )
                    }
                    className="w-full sm:w-auto h-10 sm:h-9"
                  >
                    Next
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>
        )}
        <div ref={tableRef}>
          <Card className="bg-white border-slate-200 shadow-lg pt-0">
            <CardHeader
              className="
    flex items-center justify-between
    px-5
    py-3
    bg-[#FFE2C2]
  "
            >
              {/* LEFT */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center shadow-sm">
                  <Clock className="w-5 h-5 text-white" />
                </div>

                <div className="flex flex-col justify-center">
                  <h3 className="text-base font-semibold text-slate-800 leading-snug">
                    {/* {hasRole("sales_agent") ? "Pending Sales Verification" :
                      hasRole("account_manager") ? "Pending Accounts Verification" :
                        hasRole("operation_manager") ? "Pending FO/Payment" :
                          "Work Not Done(Pending) - Active PMS Bookings"} */}
                    {"Work Not Done(Pending) - Active PMS Bookings"}
                  </h3>
                </div>

                <Badge
                  variant="secondary"
                  className="
        ml-2
        h-6
        flex items-center
        bg-orange-100
        text-orange-800
        font-semibold
        text-xs
      "
                >
                  {pendingWorkTableBookings.length}
                </Badge>
              </div>

              {/* RIGHT — ROLE-BASED TAB BUTTONS */}
              {(() => {
                const isBothFORoles = hasRole("operation_manager") && hasRole("fo_manager");
                const isSales = hasRole("sales_agent");

                // ACCOUNTS MANAGER
                if (hasRole("account_manager")) {
                  const tabs = [
                    "All",
                    ...(isSales ? ["NewBookings"] : []),
                    "AccountsVerify", "FinalTransFer", "DeleteComplete"
                  ] as PendingWorkTableView[];
                  return (
                    <div className="ml-auto flex items-center gap-2 flex-wrap">
                      {tabs.map((view) => (
                        <Button
                          key={view}
                          type="button"
                          size="sm"
                          variant={pendingWorkTableView === view ? "default" : "outline"}
                          onClick={() => { setPendingWorkTableView(view); setCurrentPage(1); }}
                          className="h-8 px-3 text-xs"
                        >
                          {view === "All" ? "All" :
                            view === "NewBookings" ? "New Bookings" :
                              view === "AccountsVerify" ? "Accounts Verify" :
                                view === "FinalTransFer" ? "Final Transfer" :
                                  "Delete / Complete"}
                        </Button>
                      ))}
                    </div>
                  );
                }

                // FO + CHECKOUT combined
                if (isBothFORoles) {
                  const tabs = [
                    "All",
                    ...(isSales ? ["NewBookings"] : []),
                    "AccountsVerify", "FinalTransFer", "CheckoutVerify"
                  ] as CombinedFOTabView[];
                  return (
                    <div className="ml-auto flex items-center gap-2 flex-wrap">
                      {tabs.map((view) => (
                        <Button
                          key={view}
                          type="button"
                          size="sm"
                          variant={combinedFOTabView === view ? "default" : "outline"}
                          onClick={() => { setCombinedFOTabView(view); setCurrentPage(1); }}
                          className="h-8 px-3 text-xs"
                        >
                          {view === "All" ? "All" :
                            view === "NewBookings" ? "New Bookings" :
                              view === "AccountsVerify" ? "Accounts Verify" :
                                view === "FinalTransFer" ? "Final Transfer" :
                                  "Checkout Verify"}
                        </Button>
                      ))}
                    </div>
                  );
                }

                // FO ONLY
                if (hasRole("operation_manager")) {
                  const tabs = [
                    "All",
                    ...(isSales ? ["NewBookings"] : []),
                    "AccountsVerify", "FinalTransFer"
                  ] as FOPendingWorkTableView[];
                  return (
                    <div className="ml-auto flex items-center gap-2 flex-wrap">
                      {tabs.map((view) => (
                        <Button
                          key={view}
                          type="button"
                          size="sm"
                          variant={foPendingWorkTableView === view ? "default" : "outline"}
                          onClick={() => { setFOPendingWorkTableView(view); setCurrentPage(1); }}
                          className="h-8 px-3 text-xs"
                        >
                          {view === "All" ? "All" :
                            view === "NewBookings" ? "New Bookings" :
                              view === "AccountsVerify" ? "Accounts Verify" :
                                "Final Transfer"}
                        </Button>
                      ))}
                    </div>
                  );
                }

                // CHECKOUT ONLY — single stage, no sub-tabs
                return null;
              })()}
            </CardHeader>

            <CardContent className="p-0 bg-[#FFD4A3]">
              <div className="overflow-x-auto bg-[#FFE2C2]" onScroll={(e) => setTable1Scrolled(e.currentTarget.scrollLeft > 0)}>
                <Table className="bg-transparent" style={bookingStickyTableStyle}>
                  <TableHeader
                    className="
    sticky top-0 z-20
    shadow-sm
    bg-gradient-to-b from-[#1F3A5F] to-[#182F4D]

    /* BASE TH STYLE */
    [&_th]:relative
    [&_th]:bg-transparent
    [&_th]:text-white
    [&_th]:font-semibold
    [&_th]:text-[11px]
    sm:[&_th]:text-[13px]
    [&_th]:uppercase
    [&_th]:tracking-wider
    [&_th]:px-2
    [&_th]:py-2
    sm:[&_th]:px-4
    sm:[&_th]:py-3
    [&_th]:text-center
    [&_th]:whitespace-nowrap

    /* ❌ NO HOVER ON TH (IMPORTANT) */
    /* hover handled inside content div only */

    [&_th]:transition-colors
    [&_th]:duration-150

    /* COLUMN DIVIDERS */
    [&_th]:border-r
    [&_th]:border-white/15
    [&_th:last-child]:border-r-0
  "
                  >



                    <TableRow className="select-none">

                      {/* Booking Date */}
                      <TableHead
                        onClick={() => handleSort("createdDate")}
                        style={getStickyHeaderCellStyle(table1Scrolled, "bookingDate", false, 32)}
                      >
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Booking Date
                          <SortIcon field="createdDate" />
                        </div>
                      </TableHead>

                      {/* Booking ID */}
                      <TableHead
                        onClick={() => handleSort("bookingId")}
                        style={getStickyHeaderCellStyle(table1Scrolled, "bookingId", false, 31)}
                      >
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Booking ID
                          <SortIcon field="bookingId" />
                        </div>
                      </TableHead>

                      {/* Guest Name */}
                      <TableHead
                        onClick={() => handleSort("guestName")}
                        style={getStickyHeaderCellStyle(table1Scrolled, "guestName", true, 30)}
                      >
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Guest Name
                          <SortIcon field="guestName" />
                        </div>
                      </TableHead>

                      <TableHead>Mobile</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Room Details</TableHead>

                      {/* Programme */}
                      <TableHead onClick={() => handleSort("programmeName")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Programme
                          <SortIcon field="programmeName" />
                        </div>
                      </TableHead>

                      {/* Stay Status (derived → checkIn) */}
                      <TableHead onClick={() => handleSort("checkIn")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Stay Status
                          <SortIcon field="checkIn" />
                        </div>
                      </TableHead>

                      <TableHead>Days of Stay</TableHead>

                      {/* Check In / Out */}
                      <TableHead onClick={() => handleSort("checkIn")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Check In / Out
                          <SortIcon field="checkIn" />
                        </div>
                      </TableHead>

                      {/* Amount */}
                      <TableHead onClick={() => handleSort("amount")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Amount
                          <SortIcon field="amount" />
                        </div>
                      </TableHead>

                      <TableHead>Discount %</TableHead>
                      <TableHead className="text-center">Last PI Link</TableHead>
                      <TableHead className="text-center">PI Number</TableHead>
                      <TableHead>Payment Progress</TableHead>
                      <TableHead>Approval Details</TableHead>
                      {/* <TableHead>Approval Screenshot</TableHead> */}
                      <TableHead>Booking Status</TableHead>

                      {/* Booking Type */}
                      <TableHead onClick={() => handleSort("bookingType")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Booking Type
                          <SortIcon field="bookingType" />
                        </div>
                      </TableHead>

                      {/* Booking Source */}
                      <TableHead onClick={() => handleSort("bSource" as keyof Booking)}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Booking Source
                          <SortIcon field="bSource" />
                        </div>
                      </TableHead>

                      {/* Salesperson */}
                      <TableHead onClick={() => handleSort("assignedTo")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Salesperson
                          <SortIcon field="assignedTo" />
                        </div>
                      </TableHead>

                      {/* Data Source */}
                      <TableHead onClick={() => handleSort("dataSource")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Data Source
                          <SortIcon field="dataSource" />
                        </div>
                      </TableHead>

                      <TableHead className="text-center">Verification Status</TableHead>
                      <TableHead className="text-center">Time Delay</TableHead>
                      <TableHead className="text-center">PI History Link</TableHead>
                      <TableHead className="text-center">Actions</TableHead>

                    </TableRow>
                  </TableHeader>

                  <TableBody
                    className="
    [&_tr]:bg-[#FFE2C2]
    [&_tr:hover]:bg-blue-200
    transition-colors duration-150
  "
                  >






                    {displayedBookings.map((booking, index) => (
                      <TableRow
                        key={booking.id}
                        className="border-slate-200 transition-colors hover:bg-slate-100"
                      >
                        <TableCell
                          className="text-sm text-slate-700"
                          style={getStickyBodyCellStyle(table1Scrolled, "bookingDate", "#FFE2C2", false, 22)}
                        >
                          {new Date(booking.createdDate || booking.lastUpdated).toLocaleDateString()}
                        </TableCell>
                        <TableCell
                          className="font-semibold text-primary"
                          style={getStickyBodyCellStyle(table1Scrolled, "bookingId", "#FFE2C2", false, 21)}
                        >
                          {booking.bookingId}
                        </TableCell>
                        <TableCell
                          className="font-medium text-slate-900"
                          style={getStickyBodyCellStyle(table1Scrolled, "guestName", "#FFE2C2", true, 20)}
                        >
                          {formatGuestName(booking.guestName, table1Scrolled)}
                        </TableCell>
                        <TableCell className="text-slate-700 space-y-1">
                          {/* MOBILE */}
                          <div className="font-medium">
                            {booking.mobile ||
                              booking.mobile ||
                              booking.phone ||
                              booking.phoneNumber ||
                              booking.mobileNo ||
                              booking.guestMobile ||
                              "-"}
                          </div>

                          {/* EMAIL */}
                          {booking.email && (
                            <div className="text-xs text-slate-500">
                              {booking.email}
                            </div>
                          )}
                        </TableCell>



                        <TableCell className="text-slate-700">
                          {booking.country || booking.nationality || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-900">
                              {booking.roomNumber}
                            </div>

                            <div className="text-sm text-slate-600">
                              {booking.roomType}
                            </div>

                            <div className="text-sm text-slate-500">
                              {booking.roomCategory}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-slate-700">{booking.programmeName}</TableCell>
                        {/* NEW — Stay Status */}
                        <TableCell className="text-slate-700 font-semibold">
                          {(() => {
                            const s = getStayingStatus(booking);

                            if (s === "upcoming")
                              return <span className="text-blue-600">Upcoming</span>;

                            if (s === "staying")
                              return <span className="text-green-600">Staying</span>;

                            if (s === "checkedout")
                              return <span className="text-red-600">Checked Out</span>;

                            return <span className="text-gray-500">Unknown</span>;
                          })()}
                        </TableCell>


                        {/* NEW — Days of Stay */}
                        <TableCell className="text-slate-700">
                          {booking.checkIn && booking.checkOut
                            ? Math.ceil(
                              (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
                              (1000 * 60 * 60 * 24)
                            )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-600 font-medium">In:</span>
                              <span className="text-slate-700">{new Date(booking.checkIn).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-red-600 font-medium">Out:</span>
                              <span className="text-slate-700">{new Date(booking.checkOut).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">{getCurrencySymbol(String(booking.currency).slice(0, 3))}{booking?.originalAmount?.toLocaleString()}</TableCell>
                        {/* NEW — Discount % */}
                        <TableCell className="font-semibold text-blue-700">
                          {booking.discountPercent !== null && booking.discountPercent !== undefined
                            ? `${Number(booking.discountPercent)}%`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {booking.piLink ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(booking.piLink, "_blank")}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              PI
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">No PI</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {booking?.piNumber ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs cursor-default"
                              title="PI Number"
                            >
                              {booking.piNumber}
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`${getPaymentStatusBadge(
                                  booking.paymentStatus || booking.paymentStatus
                                )} font-semibold text-xs`}
                              >
                                {(booking.paymentStatus || "")
                                  .toString()
                                  .toUpperCase()
                                  .replace("_", " ")}
                              </Badge>

                              <span className="text-sm font-semibold text-slate-700">
                                {computeReceivedPercentage(
                                  booking.receivedAmount,
                                  booking.originalAmount
                                )}%
                              </span>
                            </div>

                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${booking.paymentStatus === "paid"
                                  ? "bg-gradient-to-r from-green-500 to-green-600"
                                  : booking.paymentStatus === "partial"
                                    ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                    : booking.paymentStatus === "pending"
                                      ? "bg-gradient-to-r from-red-400 to-red-600"
                                      : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                                  }`}
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      computeReceivedPercentage(
                                        booking.receivedAmount,
                                        booking.originalAmount
                                      )
                                    )
                                  )}%`,
                                }}
                              ></div>
                            </div>

                            <p className="text-xs mt-1 font-medium text-gray-700">
                              {getCurrencySymbol(String(booking.currency).slice(0, 3))}{(Number(booking.receivedAmount) || 0).toLocaleString()} / {getCurrencySymbol(String(booking.currency).slice(0, 3))}{(Number(booking.originalAmount) || 0).toLocaleString()}
                            </p>
                            <p className="text-xs mt-1 text-slate-500">
                              <span className="font-medium">Payment Screenshot:</span>{" "}
                              {booking.uploadScreenShot ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-blue-600"
                                  onClick={() => window.open(booking.uploadScreenShot, "_blank")}
                                >
                                  View
                                </Button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </p>
                            <p className="text-xs mt-1 text-slate-500">
                              <span className="font-medium">Payment History:</span>{" "}
                              {Number(booking.receivedAmount) > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPaymentHistoryModal({
                                      bookingId: booking.bookingId,
                                      guestName: booking.guestName,
                                      mobile: booking.mobile || "",
                                    })
                                  }
                                  className="text-blue-600 hover:underline"
                                >
                                  View History
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-700 space-y-1">
                          {/* APPROVAL GIVEN DATE */}
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Upload Date:</span>{" "}
                            {booking.approvalGivenDate
                              ? new Date(booking.approvalGivenDate).toLocaleDateString()
                              : "-"}
                          </div>

                          {/* APPROVED TILL DATE */}
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Approved Till:</span>{" "}
                            {booking.approvedTillDate
                              ? new Date(booking.approvedTillDate).toLocaleDateString()
                              : "-"}
                          </div>

                          {/* screen shot */}

                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Approval Screenshot:</span>
                            {booking.approvalScreenShot ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-600"
                                onClick={() =>
                                  window.open(booking.approvalScreenShot, "_blank")
                                }
                              >
                                View
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}

                          </div>

                        </TableCell>


                        {/* <TableCell className="text-center">
                          {booking.approvalScreenShot ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-blue-600"
                              onClick={() =>
                                window.open(booking.approvalScreenShot, "_blank")
                              }
                            >
                              View
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </TableCell> */}
                        <TableCell>
                          <Badge className={`${getStatusBadge(booking.verfiedOrNot)} font-semibold`}>
                            {booking.verfiedOrNot || "Pending"}
                          </Badge>
                        </TableCell>
                        {/* Booking Type */}
                        <TableCell className="text-slate-700 font-medium">
                          {booking.bookingType || booking.type || "Individual"}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">
                          {booking.bSource || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="
        w-10 h-10
        rounded-full
        flex items-center justify-center
        text-white text-sm font-semibold
        bg-gradient-to-br from-indigo-500 to-blue-600
        shadow-md ring-2 ring-white
      "
                            >
                              {booking.assignedTo
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>

                            <div>
                              <div className="font-medium text-slate-900">
                                {booking.assignedTo}
                              </div>
                              <div className="text-xs text-slate-500">
                                Sales Executive
                              </div>
                            </div>
                          </div>
                        </TableCell>


                        <TableCell className="font-medium text-slate-700">
                          {booking.dataSource || "-"}
                        </TableCell>
                        <TableCell className="text-center space-y-2">
                          <div>{renderStatusBadge(booking?.editActionStatus, "sales")}</div>
                          <div>{renderStatusBadge(booking.accountsVerifyStatus, "accounts")}</div>
                          <div>{renderStatusBadge(booking.frontOfficeStatus, "frontoffice")}</div>
                          {new Date(booking.checkIn) <= new Date(new Date().setHours(0, 0, 0, 0)) && (
                            <div>{renderStatusBadge(booking.paymentSettlementStatus, "checkout payment")}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center space-y-2">
                          <div>{renderStatusBadgeForDelay(booking?.doerDelay, booking?.editActionStatus)}</div>
                          <div>{renderStatusBadgeForDelay(booking?.accountsDelay, booking?.accountsVerifyStatus)}</div>
                          <div>{renderStatusBadgeForDelay(booking?.foDelay, booking?.frontOfficeStatus)}</div>
                          {new Date(booking.checkIn) <= new Date(new Date().setHours(0, 0, 0, 0)) && (
                            <div>{renderStatusBadgeForDelay(booking?.paymentDelay, booking?.paymentSettlementStatus)}</div>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {booking.piHistoryLink ? (
                            <button
                              type="button"
                              onClick={() =>
                                setInvoiceHistoryModal({
                                  bookingId: booking.bookingId,
                                  guestName: booking.guestName,
                                  mobile: booking.mobile || "",
                                })
                              }
                              className="text-blue-600 hover:underline"
                            >
                              View History
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">No History</span>
                          )}
                        </TableCell>

                        {/* In the Active PMS Bookings table - Actions column */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isCheckInPastOrToday(booking.checkIn) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBookingDetailPopup(booking);
                                }}
                                className="h-8 px-2 text-xs flex items-center gap-1 border-blue-200 hover:border-blue-400 bg-white text-blue-700"
                                title="Booking Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>CheckIn Details</span>
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-slate-100 transition-colors"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-56 bg-white border border-slate-200 shadow-lg rounded-lg"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleAction("edit", booking.id, booking)}
                                  disabled={!canUserPerformAction(booking, "edit")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "edit")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <Edit className="h-4 w-4 text-blue-600" />
                                  <span className="text-slate-700">Edit Booking</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAction("view", booking.id)}
                                  disabled={!canUserPerformAction(booking, "view")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "view")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <Eye className="h-4 w-4 text-emerald-600" />
                                  <span className="text-slate-700">View Details</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 border-slate-200" />
                                <DropdownMenuItem
                                  onClick={() => handleAction("verify_accounts", booking.id)}
                                  disabled={!canUserPerformAction(booking, "verify_accounts")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "verify_accounts")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-slate-700">Accounts Verify</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAction("verify_fo", booking.id)}
                                  disabled={!canUserPerformAction(booking, "verify_fo")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "verify_fo")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <Building className="h-4 w-4 text-purple-600" />
                                  <span className="text-slate-700">FO PMS Verify</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAction("verify_checkout", booking.id)}
                                  disabled={!canUserPerformAction(booking, "verify_checkout")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "verify_checkout")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <CreditCard className="h-4 w-4 text-orange-600" />
                                  <span className="text-slate-700">Checkout Verify</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 border-slate-200" />
                                <DropdownMenuItem
                                  onClick={() => handleAction("payment_upload", booking.id)}
                                  disabled={!canUserPerformAction(booking, "payment_upload")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "payment_upload")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <Upload className="h-4 w-4 text-cyan-600" />
                                  <span className="text-slate-700">Upload Payment</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleAction("approval_upload", booking.id)}
                                  disabled={!canUserPerformAction(booking, "approval_upload") || !booking.isEditedOneTime || isCheckInPastOrToday(booking.checkIn)}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "approval_upload")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <Upload className="h-4 w-4 mr-2 text-purple-600" />
                                  Upload Approval
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleAction("cancel", booking.id)}
                                  disabled={!canUserPerformAction(booking, "cancel")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "cancel")
                                    ? "hover:bg-red-50 text-red-600"
                                    : "opacity-50 cursor-not-allowed text-red-400"
                                    }`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Cancel Booking</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 border-slate-200" />
                                <DropdownMenuItem
                                  onClick={() => handleAction("arrival_flight", booking.id, booking)}
                                  disabled={!canUserPerformAction(booking, "arrival_flight")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "arrival_flight")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <Upload className="h-4 w-4 text-indigo-600" />
                                  <span className="text-slate-700">Arrival Flight Details & Ticket Upload</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleAction("departure_flight", booking.id, booking)}
                                  disabled={!canUserPerformAction(booking, "departure_flight")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "departure_flight")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <Upload className="h-4 w-4 text-indigo-600" />
                                  <span className="text-slate-700">Departure Flight Details & Ticket Upload</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination controls */}
                <div className="px-4 py-3 border-t border-slate-100 bg-white">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    {/* Showing records text */}
                    <div className="text-sm text-slate-600 text-center sm:text-left">
                      Showing {Math.min(startIndex + 1, pendingWorkTableBookings.length)}–
                      {Math.min(startIndex + displayedBookings.length, pendingWorkTableBookings.length)} of {pendingWorkTableBookings.length} records
                    </div>

                    {/* Right controls */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">

                      {/* Rows per page dropdown */}
                      <BookingRowsPerPageSelect
                        value={itemsPerPage}
                        onChange={(size) => { setItemsPerPage(size); setCurrentPage(1) }}
                      />

                      {/* Pagination controls */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2 sm:gap-2 w-full sm:w-auto">

                        <Button size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage <= 1}>
                          First
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                          Prev
                        </Button>
                        <div className="px-3 text-sm text-slate-700 w-full sm:w-auto text-center">
                          Page {currentPage} of {totalPages}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                          Next
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}>
                          Last
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>


              </div>
            </CardContent>
          </Card>
        </div>

        {/* WORK DONE / COMPLETED BOOKINGS TABLE */}
        <div>
          <Card className="bg-white border-slate-200 shadow-lg pt-0">
            <CardHeader
              className="
    flex items-center justify-between
    px-5
    py-3
    bg-[#DCFCE5]
  "
            >
              {/* LEFT */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center shadow-sm">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>

                <div className="flex flex-col justify-center">
                  <h3 className="text-base font-semibold text-slate-800 leading-snug">
                    {/* {hasRole("sales_agent") ? "Sales Verified" :
                      hasRole("account_manager") ? "Accounts Verified" :
                        hasRole("operation_manager") ? "FO/Payment Done" :
                          "Work Done - Active PMS Bookings"} */}
                    {"Work Done - Active PMS Bookings"}
                  </h3>
                </div>

                <Badge
                  variant="secondary"
                  className="
        ml-2
        h-6
        flex items-center
        bg-green-100
        text-green-800
        font-semibold
        text-xs
      "
                >
                  {completedWorkBookings.length}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto bg-[#DCFCE5]">
                <Table className="bg-transparent" style={bookingStickyTableStyle}>
                  <TableHeader
                    className="
    sticky top-0 z-20
    shadow-sm
    bg-gradient-to-b from-[#1F3A5F] to-[#182F4D]

    /* BASE TH STYLE */
    [&_th]:relative
    [&_th]:bg-transparent
    [&_th]:text-white
    [&_th]:font-semibold
    [&_th]:text-[11px]
    sm:[&_th]:text-[13px]
    [&_th]:uppercase
    [&_th]:tracking-wider
    [&_th]:px-2
    [&_th]:py-2
    sm:[&_th]:px-4
    sm:[&_th]:py-3
    [&_th]:text-center
    [&_th]:whitespace-nowrap

    /* ❌ NO HOVER ON TH (IMPORTANT) */
    /* hover handled inside content div only */

    [&_th]:transition-colors
    [&_th]:duration-150

    /* COLUMN DIVIDERS */
    [&_th]:border-r
    [&_th]:border-white/15
    [&_th:last-child]:border-r-0
  "
                  >



                    <TableRow className="select-none">

                      {/* Booking Date */}
                      <TableHead
                        onClick={() => handleSort("createdDate")}
                        style={getStickyHeaderCellStyle(table2Scrolled, "bookingDate", false, 32)}
                      >
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Booking Date
                          <SortIcon field="createdDate" />
                        </div>
                      </TableHead>

                      {/* Booking ID */}
                      <TableHead
                        onClick={() => handleSort("bookingId")}
                        style={getStickyHeaderCellStyle(table2Scrolled, "bookingId", false, 31)}
                      >
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Booking ID
                          <SortIcon field="bookingId" />
                        </div>
                      </TableHead>

                      {/* Guest Name */}
                      <TableHead
                        onClick={() => handleSort("guestName")}
                        style={getStickyHeaderCellStyle(table2Scrolled, "guestName", true, 30)}
                      >
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Guest Name
                          <SortIcon field="guestName" />
                        </div>
                      </TableHead>

                      <TableHead>Mobile</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Room Details</TableHead>

                      {/* Programme */}
                      <TableHead onClick={() => handleSort("programmeName")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Programme
                          <SortIcon field="programmeName" />
                        </div>
                      </TableHead>

                      {/* Stay Status (derived → checkIn) */}
                      <TableHead onClick={() => handleSort("checkIn")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Stay Status
                          <SortIcon field="checkIn" />
                        </div>
                      </TableHead>

                      <TableHead>Days of Stay</TableHead>

                      {/* Check In / Out */}
                      <TableHead onClick={() => handleSort("checkIn")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Check In / Out
                          <SortIcon field="checkIn" />
                        </div>
                      </TableHead>

                      {/* Amount */}
                      <TableHead onClick={() => handleSort("amount")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Amount
                          <SortIcon field="amount" />
                        </div>
                      </TableHead>

                      <TableHead>Discount %</TableHead>
                      <TableHead className="text-center">Last PI Link</TableHead>
                      <TableHead className="text-center">PI Number</TableHead>
                      <TableHead>Payment Progress</TableHead>
                      <TableHead>Approval Details</TableHead>
                      {/* <TableHead>Approval Screenshot</TableHead> */}
                      <TableHead>Booking Status</TableHead>

                      {/* Booking Type */}
                      <TableHead onClick={() => handleSort("bookingType")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Booking Type
                          <SortIcon field="bookingType" />
                        </div>
                      </TableHead>

                      {/* Booking Source */}
                      <TableHead onClick={() => handleSort("bSource" as keyof Booking)}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Booking Source
                          <SortIcon field="bSource" />
                        </div>
                      </TableHead>

                      {/* Salesperson */}
                      <TableHead onClick={() => handleSort("assignedTo")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Salesperson
                          <SortIcon field="assignedTo" />
                        </div>
                      </TableHead>

                      {/* Data Source */}
                      <TableHead onClick={() => handleSort("dataSource")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Data Source
                          <SortIcon field="dataSource" />
                        </div>
                      </TableHead>

                      <TableHead className="text-center">Verification Status</TableHead>
                      <TableHead className="text-center">Time Delay</TableHead>
                      <TableHead className="text-center">PI History Link</TableHead>
                      <TableHead className="text-center">Actions</TableHead>

                    </TableRow>
                  </TableHeader>

                  <TableBody
                    className="
    [&_tr]:bg-[#dcfce5]
    [&_tr:hover]:bg-blue-200
    transition-colors duration-150
    
  "
                  >






                    {displayedCompletedBookings.map((booking, index) => (

                      <TableRow
                        key={booking.id}
                        className="border-slate-200 transition-colors hover:bg-slate-100"
                      >
                        <TableCell
                          className="text-sm text-slate-700"
                          style={getStickyBodyCellStyle(table2Scrolled, "bookingDate", "#DCFCE5", false, 22)}
                        >
                          {new Date(booking.createdDate || booking.lastUpdated).toLocaleDateString()}
                        </TableCell>
                        <TableCell
                          className="font-semibold text-primary"
                          style={getStickyBodyCellStyle(table2Scrolled, "bookingId", "#DCFCE5", false, 21)}
                        >
                          {booking.bookingId}
                        </TableCell>
                        <TableCell
                          className="font-medium text-slate-900"
                          style={getStickyBodyCellStyle(table2Scrolled, "guestName", "#DCFCE5", true, 20)}
                        >
                          {formatGuestName(booking.guestName, table2Scrolled)}
                        </TableCell>
                        <TableCell className="text-slate-700 space-y-1">
                          {/* MOBILE */}
                          <div className="font-medium">
                            {booking.mobile ||
                              booking.mobile ||
                              booking.phone ||
                              booking.phoneNumber ||
                              booking.mobileNo ||
                              booking.guestMobile ||
                              "-"}
                          </div>

                          {/* EMAIL */}
                          {booking.email && (
                            <div className="text-xs text-slate-500">
                              {booking.email}
                            </div>
                          )}
                        </TableCell>



                        <TableCell className="text-slate-700">
                          {booking.country || booking.nationality || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-900">
                              {booking.roomNumber}
                            </div>

                            <div className="text-sm text-slate-600">
                              {booking.roomType}
                            </div>

                            <div className="text-sm text-slate-500">
                              {booking.roomCategory}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-slate-700">{booking.programmeName}</TableCell>
                        {/* NEW — Stay Status */}
                        <TableCell className="text-slate-700 font-semibold">
                          {(() => {
                            const s = getStayingStatus(booking);

                            if (s === "upcoming")
                              return <span className="text-blue-600">Upcoming</span>;

                            if (s === "staying")
                              return <span className="text-green-600">Staying</span>;

                            if (s === "checkedout")
                              return <span className="text-red-600">Checked Out</span>;

                            return <span className="text-gray-500">Unknown</span>;
                          })()}
                        </TableCell>


                        {/* NEW — Days of Stay */}
                        <TableCell className="text-slate-700">
                          {booking.checkIn && booking.checkOut
                            ? Math.ceil(
                              (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
                              (1000 * 60 * 60 * 24)
                            )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-600 font-medium">In:</span>
                              <span className="text-slate-700">{new Date(booking.checkIn).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-red-600 font-medium">Out:</span>
                              <span className="text-slate-700">{new Date(booking.checkOut).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">{getCurrencySymbol(String(booking.currency).slice(0, 3))}{booking.originalAmount?.toLocaleString()}</TableCell>
                        {/* NEW — Discount % */}
                        <TableCell className="font-semibold text-blue-700">
                          {booking.discountPercent !== null && booking.discountPercent !== undefined
                            ? `${Number(booking.discountPercent)}%`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {booking.piLink ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(booking.piLink, "_blank")}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              PI
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">No PI</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {booking?.piNumber ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs cursor-default"
                              title="PI Number"
                            >
                              {booking.piNumber}
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>


                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`${getPaymentStatusBadge(
                                  booking.paymentStatus || booking.paymentStatus
                                )} font-semibold text-xs`}
                              >
                                {(booking.paymentStatus || "")
                                  .toString()
                                  .toUpperCase()
                                  .replace("_", " ")}
                              </Badge>

                              <span className="text-sm font-semibold text-slate-700">
                                {computeReceivedPercentage(
                                  booking.receivedAmount,
                                  booking.originalAmount
                                )}%
                              </span>
                            </div>

                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${booking.paymentStatus === "paid"
                                  ? "bg-gradient-to-r from-green-500 to-green-600"
                                  : booking.paymentStatus === "partial"
                                    ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                    : booking.paymentStatus === "pending"
                                      ? "bg-gradient-to-r from-red-400 to-red-600"
                                      : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                                  }`}
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      computeReceivedPercentage(
                                        booking.receivedAmount,
                                        booking.originalAmount
                                      )
                                    )
                                  )}%`,
                                }}
                              ></div>
                            </div>

                            <p className="text-xs mt-1 font-medium text-gray-700">
                              {getCurrencySymbol(String(booking.currency).slice(0, 3))}{(Number(booking.receivedAmount) || 0).toLocaleString()} / {getCurrencySymbol(String(booking.currency).slice(0, 3))}{(Number(booking.originalAmount) || 0).toLocaleString()}
                            </p>
                            <p className="text-xs mt-1 text-slate-500">
                              <span className="font-medium">Payment Screenshot:</span>{" "}
                              {booking.uploadScreenShot ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-blue-600"
                                  onClick={() => window.open(booking.uploadScreenShot, "_blank")}
                                >
                                  View
                                </Button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </p>
                            <p className="text-xs mt-1 text-slate-500">
                              <span className="font-medium">Payment History:</span>{" "}
                              {Number(booking.receivedAmount) > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPaymentHistoryModal({
                                      bookingId: booking.bookingId,
                                      guestName: booking.guestName,
                                      mobile: booking.mobile || "",
                                    })
                                  }
                                  className="text-blue-600 hover:underline"
                                >
                                  View History
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-700 space-y-1">
                          {/* APPROVAL GIVEN DATE */}
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Upload Date:</span>{" "}
                            {booking.approvalGivenDate
                              ? new Date(booking.approvalGivenDate).toLocaleDateString()
                              : "-"}
                          </div>

                          {/* APPROVED TILL DATE */}
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Approved Till:</span>{" "}
                            {booking.approvedTillDate
                              ? new Date(booking.approvedTillDate).toLocaleDateString()
                              : "-"}
                          </div>

                          {/* screenshot  */}

                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Approval Screenshot:</span>{" "}
                            {booking.approvalScreenShot ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-600"
                                onClick={() =>
                                  window.open(booking.approvalScreenShot, "_blank")
                                }
                              >
                                View
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </div>
                        </TableCell>
                        {/* <TableCell className="text-center">
                          {booking.approvalScreenShot ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-blue-600"
                              onClick={() =>
                                window.open(booking.approvalScreenShot, "_blank")
                              }
                            >
                              View
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </TableCell> */}
                        <TableCell>
                          <Badge className={`${getStatusBadge(booking.verfiedOrNot)} font-semibold`}>
                            {booking.verfiedOrNot || "Pending"}
                          </Badge>
                        </TableCell>
                        {/* Booking Type */}
                        <TableCell className="text-slate-700 font-medium">
                          {booking.bookingType || booking.type || "Individual"}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">
                          {booking.bSource || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="
        w-10 h-10
        rounded-full
        flex items-center justify-center
        text-white text-sm font-semibold
        bg-gradient-to-br from-indigo-500 to-blue-600
        shadow-md ring-2 ring-white
      "
                            >
                              {booking.assignedTo
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>

                            <div>
                              <div className="font-medium text-slate-900">
                                {booking.assignedTo}
                              </div>
                              <div className="text-xs text-slate-500">
                                Sales Executive
                              </div>
                            </div>
                          </div>
                        </TableCell>


                        <TableCell className="font-medium text-slate-700">
                          {booking.dataSource || "-"}
                        </TableCell>
                        <TableCell className="text-center space-y-2">
                          <div>{renderStatusBadge(booking?.editActionStatus, "sales")}</div>
                          <div>{renderStatusBadge(booking.accountsVerifyStatus, "accounts")}</div>
                          <div>{renderStatusBadge(booking.frontOfficeStatus, "frontoffice")}</div>
                          {new Date(booking.checkIn) <= new Date(new Date().setHours(0, 0, 0, 0)) && (
                            <div>{renderStatusBadge(booking.paymentSettlementStatus, "checkout payment")}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center space-y-2">
                          <div>{renderStatusBadgeForDelay(booking?.doerDelay, booking?.editActionStatus)}</div>
                          <div>{renderStatusBadgeForDelay(booking?.accountsDelay, booking?.accountsVerifyStatus)}</div>
                          <div>{renderStatusBadgeForDelay(booking?.foDelay, booking?.frontOfficeStatus)}</div>
                          {new Date(booking.checkIn) <= new Date(new Date().setHours(0, 0, 0, 0)) && (
                            <div>{renderStatusBadgeForDelay(booking?.paymentDelay, booking?.paymentSettlementStatus)}</div>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {booking.piHistoryLink ? (
                            <button
                              type="button"
                              onClick={() =>
                                setInvoiceHistoryModal({
                                  bookingId: booking.bookingId,
                                  guestName: booking.guestName,
                                  mobile: booking.mobile || "",
                                })
                              }
                              className="text-blue-600 hover:underline"
                            >
                              View History
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">No History</span>
                          )}
                        </TableCell>

                        {/* In the Active PMS Bookings table - Actions column */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isCheckInPastOrToday(booking.checkIn) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBookingDetailPopup(booking);
                                }}
                                className="h-8 px-2 text-xs flex items-center gap-1 border-blue-200 hover:border-blue-400 bg-white text-blue-700"
                                title="Booking Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>CheckIn Details</span>
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-slate-100 transition-colors"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-56 bg-white border border-slate-200 shadow-lg rounded-lg"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleAction("edit", booking.id, booking)}
                                  disabled={!canUserPerformAction(booking, "edit")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "edit")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <Edit className="h-4 w-4 text-blue-600" />
                                  <span className="text-slate-700">Edit Booking</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAction("view", booking.id)}
                                  disabled={!canUserPerformAction(booking, "view")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "view")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <Eye className="h-4 w-4 text-emerald-600" />
                                  <span className="text-slate-700">View Details</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 border-slate-200" />
                                {/* Work Done table — all actions disabled, only View Details enabled */}
                                <DropdownMenuItem
                                  disabled
                                  className="flex items-center gap-2 px-3 py-2 opacity-40 cursor-not-allowed"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-slate-700">Accounts Verify</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled
                                  className="flex items-center gap-2 px-3 py-2 opacity-40 cursor-not-allowed"
                                >
                                  <Building className="h-4 w-4 text-purple-600" />
                                  <span className="text-slate-700">FO PMS Verify</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled
                                  className="flex items-center gap-2 px-3 py-2 opacity-40 cursor-not-allowed"
                                >
                                  <CreditCard className="h-4 w-4 text-orange-600" />
                                  <span className="text-slate-700">Checkout Verify</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 border-slate-200" />
                                <DropdownMenuItem
                                  disabled={getStayingStatus(booking) === "checkedout" || !canUserPerformAction(booking, "payment_upload")}
                                  className={`flex items-center gap-2 px-3 py-2 ${getStayingStatus(booking) === "checkedout" ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"
                                    }`}
                                  onClick={() => handleAction("payment_upload", booking.id)}   // add your handler
                                >
                                  <Upload className="h-4 w-4 text-cyan-600" />
                                  <span className="text-slate-700">Upload Payment</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  disabled={getStayingStatus(booking) === "checkedout" || !canUserPerformAction(booking, "approval_upload") || !booking.isEditedOneTime || isCheckInPastOrToday(booking.checkIn)}
                                  className={`flex items-center gap-2 px-3 py-2 ${getStayingStatus(booking) === "checkedout" ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"
                                    }`}
                                  onClick={() => handleAction("approval_upload", booking.id)}  // add your handler
                                >
                                  <Upload className="h-4 w-4 mr-2 text-purple-600" />
                                  Upload Approval
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  disabled
                                  className="flex items-center gap-2 px-3 py-2 opacity-40 cursor-not-allowed text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Cancel Booking</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 border-slate-200" />
                                <DropdownMenuItem
                                  onClick={() => handleAction("arrival_flight", booking.id, booking)}
                                  disabled={!canUserPerformAction(booking, "arrival_flight")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "arrival_flight")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <Upload className="h-4 w-4 text-indigo-600" />
                                  <span className="text-slate-700">Arrival Flight Details & Ticket Upload</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleAction("departure_flight", booking.id, booking)}
                                  disabled={!canUserPerformAction(booking, "departure_flight")}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${canUserPerformAction(booking, "departure_flight")
                                    ? "hover:bg-slate-50"
                                    : "opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  <Upload className="h-4 w-4 text-indigo-600" />
                                  <span className="text-slate-700">Departure Flight Details & Ticket Upload</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination controls */}
                <div className="px-4 py-3 border-t border-slate-100 bg-white">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    {/* Showing text */}
                    <div className="text-sm text-slate-600 text-center sm:text-left">
                      Showing {Math.min(completedStartIndex + 1, completedWorkBookings.length)}–
                      {Math.min(
                        completedStartIndex + displayedCompletedBookings.length,
                        completedWorkBookings.length
                      )}{" "}
                      of {completedWorkBookings.length} records
                    </div>

                    {/* Right controls */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">

                      {/* Rows */}
                      <BookingRowsPerPageSelect
                        value={completedItemsPerPage}
                        onChange={(size) => {
                          setCompletedItemsPerPage(size)
                          setCompletedCurrentPage(1)
                        }}
                      />

                      {/* Pagination */}
                      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 sm:flex-nowrap">

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCompletedCurrentPage(1)}
                          disabled={completedCurrentPage <= 1}
                        >
                          First
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setCompletedCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={completedCurrentPage <= 1}
                        >
                          Prev
                        </Button>

                        {/* Page text — KEY FIX */}
                        <div className="w-full sm:w-auto text-center px-2 text-sm text-slate-700">
                          Page {completedCurrentPage} of {completedTotalPages}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setCompletedCurrentPage((p) =>
                              Math.min(completedTotalPages, p + 1)
                            )
                          }
                          disabled={completedCurrentPage >= completedTotalPages}
                        >
                          Next
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCompletedCurrentPage(completedTotalPages)}
                          disabled={completedCurrentPage >= completedTotalPages}
                        >
                          Last
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>


              </div>
            </CardContent>
          </Card>
        </div>


        {/* SEPARATE CANCELLED BOOKINGS TABLE */}
        {cancelledBookings.length > 0 && (
          <Card className="pt-0">
            <CardHeader
              className="
    flex items-center justify-between
    px-5 py-2
    bg-[#FDD5D5]
  "
            >
              {/* LEFT */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center shadow-sm">
                  <XCircle className="w-5 h-5 text-white" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-800 leading-tight">
                    Bookings Cancelled by Sales Team
                  </h3>
                </div>
                <Badge
                  variant="secondary"
                  className="ml-2 bg-red-100 text-red-800 font-semibold text-xs"
                >
                  {cancelledBookings.length}
                </Badge>
              </div>
            </CardHeader>
            {/* //[#B95152] */}
            <CardContent className="p-0 ">
              <div className="overflow-x-auto bg-[#FDD5D5] text-black" onScroll={(e) => setTable3Scrolled(e.currentTarget.scrollLeft > 0)}>
                <Table className="bg-transparent [&_td]:text-black [&_th]:text-white" style={bookingStickyTableStyle}>
                  <TableHeader
                    className="
    sticky top-0 z-20
    shadow-md

    bg-gradient-to-b from-[#1F3A5F] to-[#162B46]

    /* BASE TH STYLE */
    [&_th]:relative
    [&_th]:bg-transparent
    [&_th]:text-white
    [&_th]:font-semibold
    [&_th]:text-sm
    [&_th]:uppercase
    [&_th]:tracking-wide
    [&_th]:px-4
    [&_th]:py-3
    [&_th]:text-center

    /* COLUMN DIVIDERS */
    [&_th]:border-r
    [&_th]:border-white/20
    [&_th:last-child]:border-r-0
  "
                  >


                    <TableRow>
                      <TableHead style={getStickyHeaderCellStyle(table3Scrolled, "bookingDate", false, 32)}>Booking Date</TableHead>
                      <TableHead style={getStickyHeaderCellStyle(table3Scrolled, "bookingId", false, 31)}>Booking ID</TableHead>
                      <TableHead style={getStickyHeaderCellStyle(table3Scrolled, "guestName", true, 30)}>Guest Name</TableHead>
                      <TableHead>Room Details</TableHead>
                      <TableHead onClick={() => handleSort("checkIn")}>
                        <div
                          className="
    flex items-center gap-2 justify-center
    px-2 py-1 rounded-md
    hover:bg-white/15
    transition-colors
    cursor-pointer
  "
                        >
                          Check In / Out
                          <SortIcon field="checkIn" />
                        </div>
                      </TableHead>
                      <TableHead>Programme</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Progress</TableHead>
                      <TableHead>Approval Details</TableHead>
                      <TableHead>PI Link</TableHead>
                      <TableHead className="text-center">PI Number</TableHead>
                      <TableHead>Salesperson</TableHead>
                      <TableHead>Cancelled Remarks</TableHead>
                      <TableHead>Cancelled Reason</TableHead>
                      <TableHead>Cancelled By</TableHead>
                      <TableHead>Cancelled Date</TableHead>
                      <TableHead>Data Source</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody
                    className="
    [&_tr]:bg-[#FDD5D5]
    [&_tr:hover]:bg-blue-200
    transition-colors duration-150
  "
                  >

                    {displayedCancelledBookings.map((booking) => (
                      <TableRow key={booking.id} className="opacity-75">

                        {/* Booking Date */}
                        <TableCell
                          className="text-sm text-gray-700"
                          style={getStickyBodyCellStyle(table3Scrolled, "bookingDate", "#FDD5D5", false, 22)}
                        >
                          {booking.createdDate
                            ? new Date(booking.createdDate).toLocaleDateString()
                            : "—"}
                        </TableCell>

                        {/* Booking ID */}
                        <TableCell
                          className="font-medium"
                          style={getStickyBodyCellStyle(table3Scrolled, "bookingId", "#FDD5D5", false, 21)}
                        >
                          {booking.bookingId}
                        </TableCell>

                        {/* Guest Name */}
                        <TableCell
                          style={getStickyBodyCellStyle(table3Scrolled, "guestName", "#FDD5D5", true, 20)}
                        >
                          {formatGuestName(booking.guestName, table3Scrolled)}
                        </TableCell>

                        {/* Room Number */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-900">
                              {booking.roomNumber}
                            </div>

                            <div className="text-sm text-slate-600">
                              {booking.roomType}
                            </div>

                            <div className="text-sm text-slate-500">
                              {booking.roomCategory}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-600 font-medium">In:</span>
                              <span className="text-slate-700">{new Date(booking.checkIn).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-red-600 font-medium">Out:</span>
                              <span className="text-slate-700">{new Date(booking.checkOut).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </TableCell>
                        {/* Programme */}
                        <TableCell>{booking.programmeName}</TableCell>

                        {/* Amount */}
                        <TableCell className="font-medium">
                          ₹{booking.amount?.toLocaleString()}
                        </TableCell>

                        {/* Payment Progress */}
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`${getPaymentStatusBadge(
                                  booking.paymentStatus || booking.paymentStatus
                                )} font-semibold text-xs`}
                              >
                                {(booking.paymentStatus || "")
                                  .toString()
                                  .toUpperCase()
                                  .replace("_", " ")}
                              </Badge>

                              <span className="text-sm font-semibold text-slate-700">
                                {computeReceivedPercentage(
                                  booking.receivedAmount,
                                  booking.originalAmount
                                )}%
                              </span>
                            </div>

                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${booking.paymentStatus === "paid"
                                  ? "bg-gradient-to-r from-green-500 to-green-600"
                                  : booking.paymentStatus === "partial"
                                    ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                    : booking.paymentStatus === "pending"
                                      ? "bg-gradient-to-r from-red-400 to-red-600"
                                      : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                                  }`}
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      computeReceivedPercentage(
                                        booking.receivedAmount,
                                        booking.originalAmount
                                      )
                                    )
                                  )}%`,
                                }}
                              ></div>
                            </div>

                            <p className="text-xs mt-1 font-medium text-gray-700">
                              {getCurrencySymbol(String(booking.currency).slice(0, 3))}{(Number(booking.receivedAmount) || 0).toLocaleString()} / {getCurrencySymbol(String(booking.currency).slice(0, 3))}{(Number(booking.originalAmount) || 0).toLocaleString()}
                            </p>
                            <p className="text-xs mt-1 text-slate-500">
                              <span className="font-medium">Payment Screenshot:</span>{" "}
                              {booking.uploadScreenShot ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-blue-600"
                                  onClick={() => window.open(booking.uploadScreenShot, "_blank")}
                                >
                                  View
                                </Button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </p>
                            <p className="text-xs mt-1 text-slate-500">
                              <span className="font-medium">Payment History:</span>{" "}
                              {Number(booking.receivedAmount) > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPaymentHistoryModal({
                                      bookingId: booking.bookingId,
                                      guestName: booking.guestName,
                                      mobile: booking.mobile || "",
                                    })
                                  }
                                  className="text-blue-600 hover:underline"
                                >
                                  View History
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="text-slate-700 space-y-1">
                          {/* APPROVAL GIVEN DATE */}
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Upload Date:</span>{" "}
                            {booking.approvalGivenDate
                              ? new Date(booking.approvalGivenDate).toLocaleDateString()
                              : "-"}
                          </div>

                          {/* APPROVED TILL DATE */}
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Approved Till:</span>{" "}
                            {booking.approvedTillDate
                              ? new Date(booking.approvedTillDate).toLocaleDateString()
                              : "-"}
                          </div>

                          {/* screen shot */}

                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Approval Screenshot:</span>
                            {booking.approvalScreenShot ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-600"
                                onClick={() =>
                                  window.open(booking.approvalScreenShot, "_blank")
                                }
                              >
                                View
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}

                          </div>

                        </TableCell>
                        {/* <TableCell>
                          {booking.piLink ? (
                            <a
                              href={booking.piLink+'&isCancelled=true'}
                              target="_blank"
                              className="text-blue-600 underline font-medium hover:text-blue-800"
                            >
                              View PI
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell> */}
                        <TableCell>
                          {booking.piLink ? (
                            <a
                              href={`${booking.piLink}${booking.piLink.includes('?') ? '&' : '?'}isCancelled=true`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline font-medium hover:text-blue-800"
                            >
                              View PI
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {booking?.piNumber ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs cursor-default"
                              title="PI Number"
                            >
                              {booking.piNumber}
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>



                        {/* Salesperson */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-sm font-medium">
                              {booking.assignedTo?.split(" ").map((n) => n[0])}
                            </div>
                            <span className="text-sm">{booking.assignedTo}</span>
                          </div>
                        </TableCell>

                        {/* Cancelled Remarks */}
                        <TableCell
                          className="
    text-sm
    font-bold
    text-red-600
    max-w-[600px]
    truncate
  "
                          title={getCancelInfo(booking).remarks}
                        >
                          {getCancelInfo(booking).remarks}
                        </TableCell>

                        {/* Cancelled Reason */}
                        <TableCell
                          className="
    text-sm
    font-bold
    text-red-600
    max-w-[600px]
    truncate
  "
                          title={getCancelInfo(booking).reason}
                        >
                          {getCancelInfo(booking).reason}
                        </TableCell>

                        {/* Cancelled By */}
                        <TableCell className="text-sm text-gray-600 font-medium">
                          {getCancelledByName(booking)}
                        </TableCell>

                        {/* Cancelled Date */}
                        <TableCell className="text-sm text-gray-600">
                          {booking?.cancelledAt
                            ? new Date(booking.cancelledAt).toLocaleDateString()
                            : booking.lastUpdated}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {booking?.dataSource || "-"}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isCheckInPastOrToday(booking.checkIn) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBookingDetailPopup(booking);
                                }}
                                className="h-8 px-2 text-xs flex items-center gap-1 border-blue-200 hover:border-blue-400 bg-white text-blue-700"
                                title="Booking Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>CheckIn Details</span>
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end" portal={false}>

                                {/* View Details */}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTimeout(() => handleAction("view", booking.id), 0);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>

                                {/*
                                ❌ DELETE PERMANENTLY — commented (UI se hidden)

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction("delete", booking.id);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Permanently
                              </DropdownMenuItem>
                              */}

                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Cancelled Pagination */}
                <div className="px-4 py-3 border-t border-slate-100 bg-white">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    {/* Showing text */}
                    <div className="text-sm text-slate-600 text-center sm:text-left">
                      Showing {Math.min(cancelledStartIndex + 1, cancelledBookings.length)}–
                      {Math.min(
                        cancelledStartIndex + displayedCancelledBookings.length,
                        cancelledBookings.length
                      )}{" "}
                      of {cancelledBookings.length} cancelled records
                    </div>

                    {/* Right controls */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">

                      {/* Rows */}
                      <BookingRowsPerPageSelect
                        value={cancelledItemsPerPage}
                        onChange={(size) => {
                          setCancelledItemsPerPage(size)
                          setCancelledCurrentPage(1)
                        }}
                      />

                      {/* Pagination */}
                      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 sm:flex-nowrap">

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCancelledCurrentPage(1)}
                          disabled={cancelledCurrentPage <= 1}
                        >
                          First
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setCancelledCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={cancelledCurrentPage <= 1}
                        >
                          Prev
                        </Button>

                        {/* Page text — KEY FIX */}
                        <div className="w-full sm:w-auto text-center px-2 text-sm text-slate-700">
                          Page {cancelledCurrentPage} of {cancelledTotalPages}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setCancelledCurrentPage((p) =>
                              Math.min(cancelledTotalPages, p + 1)
                            )
                          }
                          disabled={cancelledCurrentPage >= cancelledTotalPages}
                        >
                          Next
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCancelledCurrentPage(cancelledTotalPages)}
                          disabled={cancelledCurrentPage >= cancelledTotalPages}
                        >
                          Last
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        )}
        <Card className="pt-0">
          <CardHeader
            className="
    flex items-center justify-between
    px-5 py-2
   bg-[#e1f3fd]
  "
          >
            {/* LEFT */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-700 flex items-center justify-center shadow-sm">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-800 leading-tight">
                  Bookings Auto-Released by System
                </h3>
              </div>
              <Badge
                variant="secondary"
                className="ml-2 bg-sky-100 text-sky-800 font-semibold text-xs"
              >
                {autoReleaseBookings.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0 ">
            <div className="overflow-x-auto bg-[#e1f3fd]" onScroll={(e) => setTable4Scrolled(e.currentTarget.scrollLeft > 0)}>
              <Table className="bg-transparent" style={bookingStickyTableStyle}>
                <TableHeader
                  className="
    sticky top-0 z-20
    shadow-md

    bg-gradient-to-b from-[#1F3A5F] to-[#162B46]

    /* BASE TH STYLE */
    [&_th]:relative
    [&_th]:bg-transparent
    [&_th]:text-white
    [&_th]:font-semibold
    [&_th]:text-sm
    [&_th]:uppercase
    [&_th]:tracking-wide
    [&_th]:px-4
    [&_th]:py-3
    [&_th]:text-center

    /* COLUMN DIVIDERS */
    [&_th]:border-r
    [&_th]:border-white/20
    [&_th:last-child]:border-r-0
  "
                >
                  <TableRow className="border-b border-red-300">
                    <TableHead style={getStickyHeaderCellStyle(table4Scrolled, "bookingDate", false, 32)}>Booking Date</TableHead>
                    <TableHead style={getStickyHeaderCellStyle(table4Scrolled, "bookingId", false, 31)}>Booking ID</TableHead>
                    <TableHead style={getStickyHeaderCellStyle(table4Scrolled, "guestName", true, 30)}>Guest Name</TableHead>
                    <TableHead>Room Details</TableHead>
                    <TableHead>Programme</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Progress</TableHead>
                    <TableHead>Approval Details</TableHead>
                    <TableHead>PI Link</TableHead>
                    <TableHead className="text-center">PI Number</TableHead>
                    <TableHead>Salesperson</TableHead>
                    <TableHead>Auto Release Reason</TableHead>
                    <TableHead>Auto Release Notes</TableHead>
                    <TableHead>Auto Released Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody
                  className="
    [&_tr]:bg-[#E1F3FD]
    [&_tr:hover]:bg-blue-200
    transition-colors duration-150
  "
                >

                  {displayedAutoReleaseBookings.map((booking) => (
                    <TableRow key={booking.id} className="opacity-75">

                      {/* Booking Date */}
                      <TableCell
                        className="text-sm text-gray-700"
                        style={getStickyBodyCellStyle(table4Scrolled, "bookingDate", "#E1F3FD", false, 22)}
                      >
                        {new Date(booking.createdDate).toLocaleDateString()}
                      </TableCell>

                      {/* Booking ID */}
                      <TableCell
                        className="font-medium text-sky-700"
                        style={getStickyBodyCellStyle(table4Scrolled, "bookingId", "#E1F3FD", false, 21)}
                      >
                        {booking.bookingId}
                      </TableCell>

                      {/* Guest Name */}
                      <TableCell
                        style={getStickyBodyCellStyle(table4Scrolled, "guestName", "#E1F3FD", true, 20)}
                      >
                        {formatGuestName(booking.guestName, table4Scrolled)}
                      </TableCell>

                      {/* Room Number */}
                      <TableCell >
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900">
                            {booking.roomNumber}
                          </div>

                          <div className="text-sm text-slate-600">
                            {booking.roomType}
                          </div>

                          <div className="text-sm text-slate-500">
                            {booking.roomCategory}
                          </div>
                        </div>
                      </TableCell>

                      {/* Programme */}
                      <TableCell>{booking.programmeName}</TableCell>

                      {/* Amount */}
                      <TableCell className="font-medium">{getCurrencySymbol(String(booking.currency).slice(0, 3))}{booking.originalAmount?.toLocaleString()}</TableCell>

                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`${getPaymentStatusBadge(
                                booking.paymentStatus || booking.paymentStatus
                              )} font-semibold text-xs`}
                            >
                              {(booking.paymentStatus || "")
                                .toString()
                                .toUpperCase()
                                .replace("_", " ")}
                            </Badge>

                            <span className="text-sm font-semibold text-slate-700">
                              {computeReceivedPercentage(
                                booking.receivedAmount,
                                booking.originalAmount
                              )}%
                            </span>
                          </div>

                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${booking.paymentStatus === "paid"
                                ? "bg-gradient-to-r from-green-500 to-green-600"
                                : booking.paymentStatus === "partial"
                                  ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                  : booking.paymentStatus === "pending"
                                    ? "bg-gradient-to-r from-red-400 to-red-600"
                                    : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                                }`}
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    computeReceivedPercentage(
                                      booking.receivedAmount,
                                      booking.originalAmount
                                    )
                                  )
                                )}%`,
                              }}
                            ></div>
                          </div>

                          <p className="text-xs mt-1 font-medium text-gray-700">
                            {getCurrencySymbol(String(booking.currency).slice(0, 3))}{(Number(booking.receivedAmount) || 0).toLocaleString()} / {getCurrencySymbol(String(booking.currency).slice(0, 3))}{(Number(booking.originalAmount) || 0).toLocaleString()}
                          </p>
                          <p className="text-xs mt-1 text-slate-500">
                            <span className="font-medium">Payment Screenshot:</span>{" "}
                            {booking.uploadScreenShot ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-600"
                                onClick={() => window.open(booking.uploadScreenShot, "_blank")}
                              >
                                View
                              </Button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </p>
                          <p className="text-xs mt-1 text-slate-500">
                            <span className="font-medium">Payment History:</span>{" "}
                            {Number(booking.receivedAmount) > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPaymentHistoryModal({
                                    bookingId: booking.bookingId,
                                    guestName: booking.guestName,
                                    mobile: booking.mobile || "",
                                  })
                                }
                                className="text-blue-600 hover:underline"
                              >
                                View History
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="text-slate-700 space-y-1">
                        {/* APPROVAL GIVEN DATE */}
                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Upload Date:</span>{" "}
                          {booking.approvalGivenDate
                            ? new Date(booking.approvalGivenDate).toLocaleDateString()
                            : "-"}
                        </div>

                        {/* APPROVED TILL DATE */}
                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Approved Till:</span>{" "}
                          {booking.approvedTillDate
                            ? new Date(booking.approvedTillDate).toLocaleDateString()
                            : "-"}
                        </div>

                        {/* screen shot */}

                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Approval Screenshot:</span>
                          {booking.approvalScreenShot ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-blue-600"
                              onClick={() =>
                                window.open(booking.approvalScreenShot, "_blank")
                              }
                            >
                              View
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}

                        </div>

                      </TableCell>
                      <TableCell>
                        {booking.piLink ? (
                          <a
                            href={booking.piLink}
                            target="_blank"
                            className="text-blue-600 underline hover:text-blue-800 font-medium"
                          >
                            View PI
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {booking?.piNumber ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs cursor-default"
                            title="PI Number"
                          >
                            {booking.piNumber}
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>


                      {/* Salesperson */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center text-sm font-medium">
                            {booking.assignedTo?.split(" ").map((n) => n[0])}
                          </div>
                          <span className="text-sm">{booking.assignedTo}</span>
                        </div>
                      </TableCell>

                      {/* Auto Release Reason */}
                      <TableCell
                        className="
    text-sm
    font-bold
    text-sky-700
    uppercase
    tracking-wide
  "
                      >
                        {booking?.autoreleaseReason || "—"}
                      </TableCell>


                      {/* Auto Release Notes */}
                      <TableCell
                        className="
    text-sm
    font-bold
    text-sky-700
    tracking-wide
  "
                      >
                        {booking.cancelledRemarks || "—"}
                      </TableCell>


                      {/* Auto Released Date */}
                      <TableCell className="text-sm text-gray-600">
                        {booking.autoReleasedAt
                          ? new Date(booking.autoReleasedAt).toLocaleDateString()
                          : new Date(booking.lastUpdated).toLocaleDateString()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end" portal={false}>

                            {/* View */}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction("view", booking.id);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>

                            {/* DELETE HIDDEN - COMMENTED */}
                            {/*
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction("delete", booking.id);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Permanently
                    </DropdownMenuItem>
                    */}

                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination controls */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                {/* Showing text */}
                <div className="text-sm text-slate-600 text-center sm:text-left">
                  Showing{" "}
                  {Math.min(autoReleaseStartIndex + 1, autoReleaseBookings.length)}–
                  {Math.min(
                    autoReleaseStartIndex + displayedAutoReleaseBookings.length,
                    autoReleaseBookings.length
                  )}{" "}
                  of {autoReleaseBookings.length} records
                </div>

                {/* Right controls */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">

                  {/* Rows */}
                  <BookingRowsPerPageSelect
                    value={autoReleaseItemsPerPage}
                    onChange={(size) => {
                      setAutoReleaseItemsPerPage(size)
                      setAutoReleaseCurrentPage(1)
                    }}
                  />

                  {/* Pagination */}
                  <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 sm:flex-nowrap">

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAutoReleaseCurrentPage(1)}
                      disabled={autoReleaseCurrentPage <= 1}
                    >
                      First
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setAutoReleaseCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={autoReleaseCurrentPage <= 1}
                    >
                      Prev
                    </Button>

                    {/* Page text — KEY FIX (same as reference) */}
                    <div className="w-full sm:w-auto text-center px-2 text-sm text-slate-700">
                      Page {autoReleaseCurrentPage} of {autoReleaseTotalPages}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setAutoReleaseCurrentPage((p) =>
                          Math.min(autoReleaseTotalPages, p + 1)
                        )
                      }
                      disabled={autoReleaseCurrentPage >= autoReleaseTotalPages}
                    >
                      Next
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setAutoReleaseCurrentPage(autoReleaseTotalPages)
                      }
                      disabled={autoReleaseCurrentPage >= autoReleaseTotalPages}
                    >
                      Last
                    </Button>

                  </div>
                </div>
              </div>
            </div>



          </CardContent>
        </Card>

        {/* ================= VOUCHER / COMPLIMENTARY BOOKINGS ================= */}
        <Card className="pt-0">
          <CardHeader className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border-b border-slate-200">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Voucher & Complimentary Bookings
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {voucherComplimentaryBookings.length}
              </span>

            </CardTitle>

          </CardHeader>


          <CardContent className="p-0 ">
            <Table>
              <TableHeader
                className="
    sticky top-0 z-20
    shadow-md
    bg-gradient-to-b from-[#1F3A5F] to-[#162B46]

    [&_th]:relative
    [&_th]:bg-transparent
    [&_th]:text-white
    [&_th]:font-semibold
    [&_th]:text-sm
    [&_th]:uppercase
    [&_th]:tracking-wide
    [&_th]:px-4
    [&_th]:py-3
    [&_th]:text-center

    [&_th]:border-r
    [&_th]:border-white/20
    [&_th:last-child]:border-r-0
  "
              >
                <TableRow>
                  <TableHead>Booking Date</TableHead>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Check-In</TableHead>
                  <TableHead>Check-Out</TableHead>
                  <TableHead>Approval Details</TableHead>
                  <TableHead>PI Link</TableHead>
                  <TableHead className="text-center">PI Number</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>


              <TableBody
                className="
    [&_tr]:bg-white
    [&_tr:hover]:bg-blue-200
    transition-colors duration-150
  "
              >

                {displayedVoucherBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-6 text-slate-500">
                      No Voucher / Complimentary bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedVoucherBookings.map((booking) => (

                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {booking.createdDate
                              ? new Date(booking.createdDate).toLocaleDateString()
                              : "-"}
                          </span>
                          {/* <span className="text-xs text-slate-500">
                            {booking.createdDate
                              ? new Date(booking.createdDate).toLocaleTimeString()
                              : ""}
                          </span> */}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {booking.bookingId}
                      </TableCell>

                      <TableCell>{booking.guestName}</TableCell>

                      <TableCell>
                        {new Date(booking.checkIn).toLocaleDateString()}
                      </TableCell>

                      <TableCell>
                        {new Date(booking.checkOut).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="text-slate-700 space-y-1">
                        {/* APPROVAL GIVEN DATE */}
                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Upload Date:</span>{" "}
                          {booking.approvalGivenDate
                            ? new Date(booking.approvalGivenDate).toLocaleDateString()
                            : "-"}
                        </div>

                        {/* APPROVED TILL DATE */}
                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Approved Till:</span>{" "}
                          {booking.approvedTillDate
                            ? new Date(booking.approvedTillDate).toLocaleDateString()
                            : "-"}
                        </div>

                        {/* screen shot */}

                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Approval Screenshot:</span>
                          {booking.approvalScreenShot ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-blue-600"
                              onClick={() =>
                                window.open(booking.approvalScreenShot, "_blank")
                              }
                            >
                              View
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}

                        </div>

                      </TableCell>

                      <TableCell>
                        {booking.piLink ? (
                          <a
                            href={booking.piLink}
                            target="_blank"
                            className="text-blue-600 underline hover:text-blue-800 font-medium"
                          >
                            View PI
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {booking?.piNumber ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs cursor-default"
                            title="PI Number"
                          >
                            {booking.piNumber}
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>{booking.assignedTo}</TableCell>

                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-800">
                          {booking.editActionStatus}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right font-semibold">
                        {getCurrencySymbol(String(booking.currency).slice(0, 3))}{Number(booking.originalAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {isCheckInPastOrToday(booking.checkIn) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openBookingDetailPopup(booking);
                            }}
                            className="h-8 px-2 text-xs flex items-center gap-1 border-blue-200 hover:border-blue-400 bg-white text-blue-700 inline-flex"
                            title="Booking Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>CheckIn Details</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {voucherTotalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 bg-white">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  {/* Showing text */}
                  <div className="text-sm text-slate-600 text-center sm:text-left">
                    Page {voucherCurrentPage} of {voucherTotalPages}
                  </div>

                  {/* Right controls */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">

                    {/* Rows */}
                    <BookingRowsPerPageSelect
                      value={voucherItemsPerPage}
                      onChange={(size) => {
                        setVoucherItemsPerPage(size)
                        setVoucherCurrentPage(1)
                      }}
                    />

                    {/* Pagination */}
                    <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 sm:flex-nowrap">

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setVoucherCurrentPage(1)}
                        disabled={voucherCurrentPage <= 1}
                      >
                        First
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setVoucherCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={voucherCurrentPage <= 1}
                      >
                        Prev
                      </Button>

                      {/* Page text — SAME KEY FIX */}
                      <div className="w-full sm:w-auto text-center px-2 text-sm text-slate-700">
                        Page {voucherCurrentPage} of {voucherTotalPages}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setVoucherCurrentPage((p) =>
                            Math.min(voucherTotalPages, p + 1)
                          )
                        }
                        disabled={voucherCurrentPage >= voucherTotalPages}
                      >
                        Next
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setVoucherCurrentPage(voucherTotalPages)}
                        disabled={voucherCurrentPage >= voucherTotalPages}
                      >
                        Last
                      </Button>

                    </div>
                  </div>
                </div>
              </div>
            )}



          </CardContent>
        </Card>




        {/* Cancel Booking Modal */}
        <div className="p-4">
          {/* <Button onClick={() => setShowCancelModal(true)}>
            Open Cancel Dialog
          </Button> */}

          <Dialog
            open={showCancelModal}
            onOpenChange={(open) => {
              if (isSubmitting) return;
              setShowCancelModal(open);
            }}
          >
            <DialogContent
              modal={false}
              className="
            sm:max-w-md
            md:max-w-2xl
            lg:max-w-4xl
            w-[calc(100%-1rem)]
            sm:w-[calc(100%-2rem)]
            max-h-[90vh]
            sm:max-h-[85vh]
            overflow-y-auto
            rounded-lg
            sm:rounded-xl
            p-3
            sm:p-4
            md:p-5
            lg:p-6
            m-2
            sm:m-4
            border
            border-slate-200
            bg-white
            shadow-xl
            mx-auto
          "
            >
              {/* ================= HEADER ================= */}
              <DialogHeader className="border-b pb-2 sm:pb-3 mb-3 sm:mb-4">
                <DialogTitle className="flex items-center gap-2 sm:gap-3 md:gap-4 text-red-600 text-base sm:text-lg md:text-xl font-semibold">
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">Cancel Booking</span>
                </DialogTitle>
              </DialogHeader>

              {/* ================= BOOKING SUMMARY ================= */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-3 sm:p-4 md:p-5 rounded-lg border border-blue-200 mb-4">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
                  <span>Booking Summary</span>
                </h3>

                {/* Responsive Grid - Stacks on mobile, 2 cols on tablet, 4 cols on desktop */}
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                  {/* Customer */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xs text-slate-600 block">Customer:</span>
                    <p className="font-semibold text-blue-900 truncate">{selectedBookingForCancelledBookings?.guestName}</p>
                  </div>

                  {/* Booking ID */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xs text-slate-600 block">Booking ID:</span>
                    <p className="font-semibold text-blue-900 truncate">{selectedBookingForCancelledBookings?.bookingId}</p>
                  </div>

                  {/* Phone No */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xs text-slate-600 block">Phone No:</span>
                    <p className="font-semibold text-blue-900 truncate">
                      {selectedBookingForCancelledBookings?.mobile || "+91 9876543210"}
                    </p>
                  </div>

                  {/* PI Link */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xs text-slate-600 block">PI Link:</span>
                    {selectedBookingForCancelledBookings?.piLink ? (
                      <a
                        href={selectedBookingForCancelledBookings.piLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm font-semibold text-blue-600 underline hover:text-blue-700 truncate block"
                      >
                        View PI
                      </a>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-slate-400">N/A</p>
                    )}
                  </div>

                  {/* Check-in Date */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xs text-slate-600 block">Check-in Date:</span>
                    <p className="font-semibold text-slate-900 truncate">{selectedBookingForCancelledBookings?.checkIn}</p>
                  </div>

                  {/* Check-out Date */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xs text-slate-600 block">Check-out Date:</span>
                    <p className="font-semibold text-slate-900 truncate">{selectedBookingForCancelledBookings?.checkOut}</p>
                  </div>

                  {/* Total PI Amount */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xs text-slate-600 block">Total PI Amount:</span>
                    <p className="font-semibold text-green-700 truncate">{selectedBookingForCancelledBookings?.originalAmount}</p>
                  </div>

                  {/* Package */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[10px] sm:text-xs text-slate-600 block">Package:</span>
                    <p className="font-semibold text-slate-900 truncate">{selectedBookingForCancelledBookings?.programmeName}</p>
                  </div>
                </div>
              </div>

              {/* ================= CONTENT ================= */}
              <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                {/* HIGHLIGHTED ACTION SECTION */}
                <div className="p-3 sm:p-4 rounded-lg border-2 border-red-300 bg-red-50/40 space-y-3 sm:space-y-4">
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-800">
                    Cancellation Details <span className="text-red-500">*</span>
                  </h4>

                  {/* Reason */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="cancel-reason" className="text-xs sm:text-sm text-slate-700 font-medium">
                      Reason of Cancellation <span className="text-red-500 ml-1">*</span>
                    </Label>

                    <Select
                      disabled={isSubmitting}
                      value={cancelReason}
                      onValueChange={setCancelReason}
                    >
                      <SelectTrigger
                        className={`border border-red-300 rounded-md px-3 py-2 text-left text-xs sm:text-sm focus:ring-2 focus:ring-red-300 ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
                      >
                        <SelectValue placeholder="Select cancellation reason" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48 sm:max-h-64 overflow-y-auto">
                        <SelectItem value="Advance Not Received Within Timeline">Advance Not Received Within Timeline</SelectItem>
                        <SelectItem value="Agent or OTA Cancelled Booking">Agent or OTA Cancelled Booking</SelectItem>
                        <SelectItem value="Budget Is High">Budget Is High</SelectItem>
                        <SelectItem value="Complimentary or Voucher Booking Cancelled">Complimentary or Voucher Booking Cancelled</SelectItem>
                        <SelectItem value="Discount Is Less">Discount Is Less</SelectItem>
                        <SelectItem value="Duplicate Booking Created by Mistake">Duplicate Booking Created by Mistake</SelectItem>
                        <SelectItem value="Government Restrictions or Travel Advisory">Government Restrictions or Travel Advisory</SelectItem>
                        <SelectItem value="Guest Changed Travel Plan">Guest Changed Travel Plan</SelectItem>
                        <SelectItem value="Guest Disagreed With Cancellation or Booking Policy">Guest Disagreed With Cancellation or Booking Policy</SelectItem>
                        <SelectItem value="Guest Financial Issue or Payment Not Made">Guest Financial Issue or Payment Not Made</SelectItem>
                        <SelectItem value="Guest Found Cheaper Alternative">Guest Found Cheaper Alternative</SelectItem>
                        <SelectItem value="Guest Medical Emergency">Guest Medical Emergency</SelectItem>
                        <SelectItem value="Guest No Response After Confirmation">Guest No Response After Confirmation</SelectItem>
                        <SelectItem value="Guest Opted for Another Resort or Hotel">Guest Opted for Another Resort or Hotel</SelectItem>
                        <SelectItem value="Guest Postponed Trip">Guest Postponed Trip</SelectItem>
                        <SelectItem value="Guest Requested Modification New Booking Created">Guest Requested Modification New Booking Created</SelectItem>
                        <SelectItem value="Guest Visa or Travel Document Issue">Guest Visa or Travel Document Issue</SelectItem>
                        <SelectItem value="Maintenance Issue Room Under Repair">Maintenance Issue Room Under Repair</SelectItem>
                        <SelectItem value="No Rooms Available">No Rooms Available</SelectItem>
                        <SelectItem value="Overbooking or Inventory Mismatch">Overbooking or Inventory Mismatch</SelectItem>
                        <SelectItem value="Pandemic or Health Advisory">Pandemic or Health Advisory</SelectItem>
                        <SelectItem value="Payment Failed or Not Processed">Payment Failed or Not Processed</SelectItem>
                        <SelectItem value="Payment Not Received on Time – Auto Release">Payment Not Received on Time – Auto Release</SelectItem>
                        <SelectItem value="Requested Room Category Not Available">Requested Room Category Not Available</SelectItem>
                        <SelectItem value="Test">Test</SelectItem>
                        <SelectItem value="Token Money Not Deposited">Token Money Not Deposited</SelectItem>
                        <SelectItem value="Transport Cancellation Flight Train Bus">Transport Cancellation Flight Train Bus</SelectItem>
                        <SelectItem value="Travel Agent or Corporate Booking Not Confirmed">Travel Agent or Corporate Booking Not Confirmed</SelectItem>
                        <SelectItem value="Weather Conditions or Natural Calamity">Weather Conditions or Natural Calamity</SelectItem>
                        <SelectItem value="Wrong Booking Details Entered">Wrong Booking Details Entered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="cancel-remarks" className="text-xs sm:text-sm text-slate-700 font-medium">
                      Remarks <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      id="cancel-remarks"
                      disabled={isSubmitting}
                      placeholder="Enter additional remarks or details about the cancellation..."
                      value={cancelRemarks}
                      onChange={(e) => setCancelRemarks(e.target.value)}
                      rows={3}
                      className={`text-xs sm:text-sm border-red-300 focus:ring-2 focus:ring-red-300 ${isSubmitting ? "opacity-70 cursor-not-allowed bg-slate-100" : ""}`}
                    />
                  </div>
                </div>
              </div>

              {/* ================= FOOTER ================= */}
              <DialogFooter className="flex flex-col xs:flex-row gap-2 border-t pt-3 sticky bottom-0 bg-white">
                {/* BACK */}
                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => {
                    if (isSubmitting) return;
                    setShowCancelModal(false);
                    setCancelReason("");
                    setCancelRemarks("");
                  }}
                  className={`w-full xs:w-auto text-xs sm:text-sm ${isSubmitting ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  Back
                </Button>

                {/* CONFIRM */}
                <Button
                  variant="destructive"
                  onClick={handleCancelBooking}
                  disabled={isSubmitting || isCancelled || !cancelReason || !cancelRemarks?.trim()}
                  className={`w-full xs:w-auto text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 ${isSubmitting || isCancelled || !cancelReason || !cancelRemarks?.trim()
                    ? "cursor-not-allowed opacity-70 !bg-gray-300 !text-gray-600"
                    : "cursor-pointer !bg-green-600 hover:!bg-green-700 !text-white"
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin flex-shrink-0" />
                      <span>Cancelling...</span>
                    </>
                  ) : isCancelled ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>Cancelled Successfully</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>Confirm Cancellation</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>


        {/* Payment Upload Modal */}
        <Dialog
          open={showPaymentModal}
          onOpenChange={(open) => {
            if (isSubmitting) return
            setShowPaymentModal(open)
          }}
        >
          <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Upload className="h-5 w-5" />
                Payment Collection Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {selectedBookingForPayment && (
                <>
                  {/* Client Information */}
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Booking Summary
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-xs text-slate-600">Customer:</span>
                        <p className="font-semibold text-blue-900">{selectedBookingForPayment.guestName}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-600">Booking ID:</span>
                        <p className="font-semibold text-blue-900">{selectedBookingForPayment.bookingId}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-600">Phone No:</span>
                        <p className="font-semibold text-blue-900">
                          {selectedBookingForPayment.mobile || "-"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-slate-600 block">
                          PI Link:
                        </span>

                        {selectedBookingForPayment?.piLink ? (
                          <a
                            href={selectedBookingForPayment.piLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-blue-600 underline hover:text-blue-700"
                          >
                            View PI
                          </a>
                        ) : (
                          <p className="text-xs text-slate-400">N/A</p>
                        )}
                      </div>

                      <div>
                        <span className="text-xs text-slate-600">Check-in Date:</span>
                        <p className="font-semibold text-slate-900">{selectedBookingForPayment.checkIn}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-600">Check-out Date:</span>
                        <p className="font-semibold text-slate-900">{selectedBookingForPayment.checkOut}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-600">Total PI Amount:</span>
                        <p className="font-semibold text-green-700">{selectedBookingForPayment.originalAmount}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-600">Package:</span>
                        <p className="font-semibold text-slate-900">{selectedBookingForPayment.programmeName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Collection Details */}
                  <div
                    className="
    space-y-4
    p-5
    rounded-xl
    border-2 border-blue-300
    bg-white
    shadow-sm
  "
                  >
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      Payment Collection Details
                      <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        Fill Details
                      </span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      {/* RECEIVED AMOUNT */}
                      <div className="space-y-2">
                        <Label htmlFor="received-amount">
                          Received Amount <span className="text-red-500">*</span>
                        </Label>

                        <div className="flex gap-2">
                          {/* RECEIVED AMOUNT */}
                          <Input
                            id="received-amount"
                            type="number"
                            min={0}
                            placeholder="Enter amount"
                            value={paymentData.receivedAmount ?? ""}
                            disabled={isSubmitting} // 🔒 submit ke time disable
                            onChange={(e) => {
                              let value = Number(e.target.value)

                              // ❌ block negative values
                              if (value < 0) value = 0

                              setPaymentData({
                                ...paymentData,
                                receivedAmount: value,
                              })
                            }}
                            onWheel={(e) => e.currentTarget.blur()}
                            className={`
        flex-1
        border-blue-300
        focus:border-blue-500
        focus:ring-2 focus:ring-blue-400
        ${isSubmitting ? "cursor-not-allowed opacity-70 bg-slate-100" : ""}
      `}
                          />

                          {/* CURRENCY */}
                          <Select
                            disabled={isSubmitting} // 🔒 submit ke time disable
                            value={paymentData.currency}
                            onValueChange={(value) =>
                              setPaymentData({ ...paymentData, currency: value })
                            }
                          >
                            <SelectTrigger
                              className={`
          w-24
          border-blue-300
          focus:ring-2 focus:ring-blue-400
          ${isSubmitting ? "cursor-not-allowed opacity-70 bg-slate-100" : ""}
        `}
                            >
                              <SelectValue />
                            </SelectTrigger>

                            <SelectContent>
                              <SelectItem value="INR">INR</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EURO">EUR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>





                      {/* PAYMENT MODE */}
                      <div className="space-y-2">
                        <Label htmlFor="payment-mode">Payment Mode <span className="text-red-500">*</span>

                        </Label>
                        <Select
                          value={paymentData.paymentMode}
                          onValueChange={(value) =>
                            setPaymentData({ ...paymentData, paymentMode: value })
                          }
                        >
                          <SelectTrigger
                            className="
            border-blue-300
            focus:ring-2 focus:ring-blue-400
          "
                          >
                            <SelectValue placeholder="Select payment mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="paypal">Paypal</SelectItem>
                            <SelectItem value="bank">Bank</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="debit_card">Debit Card</SelectItem>
                            <SelectItem value="money_orders">Money Orders</SelectItem>
                            <SelectItem value="echecks">eChecks</SelectItem>
                            <SelectItem value="paper_checks">Paper Checks</SelectItem>
                            <SelectItem value="digital_wallets">Digital Wallets</SelectItem>
                            <SelectItem value="ach">Automated Clearing House (ACH)</SelectItem>
                            <SelectItem value="complimentary">Complimentary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* RECEIVED DATE */}
                      <div className="space-y-2">
                        <Label htmlFor="received-date">Received Date <span className="text-red-500">*</span>

                        </Label>
                        <Input
                          id="received-date"
                          type="datetime-local"
                          max={new Date(new Date().getTime() + 60000).toISOString().slice(0, 16)} // allow current minute
                          value={paymentData.receivedDate ? (paymentData.receivedDate.includes("T") ? paymentData.receivedDate.slice(0, 16) : new Date(paymentData.receivedDate).toISOString().slice(0, 16)) : ""}
                          onKeyDown={() => {
                            teamPaymentIsTypingRef.current = true;
                            if (teamPaymentBlurTimeoutRef.current) clearTimeout(teamPaymentBlurTimeoutRef.current);
                          }}
                          onBlur={() => {
                            teamPaymentIsTypingRef.current = false;
                            if (teamPaymentBlurTimeoutRef.current) clearTimeout(teamPaymentBlurTimeoutRef.current);
                          }}
                          onChange={(e) => {
                            const picked = e.target.value;
                            if (!picked) {
                              setPaymentData({ ...paymentData, receivedDate: "" });
                              return;
                            }
                            const processed = processDateTime(picked);
                            const inputDate = new Date(processed);
                            if (inputDate > new Date()) {
                              toast.error("Received Date cannot be in the future");
                              return;
                            }
                            setPaymentData({ ...paymentData, receivedDate: processed });

                            if (picked && picked.length === 16 && !teamPaymentIsTypingRef.current) {
                              if (teamPaymentBlurTimeoutRef.current) clearTimeout(teamPaymentBlurTimeoutRef.current);
                              const target = e.target;
                              teamPaymentBlurTimeoutRef.current = setTimeout(() => {
                                if (document.activeElement === target) {
                                  target.blur();
                                }
                              }, 600);
                            }
                          }}
                          className="
          border-blue-300
          focus:border-blue-500
          focus:ring-2 focus:ring-blue-400
        "
                        />
                      </div>

                      {/* RECEIPT NUMBER */}
                      <div className="space-y-2">
                        <Label htmlFor="receipt-number">
                          Receipt/Transaction Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="receipt-number"
                          placeholder="Enter receipt/transaction number"
                          value={paymentData.receiptNumber}
                          onChange={(e) =>
                            setPaymentData({ ...paymentData, receiptNumber: e.target.value })
                          }
                          className="
          border-blue-300
          focus:border-blue-500
          focus:ring-2 focus:ring-blue-400
        "
                        />
                      </div>

                      {/* SCREENSHOT UPLOAD */}
                      <div className="space-y-2">
                        <Label htmlFor="screenshot">Upload Screenshot <span className="text-red-500">*</span></Label>
                        <Input
                          id="screenshot"
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setPaymentData({
                              ...paymentData,
                              screenshot: e.target.files?.[0] || null,
                            })
                          }
                          className="
          border-blue-300
          file:border-0
          file:bg-blue-50
          file:text-blue-700
          focus:ring-2 focus:ring-blue-400
        "
                        />
                      </div>

                      {/* PAYMENT LOCATION */}
                      <div className="space-y-2">
                        <Label htmlFor="payment-location">Payment Location</Label>
                        <Select
                          value={paymentData.paymentLocation}
                          onValueChange={(value) =>
                            setPaymentData({ ...paymentData, paymentLocation: value })
                          }
                        >
                          <SelectTrigger
                            className="
            border-blue-300
            focus:ring-2 focus:ring-blue-400
          "
                          >
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ho">HO</SelectItem>
                            <SelectItem value="resort">Resort</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </div>

                    {/* PAYMENT COLLECTED BY */}

                    <div className="space-y-2">
                      <Label className="font-medium text-slate-700">
                        Payment Collection By
                      </Label>
                      {/* onChange={(e) =>
                          setPaymentData({
                            ...paymentData,
                            paymentCollectedBy: user?.name || paymentData.paymentCollectedBy,
                          })} */}

                      <Input
                        disabled={true} // 🔒 always fixed
                        readOnly
                        placeholder="Payment Collection By"
                        value={user?.name || paymentData.paymentCollectedBy}

                        className="
      border-slate-300
      bg-slate-100
      text-slate-500
      cursor-not-allowed
      focus:ring-0
      focus:border-slate-300
      opacity-90
    "
                      />
                    </div>

                    {/* <div className="space-y-2">
                      <Label htmlFor="collected-by">Payment Collection By</Label>
                      <Select
                        value={paymentData.paymentCollectedBy}
                        onValueChange={(value) =>
                          setPaymentData({ ...paymentData, paymentCollectedBy: value })
                        }
                      >
                        <SelectTrigger
                          className="
          border-blue-300
          focus:ring-2 focus:ring-blue-400
        "
                        >
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {employeeList.map((employee) => (
                            <SelectItem key={employee} value={employee}>
                              {employee}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div> */}

                    {/* PENDING AMOUNT */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <Label className="text-slate-600 text-xs uppercase tracking-wide">
                        Pending Amount
                      </Label>
                      <p className="text-lg font-semibold text-red-700">
                        {getCurrencySymbol(String(selectedBookingForPayment.currency).slice(0, 3))}{" "}
                        {paymentData.pendingPaymentAmount || "0"}
                      </p>
                    </div>
                  </div>

                </>
              )}

            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                disabled={isSubmitting} // 🔒 submit ke time cancel block
                onClick={() => {
                  if (isSubmitting) return

                  setShowPaymentModal(false)
                  setSelectedBookingForPayment(null)
                  setPaymentData({
                    amount: selectedBookingForPayment?.amount.toString() || "",
                    receivedAmount: "",
                    currency: "INR",
                    paymentMode: "",
                    receivedDate: "",
                    receiptNumber: "",
                    screenshot: null,
                    paymentLocation: "",
                    paymentCollectedBy: user?.name || "",
                  })
                }}
                className={isSubmitting ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
              >
                Cancel
              </Button>

              <Button
                onClick={handlePaymentSubmit}
                disabled={
                  isSubmitting ||                       // 🔒 submit ke time
                  !paymentData.receivedAmount ||
                  !paymentData.paymentMode ||
                  !paymentData.receivedDate ||
                  !paymentData.receiptNumber ||
                  !paymentData.screenshot
                }
                className={`flex items-center gap-2 ${isSubmitting ||
                  !paymentData.receivedAmount ||
                  !paymentData.paymentMode ||
                  !paymentData.receivedDate ||
                  !paymentData.receiptNumber ||
                  !paymentData.screenshot
                  ? "cursor-not-allowed opacity-70 !bg-gray-300 !text-gray-600"
                  : "cursor-pointer !bg-green-600 hover:!bg-green-700 !text-white"
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Submit Payment
                  </>
                )}
              </Button>
            </DialogFooter>

          </DialogContent>
        </Dialog>



        {/* Accounts Verify Modal */}
        <Dialog open={showAccountsVerifyModal} onOpenChange={setShowAccountsVerifyModal}>
          <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-600">
                <DollarSign className="h-6 w-6" />
                Accounts Verification
              </DialogTitle>
            </DialogHeader>

            {selectedBookingForAccounts && (
              <div className="space-y-4 py-4">
                {/* Top Summary Section - PI Amount, Collection Amount, Pending Amount, Final Status */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  {/* PI Amount */}
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg text-white shadow-lg">
                    <p className="text-xs opacity-90 mb-1">PI Amount</p>
                    <p className="text-2xl font-bold">
                      {getCurrencySymbol(String(selectedBookingForAccounts.currency).slice(0, 3))}{Number(selectedBookingForAccounts.originalAmount || 0).toLocaleString()}
                    </p>
                  </div>

                  {/* Collection Amount */}
                  <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-lg text-white shadow-lg">
                    <p className="text-xs opacity-90 mb-1">Collection Amount</p>
                    <p className="text-2xl font-bold">
                      {getCurrencySymbol(String(selectedBookingForAccounts.currency).slice(0, 3))}
                      {Number(collectionTillNowArr?.receivedAmount || 0).toLocaleString()}
                    </p>
                  </div>

                  {/* Pending Amount */}
                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-lg text-white shadow-lg">
                    <p className="text-xs opacity-90 mb-1">Pending Amount</p>
                    <p className="text-2xl font-bold">
                      {getCurrencySymbol(String(selectedBookingForAccounts.currency).slice(0, 3))}
                      {(
                        Number(selectedBookingForAccounts.originalAmount || 0) -
                        Number(collectionTillNowArr?.receivedAmount || 0)
                      ).toLocaleString()}
                    </p>
                  </div>

                  {/* Final Status */}
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-lg text-white shadow-lg">
                    <p className="text-xs opacity-90 mb-1">Final Status</p>
                    <p className="text-lg font-bold capitalize mt-2">
                      {accountsVerifyData?.paymentStatus || "Pending"}
                    </p>
                  </div>

                  {/* ✅ Amount Received % */}
                  <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-4 rounded-lg text-white shadow-lg">
                    <p className="text-xs opacity-90 mb-1">Amount Received %</p>
                    <p className="text-2xl font-bold">
                      {Number(selectedBookingForAccounts.originalAmount || 0) > 0
                        ? ((
                          Number(collectionTillNowArr?.receivedAmount || 0) /
                          Number(selectedBookingForAccounts.originalAmount)) *
                          100
                        ).toFixed(2)
                        : 0}
                      %
                    </p>
                  </div>

                  {/* ✅ Payment History */}
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 rounded-lg text-white shadow-lg flex flex-col justify-between">
                    <p className="text-xs opacity-90 mb-1">Payment History</p>

                    <button
                      type="button"
                      className="mt-3 text-sm font-semibold underline hover:text-slate-200 text-left cursor-pointer"
                      onClick={() =>
                        setPaymentHistoryModal({
                          bookingId: selectedBookingForAccounts?.bookingId || "",
                          guestName: selectedBookingForAccounts?.guestName || "",
                          mobile: selectedBookingForAccounts?.mobile || "",
                        })
                      }
                    >
                      View Details →
                    </button>


                  </div>
                </div>


                {/* Booking Summary - Enhanced with more details */}
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Booking Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-xs text-slate-600">Customer:</span>
                      <p className="font-semibold text-blue-900">{selectedBookingForAccounts.guestName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Booking ID:</span>
                      <p className="font-semibold text-blue-900">{selectedBookingForAccounts.bookingId}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Phone No:</span>
                      <p className="font-semibold text-blue-900">
                        {selectedBookingForAccounts.mobile || "+91 9876543210"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-600 block">
                        PI Link:
                      </span>

                      {selectedBookingForAccounts?.piLink ? (
                        <a
                          href={selectedBookingForAccounts.piLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-600 underline hover:text-blue-700"
                        >
                          View PI
                        </a>
                      ) : (
                        <p className="text-xs text-slate-400">N/A</p>
                      )}
                    </div>

                    <div>
                      <span className="text-xs text-slate-600">Check-in Date:</span>
                      <p className="font-semibold text-slate-900">{selectedBookingForAccounts.checkIn}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Check-out Date:</span>
                      <p className="font-semibold text-slate-900">{selectedBookingForAccounts.checkOut}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Total PI Amount:</span>
                      <p className="font-semibold text-green-700">{selectedBookingForAccounts.originalAmount}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Package:</span>
                      <p className="font-semibold text-slate-900">{selectedBookingForAccounts.programmeName}</p>
                    </div>
                  </div>
                </div>

                {/* Sales Agent Verify Details - Label style view */}
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-purple-600" />
                    Sales Agent Verify Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-xs text-slate-600">Booking Taken By:</span>
                      <p className="font-semibold text-slate-900">{selectedBookingForAccounts.bookingTakenBy}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Booking Status:</span>

                      <p className="font-semibold text-green-700">
                        {selectedBookingForAccounts?.editActionStatus?.trim()
                          ? selectedBookingForAccounts.editActionStatus
                          : "Pending"}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-slate-600">Remarks:</span>
                      <p className="font-semibold text-slate-900">{selectedBookingForAccounts.cancelledRemarks}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Cancelled Reason:</span>
                      <p className="font-semibold text-slate-900">{selectedBookingForAccounts.cancelledReason}</p>
                    </div>
                  </div>
                </div>

                {/* ===== 3-STAGE PROGRESS INDICATOR ===== */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  {[1, 2, 3].map((stageNum) => {
                    const stageKey = `stage${stageNum}` as 'stage1' | 'stage2' | 'stage3';
                    const isStageCompleted = accountsVerifyData[stageKey].isCompleted;

                    // ✅ Check if stage is activated (has planned date from API)
                    const stageData = selectedBookingForAccounts?.accountsPersonStage?.[stageNum.toString()];
                    const isStageActivated = stageData?.planned && stageData.planned.trim() !== "";

                    // ✅ SKIP LOGIC: Only activated stages matter
                    const activatedStagesList = [1, 2, 3].filter(n => {
                      const sd = selectedBookingForAccounts?.accountsPersonStage?.[n.toString()];
                      return sd?.planned && sd.planned.trim() !== "";
                    });
                    const indexInActivated = activatedStagesList.indexOf(stageNum);

                    // Locked if: not activated OR previous activated stage not completed
                    const isStageLocked =
                      !isStageActivated ||
                      (indexInActivated > 0 && !accountsVerifyData[`stage${activatedStagesList[indexInActivated - 1]}` as 'stage1' | 'stage2' | 'stage3'].isCompleted);

                    const isCurrent = accountsVerifyData.currentStage === stageNum;

                    return (
                      <div key={stageNum} className="flex-1">
                        <button
                          type="button"
                          disabled={isStageLocked}
                          onClick={() => {
                            if (isStageLocked) {
                              if (!isStageActivated) {
                                toast.error(`Stage ${stageNum} is not activated yet`);
                              } else {
                                const prevActivated = activatedStagesList[indexInActivated - 1];
                                toast.error(`Complete Stage ${prevActivated} before accessing Stage ${stageNum}`);
                              }
                              return;
                            }
                            // Allow viewing any unlocked stage
                            setAccountsVerifyData({
                              ...accountsVerifyData,
                              currentStage: stageNum,
                            });
                          }}
                          className={`w-full py-3 rounded-lg font-semibold transition-all relative ${isStageLocked
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
                            : isCurrent
                              ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-300"
                              : isStageCompleted
                                ? "bg-green-500 text-white cursor-pointer hover:bg-green-600"
                                : "bg-slate-200 text-slate-700 cursor-pointer hover:bg-slate-300"
                            }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              Stage {stageNum}
                              {isStageCompleted && (
                                <CheckCircle className="h-4 w-4 inline" />
                              )}
                              {isStageLocked && !isStageActivated && (
                                <span className="text-xs">🔒</span>
                              )}
                            </div>
                            {isStageCompleted && accountsVerifyData[stageKey].submittedAt && (
                              <span className="text-[10px] opacity-90">
                                {formatSafeDateString(accountsVerifyData[stageKey].submittedAt)}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Show completed stages details */}
                {[1, 2, 3].some(num => {
                  const key = `stage${num}` as 'stage1' | 'stage2' | 'stage3';
                  return accountsVerifyData[key].isCompleted;
                }) && (
                    <div className="bg-white/60 p-3 rounded-lg mb-2 space-y-2">
                      <h4 className="text-xs font-semibold text-blue-800">Completed Stages:</h4>
                      {[1, 2, 3].map((stageNum) => {
                        const stageKey = `stage${stageNum}` as 'stage1' | 'stage2' | 'stage3';
                        const stage = accountsVerifyData[stageKey];
                        if (!stage.isCompleted) return null;

                        return (
                          <div
                            key={stageNum}
                            className="flex items-center justify-between text-xs bg-green-50 p-2 rounded border border-green-200"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span className="font-semibold text-green-700">Stage {stageNum}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                              {stage.doer && (
                                <span className="flex items-center gap-1">
                                  <UserCheck className="h-3 w-3" />
                                  {stage.doer}
                                </span>
                              )}
                              {stage.submittedAt && (
                                <span className="text-[10px]">
                                  {formatSafeDateString(stage.submittedAt)}
                                </span>
                              )}
                              {stage.submittedAt && (
                                <span className="text-[10px]">
                                  {stage?.paymentReceivedStatus}
                                </span>
                              )}
                              {stage?.actualReceivedAmount !== "" && stage?.actualReceivedAmount != null && (
                                <span className="text-[10px] font-semibold text-green-700">
                                  ₹{Number(stage.actualReceivedAmount).toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                {/* Status Message */}
                <div className="bg-white/60 p-2 rounded text-center">
                  <p className="text-xs text-blue-700">
                    {getCurrentStageData().isCompleted ? (
                      <>
                        ✓ Stage {accountsVerifyData.currentStage} completed
                        {accountsVerifyData.currentStage < 3 && " - Viewing completed stage"}
                      </>
                    ) : (
                      <>📍 Currently working on Stage {accountsVerifyData.currentStage}</>
                    )}
                  </p>
                </div>


                {/* ===== DYNAMIC PAYMENT COLLECTIONS RENDERING ===== */}
                {/* {getCurrentStageData().collections.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Stage {accountsVerifyData.currentStage} Collections ({getCurrentStageData().collections.length})
                    </h3>
                    {getCurrentStageData().collections.map((collection, idx) => {
                      const colorSchemes = [
                        "from-green-500 to-emerald-600",
                        "from-amber-500 to-yellow-600",
                        "from-purple-500 to-pink-600",
                        "from-cyan-500 to-blue-600",
                        "from-rose-500 to-red-600",
                      ];
                      const colorIndex = idx % colorSchemes.length;
                      const bgColor = colorSchemes[colorIndex];

                      return (
                        <div key={`collection-${idx}`}>
                          
                          <div className={`bg-gradient-to-br ${bgColor} p-4 rounded-lg shadow-lg border-2 border-opacity-50`}>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Payment Collection Details {idx + 1}
                              </h3>
                            </div>

                            
                            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-inner">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                                  <span className="text-xs text-blue-700 font-semibold block mb-1">Collection Date</span>
                                  <p className="font-bold text-slate-900">{collection.collectionDate || "N/A"}</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                                  <span className="text-xs text-blue-700 font-semibold block mb-1">Amount</span>
                                  <p className="font-bold text-green-700 text-lg">₹{collection.amount || "N/A"}</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                                  <span className="text-xs text-blue-700 font-semibold block mb-1">Mode</span>
                                  <p className="font-bold text-slate-900 capitalize">{collection.mode || "N/A"}</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                                  <span className="text-xs text-blue-700 font-semibold block mb-1">Receipt/Txn No</span>
                                  <p className="font-bold text-slate-900">{collection.receiptNo || "N/A"}</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                                  <span className="text-xs text-blue-700 font-semibold block mb-1">Collected By</span>
                                  <p className="font-bold text-slate-900">{collection.collectedBy || "N/A"}</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                                  <span className="text-xs text-blue-700 font-semibold block mb-1">Location</span>
                                  <p className="font-bold text-slate-900">{collection.location || "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // ===== FALLBACK: No Collections Found =====
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border-2 border-blue-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-800 text-sm sm:text-base">
                          No Payment Collections Found
                        </h4>
                        <p className="text-xs sm:text-sm text-blue-700 mt-1">
                          No payment collection history available for this booking. You can still verify the account status below.
                        </p>
                      </div>
                    </div>
                  </div>
                )} */}

                {/* ===== FINAL ACCOUNT STATUS ===== */}
                {/*
                <div className={`p-4 rounded-lg border-2 ${getCurrentStageData().paymentReceivedStatus === "pending" || !getCurrentStageData().paymentReceivedStatus
                  ? "bg-yellow-50 border-yellow-300"
                  : "bg-green-50 border-green-300"}`}>
                  <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${getCurrentStageData().paymentReceivedStatus === "pending" || !getCurrentStageData().paymentReceivedStatus
                    ? "text-yellow-800"
                    : "text-green-800"}`}>
                    <FileCheck className="h-5 w-5" />
                    Stage {accountsVerifyData.currentStage} Status
                  </h3>

                  
                  {(!getCurrentStageData().paymentReceivedStatus || getCurrentStageData().paymentReceivedStatus === "pending") && (
                    <div className="bg-white p-4 rounded border border-yellow-200">
                      <p className="text-sm text-yellow-800 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span><span className="font-semibold">Status:</span> Pending - Please select a payment status below</span>
                      </p>
                    </div>
                  )}

                  
                  {getCurrentStageData().paymentReceivedStatus && getCurrentStageData().paymentReceivedStatus !== "pending" && (
                    <div className="bg-white p-3 sm:p-4 rounded border border-green-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      <div className="bg-green-50 p-3 rounded">
                        <span className="text-[10px] sm:text-xs text-green-700 font-semibold block mb-1">
                          Stage {accountsVerifyData.currentStage} Status
                        </span>
                        <p className="font-bold text-green-700 flex items-center gap-1 text-xs sm:text-sm">
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="break-words">
                            {getCurrentStageData().paymentReceivedStatus?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <span className="text-[10px] sm:text-xs text-green-700 font-semibold block mb-1">Stage Amount</span>
                        <p className="font-bold text-green-700 text-sm sm:text-base">
                          ₹{getCurrentStageData().actualReceivedAmount || "0"}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <span className="text-[10px] sm:text-xs text-green-700 font-semibold block mb-1">Collections Verified</span>
                        <p className="font-bold text-green-700 text-sm sm:text-base">
                          {getVerifiedCollectionsCount()} of {getCurrentStageData().collections.length}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                */}

                {/* Account Verify Entry Form */}
                <div className={`p-4 rounded-lg border-2 ${getCurrentStageData().isCompleted
                  ? 'bg-gradient-to-r from-gray-50 to-slate-100 border-gray-400'
                  : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-400'}`}>
                  <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${getCurrentStageData().isCompleted
                    ? 'text-gray-700'
                    : 'text-blue-800'}`}>
                    <FileCheck className={`h-4 w-4 ${getCurrentStageData().isCompleted ? 'text-gray-600' : 'text-blue-700'}`} />
                    Account Verify Entry Form
                    {getCurrentStageData().isCompleted && (
                      <span className="ml-auto bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Completed - Read Only
                      </span>
                    )}
                  </h3>

                  {/* Show completed stage info banner */}
                  {getCurrentStageData().isCompleted && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-800 flex items-center gap-2">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <span>
                          This stage was completed on{' '}
                          <strong>{formatSafeDateString(getCurrentStageData().submittedAt)}</strong>
                          {getCurrentStageData().doer && ` by ${getCurrentStageData().doer}`}.
                          The form below shows the submitted data (read-only).
                        </span>
                      </p>
                    </div>
                  )}

                  {!getCurrentStageData().isCompleted && !stageHasPlanned(selectedBookingForAccounts?.accountsPersonStage?.[accountsVerifyData.currentStage.toString()]) && (
                    <div className="mb-3 p-3 bg-slate-100 border border-slate-300 rounded-lg">
                      <p className="text-xs text-slate-700 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
                        <span>
                          Stage {accountsVerifyData.currentStage} is locked until planned is filled.
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {/* PAYMENT STATUS */}
                    <div className="space-y-1.5 sm:space-y-1">
                      <Label className="text-xs sm:text-sm text-red-700 font-medium">
                        Payment Received Status *
                      </Label>

                      <Select
                        value={getCurrentStageData().paymentReceivedStatus}
                        disabled={getCurrentStageData().isCompleted || isSubmitting || !stageHasPlanned(selectedBookingForAccounts?.accountsPersonStage?.[accountsVerifyData.currentStage.toString()])}
                        onValueChange={(value) => {
                          const currentStageKey = accountsVerifyData.currentStage === 1 ? 'stage1' : accountsVerifyData.currentStage === 2 ? 'stage2' : 'stage3';
                          setAccountsVerifyData({
                            ...accountsVerifyData,
                            [currentStageKey]: {
                              ...accountsVerifyData[currentStageKey],
                              paymentReceivedStatus: value,
                            }
                          });
                        }}
                      >
                        <SelectTrigger
                          className={`h-10 sm:h-9 text-xs sm:text-sm ${getCurrentStageData().isCompleted
                            ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed opacity-75'
                            : 'border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-400 hover:border-blue-500'
                            }`}
                        >
                          <SelectValue
                            placeholder="Select payment status"
                            className="text-xs sm:text-sm truncate block max-w-full"
                          />
                        </SelectTrigger>

                        <SelectContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                          <SelectItem value="Payment Received" className="text-xs sm:text-sm">
                            <span className="block truncate">Payment Received</span>
                          </SelectItem>
                          <SelectItem value="Payment Not Received But Approval Taken" className="text-xs sm:text-sm">
                            <span className="block truncate">Payment Not Received But Approval Taken</span>
                          </SelectItem>
                          <SelectItem value="Booking Cancelled" className="text-xs sm:text-sm">
                            <span className="block truncate">Booking Cancelled</span>
                          </SelectItem>
                          <SelectItem value="Payment Not Received" className="text-xs sm:text-sm">
                            <span className="block truncate">Payment Not Received</span>
                          </SelectItem>
                          <SelectItem value="Complimentary" className="text-xs sm:text-sm">
                            <span className="block truncate">Complimentary</span>
                          </SelectItem>
                          <SelectItem value="Voucher" className="text-xs sm:text-sm">
                            <span className="block truncate"> Voucher</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ACTUAL AMOUNT */}
                    <div className="space-y-1.5 sm:space-y-1">
                      <Label className="text-xs sm:text-sm text-blue-700 font-medium">
                        Actual Received in Bank Amount
                      </Label>

                      <Input
                        type="number"
                        min={0}
                        placeholder="Enter actual amount received"
                        value={getCurrentStageData().actualReceivedAmount ?? ""}
                        disabled={getCurrentStageData().isCompleted || isSubmitting || !stageHasPlanned(selectedBookingForAccounts?.accountsPersonStage?.[accountsVerifyData.currentStage.toString()])}
                        onChange={(e) => {
                          let value = Number(e.target.value)

                          // ❌ negative value block
                          if (value < 0) value = 0

                          const currentStageKey = accountsVerifyData.currentStage === 1 ? 'stage1' : accountsVerifyData.currentStage === 2 ? 'stage2' : 'stage3';
                          setAccountsVerifyData({
                            ...accountsVerifyData,
                            [currentStageKey]: {
                              ...accountsVerifyData[currentStageKey],
                              actualReceivedAmount: value,
                            }
                          });
                        }}
                        onWheel={(e) => e.currentTarget.blur()} // ❌ scroll change block
                        className={`h-10 sm:h-9 text-xs sm:text-sm ${getCurrentStageData().isCompleted
                          ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed opacity-75'
                          : 'border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-400 hover:border-blue-500'
                          }`}
                      />
                    </div>

                    {/* REMARKS */}
                    <div className="space-y-1.5 sm:space-y-1 mt-3">
                      <Label className="text-xs sm:text-sm text-blue-700 font-medium">
                        Final Remarks
                      </Label>

                      <Textarea
                        placeholder="Enter verification remarks"
                        value={getCurrentStageData().remarks}
                        disabled={getCurrentStageData().isCompleted || isSubmitting || !stageHasPlanned(selectedBookingForAccounts?.accountsPersonStage?.[accountsVerifyData.currentStage.toString()])}
                        onChange={(e) => {
                          const currentStageKey = accountsVerifyData.currentStage === 1 ? 'stage1' : accountsVerifyData.currentStage === 2 ? 'stage2' : 'stage3';
                          setAccountsVerifyData({
                            ...accountsVerifyData,
                            [currentStageKey]: {
                              ...accountsVerifyData[currentStageKey],
                              remarks: e.target.value,
                            }
                          });
                        }}
                        rows={2}
                        className={`text-xs sm:text-sm resize-none ${getCurrentStageData().isCompleted
                          ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed opacity-75'
                          : 'border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-400 hover:border-blue-500'
                          }`}
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAccountsVerifyModal(false)
                  setSelectedBookingForAccounts(null)
                }}
              >
                Cancel
              </Button>

              {/* Show Submit Button ONLY if: Stage is activated AND not completed */}
              {(() => {
                const stageData = selectedBookingForAccounts?.accountsPersonStage?.[accountsVerifyData.currentStage.toString()];
                const isStageActivated = stageHasPlanned(stageData);
                const isStageNotCompleted = !getCurrentStageData().isCompleted;
                const canSubmit = isStageActivated && isStageNotCompleted;

                return canSubmit && (
                  <Button
                    onClick={handleAccountsVerifySubmit}
                    disabled={isSubmitting || !isCurrentStageComplete()}
                    className={`
          flex items-center gap-2 transition-all
          ${(isSubmitting || !isCurrentStageComplete())
                        ? "bg-slate-400 text-white cursor-not-allowed opacity-80"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      }
        `}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {(() => {
                          const activatedForLabel = [1, 2, 3].filter(n => {
                            const sd = selectedBookingForAccounts?.accountsPersonStage?.[n.toString()];
                            return sd?.planned && sd.planned.trim() !== "";
                          });
                          const isLast = activatedForLabel[activatedForLabel.length - 1] === accountsVerifyData.currentStage;
                          return isLast ? "Submit Final Stage & Complete" : `Submit Stage ${accountsVerifyData.currentStage}`;
                        })()}
                      </>
                    )}
                  </Button>
                );
              })()}

              {/* Stage Completion Status */}
              {getCurrentStageData().isCompleted && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  Stage {accountsVerifyData.currentStage} Completed
                  {getCurrentStageData().submittedAt && (
                    <span className="text-xs text-green-600 ml-2">
                      ({formatSafeDateString(getCurrentStageData().submittedAt, true)})
                    </span>
                  )}
                </div>
              )}

              {/* Incomplete Stage Warning */}
              {!getCurrentStageData().isCompleted && !isCurrentStageComplete() && (
                <div className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200">
                  ⏳ Complete required fields for Stage {accountsVerifyData.currentStage} to submit
                </div>
              )}
            </DialogFooter>


          </DialogContent>
        </Dialog>


        {/* FO PMS Verify Modal */}
        <Dialog
          open={showFOPMSVerifyModal}
          onOpenChange={(open) => {
            if (isSubmitting) return   // ❌ submit ke time close block
            setFOPMSVerifyModal(open)
          }}
        >
          <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">

            {/* ================= HEADER ================= */}
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-600">
                <Building className="h-5 w-5" />
                FO PMS Verify
              </DialogTitle>

              {/* Customer Summary */}
              {selectedBookingForFOPMS && (
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Booking Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-xs text-slate-600">Customer:</span>
                      <p className="font-semibold text-blue-900">{selectedBookingForFOPMS?.guestName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Booking ID:</span>
                      <p className="font-semibold text-blue-900">{selectedBookingForFOPMS?.bookingId}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Phone No:</span>
                      <p className="font-semibold text-blue-900">
                        {selectedBookingForFOPMS?.mobile || "+91 9876543210"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-600 block">
                        PI Link:
                      </span>

                      {selectedBookingForFOPMS?.piLink ? (
                        <a
                          href={selectedBookingForFOPMS.piLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-600 underline hover:text-blue-700"
                        >
                          View PI
                        </a>
                      ) : (
                        <p className="text-xs text-slate-400">N/A</p>
                      )}
                    </div>

                    <div>
                      <span className="text-xs text-slate-600">Check-in Date:</span>
                      <p className="font-semibold text-slate-900">{selectedBookingForFOPMS?.checkIn}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Check-out Date:</span>
                      <p className="font-semibold text-slate-900">{selectedBookingForFOPMS?.checkOut}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Total PI Amount:</span>
                      <p className="font-semibold text-green-700">{selectedBookingForFOPMS?.originalAmount}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Package:</span>
                      <p className="font-semibold text-slate-900">{selectedBookingForFOPMS?.programmeName}</p>
                    </div>
                  </div>
                </div>



              )}
              {selectedBookingForFOPMS && (
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-purple-600" />
                    Sales Agent Verify Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-xs text-slate-600">Booking Taken By:</span>
                      <p className="font-semibold text-slate-900">{selectedBookingForFOPMS?.bookingTakenBy}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Booking Status:</span>

                      <p className="font-semibold text-green-700">
                        {selectedBookingForFOPMS?.editActionStatus?.trim()
                          ? selectedBookingForFOPMS?.editActionStatus
                          : "Pending"}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-slate-600">Remarks:</span>
                      <p className="font-semibold text-slate-900">{selectedBookingForFOPMS?.cancelledRemarks}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Cancelled Reason:</span>
                      <p className="font-semibold text-slate-900">{selectedBookingForFOPMS?.cancelledReason}</p>
                    </div>
                  </div>
                </div>
              )}

            </DialogHeader>

            {/* ================= ACCOUNTS SUMMARY ================= */}
            {selectedBookingForFOPMS && (
              <div
                className={`
    p-4 rounded-lg mt-3 shadow-sm
    ${isAccountsPending
                    ? "bg-red-50 border border-red-200"
                    : "bg-green-50 border border-green-300"}
  `}
              >
                {/* HEADER WITH ICON */}
                <h4 className="text-base font-semibold mb-3 flex items-center gap-2 text-gray-800">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Accounts Verification Summary
                </h4>
                <table className="w-full mb-3 table-fixed">
                  <tbody className="space-y-1">

                    {/* STATUS */}
                    <tr>
                      <td className="w-44 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                        Status
                      </td>
                      <td className="text-sm font-semibold">
                        <span className={isAccountsPending ? "text-red-600" : "text-green-600"}>
                          {accountsVerifyData.stage2.isCompleted
                            ? accountsVerifyData.stage2.paymentReceivedStatus
                            : accountsVerifyData.stage1.isCompleted
                              ? accountsVerifyData.stage1.paymentReceivedStatus
                              : "Pending"}
                        </span>
                      </td>
                    </tr>

                    {/* REMARKS */}
                    <tr>
                      <td className="w-44 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                        Remarks
                      </td>
                      <td className="text-sm font-medium">
                        <span className={isAccountsPending ? "text-red-600" : "text-green-600"}>
                          {accountsVerifyData.stage2.isCompleted
                            ? accountsVerifyData.stage2.remarks
                            : accountsVerifyData.stage1.isCompleted
                              ? accountsVerifyData.stage1.remarks
                              : "No remarks added yet"}
                        </span>
                      </td>
                    </tr>

                    {/* ACTUAL RECEIVED AMOUNT (FIRST) */}
                    <tr>
                      <td className="w-44 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                        Actual Received Amount
                      </td>
                      <td className="text-sm font-semibold text-gray-900">
                        {accountsVerifyData.stage2.isCompleted
                          ? `₹ ${accountsVerifyData.stage2.actualReceivedAmount}`
                          : accountsVerifyData.stage1.isCompleted
                            ? `₹ ${accountsVerifyData.stage1.actualReceivedAmount}`
                            : "—"}
                      </td>
                    </tr>

                    {/* VERIFIED BY (AFTER) */}
                    <tr>
                      <td className="w-44 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                        Verified By
                      </td>
                      <td className="text-sm font-medium text-gray-800">
                        {accountsVerifyData.stage2.isCompleted
                          ? accountsVerifyData.stage2.doer
                          : accountsVerifyData.stage1.isCompleted
                            ? accountsVerifyData.stage1.doer
                            : "—"}
                      </td>
                    </tr>

                  </tbody>
                </table>


                {/* WARNING BOX WITH ICON */}
                {isAccountsPending && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 flex gap-2.5">
                    <svg
                      className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-gray-800 leading-relaxed">
                      * Accounts verification is still pending.{" "}
                      <span className="font-bold">
                        FO PMS verification will be enabled once Accounts team completes
                        verification.
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ================= 2-STAGE PROGRESS INDICATOR ================= */}
            <div className="flex items-center justify-between gap-3 mb-3 mt-5">
              {[1, 2].map((stageNum) => {
                const stageKey = `stage${stageNum}` as 'stage1' | 'stage2';
                const isStageCompleted = foPMSVerifyData[stageKey].isCompleted;
                const isStageLocked = isFOStageLocked(stageNum);
                const isCurrent = foPMSVerifyData.currentStage === stageNum;

                // ✅ Check if stage is activated
                const stageData = selectedBookingForFOPMS?.foPersonStage?.[stageNum.toString()];
                const isStageActivated = stageData?.planned && stageData.planned.trim() !== "";

                // Activated FO stages list for toast messaging
                const activatedFOList = [1, 2].filter(n => {
                  const sd = selectedBookingForFOPMS?.foPersonStage?.[n.toString()];
                  return sd?.planned && sd.planned.trim() !== "";
                });
                const activatedAccList = [1, 2, 3].filter(n => {
                  const sd = selectedBookingForFOPMS?.accountsPersonStage?.[n.toString()];
                  return sd?.planned && sd.planned.trim() !== "";
                });
                const foIdx = activatedFOList.indexOf(stageNum);

                return (
                  <div key={stageNum} className="flex-1">
                    <button
                      type="button"
                      disabled={isStageLocked}
                      onClick={() => {
                        if (isStageLocked) {
                          if (!isStageActivated) {
                            toast.error(`FO Stage ${stageNum} is not activated yet`);
                          } else {
                            const prevFO = foIdx > 0 ? activatedFOList[foIdx - 1] : null;
                            const prevFOKey = prevFO ? `stage${prevFO}` as 'stage1' | 'stage2' : null;
                            const corrAcc = activatedAccList[foIdx];
                            if (prevFOKey && !foPMSVerifyData[prevFOKey].isCompleted) {
                              toast.error(`Complete FO Stage ${prevFO} before accessing FO Stage ${stageNum}`);
                            } else if (corrAcc) {
                              toast.error(`Complete Accounts Stage ${corrAcc} before accessing FO Stage ${stageNum}`);
                            }
                          }
                          return;
                        }
                        setFoPMSVerifyData({
                          ...foPMSVerifyData,
                          currentStage: stageNum,
                        });
                      }}
                      className={`w-full py-3 rounded-lg font-semibold transition-all relative ${isStageLocked
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
                        : isCurrent
                          ? "bg-purple-600 text-white shadow-lg ring-2 ring-purple-300"
                          : isStageCompleted
                            ? "bg-green-500 text-white cursor-pointer hover:bg-green-600"
                            : "bg-slate-200 text-slate-700 cursor-pointer hover:bg-slate-300"
                        }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          Stage {stageNum}
                          {isStageCompleted && (
                            <CheckCircle className="h-4 w-4 inline" />
                          )}
                          {isStageLocked && !isStageActivated && (
                            <span className="text-xs">🔒</span>
                          )}
                        </div>
                        {isStageCompleted && foPMSVerifyData[stageKey].submittedAt && (
                          <span className="text-[10px] opacity-90">
                            {formatSafeDateString(foPMSVerifyData[stageKey].submittedAt)}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ================= STAGE DEPENDENCIES INFO ================= */}
            {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3 mb-3">
              <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Stage Dependencies:
              </p>
              <div className="text-xs text-blue-700 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${accountsVerifyData.stage1.isCompleted ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <span>FO Stage 1 requires: <strong>Accounts Stage 1</strong> {accountsVerifyData.stage1.isCompleted ? '✓' : '(Pending)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${accountsVerifyData.stage2.isCompleted ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <span>FO Stage 2 requires: <strong>Accounts Stage 2</strong> {accountsVerifyData.stage2.isCompleted ? '✓' : '(Pending)'}</span>
                </div>
              </div>
            </div> */}

            {/* ================= FO PMS FORM ================= */}
            <div
              className={`p-5 rounded-lg shadow-sm mt-5 border-2 ${getFOCurrentStageData().isCompleted
                ? "bg-gradient-to-r from-gray-50 to-slate-100 border-gray-400"
                : isAccountsPending
                  ? "bg-gray-50 border-gray-200 opacity-70"
                  : "bg-purple-50 border-purple-200"
                }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className={`w-5 h-5 ${getFOCurrentStageData().isCompleted ? 'text-gray-700' : 'text-purple-700'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                </svg>
                <h3 className={`text-lg font-semibold ${getFOCurrentStageData().isCompleted ? 'text-gray-700' : 'text-purple-800'}`}>
                  FO PMS Verification Details - Stage {foPMSVerifyData.currentStage}
                </h3>
                {getFOCurrentStageData().isCompleted && (
                  <span className="ml-auto bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Completed - Read Only
                  </span>
                )}
              </div>

              {/* Show completed stage info banner */}
              {getFOCurrentStageData().isCompleted && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-800 flex items-center gap-2">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>
                      This stage was completed on{' '}
                      <strong>{formatSafeDateString(getFOCurrentStageData().submittedAt)}</strong>
                      {getFOCurrentStageData().doer && ` by ${getFOCurrentStageData().doer}`}.
                      The form below shows the submitted data (read-only).
                    </span>
                  </p>
                </div>
              )}

              {!getFOCurrentStageData().isCompleted && !stageHasPlanned(selectedBookingForFOPMS?.foPersonStage?.[foPMSVerifyData.currentStage.toString()]) && (
                <div className="mb-3 p-3 bg-slate-100 border border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
                    <span>
                      FO Stage {foPMSVerifyData.currentStage} is locked until planned is filled.
                    </span>
                  </p>
                </div>
              )}

              {/* FORM GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-purple-700">
                    Action Status <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    disabled={isAccountsPending || isSubmitting || getFOCurrentStageData().isCompleted || !stageHasPlanned(selectedBookingForFOPMS?.foPersonStage?.[foPMSVerifyData.currentStage.toString()])}
                    value={getFOCurrentStageData().releasePassActionStatus}
                    onValueChange={(value) => {
                      const stageKey = foPMSVerifyData.currentStage === 1 ? 'stage1' : 'stage2';
                      setFoPMSVerifyData({
                        ...foPMSVerifyData,
                        [stageKey]: {
                          ...foPMSVerifyData[stageKey],
                          releasePassActionStatus: value,
                        }
                      });
                    }}
                  >
                    <SelectTrigger className={`rounded-md ${getFOCurrentStageData().isCompleted
                      ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed opacity-75'
                      : 'border-purple-300'
                      }`}>
                      <SelectValue placeholder="Select action status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASS">PASS</SelectItem>
                      <SelectItem value="FAIL">FAIL</SelectItem>
                      <SelectItem value="Booking Cancelled">Booking Cancelled</SelectItem>
                      <SelectItem value="Complimentary">Complimentary</SelectItem>
                      <SelectItem value="Voucher">Voucher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-purple-700">
                    PMS Block Status <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    disabled={isAccountsPending || isSubmitting || getFOCurrentStageData().isCompleted || !stageHasPlanned(selectedBookingForFOPMS?.foPersonStage?.[foPMSVerifyData.currentStage.toString()])}
                    value={getFOCurrentStageData().pmsBlockStatus}
                    onValueChange={(value) => {
                      const stageKey = foPMSVerifyData.currentStage === 1 ? 'stage1' : 'stage2';
                      setFoPMSVerifyData({
                        ...foPMSVerifyData,
                        [stageKey]: {
                          ...foPMSVerifyData[stageKey],
                          pmsBlockStatus: value,
                        }
                      });
                    }}
                  >
                    <SelectTrigger className={`rounded-md ${getFOCurrentStageData().isCompleted
                      ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed opacity-75'
                      : 'border-purple-300'
                      }`}>
                      <SelectValue placeholder="Select PMS Block Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Booking Cancelled">Booking Cancelled</SelectItem>
                      <SelectItem value="No Action">No Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-5 space-y-1.5">
                <Label className="text-xs font-medium text-purple-700">
                  Informed to Booking Taken Person <span className="text-red-500">*</span>
                </Label>
                <Select
                  disabled={isAccountsPending || isSubmitting || getFOCurrentStageData().isCompleted || !stageHasPlanned(selectedBookingForFOPMS?.foPersonStage?.[foPMSVerifyData.currentStage.toString()])}
                  value={getFOCurrentStageData().informedToBookingPerson}
                  onValueChange={(value) => {
                    const stageKey = foPMSVerifyData.currentStage === 1 ? 'stage1' : 'stage2';
                    setFoPMSVerifyData({
                      ...foPMSVerifyData,
                      [stageKey]: {
                        ...foPMSVerifyData[stageKey],
                        informedToBookingPerson: value,
                      }
                    });
                  }}
                >
                  <SelectTrigger className={`rounded-md ${getFOCurrentStageData().isCompleted
                    ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed opacity-75'
                    : 'border-purple-300'
                    }`}>
                    <SelectValue placeholder="Informed to Booking Taken Person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">Yes</SelectItem>
                    <SelectItem value="NO">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-5 space-y-1.5">
                <Label className="text-xs font-medium text-purple-700">
                  Remarks <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  disabled={isAccountsPending || isSubmitting || getFOCurrentStageData().isCompleted || !stageHasPlanned(selectedBookingForFOPMS?.foPersonStage?.[foPMSVerifyData.currentStage.toString()])}
                  rows={3}
                  placeholder="Enter any additional remarks..."
                  value={getFOCurrentStageData().remarks}
                  onChange={(e) => {
                    const stageKey = foPMSVerifyData.currentStage === 1 ? 'stage1' : 'stage2';
                    setFoPMSVerifyData({
                      ...foPMSVerifyData,
                      [stageKey]: {
                        ...foPMSVerifyData[stageKey],
                        remarks: e.target.value,
                      }
                    });
                  }}
                  className={`text-sm ${getFOCurrentStageData().isCompleted
                    ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed opacity-75'
                    : 'border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-400 hover:border-purple-500'
                    }`}
                />
              </div>

              {/* Stage Completion Status */}
              {getFOCurrentStageData().isCompleted && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200 mt-3">
                  <CheckCircle className="h-4 w-4" />
                  Stage {foPMSVerifyData.currentStage} Completed
                  {getFOCurrentStageData().submittedAt && (
                    <span className="text-xs text-green-600 ml-2">
                      ({formatSafeDateString(getFOCurrentStageData().submittedAt, true)})
                    </span>
                  )}
                </div>
              )}

              {/* Incomplete Stage Warning */}
              {!getFOCurrentStageData().isCompleted && !isFOCurrentStageComplete() && (
                <div className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200 mt-3">
                  ⏳ Complete required fields for Stage {foPMSVerifyData.currentStage} to submit
                </div>
              )}
            </div>

            {/* ================= FOOTER ================= */}
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => {
                  setFOPMSVerifyModal(false)
                  setSelectedBookingForFOPMS(null)
                }}
              >
                Cancel
              </Button>

              {/* Show Submit Button ONLY if: Stage is activated AND not completed */}
              {(() => {
                const stageData = selectedBookingForFOPMS?.foPersonStage?.[foPMSVerifyData.currentStage.toString()];
                const isStageActivated = stageHasPlanned(stageData);
                const isStageNotCompleted = !getFOCurrentStageData().isCompleted;
                const canSubmit = isStageActivated && isStageNotCompleted && isFOCurrentStageComplete() && !isAccountsPending;

                return canSubmit && (
                  <Button
                    onClick={handleFOPMSVerifySubmit}
                    disabled={isSubmitting || isAccountsPending}
                    className={`
          flex items-center gap-2 transition-all
          ${isSubmitting || isAccountsPending
                        ? "bg-slate-400 text-white cursor-not-allowed opacity-80"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      }
        `}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {(() => {
                          const activatedFOForLabel = [1, 2].filter(n => {
                            const sd = selectedBookingForFOPMS?.foPersonStage?.[n.toString()];
                            return sd?.planned && sd.planned.trim() !== "";
                          });
                          const isLastFO = activatedFOForLabel[activatedFOForLabel.length - 1] === foPMSVerifyData.currentStage;
                          return isLastFO ? "Submit Final Stage & Complete" : `Submit Stage ${foPMSVerifyData.currentStage}`;
                        })()}
                      </>
                    )}
                  </Button>
                );
              })()}

              {/* Stage Completion Status */}
              {getFOCurrentStageData().isCompleted && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  Stage {foPMSVerifyData.currentStage} Completed
                  {getFOCurrentStageData().submittedAt && (
                    <span className="text-xs text-green-600 ml-2">
                      ({formatSafeDateString(getFOCurrentStageData().submittedAt, true)})
                    </span>
                  )}
                </div>
              )}
            </DialogFooter>

          </DialogContent>
        </Dialog>



        {/* On Checkout Collection Verify Modal */}
        <Dialog
          open={showCheckoutVerifyModal}
          onOpenChange={(open) => {
            if (isSubmitting) return   // ❌ submit ke time close block
            setShowCheckoutVerifyModal(open)
          }}
        >
          <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">

            <DialogHeader>
              {/* Title */}
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CreditCard className="h-5 w-5" />
                On Checkout Collection Verify
              </DialogTitle>

              {/* Customer Summary */}
              {selectedBookingForCheckout && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-4">
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-5 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-3">
                      <FileText className="h-4 w-5" />
                      Booking Summary
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <span className="text-xs text-slate-600">Customer:</span>
                        <p className="font-semibold text-blue-900">{selectedBookingForCheckout?.guestName}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-600">Booking ID:</span>
                        <p className="font-semibold text-blue-900">{selectedBookingForCheckout?.bookingId}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-600">Phone No:</span>
                        <p className="font-semibold text-blue-900">
                          {selectedBookingForCheckout?.mobile || "+91 9876543210"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-slate-600 block">
                          PI Link:
                        </span>

                        {selectedBookingForCheckout?.piLink ? (
                          <a
                            href={selectedBookingForCheckout.piLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-blue-600 underline hover:text-blue-700"
                          >
                            View PI
                          </a>
                        ) : (
                          <p className="text-xs text-slate-400">N/A</p>
                        )}
                      </div>

                      <div>
                        <span className="text-xs text-slate-600">Check-in Date:</span>
                        <p className="font-semibold text-slate-900">{selectedBookingForCheckout?.checkIn}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-600">Check-out Date:</span>
                        <p className="font-semibold text-slate-900">{selectedBookingForCheckout?.checkOut}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-600">Total PI Amount:</span>
                        <p className="font-semibold text-green-700">{selectedBookingForCheckout?.originalAmount}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-600">Package:</span>
                        <p className="font-semibold text-slate-900">{selectedBookingForCheckout?.programmeName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Amount Summary */}
              {selectedBookingForCheckout && (() => {
                const checkoutPiAmount = Number(selectedBookingForCheckout.originalAmount || selectedBookingForCheckout.amount || 0);
                const checkoutPaidAmount = getTotalReceivedRaw(selectedBookingForCheckout);
                const checkoutPendingAmount = Math.max(0, checkoutPiAmount - checkoutPaidAmount);

                return (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">
                      Amount Summary
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">
                          PI Amount
                        </p>
                        <p className="text-slate-800 font-semibold">
                          {getCurrencySymbol(String(selectedBookingForCheckout.currency).slice(0, 3))}{checkoutPiAmount}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">
                          Amount Received
                        </p>
                        <p className="text-slate-800 font-semibold">
                          {getCurrencySymbol(String(selectedBookingForCheckout.currency).slice(0, 3))}{checkoutPaidAmount}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">
                          Pending Amount
                        </p>
                        <p className="font-semibold text-orange-700">
                          {getCurrencySymbol(String(selectedBookingForCheckout.currency).slice(0, 3))}{checkoutPendingAmount.toFixed(2)}
                        </p>

                      </div>

                    </div>
                  </div>
                );
              })()}


            </DialogHeader>

            {/* Form Section */}
            <div className="space-y-6 py-4">


              {/* <div className="bg-green-50 p-5 rounded-lg border border-green-200 shadow-sm">


                <div className="flex items-center gap-2 mb-4">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-sm font-semibold text-green-800 tracking-wide">
                    Payment Upload Details
                  </h3>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                  <div className="space-y-1.5">

                    <Label className="text-xs font-medium text-green-700">
                      Received Amount <span className="text-red-500">*</span>
                    </Label>


                    <Input
                      type="number"
                      min={0}
                      max={Math.max(0, Number(selectedBookingForCheckout?.originalAmount || selectedBookingForCheckout?.amount || 0) - getTotalReceivedRaw(selectedBookingForCheckout))}
                      placeholder="Enter amount"
                      value={paymentData.receivedAmount ?? ""}
                      disabled={isSubmitting}   // 🔒 submit ke time disable
                      onChange={(e) => {
                        let value = Number(e.target.value)
                        const pendingAmount = Math.max(0, Number(selectedBookingForCheckout?.originalAmount || selectedBookingForCheckout?.amount || 0) - getTotalReceivedRaw(selectedBookingForCheckout))

                        // ❌ negative block
                        if (value < 0) value = 0

                        // ❌ over-payment block
                        if (value > pendingAmount) {
                          toast.error(
                            `Received amount cannot exceed pending amount ₹${pendingAmount}`
                          )
                          return
                        }

                        setPaymentData({
                          ...paymentData,
                          receivedAmount: value,
                        })
                      }}
                      onWheel={(e) => e.currentTarget.blur()} // ❌ scroll block
                      className={`
      ${isSubmitting ? "cursor-not-allowed bg-slate-100 opacity-70" : ""}
    `}
                    />
                  </div>



                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-green-700">
                      Payment Mode <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={paymentData.paymentMode}
                      onValueChange={(value) => setPaymentData({ ...paymentData, paymentMode: value })}
                    >
                      <SelectTrigger className="rounded-md border border-green-300 bg-white shadow-sm hover:border-green-400 focus:ring-2 focus:ring-green-400 transition-all">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>


                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-green-700">
                      Received Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="datetime-local"
                      max={new Date(new Date().getTime() + 60000).toISOString().slice(0, 16)} // allow current minute
                      className="rounded-md border border-green-300 bg-white shadow-sm hover:border-green-400 focus:ring-2 focus:ring-green-400 transition-all"
                      value={paymentData.receivedDate ? (paymentData.receivedDate.includes("T") ? paymentData.receivedDate.slice(0, 16) : new Date(paymentData.receivedDate).toISOString().slice(0, 16)) : ""}
                      onKeyDown={() => {
                        teamPaymentIsTypingRef.current = true;
                        if (teamPaymentBlurTimeoutRef.current) clearTimeout(teamPaymentBlurTimeoutRef.current);
                      }}
                      onBlur={() => {
                        teamPaymentIsTypingRef.current = false;
                        if (teamPaymentBlurTimeoutRef.current) clearTimeout(teamPaymentBlurTimeoutRef.current);
                      }}
                      onChange={(e) => {
                        const picked = e.target.value;
                        if (!picked) {
                          setPaymentData({ ...paymentData, receivedDate: "" });
                          return;
                        }
                        const processed = processDateTime(picked);
                        const inputDate = new Date(processed);
                        if (inputDate > new Date()) {
                          toast.error("Received Date cannot be in the future");
                          return;
                        }
                        setPaymentData({ ...paymentData, receivedDate: processed });

                        if (picked && picked.length === 16 && !teamPaymentIsTypingRef.current) {
                          if (teamPaymentBlurTimeoutRef.current) clearTimeout(teamPaymentBlurTimeoutRef.current);
                          const target = e.target;
                          teamPaymentBlurTimeoutRef.current = setTimeout(() => {
                            if (document.activeElement === target) {
                              target.blur();
                            }
                          }, 600);
                        }
                      }}
                    />
                  </div>


                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-green-700">
                      Receipt Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Enter receipt number"
                      className="rounded-md border border-green-300 bg-white shadow-sm hover:border-green-400 focus:ring-2 focus:ring-green-400 transition-all"
                      value={paymentData.receiptNumber}
                      onChange={(e) => setPaymentData({ ...paymentData, receiptNumber: e.target.value })}
                    />
                  </div>

                </div>
              </div> */}

              {/* Checkout Verification Section */}
              <div className="bg-green-50 p-5 rounded-lg border border-green-200 shadow-sm">

                {/* Title */}
                <div className="flex items-center gap-2 mb-4">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-sm font-semibold text-green-800 tracking-wide">
                    Checkout Verification Details
                  </h3>
                </div>

                {/* Show completed stage info banner */}
                {selectedBookingForCheckout?.checkOutPersonStage?.["1"]?.actual && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-800 flex items-center gap-2">
                      <Info className="h-4 w-4 flex-shrink-0" />
                      <span>
                        This stage was completed on{' '}
                        <strong>{formatSafeDateString(selectedBookingForCheckout.checkOutPersonStage["1"].actual, true)}</strong>
                        {selectedBookingForCheckout.checkOutPersonStage["1"].doer && ` by ${selectedBookingForCheckout.checkOutPersonStage["1"].doer}`}.
                        The form below shows the submitted data (read-only).
                      </span>
                    </p>
                  </div>
                )}

                {!selectedBookingForCheckout?.checkOutPersonStage?.["1"]?.actual && !stageHasPlanned(selectedBookingForCheckout?.checkOutPersonStage?.["1"]) && (
                  <div className="mb-4 p-3 bg-slate-100 border border-slate-300 rounded-lg">
                    <p className="text-xs text-slate-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
                      <span>Checkout Verify is locked until planned is filled.</span>
                    </p>
                  </div>
                )}

                {/* Inputs Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Payment Status */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-green-700">
                      Payment Received Status <span className="text-red-500">*</span>
                    </Label>

                    <Select
                      disabled={isSubmitting || !!selectedBookingForCheckout?.checkOutPersonStage?.["1"]?.actual || !stageHasPlanned(selectedBookingForCheckout?.checkOutPersonStage?.["1"])}   // 🔒 submit/completed/planned blank ke time disable
                      value={checkoutVerifyData.paymentReceivedStatus}
                      onValueChange={(value) =>
                        setCheckoutVerifyData({
                          ...checkoutVerifyData,
                          paymentReceivedStatus: value,
                        })
                      }
                    >
                      <SelectTrigger
                        className={`
      rounded-md border border-green-300 bg-white shadow-sm
      hover:border-green-400 focus:ring-2 focus:ring-green-400 transition-all
      ${(isSubmitting || !!selectedBookingForCheckout?.checkOutPersonStage?.["1"]?.actual || !stageHasPlanned(selectedBookingForCheckout?.checkOutPersonStage?.["1"])) ? "cursor-not-allowed opacity-70" : ""}
    `}
                      >
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="Done">Done</SelectItem>
                        <SelectItem value="Payment Received">Payment Received</SelectItem>
                        <SelectItem value="Payment Not Received But Approval Taken">Payment Not Received But Approval Taken</SelectItem>
                        <SelectItem value="Booking Cancelled">Booking Cancelled</SelectItem>
                        <SelectItem value="Payment Not Received">Payment Not Received</SelectItem>
                        <SelectItem value="Complimentary">Complimentary</SelectItem>
                        <SelectItem value="Voucher">Voucher</SelectItem>
                      </SelectContent>
                    </Select>

                  </div>

                </div>

                {/* Remarks Field */}
                <div className="space-y-1.5 mt-4">
                  <Label className="text-xs font-medium text-green-700">Remarks <span className="text-red-500">*</span></Label>

                  <Textarea
                    disabled={isSubmitting || !!selectedBookingForCheckout?.checkOutPersonStage?.["1"]?.actual || !stageHasPlanned(selectedBookingForCheckout?.checkOutPersonStage?.["1"])}
                    placeholder="Enter any additional remarks..."
                    className={`rounded-md border border-green-300 bg-white shadow-sm hover:border-green-400 focus:ring-2 focus:ring-green-400 transition-all ${(isSubmitting || !!selectedBookingForCheckout?.checkOutPersonStage?.["1"]?.actual || !stageHasPlanned(selectedBookingForCheckout?.checkOutPersonStage?.["1"])) ? "cursor-not-allowed opacity-75 bg-gray-50" : ""}`}
                    value={checkoutVerifyData.remarks}
                    onChange={(e) =>
                      setCheckoutVerifyData({ ...checkoutVerifyData, remarks: e.target.value })
                    }
                    rows={3}
                  />
                </div>

              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                disabled={isSubmitting}   // 🔒 submit ke time cancel block
                onClick={() => {
                  if (isSubmitting) return

                  setShowCheckoutVerifyModal(false)
                  setSelectedBookingForCheckout(null)
                  setPaymentData({
                    amount: selectedBookingForPayment?.amount.toString() || "",
                    receivedAmount: "",
                    currency: "INR",
                    paymentMode: "",
                    receivedDate: "",
                    receiptNumber: "",
                    screenshot: null,
                    paymentLocation: "",
                    paymentCollectedBy: "",
                  })
                  setCheckoutVerifyData({
                    paymentReceivedStatus: "",
                    remarks: "",
                  })
                }}
                className={isSubmitting ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
              >
                Cancel
              </Button>

              {/* Stage Completion Status */}
              {selectedBookingForCheckout?.checkOutPersonStage?.["1"]?.actual && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  Checkout Completed
                  {selectedBookingForCheckout.checkOutPersonStage["1"].actual && (
                    <span className="text-xs text-green-600 ml-2">
                      ({formatSafeDateString(selectedBookingForCheckout.checkOutPersonStage["1"].actual, true)})
                    </span>
                  )}
                </div>
              )}

              {!selectedBookingForCheckout?.checkOutPersonStage?.["1"]?.actual && (
                <Button
                  onClick={handleCheckoutVerifySubmit}
                  disabled={
                    isSubmitting ||
                    !stageHasPlanned(selectedBookingForCheckout?.checkOutPersonStage?.["1"]) ||
                    !checkoutVerifyData.paymentReceivedStatus ||
                    !checkoutVerifyData.remarks ||
                    checkoutVerifyData.remarks.trim() === ""
                  }
                  className={`flex items-center gap-2 ${isSubmitting || !stageHasPlanned(selectedBookingForCheckout?.checkOutPersonStage?.["1"]) || !checkoutVerifyData.paymentReceivedStatus || !checkoutVerifyData.remarks || checkoutVerifyData.remarks.trim() === ""
                    ? "cursor-not-allowed opacity-70"
                    : "cursor-pointer !bg-green-600 hover:!bg-green-700 !text-white"
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              )}
            </DialogFooter>

          </DialogContent>
        </Dialog>

        {/* Approval Upload Modal */}
        <Dialog
          open={showApprovalModal}
          onOpenChange={(open) => {
            if (isSubmitting) return;
            setShowApprovalModal(open);
          }}
        >
          <DialogContent
            className="
          max-w-[calc(100vw-1rem)]
          sm:max-w-5xl
          max-h-[90vh]
          overflow-y-auto
          rounded-2xl
          p-6
          shadow-xl
          border border-slate-200
          bg-white
        "
          >
            {/* ================= HEADER ================= */}
            <DialogHeader className="mb-4 border-b pb-3">
              <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Upload className="h-6 w-6 text-indigo-600" />
                Upload Approval Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 border-l-4 border-indigo-600 pl-3">
                Approval Taken Information
              </h3>

              {/* ================= GRID ================= */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-md overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500">
                    <FileText className="h-5 w-5 text-white" />
                    <h3 className="text-base font-bold text-white">
                      Booking Summary
                    </h3>
                  </div>

                  {/* Content */}
                  <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-5">

                    {/* Customer */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Customer</p>
                      <p className="font-semibold text-slate-900 text-sm break-words">
                        {selectedBookingForApproval?.guestName || "-"}
                      </p>
                    </div>

                    {/* Booking ID */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Booking ID</p>
                      <p className="font-semibold text-indigo-700 text-sm">
                        {selectedBookingForApproval?.bookingId || "-"}
                      </p>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone No</p>
                      <p className="font-semibold text-slate-900 text-sm">
                        {selectedBookingForApproval?.mobile || "-"}
                      </p>
                    </div>

                    {/* PI Link */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">PI Link</p>
                      {selectedBookingForApproval?.piLink ? (
                        <a
                          href={selectedBookingForApproval.piLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-sm text-indigo-600 underline hover:text-indigo-700 inline-flex items-center gap-1"
                        >
                          View PI
                        </a>
                      ) : (
                        <p className="text-slate-400 text-sm">N/A</p>
                      )}
                    </div>

                    {/* Check-in */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Check-in</p>
                      <p className="font-semibold text-slate-900 text-sm">
                        {selectedBookingForApproval?.checkIn || "-"}
                      </p>
                    </div>

                    {/* Check-out */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Check-out</p>
                      <p className="font-semibold text-slate-900 text-sm">
                        {selectedBookingForApproval?.checkOut || "-"}
                      </p>
                    </div>

                    {/* Total PI Amount */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Amount</p>
                      <p className="font-bold text-emerald-600 text-sm">
                        {getCurrencySymbol(String(selectedBookingForApproval?.currency).slice(0, 3))} {selectedBookingForApproval?.originalAmount || "-"}
                      </p>
                    </div>

                    {/* Package */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Package</p>
                      <p className="font-semibold text-slate-900 text-sm break-words">
                        {selectedBookingForApproval?.programmeName || "-"}
                      </p>
                    </div>

                  </div>
                </div>

                {/* ============ HIGHLIGHTED ACTION SECTION ============ */}
                <div className="lg:col-span-1">
                  <div
                    className="
                  p-4
                  rounded-xl
                  border-2 border-indigo-300
                  bg-indigo-50/40
                  space-y-6
                "
                  >
                    <h4 className="text-sm font-semibold text-slate-800">
                      Approval Details (Required)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Approved By */}
                      <div className="space-y-1.5">
                        <Label className="font-medium text-slate-700">
                          Approved By <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          disabled={isSubmitting}
                          value={approvalData.approvedBy}
                          onValueChange={(value) =>
                            setApprovalData({ ...approvalData, approvedBy: value })
                          }
                        >
                          <SelectTrigger
                            className={`border-indigo-300 focus:ring-2 focus:ring-indigo-300 ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                              }`}
                          >
                            <SelectValue placeholder="Select Approver" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Abhilash Sir">Abhilash Sir</SelectItem>
                            <SelectItem value="GM Sir">GM Sir</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Approve Till Date */}
                      <div className="space-y-1.5">
                        <Label className="font-medium text-slate-700">
                          Approve Till Date <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="datetime-local"
                          disabled={isSubmitting}
                          value={approvalData.approveTillDate ? (approvalData.approveTillDate.includes("T") ? approvalData.approveTillDate.slice(0, 16) : new Date(approvalData.approveTillDate).toISOString().slice(0, 16)) : ""}
                          min={new Date().toISOString().slice(0, 16)}
                          onKeyDown={() => {
                            teamApprovalIsTypingRef.current = true;
                            if (teamApprovalBlurTimeoutRef.current) clearTimeout(teamApprovalBlurTimeoutRef.current);
                          }}
                          onBlur={() => {
                            teamApprovalIsTypingRef.current = false;
                            if (teamApprovalBlurTimeoutRef.current) clearTimeout(teamApprovalBlurTimeoutRef.current);
                          }}
                          onChange={(e) => {
                            const picked = e.target.value;
                            if (!picked) {
                              setApprovalData({ ...approvalData, approveTillDate: "" });
                              return;
                            }
                            setApprovalData({
                              ...approvalData,
                              approveTillDate: processDateTime(picked),
                            });

                            if (picked && picked.length === 16 && !teamApprovalIsTypingRef.current) {
                              if (teamApprovalBlurTimeoutRef.current) clearTimeout(teamApprovalBlurTimeoutRef.current);
                              const target = e.target;
                              teamApprovalBlurTimeoutRef.current = setTimeout(() => {
                                if (document.activeElement === target) {
                                  target.blur();
                                }
                              }, 600);
                            }
                          }}
                          className={`border-indigo-300 focus:ring-2 focus:ring-indigo-300 ${isSubmitting ? "opacity-70 cursor-not-allowed bg-slate-100" : ""
                            }`}
                        />
                      </div>

                      {/* Upload Screenshot */}
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="font-medium text-slate-700">
                          Upload Approval Screenshot <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          disabled={isSubmitting}
                          onChange={(e) =>
                            setApprovalData({
                              ...approvalData,
                              screenshot: e.target.files?.[0] || null,
                            })
                          }
                          className={`border-indigo-300 focus:ring-2 focus:ring-indigo-300 ${isSubmitting ? "opacity-70 cursor-not-allowed bg-slate-100" : ""
                            }`}
                        />
                      </div>

                      {/* Remarks */}
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="font-medium text-slate-700">
                          Remarks <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          disabled={isSubmitting}
                          placeholder="Enter remarks..."
                          value={approvalData.remarks}
                          onChange={(e) =>
                            setApprovalData({
                              ...approvalData,
                              remarks: e.target.value,
                            })
                          }
                          className={`border-indigo-300 min-h-[90px] focus:ring-2 focus:ring-indigo-300 ${isSubmitting ? "opacity-70 cursor-not-allowed bg-slate-100" : ""
                            }`}
                        />
                      </div>

                      {/* Your Name */}
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="font-medium text-slate-700">
                          Your Name <span className="text-red-500">*</span>
                        </Label>

                        <Input
                          disabled={true} // 🔒 ALWAYS DISABLED (logic untouched)
                          readOnly        // extra safety
                          placeholder="Enter your name"
                          value={user?.name || approvalData.uploadedBy}
                          onChange={(e) =>
                            setApprovalData({
                              ...approvalData,
                              uploadedBy: user?.name || approvalData.uploadedBy,
                            })
                          }
                          className="
      border-slate-300
      bg-slate-100
      text-slate-500
      cursor-not-allowed
      focus:ring-0
      focus:border-slate-300
      opacity-90
    "
                        />
                      </div>


                    </div>
                  </div>
                </div>
                {/* ============ END HIGHLIGHT ============ */}

              </div>
            </div>

            {/* ================= FOOTER ================= */}
            <DialogFooter className="pt-4 border-t sticky bottom-0 bg-white flex gap-2">
              {/* CANCEL */}
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => {
                  if (isSubmitting) return;
                  setShowApprovalModal(false);
                }}
                className={isSubmitting ? "cursor-not-allowed opacity-70" : ""}
              >
                Cancel
              </Button>

              {/* SUBMIT */}
              <Button
                onClick={handleApprovalSubmit}
                disabled={
                  isSubmitting ||
                  !approvalData.approvedBy ||
                  !approvalData.approveTillDate ||
                  !approvalData.screenshot ||
                  !approvalData.remarks ||
                  !approvalData.remarks.trim()
                }
                className={`flex items-center gap-2 px-6 py-2 rounded-lg shadow-sm font-semibold ${isSubmitting ||
                  !approvalData.approvedBy ||
                  !approvalData.approveTillDate ||
                  !approvalData.screenshot ||
                  !approvalData.remarks ||
                  !approvalData.remarks.trim()
                  ? "cursor-not-allowed opacity-70 !bg-gray-300 !text-gray-600"
                  : "cursor-pointer !bg-green-600 hover:!bg-green-700 !text-white"
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Approval"
                )}
              </Button>
            </DialogFooter>


          </DialogContent>
        </Dialog>



        {/* View Booking Details Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent
            className="max-w-[calc(100vw-1rem)] sm:max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
          >
            <DialogHeader>
              <DialogTitle>Complete Booking Details - {viewBookingData?.bookingId}</DialogTitle>
            </DialogHeader>
            {viewBookingData && (
              <div className="space-y-6">
                {/* Basic Information - 4 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-lg border bg-white shadow-sm space-y-2 sm:space-y-3">
                    <h3 className="text-xs sm:text-[13px] font-semibold border-b pb-1 text-blue-600">Basic Information</h3>
                    <div className="space-y-2 text-[10px] sm:text-[11px] leading-tight">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getPaymentStatusBadge(viewBookingData?.paymentStatus || viewBookingData?.paymentStatus)} font-semibold text-xs`}>{(viewBookingData?.paymentStatus || "").toString().toUpperCase()}</Badge>
                        <div className="text-[10px] font-semibold border-b pb-1">Payment Progress</div>
                      </div>
                      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-1">
                        <span className="text-gray-600">Timestamp:</span>
                        <span className="font-medium">{new Date().toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Buyer ID:</span>
                        <span className="font-medium ">{viewBookingData?.bookingId}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Booking Date:</span>
                        <span className="font-medium">{viewBookingData?.lastUpdated}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Reservation ID:</span>
                        <span className="font-medium">{viewBookingData?.bookingId}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Guest ID:</span>
                        <span className="font-medium">{viewBookingData?.guestId || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Edit ID:</span>
                        <span className="font-medium">{viewBookingData?.editID || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/*Guest Information */}

                  <div className="p-4 rounded-lg border bg-white shadow-sm space-y-3">
                    <h3 className="text-[13px] font-semibold border-b pb-1 text-green-600">Guest Information</h3>
                    <div className="space-y-2 text-[9px] leading-tight">
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{viewBookingData?.guestName}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Country Code:</span>
                        <span className="font-medium">{viewBookingData?.countryCode || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Mobile:</span>
                        <span className="font-medium">{viewBookingData?.mobile || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{viewBookingData?.email || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Gender:</span>
                        <span className="font-medium">{viewBookingData?.gender || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Is OP Patient:</span>
                        <span className="font-medium">{"-"}</span>
                      </div>
                    </div>
                  </div>

                  {/*Address Details */}

                  <div className="p-4 rounded-lg border bg-white shadow-sm space-y-3">
                    <h3 className="text-[13px] font-semibold border-b pb-1 text-purple-600">Address Details</h3>
                    <div className="space-y-2 text-[9px] leading-tight">
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Billing Address:</span>
                        <span className="font-medium">{viewBookingData?.billingAddress || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Country:</span>
                        <span className="font-medium">{viewBookingData?.country || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">State:</span>
                        <span className="font-medium">{viewBookingData?.state || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">District:</span>
                        <span className="font-medium">{viewBookingData?.district || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/*Stay Information */}

                  <div className="p-4 rounded-lg border bg-white shadow-sm space-y-3">
                    <h3 className="text-[13px] font-semibold border-b pb-1 text-orange-600">Stay Information</h3>
                    <div className="space-y-2 text-[9px] leading-tight">
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Arrival Date:</span>
                        <span className="font-medium">{viewBookingData?.checkIn}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Departure Date:</span>
                        <span className="font-medium">{viewBookingData?.checkOut}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Days of Stay:</span>
                        <span className="font-medium">{calculateDays(viewBookingData?.checkIn, viewBookingData?.checkOut)}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Package Type:</span>
                        <span className="font-medium">{viewBookingData?.programmeName || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Programme:</span>
                        <span className="font-medium">{viewBookingData?.programmeName}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Purpose of Stay:</span>
                        <span className="font-medium">{viewBookingData?.purposeOfStay || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Booking Type:</span>
                        <span className="font-medium">{viewBookingData?.bookingType || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Details - 4 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border bg-white shadow-sm space-y-3">
                    <h3 className="text-[13px] font-semibold border-b pb-1 text-red-600">Room Details</h3>
                    <div className="space-y-2 text-[9px] leading-tight">
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Room Number:</span>
                        <span className="font-medium">{viewBookingData?.roomNumber || "-"}</span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Room Type:</span>
                        <span className="font-medium">{viewBookingData?.roomType || "-"}</span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Room Category:</span>
                        <span className="font-medium">{viewBookingData?.roomCategory || "-"}</span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Adults:</span>
                        <span className="font-medium">{viewBookingData?.adults}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Male:</span>
                        <span className="font-medium">{viewBookingData?.male}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Female:</span>
                        <span className="font-medium">{viewBookingData?.female}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Children:</span>
                        <span className="font-medium">{viewBookingData?.children}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-white shadow-sm space-y-3">
                    <h3 className="text-[13px] font-semibold border-b pb-1 text-blue-600">Guest Status</h3>
                    <div className="space-y-2 text-[9px] leading-tight">
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Guest Status:</span>
                        <span className="font-medium">{viewBookingData?.guestStatus || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Guest History:</span>
                        <span className="font-medium">{viewBookingData?.guestHistory || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Repeat Client:</span>
                        <span className="font-medium">{viewBookingData?.repeat || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Client Category:</span>
                        <span className="font-medium">{viewBookingData?.clientCategory || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Client Type:</span>
                        <span className="font-medium">{viewBookingData?.clientType || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Group Booking:</span>
                        <span className="font-medium">
                          {(viewBookingData?.groupBooking === "Yes" || String(viewBookingData?.bookingType || viewBookingData?.bookingDetails?.bookingType).toLowerCase() === "group") ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/*Financial Details */}
                  <div className="p-4 rounded-lg border bg-white shadow-sm space-y-3">
                    <h3 className="text-[13px] font-semibold border-b pb-1 text-green-600">Financial Details</h3>
                    <div className="space-y-2 text-[9px] leading-tight">
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Total Amount (Before Discount):</span>
                        <span className="font-medium">
                          {viewBookingData?.totalAmountBeforeDiscount
                            ? `${getCurrencySymbol(String(viewBookingData?.currency).slice(0, 3))}${Number(viewBookingData?.totalAmountBeforeDiscount).toLocaleString()}`
                            : `${getCurrencySymbol(String(viewBookingData?.currency).slice(0, 3))}${Number(viewBookingData?.totalAmount).toLocaleString()}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Discount Amount:</span>
                        <span className="font-medium">{getCurrencySymbol(String(viewBookingData?.currency).slice(0, 3))}{viewBookingData?.totalAmountBeforeDiscount > 0 ? viewBookingData?.totalAmountBeforeDiscount - viewBookingData?.originalAmount : 0}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Discount %:</span>
                        <span className="font-medium">
                          {viewBookingData?.discountPercent !== null && viewBookingData?.discountPercent !== undefined
                            ? `${Number(viewBookingData?.discountPercent)}%`
                            : viewBookingData?.totalAmountBeforeDiscount && viewBookingData?.totalAmount
                              ? `${Math.round(
                                ((Number(viewBookingData?.totalAmountBeforeDiscount) - Number(viewBookingData?.totalAmount)) /
                                  (Number(viewBookingData?.totalAmountBeforeDiscount) || 1)) * 100
                              )}%`
                              : "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Invoice Amount:</span>
                        <span className="font-medium">
                          {viewBookingData?.originalAmount
                            ? `${getCurrencySymbol(String(viewBookingData?.currency).slice(0, 3))}${Number(viewBookingData?.originalAmount).toLocaleString()}`
                            : "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Advance:</span>
                        <span className="font-medium">
                          {getCurrencySymbol(String(viewBookingData?.currency).slice(0, 3))}{Number(viewBookingData?.totalAmountReceived || viewBookingData?.receivedAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Balance:</span>
                        <span className="font-medium">
                          {getCurrencySymbol(String(viewBookingData?.currency).slice(0, 3))}{Number(viewBookingData?.originalAmount - (viewBookingData?.totalAmountReceived || viewBookingData?.receivedAmount || 0) || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Currency:</span>
                        <span className="font-medium">{viewBookingData?.currency || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/*Booking Management */}

                  <div className="p-4 rounded-lg border bg-white shadow-sm space-y-3">
                    <h3 className="text-[13px] font-semibold border-b pb-1 text-orange-600">Booking Management</h3>
                    <div className="space-y-2 text-[9px] leading-tight">
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Booking Taken By:</span>
                        <span className="font-medium">{viewBookingData?.bookingTakenBy || "-"}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Booking Status:</span>
                        <span className="font-medium">{viewBookingData?.status}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Booker Name:</span>
                        <span className="font-medium">{viewBookingData?.guestName}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Booker Email:</span>
                        <span className="font-medium">{viewBookingData?.email}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Booker Phone:</span>
                        <span className="font-medium">{viewBookingData?.mobile}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Data Source - Auto:</span>
                        <span className="font-medium">{viewBookingData?.dataSource}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Information - 4 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border bg-white shadow-sm space-y-3">
                    <h3 className="text-[13px] font-semibold border-b pb-1 text-emerald-600">
                      Payment Collection
                    </h3>

                    <div className="space-y-2 text-[9px] leading-tight">
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Payment Received Date:</span>
                        <span className="font-medium">
                          {viewBookingData?.paymentReceivedDate
                            ? new Date(viewBookingData.paymentReceivedDate).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Received Amount:</span>
                        <span className="font-medium">
                          {getCurrencySymbol(String(viewBookingData?.currency).slice(0, 3))}{Number(viewBookingData?.amountRecieved || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Payment Mode:</span>
                        <span className="font-medium">
                          {viewBookingData?.paymentMode || "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Receipt Number:</span>
                        <span className="font-medium">
                          {viewBookingData?.receiptNumber || "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Payment Location:</span>
                        <span className="font-medium">
                          {viewBookingData?.paymentLocation || "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Collection By:</span>
                        <span className="font-medium">
                          {viewBookingData?.collectionBy || "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Total Received:</span>
                        <span className="font-medium">
                          {getCurrencySymbol(String(viewBookingData?.currency).slice(0, 3))}{Number(viewBookingData?.amountRecieved || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Progress bar – % calculation only for UI */}
                      <div className="space-y-2">
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${viewComputedReceivedPct >= 100
                              ? "bg-green-500"
                              : viewComputedReceivedPct === 0
                                ? "bg-red-500"
                                : "bg-yellow-400"
                              }`}
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, Number(viewComputedReceivedPct) || 0)
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">% Received:</span>
                          <span className="font-medium">
                            {Number(viewComputedReceivedPct) || 0}%
                          </span>
                        </div>

                        <p className="text-xs mt-1 font-medium text-gray-700">
                          {getCurrencySymbol(String(viewBookingData?.currency).slice(0, 3))}{Number(viewBookingData?.amountRecieved || 0).toLocaleString()} / {getCurrencySymbol(String(viewBookingData?.currency).slice(0, 3))}{Number(viewBookingData?.originalAmount || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Pending Amount:</span>
                        <span className="font-medium">
                          {getCurrencySymbol(String(viewBookingData?.currency).slice(0, 3))}{Math.max(0, Number(viewBookingData?.originalAmount || 0) - Number(viewBookingData?.amountRecieved || viewBookingData?.receivedAmount || viewBookingData?.totalAmountReceived || 0)).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Payment Screenshot:</span>
                        {viewBookingData?.uploadScreenShot ? (
                          <a
                            href={viewBookingData.uploadScreenShot}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-emerald-600 underline hover:text-emerald-700"
                          >
                            View Screenshot
                          </a>
                        ) : (
                          <span className="font-medium text-gray-700">-</span>
                        )}
                      </div>



                      {/* PAYMENT HISTORY */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Payment Collection History:</span>

                        {Number(viewBookingData?.receivedAmount || viewBookingData?.paidAmount || 0) > 0 ||
                          (Array.isArray(viewBookingData?.paymentCollectionHistory) && viewBookingData.paymentCollectionHistory.length > 0) ||
                          (typeof viewBookingData?.paymentHistoryLink === "string" && viewBookingData.paymentHistoryLink.trim() !== "") ||
                          (Array.isArray(viewBookingData?.paymentHistoryLink) && viewBookingData.paymentHistoryLink.length > 0) ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPaymentHistoryModal({
                                bookingId: viewBookingData.bookingId,
                                guestName: viewBookingData.guestName,
                                mobile: viewBookingData.mobile || "",
                              })
                            }
                            className="font-medium text-blue-600 underline hover:text-blue-700"
                          >
                            View History
                          </button>
                        ) : (
                          <span className="font-medium text-gray-400">No History</span>
                        )}

                      </div>


                    </div>
                  </div>




                  {/*Approval Details */}

                  <div className="p-4 rounded-lg border bg-white shadow-sm space-y-3">
                    <h3 className="text-[13px] font-semibold border-b pb-1 text-green-600">
                      Approval Details
                    </h3>

                    <div className="space-y-2 text-[9px] leading-tight">
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Approval Given Date:</span>
                        <span className="font-medium">
                          {viewBookingData?.approvalGivenDate
                            ? new Date(viewBookingData.approvalGivenDate).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Approved Till Date:</span>
                        <span className="font-medium">
                          {viewBookingData?.approvedTillDate
                            ? new Date(viewBookingData.approvedTillDate).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Approved By:</span>
                        <span className="font-medium">
                          {viewBookingData?.approvedBy || "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Approval Remarks:</span>
                        <span className="font-medium">
                          {viewBookingData?.approvalRemarks || "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Approval Screenshot:</span>

                        {viewBookingData?.approvalScreenShot ? (
                          <a
                            href={viewBookingData.approvalScreenShot}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-indigo-600 underline hover:text-indigo-700"
                          >
                            View Screenshot
                          </a>
                        ) : (
                          <span className="font-medium text-gray-700">-</span>
                        )}
                      </div>
                    </div>
                  </div>



                  {/*Status Tracking */}

                  <div className="p-4 rounded-lg border bg-white shadow-sm space-y-3">
                    <h3 className="text-[13px] font-semibold border-b pb-1 text-orange-600">
                      Status Tracking
                    </h3>

                    <div className="space-y-2 text-[9px] leading-tight">
                      {/* ML FINAL STATUS */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">ML Final Status:</span>
                        <span className="font-medium">
                          {viewBookingData?.mlFinalStatus || "-"}
                        </span>
                      </div>

                      {/* ML REMARKS */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">ML Remarks:</span>
                        <span className="font-medium">
                          {viewBookingData?.mlRemarks || "-"}
                        </span>
                      </div>

                      {/* EDIT ACTION STATUS */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Edit Action Status:</span>
                        <span className="font-medium">
                          {viewBookingData?.editActionStatus || "-"}
                        </span>
                      </div>

                      {/* PI GENERATION STATUS */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">PI Generation Status:</span>
                        <span className="font-medium">
                          {viewBookingData?.piLink ? "Generated" : "Not Generated"}
                        </span>
                      </div>

                      {/* PI NUMBER */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">PI Number:</span>
                        <span className="font-medium">
                          {viewBookingData?.piNumber || "-"}
                        </span>
                      </div>

                      {/* PI HISTORY */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">PI History:</span>

                        {viewBookingData?.piHistoryLink ? (
                          <button
                            type="button"
                            onClick={() =>
                              setInvoiceHistoryModal({
                                bookingId: viewBookingData.bookingId,
                                guestName: viewBookingData.guestName,
                                mobile: viewBookingData.mobile || "",
                              })
                            }
                            className="font-medium text-blue-600 underline hover:text-blue-700"
                          >
                            View History
                          </button>
                        ) : (
                          <span className="font-medium text-gray-400">No History</span>
                        )}
                      </div>

                    </div>
                  </div>


                  {/*Travel Details */}

                  <div className="p-4 rounded-lg border bg-white shadow-sm space-y-3">
                    <h3 className="text-[13px] font-semibold border-b pb-1 text-purple-600">
                      Travel Details
                    </h3>

                    <div className="space-y-2 text-[9px] leading-tight">
                      {/* Arrival Time */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Arrival Time:</span>
                        <span className="font-medium">
                          {viewBookingData?.arrivalTime || "-"}
                        </span>
                      </div>

                      {/* Arrival Mode */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Arrival Mode:</span>
                        <span className="font-medium">
                          {viewBookingData?.arrivalMode || "-"}
                        </span>
                      </div>

                      {/* Arrival Pickup */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Arrival Pickup:</span>
                        <span className="font-medium">
                          {viewBookingData?.arrivalPickup || "-"}
                        </span>
                      </div>

                      {/* Departure Time */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Departure Time:</span>
                        <span className="font-medium">
                          {viewBookingData?.departureTime || "-"}
                        </span>
                      </div>

                      {/* Departure Mode */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Departure Mode:</span>
                        <span className="font-medium">
                          {viewBookingData?.departureMode || "-"}
                        </span>
                      </div>

                      {/* Departure Pickup */}
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Departure Pickup:</span>
                        <span className="font-medium">
                          {viewBookingData?.departurePickup || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Communication - Full width row with 4 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border bg-white shadow-sm space-y-3">
                    <h3 className="text-[13px] font-semibold border-b pb-1 text-orange-600">Communication</h3>

                    <div className="space-y-2 text-[9px] leading-tight">
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">WhatsApp to Client:</span>
                        <span className="font-medium">
                          {viewBookingData?.whatsappToClient
                            ? viewBookingData.whatsappToClient
                            : "pending"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Email to Client:</span>
                        <span className="font-medium">
                          {viewBookingData?.emailToClient
                            ? viewBookingData.emailToClient
                            : "pending"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">WhatsApp to Staff:</span>
                        <span className="font-medium">
                          {viewBookingData?.whatsappToStaff
                            ? viewBookingData.whatsappToStaff
                            : "pending"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Email to Staff:</span>
                        <span className="font-medium">
                          {viewBookingData?.emailToStaff
                            ? viewBookingData.emailToStaff
                            : "pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ////sales section */}

                <div className="mb-4 border-l-4 border-l-blue-500 bg-blue-50 rounded-sm overflow-hidden">
                  {/* Header bar - compact */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 border-b border-blue-200">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <Badge className="bg-blue-600 hover:bg-blue-700 text-xs">SALES</Badge>
                    <h3 className="text-sm font-semibold text-gray-800">Sales Verify Status Update</h3>
                  </div>

                  {/* Primary row table */}
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-blue-200">
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-blue-200">Planned</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-blue-200">Actual</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-blue-200">Time Delay</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-blue-200">Doer</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-blue-200">
                            Action Status
                          </th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-blue-200">
                            Reason of Cancellation
                          </th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-blue-100">
                          <td className="px-2 py-1.5 text-gray-700 border-r border-blue-200">{viewBookingData?.salesPersonStage["1"].planned || "-"}</td>
                          <td className="px-2 py-1.5 text-gray-600 border-r border-blue-200">{viewBookingData?.salesPersonStage["1"].actual || "-"}</td>
                          <td className="px-2 py-1.5 border-r border-blue-200">
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                              {viewBookingData?.salesPersonStage["1"].delay || "0 Days"}
                            </Badge>
                          </td>
                          <td className="px-2 py-1.5 text-gray-600 border-r border-blue-200">{viewBookingData?.salesPersonStage["1"].doer || "-"}</td>
                          <td className="px-2 py-1.5 border-r border-blue-200">
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                              {viewBookingData?.salesPersonStage["1"].status || "Pending"}
                            </Badge>
                          </td>
                          <td className="px-2 py-1.5 text-gray-600 border-r border-blue-200">{viewBookingData?.cancelledReason || "-"}</td>
                          <td className="px-2 py-1.5 text-gray-600">{viewBookingData?.salesPersonStage["1"].remarks || "-"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ////accounts section */}

                <div className="mb-4 border-l-4 border-l-green-500 bg-green-50 rounded-sm overflow-hidden">
                  {/* Header bar - compact */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border-b border-green-200">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <Badge className="bg-green-600 hover:bg-green-700 text-xs">ACCOUNTS</Badge>
                    <h3 className="text-sm font-semibold text-gray-800">Account Verify Status Update</h3>
                  </div>

                  {/* Stages as rows in single table */}
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-green-200">
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-green-200">Stage</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-green-200">Planned</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-green-200">Actual</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-green-200">Delay</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-green-200">Doer</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-green-200">
                            Payment Status
                          </th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-green-200 text-right pr-4">
                            Amount (₹)
                          </th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(viewBookingData?.accountsPersonStage || {}).map(
                          ([stageKey, stage], idx) => (
                            stage.planned && (
                              <tr key={stageKey} className="border-b border-green-100">
                                <td className="px-2 py-1.5 font-medium text-gray-800 border-r border-green-200">
                                  Stage {stageKey}
                                </td>
                                <td className="px-2 py-1.5 text-gray-700 border-r border-green-200">
                                  {stage.planned || "—"}
                                </td>
                                <td className="px-2 py-1.5 text-gray-700 border-r border-green-200">
                                  {stage.actual || "—"}
                                </td>
                                <td className="px-2 py-1.5 text-gray-700 border-r border-green-200">
                                  {stage.delay || "—"}
                                </td>
                                <td className="px-2 py-1.5 text-gray-700 border-r border-green-200">
                                  {stage.doer || "—"}
                                </td>
                                <td className="px-2 py-1.5 border-r border-green-200">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${stage.status
                                      ? "bg-green-50 text-green-700"
                                      : "bg-gray-50 text-gray-700"
                                      }`}
                                  >
                                    {stage.status || "Pending"}
                                  </Badge>
                                </td>
                                <td className="px-2 py-1.5 border-r border-green-200">
                                  -
                                </td>
                                <td className="px-2 py-1.5 text-gray-600">
                                  {stage.remarks || "—"}
                                </td>
                              </tr>
                            )
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>


                {/* /////////fo stage */}

                <div className="mb-4 border-l-4 border-l-amber-500 bg-amber-50 rounded-sm overflow-hidden">
                  {/* Header bar - compact */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 border-b border-amber-200">
                    <Database className="w-4 h-4 text-amber-600" />
                    <Badge className="bg-amber-600 hover:bg-amber-700 text-xs">PMS</Badge>
                    <h3 className="text-sm font-semibold text-gray-800">PMS Verify Status Update</h3>
                  </div>

                  {/* Stages as rows in table */}
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-amber-200">
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-amber-200">Stage</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-amber-200">Planned</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-amber-200">Actual</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-amber-200">
                            Time Delay
                          </th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-amber-200">Doer Name</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(viewBookingData?.foPersonStage || {}).map(
                          ([stageKey, stage]) => (
                            stage.planned && (
                              <tr key={stageKey} className="border-b border-amber-100">
                                {/* Stage number */}
                                <td className="px-2 py-1.5 font-medium text-gray-800 border-r border-amber-200">
                                  Stage {stageKey}
                                </td>

                                <td className="px-2 py-1.5 text-gray-700 border-r border-amber-200">
                                  {stage.planned || "—"}
                                </td>

                                <td className="px-2 py-1.5 text-gray-600 border-r border-amber-200">
                                  {stage.actual || "—"}
                                </td>

                                <td className="px-2 py-1.5 border-r border-amber-200">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${stage.status
                                      ? "bg-green-50 text-green-700"
                                      : "bg-orange-50 text-orange-700"
                                      }`}
                                  >
                                    {stage.status || "Pending"}
                                  </Badge>
                                </td>

                                <td className="px-2 py-1.5 text-gray-600 border-r border-amber-200">
                                  {stage.doer?.trim() ? stage.doer : "—"}
                                </td>
                                <td className="px-2 py-1.5 text-gray-600 border-r border-amber-200">
                                  {"—"}
                                </td>


                                <td className="px-2 py-1.5 text-gray-600">
                                  {stage.remarks || "—"}
                                </td>
                              </tr>
                            )
                          )
                        )}

                      </tbody>
                    </table>
                  </div>
                </div>

                {/* /////checkOut stage */}

                <div className="mb-0 border-l-4 border-l-purple-500 bg-purple-50 rounded-sm overflow-hidden">
                  {/* Header bar - compact */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 border-b border-purple-200">
                    <LogOut className="w-4 h-4 text-purple-600" />
                    <Badge className="bg-purple-600 hover:bg-purple-700 text-xs">CHECKOUT</Badge>
                    <h3 className="text-sm font-semibold text-gray-800">Checkout Verify Update</h3>
                  </div>

                  {/* Primary checkout row */}
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-purple-200">
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-purple-200">Planned</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-purple-200">Actual</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-purple-200">
                            Time Delay
                          </th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-purple-200">Doer</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-purple-200">
                            Check Amount % Received
                          </th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-r border-purple-200">Remarks</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-700">Payment Upload Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          Object.entries(viewBookingData?.foPersonStage || {}).map(
                            ([stageKey, stage]) => (
                              stage.planned && (
                                <tr className="border-b border-purple-100">
                                  <td className="px-2 py-1.5 text-gray-700 border-r border-purple-200">{stage.planned || "-"}</td>
                                  <td className="px-2 py-1.5 text-gray-600 border-r border-purple-200">{stage.actual || "-"}</td>
                                  <td className="px-2 py-1.5 border-r border-purple-200">
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                                      {stage.delay || "0 Days"}
                                    </Badge>
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-600 border-r border-purple-200">{stage.doer || "-"}</td>
                                  <td className="px-2 py-1.5 text-gray-600 border-r border-purple-200">-</td>
                                  <td className="px-2 py-1.5 text-gray-600 border-r border-purple-200">{stage.remarks || "-"}</td>
                                  <td className="px-2 py-1.5">
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                                      {stage.status || "Pending"}
                                    </Badge>
                                  </td>
                                </tr>
                              )))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* {detailPopupData && (
          <BookingDetailPopup
            isOpen={isDetailPopupOpen}
            onClose={() => { setIsDetailPopupOpen(false); setSelectedBookingId(""); }}
            bookingId={selectedBookingId}
          />

        )} */}

        {typeof document !== "undefined" &&
          paymentHistoryModal &&
          createPortal(
            <div className="fixed inset-0 z-[100000] pointer-events-auto">
              <PaymentRecordsModal
                bookingId={paymentHistoryModal.bookingId}
                guestName={paymentHistoryModal.guestName}
                mobile={paymentHistoryModal.mobile}
                onClose={() => setPaymentHistoryModal(null)}
              />
            </div>,
            document.body
          )}

        {typeof document !== "undefined" &&
          todayStayModal &&
          createPortal(
            <TodayStayModal
              type={todayStayModal}
              rows={(
                todayStayModal === "checkin" ? todayCheckIns :
                  todayStayModal === "checkout" ? todayCheckOuts :
                    inHouseNow
              ).map((b) => ({
                bookingId: b.bookingId,
                createdDate: b.createdDate,
                lastUpdated: b.lastUpdated,
                guestName: b.guestName,
                mobile: b.mobile,
                email: b.email,
                checkIn: b.checkIn,
                checkOut: b.checkOut,
                piNumber: b.piNumber,
                piLink: b.piLink,
                bookingTakenBy: b.bookingTakenBy,
                assignedTo: b.assignedTo,
                totalAmount: b.totalAmount,
                paidAmount: b.paidAmount,
                receivedPercentage: b.receivedPercentage,
                currency: b.currency,
              }))}
              onClose={() => setTodayStayModal(null)}
            />,
            document.body
          )}

        {typeof document !== "undefined" &&
          invoiceHistoryModal &&
          createPortal(
            <div className="fixed inset-0 z-[100000] pointer-events-auto">
              <InvoiceHistoryPopup
                open={!!invoiceHistoryModal}
                bookingId={invoiceHistoryModal.bookingId}
                guestName={invoiceHistoryModal.guestName}
                mobile={invoiceHistoryModal.mobile}
                onClose={() => setInvoiceHistoryModal(null)}
              />
            </div>,
            document.body
          )}

        <BookingDetailPopup
          isOpen={isDetailPopupOpen}
          onClose={() => { setIsDetailPopupOpen(false); setSelectedBookingId(""); setSelectedTableRow(undefined); }}
          bookingId={selectedBookingId}
          tableRowData={selectedTableRow}
        />

        {typeof document !== "undefined" &&
          showArrivalTicketModal &&
          selectedBookingForArrival &&
          createPortal(
            <div className="fixed inset-0 z-[100000] pointer-events-auto">
              <ArrivalTicketsModal
                open={showArrivalTicketModal}
                booking={selectedBookingForArrival}
                guestTrackerData={selectedBookingForArrival?.guesttrackerdata ?? (selectedBookingForArrival?.rawItem?.guesttrackerdata ?? null)}
                onClose={() => {
                  setShowArrivalTicketModal(false)
                  setSelectedBookingForArrival(null)
                }}
                onSubmit={(data: any) => {
                  showFormSubmitSuccess(data?.responseMessage || "Arrival flight details saved")
                  setShowArrivalTicketModal(false)
                  setSelectedBookingForArrival(null)
                  refetch()
                }}
              />
            </div>,
            document.body
          )}

        {typeof document !== "undefined" &&
          showDepartureTicketModal &&
          selectedBookingForDeparture &&
          createPortal(
            <div className="fixed inset-0 z-[100000] pointer-events-auto">
              <DepartureFlightModal
                open={showDepartureTicketModal}
                booking={selectedBookingForDeparture}
                guestTrackerData={selectedBookingForDeparture?.guesttrackerdata ?? (selectedBookingForDeparture?.rawItem?.guesttrackerdata ?? null)}
                onClose={() => {
                  setShowDepartureTicketModal(false)
                  setSelectedBookingForDeparture(null)
                }}
                onSubmit={(data: any) => {
                  showFormSubmitSuccess(data?.responseMessage || "Departure flight details saved")
                  setShowDepartureTicketModal(false)
                  setSelectedBookingForDeparture(null)
                  refetch()
                }}
              />
            </div>,
            document.body
          )}
      </div>
    </div >
  )
}
