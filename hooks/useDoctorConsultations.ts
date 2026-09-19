"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { getIDBCache, setIDBCache } from "@/lib/idb"

export interface GasDoctorConsultation {
  "Time Stamp"?: string
  "Date & Time"?: string
  "ID"?: string
  "Name of Client"?: string
  "Mobile"?: string | number
  "Email Id"?: string
  "Subjects"?: string
  "Notes"?: string
  "IVR Url"?: string
  "WebSite Name"?: string
  "Data Source"?: string
  "Assigned Sales Rep"?: string
  "Remarks - History"?: string
  "Data Come From Which Sheet"?: string
  "Consultation ID"?: string
  "Appointment Planned"?: string
  "Appointment Actual"?: string
  "Appointment Time Delay"?: string
  "Appointment Status"?: string
  "Enter Appointment Details"?: string
  "View Doctors Calender Links"?: string
  "Appointment Type"?: string
  "Alignment of Doctors"?: string
  "Country Code"?: string
  "Clients Updated Contact Number"?: string | number
  "Clients Updated Email ID"?: string
  "Scheduled Date"?: string
  "Time"?: string
  "Remarks"?: string
  "Payment Collection "?: string
  "Collection Amount"?: string | number
  "Payment Screenshot"?: string
  "Appointment Blocked in Google Calender"?: string
  "Schedule Date&Time"?: string
  "Meet Link"?: string
  "WhatsApp Update to Doctor and Client on Appointment Scheduled "?: string
  "Email Update  to Doctor and Client on Appointment Scheduled "?: string
  "Client Report Planned"?: string
  "Client Report Actual"?: string
  "Client Report Time Delay"?: string
  "Client Report Submit Status"?: string
  "Upload Clients Reports/Documents - Upload Forms"?: string
  "Clients Dosha Test Form Link"?: string
  "General Health Assessment Form Link"?: string
  "View Uploaded Client Reports Link"?: string
  "View Uploaded Client Reports Remarks"?: string
  "View Clients Dosha Test Report Link"?: string
  "View General Health Assessment Report"?: string
  "WhatsApp Update to Client Report Submited"?: string
  "Email Update to Client Report Submited"?: string
  "WhatsApp /Email Update to Doctor - Report Received"?: string
  "Reminder Planned"?: string
  "Reminder Actual"?: string
  "Reminder Time Delay"?: string
  "Call To Client for Reminder"?: string
  "Call To Doctor for Reminder"?: string
  "WhatasApp to Client for Reminder"?: string
  "Email to Client for Reminder"?: string
  "WhatasApp to Doctor with all Consolidated List"?: string
  "Email to Doctor with all Consolidated List"?: string
  "Post Consultation Planned"?: string
  "Post Consultation Actual"?: string
  "Post Consultation Time Delay"?: string
  "Consultation Done Status"?: string
  "Upload Consultation Photo"?: string
  "Reports Upload -  URL"?: string
  "Audio Or Video Recording URL"?: string
  "Post Consultation Remarks"?: string
  "Final Case Status*"?: string
  "Post Consultation Uploaded By"?: string
  "Post Consultation WhatsApp Update to Client"?: string
  "Post Consultation Email Update to Client"?: string
  "Transfer to User \nPlanned"?: string
  "Transfer to User \nActual"?: string
  "Transfer to User \nTime Delay"?: string
  "Transfer to User  \nStatus"?: string
  "Transfer to User \nStatus"?: string
  "Transfer to User \nRemarks"?: string
  "Transfer to user Sheet Status"?: string
  "Post Consultation WhatsApp Update to Sales Agent"?: string
  "Post Consultation Email Update to Sales Agent"?: string
  [key: string]: any
}

