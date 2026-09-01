"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAuth, type UserRole } from "@/hooks/use-auth";
import { useCrrBookings, isStageLocked, getStagePlannedDate, getStageActualDate, getStageSavedData, getStageDoer, isBookingCancelled, saveStage } from "@/hooks/use-crr-bookings";
import type {
    Role,
    Resp,
    StageStatus,
    CallStatus,
    YesNo,
    RatingStatus,
    DateRangePreset,
    Stage,
    Guest,
} from "@/types/crr";
import { DashboardLayout } from "@/components/dashboard-layout";
import { toast } from "sonner";
import DriverAssignmentArrivalModal from "@/components/Driverassignmentarrivalmodal";
import DriverAssignmentDepartureModal from "@/components/Driverassignmentdeparturemodal";
import GuestRequirementVerificationModal from "@/components/Guestrequirementverificationmodal";
import CrrStageViewModal from "@/components/CrrStageViewModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Search,
    Users,
    CheckCircle2,
    Clock,
    AlertTriangle,
    BarChart3,
    PhoneCall,
    Award,
    FileText,
    SlidersHorizontal,
    Briefcase,
    Calendar,
    ChevronRight,
    MoreVertical,
    Home,
    Star,
    Send,
    RotateCcw,
    TrendingUp,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Loader2,
    Eye,
    ClipboardCheck,
} from "lucide-react";

/* =========================================================
   TYPES
   (Role/Stage/Guest/etc. now live in @/types/crr so the GAS
   bookings hook can type against the exact same Guest shape —
   see the import block at the top of this file.)
========================================================= */

/* =========================================================
   STAGE DEFINITIONS
========================================================= */
const STAGES: Stage[] = [
    { no: 1, name: "Arrival Welcome on Pickup", resp: "GRE", trigger: "Before 2 Hours of Check-in", dateLabel: "Pickup Confirmed Time", remarkLabel: "Pickup / Welcome Remarks" },
    { no: 2, name: "Guest Request & Complaint Mgmt (QR Scan)", resp: "GRE", trigger: "During Stay (Check-in to Check-out)", dateLabel: "Request Logged Date", remarkLabel: "Request / Complaint Remarks" },
    { no: 3, name: "Next Visit Planning & Confirmation", resp: "Doctor", trigger: "After 1 Day of Check-out", dateLabel: "Next Visit Date", remarkLabel: "Remarks for Next Visit Date" },
    { no: 4, name: "Guest Feedback & Outcome Confirmation", resp: "GRE", trigger: "On Check-out Date", dateLabel: "Feedback Collected Date", remarkLabel: "Feedback / Outcome Remarks" },
    { no: 5, name: "Online Rating & Review Request", resp: "GRE", trigger: "On Check-out Date", dateLabel: "Review Request Date", remarkLabel: "Review Request Remarks" },
    { no: 6, name: "Safe Return Confirmation", resp: "GRE", trigger: "Departure + 3 Days", dateLabel: "Return Confirmed Date", remarkLabel: "Safe Return Remarks" },
    { no: 7, name: "Result Tracking & Health Progress Check", resp: "Doctor", trigger: "Departure + 20 Days", dateLabel: "Health Check Date", remarkLabel: "Progress / Health Remarks" },
    { no: 8, name: "Referral Collection & Lead Generation", resp: "FO", trigger: "Departure + 30 Days", dateLabel: "Referral Collected Date", remarkLabel: "Referral Details / Remarks" },
    { no: 9, name: "Driver Assignment – Arrival Pickup", resp: "FO", trigger: "Before Arrival", dateLabel: "Pickup Date", remarkLabel: "Remarks For Driver" },
    { no: 10, name: "Driver Assignment – Departure Drop", resp: "FO", trigger: "Before Departure", dateLabel: "Drop Date", remarkLabel: "Remarks For Driver" },
    { no: 11, name: "Guest Requirement Verification", resp: "GM", trigger: "Before Check-in", dateLabel: "Verification Timestamp", remarkLabel: "Remarks" },
];

/* =========================================================
   EXTERNAL LINKS
========================================================= */
// Guest Feedback & Outcome Confirmation (Stage 4) — Google Apps Script feedback
// collection form. The guest's Booking ID is passed as a query param so the
// form opens pre-scoped to that booking.
const FEEDBACK_FORM_BASE_URL =
    "https://script.google.com/a/macros/kairali.com/s/AKfycby5x4cuxgMbs2SJjd46HzswkLjYGuuw83nOwiFNj9UqcJbfzJoigNBQxxmH__mCq5afRw/exec";

function buildFeedbackFormUrl(bookingId: string) {
    return `${FEEDBACK_FORM_BASE_URL}?bookingId=${encodeURIComponent(bookingId)}`;
}

// Referral Collection & Lead Generation (Stage 8) — Google Apps Script referral
// collection form. The guest's Booking ID is passed as a query param so the
// form opens pre-scoped to that booking.
const REFERRAL_FORM_BASE_URL =
    "https://script.google.com/a/macros/kairali.com/s/AKfycbzrsZGVVLk8pMhota7GSCPzj3BpLn_Ho1MQ5AG5G-laSZpwvJO6UGUfenY9tAfn2R8l/exec";

function buildReferralFormUrl(bookingId: string) {
    return `${REFERRAL_FORM_BASE_URL}?bookingId=${encodeURIComponent(bookingId)}`;
}

/* =========================================================
   DUMMY DATA GENERATION (deterministic, no Math.random -> safe for SSR)
========================================================= */
// Still real/used: employee roster the pending-report table is broken down by.
// NOTE: no longer used by the pending report (rows are now built dynamically
// from per-stage doers). Kept for reference / potential filter use.
const TAKEN_BY = ["Pawan Kamra", "Sadik Rehman", "Shoukath Ali Moosa", "Harpal Singh", "Suresh Kumar C"];

// Planned/lock dates arrive from GAS as UTC ISO strings; guests and staff are
// in India, so display them converted to IST (date-level, since planned dates
// are day-granular locks — 18:30:00Z is midnight IST of the NEXT day).
function formatISTDate(v: string | null): string {
    if (!v) return "an unset date";
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(d);
}

function pad(n: number) { return n < 10 ? "0" + n : String(n); }
function fmtDate(d: Date) { return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

/* ---------- Parse a "DD-MM-YYYY HH:mm" (or plain "DD-MM-YYYY") timestamp into a Date ---------- */
// Parses the date formats GAS actually sends:
//   "7/4/2026"     → M/D/YYYY  (timestamp column, US-locale formatted string;
//                    confirmed month-first: samples contain "5/25/2026")
//   "26-May-2026"  → D-MMM-YYYY (check-in/out columns)
//   ISO strings    → passthrough
// The old parser assumed DD-MM-YYYY with dashes, so slash dates became
// Invalid Date and every comparison returned false — the date-range filter
// silently matched everything.
function parseDMY(dateStr: string): Date {
    if (!dateStr) return new Date(NaN);
    const s = String(dateStr).trim().split(" ")[0];
    if (s.includes("/")) {
        const [m, d, y] = s.split("/").map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
    }
    if (s.includes("-")) {
        const parts = s.split("-");
        if (parts.length === 3) {
            const mNum = Number(parts[1]);
            if (!isNaN(mNum)) return new Date(Number(parts[2]), mNum - 1, Number(parts[0]));
            const named = new Date(`${parts[0]} ${parts[1]} ${parts[2]}`); // "26 May 2026"
            if (!isNaN(named.getTime())) return named;
        }
    }
    return new Date(s);
}

/* ---------- Resolve a Date Range preset (or custom start/end) into concrete bounds ---------- */
function getDateRangeBounds(
    preset: DateRangePreset,
    customStart: string,
    customEnd: string
): { start: Date | null; end: Date | null } {
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const now = new Date();
    const today = startOfDay(now);

    switch (preset) {
        case "today":
            return { start: today, end: endOfDay(now) };
        case "yesterday": {
            const y = addDays(today, -1);
            return { start: y, end: endOfDay(y) };
        }
        case "thisWeek": {
            const day = today.getDay();
            const diffToMonday = day === 0 ? 6 : day - 1;
            const start = addDays(today, -diffToMonday);
            return { start, end: endOfDay(now) };
        }
        case "lastWeek": {
            const day = today.getDay();
            const diffToMonday = day === 0 ? 6 : day - 1;
            const thisWeekStart = addDays(today, -diffToMonday);
            const start = addDays(thisWeekStart, -7);
            const end = addDays(thisWeekStart, -1);
            return { start, end: endOfDay(end) };
        }
        case "thisMonth": {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            return { start, end: endOfDay(now) };
        }
        case "lastMonth": {
            const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const end = new Date(today.getFullYear(), today.getMonth(), 0);
            return { start, end: endOfDay(end) };
        }
        case "thisYear": {
            const start = new Date(today.getFullYear(), 0, 1);
            return { start, end: endOfDay(now) };
        }
        case "lastYear": {
            const start = new Date(today.getFullYear() - 1, 0, 1);
            const end = new Date(today.getFullYear() - 1, 11, 31);
            return { start, end: endOfDay(end) };
        }
        case "custom": {
            const start = customStart ? startOfDay(new Date(customStart + "T00:00:00")) : null;
            const end = customEnd ? endOfDay(new Date(customEnd + "T00:00:00")) : null;
            return { start, end };
        }
        default:
            return { start: null, end: null };
    }
}

/* ---------- Room Details parsing (e.g. "Double - Classic Villa" -> Villa first, Occupancy second) ---------- */
function parseRoomDetails(room: string): { category: string; occupancy: string } {
    const parts = room.split(" - ");
    if (parts.length === 2) {
        return { occupancy: parts[0].trim(), category: parts[1].trim() };
    }
    return { occupancy: "", category: room };
}

/* ---------- Sticky column layout for main table (Timestamp / Booking ID / Client Details frozen) ---------- */
const STICKY_COLS = {
    timestamp: { left: 0, width: 120 },
    bookingId: { left: 120, width: 150 },
    client: { left: 270, width: 210 },
} as const;
const STICKY_EDGE_SHADOW = "4px 0 8px -4px rgba(15, 23, 42, 0.25)";

/* ---------- Detects narrow (mobile) viewports so the main table can drop
   extra frozen columns and free up scroll room, instead of eating ~480px
   of a ~375px screen with three stacked sticky columns. ---------- */
function useIsMobile(breakpoint = 640) {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, [breakpoint]);
    return isMobile;
}

/* ---------- Builds the style/className for a frozen (sticky) table cell.
   When `sticky` is false the cell just keeps its fixed width and scrolls
   normally with the rest of the row. ---------- */
function frozenCellClass(baseClass: string, sticky: boolean, extraZ = "z-10") {
    return sticky ? `sticky ${extraZ} ${baseClass}` : baseClass;
}
function frozenCellStyle(left: number, width: number, sticky: boolean, withEdgeShadow = false): CSSProperties {
    if (!sticky) {
        return { width, minWidth: width, maxWidth: width };
    }
    return {
        left,
        width,
        minWidth: width,
        maxWidth: width,
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        isolation: "isolate",
        ...(withEdgeShadow ? { boxShadow: STICKY_EDGE_SHADOW } : {}),
    };
}

/* ---------- Sorting: which columns are sortable, how to pull a comparable
   value off a Guest, and a comparator that handles numbers/currency/dates
   as well as plain text. ---------- */
const SORT_ACCESSORS: Record<string, (g: Guest) => unknown> = {
    "Booking ID": (g) => g.bookingId,
    "Client Details": (g) => g.name,
    "Days of Stay": (g) => g.days,
    "Country": (g) => g.country,
    "Gender": (g) => g.gender,
    "Room Details": (g) => g.room,
    "PI NO": (g) => g.bookingNo,
    "Booking Taken By": (g) => g.takenBy,
    "Invoice Amt": (g) => g.invoice,
    "PI Link": (g) => g.piLink,
    "UID": (g) => g.uid,
    "Booking Status": (g) => (g.bookingStatus?.trim() ? g.bookingStatus : "Confirmed"),
    "Current Stage": (g) => (g.allComplete ? STAGES.length + 1 : g.currentStage),
};

