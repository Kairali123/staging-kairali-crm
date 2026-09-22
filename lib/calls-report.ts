// Calls report model: shared by the /api/calls-report route (server) and the page (types only).
// The raw Apps Script payload is { "YYYY-MM-DD": { "<employee>": { companyName, plannedData, actualData } } }.

export interface CallsEmployeeRow {
  empName: string
  company: string
  plannedCalls: number
  actualCalls: number
  varianceCalls: number
  variancePercent: number
  newClientsPlanned: number
  newClientsActual: number
  oldClientsPlanned: number
  oldClientsActual: number
}

export interface CallsDateGroup {
  date: string          // "2024-02-21"
  displayDate: string   // "21 Feb 2024"
  month: string         // "FEBRUARY"
  year: string          // "2024"
  employees: CallsEmployeeRow[]
  totalPlanned: number
  totalActual: number
  totalVariance: number
  totalNewPlanned: number
  totalNewActual: number
  totalOldPlanned: number
  totalOldActual: number
}

// Flat row per employee + month + year + company, used by filters, KPIs and the graph view.
export interface CallsRow {
  empName: string
  company: string
  month: string
  year: string
  plannedCalls: number
  actualCalls: number
  varianceCalls: number
  variancePercent: number
  newClientsActual: number
  oldClientsActual: number
  rank?: number
}

export interface CallsReport {
  callsData: CallsRow[]
  dateGroups: CallsDateGroup[]
}

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d} ${MONTH_ABBR[parseInt(m, 10) - 1]} ${y}`
}

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function buildCallsReport(json: Record<string, Record<string, any>>): CallsReport {
  const groups: CallsDateGroup[] = []
  const flat = new Map<string, CallsRow>()

  for (const dateStr of Object.keys(json).sort()) {
    const [y, m] = dateStr.split('-')
    const monthName = MONTH_NAMES[parseInt(m, 10) - 1]
    if (!monthName) continue // not a date key
    const employees: CallsEmployeeRow[] = []

    for (const [empName, data] of Object.entries(json[dateStr] || {})) {
      const company = (data?.companyName ?? '').toString().trim().toUpperCase().replace(/\s+/g, '')
      const plannedCalls = num(data?.plannedData?.totalPlannedCalls)
      const actualCalls = num(data?.actualData?.totalActualCalls)
      const newClientsPlanned = num(data?.plannedData?.breakdown?.newClientCalls)
      const oldClientsPlanned = num(data?.plannedData?.breakdown?.oldClientCalls)
      const newClientsActual = num(data?.actualData?.breakdown?.newClientCalls)
      const oldClientsActual = num(data?.actualData?.breakdown?.oldClientCalls)
      const varianceCalls = actualCalls - plannedCalls
      const variancePercent = plannedCalls !== 0 ? (varianceCalls / plannedCalls) * 100 : 0

      employees.push({
        empName, company,
        plannedCalls, actualCalls, varianceCalls, variancePercent,
        newClientsPlanned, newClientsActual, oldClientsPlanned, oldClientsActual,
      })

      const key = `${empName}||${monthName}||${y}||${company}`
      const existing = flat.get(key)
      if (existing) {
        existing.plannedCalls += plannedCalls
        existing.actualCalls += actualCalls
        existing.newClientsActual += newClientsActual
        existing.oldClientsActual += oldClientsActual
        existing.varianceCalls = existing.actualCalls - existing.plannedCalls
        existing.variancePercent = existing.plannedCalls !== 0 ? (existing.varianceCalls / existing.plannedCalls) * 100 : 0
      } else {
        flat.set(key, {
          empName, company, month: monthName, year: y,
          plannedCalls, actualCalls, varianceCalls, variancePercent,
          newClientsActual, oldClientsActual,
        })
      }
    }

    const sum = (pick: (e: CallsEmployeeRow) => number) => employees.reduce((s, e) => s + pick(e), 0)
    groups.push({
      date: dateStr,
      displayDate: formatDisplayDate(dateStr),
      month: monthName,
      year: y,
      employees,
      totalPlanned: sum(e => e.plannedCalls),
      totalActual: sum(e => e.actualCalls),
      totalVariance: sum(e => e.varianceCalls),
      totalNewPlanned: sum(e => e.newClientsPlanned),
      totalNewActual: sum(e => e.newClientsActual),
      totalOldPlanned: sum(e => e.oldClientsPlanned),
      totalOldActual: sum(e => e.oldClientsActual),
    })
  }

  return { callsData: Array.from(flat.values()), dateGroups: groups }
}