export interface Consultation {
  id: string
  consultationId: string
  enquiryId: string
  patientName: string
  patientId: string
  mobile: string
  email: string
  subjects: string
  notes: string
  ivrUrl: string
  websiteName: string
  dataSource: string
  assignedSalesRep: string
  remarksHistory: string
  dataFromSheet: string
  doctorCalendarLink: string
  appointmentType: string
  appointmentStatus: string
  doctorAlignment: string
  scheduledDateTime: string
  remarks: string
  clientReportLink: string
  submitStatus: string
  clientReportsLink: string
  clientReportsRemarks: string
  doshaTestReportLink: string
  healthAssessmentReportLink: string
  clientReminderStatus: string
  doctorReminderStatus: string
  consultationDoneStatus: string
  reportsUploadUrl: string
  postConsultationRemarks: string
  finalCaseStatus: string
  postConsultationUploadedBy: string
  transferToUserStatus: string
  stage: string
  status: "completed" | "pending" | "overdue" | "upcoming"
  scheduledDate: string
  doer: string
  slaStatus: "on-time" | "at-risk" | "overdue"
  timeRemaining: string
  hasPrescription: boolean
  createdAt: string
  delayHours?: number
  meetLink?: string
  paymentCollection?: string
  collectionAmount?: string
  paymentScreenshot?: string
  calendarEventLink?: string
  sortTimestamp?: number
  rawGasData?: GasDoctorConsultation
}

export interface StageDefinition {
  name: string
  shortName: string
  sla: string
  slaHours: number
}

export interface StageBreakupItem extends StageDefinition {
  count: number
  pendingCount: number
  percentage: number
  progressPercentage: number
  totalDelayHours: number
  avgDelayHours: number
  consultations: (Consultation & { delayHours?: number })[]
}

export interface DoctorConsultationStats {
  total: number
  completed: number
  pending: number
  converted: number
  revenue: number
  prescriptions: number
  conversionRate: number
}

export const STAGES: StageDefinition[] = [
  { name: "Intake", shortName: "Intake", sla: "Auto from SQV / Web Form", slaHours: 0 },
  { name: "Appointment Fix", shortName: "Apt Fix", sla: "+1:00h from arrival", slaHours: 1 },
  { name: "Pre-Consult Docs", shortName: "Pre-Docs", sla: "-2:00h before schedule", slaHours: 2 },
  { name: "Day-Of Reminder", shortName: "Reminder", sla: "-1:00h before schedule", slaHours: 1 },
  { name: "Post-Consult Upload", shortName: "Post-Upload", sla: "+1:00h after end", slaHours: 1 },
  { name: "Handover to KAPPL/KTAHV", shortName: "Handover", sla: "Same-day completion", slaHours: 8 },
]

// Default URL now has NO limit param so ALL data is fetched
export const DEFAULT_GAS_URL =
  "https://script.google.com/macros/s/AKfycbwVdMTtkiBZJYdk9YVOYauwmYkplslVZe7JTpCYosbI8yGiluW_hStFHLAJIhb26l4vFA/exec?apiKey=FMS_CRM_2026_9Xk72LmP4q"

const CACHE_KEY = "kairali_doctor_consultations_idb_v2"
const CACHE_TIME_KEY = "kairali_doctor_consultations_time_v2"
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache

export function parseToTimestamp(dateStr?: string | number | null): number {
  if (!dateStr) return 0
  if (typeof dateStr === "number") return dateStr
  const s = String(dateStr).trim()
  if (!s || s === "—" || s === "NA" || s === "null" || s === "undefined") return 0

  // 1. Direct parse for ISO or standard strings
  const direct = new Date(s).getTime()
  if (!isNaN(direct) && direct > 0) {
    return direct
  }

  // 2. Parse DD/MM/YYYY or MM/DD/YYYY with optional time
  const match = s.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?/i
  )
  if (match) {
    let [, p1, p2, year, hour, min, sec, ampm] = match
    let h = hour ? parseInt(hour, 10) : 0
    const m = min ? parseInt(min, 10) : 0
    const sc = sec ? parseInt(sec, 10) : 0
    if (ampm) {
      if (ampm.toUpperCase() === "PM" && h < 12) h += 12
      if (ampm.toUpperCase() === "AM" && h === 12) h = 0
    }
    const n1 = parseInt(p1, 10)
    const n2 = parseInt(p2, 10)
    const y = parseInt(year, 10)

    let month = n1 - 1
    let day = n2
    if (n1 > 12) {
      day = n1
      month = n2 - 1
    }
    const parsed = new Date(y, month, day, h, m, sc).getTime()
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }

  return 0
}

