import fs from "fs"
import path from "path"

const SENT_REPORTS_FILE = path.join(process.cwd(), "data", "sales-call-audit-sent-reports.json")

export interface SentReportEntry {
  date: string // YYYY-MM-DD
  sentAt: string
  recipient: string
  messageId?: string
}

export function getSentReportDates(): string[] {
  try {
    if (!fs.existsSync(SENT_REPORTS_FILE)) {
      return []
    }
    const raw = fs.readFileSync(SENT_REPORTS_FILE, "utf-8")
    const entries: SentReportEntry[] = JSON.parse(raw)
    if (!Array.isArray(entries)) return []
    return entries.map(e => String(e.date).trim()).filter(Boolean)
  } catch (err) {
    console.warn("[sales-call-audit-tracker] Failed to read sent reports:", err)
    return []
  }
}

export function isReportSentForDate(dateStr: string): boolean {
  if (!dateStr) return false
  const target = dateStr.trim().toLowerCase()
  const dates = getSentReportDates()
  return dates.some(d => {
    const dLower = d.toLowerCase()
    return dLower === target || dLower.startsWith(target) || target.startsWith(dLower)
  })
}

export function recordSentReport(entry: SentReportEntry): void {
  try {
    const dir = path.dirname(SENT_REPORTS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    let entries: SentReportEntry[] = []
    if (fs.existsSync(SENT_REPORTS_FILE)) {
      try {
        const raw = fs.readFileSync(SENT_REPORTS_FILE, "utf-8")
        entries = JSON.parse(raw)
        if (!Array.isArray(entries)) entries = []
      } catch {
        entries = []
      }
    }
    entries = entries.filter(e => e.date !== entry.date)
    entries.push(entry)
    fs.writeFileSync(SENT_REPORTS_FILE, JSON.stringify(entries, null, 2), "utf-8")
  } catch (err) {
    console.warn("[sales-call-audit-tracker] Failed to save sent report:", err)
  }
}

export function removeSentReport(dateStr: string): void {
  try {
    if (!fs.existsSync(SENT_REPORTS_FILE)) return
    const raw = fs.readFileSync(SENT_REPORTS_FILE, "utf-8")
    let entries: SentReportEntry[] = JSON.parse(raw)
    if (!Array.isArray(entries)) return
    const target = dateStr.trim().toLowerCase()
    entries = entries.filter(e => {
      const d = String(e.date).trim().toLowerCase()
      return d !== target && !d.includes(target) && !target.includes(d)
    })
    fs.writeFileSync(SENT_REPORTS_FILE, JSON.stringify(entries, null, 2), "utf-8")
  } catch (err) {
    console.warn("[sales-call-audit-tracker] Failed to remove sent report:", err)
  }
}