function compareSortValues(a: unknown, b: unknown): number {
    if (a === null || a === undefined || a === "") {
        if (b === null || b === undefined || b === "") return 0;
        return -1;
    }
    if (b === null || b === undefined || b === "") return 1;

    const numA = typeof a === "number" ? a : parseFloat(String(a).replace(/[^0-9.-]/g, ""));
    const numB = typeof b === "number" ? b : parseFloat(String(b).replace(/[^0-9.-]/g, ""));
    const bothNumeric = !Number.isNaN(numA) && !Number.isNaN(numB) && String(a).trim() !== "" && String(b).trim() !== "";
    if (bothNumeric) return numA - numB;

    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

const SCROLLABLE_HEADERS = [
    "Check-In",
    "Check-Out",
    "Days of Stay",
    "Country",
    "Gender",
    "Programme / Package",
    "Room Details",
    "PI NO",
    "Booking Taken By",
    "Invoice Amt",
    "PI Link",
    //"MID",
    "UID",
    "Booking Status",
    "Current Stage",
    "Action",
];

/* =========================================================
   COMPONENT
========================================================= */
export default function CRRCallingProcessPage() {
    const { guests, setGuests, loading: guestsLoading, error: guestsError, refetch: refetchGuests, stageUsers } = useCrrBookings();

    // ---------- REAL ROLE (from auth) — no manual switching, ever ----------
    const { user } = useAuth();

    // Roles/permissions that get the full "Admin" FMS view.
    // super_admin and admin behave identically: full table visibility
    // and unrestricted stage editing.
    const ADMIN_TIER_ROLES: UserRole[] = ["super_admin", "admin"];

    const isAdminRole = !!user && (
        user.permissions.includes("all") ||
        user.permissions.includes("fms.admin") ||
        ADMIN_TIER_ROLES.includes(user.role)
    );

    const role: Role = isAdminRole ? "admin" : "user";

    // All stage saves go through this wrapper so GAS receives the admin
    // override flag and skips its server-side lock check for admin-tier users.
    const saveStageWithRole = (bookingId: string, stage: number, fields: Record<string, any>) =>
        saveStage(bookingId, stage, fields, isAdminRole);

    /* ---------- PER-STAGE EDIT PERMISSIONS ----------
       Admin-tier users (super_admin / admin / "all" / "fms.admin") edit
       every stage. Everyone else needs explicit "crr_fms.stageN"
       permissions — e.g. ["crr_fms.stage1", "crr_fms.stage5"] sees all 8
       actions in the dropdown but only Stage 1 and Stage 5 enabled. */
    const canEditStage = useMemo(() => {
        return (stageNo: number): boolean => {
            if (!user) return false;
            if (isAdminRole) return true;
            return user.permissions.includes(`crr_fms.stage${stageNo}`);
        };
    }, [user, isAdminRole]);

    /* ---------- STAGES THIS USER IS PERMITTED TO WORK ON ----------
       Explicit "crr_fms.stageN" grants only — intentionally NOT including
       the super_admin/"all" bypass, because this list drives the
       work-queue row filter below and admins must keep seeing all rows. */
    const permittedStages = useMemo<number[]>(() => {
        if (!user) return [];
        return STAGES.map((s) => s.no).filter((n) =>
            user.permissions.includes(`crr_fms.stage${n}`)
        );
    }, [user]);

    // Non-admin assigned users see only their assigned stages in the stage filter dropdown
    const userAssignedStages = useMemo<typeof STAGES>(() => {
        if (isAdminRole) return STAGES;
        const myEmail = (user?.email || "").toLowerCase().trim();
        const su = stageUsers.find((u) => u.email.toLowerCase().trim() === myEmail);
        const stageNums = su && su.stages.length > 0 ? su.stages : permittedStages;
        if (stageNums.length === 0) return STAGES;
        return STAGES.filter((s) => stageNums.includes(s.no));
    }, [isAdminRole, user, stageUsers, permittedStages]);

    const DEFAULT_STAGE_USERS = useMemo(() => [
        { name: "Jinsha Manoj MV", email: "grm@ktahv.com", role: "grm", stages: [1, 2, 4, 5, 6, 8] },
        { name: "Dr. Rahul R", email: "doctor@ktahv.com", role: "doctor", stages: [3, 7] },
        { name: "Shoukath Ali Moosa", email: "fom@ktahv.com", role: "fom", stages: [9, 10] },
        { name: "Anoop Vijayaraj", email: "gm.hv@kairali.com", role: "gm", stages: [11] },
        { name: "Abhilash Sir", email: "test@kairali.com", role: "test", stages: [1, 2, 6, 7] },
    ], []);

    const responsiblePersonList = useMemo(() => {
        return stageUsers && stageUsers.length > 0 ? stageUsers : DEFAULT_STAGE_USERS;
    }, [stageUsers, DEFAULT_STAGE_USERS]);

    const responsiblePersonOptions = useMemo(() => {
        if (isAdminRole) return responsiblePersonList;
        const myEmail = (user?.email || "").toLowerCase().trim();
        const myName = (user?.name || "").toLowerCase().trim();
        const me = responsiblePersonList.filter(
            (u) =>
                u.email.toLowerCase().trim() === myEmail ||
                u.name.toLowerCase().trim() === myName
        );
        return me.length > 0 ? me : responsiblePersonList;
    }, [responsiblePersonList, isAdminRole, user]);

    const [search, setSearch] = useState("");
    const [stageFilter, setStageFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [respFilter, setRespFilter] = useState<string>("all");

    useEffect(() => {
        if (user && !isAdminRole) {
            const myEmail = (user?.email || "").toLowerCase().trim();
            const myName = (user?.name || "").toLowerCase().trim();
            const match = responsiblePersonList.find(
                (u) =>
                    u.email.toLowerCase().trim() === myEmail ||
                    u.name.toLowerCase().trim() === myName
            );
            if (match) {
                setRespFilter(match.name || match.email);
            }
        }
    }, [user, isAdminRole, responsiblePersonList]);
    const [dateRangeFilter, setDateRangeFilter] = useState<DateRangePreset>("all");

    // ---------- Sorting for the main data table ----------
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    function handleSort(column: string) {
        if (!SORT_ACCESSORS[column]) return;
        if (sortColumn === column) {
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    }
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");
    const [activeGuestId, setActiveGuestId] = useState<number | null>(null);

    // pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<"table" | "chart">("table");
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [gotoPage, setGotoPage] = useState("");

    // modal edit fields
    const [modalDate, setModalDate] = useState("");
    const [modalRemark, setModalRemark] = useState("");
    const [modalStatus, setModalStatus] = useState<StageStatus>("Pending");
    const [modalSaved, setModalSaved] = useState(false);

    const activeGuest = guests.find((g) => g.id === activeGuestId) || null;
    // This modal is only ever opened from the "Stage 3: Next Visit Planning & Confirmation"
    // dropdown item, so it must always show Stage 3's own name/details — never the guest's
    // currentStage (which could be a different stage entirely and would show the wrong name).
    const activeStage = activeGuest ? STAGES.find((s) => s.no === 3) ?? null : null;

    // "Guest Request & Complaint Mgmt (QR Scan)" modal — Stage 2
    const [activeCallGuestId, setActiveCallGuestId] = useState<number | null>(null);
    const [qrCodeViewed, setQrCodeViewed] = useState(false);
    const [callFormError, setCallFormError] = useState("");
    const [callSaved, setCallSaved] = useState(false);

    const activeCallGuest = guests.find((g) => g.id === activeCallGuestId) || null;

    // "Arrival Welcome on Pickup" modal
    const [activeWelcomeGuestId, setActiveWelcomeGuestId] = useState<number | null>(null);
    const [welcomeOutcomeRemarks, setWelcomeOutcomeRemarks] = useState("");
    const [welcomeStatus, setWelcomeStatus] = useState<CallStatus | "">("");
    const [welcomeNotDoneRemarks, setWelcomeNotDoneRemarks] = useState("");
    const [welcomeFollowupDate, setWelcomeFollowupDate] = useState("");
    const [welcomeOutcomeAchieved, setWelcomeOutcomeAchieved] = useState<YesNo | "">("");
    const [welcomeFormError, setWelcomeFormError] = useState("");
    const [welcomeSaved, setWelcomeSaved] = useState(false);

    const activeWelcomeGuest = guests.find((g) => g.id === activeWelcomeGuestId) || null;

    // "Safe Return Confirmation" modal
    const [activeSafeReturnGuestId, setActiveSafeReturnGuestId] = useState<number | null>(null);
    const [safeReturnStayFeedback, setSafeReturnStayFeedback] = useState("");
    const [safeReturnOutcomeRemarks, setSafeReturnOutcomeRemarks] = useState("");
    const [safeReturnStatus, setSafeReturnStatus] = useState<CallStatus | "">("");
    const [safeReturnNotDoneRemarks, setSafeReturnNotDoneRemarks] = useState("");
    const [safeReturnFollowupDate, setSafeReturnFollowupDate] = useState("");
    const [safeReturnOutcomeAchieved, setSafeReturnOutcomeAchieved] = useState<YesNo | "">("");
    const [safeReturnFormError, setSafeReturnFormError] = useState("");
    const [safeReturnSaved, setSafeReturnSaved] = useState(false);

    const activeSafeReturnGuest = guests.find((g) => g.id === activeSafeReturnGuestId) || null;

    // "Guest Feedback & Outcome Confirmation" modal (Stage 4)
    const [activeFeedbackGuestId, setActiveFeedbackGuestId] = useState<number | null>(null);
    const [feedbackDoerRemarks, setFeedbackDoerRemarks] = useState("");
    const [feedbackFormError, setFeedbackFormError] = useState("");
    const [feedbackSaved, setFeedbackSaved] = useState(false);

    const activeFeedbackGuest = guests.find((g) => g.id === activeFeedbackGuestId) || null;

    // "Referral Collection & Lead Generation" modal (Stage 8)
    const [activeReferralGuestId, setActiveReferralGuestId] = useState<number | null>(null);
    const [referralTakenStatus, setReferralTakenStatus] = useState("");
    const [referralDoerRemarks, setReferralDoerRemarks] = useState("");
    const [referralFormError, setReferralFormError] = useState("");
    const [referralSaved, setReferralSaved] = useState(false);

    const activeReferralGuest = guests.find((g) => g.id === activeReferralGuestId) || null;

    // "Online Rating & Review Request" modal (Stage 5)
    const [activeRatingGuestId, setActiveRatingGuestId] = useState<number | null>(null);
    const [ratingStatus, setRatingStatus] = useState<RatingStatus | "">("");
    const [ratingNotGivenRemarks, setRatingNotGivenRemarks] = useState("");
    const [ratingProofFile, setRatingProofFile] = useState<File | null>(null);
    const [ratingExistingProofFileName, setRatingExistingProofFileName] = useState("");
    const [ratingOutcomeRemarks, setRatingOutcomeRemarks] = useState("");
    const [ratingCallStatus, setRatingCallStatus] = useState<CallStatus | "">("");
    const [ratingNotDoneRemarks, setRatingNotDoneRemarks] = useState("");
    const [ratingFollowupDate, setRatingFollowupDate] = useState("");
    const [ratingOutcomeAchieved, setRatingOutcomeAchieved] = useState<YesNo | "">("");
    const [ratingFormError, setRatingFormError] = useState("");
    const [ratingSaved, setRatingSaved] = useState(false);

    const activeRatingGuest = guests.find((g) => g.id === activeRatingGuestId) || null;

    // "Result Tracking & Health Progress Check" modal (Stage 7)
    const [activeResultProgressGuestId, setActiveResultProgressGuestId] = useState<number | null>(null);
    const [resultOutcomeRemarks, setResultOutcomeRemarks] = useState("");
    const [resultStatus, setResultStatus] = useState<CallStatus | "">("");
    const [resultNotDoneRemarks, setResultNotDoneRemarks] = useState("");
    const [resultFollowupDate, setResultFollowupDate] = useState("");
    const [resultOutcomeAchieved, setResultOutcomeAchieved] = useState<YesNo | "">("");
    const [resultFormError, setResultFormError] = useState("");
    const [resultSaved, setResultSaved] = useState(false);

    const activeResultProgressGuest = guests.find((g) => g.id === activeResultProgressGuestId) || null;

    /* ---------- Stage-completed / stage-processing flags ----------
       completed  = actual + to_show = TRUE  (stages 1,5,6,7: two-phase)
       processing = actual present, to_show still FALSE (stages 1,5,6,7 only) */
    const isStage1Complete = activeWelcomeGuest?.stageStatus?.[0] === "Complete";
    const isStage1Processing = activeWelcomeGuest?.stageStatus?.[0] === "Processing";
    const isStage2Complete = activeCallGuest?.stageStatus?.[1] === "Complete";
    const isStage3Complete = activeGuest?.stageStatus?.[2] === "Complete";
    const isStage4Complete = activeFeedbackGuest?.stageStatus?.[3] === "Complete";
    const isStage5Complete = activeRatingGuest?.stageStatus?.[4] === "Complete";
    const isStage5Processing = activeRatingGuest?.stageStatus?.[4] === "Processing";
    const isStage6Complete = activeSafeReturnGuest?.stageStatus?.[5] === "Complete";
    const isStage6Processing = activeSafeReturnGuest?.stageStatus?.[5] === "Processing";
    const isStage7Complete = activeResultProgressGuest?.stageStatus?.[6] === "Complete";
    const isStage7Processing = activeResultProgressGuest?.stageStatus?.[6] === "Processing";
    const isStage8Complete = activeReferralGuest?.stageStatus?.[7] === "Complete";

    // Combined read-only flags: locked (planned date not reached) OR completed OR processing.
    // Processing stages are accessible (modal opens) but fully non-editable — same as Complete.
    const isRatingDisabled = !activeRatingGuest || (!isAdminRole && isStageLocked(activeRatingGuest, 5)) || isStage5Complete || isStage5Processing;
    const isSafeReturnDisabled = !activeSafeReturnGuest || (!isAdminRole && isStageLocked(activeSafeReturnGuest, 6)) || isStage6Complete || isStage6Processing;
    const isResultDisabled = !activeResultProgressGuest || (!isAdminRole && isStageLocked(activeResultProgressGuest, 7)) || isStage7Complete || isStage7Processing;
    const isReferralDisabled = !activeReferralGuest || (!isAdminRole && isStageLocked(activeReferralGuest, 8)) || isStage8Complete;

    // "Driver Assignment - Arrival Pickup" modal (Stage 9)
    const [activeDriverArrivalGuestId, setActiveDriverArrivalGuestId] = useState<number | null>(null);
    const activeDriverArrivalGuest = guests.find((g) => g.id === activeDriverArrivalGuestId) || null;
    const isStage9Complete = activeDriverArrivalGuest?.stageStatus?.[8] === "Complete";
    const isDriverArrivalDisabled = !activeDriverArrivalGuest || (!isAdminRole && isStageLocked(activeDriverArrivalGuest, 9)) || isStage9Complete;

    // "Driver Assignment - Departure Drop" modal (Stage 10)
    const [activeDriverDepartureGuestId, setActiveDriverDepartureGuestId] = useState<number | null>(null);
    const activeDriverDepartureGuest = guests.find((g) => g.id === activeDriverDepartureGuestId) || null;
    const isStage10Complete = activeDriverDepartureGuest?.stageStatus?.[9] === "Complete";
    const isDriverDepartureDisabled = !activeDriverDepartureGuest || (!isAdminRole && isStageLocked(activeDriverDepartureGuest, 10)) || isStage10Complete;

    // "Guest Requirement Verification" modal (Stage 11)
    const [activeRequirementVerificationGuestId, setActiveRequirementVerificationGuestId] = useState<number | null>(null);
    const activeRequirementVerificationGuest = guests.find((g) => g.id === activeRequirementVerificationGuestId) || null;
    const isStage11Complete = activeRequirementVerificationGuest?.stageStatus?.[10] === "Complete";
    const isRequirementVerificationDisabled = !activeRequirementVerificationGuest || (!isAdminRole && isStageLocked(activeRequirementVerificationGuest, 11)) || isStage11Complete;

    // "Booking & Guest Details" shared popup — used by the 3 not-yet-built action buttons
    const [activeDetailsGuestId, setActiveDetailsGuestId] = useState<number | null>(null);
    const [activeDetailsAction, setActiveDetailsAction] = useState<string>("");

    const activeDetailsGuest = guests.find((g) => g.id === activeDetailsGuestId) || null;

    // "View All Stages / Stage Data" modal
    const [activeViewGuestId, setActiveViewGuestId] = useState<number | null>(null);
    const [activeViewStage, setActiveViewStage] = useState<number>(1);
    const activeViewGuest = guests.find((g) => g.id === activeViewGuestId) || null;

    function openViewModal(guestId: number, stageNo = 1) {
        setActiveViewStage(stageNo);
        setActiveViewGuestId(guestId);
    }

    // On narrow screens only "Client Details" stays frozen; Timestamp and
    // Booking ID scroll away normally so the table isn't ~480px of dead,
    // frozen space before any real content is visible.
    const isMobile = useIsMobile();
    const clientStickyLeft = isMobile ? 0 : STICKY_COLS.client.left;
    const clientStickyWidth = isMobile ? 150 : STICKY_COLS.client.width;
    const frozenColsSticky = !isMobile;

    /* ---------- DATE RANGE BOUNDS ---------- */
    const { start: dateRangeStart, end: dateRangeEnd } = useMemo(
        () => getDateRangeBounds(dateRangeFilter, customStartDate, customEndDate),
        [dateRangeFilter, customStartDate, customEndDate]
    );

    /* ---------- FILTERED (& SORTED) ROWS ---------- */
    const rows = useMemo(() => {
        const s = search.toLowerCase();
        const filtered = guests.filter((g) => {
            if (s) {
                const matches =
                    String(g.name ?? "").toLowerCase().includes(s) ||
                    String(g.bookingId ?? "").toLowerCase().includes(s) ||
                    String(g.mobile ?? "").toLowerCase().includes(s) ||
                    String(g.bookingNo ?? "").toLowerCase().includes(s) ||
                    String(g.uid ?? "").toLowerCase().includes(s) ||
                    String(g.id ?? "").toLowerCase().includes(s) ||
                    String(g.email ?? "").toLowerCase().includes(s) ||
                    String(g.room ?? "").toLowerCase().includes(s) ||
                    String(g.programme ?? "").toLowerCase().includes(s) ||
                    String(g.takenBy ?? "").toLowerCase().includes(s);
                if (!matches) return false;
            }
            if (respFilter !== "all" && !g.allComplete) {
                const selectedPerson = responsiblePersonList.find(
                    (u) =>
                        (u.name && u.name.toLowerCase() === respFilter.toLowerCase()) ||
                        (u.email && u.email.toLowerCase() === respFilter.toLowerCase())
                );
                if (selectedPerson) {
                    if (!selectedPerson.stages.includes(g.currentStage)) {
                        return false;
                    }
                }
            }
            if (stageFilter !== "all") {
                const stageNum = Number(stageFilter);
                const isComplete = g.stageStatus[stageNum - 1] === "Complete";
                const isPending = !g.allComplete && !isBookingCancelled(g) && g.currentStage === stageNum;
                const isCancelled = isBookingCancelled(g);

                if (statusFilter === "complete") {
                    if (!isComplete || isCancelled) return false;
                } else if (statusFilter === "pending") {
                    if (!isPending) return false;
                } else if (statusFilter === "cancelled") {
                    if (!isCancelled) return false;
                } else {
                    // statusFilter === "all"
                    if (!isComplete && !isPending && !isCancelled) return false;
                }
            } else {
                if (statusFilter === "pending" && (g.allComplete || isBookingCancelled(g))) return false;
                if (statusFilter === "complete" && (!g.allComplete || isBookingCancelled(g))) return false;
                if (statusFilter === "cancelled" && !isBookingCancelled(g)) return false;
            }
            if (dateRangeStart || dateRangeEnd) {
                const gDate = parseDMY(g.timestamp);
                if (isNaN(gDate.getTime())) return false; // no valid date → can't match an active range
                if (dateRangeStart && gDate < dateRangeStart) return false;
                if (dateRangeEnd && gDate > dateRangeEnd) return false;
            }
            return true;
        });

        if (sortColumn && SORT_ACCESSORS[sortColumn]) {
            const accessor = SORT_ACCESSORS[sortColumn];
            const sorted = [...filtered].sort((a, b) => {
                const result = compareSortValues(accessor(a), accessor(b));
                return sortDirection === "asc" ? result : -result;
            });
            return sorted;
        }

        return filtered;
    }, [guests, search, stageFilter, respFilter, statusFilter, dateRangeStart, dateRangeEnd, sortColumn, sortDirection]);

    // Reset to page 1 whenever the filtered result set changes shape
    useEffect(() => {
        setCurrentPage(1);
    }, [search, stageFilter, respFilter, statusFilter, dateRangeFilter, customStartDate, customEndDate, itemsPerPage]);

    // Safety net: Radix Dropdown -> Dialog transitions can occasionally leave
    // `pointer-events: none` stuck on <body>, freezing the whole page (clicks
    // and scroll stop working) until a manual refresh. Whenever no modal is
    // open, force-clear that style so the page never gets stuck.

    // Safety net: Radix Dropdown -> Dialog transitions can leave
    // `pointer-events: none` stuck on <body> on a delayed frame, AFTER
    // this effect's own cleanup already ran (a timing race). A one-shot
    // setTimeout isn't reliable, so watch <body> continuously instead.
    useEffect(() => {
        const anyModalOpen =
            activeGuestId !== null ||
            activeCallGuestId !== null ||
            activeDetailsGuestId !== null ||
            activeWelcomeGuestId !== null ||
            activeSafeReturnGuestId !== null ||
            activeFeedbackGuestId !== null ||
            activeReferralGuestId !== null ||
            activeRatingGuestId !== null ||
            activeResultProgressGuestId !== null ||
            activeDriverArrivalGuestId !== null ||
            activeDriverDepartureGuestId !== null ||
            activeRequirementVerificationGuestId !== null;

        const clearIfStuck = () => {
            if (!anyModalOpen && document.body.style.pointerEvents === "none") {
                document.body.style.pointerEvents = "";
            }
        };

        // Catch it immediately...
        clearIfStuck();

        // ...and keep watching for a bit, since Radix can set it again
        // on a later frame after unmount/cleanup.
        const observer = new MutationObserver(clearIfStuck);
        observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });

        return () => observer.disconnect();
    }, [
        activeGuestId,
        activeCallGuestId,
        activeDetailsGuestId,
        activeWelcomeGuestId,
        activeSafeReturnGuestId,
        activeFeedbackGuestId,
        activeReferralGuestId,
        activeRatingGuestId,
        activeResultProgressGuestId,
        activeDriverArrivalGuestId,
        activeDriverDepartureGuestId,
        activeRequirementVerificationGuestId,
    ]);
    // useEffect(() => {
    //     const anyModalOpen = activeGuestId !== null || activeCallGuestId !== null || activeDetailsGuestId !== null || activeWelcomeGuestId !== null || activeSafeReturnGuestId !== null || activeFeedbackGuestId !== null || activeReferralGuestId !== null || activeRatingGuestId !== null || activeResultProgressGuestId !== null;
    //     if (!anyModalOpen) {
    //         const t = setTimeout(() => {
    //             if (document.body.style.pointerEvents === "none") {
    //                 document.body.style.pointerEvents = "";
    //             }
    //         }, 0);
    //         return () => clearTimeout(t);
    //     }
    // }, [activeGuestId, activeCallGuestId, activeDetailsGuestId, activeWelcomeGuestId, activeSafeReturnGuestId, activeFeedbackGuestId, activeReferralGuestId, activeRatingGuestId, activeResultProgressGuestId]);

    // Pagination derived
    const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
    const tableStartIndex = (currentPage - 1) * itemsPerPage;
    const tableEndIndex = Math.min(tableStartIndex + itemsPerPage, rows.length);
    const pagedRows = rows.slice(tableStartIndex, tableEndIndex);

    function handleGotoPage() {
        const p = parseInt(gotoPage, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
            setCurrentPage(p);
        }
        setGotoPage("");
    }

    // KPIs are derived from the filtered/searched row set (`rows`), not the
    // raw unfiltered `guests` list, so the numbers on screen always reflect
    // whatever Search/Stage/Status/Responsible Person/Date filters are active.
    // ---------- PENDING MODEL (reconciles all three tester rules) ----------
    // Rule A (all-stages view):  Total Guests = Pending + Completed.
    //   → Pending must be BOOKING-level there: bookings not complete & not
    //     cancelled. (Completed includes cancelled, so the partition is exact.)
    // Rule B (stage filter active): Pending KPI = pending rows in the table
    //     = Stage Wise Pendings Report grand total.
    //   → Pending is that stage's pending rows, lock IGNORED. The report
    //     counts the same (booking, stage) pairs partitioned by doer
    //     (unknown → "Unassigned"), so Σ(report cells) === KPI by construction.
    // Note: with no stage filter, the report's grand total is per-STAGE
    // workload (one booking can hold several pending stages) while the KPI is
    // per-BOOKING — those two can never be equal at the same time as Rule A;
    // they intentionally coincide exactly when a single stage is selected.
    // Lock status is surfaced in the KPI subtitle, not in the counts:
    // "N actionable now · M awaiting unlock".
    const isStagePending = (g: Guest, stageNo: number) =>
        !isBookingCancelled(g) && !g.allComplete && g.currentStage === stageNo;

    const isStageCompleted = (g: Guest, stageNo: number) =>
        !isBookingCancelled(g) && g.stageStatus[stageNo - 1] === "Complete";

    const pendingCount =
        stageFilter !== "all"
            ? rows.filter((g) => isStagePending(g, Number(stageFilter))).length
            : rows.filter((g) => !g.allComplete && !isBookingCancelled(g)).length;

    // "Actionable now" = the subset of pendingCount that is already unlocked.
    //   stage view: rows whose selected stage is pending AND unlocked
    //   all view:   pending bookings with ≥1 pending stage that is unlocked
    const actionablePendingCount =
        stageFilter !== "all"
            ? rows.filter((g) => {
                const n = Number(stageFilter);
                return isStagePending(g, n) && !isStageLocked(g, n);
            }).length
            : rows.filter((g) => {
                if (g.allComplete || isBookingCancelled(g)) return false;
                for (let n = 1; n <= STAGES.length; n++) {
                    if (g.stageStatus[n - 1] === "Pending" && !isStageLocked(g, n)) return true;
                }
                return false;
            }).length;
    // Cancelled bookings are auto-closed journeys — they are excluded from
    // Pending, so they must be counted here or Total ≠ Pending + Completed.
    const completeCount =
        stageFilter !== "all"
            ? rows.filter((g) => isStageCompleted(g, Number(stageFilter))).length
            : rows.filter((g) => g.allComplete && !isBookingCancelled(g)).length;
    const cancelledCount = rows.filter((g) => isBookingCancelled(g)).length;
    const referralsGeneratedCount = rows.filter(
        (g) => g.referralCollection?.referralTakenStatus === "Yes"
    ).length;

    /* ---------- PENDING REPORT (doer x stage) ---------- */
    // Also scoped to the current filtered `rows`, so the stage-wise pending
    // breakdown table updates alongside the KPI cards when filters change.
    //
    // Semantics (per business rule):
    //   pending  = stage is UNLOCKED (planned date reached) AND not completed.
    //              Locked/future stages do NOT count — nobody can act on them yet.
    //   attribution = STRICTLY the stage's own DOER (GAS savedData.doer).
    //              No fallback to the booking creator (takenBy) — that fallback
    //              previously leaked non-doers (booking creators, travel agents)
    //              into the row list. Pending stages with NO doer recorded are
    //              grouped into a single "Unassigned" row so that real pending
    //              work stays visible instead of silently disappearing.
    const pendingReport = useMemo(() => {
        // Cancelled bookings are auto-closed: none of their stages count as pending.
        const activeRows = rows.filter((g) => !isBookingCancelled(g));

        // A booking is pending at its active currentStage (1-indexed).
        const isPendingTask = (g: Guest, idx: number) =>
            !g.allComplete && g.currentStage === idx + 1;

        // Stage totals across all active rows
        const totals = new Array(STAGES.length).fill(0);
        STAGES.forEach((s, idx) => {
            if (stageFilter !== "all" && String(idx + 1) !== stageFilter) {
                totals[idx] = 0;
            } else {
                totals[idx] = activeRows.filter((g) => isPendingTask(g, idx)).length;
            }
        });

        // Use RBAC/permission assigned users strictly from database by email
        const usersToDisplay = (stageUsers && stageUsers.length > 0) ? stageUsers : DEFAULT_STAGE_USERS;

        const table = usersToDisplay.map((su) => {
            const counts = STAGES.map((s, idx) => {
                const stageNo = idx + 1;
                if (stageFilter !== "all" && String(stageNo) !== stageFilter) {
                    return 0;
                }
                if (!su.stages.includes(stageNo)) {
                    return 0;
                }
                return activeRows.filter((g) => isPendingTask(g, idx)).length;
            });
            return { emp: su.name || su.email, email: su.email, counts };
        });

        const currentUserName = (user?.name ?? "").toLowerCase();
        const currentUserEmail = (user?.email ?? "").toLowerCase();
        const scopedTable = isAdminRole
            ? table
            : table.filter(
                (r) =>
                    r.emp.toLowerCase() === currentUserName ||
                    (r.email && r.email.toLowerCase() === currentUserEmail)
            );

        const scopedTotals = new Array(STAGES.length).fill(0);
        scopedTable.forEach((r) => {
            r.counts.forEach((c, idx) => { scopedTotals[idx] += c; });
        });

        // Sort descending: employee with the most pending tasks appears first
        const sortedTable = [...scopedTable].sort((a, b) => {
            const sumA = a.counts.reduce((acc, c) => acc + c, 0);
            const sumB = b.counts.reduce((acc, c) => acc + c, 0);
            return sumB - sumA;
        });

        return { table: sortedTable, totals: isAdminRole ? totals : scopedTotals };
    }, [rows, stageFilter, isAdminRole, user, stageUsers, DEFAULT_STAGE_USERS]);

    /* ---------- CHART VIEW DATA ---------- */
    // Derived purely from the same filtered `rows` / `pendingReport` used by
    // the table and KPIs above, so switching to Chart View never shows a
    // different slice of data than what's currently filtered.
    const chartData = useMemo(() => {
        // Pending actions per stage (mirrors the Stage Wise Pendings Report totals)
        const stagePending = pendingReport.totals;
        const maxStagePending = Math.max(1, ...stagePending);

        // Active (not-yet-complete, not-cancelled) guests grouped by responsible role
        const respCounts: Record<string, number> = { GRE: 0, Doctor: 0, FO: 0, GM: 0 };
        rows.forEach((g) => {
            if (g.allComplete || isBookingCancelled(g)) return;
            const resp = STAGES[g.currentStage - 1]?.resp;
            if (resp && respCounts[resp] !== undefined) respCounts[resp] += 1;
        });
        const maxResp = Math.max(1, ...Object.values(respCounts));

        // Top pending workload by employee (from the same doer attribution as the report table)
        const employeeTotals = pendingReport.table
            .map((r) => ({ emp: r.emp, total: r.counts.reduce((a, b) => a + b, 0) }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);
        const maxEmployee = Math.max(1, ...employeeTotals.map((e) => e.total));

        const totalActive = rows.filter((g) => !g.allComplete && !isBookingCancelled(g)).length;
        const totalComplete = rows.filter((g) => g.allComplete && !isBookingCancelled(g)).length;
        const totalAll = Math.max(1, totalActive + totalComplete);

        return { stagePending, maxStagePending, respCounts, maxResp, employeeTotals, maxEmployee, totalActive, totalComplete, totalAll };
    }, [rows, pendingReport]);

    /* ---------- SCROLL TO TABLE ON SEARCH MATCH ---------- */
    // Ref attached to the "Guest Follow-up Records" table card below.
    const tableSectionRef = useRef<HTMLDivElement | null>(null);
    const lastAutoScrolledSearch = useRef("");
    useEffect(() => {
        const trimmed = search.trim();
        if (!trimmed) {
            lastAutoScrolledSearch.current = "";
            return;
        }
        if (trimmed === lastAutoScrolledSearch.current) return;
        if (rows.length === 0) return;
        // Debounce so the page doesn't jump on every keystroke — only scrolls
        // once the user pauses typing and a match currently exists.
        const timer = setTimeout(() => {
            lastAutoScrolledSearch.current = trimmed;
            tableSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 350);
        return () => clearTimeout(timer);
    }, [search, rows.length]);

    /* ---------- HANDLERS ---------- */
    const updateGuestOptimistic = (guestId: number, stageNo: number, savedDataFields?: Record<string, any>) => {
        setGuests((prev) =>
            prev.map((g) => {
                if (g.id !== guestId) return g;
                const newStageStatus = [...g.stageStatus];
                newStageStatus[stageNo - 1] = "Complete";

                const newStages = (g.stages || []).map((st) => {
                    if (st.stage === stageNo) {
                        return {
                            ...st,
                            completed: true,
                            actualDate: new Date().toISOString(),
                            savedData: { ...(st.savedData || {}), ...(savedDataFields || {}) },
                        };
                    }
                    return st;
                });

                let nextStage = g.currentStage;
                if (nextStage === stageNo) {
                    while (nextStage <= 11 && newStageStatus[nextStage - 1] === "Complete") {
                        nextStage++;
                    }
                }

                const allComplete = newStageStatus.slice(0, 11).every((st) => st === "Complete");

                return {
                    ...g,
                    stageStatus: newStageStatus,
                    stages: newStages,
                    currentStage: nextStage,
                    allComplete,
                };
            })
        );
    };

    function clearFilters() {
        setSearch("");
        setStageFilter("all");
        setRespFilter("all");
        setDateRangeFilter("all");
        setCustomStartDate("");
        setCustomEndDate("");
        setStatusFilter("all");
        setCurrentPage(1);
    }

    function openModal(id: number) {
        if (!canEditStage(3)) return; // permission gate — Stage 3
        const g = guests.find((x) => x.id === id);
        if (!g) return;
        setActiveGuestId(id);
        // Prefill from GAS savedData (persisted stage-3 values) so a
        // completed / partially-saved stage reopens with its data.
        const saved3 = getStageSavedData(g, 3);
        setModalDate(saved3?.nextVisitDate || "");
        setModalRemark(saved3?.remarks || "");
        setModalStatus(g.allComplete ? "Complete" : "Pending");
        setModalSaved(false);
    }

    function closeModal() {
        setActiveGuestId(null);
        setModalSaved(false);
    }

    function isModalFormComplete() {
        return modalDate.trim() !== "" && modalRemark.trim() !== "";
    }

    async function saveModal() {
        if (!canEditStage(3)) return; // permission gate — Stage 3
        if (!activeGuest) return closeModal();
        if (!isAdminRole && isStageLocked(activeGuest, 3)) return;
        if (isStage3Complete) return; // completed stage is read-only
        if (!isModalFormComplete() || modalSaved) return;
        
        const guestId = activeGuest.id;
        const targetId = activeGuest.uid || activeGuest.bookingId;
        const data = {
            nextVisitDate: modalDate,
            remarks: modalRemark,
        };

        closeModal();
        updateGuestOptimistic(guestId, 3, data);
        const toastId = toast.loading("Saving Stage 3 (Next Visit Planning)...");

        try {
            await saveStageWithRole(targetId, 3, data);
            toast.success("Stage 3 (Next Visit Planning) saved successfully!", { id: toastId });
            refetchGuests();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to save stage 3";
            toast.error(msg, { id: toastId });
            console.error("Failed to save stage 3:", err);
            refetchGuests();
        }
    }
    function openDriverArrivalModal(id: number) {
        if (!canEditStage(9)) return;
        const g = guests.find((x) => x.id === id);
        if (!g) return;
        setActiveDriverArrivalGuestId(id);
    }
    function closeDriverArrivalModal() {
        setActiveDriverArrivalGuestId(null);
    }
    async function saveDriverArrivalModal(data: any) {
        if (!canEditStage(9)) return;
        if (!activeDriverArrivalGuest) return;
        if (!isAdminRole && isStageLocked(activeDriverArrivalGuest, 9)) return;
        if (isStage9Complete) return;
        
        const guestId = activeDriverArrivalGuest.id;
        const targetId = activeDriverArrivalGuest.uid || activeDriverArrivalGuest.bookingId;

        closeDriverArrivalModal();
        updateGuestOptimistic(guestId, 9, data);
        const toastId = toast.loading("Saving Driver Arrival Assignment...");

        try {
            await saveStageWithRole(targetId, 9, data);
            toast.success("Driver Arrival Assignment saved successfully!", { id: toastId });
            refetchGuests();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to save stage 9";
            toast.error(msg, { id: toastId });
            console.error("Failed to save stage 9:", err);
            refetchGuests();
        }
    }

    function openDriverDepartureModal(id: number) {
        if (!canEditStage(10)) return;
        const g = guests.find((x) => x.id === id);
        if (!g) return;
        setActiveDriverDepartureGuestId(id);
    }
    function closeDriverDepartureModal() {
        setActiveDriverDepartureGuestId(null);
    }
    async function saveDriverDepartureModal(data: any) {
        if (!canEditStage(10)) return;
        if (!activeDriverDepartureGuest) return;
        if (!isAdminRole && isStageLocked(activeDriverDepartureGuest, 10)) return;
        if (isStage10Complete) return;
        
        const guestId = activeDriverDepartureGuest.id;
        const targetId = activeDriverDepartureGuest.uid || activeDriverDepartureGuest.bookingId;

        closeDriverDepartureModal();
        updateGuestOptimistic(guestId, 10, data);
        const toastId = toast.loading("Saving Driver Departure Assignment...");

        try {
            await saveStageWithRole(targetId, 10, data);
            toast.success("Driver Departure Assignment saved successfully!", { id: toastId });
            refetchGuests();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to save stage 10";
            toast.error(msg, { id: toastId });
            console.error("Failed to save stage 10:", err);
            refetchGuests();
        }
    }

    function openRequirementVerificationModal(id: number) {
        if (!canEditStage(11)) return;
        const g = guests.find((x) => x.id === id);
        if (!g) return;
        setActiveRequirementVerificationGuestId(id);
    }
    function closeRequirementVerificationModal() {
        setActiveRequirementVerificationGuestId(null);
    }
    async function saveRequirementVerificationModal(data: any) {
        if (!canEditStage(11)) return;
        if (!activeRequirementVerificationGuest) return;
        if (!isAdminRole && isStageLocked(activeRequirementVerificationGuest, 11)) return;
        if (isStage11Complete) return;

        const guestId = activeRequirementVerificationGuest.id;
        const targetId = activeRequirementVerificationGuest.uid || activeRequirementVerificationGuest.bookingId;

        closeRequirementVerificationModal();
        updateGuestOptimistic(guestId, 11, data);
        const toastId = toast.loading("Saving Guest Requirement Verification...");

        try {
            await saveStageWithRole(targetId, 11, data);
            toast.success("Guest Requirement Verification saved successfully!", { id: toastId });
            refetchGuests();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to save stage 11";
            toast.error(msg, { id: toastId });
            console.error("Failed to save stage 11:", err);
            refetchGuests();
        }
    }
    function openCallModal(id: number) {
        if (!canEditStage(2)) return; // permission gate — Stage 2
        const g = guests.find((x) => x.id === id);
        if (!g) return;
        setActiveCallGuestId(id);
        const existing = g.callAfterLanding;
        setQrCodeViewed(existing?.qrCodeViewed || false);
        setCallFormError("");
        setCallSaved(false);
    }

    function closeCallModal() {
        setActiveCallGuestId(null);
        setCallFormError("");
        setCallSaved(false);
    }

    function openWelcomeModal(id: number) {
        if (!canEditStage(1)) return; // permission gate — Stage 1
        const g = guests.find((x) => x.id === id);
        if (!g) return;
        setActiveWelcomeGuestId(id);
        const existing = g.arrivalWelcome;
        setWelcomeOutcomeRemarks(existing?.outcomeRemarks || "");
        setWelcomeStatus(existing?.status || "");
        setWelcomeNotDoneRemarks(existing?.notDoneRemarks || "");
        setWelcomeFollowupDate(existing?.followupDate || "");
        setWelcomeOutcomeAchieved(existing?.outcomeAchieved || "");
        setWelcomeFormError("");
        setWelcomeSaved(false);
    }

    function closeWelcomeModal() {
        setActiveWelcomeGuestId(null);
        setWelcomeFormError("");
        setWelcomeSaved(false);
    }

    function isWelcomeFormComplete() {
        if (welcomeOutcomeRemarks.trim() === "") return false;
        if (welcomeStatus === "") return false;
        if (welcomeStatus === "Not Done - Close" && welcomeNotDoneRemarks.trim() === "") return false;
        if (welcomeStatus === "Close Follow-up" && welcomeFollowupDate.trim() === "") return false;
        if (welcomeOutcomeAchieved === "") return false;
        return true;
    }

    async function saveWelcomeModal() {
        if (!canEditStage(1)) return; // permission gate — Stage 1
        if (!activeWelcomeGuest) return;
        if (!isAdminRole && isStageLocked(activeWelcomeGuest, 1)) {
            setWelcomeFormError("This stage is locked until its planned date.");
            return;
        }
        if (isStage1Complete) {
            setWelcomeFormError("Stage 1 is already completed — saved data is read-only.");
            return;
        }
        if (!isWelcomeFormComplete() || welcomeSaved) {
            if (!isWelcomeFormComplete()) {
                setWelcomeFormError("All required fields are compulsory. Please fill in every field before saving.");
            }
            return;
        }
        setWelcomeFormError("");
        setWelcomeSaved(true);

        const guestId = activeWelcomeGuest.id;
        const targetId = activeWelcomeGuest.uid || activeWelcomeGuest.bookingId;
        const data = {
            outcomeRemarks: welcomeOutcomeRemarks,
            status: welcomeStatus,
            notDoneRemarks: welcomeStatus === "Not Done - Close" ? welcomeNotDoneRemarks : "",
            followupDate: welcomeStatus === "Close Follow-up" ? welcomeFollowupDate : "",
            outcomeAchieved: welcomeOutcomeAchieved,
        };

        closeWelcomeModal();
        updateGuestOptimistic(guestId, 1, data);
        const toastId = toast.loading("Saving Arrival Welcome data...");

        try {
            await saveStageWithRole(targetId, 1, data);
            toast.success("Arrival Welcome data saved successfully! Submission is recorded.", { id: toastId });
            refetchGuests();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Save failed. Please try again.";
            toast.error(msg, { id: toastId });
            refetchGuests();
        }
    }

    function openSafeReturnModal(id: number) {
        if (!canEditStage(6)) return; // permission gate — Stage 6
        const g = guests.find((x) => x.id === id);
        if (!g) return;
        setActiveSafeReturnGuestId(id);
        const existing = g.safeReturn;
        setSafeReturnStayFeedback(existing?.stayFeedback || "");
        setSafeReturnOutcomeRemarks(existing?.outcomeRemarks || "");
        setSafeReturnStatus(existing?.status || "");
        setSafeReturnNotDoneRemarks(existing?.notDoneRemarks || "");
        setSafeReturnFollowupDate(existing?.followupDate || "");
        setSafeReturnOutcomeAchieved(existing?.outcomeAchieved || "");
        setSafeReturnFormError("");
        setSafeReturnSaved(false);
    }

    function closeSafeReturnModal() {
        setActiveSafeReturnGuestId(null);
        setSafeReturnFormError("");
        setSafeReturnSaved(false);
    }

    function isSafeReturnFormComplete() {
        if (safeReturnStayFeedback.trim() === "") return false;
        if (safeReturnOutcomeRemarks.trim() === "") return false;
        if (safeReturnStatus === "") return false;
        if (safeReturnStatus === "Not Done - Close" && safeReturnNotDoneRemarks.trim() === "") return false;
        if (safeReturnStatus === "Close Follow-up" && safeReturnFollowupDate.trim() === "") return false;
        if (safeReturnOutcomeAchieved === "") return false;
        return true;
    }

    async function saveSafeReturnModal() {
        if (!canEditStage(6)) return; // permission gate — Stage 6
        if (!activeSafeReturnGuest) return;
        if (!isAdminRole && isStageLocked(activeSafeReturnGuest, 6)) {
            setSafeReturnFormError("This stage is locked until its planned date.");
            return;
        }
        if (isStage6Complete) {
            setSafeReturnFormError("Stage 6 is already completed — saved data is read-only.");
            return;
        }
        if (!isSafeReturnFormComplete() || safeReturnSaved) {
            if (!isSafeReturnFormComplete()) {
                setSafeReturnFormError("All required fields are compulsory. Please fill in every field before saving.");
            }
            return;
        }
        setSafeReturnFormError("");
        setSafeReturnSaved(true);

        const guestId = activeSafeReturnGuest.id;
        const targetId = activeSafeReturnGuest.uid || activeSafeReturnGuest.bookingId;
        const data = {
            stayFeedback: safeReturnStayFeedback,
            outcomeAchieved: safeReturnOutcomeAchieved,
            outcomeRemarks: safeReturnOutcomeRemarks,
            status: safeReturnStatus,
            notDoneRemarks: safeReturnStatus === "Not Done - Close" ? safeReturnNotDoneRemarks : "",
        };

        closeSafeReturnModal();
        updateGuestOptimistic(guestId, 6, data);
        const toastId = toast.loading("Saving Safe Return Confirmation...");

        try {
            await saveStageWithRole(targetId, 6, data);
            toast.success("Safe Return Confirmation saved successfully! Submission is recorded.", { id: toastId });
            refetchGuests();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Save failed. Please try again.";
            toast.error(msg, { id: toastId });
            refetchGuests();
        }
    }

    function openResultProgressModal(id: number) {
        if (!canEditStage(7)) return; // permission gate — Stage 7
        const g = guests.find((x) => x.id === id);
        if (!g) return;
        setActiveResultProgressGuestId(id);
        const existing = g.resultProgress;
        setResultOutcomeRemarks(existing?.outcomeRemarks || "");
        setResultStatus(existing?.status || "");
        setResultNotDoneRemarks(existing?.notDoneRemarks || "");
        setResultFollowupDate(existing?.followupDate || "");
        setResultOutcomeAchieved(existing?.outcomeAchieved || "");
        setResultFormError("");
        setResultSaved(false);
    }

    function closeResultProgressModal() {
        setActiveResultProgressGuestId(null);
        setResultFormError("");
        setResultSaved(false);
    }

    function isResultProgressFormComplete() {
        if (resultOutcomeRemarks.trim() === "") return false;
        if (resultStatus === "") return false;
        if (resultStatus === "Not Done - Close" && resultNotDoneRemarks.trim() === "") return false;
        if (resultStatus === "Close Follow-up" && resultFollowupDate.trim() === "") return false;
        if (resultOutcomeAchieved === "") return false;
        return true;
    }

    async function saveResultProgressModal() {
        if (!canEditStage(7)) return; // permission gate — Stage 7
        if (!activeResultProgressGuest) return;
        if (!isAdminRole && isStageLocked(activeResultProgressGuest, 7)) {
            setResultFormError("This stage is locked until its planned date.");
            return;
        }
        if (isStage7Complete) {
            setResultFormError("Stage 7 is already completed — saved data is read-only.");
            return;
        }
        if (!isResultProgressFormComplete() || resultSaved) {
            if (!isResultProgressFormComplete()) {
                setResultFormError("All required fields are compulsory. Please fill in every field before saving.");
            }
            return;
        }
        setResultFormError("");
        setResultSaved(true);

        const guestId = activeResultProgressGuest.id;
        const targetId = activeResultProgressGuest.uid || activeResultProgressGuest.bookingId;
        const data = {
            outcomeAchieved: resultOutcomeAchieved,
            outcomeRemarks: resultOutcomeRemarks,
            status: resultStatus,
            notDoneRemarks: resultStatus === "Not Done - Close" ? resultNotDoneRemarks : "",
            followupDate: resultStatus === "Close Follow-up" ? resultFollowupDate : "",
        };

        closeResultProgressModal();
        updateGuestOptimistic(guestId, 7, data);
        const toastId = toast.loading("Saving Result Tracking...");

        try {
            await saveStageWithRole(targetId, 7, data);
            toast.success("Result Tracking & Health Progress Check saved successfully! Submission is recorded.", { id: toastId });
            refetchGuests();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Save failed. Please try again.";
            toast.error(msg, { id: toastId });
            refetchGuests();
        }
    }

    function openFeedbackModal(id: number) {
        if (!canEditStage(4)) return; // permission gate — Stage 4
        const g = guests.find((x) => x.id === id);
        if (!g) return;
        setActiveFeedbackGuestId(id);
        const s4Saved = getStageSavedData(g, 4);
        setFeedbackDoerRemarks(s4Saved?.doerRemarks || g.guestFeedback?.doerRemarks || "");
        setFeedbackFormError("");
        setFeedbackSaved(false);
    }

    function closeFeedbackModal() {
        setActiveFeedbackGuestId(null);
        setFeedbackFormError("");
        setFeedbackSaved(false);
    }

    function isFeedbackFormComplete() {
        return feedbackDoerRemarks.trim() !== "";
    }

    async function saveFeedbackModal() {
        if (!canEditStage(4)) return; // permission gate — Stage 4
        if (!activeFeedbackGuest) return;
        if (!isAdminRole && isStageLocked(activeFeedbackGuest, 4)) {
            setFeedbackFormError("This stage is locked until its planned date.");
            return;
        }
        if (isStage4Complete) {
            setFeedbackFormError("Stage 4 is already completed — saved data is read-only.");
            return;
        }
        if (!isFeedbackFormComplete() || feedbackSaved) {
            if (!isFeedbackFormComplete()) {
                setFeedbackFormError("Doer Remarks is compulsory. Please fill it in before saving.");
            }
            return;
        }
        setFeedbackFormError("");
        setFeedbackSaved(true);

        const guestId = activeFeedbackGuest.id;
        const targetId = activeFeedbackGuest.uid || activeFeedbackGuest.bookingId;
        const data = {
            doerRemarks: feedbackDoerRemarks,
        };

        closeFeedbackModal();
        updateGuestOptimistic(guestId, 4, data);
        const toastId = toast.loading("Saving Guest Feedback...");

        try {
            await saveStageWithRole(targetId, 4, data);
            toast.success("Guest Feedback saved successfully!", { id: toastId });
            refetchGuests();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Save failed. Please try again.";
            toast.error(msg, { id: toastId });
            refetchGuests();
        }
    }

    function openReferralModal(id: number) {
        if (!canEditStage(8)) return; // permission gate — Stage 8
        const g = guests.find((x) => x.id === id);
        if (!g) return;
        setActiveReferralGuestId(id);
        const s8Saved = getStageSavedData(g, 8);
        setReferralTakenStatus(s8Saved?.referralTakenStatus || s8Saved?.doerStatus || g.referralCollection?.referralTakenStatus || "");
        setReferralDoerRemarks(s8Saved?.doerRemarks || g.referralCollection?.doerRemarks || "");
        setReferralFormError("");
        setReferralSaved(false);
    }

    function closeReferralModal() {
        setActiveReferralGuestId(null);
        setReferralFormError("");
        setReferralSaved(false);
    }

    function isReferralFormComplete() {
        return referralTakenStatus.trim() !== "" && referralDoerRemarks.trim() !== "";
    }

    async function saveReferralModal() {
        if (!canEditStage(8)) return; // permission gate — Stage 8
        if (!activeReferralGuest) return;
        if (!isAdminRole && isStageLocked(activeReferralGuest, 8)) {
            setReferralFormError("This stage is locked until its planned date.");
            return;
        }
        if (isStage8Complete) {
            setReferralFormError("Stage 8 is already completed — saved data is read-only.");
            return;
        }
        if (!isReferralFormComplete() || referralSaved) {
            if (!isReferralFormComplete()) {
                setReferralFormError("Referral Taken Status and Doer Remarks are compulsory. Please fill them in before saving.");
            }
            return;
        }
        setReferralFormError("");
        setReferralSaved(true);

        const guestId = activeReferralGuest.id;
        const targetId = activeReferralGuest.uid || activeReferralGuest.bookingId;
        const data = {
            doerStatus: referralTakenStatus,
            doerRemarks: referralDoerRemarks,
        };

        closeReferralModal();
        updateGuestOptimistic(guestId, 8, data);
        const toastId = toast.loading("Saving Referral Collection...");

        try {
            await saveStageWithRole(targetId, 8, data);
            toast.success("Referral Collection saved successfully!", { id: toastId });
            refetchGuests();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Save failed. Please try again.";
            toast.error(msg, { id: toastId });
            refetchGuests();
        }
    }

    function openRatingModal(id: number) {
        if (!canEditStage(5)) return; // permission gate — Stage 5
        const g = guests.find((x) => x.id === id);
        if (!g) return;
        setActiveRatingGuestId(id);
        const existing = g.ratingRequest;
        setRatingStatus(existing?.ratingStatus || "");
        setRatingNotGivenRemarks(existing?.notGivenRemarks || "");
        setRatingProofFile(null);
        setRatingExistingProofFileName(existing?.proofFileName || "");
        setRatingOutcomeRemarks(existing?.outcomeRemarks || "");
        setRatingCallStatus(existing?.status || "");
        setRatingNotDoneRemarks(existing?.notDoneRemarks || "");
        setRatingFollowupDate(existing?.followupDate || "");
        setRatingOutcomeAchieved(existing?.outcomeAchieved || "");
        setRatingFormError("");
        setRatingSaved(false);
    }

    function closeRatingModal() {
        setActiveRatingGuestId(null);
        setRatingFormError("");
        setRatingSaved(false);
    }

    function isRatingFormComplete() {
        if (ratingStatus === "") return false;
        if (ratingStatus !== "Given" && ratingNotGivenRemarks.trim() === "") return false;
        if (ratingStatus === "Given" && !ratingProofFile && !ratingExistingProofFileName) return false;
        if (ratingOutcomeRemarks.trim() === "") return false;
        if (ratingCallStatus === "") return false;
        if (ratingCallStatus === "Not Done - Close" && ratingNotDoneRemarks.trim() === "") return false;
        if (ratingCallStatus === "Close Follow-up" && ratingFollowupDate.trim() === "") return false;
        if (ratingOutcomeAchieved === "") return false;
        return true;
    }

    async function saveRatingModal() {
        if (!canEditStage(5)) return; // permission gate — Stage 5
        if (!activeRatingGuest) return;
        if (!isAdminRole && isStageLocked(activeRatingGuest, 5)) {
            setRatingFormError("This stage is locked until its planned date.");
            return;
        }
        if (isStage5Complete) {
            setRatingFormError("Stage 5 is already completed — saved data is read-only.");
            return;
        }
        if (!isRatingFormComplete() || ratingSaved) {
            if (!isRatingFormComplete()) {
                setRatingFormError("All required fields are compulsory. Please fill in every field before saving.");
            }
            return;
        }
        setRatingFormError("");
        setRatingSaved(true);
        const proofFileName = ratingProofFile ? ratingProofFile.name : ratingExistingProofFileName;

        const guestId = activeRatingGuest.id;
        const targetId = activeRatingGuest.uid || activeRatingGuest.bookingId;
        const data = {
            ratingStatus: ratingStatus,
            notGivenRemarks: ratingStatus !== "Given" ? ratingNotGivenRemarks : "",
            proofFileName: proofFileName,
            outcomeAchieved: ratingOutcomeAchieved,
            outcomeRemarks: ratingOutcomeRemarks,
            status: ratingCallStatus,
            notDoneRemarks: ratingCallStatus === "Not Done - Close" ? ratingNotDoneRemarks : "",
            followupDate: ratingCallStatus === "Close Follow-up" ? ratingFollowupDate : "",
        };

        closeRatingModal();
        updateGuestOptimistic(guestId, 5, data);
        const toastId = toast.loading("Saving Online Rating & Review Request...");

        try {
            await saveStageWithRole(targetId, 5, data);
            toast.success("Online Rating & Review Request saved successfully! Submission is recorded.", { id: toastId });
            refetchGuests();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Save failed. Please try again.";
            toast.error(msg, { id: toastId });
            refetchGuests();
        }
    }

    function openDetailsModal(id: number, action: string) {
        setActiveDetailsGuestId(id);
        setActiveDetailsAction(action);
    }

    function closeDetailsModal() {
        setActiveDetailsGuestId(null);
        setActiveDetailsAction("");
    }

    function isCallFormComplete() {
        // The QR leaflet is always displayed in the modal now (no show/hide
        // toggle), so viewing is implicit — saving is always allowed.
        return true;
    }

    async function saveCallModal() {
        if (!canEditStage(2)) return; // permission gate — Stage 2
        if (!activeCallGuest) return;
        if (!isAdminRole && isStageLocked(activeCallGuest, 2)) {
            setCallFormError("This stage is locked until its planned date.");
            return;
        }
        if (isStage2Complete) {
            setCallFormError("Stage 2 is already completed.");
            return;
        }
        if (!isCallFormComplete() || callSaved) {
            if (!isCallFormComplete()) {
                setCallFormError("Please view the QR code before saving.");
            }
            return;
        }
        setCallFormError("");
        setCallSaved(true);

        const guestId = activeCallGuest.id;
        const targetId = activeCallGuest.uid || activeCallGuest.bookingId;

        closeCallModal();
        updateGuestOptimistic(guestId, 2, {});
        const toastId = toast.loading("Saving Stage 2 (QR Leaflet Confirmation)...");

        try {
            await saveStageWithRole(targetId, 2, {});
            toast.success("Stage 2 (QR Leaflet Confirmation) saved successfully!", { id: toastId });
            refetchGuests();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Save failed. Please try again.";
            toast.error(msg, { id: toastId });
            refetchGuests();
        }
    }

    const readonlyFields: [string, string | number][] = activeGuest
        ? [
            ["Booking ID", activeGuest.bookingId],
            ["Name of Client", activeGuest.name],
            ["Mobile", activeGuest.mobile],
            ["PI Link", activeGuest.piLink],
            ["Programme / Package", activeGuest.programme],
        ]
        : [];

    // Full guest & booking detail set for the shared "Booking & Guest Details" popup
    const fullDetailsFields: [string, string | number][] = activeDetailsGuest
        ? [
            ["Booking ID", activeDetailsGuest.bookingId],
            ["Name of Client", activeDetailsGuest.name],
            ["Mobile", activeDetailsGuest.mobile],
            ["Email", activeDetailsGuest.email],
            ["Gender", activeDetailsGuest.gender],
            ["Country", activeDetailsGuest.country],
            ["Check-In", activeDetailsGuest.checkin],
            ["Check-Out", activeDetailsGuest.checkout],
            ["Days of Stay", activeDetailsGuest.days],
            ["Programme / Package", activeDetailsGuest.programme],
            ["Room Details", activeDetailsGuest.room],
            ["PI NO", activeDetailsGuest.bookingNo],
            ["Booking Taken By", activeDetailsGuest.takenBy],
            ["Invoice Amt", activeDetailsGuest.invoice],
            ["PI Link", activeDetailsGuest.piLink],
            ["MID", activeDetailsGuest.mid],
            ["UID", activeDetailsGuest.uid],
            ["Booking Status", activeDetailsGuest.bookingStatus?.trim() ? activeDetailsGuest.bookingStatus : "Confirmed"],
        ]
        : [];

    /* =========================================================
       RENDER
    ========================================================= */
    return (
        <DashboardLayout>
            {guestsLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 min-h-[70vh] px-6">
                    <img src="/grouploader.gif" alt="Loading" className="h-65 w-65 object-contain" />
                    <p className="text-sm font-semibold text-emerald-600">Fetching latest bookings…</p>
                </div>
            ) : (
                <div className="space-y-6 w-full pb-10 px-2 sm:px-3 lg:px-4">
                    {/* Hero Header Section with Back Button */}
                    <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)] rounded-xl overflow-hidden">
                        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
                            {/* Back Button */}
                            <button
                                onClick={() => window.history.back()}
                                className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
                            >
                                ← Back
                            </button>

                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                {/* Left Section - Title */}
                                <div className="space-y-3 w-full">
                                    <div className="flex items-start sm:items-center gap-4">
                                        {/* Icon Container */}
                                        <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                                            <PhoneCall className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-white" />
                                        </div>

                                        {/* Title & Subtitle */}
                                        <div className="min-w-0 flex-1">
                                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight break-words">
                                                CRR Calling Process FMS
                                            </h1>
                                            <p className="text-sm sm:text-base lg:text-lg text-white/90 mt-1 sm:mt-2 font-medium">
                                                Guest Relations & Retention • Post-Checkout Follow-up Tracking
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Section - KPI Card */}
                                <div className="flex w-full lg:w-auto justify-start lg:justify-end">
                                    <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
                                        <p className="text-xs uppercase tracking-wide text-white/70 font-semibold mb-1">
                                            Total Guests
                                        </p>
                                        <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
                                            {guests.length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Current View — derived purely from real auth role, no manual switching */}
                    {/* <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200 rounded-xl p-3 text-slate-600 text-xs font-medium">
                    <span>👁️ {role === "admin" ? "Admin view" : "Stage User view"}</span>
                    <span className="text-slate-400">
                        {role === "admin"
                            ? "— filter freely between Pending / Complete / All."
                            : "— showing only your pending stage actions."}
                    </span>
                </div> */}

                    {/* FILTERS */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-md">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200 rounded-t-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                                        Filters & Search
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Refine and locate guest records efficiently
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                className="w-full sm:w-auto bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-100 shadow-sm"
                            >
                                Clear Filters
                            </Button>
                        </div>
                        {/* Content */}
                        <div className="px-4 sm:px-5 py-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                {/* Search */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Guest name, Booking ID, Mobile..."
                                            className="h-10 pl-10 w-full"
                                        />
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date Range</label>
                                    <Select
                                        value={dateRangeFilter}
                                        onValueChange={(val) => setDateRangeFilter(val as DateRangePreset)}
                                    >
                                        <SelectTrigger className="h-10 bg-white border-slate-200 w-full">
                                            <SelectValue placeholder="All Time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Time</SelectItem>
                                            <SelectItem value="today">Today</SelectItem>
                                            <SelectItem value="yesterday">Yesterday</SelectItem>
                                            <SelectItem value="thisWeek">This Week</SelectItem>
                                            <SelectItem value="lastWeek">Last Week</SelectItem>
                                            <SelectItem value="thisMonth">This Month</SelectItem>
                                            <SelectItem value="lastMonth">Last Month</SelectItem>
                                            <SelectItem value="thisYear">This Year</SelectItem>
                                            <SelectItem value="lastYear">Last Year</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Stage */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stage</label>
                                    <Select value={stageFilter} onValueChange={setStageFilter}>
                                        <SelectTrigger className="h-10 bg-white border-slate-200 w-full">
                                            <SelectValue placeholder="All Stages" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                {isAdminRole ? "All Stages" : "All Assigned Stages"}
                                            </SelectItem>
                                            {userAssignedStages.map((s) => (
                                                <SelectItem key={s.no} value={String(s.no)}>
                                                    Stage {s.no} — {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Stage Status */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stage Status</label>
                                    <Select
                                        value={statusFilter}
                                        onValueChange={setStatusFilter}
                                    >
                                        <SelectTrigger className="h-10 bg-white border-slate-200 w-full">
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="complete">Complete</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Responsible Person */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responsible Person</label>
                                    <Select value={respFilter} onValueChange={setRespFilter}>
                                        <SelectTrigger className="h-10 bg-white border-slate-200 w-full">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {responsiblePersonOptions.map((su) => (
                                                <SelectItem key={su.email || su.name} value={su.name || su.email}>
                                                    {su.name || su.email}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Custom Date Range inputs — shown only when "Custom" is selected */}
                            {dateRangeFilter === "custom" && (
                                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start Date</label>
                                            <input
                                                type="date"
                                                value={customStartDate}
                                                onChange={(e) => setCustomStartDate(e.target.value)}
                                                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">End Date</label>
                                            <input
                                                type="date"
                                                value={customEndDate}
                                                min={customStartDate || undefined}
                                                onChange={(e) => setCustomEndDate(e.target.value)}
                                                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200 rounded-t-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40">
                                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight break-words">
                                        Key Performance Indicators
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Overview of post-checkout follow-up status
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Content */}
                        <div className="p-5 space-y-5">
                            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-4 relative">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                                        Follow-up Distribution
                                    </h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                    {/* Total Guests */}
                                    <div className="bg-blue-50/70 border-2 border-blue-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700 leading-tight mb-2">
                                            Total Guests
                                        </p>
                                        <p className="text-3xl font-extrabold text-slate-900 leading-none mb-2">
                                            {guests.length}
                                        </p>
                                        <p className="text-[10px] text-blue-600 font-semibold mt-1">
                                            ▲ In active pipeline
                                        </p>
                                    </div>

                                    {/* Pending Actions */}
                                    <div className="bg-amber-50/70 border-2 border-amber-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 leading-tight mb-2">
                                            Pending Actions
                                        </p>
                                        <p className="text-3xl font-extrabold text-slate-900 leading-none mb-2">
                                            {pendingCount}
                                        </p>
                                        <p className="text-[10px] text-amber-600 font-semibold mt-1">
                                            {actionablePendingCount} actionable now · {pendingCount - actionablePendingCount} awaiting unlock
                                        </p>
                                    </div>

                                    {/* Completed */}
                                    <div className="bg-green-50/70 border-2 border-green-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-green-700 leading-tight mb-2">
                                            Completed
                                        </p>
                                        <p className="text-3xl font-extrabold text-slate-900 leading-none mb-2">
                                            {completeCount}
                                        </p>
                                        <p className="text-[10px] text-green-600 font-semibold mt-1">
                                            Fully closed journeys (excl. cancelled)
                                        </p>
                                    </div>

                                    {/* Cancelled */}
                                    <div className="bg-red-50/70 border-2 border-red-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-red-700 leading-tight mb-2">
                                            Cancelled
                                        </p>
                                        <p className="text-3xl font-extrabold text-slate-900 leading-none mb-2">
                                            {cancelledCount}
                                        </p>
                                        <p className="text-[10px] text-red-600 font-semibold mt-1">
                                            Cancelled bookings
                                        </p>
                                    </div>

                                    {/* Referrals Generated */}
                                    <div className="bg-purple-50/70 border-2 border-purple-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-purple-700 leading-tight mb-2">
                                            Referrals Generated
                                        </p>
                                        <p className="text-3xl font-extrabold text-slate-900 leading-none mb-2">
                                            {referralsGeneratedCount}
                                        </p>
                                        <p className="text-[10px] text-purple-600 font-semibold mt-1">
                                            Stage 8 leads captured
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STAGE WISE PENDING REPORT */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-md mt-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200 rounded-t-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">Stage Wise Pendings Report</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Responsible-person-wise actionable pending count, per stage</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                                    Pending Bookings: <strong className="font-bold">{pendingCount}</strong>
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">
                                    Total Stage Pendings: <strong className="font-bold">{pendingReport.totals.reduce((a, b) => a + b, 0)}</strong>
                                </span>
                            </div>
                        </div>
                        {/* Content */}
                        <div className="overflow-x-auto w-full">
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                                <thead className="sticky top-0 z-10 border-b-2 border-slate-400 shadow" style={{ backgroundColor: "#1e3a5f" }}>
                                    <tr className="border-b-2 border-slate-400">
                                        <th className="px-4 py-3.5 text-left text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap" style={{ backgroundColor: "#1e3a5f" }}>
                                            Employee Name
                                        </th>
                                        {STAGES.map((s) => (
                                            <th key={s.no} className="px-3 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 align-top" style={{ backgroundColor: "#1e3a5f" }}>
                                                <span className="block">Stage {s.no}</span>
                                                <span className="block font-semibold normal-case text-white text-[10px] tracking-normal mt-0.5 whitespace-normal max-w-[140px] mx-auto leading-tight">{s.name}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingReport.table.map((row) => (
                                        <tr key={row.emp} className="border-b border-slate-200 hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 text-left font-bold text-slate-800 border-r border-slate-200 text-xs">{row.emp}</td>
                                            {row.counts.map((c, idx) => (
                                                <td
                                                    key={idx}
                                                    className={`px-4 py-3 text-center border-r border-slate-200 last:border-r-0 text-xs font-extrabold ${c > 0 ? "text-red-600 bg-red-50/20" : "text-slate-400 font-medium"}`}
                                                >
                                                    {c}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="font-bold text-xs" style={{ backgroundColor: "#1e3a5f" }}>
                                    <tr className="text-white">
                                        <td className="py-3.5 px-4 font-bold border-r border-slate-600 text-left">Grand Total</td>
                                        {pendingReport.totals.map((t, idx) => (
                                            <td key={idx} className="text-center py-3.5 border-r border-slate-600 last:border-r-0 font-extrabold">{t}</td>
                                        ))}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* MAIN DATA TABLE */}
                    <div ref={tableSectionRef} className="rounded-xl border border-slate-200 bg-white shadow-md mt-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200 rounded-t-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                                    <Users className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">Guest Follow-up Records</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Showing guest follow-up records — click Open to view stage actions
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <Button
                                    variant={viewMode === "table" ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => setViewMode("table")}
                                    className={`w-full sm:w-auto font-semibold shadow-sm ${viewMode === "table" ? "" : "border-slate-300 text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    <Users className="h-3.5 w-3.5 mr-1.5" />
                                    Table View
                                </Button>
                                <Button
                                    variant={viewMode === "chart" ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => setViewMode("chart")}
                                    className={`w-full sm:w-auto font-semibold shadow-sm ${viewMode === "chart" ? "" : "border-slate-300 text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                                    Chart View
                                </Button>
                            </div>
                        </div>
                        {/* Error state for the live GAS-backed data */}
                        {guestsError && (
                            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-xs font-semibold text-red-600 bg-red-50 border-b border-red-200">
                                <span className="flex items-center gap-2">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    {guestsError}
                                </span>
                                <Button variant="outline" size="sm" onClick={refetchGuests} className="h-7 px-3 bg-white border-red-300 text-red-700 hover:bg-red-50">
                                    Retry
                                </Button>
                            </div>
                        )}
                        {viewMode === "table" ? (
                            <>
                                {/* Mobile-only swipe hint — table keeps its columns but scrolls horizontally on small screens */}
                                <div className="sm:hidden flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                                    <ChevronRight className="h-3 w-3 rotate-180" />
                                    Swipe to see more
                                    <ChevronRight className="h-3 w-3" />
                                </div>
                                {/* Content */}
                                <div className="relative rounded-b-xl">
                                    <div
                                        className="overflow-x-auto overflow-y-visible w-full rounded-b-xl [scrollbar-width:thin]"
                                        style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}
                                    >
                                        <table className="min-w-full divide-y divide-slate-200 text-xs" style={{ tableLayout: "fixed" }}>
                                            <thead className="sticky top-0 z-20 border-b-2 border-slate-400 shadow" style={{ backgroundColor: "#1e3a5f" }}>
                                                <tr className="border-b-2 border-slate-400">
                                                    {/* Frozen headers: Timestamp / Booking ID scroll away on mobile; only Client Details stays pinned */}
                                                    <th
                                                        className={frozenCellClass("px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap", frozenColsSticky, "z-30")}
                                                        style={{
                                                            backgroundColor: "#1e3a5f",
                                                            ...frozenCellStyle(STICKY_COLS.timestamp.left, STICKY_COLS.timestamp.width, frozenColsSticky),
                                                        }}
                                                    >
                                                        Timestamp
                                                    </th>
                                                    <th
                                                        className={frozenCellClass("px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:bg-slate-700/40 transition-colors", frozenColsSticky, "z-30")}
                                                        style={{
                                                            backgroundColor: "#1e3a5f",
                                                            ...frozenCellStyle(STICKY_COLS.bookingId.left, STICKY_COLS.bookingId.width, frozenColsSticky),
                                                        }}
                                                        onClick={() => handleSort("Booking ID")}
                                                    >
                                                        <span className="inline-flex items-center gap-1">
                                                            Booking ID
                                                            {sortColumn === "Booking ID" ? (
                                                                sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                            ) : (
                                                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                            )}
                                                        </span>
                                                    </th>
                                                    <th
                                                        className="sticky z-30 px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:bg-slate-700/40 transition-colors"
                                                        style={{
                                                            backgroundColor: "#1e3a5f",
                                                            ...frozenCellStyle(clientStickyLeft, clientStickyWidth, true, true),
                                                        }}
                                                        onClick={() => handleSort("Client Details")}
                                                    >
                                                        <span className="inline-flex items-center gap-1">
                                                            Client Details
                                                            {sortColumn === "Client Details" ? (
                                                                sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                            ) : (
                                                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                            )}
                                                        </span>
                                                    </th>
                                                    {/* Scrollable headers */}
                                                    {SCROLLABLE_HEADERS.map((h) => {
                                                        const sortable = !!SORT_ACCESSORS[h];
                                                        return (
                                                            <th
                                                                key={h}
                                                                className={`px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap ${sortable ? "cursor-pointer select-none hover:bg-slate-700/40 transition-colors" : ""}`}
                                                                style={{ backgroundColor: "#1e3a5f" }}
                                                                onClick={sortable ? () => handleSort(h) : undefined}
                                                            >
                                                                {sortable ? (
                                                                    <span className="inline-flex items-center gap-1">
                                                                        {h}
                                                                        {sortColumn === h ? (
                                                                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                                        ) : (
                                                                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    h
                                                                )}
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.length === 0 && (
                                                    <tr className="border-b border-slate-200">
                                                        <td colSpan={19} className="text-center py-8 text-slate-400 font-semibold text-sm">
                                                            No records match the current filters.
                                                        </td>
                                                    </tr>
                                                )}
                                                {pagedRows.map((g) => {
                                                    const stageObj = STAGES[Math.min(g.currentStage, STAGES.length) - 1];
                                                    return (
                                                        <tr key={g.id} className="group border-b border-slate-200 hover:bg-slate-50/80 transition-colors">
                                                            {/* Timestamp — sticky on desktop, scrolls with the row on mobile */}
                                                            <td
                                                                className={frozenCellClass("bg-white group-hover:bg-slate-50 px-4 py-3.5 text-center text-slate-700 whitespace-nowrap transition-colors", frozenColsSticky)}
                                                                style={frozenCellStyle(STICKY_COLS.timestamp.left, STICKY_COLS.timestamp.width, frozenColsSticky)}
                                                            >
                                                                {g.timestamp}
                                                            </td>
                                                            {/* Booking ID — sticky on desktop, scrolls with the row on mobile */}
                                                            <td
                                                                className={frozenCellClass("bg-white group-hover:bg-slate-50 px-4 py-3.5 text-center font-bold text-slate-900 whitespace-nowrap transition-colors", frozenColsSticky)}
                                                                style={frozenCellStyle(STICKY_COLS.bookingId.left, STICKY_COLS.bookingId.width, frozenColsSticky)}
                                                            >
                                                                {g.bookingId}
                                                            </td>
                                                            {/* Client Details — always frozen (narrower on mobile to leave room to scroll) */}
                                                            <td
                                                                className="sticky z-10 bg-white group-hover:bg-slate-50 px-4 py-3.5 text-left transition-colors overflow-hidden"
                                                                style={frozenCellStyle(clientStickyLeft, clientStickyWidth, true, true)}
                                                            >
                                                                <div className="font-bold text-slate-900 whitespace-nowrap">{g.name}</div>
                                                                <div className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">{g.mobile}</div>
                                                                <div className="text-[10px] text-blue-500 whitespace-nowrap hidden sm:block">{g.email}</div>
                                                            </td>
                                                            {/* Check-In */}
                                                            <td className="px-4 py-3.5 text-center text-slate-700 whitespace-nowrap">{g.checkin}</td>
                                                            {/* Check-Out */}
                                                            <td className="px-4 py-3.5 text-center text-slate-700 whitespace-nowrap">{g.checkout}</td>
                                                            {/* Days of Stay */}
                                                            <td className="px-4 py-3.5 text-center font-bold text-slate-900">{g.days}</td>
                                                            {/* Country */}
                                                            <td className="px-4 py-3.5 text-center text-slate-700 whitespace-nowrap">{g.country}</td>
                                                            {/* Gender */}
                                                            <td className="px-4 py-3.5 text-center text-slate-700 whitespace-nowrap">{g.gender}</td>
                                                            {/* Programme / Package */}
                                                            <td className="px-4 py-3.5 text-left align-top leading-snug text-slate-700 whitespace-normal break-words min-w-[220px] max-w-[280px]">{g.programme}</td>
                                                            {/* Room Details */}
                                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                                {(() => {
                                                                    const { category, occupancy } = parseRoomDetails(g.room);
                                                                    return (
                                                                        <div className="leading-tight">
                                                                            <div className="font-semibold text-slate-900">{category}</div>
                                                                            {occupancy && (
                                                                                <div className="text-[10px] text-slate-500 mt-0.5">{occupancy}</div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </td>
                                                            {/* PI NO */}
                                                            <td className="px-4 py-3.5 text-center text-slate-700 whitespace-nowrap">{g.bookingNo}</td>
                                                            {/* Booking Taken By */}
                                                            <td className="px-4 py-3.5 text-center text-slate-700 whitespace-nowrap">{g.takenBy}</td>
                                                            {/* Invoice Amt */}
                                                            <td className="px-4 py-3.5 text-center font-bold text-slate-900 whitespace-nowrap">{g.invoice}</td>
                                                            {/* PI Link */}
                                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                                {g.piLink && g.piLink !== "#" && g.piLink !== "-" && g.piLink.trim() !== "" ? (
                                                                    <a
                                                                        href={g.piLink}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 text-xs"
                                                                    >
                                                                        View PI
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-slate-400 font-medium">_</span>
                                                                )}
                                                            </td>
                                                            {/* MID */}
                                                            {/* <td className="px-4 py-3.5 text-center text-slate-700 whitespace-nowrap">{g.mid}</td> */}
                                                            {/* UID */}
                                                            <td className="px-4 py-3.5 text-center text-slate-700 whitespace-nowrap">{g.uid}</td>
                                                            {/* Booking Status */}
                                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                                {(() => {
                                                                    const displayBookingStatus = g.bookingStatus?.trim() ? g.bookingStatus : "Confirmed";
                                                                    const styles: Record<string, string> = {
                                                                        "Confirmed": "text-emerald-700 bg-emerald-50 border-emerald-200",
                                                                        "Checked Out": "text-slate-700 bg-slate-100 border-slate-300",
                                                                        "Cancelled": "text-red-700 bg-red-50 border-red-200",
                                                                    };
                                                                    const cls = styles[displayBookingStatus] || "text-slate-700 bg-slate-100 border-slate-300";
                                                                    return (
                                                                        <span className={`inline-flex items-center text-[10px] font-bold border px-2.5 py-0.5 rounded-md shadow-sm ${cls}`}>
                                                                            {displayBookingStatus}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </td>

                                                            {/* Current Stage */}
                                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                                {g.allComplete ? (
                                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md shadow-sm">
                                                                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                                                                        All Complete
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md shadow-sm">
                                                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                                                        {stageObj.no}: {stageObj.name}
                                                                    </span>
                                                                )}
                                                                <div className="flex gap-0.5 mt-1.5 justify-center">
                                                                    {STAGES.map((s, idx) => {
                                                                        // Each dot reflects that stage's OWN completion status —
                                                                        // stages complete out of order (external forms/pipelines),
                                                                        // so position-relative coloring would hide real progress.
                                                                        let cls = "w-3.5 h-1 rounded-sm transition-colors";
                                                                        if (g.stageStatus[idx] === "Complete") {
                                                                            cls += " bg-emerald-500";
                                                                        } else if (g.stageStatus[idx] === "Processing") {
                                                                            cls += " bg-amber-400 animate-pulse";
                                                                        } else if (idx === g.currentStage - 1 && !g.allComplete) {
                                                                            cls += " bg-amber-500";
                                                                        } else {
                                                                            cls += " bg-slate-200";
                                                                        }
                                                                        return <span key={s.no} className={cls} />;
                                                                    })}
                                                                </div>
                                                            </td>
                                                            {/* Action */}
                                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => openViewModal(g.id, 1)}
                                                                        title="View All Stages & Filled Data"
                                                                        className="h-8 px-2.5 text-xs font-semibold text-blue-600 bg-blue-50/80 border-blue-200 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 rounded-lg flex items-center gap-1 shadow-xs"
                                                                    >
                                                                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                                                                        <span>View</span>
                                                                    </Button>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                                                                            >
                                                                                <MoreVertical className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end" className="w-60">
                                                                            {isBookingCancelled(g) && !isAdminRole ? (
                                                                                /* (3) Cancelled booking — guest journey auto-closed, no stage actions for non-admin. */
                                                                                <DropdownMenuItem disabled className="gap-2.5 text-red-500 opacity-70">
                                                                                    <AlertTriangle className="h-4 w-4" />
                                                                                    Booking cancelled — stages closed
                                                                                </DropdownMenuItem>
                                                                            ) : (
                                                                                <>
                                                                                    {isBookingCancelled(g) && (
                                                                                        <div className="px-2.5 py-1.5 mx-1 my-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-1.5">
                                                                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                                                                            <span>Cancelled Booking (Admin Access)</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {/* (4) Visibility = permission (no permission → hidden entirely).
                                                                            Disabled = stage locked (planned date not reached).
                                                                            Completed stages stay clickable to view saved data read-only. */}
                                                                                    {/* Stage 1: Arrival Welcome on Pickup */}
                                                                                    {canEditStage(1) && (
                                                                                        <DropdownMenuItem
                                                                                            disabled={!isAdminRole && isStageLocked(g, 1) && g.stageStatus[0] !== "Complete"}
                                                                                            onSelect={(e) => {
                                                                                                e.preventDefault();
                                                                                                setTimeout(() => openWelcomeModal(g.id), 0);
                                                                                            }}
                                                                                            className="gap-2.5 text-sky-600 focus:text-sky-700 cursor-pointer disabled:opacity-40"
                                                                                        >
                                                                                            <Home className="h-4 w-4" />
                                                                                            Arrival Welcome on Pickup
                                                                                        </DropdownMenuItem>
                                                                                    )}
                                                                                    {/* Stage 2: Guest Request & Complaint Mgmt */}
                                                                                    {canEditStage(2) && (
                                                                                        <DropdownMenuItem
                                                                                            disabled={!isAdminRole && isStageLocked(g, 2) && g.stageStatus[1] !== "Complete"}
                                                                                            onSelect={(e) => {
                                                                                                e.preventDefault();
                                                                                                setTimeout(() => openCallModal(g.id), 0);
                                                                                            }}
                                                                                            className="gap-2.5 text-indigo-600 focus:text-indigo-700 cursor-pointer disabled:opacity-40"
                                                                                        >
                                                                                            <PhoneCall className="h-4 w-4" />
                                                                                            Guest Request &amp; Complaint Management
                                                                                        </DropdownMenuItem>
                                                                                    )}

                                                                                    {(canEditStage(1) || canEditStage(2)) && (canEditStage(3) || canEditStage(4) || canEditStage(5)) && <DropdownMenuSeparator />}

                                                                                    {/* Stage 3: Next Visit Planning & Confirmation */}
                                                                                    {canEditStage(3) && (
                                                                                        <DropdownMenuItem
                                                                                            disabled={!isAdminRole && isStageLocked(g, 3) && g.stageStatus[2] !== "Complete"}
                                                                                            onSelect={(e) => {
                                                                                                e.preventDefault();
                                                                                                setTimeout(() => openModal(g.id), 0);
                                                                                            }}
                                                                                            className="gap-2.5 text-blue-600 focus:text-blue-700 cursor-pointer disabled:opacity-40"
                                                                                        >
                                                                                            <Calendar className="h-4 w-4" />
                                                                                            Next Visit Planning &amp; Confirmation
                                                                                        </DropdownMenuItem>
                                                                                    )}
                                                                                    {/* Stage 4: Guest Feedback & Outcome Confirmation */}
                                                                                    {canEditStage(4) && (
                                                                                        <DropdownMenuItem
                                                                                            disabled={!isAdminRole && isStageLocked(g, 4) && g.stageStatus[3] !== "Complete"}
                                                                                            onSelect={(e) => {
                                                                                                e.preventDefault();
                                                                                                setTimeout(() => openFeedbackModal(g.id), 0);
                                                                                            }}
                                                                                            className="gap-2.5 text-amber-600 focus:text-amber-700 cursor-pointer disabled:opacity-40"
                                                                                        >
                                                                                            <Star className="h-4 w-4" />
                                                                                            Guest Feedback &amp; Outcome Confirmation
                                                                                        </DropdownMenuItem>
                                                                                    )}
                                                                                    {/* Stage 5: Online Rating & Review Request */}
                                                                                    {canEditStage(5) && (
                                                                                        <DropdownMenuItem
                                                                                            disabled={!isAdminRole && isStageLocked(g, 5) && g.stageStatus[4] !== "Complete"}
                                                                                            onSelect={(e) => {
                                                                                                e.preventDefault();
                                                                                                setTimeout(() => openRatingModal(g.id), 0);
                                                                                            }}
                                                                                            className="gap-2.5 text-orange-600 focus:text-orange-700 cursor-pointer disabled:opacity-40"
                                                                                        >
                                                                                            <Send className="h-4 w-4" />
                                                                                            Online Rating &amp; Review Request
                                                                                        </DropdownMenuItem>
                                                                                    )}

                                                                                    {(canEditStage(1) || canEditStage(2) || canEditStage(3) || canEditStage(4) || canEditStage(5)) && (canEditStage(6) || canEditStage(7) || canEditStage(8)) && <DropdownMenuSeparator />}

                                                                                    {/* Stage 6: Safe Return Confirmation */}
                                                                                    {canEditStage(6) && (
                                                                                        <DropdownMenuItem
                                                                                            disabled={!isAdminRole && isStageLocked(g, 6) && g.stageStatus[5] !== "Complete"}
                                                                                            onSelect={(e) => {
                                                                                                e.preventDefault();
                                                                                                setTimeout(() => openSafeReturnModal(g.id), 0);
                                                                                            }}
                                                                                            className="gap-2.5 text-emerald-600 focus:text-emerald-700 cursor-pointer disabled:opacity-40"
                                                                                        >
                                                                                            <RotateCcw className="h-4 w-4" />
                                                                                            Safe Return Confirmation
                                                                                        </DropdownMenuItem>
                                                                                    )}
                                                                                    {/* Stage 7: Result Tracking & Health Progress Check */}
                                                                                    {canEditStage(7) && (
                                                                                        <DropdownMenuItem
                                                                                            disabled={!isAdminRole && isStageLocked(g, 7) && g.stageStatus[6] !== "Complete"}
                                                                                            onSelect={(e) => {
                                                                                                e.preventDefault();
                                                                                                setTimeout(() => openResultProgressModal(g.id), 0);
                                                                                            }}
                                                                                            className="gap-2.5 text-purple-600 focus:text-purple-700 cursor-pointer disabled:opacity-40"
                                                                                        >
                                                                                            <TrendingUp className="h-4 w-4" />
                                                                                            Result Tracking &amp; Health Progress Check
                                                                                        </DropdownMenuItem>
                                                                                    )}
                                                                                    {/* Stage 8: Referral Collection & Lead Generation */}
                                                                                    {canEditStage(8) && (
                                                                                        <DropdownMenuItem
                                                                                            disabled={!isAdminRole && isStageLocked(g, 8) && g.stageStatus[7] !== "Complete"}
                                                                                            onSelect={(e) => {
                                                                                                e.preventDefault();
                                                                                                if (g.stageStatus[7] === "Complete") {
                                                                                                    setTimeout(() => openReferralModal(g.id), 0);
                                                                                                } else {
                                                                                                    window.open(buildReferralFormUrl(g.bookingId), "_blank", "noopener,noreferrer");
                                                                                                }
                                                                                            }}
                                                                                            className="gap-2.5 text-green-600 focus:text-green-700 cursor-pointer disabled:opacity-40"
                                                                                        >
                                                                                            <Users className="h-4 w-4" />
                                                                                            Referral Collection &amp; Lead Generation
                                                                                        </DropdownMenuItem>
                                                                                    )}

                                                                                    {(canEditStage(1) || canEditStage(2) || canEditStage(3) || canEditStage(4) || canEditStage(5) || canEditStage(6) || canEditStage(7) || canEditStage(8)) && (canEditStage(9) || canEditStage(10) || canEditStage(11)) && <DropdownMenuSeparator />}

                                                                                    {/* Stage 9: Driver Assignment – Arrival Pickup */}
                                                                                    {canEditStage(9) && (
                                                                                        <DropdownMenuItem
                                                                                            disabled={!isAdminRole && isStageLocked(g, 9) && g.stageStatus[8] !== "Complete"}
                                                                                            onSelect={(e) => {
                                                                                                e.preventDefault();
                                                                                                setTimeout(() => openDriverArrivalModal(g.id), 0);
                                                                                            }}
                                                                                            className="gap-2.5 text-indigo-600 focus:text-indigo-700 cursor-pointer disabled:opacity-40"
                                                                                        >
                                                                                            <Briefcase className="h-4 w-4" />
                                                                                            Driver Assignment – Arrival Pickup
                                                                                        </DropdownMenuItem>
                                                                                    )}

                                                                                    {/* Stage 10: Driver Assignment – Departure Drop */}
                                                                                    {canEditStage(10) && (
                                                                                        <DropdownMenuItem
                                                                                            disabled={!isAdminRole && isStageLocked(g, 10) && g.stageStatus[9] !== "Complete"}
                                                                                            onSelect={(e) => {
                                                                                                e.preventDefault();
                                                                                                setTimeout(() => openDriverDepartureModal(g.id), 0);
                                                                                            }}
                                                                                            className="gap-2.5 text-indigo-600 focus:text-indigo-700 cursor-pointer disabled:opacity-40"
                                                                                        >
                                                                                            <Briefcase className="h-4 w-4" />
                                                                                            Driver Assignment – Departure Drop
                                                                                        </DropdownMenuItem>
                                                                                    )}

                                                                                    {/* Stage 11: Guest Requirement Verification */}
                                                                                    {canEditStage(11) && (
                                                                                        <DropdownMenuItem
                                                                                            disabled={!isAdminRole && isStageLocked(g, 11) && g.stageStatus[10] !== "Complete"}
                                                                                            onSelect={(e) => {
                                                                                                e.preventDefault();
                                                                                                setTimeout(() => openRequirementVerificationModal(g.id), 0);
                                                                                            }}
                                                                                            className="gap-2.5 text-teal-600 focus:text-teal-700 cursor-pointer disabled:opacity-40"
                                                                                        >
                                                                                            <CheckCircle2 className="h-4 w-4" />
                                                                                            Guest Requirement Verification
                                                                                        </DropdownMenuItem>
                                                                                    )}

                                                                                    {/* Pure viewer (no stage permissions at all) */}
                                                                                    {![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].some((n) => canEditStage(n)) && (
                                                                                        <DropdownMenuItem disabled className="gap-2.5 text-slate-400 opacity-70">
                                                                                            No stage permissions assigned
                                                                                        </DropdownMenuItem>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Right-edge fade — hints there's more content to scroll to on mobile */}
                                    <div className="sm:hidden pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-white/90 to-transparent" />
                                </div>

                                {/* Pagination Footer */}
                                {rows.length > 0 && (
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-4 sm:px-6 py-4 border-t bg-gradient-to-r from-slate-50 to-blue-50">
                                        {/* Left - Info */}
                                        <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-slate-600">
                                            <span>Showing</span>
                                            <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                                                {tableStartIndex + 1}–{tableEndIndex}
                                            </span>
                                            <span>of</span>
                                            <span className="font-bold text-blue-700">{rows.length}</span>
                                            <span>records</span>
                                        </div>

                                        {/* Center - Page Numbers */}
                                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                                            {/* First page — hidden on the smallest screens to avoid crowding */}
                                            <Button
                                                size="sm" variant="outline"
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(1)}
                                                className="hidden sm:inline-flex h-9 w-9 sm:h-8 sm:w-8 p-0 text-xs"
                                            >«</Button>

                                            {/* Prev */}
                                            <Button
                                                size="sm" variant="outline"
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                className="h-9 sm:h-8 px-3 text-xs"
                                            >‹ Prev</Button>

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
                                                            className={`h-9 w-9 sm:h-8 sm:w-8 rounded-md text-xs font-semibold transition-all ${i === cur
                                                                ? 'bg-blue-600 text-white shadow-md border border-blue-700'
                                                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-blue-50 hover:border-blue-300'
                                                                }`}
                                                        >{i}</button>
                                                    )
                                                }
                                                if (end < total) pages.push(<span key="e-ellipsis" className="px-1 text-slate-400">…</span>)
                                                return pages
                                            })()}

                                            {/* Next */}
                                            <Button
                                                size="sm" variant="outline"
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                                className="h-9 sm:h-8 px-3 text-xs"
                                            >Next ›</Button>

                                            {/* Last page — hidden on the smallest screens to avoid crowding */}
                                            <Button
                                                size="sm" variant="outline"
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(totalPages)}
                                                className="hidden sm:inline-flex h-9 w-9 sm:h-8 sm:w-8 p-0 text-xs"
                                            >»</Button>
                                        </div>

                                        {/* Right - Rows per page & Go to page */}
                                        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-4">
                                            {/* Rows per page */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-slate-500">Rows/page</span>
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => {
                                                        setItemsPerPage(Number(e.target.value));
                                                        setCurrentPage(1);
                                                    }}
                                                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                >
                                                    {[5, 10, 15, 25, 50, 100].map((size) => (
                                                        <option key={size} value={size}>{size}</option>
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
                                                    onKeyDown={(e) => e.key === 'Enter' && handleGotoPage()}
                                                    className="h-8 w-16 rounded-md border border-slate-300 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="#"
                                                />
                                                <Button
                                                    size="sm"
                                                    className="h-8 bg-blue-600 hover:bg-blue-700 text-xs px-3"
                                                    onClick={handleGotoPage}
                                                >Go</Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="px-4 sm:px-6 py-6 bg-slate-50/60 rounded-b-xl">
                                {rows.length === 0 ? (
                                    <div className="text-center py-16 text-sm text-slate-400">
                                        No data to chart for the current filters.
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Journey Status Distribution: donut + role breakdown */}
                                        <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
                                            <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">
                                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30 shrink-0">
                                                    <TrendingUp className="w-4 h-4 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-900 leading-tight">Journey Status Distribution</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">Active vs. completed journeys, and active workload by responsible role</p>
                                                </div>
                                            </div>
                                            <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
                                                {/* Donut */}
                                                <div className="lg:col-span-2 flex flex-col items-center justify-center gap-5">
                                                    <div className="relative w-40 h-40 shrink-0">
                                                        <div
                                                            className="w-40 h-40 rounded-full shadow-inner"
                                                            style={{
                                                                background: `conic-gradient(#f59e0b 0% ${(chartData.totalActive / chartData.totalAll) * 100}%, #10b981 ${(chartData.totalActive / chartData.totalAll) * 100}% 100%)`,
                                                            }}
                                                        />
                                                        <div className="absolute inset-[14px] rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] flex flex-col items-center justify-center">
                                                            <span className="text-2xl font-extrabold text-slate-900 leading-none">{chartData.totalActive + chartData.totalComplete}</span>
                                                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-1">Guests</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-6">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0" />
                                                            <span className="text-slate-600">Active</span>
                                                            <span className="font-bold text-slate-900">{chartData.totalActive}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
                                                            <span className="text-slate-600">Completed</span>
                                                            <span className="font-bold text-slate-900">{chartData.totalComplete}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Role breakdown */}
                                                <div className="lg:col-span-3 flex flex-col justify-center gap-5">
                                                    {(
                                                        [
                                                            { key: "GRE", label: "Guest Relations Executive (GRE)", icon: PhoneCall, from: "from-sky-500", to: "to-sky-600" },
                                                            { key: "Doctor", label: "Doctor", icon: Award, from: "from-teal-500", to: "to-teal-600" },
                                                            { key: "FO", label: "Front Office (FO)", icon: Briefcase, from: "from-purple-500", to: "to-purple-600" },
                                                            { key: "GM", label: "General Manager (GM)", icon: ClipboardCheck, from: "from-amber-500", to: "to-amber-600" },
                                                        ] as const
                                                    ).map((r) => {
                                                        const value = chartData.respCounts[r.key] ?? 0;
                                                        const pct = chartData.totalActive > 0 ? (value / chartData.totalActive) * 100 : 0;
                                                        const Icon = r.icon;
                                                        return (
                                                            <div key={r.key} className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${r.from} ${r.to} shadow-sm`}>
                                                                    <Icon className="w-4.5 h-4.5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-1.5 gap-2">
                                                                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500 truncate">{r.label}</span>
                                                                        <span className="text-sm font-extrabold text-slate-900 shrink-0">
                                                                            {value} <span className="text-xs font-medium text-slate-400">({pct.toFixed(0)}%)</span>
                                                                        </span>
                                                                    </div>
                                                                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full bg-gradient-to-r ${r.from} ${r.to} transition-all`}
                                                                            style={{ width: `${value === 0 ? 0 : Math.max(pct, 4)}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pending Actions by Stage */}
                                        <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
                                            <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">
                                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30 shrink-0">
                                                    <BarChart3 className="w-4 h-4 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-900 leading-tight">Pending Actions by Stage</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">Unlocked and awaiting action, across all 8 stages</p>
                                                </div>
                                            </div>
                                            <div className="p-3 sm:p-4">
                                                {STAGES.map((s, idx) => {
                                                    const value = chartData.stagePending[idx] ?? 0;
                                                    const pct = (value / chartData.maxStagePending) * 100;
                                                    return (
                                                        <div
                                                            key={s.no}
                                                            className={`flex items-center gap-3 sm:gap-4 rounded-lg px-2 sm:px-3 py-2.5 ${idx % 2 === 0 ? "bg-slate-50/70" : ""}`}
                                                        >
                                                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-800 text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center shrink-0">
                                                                {s.no}
                                                            </div>
                                                            <div className="w-32 sm:w-72 shrink-0 text-xs font-semibold text-slate-700 truncate" title={s.name}>
                                                                {s.name}
                                                            </div>
                                                            <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                                                                    style={{ width: `${value === 0 ? 0 : Math.max(pct, 3)}%` }}
                                                                />
                                                            </div>
                                                            <div className="w-12 shrink-0 text-right">
                                                                <span className="inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                    {value}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Top Pending Workload by Employee */}
                                        {chartData.employeeTotals.length > 0 && (
                                            <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
                                                <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">
                                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-md border border-orange-600/30 shrink-0">
                                                        <Award className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-slate-900 leading-tight">Top Pending Workload by Employee</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">Highest actionable-pending count, summed across all stages</p>
                                                    </div>
                                                </div>
                                                <div className="p-3 sm:p-4">
                                                    {chartData.employeeTotals.map((e, i) => {
                                                        const pct = (e.total / chartData.maxEmployee) * 100;
                                                        const initials = e.emp
                                                            .split(/\s+/)
                                                            .filter(Boolean)
                                                            .slice(0, 2)
                                                            .map((w) => w[0])
                                                            .join("")
                                                            .toUpperCase();
                                                        return (
                                                            <div
                                                                key={e.emp}
                                                                className={`flex items-center gap-3 sm:gap-4 rounded-lg px-2 sm:px-3 py-2.5 ${i % 2 === 0 ? "bg-slate-50/70" : ""}`}
                                                            >
                                                                <div className="w-5 sm:w-6 text-[11px] font-bold text-slate-400 text-center shrink-0">#{i + 1}</div>
                                                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                                                    {initials || "—"}
                                                                </div>
                                                                <div className="w-24 sm:w-56 shrink-0 text-xs font-semibold text-slate-700 truncate" title={e.emp}>
                                                                    {e.emp}
                                                                </div>
                                                                <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                                                    <div
                                                                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                                                                        style={{ width: `${e.total === 0 ? 0 : Math.max(pct, 3)}%` }}
                                                                    />
                                                                </div>
                                                                <div className="w-12 shrink-0 text-right">
                                                                    <span className="inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                        {e.total}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ACTION DIALOG */}
            <Dialog open={activeGuest !== null && activeStage !== null} onOpenChange={(open) => !open && closeModal()}>
                {activeGuest && activeStage && (
                    <DialogContent style={{ width: "min(98vw, 1400px)", maxWidth: "min(98vw, 1400px)" }} className="p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl">
                        <DialogHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 text-white">
                            <DialogTitle className="text-lg font-bold text-white leading-tight">
                                {activeGuest.allComplete ? `All Stages Complete — ${activeGuest.name}` : `Stage ${activeStage.no}: ${activeStage.name}`}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-white/90 mt-1.5 font-medium">
                                {activeStage.no === 3
                                    ? "The doctor consults with the guest, confirms the recommended next visit date and treatment plan, and updates the next visit details in the CRM."
                                    : <>Responsible: {activeStage.resp} &nbsp;·&nbsp; Trigger: {activeStage.trigger}</>}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-6 space-y-4">
                            {/* Progress tracker inside modal */}
                            {/* <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Journey Progress</p>
                                <div className="flex gap-1">
                                    {STAGES.map((s, idx) => {
                                        let cls = "flex-1 h-1.5 rounded-sm transition-colors";
                                        if (idx < activeGuest.currentStage - 1 || activeGuest.allComplete) {
                                            cls += " bg-emerald-500";
                                        } else if (idx === activeGuest.currentStage - 1 && !activeGuest.allComplete) {
                                            cls += " bg-amber-500 animate-pulse";
                                        } else {
                                            cls += " bg-slate-200";
                                        }
                                        return <div key={s.no} className={cls} title={`Stage ${s.no}`} />;
                                    })}
                                </div>
                            </div> */}

                            {/* Guest and Booking details section — plain/muted, read only */}
                            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Booking &amp; Guest Details</h4>
                                    <span className="ml-auto text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Read Only</span>
                                </div>
                                {/* Proportional cols: ID narrow | Name medium | Mobile narrow | Package fills remaining */}
                                <div className="grid gap-3" style={{ gridTemplateColumns: "160px 200px 150px 220px 1fr" }}>
                                    {readonlyFields.map(([label, val]) => (
                                        <div className="space-y-1 min-w-0" key={label}>
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</Label>
                                            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-medium text-slate-500 break-words" title={String(val)}>
                                                {label === "PI Link" && val ? (
                                                    <a
                                                        href={String(val)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
                                                    >
                                                        View PI
                                                    </a>
                                                ) : (
                                                    val || "—"
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Stage Action Forms — highlighted card */}
                            <div className="rounded-xl border-2 border-blue-300 bg-blue-50/60 p-5 space-y-4 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                                    <SlidersHorizontal className="h-4 w-4 text-blue-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">Stage Action</h4>
                                    <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${isStage3Complete || activeGuest.allComplete ? 'text-slate-500 bg-slate-100' : 'text-blue-400 bg-blue-100'}`}>
                                        {isStage3Complete || activeGuest.allComplete ? "Read Only" : "Fill in below"}
                                    </span>
                                </div>
                                {activeGuest && !isAdminRole && isStageLocked(activeGuest, 3) && !isStage3Complete && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                        <Clock className="h-4 w-4 shrink-0" />
                                        This stage unlocks on {formatISTDate(getStagePlannedDate(activeGuest, 3))}. Fields are read-only until then.
                                    </div>
                                )}
                                {isStage3Complete && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-3 py-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        Stage 3 (Next Visit Plan) is complete. Showing saved data in read-only mode.
                                    </div>
                                )}
                                <div className="flex gap-4 items-start">
                                    {/* Date — fixed narrow width so it doesn't stretch */}
                                    <div className="space-y-2 w-48 shrink-0">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            {activeStage.dateLabel} <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            type="date"
                                            value={modalDate}
                                            disabled={(!isAdminRole && isStageLocked(activeGuest, 3)) || isStage3Complete || activeGuest.allComplete}
                                            onChange={(e) => { setModalDate(e.target.value); setModalSaved(false); }}
                                            className="h-10 border-blue-200 focus:border-blue-500 bg-white w-full"
                                        />
                                    </div>
                                    {/* Remarks — takes remaining width */}
                                    <div className="space-y-2 flex-1">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            {activeStage.remarkLabel} <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            value={modalRemark}
                                            disabled={(!isAdminRole && isStageLocked(activeGuest, 3)) || isStage3Complete || activeGuest.allComplete}
                                            onChange={(e) => { setModalRemark(e.target.value); setModalSaved(false); }}
                                            placeholder="Add remarks for this stage..."
                                            className="min-h-[80px] border-blue-200 focus:border-blue-500 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2 sticky bottom-0">
                            <Button variant="outline" size="sm" onClick={closeModal} disabled={modalSaved} className="w-28 bg-white border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
                                Cancel
                            </Button>
                            {!isStage3Complete && !activeGuest.allComplete && (
                                <Button
                                    size="sm"
                                    onClick={saveModal}
                                    disabled={(!isAdminRole && isStageLocked(activeGuest, 3)) || isStage3Complete || activeGuest.allComplete || !isModalFormComplete() || modalSaved}
                                    className="min-w-[112px] bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                >
                                    {modalSaved ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save"
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            {/* CALL AFTER LANDING DIALOG */}
            <Dialog open={activeSafeReturnGuestId !== null} onOpenChange={(open) => !open && closeSafeReturnModal()}>
                {activeSafeReturnGuest && (
                    <DialogContent style={{ width: "min(98vw, 1100px)", maxWidth: "min(98vw, 1100px)", maxHeight: "90vh" }} className="p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl flex flex-col">
                        <DialogHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 text-white shrink-0">
                            <DialogTitle className="text-lg font-bold text-white leading-tight">
                                Safe Return Confirmation
                            </DialogTitle>
                            <DialogDescription className="text-xs text-white/90 mt-1.5 font-medium">
                                GRE contacts the guest after departure to ensure they had a safe and comfortable journey back home and address any immediate concerns.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                            {/* Prefilled / read-only details — plain, muted, no emphasis */}
                            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Guest &amp; Booking Details</h4>
                                    <span className="ml-auto text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Read Only</span>
                                </div>
                                {/* Proportional cols: ID narrow | Name medium | Mobile narrow | Package fills remaining */}
                                <div className="grid gap-3" style={{ gridTemplateColumns: "160px 200px 150px 220px 1fr" }}>
                                    {[
                                        ["Booking ID", activeSafeReturnGuest.bookingId],
                                        ["Name of Client", activeSafeReturnGuest.name],
                                        ["Mobile", activeSafeReturnGuest.mobile],
                                        ["PI Link", activeSafeReturnGuest.piLink],
                                        ["Programme / Package", activeSafeReturnGuest.programme],
                                    ].map(([label, val]) => (
                                        <div className="space-y-1 min-w-0" key={label}>
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</Label>
                                            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-medium text-slate-500 break-words" title={String(val)}>
                                                {label === "PI Link" && val ? (
                                                    <a
                                                        href={String(val)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
                                                    >
                                                        View PI
                                                    </a>
                                                ) : (
                                                    val || "—"
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Editable safe-return details — highlighted card, emerald border, light bg */}
                            <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 p-5 space-y-4 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-emerald-200">
                                    <RotateCcw className="h-4 w-4 text-emerald-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600">Safe Return Call Details</h4>
                                    <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${isStage6Complete ? 'text-slate-500 bg-slate-100' :
                                            isStage6Processing ? 'text-amber-700 bg-amber-100' :
                                                'text-emerald-400 bg-emerald-100'
                                        }`}>
                                        {isStage6Complete ? "Read Only" : isStage6Processing ? "Processing" : "Fill in below"}
                                    </span>
                                </div>
                                {activeSafeReturnGuest && !isAdminRole && isStageLocked(activeSafeReturnGuest, 6) && !isStage6Complete && !isStage6Processing && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                        <Clock className="h-4 w-4 shrink-0" />
                                        This stage unlocks on {formatISTDate(getStagePlannedDate(activeSafeReturnGuest, 6))}. Fields are read-only until then.
                                    </div>
                                )}
                                {isStage6Processing && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
                                        <svg className="h-4 w-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                                        Processing — your submission is being verified. This stage will be marked complete once confirmed.
                                    </div>
                                )}
                                {isStage6Complete && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-3 py-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        Stage 6 (Safe Return) is complete. Showing saved data in read-only mode.
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Row 1: How was your stay (full width) */}
                                    <div className="space-y-2 md:col-span-3">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            How was your stay? Any feedback or suggestions to improve your experience? <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            disabled={isSafeReturnDisabled}
                                            value={safeReturnStayFeedback}
                                            onChange={(e) => { setSafeReturnStayFeedback(e.target.value); setSafeReturnSaved(false); }}
                                            placeholder="Guest's feedback / suggestions..."
                                            className="min-h-[70px] border-emerald-200 focus:border-emerald-500 bg-white"
                                        />
                                    </div>

                                    {/* Row 2: Outcome Remarks (full width) */}
                                    <div className="space-y-2 md:col-span-3">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            Outcome Remarks <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            disabled={isSafeReturnDisabled}
                                            value={safeReturnOutcomeRemarks}
                                            onChange={(e) => { setSafeReturnOutcomeRemarks(e.target.value); setSafeReturnSaved(false); }}
                                            placeholder="Remarks on the safe return call outcome..."
                                            className="min-h-[70px] border-emerald-200 focus:border-emerald-500 bg-white"
                                        />
                                    </div>

                                    {/* Row 3: Status | (conditional) Remarks Why Not Done or Close | (conditional) Follow-up Date */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            Status <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            disabled={isSafeReturnDisabled}
                                            value={safeReturnStatus}
                                            onValueChange={(val) => {
                                                setSafeReturnStatus(val as CallStatus);
                                                setSafeReturnSaved(false);
                                            }}
                                        >
                                            <SelectTrigger className="h-10 border-emerald-200 focus:border-emerald-500 bg-white text-slate-800">
                                                <SelectValue placeholder="Select Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Done">Done</SelectItem>
                                                <SelectItem value="Not Done - Close">Not Done - Close</SelectItem>
                                                <SelectItem value="Close Follow-up">Close Follow-up</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {safeReturnStatus === "Not Done - Close" && (
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                Remarks Why Not Done or Close <span className="text-red-500">*</span>
                                            </Label>
                                            <Textarea
                                                disabled={isSafeReturnDisabled}
                                                value={safeReturnNotDoneRemarks}
                                                onChange={(e) => { setSafeReturnNotDoneRemarks(e.target.value); setSafeReturnSaved(false); }}
                                                placeholder="Reason the safe return call wasn't done / was closed..."
                                                className="min-h-[42px] border-emerald-200 focus:border-emerald-500 bg-white"
                                            />
                                        </div>
                                    )}

                                    {safeReturnStatus === "Close Follow-up" && (
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                Followup Date for the Safe Return Call <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                type="date"
                                                disabled={isSafeReturnDisabled}
                                                value={safeReturnFollowupDate}
                                                onChange={(e) => { setSafeReturnFollowupDate(e.target.value); setSafeReturnSaved(false); }}
                                                className="h-10 border-emerald-200 focus:border-emerald-500 bg-white"
                                            />
                                        </div>
                                    )}

                                    {/* Row 4: Did they achieve the outcomes planned for */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            Did they achieve the outcomes planned for? <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            disabled={isSafeReturnDisabled}
                                            value={safeReturnOutcomeAchieved}
                                            onValueChange={(val) => {
                                                setSafeReturnOutcomeAchieved(val as YesNo);
                                                setSafeReturnSaved(false);
                                            }}
                                        >
                                            <SelectTrigger className="h-10 border-emerald-200 focus:border-emerald-500 bg-white text-slate-800">
                                                <SelectValue placeholder="Yes / No" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Yes">Yes</SelectItem>
                                                <SelectItem value="No">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {safeReturnFormError && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        {safeReturnFormError}
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2 sticky bottom-0 z-10">
                            <Button variant="outline" size="sm" onClick={closeSafeReturnModal} disabled={safeReturnSaved} className="w-28 bg-white border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
                                Close
                            </Button>
                            {!isStage6Complete && !isStage6Processing && (
                                <Button
                                    size="sm"
                                    onClick={saveSafeReturnModal}
                                    disabled={isSafeReturnDisabled || !isSafeReturnFormComplete() || safeReturnSaved}
                                    className="min-w-[112px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                >
                                    {safeReturnSaved ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save"
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            {/* ONLINE RATING & REVIEW REQUEST DIALOG (Stage 5) */}
            <Dialog open={activeRatingGuestId !== null} onOpenChange={(open) => !open && closeRatingModal()}>
                {activeRatingGuest && (
                    <DialogContent style={{ width: "min(98vw, 1100px)", maxWidth: "min(98vw, 1100px)", maxHeight: "90vh" }} className="p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl flex flex-col">
                        <DialogHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 text-white shrink-0">
                            <DialogTitle className="text-lg font-bold text-white leading-tight">
                                Online Rating &amp; Review Request
                            </DialogTitle>
                            <DialogDescription className="text-xs text-white/90 mt-1.5 font-medium">
                                Assist guests in submitting ratings and reviews on TripAdvisor, Google, and Booking.com using the reception hotspot.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                            {/* Prefilled / read-only details — plain, muted, no emphasis */}
                            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Guest &amp; Booking Details</h4>
                                    <span className="ml-auto text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Read Only</span>
                                </div>
                                {/* Proportional cols: ID narrow | Name medium | Mobile narrow | Package fills remaining */}
                                <div className="grid gap-3" style={{ gridTemplateColumns: "160px 200px 150px 220px 1fr" }}>
                                    {[
                                        ["Booking ID", activeRatingGuest.bookingId],
                                        ["Name of Client", activeRatingGuest.name],
                                        ["Mobile", activeRatingGuest.mobile],
                                        ["PI Link", activeRatingGuest.piLink],
                                        ["Programme / Package", activeRatingGuest.programme],
                                    ].map(([label, val]) => (
                                        <div className="space-y-1 min-w-0" key={label}>
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</Label>
                                            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-medium text-slate-500 break-words" title={String(val)}>
                                                {label === "PI Link" && val ? (
                                                    <a
                                                        href={String(val)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
                                                    >
                                                        View PI
                                                    </a>
                                                ) : (
                                                    val || "—"
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Editable rating-request details — highlighted card, orange border, light bg */}
                            <div className="rounded-xl border-2 border-orange-300 bg-orange-50/60 p-5 space-y-4 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-orange-200">
                                    <Send className="h-4 w-4 text-orange-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600">Rating &amp; Review Details</h4>
                                    <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${isStage5Complete ? 'text-slate-500 bg-slate-100' :
                                            isStage5Processing ? 'text-amber-700 bg-amber-100' :
                                                'text-orange-400 bg-orange-100'
                                        }`}>
                                        {isStage5Complete ? "Read Only" : isStage5Processing ? "Processing" : "Fill in below"}
                                    </span>
                                </div>
                                {activeRatingGuest && !isAdminRole && isStageLocked(activeRatingGuest, 5) && !isStage5Complete && !isStage5Processing && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                        <Clock className="h-4 w-4 shrink-0" />
                                        This stage unlocks on {formatISTDate(getStagePlannedDate(activeRatingGuest, 5))}. Fields are read-only until then.
                                    </div>
                                )}
                                {isStage5Processing && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
                                        <svg className="h-4 w-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                                        Processing — your submission is being verified. This stage will be marked complete once confirmed.
                                    </div>
                                )}
                                {isStage5Complete && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-3 py-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        Stage 5 (Rating Request) is complete. Showing saved data in read-only mode.
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Row 1: Rating Status | (conditional) Remarks Why Not Given | Proof of Ratings */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            Rating Status <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            disabled={isRatingDisabled}
                                            value={ratingStatus}
                                            onValueChange={(val) => {
                                                setRatingStatus(val as RatingStatus);
                                                setRatingSaved(false);
                                            }}
                                        >
                                            <SelectTrigger className="h-10 border-orange-200 focus:border-orange-500 bg-white text-slate-800">
                                                <SelectValue placeholder="Select Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Given">Given</SelectItem>
                                                <SelectItem value="Not Given">Not Given</SelectItem>
                                                <SelectItem value="Requested">Requested</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {ratingStatus !== "" && ratingStatus !== "Given" && (
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                Remarks Why Not Given Ratings <span className="text-red-500">*</span>
                                            </Label>
                                            <Textarea
                                                disabled={isRatingDisabled}
                                                value={ratingNotGivenRemarks}
                                                onChange={(e) => { setRatingNotGivenRemarks(e.target.value); setRatingSaved(false); }}
                                                placeholder="Reason the guest hasn't given a rating yet..."
                                                className="min-h-[42px] border-orange-200 focus:border-orange-500 bg-white"
                                            />
                                        </div>
                                    )}

                                    {ratingStatus === "Given" && (
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                Proof Of Ratings <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                type="file"
                                                accept="image/*,.pdf"
                                                disabled={isRatingDisabled}
                                                onChange={(e) => {
                                                    setRatingProofFile(e.target.files?.[0] || null);
                                                    setRatingSaved(false);
                                                }}
                                                className="h-10 border-orange-200 focus:border-orange-500 bg-white file:text-orange-700 file:font-semibold"
                                            />
                                            {(ratingProofFile || ratingExistingProofFileName) && (
                                                <p className="text-[11px] font-medium text-slate-500 truncate">
                                                    Selected: {ratingProofFile ? ratingProofFile.name : ratingExistingProofFileName}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Row 2: Outcome Remarks (full width) */}
                                    <div className="space-y-2 md:col-span-3">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            Outcome Remarks <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            disabled={isRatingDisabled}
                                            value={ratingOutcomeRemarks}
                                            onChange={(e) => { setRatingOutcomeRemarks(e.target.value); setRatingSaved(false); }}
                                            placeholder="Remarks on the rating request outcome..."
                                            className="min-h-[70px] border-orange-200 focus:border-orange-500 bg-white"
                                        />
                                    </div>

                                    {/* Row 3: Status | (conditional) Remarks Why Not Done or Close | (conditional) Follow-up Date */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            Status <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            disabled={isRatingDisabled}
                                            value={ratingCallStatus}
                                            onValueChange={(val) => {
                                                setRatingCallStatus(val as CallStatus);
                                                setRatingSaved(false);
                                            }}
                                        >
                                            <SelectTrigger className="h-10 border-orange-200 focus:border-orange-500 bg-white text-slate-800">
                                                <SelectValue placeholder="Select Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Done">Done</SelectItem>
                                                <SelectItem value="Not Done - Close">Not Done - Close</SelectItem>
                                                <SelectItem value="Close Follow-up">Close Follow-up</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {ratingCallStatus === "Not Done - Close" && (
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                Remarks Why Not Done or Close <span className="text-red-500">*</span>
                                            </Label>
                                            <Textarea
                                                disabled={isRatingDisabled}
                                                value={ratingNotDoneRemarks}
                                                onChange={(e) => { setRatingNotDoneRemarks(e.target.value); setRatingSaved(false); }}
                                                placeholder="Reason the rating request wasn't done / was closed..."
                                                className="min-h-[42px] border-orange-200 focus:border-orange-500 bg-white"
                                            />
                                        </div>
                                    )}

                                    {ratingCallStatus === "Close Follow-up" && (
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                Followup Date for the Rating <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                type="date"
                                                disabled={isRatingDisabled}
                                                value={ratingFollowupDate}
                                                onChange={(e) => { setRatingFollowupDate(e.target.value); setRatingSaved(false); }}
                                                className="h-10 border-orange-200 focus:border-orange-500 bg-white"
                                            />
                                        </div>
                                    )}

                                    {/* Row 4: Did they achieve the outcomes planned for */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            Did they achieve the outcomes planned for? <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            disabled={isRatingDisabled}
                                            value={ratingOutcomeAchieved}
                                            onValueChange={(val) => {
                                                setRatingOutcomeAchieved(val as YesNo);
                                                setRatingSaved(false);
                                            }}
                                        >
                                            <SelectTrigger className="h-10 border-orange-200 focus:border-orange-500 bg-white text-slate-800">
                                                <SelectValue placeholder="Yes / No" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Yes">Yes</SelectItem>
                                                <SelectItem value="No">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {ratingFormError && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        {ratingFormError}
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2 sticky bottom-0 z-10">
                            <Button variant="outline" size="sm" onClick={closeRatingModal} disabled={ratingSaved} className="w-28 bg-white border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
                                Close
                            </Button>
                            {!isStage5Complete && !isStage5Processing && (
                                <Button
                                    size="sm"
                                    onClick={saveRatingModal}
                                    disabled={isRatingDisabled || !isRatingFormComplete() || ratingSaved}
                                    className="min-w-[112px] bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                >
                                    {ratingSaved ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save"
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            {/* GUEST FEEDBACK & OUTCOME CONFIRMATION DIALOG (Stage 4) */}
            <Dialog open={activeFeedbackGuestId !== null} onOpenChange={(open) => !open && closeFeedbackModal()}>
                {activeFeedbackGuest && (
                    <DialogContent style={{ width: "min(98vw, 1100px)", maxWidth: "min(98vw, 1100px)", maxHeight: "90vh" }} className="p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl flex flex-col">
                        <DialogHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 text-white shrink-0">
                            <DialogTitle className="text-lg font-bold text-white leading-tight">
                                Guest Feedback &amp; Outcome Confirmation
                            </DialogTitle>
                            <DialogDescription className="text-xs text-white/90 mt-1.5 font-medium">
                                GRE collects video, audio, and text feedback from every guest, uploads it in the HTML form, collects feedback and suggestions, and confirms whether the desired treatment outcome was achieved.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                            {/* Prefilled / read-only details — plain, muted, no emphasis */}
                            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Booking &amp; Guest Details</h4>
                                    <span className="ml-auto text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Read Only</span>
                                </div>
                                {/* Proportional cols: ID narrow | Name medium | Mobile narrow | Package fills remaining */}
                                <div className="grid gap-3" style={{ gridTemplateColumns: "160px 200px 150px 220px 1fr" }}>
                                    {[
                                        ["Booking ID", activeFeedbackGuest.bookingId],
                                        ["Name of Client", activeFeedbackGuest.name],
                                        ["Mobile", activeFeedbackGuest.mobile],
                                        ["PI Link", activeFeedbackGuest.piLink],
                                        ["Programme / Package", activeFeedbackGuest.programme],
                                    ].map(([label, val]) => (
                                        <div className="space-y-1 min-w-0" key={label}>
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</Label>
                                            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-medium text-slate-500 break-words" title={String(val)}>
                                                {label === "PI Link" && val ? (
                                                    <a
                                                        href={String(val)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
                                                    >
                                                        View PI
                                                    </a>
                                                ) : (
                                                    val || "—"
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback details card — non-edited if data exists, editable if pending */}
                            {(() => {
                                const hasData = Boolean(isStage4Complete || (feedbackDoerRemarks && feedbackDoerRemarks.trim() !== ""));
                                return (
                                    <div className="rounded-xl border-2 border-amber-300 bg-amber-50/60 p-5 space-y-4 shadow-sm">
                                        <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
                                            <Star className="h-4 w-4 text-amber-500" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Feedback &amp; Outcome Details</h4>
                                            <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${hasData ? 'text-slate-500 bg-slate-100' : 'text-amber-600 bg-amber-100'}`}>
                                                {hasData ? "Read Only" : "Fill in below"}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {/* Row 1: Feedback Taking URL — only shown when pending / no data */}
                                            {!hasData && (
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                        Feedback Taking URL
                                                    </Label>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <a
                                                            href={buildFeedbackFormUrl(activeFeedbackGuest.bookingId)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md px-3 py-2 shadow-sm transition-colors"
                                                        >
                                                            <Send className="h-3.5 w-3.5" />
                                                            Open Feedback Form for {activeFeedbackGuest.bookingId}
                                                        </a>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 break-all">
                                                        {buildFeedbackFormUrl(activeFeedbackGuest.bookingId)}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Row 2: Doer Remarks — non-edited box if data exists, editable textarea if empty */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                    Doer Remarks {!hasData && <span className="text-red-500">*</span>}
                                                </Label>
                                                {hasData ? (
                                                    <div className="bg-white border border-amber-200 rounded-md p-3.5 text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[60px]">
                                                        {feedbackDoerRemarks || "No remarks entered"}
                                                    </div>
                                                ) : (
                                                    <Textarea
                                                        value={feedbackDoerRemarks}
                                                        disabled={!activeFeedbackGuest || (!isAdminRole && isStageLocked(activeFeedbackGuest, 4)) || isStage4Complete}
                                                        onChange={(e) => { setFeedbackDoerRemarks(e.target.value); setFeedbackSaved(false); }}
                                                        placeholder="Remarks from the doer regarding the feedback / outcome..."
                                                        className="min-h-[90px] border-amber-200 focus:border-amber-500 bg-white"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        {feedbackFormError && (
                                            <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                                {feedbackFormError}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2 sticky bottom-0 z-10">
                            <Button variant="outline" size="sm" onClick={closeFeedbackModal} disabled={feedbackSaved} className="w-28 bg-white border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
                                Close
                            </Button>
                            {!isStage4Complete && !feedbackDoerRemarks.trim() && (
                                <Button
                                    size="sm"
                                    onClick={saveFeedbackModal}
                                    disabled={!activeFeedbackGuest || (!isAdminRole && (isStageLocked(activeFeedbackGuest, 4) || isStage4Complete)) || !isFeedbackFormComplete() || feedbackSaved}
                                    className="min-w-[112px] bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                >
                                    {feedbackSaved ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save"
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            {/* REFERRAL COLLECTION & LEAD GENERATION DIALOG (Stage 8) */}
            <Dialog open={activeReferralGuestId !== null} onOpenChange={(open) => !open && closeReferralModal()}>
                {activeReferralGuest && (
                    <DialogContent style={{ width: "min(98vw, 1100px)", maxWidth: "min(98vw, 1100px)", maxHeight: "90vh" }} className="p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl flex flex-col">
                        <DialogHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 text-white shrink-0">
                            <DialogTitle className="text-lg font-bold text-white leading-tight">
                                Referral Collection &amp; Lead Generation
                            </DialogTitle>
                            <DialogDescription className="text-xs text-white/90 mt-1.5 font-medium">
                                GRE contacts the guest and requests referral details, collects the referred person's information, and uploads the details into the CRM for future follow-up and lead generation.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                            {/* Prefilled / read-only details — plain, muted, no emphasis */}
                            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Guest &amp; Booking Details</h4>
                                    <span className="ml-auto text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Read Only</span>
                                </div>
                                {/* Proportional cols: ID narrow | Name medium | Mobile narrow | Package fills remaining */}
                                <div className="grid gap-3" style={{ gridTemplateColumns: "160px 200px 150px 220px 1fr" }}>
                                    {[
                                        ["Booking ID", activeReferralGuest.bookingId],
                                        ["Name of Client", activeReferralGuest.name],
                                        ["Mobile", activeReferralGuest.mobile],
                                        ["PI Link", activeReferralGuest.piLink],
                                        ["Programme / Package", activeReferralGuest.programme],
                                    ].map(([label, val]) => (
                                        <div className="space-y-1 min-w-0" key={label}>
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</Label>
                                            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-medium text-slate-500 break-words" title={String(val)}>
                                                {label === "PI Link" && val ? (
                                                    <a
                                                        href={String(val)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
                                                    >
                                                        View PI
                                                    </a>
                                                ) : (
                                                    val || "—"
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Referral details card — non-edited if data exists, editable if pending */}
                            {(() => {
                                const hasData = Boolean(isStage8Complete || (referralDoerRemarks && referralDoerRemarks.trim() !== "") || (referralTakenStatus && referralTakenStatus.trim() !== ""));
                                return (
                                    <div className="rounded-xl border-2 border-green-300 bg-green-50/60 p-5 space-y-4 shadow-sm">
                                        <div className="flex items-center gap-2 pb-2 border-b border-green-200">
                                            <Users className="h-4 w-4 text-green-500" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-green-600">Referral Collection Details</h4>
                                            <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${hasData ? 'text-slate-500 bg-slate-100' : 'text-green-600 bg-green-100'}`}>
                                                {hasData ? "Read Only" : "Fill in below"}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {/* Row 1: Referral Taking URL — hidden once data exists */}
                                            {!hasData && (
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                        Referral Taking URL
                                                    </Label>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <a
                                                            href={buildReferralFormUrl(activeReferralGuest.bookingId)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md px-3 py-2 shadow-sm transition-colors"
                                                        >
                                                            <Send className="h-3.5 w-3.5" />
                                                            Open Referral Form for {activeReferralGuest.bookingId}
                                                        </a>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 break-all">
                                                        {buildReferralFormUrl(activeReferralGuest.bookingId)}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Row 2: Referral Taken Status */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                    Referral Taken Status {!hasData && <span className="text-red-500">*</span>}
                                                </Label>
                                                {hasData ? (
                                                    <div className="bg-white border border-green-200 rounded-md p-3 text-xs font-medium text-slate-700">
                                                        {referralTakenStatus || "Not Taken"}
                                                    </div>
                                                ) : (
                                                    <Input
                                                        value={referralTakenStatus}
                                                        disabled={!activeReferralGuest || (!isAdminRole && isStageLocked(activeReferralGuest, 8)) || isStage8Complete}
                                                        onChange={(e) => { setReferralTakenStatus(e.target.value); setReferralSaved(false); }}
                                                        placeholder="e.g. Referral given, Follow-up needed, Declined..."
                                                        className="h-10 border-green-200 focus:border-green-500 bg-white"
                                                    />
                                                )}
                                            </div>

                                            {/* Row 3: Doer Remarks */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                    Doer Remarks {!hasData && <span className="text-red-500">*</span>}
                                                </Label>
                                                {hasData ? (
                                                    <div className="bg-white border border-green-200 rounded-md p-3.5 text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[60px]">
                                                        {referralDoerRemarks || "No remarks entered"}
                                                    </div>
                                                ) : (
                                                    <Textarea
                                                        value={referralDoerRemarks}
                                                        disabled={!activeReferralGuest || (!isAdminRole && isStageLocked(activeReferralGuest, 8)) || isStage8Complete}
                                                        onChange={(e) => { setReferralDoerRemarks(e.target.value); setReferralSaved(false); }}
                                                        placeholder="Remarks from the doer regarding the referral collection..."
                                                        className="min-h-[90px] border-green-200 focus:border-green-500 bg-white"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        {referralFormError && (
                                            <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                                {referralFormError}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2 sticky bottom-0 z-10">
                            <Button variant="outline" size="sm" onClick={closeReferralModal} disabled={referralSaved} className="w-28 bg-white border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
                                Close
                            </Button>
                            {!isStage8Complete && !referralDoerRemarks.trim() && !referralTakenStatus.trim() && (
                                <Button
                                    size="sm"
                                    onClick={saveReferralModal}
                                    disabled={!activeReferralGuest || (!isAdminRole && (isStageLocked(activeReferralGuest, 8) || isStage8Complete)) || !isReferralFormComplete() || referralSaved}
                                    className="min-w-[112px] bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                >
                                    {referralSaved ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save"
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            <Dialog open={activeWelcomeGuestId !== null} onOpenChange={(open) => !open && closeWelcomeModal()}>
                {activeWelcomeGuest && (() => {
                    // (isStage1Complete / isStage1Processing are the top-level to_show-driven flags).
                    const isWelcomeDisabled = !activeWelcomeGuest || (!isAdminRole && isStageLocked(activeWelcomeGuest, 1)) || isStage1Complete || isStage1Processing;
                    return (
                        <DialogContent style={{ width: "min(98vw, 1100px)", maxWidth: "min(98vw, 1100px)", maxHeight: "90vh" }} className="p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl flex flex-col">
                            <DialogHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 text-white shrink-0">
                                <DialogTitle className="text-lg font-bold text-white leading-tight">
                                    Arrival Welcome on Pickup
                                </DialogTitle>
                                <DialogDescription className="text-xs text-white/90 mt-1.5 font-medium">
                                    GRE coordinates with the driver and connects with the guest via video or audio call during pickup to confirm a smooth pickup experience, check on the journey, and provide a personalized welcome.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                                {/* Prefilled / read-only details — plain, muted, no emphasis */}
                                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <FileText className="h-4 w-4 text-slate-400" />
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Guest &amp; Booking Details</h4>
                                        <span className="ml-auto text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Read Only</span>
                                    </div>
                                    {/* Proportional cols: ID narrow | Name medium | Mobile narrow | Package fills remaining */}
                                    <div className="grid gap-3" style={{ gridTemplateColumns: "160px 200px 150px 220px 1fr" }}>
                                        {[
                                            ["Booking ID", activeWelcomeGuest.bookingId],
                                            ["Name of Client", activeWelcomeGuest.name],
                                            ["Mobile", activeWelcomeGuest.mobile],
                                            ["PI Link", activeWelcomeGuest.piLink],
                                            ["Programme / Package", activeWelcomeGuest.programme],
                                        ].map(([label, val]) => (
                                            <div className="space-y-1 min-w-0" key={label}>
                                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</Label>
                                                <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-medium text-slate-500 break-words" title={String(val)}>
                                                    {label === "PI Link" && val ? (
                                                        <a
                                                            href={String(val)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
                                                        >
                                                            View PI
                                                        </a>
                                                    ) : (
                                                        val || "—"
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Editable welcome-call details — highlighted card, sky border, light bg */}
                                <div className="rounded-xl border-2 border-sky-300 bg-sky-50/60 p-5 space-y-4 shadow-sm">
                                    <div className="flex items-center gap-2 pb-2 border-b border-sky-200">
                                        <Home className="h-4 w-4 text-sky-500" />
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-sky-600">Welcome Call Details</h4>
                                        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${isWelcomeDisabled ? 'text-slate-500 bg-slate-100' : 'text-sky-400 bg-sky-100'}`}>
                                            {isWelcomeDisabled ? "Read Only" : "Fill in below"}
                                        </span>
                                    </div>
                                    {activeWelcomeGuest && !isAdminRole && isStageLocked(activeWelcomeGuest, 1) && !isStage1Complete && !isStage1Processing && (
                                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                            <Clock className="h-4 w-4 shrink-0" />
                                            This stage unlocks on {formatISTDate(getStagePlannedDate(activeWelcomeGuest, 1))}. Fields are read-only until then.
                                        </div>
                                    )}
                                    {isStage1Processing && (
                                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
                                            <svg className="h-4 w-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                                            Processing — your submission is being verified. This stage will be marked complete once confirmed.
                                        </div>
                                    )}
                                    {isStage1Complete && (
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-3 py-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                            Stage 1 is complete. Showing saved data in read-only mode.
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Row 1: Outcome Remarks (full width) */}
                                        <div className="space-y-2 md:col-span-3">
                                            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                Outcome Remarks <span className="text-red-500">*</span>
                                            </Label>
                                            <Textarea
                                                disabled={!activeWelcomeGuest || isWelcomeDisabled}
                                                value={welcomeOutcomeRemarks}
                                                onChange={(e) => { setWelcomeOutcomeRemarks(e.target.value); setWelcomeSaved(false); }}
                                                placeholder="Remarks on the pickup / welcome call outcome..."
                                                className="min-h-[70px] border-sky-200 focus:border-sky-500 bg-white"
                                            />
                                        </div>

                                        {/* Row 2: Status | (conditional) Remarks Why Not Done or Close | (conditional) Follow-up Date */}
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                Status <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                disabled={!activeWelcomeGuest || isWelcomeDisabled}
                                                value={welcomeStatus}
                                                onValueChange={(val) => {
                                                    setWelcomeStatus(val as CallStatus);
                                                    setWelcomeSaved(false);
                                                }}
                                            >
                                                <SelectTrigger className="h-10 border-sky-200 focus:border-sky-500 bg-white text-slate-800">
                                                    <SelectValue placeholder="Select Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Done">Done</SelectItem>
                                                    <SelectItem value="Not Done - Close">Not Done - Close</SelectItem>
                                                    <SelectItem value="Close Follow-up">Close Follow-up</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {welcomeStatus === "Not Done - Close" && (
                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                    Remarks Why Not Done or Close <span className="text-red-500">*</span>
                                                </Label>
                                                <Textarea
                                                    disabled={!activeWelcomeGuest || isWelcomeDisabled}
                                                    value={welcomeNotDoneRemarks}
                                                    onChange={(e) => { setWelcomeNotDoneRemarks(e.target.value); setWelcomeSaved(false); }}
                                                    placeholder="Reason the welcome call wasn't done / was closed..."
                                                    className="min-h-[42px] border-sky-200 focus:border-sky-500 bg-white"
                                                />
                                            </div>
                                        )}

                                        {welcomeStatus === "Close Follow-up" && (
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                    Followup Date for the Welcome Call <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    type="date"
                                                    disabled={!activeWelcomeGuest || isWelcomeDisabled}
                                                    value={welcomeFollowupDate}
                                                    onChange={(e) => { setWelcomeFollowupDate(e.target.value); setWelcomeSaved(false); }}
                                                    className="h-10 border-sky-200 focus:border-sky-500 bg-white"
                                                />
                                            </div>
                                        )}

                                        {/* Row 3: Did they achieve the outcomes planned for */}
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                Did they achieve the outcomes planned for? <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                disabled={!activeWelcomeGuest || isWelcomeDisabled}
                                                value={welcomeOutcomeAchieved}
                                                onValueChange={(val) => {
                                                    setWelcomeOutcomeAchieved(val as YesNo);
                                                    setWelcomeSaved(false);
                                                }}
                                            >
                                                <SelectTrigger className="h-10 border-sky-200 focus:border-sky-500 bg-white text-slate-800">
                                                    <SelectValue placeholder="Yes / No" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Yes">Yes</SelectItem>
                                                    <SelectItem value="No">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {welcomeFormError && (
                                        <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                            {welcomeFormError}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2 sticky bottom-0 z-10">
                                <Button variant="outline" size="sm" onClick={closeWelcomeModal} disabled={welcomeSaved} className="w-28 bg-white border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
                                    Close
                                </Button>
                                {!isStage1Complete && !isStage1Processing && (
                                    <Button
                                        size="sm"
                                        onClick={saveWelcomeModal}
                                        disabled={!activeWelcomeGuest || isWelcomeDisabled || !isWelcomeFormComplete() || welcomeSaved}
                                        className="min-w-[112px] bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                    >
                                        {welcomeSaved ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            "Save"
                                        )}
                                    </Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    );
                })()}
            </Dialog>

            <Dialog open={activeResultProgressGuestId !== null} onOpenChange={(open) => !open && closeResultProgressModal()}>
                {activeResultProgressGuest && (
                    <DialogContent style={{ width: "min(98vw, 1100px)", maxWidth: "min(98vw, 1100px)", maxHeight: "90vh" }} className="p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl flex flex-col">
                        <DialogHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 text-white shrink-0">
                            <DialogTitle className="text-lg font-bold text-white leading-tight">
                                Result Tracking &amp; Health Progress Check
                            </DialogTitle>
                            <DialogDescription className="text-xs text-white/90 mt-1.5 font-medium">
                                The doctor contacts the guest to review their health condition, treatment progress, and overall well-being after returning home and records the outcome and recommendations in the CRM.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                            {/* Prefilled / read-only details — plain, muted, no emphasis */}
                            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Guest &amp; Booking Details</h4>
                                    <span className="ml-auto text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Read Only</span>
                                </div>
                                <div className="grid gap-3" style={{ gridTemplateColumns: "160px 200px 150px 220px 1fr" }}>
                                    {[
                                        ["Booking ID", activeResultProgressGuest.bookingId],
                                        ["Name of Client", activeResultProgressGuest.name],
                                        ["Mobile", activeResultProgressGuest.mobile],
                                        ["PI Link", activeResultProgressGuest.piLink],
                                        ["Programme / Package", activeResultProgressGuest.programme],
                                    ].map(([label, val]) => (
                                        <div className="space-y-1 min-w-0" key={label}>
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</Label>
                                            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-medium text-slate-500 break-words" title={String(val)}>
                                                {label === "PI Link" && val ? (
                                                    <a
                                                        href={String(val)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
                                                    >
                                                        View PI
                                                    </a>
                                                ) : (
                                                    val || "—"
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Editable result / progress details — highlighted card, purple border, light bg */}
                            <div className="rounded-xl border-2 border-purple-300 bg-purple-50/60 p-5 space-y-4 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-purple-200">
                                    <TrendingUp className="h-4 w-4 text-purple-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600">Result &amp; Health Progress Details</h4>
                                    <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${isStage7Complete ? 'text-slate-500 bg-slate-100' :
                                            isStage7Processing ? 'text-amber-700 bg-amber-100' :
                                                'text-purple-400 bg-purple-100'
                                        }`}>
                                        {isStage7Complete ? "Read Only" : isStage7Processing ? "Processing" : "Fill in below"}
                                    </span>
                                </div>
                                {activeResultProgressGuest && !isAdminRole && isStageLocked(activeResultProgressGuest, 7) && !isStage7Complete && !isStage7Processing && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                        <Clock className="h-4 w-4 shrink-0" />
                                        This stage unlocks on {formatISTDate(getStagePlannedDate(activeResultProgressGuest, 7))}. Fields are read-only until then.
                                    </div>
                                )}
                                {isStage7Processing && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
                                        <svg className="h-4 w-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                                        Processing — your submission is being verified. This stage will be marked complete once confirmed.
                                    </div>
                                )}
                                {isStage7Complete && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-3 py-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        Stage 7 (Result & Progress) is complete. Showing saved data in read-only mode.
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Row 1: Outcome Remarks (full width) */}
                                    <div className="space-y-2 md:col-span-3">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            Outcome Remarks <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            disabled={isResultDisabled}
                                            value={resultOutcomeRemarks}
                                            onChange={(e) => { setResultOutcomeRemarks(e.target.value); setResultSaved(false); }}
                                            placeholder="Remarks on the result / health progress outcome..."
                                            className="min-h-[70px] border-purple-200 focus:border-purple-500 bg-white"
                                        />
                                    </div>

                                    {/* Row 2: Status | (conditional) Remarks Why Not Done or Close | (conditional) Follow-up Date */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            Status <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            disabled={isResultDisabled}
                                            value={resultStatus}
                                            onValueChange={(val) => {
                                                setResultStatus(val as CallStatus);
                                                setResultSaved(false);
                                            }}
                                        >
                                            <SelectTrigger className="h-10 border-purple-200 focus:border-purple-500 bg-white text-slate-800">
                                                <SelectValue placeholder="Select Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Done">Done</SelectItem>
                                                <SelectItem value="Not Done - Close">Not Done - Close</SelectItem>
                                                <SelectItem value="Close Follow-up">Close Follow-up</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {resultStatus === "Not Done - Close" && (
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                Remarks Why Not Done or Close <span className="text-red-500">*</span>
                                            </Label>
                                            <Textarea
                                                disabled={isResultDisabled}
                                                value={resultNotDoneRemarks}
                                                onChange={(e) => { setResultNotDoneRemarks(e.target.value); setResultSaved(false); }}
                                                placeholder="Reason the result / progress check wasn't done / was closed..."
                                                className="min-h-[42px] border-purple-200 focus:border-purple-500 bg-white"
                                            />
                                        </div>
                                    )}

                                    {resultStatus === "Close Follow-up" && (
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                Followup Date for Result Tracking &amp; Health Progress <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                type="date"
                                                disabled={isResultDisabled}
                                                value={resultFollowupDate}
                                                onChange={(e) => { setResultFollowupDate(e.target.value); setResultSaved(false); }}
                                                className="h-10 border-purple-200 focus:border-purple-500 bg-white"
                                            />
                                        </div>
                                    )}

                                    {/* Row 3: Did they achieve the outcomes planned for */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            Did they achieve the outcomes planned for? <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            disabled={isResultDisabled}
                                            value={resultOutcomeAchieved}
                                            onValueChange={(val) => {
                                                setResultOutcomeAchieved(val as YesNo);
                                                setResultSaved(false);
                                            }}
                                        >
                                            <SelectTrigger className="h-10 border-purple-200 focus:border-purple-500 bg-white text-slate-800">
                                                <SelectValue placeholder="Yes / No" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Yes">Yes</SelectItem>
                                                <SelectItem value="No">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {resultFormError && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        {resultFormError}
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2 sticky bottom-0 z-10">
                            <Button variant="outline" size="sm" onClick={closeResultProgressModal} disabled={resultSaved} className="w-28 bg-white border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
                                Close
                            </Button>
                            {!isStage7Complete && !isStage7Processing && (
                                <Button
                                    size="sm"
                                    onClick={saveResultProgressModal}
                                    disabled={isResultDisabled || !isResultProgressFormComplete() || resultSaved}
                                    className="min-w-[112px] bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                >
                                    {resultSaved ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save"
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            <Dialog open={activeCallGuestId !== null} onOpenChange={(open) => !open && closeCallModal()}>
                {activeCallGuest && (
                    <DialogContent style={{ width: "min(98vw, 1400px)", maxWidth: "min(98vw, 1400px)", maxHeight: "90vh" }} className="p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl flex flex-col">
                        <DialogHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 text-white shrink-0">
                            <DialogTitle className="text-lg font-bold text-white leading-tight">
                                Guest Request &amp; Complaint Management (QR Scan)
                            </DialogTitle>
                            <DialogDescription className="text-xs text-white/90 mt-1.5 font-medium">
                                GRE requests the guest to scan the QR code to submit requests or complaints. If the guest is unable to do so, GRE can upload the request or complaint on the guest's behalf.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                            {/* Prefilled / read-only details — plain, muted, no emphasis */}
                            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Guest &amp; Booking Details</h4>
                                    <span className="ml-auto text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Read Only</span>
                                </div>
                                {/* Proportional cols: ID narrow | Name medium | Mobile narrow | Package fills remaining */}
                                <div className="grid gap-3" style={{ gridTemplateColumns: "160px 200px 150px 220px 1fr" }}>
                                    {[
                                        ["Booking ID", activeCallGuest.bookingId],
                                        ["Name of Client", activeCallGuest.name],
                                        ["Mobile", activeCallGuest.mobile],
                                        ["PI Link", activeCallGuest.piLink],
                                        ["Programme / Package", activeCallGuest.programme],
                                    ].map(([label, val]) => (
                                        <div className="space-y-1 min-w-0" key={label}>
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</Label>
                                            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-medium text-slate-500 break-words" title={String(val)}>
                                                {label === "PI Link" && val ? (
                                                    <a
                                                        href={String(val)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
                                                    >
                                                        View PI
                                                    </a>
                                                ) : (
                                                    val || "—"
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Stage 2 Details from checkinmasterfms */}
                            {activeCallGuest && (() => {
                                const saved = getStageSavedData(activeCallGuest, 2);
                                const planned = getStagePlannedDate(activeCallGuest, 2);
                                const actual = getStageActualDate(activeCallGuest, 2);
                                const doer = getStageDoer(activeCallGuest, 2);
                                return (
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Stage 2 Status &amp; Details</h4>
                                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${isStage2Complete ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                                {isStage2Complete ? "Complete" : "Pending"}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                            <div>
                                                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Responsible Doer</span>
                                                <span className="font-semibold text-slate-800">{doer || "—"}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Planned Date</span>
                                                <span className="font-semibold text-slate-800">{planned || "—"}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Done / Actual Date</span>
                                                <span className="font-semibold text-slate-800">{actual || "—"}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 font-semibold block text-[10px] uppercase">QR Scanned Status</span>
                                                <span className="font-semibold text-slate-800">{String(saved?.qrCodeScannedStatus || "Not Scanned")}</span>
                                            </div>
                                        </div>
                                        {saved?.doerRemarks && (
                                            <div className="pt-2 border-t border-slate-100 text-xs">
                                                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Doer Remarks</span>
                                                <p className="mt-0.5 text-slate-800 font-medium">{String(saved.doerRemarks)}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Editable section — highlighted card, indigo border, light bg (hidden once stage has value / is complete) */}
                            {!isStage2Complete && (
                                <div className="rounded-xl border-2 border-indigo-300 bg-indigo-50/60 p-4 shadow-sm">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-2 shrink-0">
                                            <PhoneCall className="h-4 w-4 text-indigo-500" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600">QR Code</h4>
                                        </div>
                                    </div>

                                    {/* KTAHV QR leaflet — visible when pending */}
                                    <div className="mt-3 pt-3 border-t border-indigo-200 rounded-lg bg-white p-3 space-y-3">
                                        <img
                                            src="/KTAHV%20leaflet%20A$%20landscape_V1.jpg.jpeg"
                                            alt="Kairali — Facing Any Issue? Scan the QR to connect with our AI-powered Patient Services Assistant"
                                            className="w-full max-h-[420px] object-contain rounded-md border border-slate-200"
                                        />
                                        <div className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 leading-relaxed">
                                            <span className="font-bold">Note:</span> If submitting on behalf of a guest, please include{" "}
                                            <span className="font-bold">#RoomNo</span> and <span className="font-bold">#GuestName</span> at the beginning of your message.
                                            <br />
                                            <span className="font-semibold">Example:</span>{" "}
                                            <code className="bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 text-[11px] font-semibold">#RoomNo:-205 #GuestName:-RahulSharma</code>
                                        </div>
                                    </div>

                                    {callFormError && (
                                        <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-3">
                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                            {callFormError}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2 sticky bottom-0 z-10">
                            <Button variant="outline" size="sm" onClick={closeCallModal} disabled={callSaved} className="w-28 bg-white border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
                                Close
                            </Button>
                            {!isStage2Complete && (
                                <Button
                                    size="sm"
                                    onClick={saveCallModal}
                                    disabled={!activeCallGuest || (!isAdminRole && (isStageLocked(activeCallGuest, 2) || isStage2Complete)) || !isCallFormComplete() || callSaved}
                                    className="min-w-[112px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                >
                                    {callSaved ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save"
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            {/* BOOKING & GUEST DETAILS DIALOG — shared by Welcome Call, Return Date & Referral, Result & Progress */}
            <Dialog open={activeDetailsGuestId !== null} onOpenChange={(open) => !open && closeDetailsModal()}>
                {activeDetailsGuest && (
                    <DialogContent style={{ width: "min(98vw, 1100px)", maxWidth: "min(98vw, 1100px)", maxHeight: "90vh" }} className="p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl flex flex-col">
                        <DialogHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 text-white shrink-0">
                            <DialogTitle className="text-lg font-bold text-white leading-tight">
                                {activeDetailsAction} — {activeDetailsGuest.name}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-white/90 mt-1.5 font-medium">
                                Booking ID: {activeDetailsGuest.bookingId}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                            {/* Read-only Booking & Guest Details */}
                            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Booking &amp; Guest Details</h4>
                                    <span className="ml-auto text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Read Only</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {fullDetailsFields.map(([label, val]) => (
                                        <div className="space-y-1 min-w-0" key={label}>
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</Label>
                                            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-medium text-slate-500 break-words" title={String(val)}>
                                                {label === "PI Link" && val ? (
                                                    <a
                                                        href={String(val)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
                                                    >
                                                        View PI
                                                    </a>
                                                ) : (
                                                    val || "—"
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Placeholder for the action-specific form — to be built out next */}
                            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center space-y-1.5">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{activeDetailsAction}</p>
                                <p className="text-xs text-slate-400">This action's form will be added here next.</p>
                            </div>
                        </div>

                        <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2 sticky bottom-0">
                            <Button variant="outline" size="sm" onClick={closeDetailsModal} className="w-28 bg-white border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            {activeDriverArrivalGuest && (
                <DriverAssignmentArrivalModal
                    open={activeDriverArrivalGuestId !== null}
                    guest={activeDriverArrivalGuest}
                    disabled={isDriverArrivalDisabled}
                    onClose={closeDriverArrivalModal}
                    onSubmit={saveDriverArrivalModal}
                />
            )}

            {activeDriverDepartureGuest && (
                <DriverAssignmentDepartureModal
                    open={activeDriverDepartureGuestId !== null}
                    guest={activeDriverDepartureGuest}
                    disabled={isDriverDepartureDisabled}
                    onClose={closeDriverDepartureModal}
                    onSubmit={saveDriverDepartureModal}
                />
            )}

            {activeRequirementVerificationGuest && (
                <GuestRequirementVerificationModal
                    open={activeRequirementVerificationGuestId !== null}
                    guest={activeRequirementVerificationGuest}
                    disabled={isRequirementVerificationDisabled}
                    onClose={closeRequirementVerificationModal}
                    onSubmit={saveRequirementVerificationModal}
                />
            )}

            <CrrStageViewModal
                open={activeViewGuestId !== null}
                guest={activeViewGuest}
                initialStage={activeViewStage}
                onClose={() => setActiveViewGuestId(null)}
            />
        </DashboardLayout>
    );
}