function parseDelayHours(delayStr?: string): number {
  if (!delayStr) return 0
  const match = String(delayStr).match(/^(\d+):/)
  if (match) return parseInt(match[1], 10)
  const num = parseInt(String(delayStr), 10)
  return isNaN(num) ? 0 : num
}

function calculateDelayTime(consultation: Consultation, stageSlaHours: number): number {
  if (consultation.delayHours && consultation.delayHours > 0) {
    return consultation.delayHours
  }
  const now = new Date()
  const createdAt = new Date(consultation.createdAt || consultation.scheduledDate || now.toISOString())
  if (isNaN(createdAt.getTime())) return 0
  const hoursSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
  return Math.max(0, hoursSinceCreation - stageSlaHours)
}

export function computeConsultationStats(consultationList: Consultation[]): DoctorConsultationStats {
  const total = consultationList.length
  const completed = consultationList.filter((c) => c.status === "completed").length
  const pending = consultationList.filter((c) => c.status === "pending" || c.status === "overdue").length
  const converted = consultationList.filter(
    (c) =>
      c.finalCaseStatus.toLowerCase().includes("transfer") ||
      c.transferToUserStatus.toLowerCase().includes("sent") ||
      c.status === "completed"
  ).length
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0
  const revenue = converted * 2500
  const prescriptions = consultationList.filter((c) => c.hasPrescription).length

  return {
    total,
    completed,
    pending,
    converted,
    revenue,
    prescriptions,
    conversionRate,
  }
}

export function computeStageBreakup(consultationList: Consultation[]): StageBreakupItem[] {
  return STAGES.map((stage) => {
    const stageConsultations = consultationList.filter((c) => c.stage === stage.name)
    const pendingConsultations = stageConsultations.filter(
      (c) => c.status === "pending" || c.status === "overdue"
    )

    const consultationsWithDelay = pendingConsultations.map((c) => ({
      ...c,
      delayHours: calculateDelayTime(c, stage.slaHours),
    }))

    const totalDelayHours = consultationsWithDelay.reduce(
      (sum, c) => sum + (c.delayHours || 0),
      0
    )
    const avgDelayHours =
      pendingConsultations.length > 0
        ? Math.round(totalDelayHours / pendingConsultations.length)
        : 0

    const pendingCount = pendingConsultations.length
    const totalCount = stageConsultations.length
    const percentage = consultationList.length > 0 ? (totalCount / consultationList.length) * 100 : 0
    const completedCount = stageConsultations.filter((c) => c.status === "completed").length
    const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    return {
      ...stage,
      count: totalCount,
      pendingCount,
      percentage,
      progressPercentage,
      totalDelayHours,
      avgDelayHours,
      consultations: consultationsWithDelay,
    }
  })
}


function determineStage(item: GasDoctorConsultation): string {
  const transferStatus =
    item["Transfer to user Sheet Status"] ||
    item["Transfer to User  \nStatus"] ||
    item["Transfer to User \nStatus"] ||
    item["Final Case Status*"]

  if (
    transferStatus &&
    (transferStatus.toLowerCase().includes("sent") ||
      transferStatus.toLowerCase().includes("transfer") ||
      transferStatus.toLowerCase().includes("deleted") ||
      transferStatus.toLowerCase().includes("backup"))
  ) {
    return "Handover to KAPPL/KTAHV"
  }

  const consultDone =
    item["Consultation Done Status"] ||
    item["Post Consultation Remarks"] ||
    item["Upload Consultation Photo"] ||
    item["Reports Upload -  URL"]

  if (
    consultDone &&
    (consultDone.toLowerCase().includes("done") ||
      consultDone.toLowerCase().includes("completed") ||
      (item["Reports Upload -  URL"] && item["Reports Upload -  URL"].length > 5))
  ) {
    return "Post-Consult Upload"
  }

  const reminderStatus =
    item["WhatasApp to Client for Reminder"] ||
    item["Call To Client for Reminder"] ||
    item["Email to Client for Reminder"] ||
    item["Reminder Actual"]

  if (reminderStatus && reminderStatus.toLowerCase() !== "na" && reminderStatus.trim() !== "") {
    return "Day-Of Reminder"
  }

  const clientReport =
    item["Client Report Submit Status"] ||
    item["View Uploaded Client Reports Link"] ||
    item["View Clients Dosha Test Report Link"] ||
    item["View General Health Assessment Report"]

  if (
    clientReport &&
    (clientReport.toLowerCase() === "yes" ||
      clientReport.toLowerCase().startsWith("http") ||
      clientReport.toLowerCase() === "test")
  ) {
    return "Pre-Consult Docs"
  }

  const apptStatus = item["Appointment Status"] || item["Scheduled Date"] || item["Schedule Date&Time"]
  if (
    apptStatus &&
    (apptStatus.toLowerCase() === "done" ||
      apptStatus.toLowerCase().includes("audio") ||
      apptStatus.toLowerCase().includes("video") ||
      apptStatus.length > 5)
  ) {
    return "Appointment Fix"
  }

  return "Intake"
}

function determineStatus(
  item: GasDoctorConsultation,
  stage: string,
  delayHours: number
): "completed" | "pending" | "overdue" | "upcoming" {
  const transferStatus = (item["Transfer to user Sheet Status"] || "").toLowerCase()
  const consultDone = (item["Consultation Done Status"] || "").toLowerCase()
  const apptStatus = (item["Appointment Status"] || "").toLowerCase()
  const transferUserStatus = (item["Transfer to User  \nStatus"] || item["Transfer to User \nStatus"] || "").toLowerCase()

  if (
    transferStatus.includes("sent") ||
    (consultDone === "done" && stage === "Handover to KAPPL/KTAHV") ||
    apptStatus.includes("not required") ||
    transferUserStatus.includes("deleted")
  ) {
    return "completed"
  }

  if (delayHours > 48) {
    return "overdue"
  }

  const schedStr = item["Schedule Date&Time"] || item["Scheduled Date"]
  if (schedStr) {
    const d = new Date(schedStr)
    if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
      return "upcoming"
    }
  }

  return "pending"
}

function mapGasItemToConsultation(item: GasDoctorConsultation, index: number): Consultation {
  const id = item["ID"] || item["Consultation ID"] || `gas-${index + 1}`
  const consultationId = item["Consultation ID"] || item["ID"] || `DC-${index + 1}`
  const enquiryId = item["ID"] || ""
  const patientName = item["Name of Client"] || "Unknown Patient"
  const mobile = String(item["Clients Updated Contact Number"] || item["Mobile"] || "").trim()
  const email = String(item["Clients Updated Email ID"] || item["Email Id"] || "").trim()
  const subjects = item["Subjects"] || ""
  const notes = item["Notes"] || ""
  const ivrUrl = item["IVR Url"] || item["Audio Or Video Recording URL"] || ""
  const websiteName = item["WebSite Name"] || ""
  const dataSource = item["Data Source"] || ""
  const assignedSalesRep = item["Assigned Sales Rep"] || ""
  const remarksHistory = item["Remarks - History"] || ""
  const dataFromSheet = item["Data Come From Which Sheet"] || ""
  const doctorCalendarLink = item["View Doctors Calender Links"] || ""
  const calendarEventLink = item["Appointment Blocked in Google Calender"] || ""
  const appointmentType = item["Appointment Type"] || ""
  const appointmentStatus = item["Appointment Status"] || ""
  const doctorAlignment = item["Alignment of Doctors"] || "Dr. Priya Devi N"
  const scheduledDateTime = item["Schedule Date&Time"] || item["Scheduled Date"] || ""
  const scheduledDate = item["Scheduled Date"] || item["Schedule Date&Time"] || ""
  const remarks = item["Remarks"] || ""
  const clientReportLink =
    item["View Uploaded Client Reports Link"] ||
    item["View General Health Assessment Report"] ||
    item["General Health Assessment Report"] ||
    item["View Clients Dosha Test Report Link"] ||
    ""
  const submitStatus = item["Client Report Submit Status"] || ""
  const clientReportsLink = item["View Uploaded Client Reports Link"] || item["Upload Clients Reports/Documents - Upload Forms"] || ""
  const clientReportsRemarks = item["View Uploaded Client Reports Remarks"] || ""
  const doshaTestReportLink = item["View Clients Dosha Test Report Link"] || item["Clients Dosha Test Form Link"] || ""
  const healthAssessmentReportLink = item["View General Health Assessment Report"] || item["General Health Assessment Form Link"] || ""
  const clientReminderStatus = item["WhatasApp to Client for Reminder"] || item["Call To Client for Reminder"] || ""
  const doctorReminderStatus = item["WhatasApp to Doctor with all Consolidated List"] || item["Call To Doctor for Reminder"] || ""
  const consultationDoneStatus = item["Consultation Done Status"] || ""
  const reportsUploadUrl = item["Reports Upload -  URL"] || item["Upload Consultation Photo"] || ""
  const postConsultationRemarks = item["Post Consultation Remarks"] || ""
  const finalCaseStatus = item["Final Case Status*"] || ""
  const postConsultationUploadedBy = item["Post Consultation Uploaded By"] || ""
  const transferToUserStatus =
    item["Transfer to User  \nStatus"] ||
    item["Transfer to User \nStatus"] ||
    item["Transfer to user Sheet Status"] ||
    ""

  const delayHours =
    parseDelayHours(item["Appointment Time Delay"]) ||
    parseDelayHours(item["Client Report Time Delay"]) ||
    parseDelayHours(item["Reminder Time Delay"]) ||
    parseDelayHours(item["Post Consultation Time Delay"]) ||
    0

  const stage = determineStage(item)
  const status = determineStatus(item, stage, delayHours)

  const hasPrescription = Boolean(
    (item["Upload Consultation Photo"] && item["Upload Consultation Photo"].startsWith("http")) ||
      (item["Reports Upload -  URL"] && item["Reports Upload -  URL"].startsWith("http"))
  )

  const doer =
    postConsultationUploadedBy ||
    assignedSalesRep ||
    item["Transfer to User  \nStatus"] ||
    item["Transfer to User \nStatus"] ||
    doctorAlignment

  const slaStatus: "on-time" | "at-risk" | "overdue" =
    delayHours > 48 ? "overdue" : delayHours > 0 ? "at-risk" : "on-time"

  const timeRemaining =
    status === "completed"
      ? "Completed"
      : delayHours > 0
        ? `${delayHours}h delayed`
        : "On Schedule"

  const createdAt = item["Time Stamp"] || item["Date & Time"] || new Date().toISOString()
  const meetLink = item["Meet Link"] && item["Meet Link"] !== "NA" ? item["Meet Link"] : ""
  const paymentCollection = item["Payment Collection "] || ""
  const collectionAmount = item["Collection Amount"] ? String(item["Collection Amount"]) : ""
  const paymentScreenshot = item["Payment Screenshot"] || ""

  // Calculate sort timestamp
  const schedTime = parseToTimestamp(item["Schedule Date&Time"] || item["Scheduled Date"])
  const entryTime = parseToTimestamp(item["Time Stamp"] || item["Date & Time"])
  const apptTime = parseToTimestamp(item["Appointment Actual"] || item["Appointment Planned"])
  const sortTimestamp = Math.max(schedTime, entryTime, apptTime)

  return {
    id,
    consultationId,
    enquiryId,
    patientName,
    patientId: id,
    mobile,
    email,
    subjects,
    notes,
    ivrUrl,
    websiteName,
    dataSource,
    assignedSalesRep,
    remarksHistory,
    dataFromSheet,
    doctorCalendarLink,
    appointmentType,
    appointmentStatus,
    doctorAlignment,
    scheduledDateTime,
    scheduledDate,
    remarks,
    clientReportLink,
    submitStatus,
    clientReportsLink,
    clientReportsRemarks,
    doshaTestReportLink,
    healthAssessmentReportLink,
    clientReminderStatus,
    doctorReminderStatus,
    consultationDoneStatus,
    reportsUploadUrl,
    postConsultationRemarks,
    finalCaseStatus,
    postConsultationUploadedBy,
    transferToUserStatus,
    stage,
    status,
    doer,
    slaStatus,
    timeRemaining,
    hasPrescription,
    createdAt,
    delayHours,
    meetLink,
    paymentCollection,
    collectionAmount,
    paymentScreenshot,
    calendarEventLink,
    sortTimestamp,
    rawGasData: item,
  }
}

export interface UseDoctorConsultationsOptions {
  apiUrl?: string
  limit?: number
}

export function useDoctorConsultations(options?: UseDoctorConsultationsOptions) {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [rawData, setRawData] = useState<GasDoctorConsultation[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiUrl = useMemo(() => {
    if (options?.apiUrl) return options.apiUrl
    if (options?.limit) {
      return `https://script.google.com/macros/s/AKfycbwVdMTtkiBZJYdk9YVOYauwmYkplslVZe7JTpCYosbI8yGiluW_hStFHLAJIhb26l4vFA/exec?apiKey=FMS_CRM_2026_9Xk72LmP4q&limit=${options.limit}`
    }
    return DEFAULT_GAS_URL
  }, [options?.apiUrl, options?.limit])

  const processItems = useCallback((items: GasDoctorConsultation[]) => {
    // Map with original row index
    const mapped: (Consultation & { _sortTime: number; _origIndex: number })[] = items.map((item, index) => {
      const c = mapGasItemToConsultation(item, index)
      return {
        ...c,
        _sortTime: c.sortTimestamp || 0,
        _origIndex: index,
      }
    })

    // Sort: LATEST DATA FIRST
    // 1. By timestamp descending (newest dates at the top)
    // 2. Tie-breaker: original index descending (newest rows added at the bottom of the sheet appear first)
    mapped.sort((a, b) => {
      if (b._sortTime !== a._sortTime) {
        return b._sortTime - a._sortTime
      }
      return b._origIndex - a._origIndex
    })

    const finalConsultations: Consultation[] = mapped.map(({ _sortTime, _origIndex, ...c }) => c)
    setRawData(items)
    setConsultations(finalConsultations)
    return finalConsultations
  }, [])

  const fetchData = useCallback(
    async (force = false) => {
      try {
        setError(null)
        if (consultations.length === 0) setLoading(true)
        else setIsRefreshing(true)

        // 1. Check IndexedDB cache for instant UI rendering
        if (!force && typeof window !== "undefined") {
          try {
            const cachedTime = localStorage.getItem(CACHE_TIME_KEY)
            const cachedData = await getIDBCache(CACHE_KEY)
            if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
              processItems(cachedData)
              setLoading(false)
              if (cachedTime && Date.now() - Number(cachedTime) < CACHE_TTL) {
                setIsRefreshing(false)
                return
              }
              setIsRefreshing(true)
            }
          } catch {
            // IDB cache read failed, proceed to fetch
          }
        }

        const res = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: force ? "no-store" : "default",
        })

        if (!res.ok) {
          throw new Error(`GAS API failed with status ${res.status}`)
        }

        const json = await res.json()

        // Handle array directly or { data: [...] } or { value: [...] }
        let items: GasDoctorConsultation[] = []
        if (Array.isArray(json)) {
          items = json
        } else if (Array.isArray(json?.data)) {
          items = json.data
        } else if (Array.isArray(json?.value)) {
          items = json.value
        } else {
          throw new Error("Unexpected data structure from GAS endpoint")
        }

        processItems(items)

        // 2. Persist to IndexedDB cache (handles full dataset seamlessly)
        if (typeof window !== "undefined") {
          try {
            await setIDBCache(CACHE_KEY, items)
            localStorage.setItem(CACHE_TIME_KEY, String(Date.now()))
          } catch {
            // Storage write failed
          }
        }
      } catch (err: any) {
        console.error("[useDoctorConsultations] Fetch error:", err)
        setError(err?.message || "Failed to load doctor consultation data from GAS")
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [apiUrl, consultations.length, processItems]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Computed Stats
  const stats: DoctorConsultationStats = useMemo(() => {
    return computeConsultationStats(consultations)
  }, [consultations])

  // Computed Stage Breakup
  const stageBreakup: StageBreakupItem[] = useMemo(() => {
    return computeStageBreakup(consultations)
  }, [consultations])

  return {
    consultations,
    rawData,
    stageBreakup,
    stats,
    loading,
    isRefreshing,
    error,
    refetch: fetchData,
  }
}
