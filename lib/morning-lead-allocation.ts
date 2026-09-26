import 'server-only'
import { google } from 'googleapis'

export const MASTER_SPREADSHEET_ID = '1nQuZVX2D-sWCaS6sG0OzLMveH8M7g9tJrIXmiY3hQkU'
export const ALLOCATION_LOG_TAB = 'Morning Allocation Log'
export const OVERDUE_TRANSFER_REMARK = 'Transfer by Morning lead allocation page due to overdue lead'
const MAX_EMPLOYEE_SHEETS = 30
const MAX_ROWS_PER_SHEET = 10000

export type AllocationLead = {
  id: string
  key: string
  name: string
  business: string
  source: 'AppSheet'
  sources: string[]
  age: string
  lastAction: string
  nextAction: string
  due: string
  planned: string
  owner: string
  originalOwner: string
  status: 'Overdue' | 'Due today' | 'Upcoming' | 'Needs review'
  /** milliseconds overdue (positive = overdue; 0 if not overdue) */
  overdueMs: number
  note?: string
  sourceSpreadsheetId: string
  sourceRow: number
  occurrenceCount: number
  transferWritable?: boolean
}

/** Per-person assignment line for the snapshot report */
export type AssignmentLine = {
  fromOwner: string
  toOwner: string
  leadId: string
  leadName: string
  time: string
  actor: string
}

/** Full snapshot of today's allocation activity, used for the 11 am email */
export type AssignmentSummary = {
  date: string
  totalLeads: number
  assignedLeads: number
  unassignedLeads: number
  overdueLeads: number
  changes: AssignmentLine[]
  byOwner: { owner: string; assigned: number; received: number }[]
}

type EmployeeSheet = { name: string; id: string }
type LogEvent = {
  date: string; action: string; key: string; id: string
  previousOwner: string; newOwner: string; availability: string; actor: string; time: string
}

function googleClients() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured')
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  })
  return { sheets: google.sheets({ version: 'v4', auth }), drive: google.drive({ version: 'v3', auth }) }
}

function value(input: unknown): string {
  return input === null || input === undefined ? '' : String(input).trim()
}

export function istDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

function parseSheetDate(input: unknown): Date | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    const ms = Date.UTC(1899, 11, 30) + Math.round(input * 86400000) - 330 * 60000
    return new Date(ms)
  }
  const text = value(input)
  const parts = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (!parts) return null
  let first = Number(parts[1]), second = Number(parts[2])
  if (second > 12) [first, second] = [second, first]
  const ms = Date.UTC(
    Number(parts[3]), second - 1, first,
    Number(parts[4] || 0), Number(parts[5] || 0), Number(parts[6] || 0),
  ) - 330 * 60000
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateLabel(date: Date | null): string {
  return date
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      }).format(date)
    : 'Missing / invalid'
}

function businessFrom(text: string): string {
  const s = text.toLowerCase()
  if (/villa\s*raag|villaraag/.test(s)) return 'Villa Raag'
  if (/ayurvedic products|kappl|kairali\.com/.test(s)) return 'KAPPL'
  if (/healing village|ktahv|ayurvedic centre/.test(s)) return 'KTAHV'
  return 'Unclear business'
}

export function parsePendingMainRows(
  rows: unknown[][], employee: EmployeeSheet, now = new Date(),
): AllocationLead[] {
  const header = (rows[0] || []).map(value)
  if (
    header[2] !== 'ID' || header[11] !== 'Assign To MR' ||
    header[13] !== 'Planned' || header[14] !== 'Actual' ||
    header[16] !== 'Status'
  ) {
    throw new Error(`Main headers changed for ${employee.name}`)
  }
  const result: AllocationLead[] = []
  rows.slice(1).forEach((row, index) => {
    const planned = value(row[13])
    const actual = value(row[14])
    if (!planned || actual || value(row[16]).toLowerCase() === 'transfer') return
    const sourceRow = index + 7
    const id = value(row[2])
    const key = id ? `id:${id.toLowerCase()}` : `row:${employee.id}:${sourceRow}`
    const owner = value(row[11])
    const due = parseSheetDate(row[13])
    const created = parseSheetDate(row[1]) || parseSheetDate(row[0])
    const ageHours = created
      ? Math.max(0, Math.floor((now.getTime() - created.getTime()) / 3600000))
      : null
    const isOverdue = due ? due.getTime() < now.getTime() : false
    const overdueMs = isOverdue && due ? Math.max(0, now.getTime() - due.getTime()) : 0
    const status: AllocationLead['status'] = !due
      ? 'Needs review'
      : isOverdue
        ? 'Overdue'
        : istDate(due) === istDate(now)
          ? 'Due today'
          : 'Upcoming'
    const notes = [
      !id && 'Missing lead ID',
      !owner && 'Unassigned',
      !due && 'Invalid planned time',
    ].filter(Boolean).join(' · ')
    result.push({
      id: id || `Row ${sourceRow}`,
      key,
      name: value(row[3]) || 'Unnamed lead',
      business: businessFrom(`${value(row[9])} ${value(row[10])}`),
      source: 'AppSheet',
      sources: ['AppSheet'],
      age: ageHours === null
        ? 'Unknown'
        : ageHours < 24 ? `${ageHours} hours` : `${Math.floor(ageHours / 24)} days`,
      lastAction: value(row[16]) ? `Status: ${value(row[16])}` : 'No completed action recorded',
      nextAction: 'Complete planned call',
      due: dateLabel(due),
      planned: dateLabel(due),
      owner,
      originalOwner: owner,
      status,
      overdueMs,
      note: notes || undefined,
      sourceSpreadsheetId: employee.id,
      sourceRow,
      occurrenceCount: 1,
    })
  })
  return result
}

function dedupe(leads: AllocationLead[]): AllocationLead[] {
  const map = new Map<string, AllocationLead>()
  for (const lead of leads) {
    const previous = map.get(lead.key)
    if (!previous) { map.set(lead.key, lead); continue }
    const owners = new Set([previous.originalOwner, lead.originalOwner].filter(Boolean))
    map.set(lead.key, {
      ...previous,
      owner: owners.size === 1 ? [...owners][0] : '',
      originalOwner: owners.size === 1 ? [...owners][0] : '',
      occurrenceCount: previous.occurrenceCount + 1,
      note: owners.size > 1
        ? 'Conflicting owners across employee sheets'
        : 'Same lead appears in multiple employee sheets',
      status: owners.size > 1 ? 'Needs review' : previous.status,
    })
  }
  return [...map.values()]
}

function allocationEvents(rows: unknown[][]): LogEvent[] {
  return rows.map((row) => ({
    date: value(row[2]), action: value(row[4]), key: value(row[5]), id: value(row[6]),
    previousOwner: value(row[11]), newOwner: value(row[12]),
    availability: value(row[15]), actor: value(row[3]), time: value(row[1]),
  }))
}

export async function loadMorningAllocation() {
  const { sheets, drive } = googleClients()
  const master = await sheets.spreadsheets.values.get(
    { spreadsheetId: MASTER_SPREADSHEET_ID, range: 'config!A1:B100', valueRenderOption: 'FORMATTED_VALUE' },
    { timeout: 15000 },
  )
  const config = master.data.values || []
  if (
    value(config[0]?.[0]).toLowerCase() !== 'name' ||
    value(config[0]?.[1]).toLowerCase() !== 'sheet id'
  ) throw new Error('Config headers changed')
  const employees = config
    .slice(1)
    .map((row) => ({ name: value(row[0]), id: value(row[1]) }))
    .filter((row) => row.name && /^[\w-]{20,}$/.test(row.id))
    .slice(0, MAX_EMPLOYEE_SHEETS)

  const readOne = async (employee: EmployeeSheet) => {
    const [meta, permission] = await Promise.all([
      sheets.spreadsheets.get(
        { spreadsheetId: employee.id, fields: 'sheets(properties(title,gridProperties(rowCount)))' },
        { timeout: 15000 },
      ),
      drive.files.get(
        { fileId: employee.id, fields: 'capabilities(canEdit)' },
        { timeout: 15000 },
      ).catch(() => null),
    ])
    const main = meta.data.sheets?.find((sheet) => sheet.properties?.title === 'Main')
    if (!main) throw new Error(`Main tab missing for ${employee.name}`)
    const end = Math.min(main.properties?.gridProperties?.rowCount || 7, MAX_ROWS_PER_SHEET)
    const data = await sheets.spreadsheets.values.get(
      {
        spreadsheetId: employee.id, range: `Main!A6:T${end}`,
        valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER',
      },
      { timeout: 20000 },
    )
    return {
      leads: parsePendingMainRows((data.data.values || []) as unknown[][], employee),
      writable: permission?.data.capabilities?.canEdit === true,
    }
  }

  const batches: AllocationLead[][] = []
  const writable = new Map<string, boolean>()
  const failures: string[] = []
  for (let i = 0; i < employees.length; i += 4) {
    const result = await Promise.allSettled(employees.slice(i, i + 4).map(readOne))
    result.forEach((item, index) => {
      if (item.status === 'fulfilled') {
        batches.push(item.value.leads)
        writable.set(employees[i + index].id, item.value.writable)
      } else {
        const errorMsg = item.reason instanceof Error ? item.reason.message : String(item.reason)
        failures.push(`${employees[i + index].name} (${errorMsg})`)
      }
    })
  }

  const metadata = await sheets.spreadsheets.get(
    { spreadsheetId: MASTER_SPREADSHEET_ID, fields: 'sheets(properties(title,gridProperties(rowCount)))' },
    { timeout: 15000 },
  )
  const logTab = metadata.data.sheets?.find((sheet) => sheet.properties?.title === ALLOCATION_LOG_TAB)
  if (!logTab) throw new Error('Morning Allocation Log tab is missing')
  const end = logTab.properties?.gridProperties?.rowCount || 2
  if (end > 5000) throw new Error('Allocation log needs archiving before more owner changes can be applied')
  const log = await sheets.spreadsheets.values.get(
    { spreadsheetId: MASTER_SPREADSHEET_ID, range: `'${ALLOCATION_LOG_TAB}'!A2:T${end}`, valueRenderOption: 'FORMATTED_VALUE' },
    { timeout: 15000 },
  )
  const events = allocationEvents((log.data.values || []) as unknown[][])

  const override = new Map<string, string>()
  const availability = new Map<string, boolean>()
  const verified = new Set<string>()
  for (const event of events) {
    if (event.action === 'OWNER_CHANGE') override.set(event.key, event.newOwner)
    if (event.action === 'VERIFIED_NO_CHANGE') verified.add(event.key)
    if (event.action === 'AVAILABILITY' && event.date === istDate())
      availability.set(event.key, event.availability === 'available')
  }

  const leads = dedupe(batches.flat())
    .filter((lead) => !verified.has(lead.key))
    .map((lead) => ({
      ...lead,
      owner: override.has(lead.key) ? override.get(lead.key) || '' : lead.owner,
      transferWritable: writable.get(lead.sourceSpreadsheetId) === true && lead.occurrenceCount === 1,
    }))

  const staff = employees.map((employee) => ({
    name: employee.name,
    available: availability.get(employee.name) ?? true,
    workload: leads.filter((lead) => lead.owner === employee.name).length,
  }))

  const recentChanges = events
    .filter((event) => event.action === 'OWNER_CHANGE' && event.date === istDate())
    .slice(-12).reverse()
    .map((event) =>
      `${event.id}: ${event.previousOwner || 'Unassigned'} → ${event.newOwner || 'Unassigned'} · ${event.actor} · ` +
      `${new Date(event.time).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST`,
    )

  const startedAt = events
    .filter((event) => event.action === 'START' && event.date === istDate())
    .at(-1)?.time || null

  return {
    leads, staff, failures, recentChanges, startedAt,
    logRowCount: events.length,
    capturedAt: new Date().toISOString(),
    sourceCount: employees.length,
    pendingRawCount: batches.flat().length,
    duplicateCount: batches.flat().length - leads.length,
    transferAccessMissingCount: [...writable.values()].filter((canEdit) => !canEdit).length,
    date: istDate(),
    complete: failures.length === 0,
  }
}

export type AllocationAction = {
  action: 'START' | 'OWNER_CHANGE' | 'AVAILABILITY' | 'CONFIRM' | 'VERIFIED_NO_CHANGE'
  key?: string
  previousOwner?: string
  newOwner?: string
  reason?: string
  availability?: 'available' | 'unavailable'
}

/**
 * Write columns L, Q, T, and V on the source employee sheet for a transfer.
 * L = new owner name
 * Q = "Transfer"
 * T = timestamped remark
 * V = Transfer To (new owner name) — printed on sheet when listing transfers
 */
export async function transferSourceRow(
  sheets: ReturnType<typeof googleClients>['sheets'],
  lead: AllocationLead,
  newOwner: string,
  savedAt: string,
) {
  const rowNumber = lead.sourceRow
  const current = await sheets.spreadsheets.values.get(
    { spreadsheetId: lead.sourceSpreadsheetId, range: `Main!C${rowNumber}:T${rowNumber}`, valueRenderOption: 'FORMATTED_VALUE' },
    { timeout: 15000 },
  )
  const cells = current.data.values?.[0] || []
  const sourceId = value(cells[0])
  const sourceOwner = value(cells[9])
  const planned = value(cells[11])
  const actual = value(cells[12])
  const sourceStatus = value(cells[14])
  const oldRemarks = value(cells[17])
  if (
    (lead.key.startsWith('id:') && sourceId.toLowerCase() !== lead.id.toLowerCase()) ||
    (lead.key.startsWith('row:') && sourceId) ||
    sourceOwner !== lead.originalOwner || !planned || actual ||
    sourceStatus.toLowerCase() === 'transfer'
  ) {
    throw new Error('Source row changed since refresh. Refresh and review before transferring.')
  }
  const when = new Date(savedAt).toLocaleString('en-GB', {
    timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
  })
  const message =
    `${lead.status === 'Overdue' ? OVERDUE_TRANSFER_REMARK : 'Transfer by Morning lead allocation page'} | ${when} IST | ${lead.originalOwner || 'Unassigned'} → ${newOwner}`
  const remarks = oldRemarks ? `${oldRemarks}\n${message}` : message
  if (remarks.length > 49000) throw new Error('Remarks cell is too long to append a transfer note')

  // Write L = new owner first
  await sheets.spreadsheets.values.update({
    spreadsheetId: lead.sourceSpreadsheetId,
    range: `Main!L${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[newOwner]] },
  }, { timeout: 15000 })

  // Then batch-write Q (Transfer), T (remarks), V (Transfer To = new owner for print)
  const writeTransferMarks = () => sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: lead.sourceSpreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `Main!Q${rowNumber}`, values: [['Transfer']] },
        { range: `Main!T${rowNumber}`, values: [[remarks]] },
        { range: `Main!V${rowNumber}`, values: [[newOwner]] },   // Column V = Transfer To
      ],
    },
  }, { timeout: 15000 })

  const readTransferMarks = async () => {
    const check = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: lead.sourceSpreadsheetId,
      ranges: [
        `Main!L${rowNumber}`,
        `Main!Q${rowNumber}`,
        `Main!T${rowNumber}`,
        `Main!V${rowNumber}`,
      ],
      valueRenderOption: 'FORMATTED_VALUE',
    }, { timeout: 15000 })
    const vr = check.data.valueRanges || []
    return (
      value(vr[0]?.values?.[0]?.[0]) === newOwner &&
      value(vr[1]?.values?.[0]?.[0]) === 'Transfer' &&
      value(vr[2]?.values?.[0]?.[0]) === remarks.trim() &&
      value(vr[3]?.values?.[0]?.[0]) === newOwner
    )
  }

  await writeTransferMarks()
  if (!await readTransferMarks()) {
    await writeTransferMarks()
    if (!await readTransferMarks())
      throw new Error('Source row partly updated. Check L, Q, T and V before another transfer.')
  }
}

/** Build the assignment snapshot report for today — used by the 11 am email cron */
export async function buildAssignmentSnapshot(): Promise<AssignmentSummary> {
  const snapshot = await loadMorningAllocation()
  const today = istDate()

  const { sheets } = googleClients()
  const metadata = await sheets.spreadsheets.get(
    { spreadsheetId: MASTER_SPREADSHEET_ID, fields: 'sheets(properties(title,gridProperties(rowCount)))' },
    { timeout: 15000 },
  )
  const logTab = metadata.data.sheets?.find((s) => s.properties?.title === ALLOCATION_LOG_TAB)
  const endRow = logTab?.properties?.gridProperties?.rowCount || 2
  const log = await sheets.spreadsheets.values.get(
    { spreadsheetId: MASTER_SPREADSHEET_ID, range: `'${ALLOCATION_LOG_TAB}'!A2:T${endRow}`, valueRenderOption: 'FORMATTED_VALUE' },
    { timeout: 15000 },
  )
  const events = allocationEvents((log.data.values || []) as unknown[][])

  const todayChanges = events.filter((e) => e.action === 'OWNER_CHANGE' && e.date === today)
  const changes: AssignmentLine[] = todayChanges.map((e) => ({
    fromOwner: e.previousOwner || 'Unassigned',
    toOwner: e.newOwner || 'Unassigned',
    leadId: e.id,
    leadName: snapshot.leads.find((l) => l.id === e.id)?.name || e.id,
    time: e.time
      ? new Date(e.time).toLocaleString('en-GB', {
          timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
        })
      : '',
    actor: e.actor,
  }))

  const ownerMap = new Map<string, { assigned: number; received: number }>()
  for (const p of snapshot.staff) ownerMap.set(p.name, { assigned: 0, received: 0 })
  for (const l of snapshot.leads) {
    if (l.owner) {
      const e = ownerMap.get(l.owner) || { assigned: 0, received: 0 }
      e.assigned++
      ownerMap.set(l.owner, e)
    }
  }
  for (const c of changes) {
    if (c.toOwner && c.toOwner !== 'Unassigned') {
      const e = ownerMap.get(c.toOwner) || { assigned: 0, received: 0 }
      e.received++
      ownerMap.set(c.toOwner, e)
    }
  }

  const byOwner = [...ownerMap.entries()]
    .map(([owner, counts]) => ({ owner, ...counts }))
    .filter((o) => o.assigned > 0 || o.received > 0)

  return {
    date: today,
    totalLeads: snapshot.leads.length + snapshot.duplicateCount,
    assignedLeads: snapshot.leads.filter((l) => !!l.owner).length,
    unassignedLeads: snapshot.leads.filter((l) => !l.owner).length,
    overdueLeads: snapshot.leads.filter((l) => l.status === 'Overdue').length,
    changes,
    byOwner,
  }
}

export async function saveMorningAllocationAction(actor: string, input: AllocationAction) {
  const snapshot = await loadMorningAllocation()
  if (!snapshot.complete) throw new Error('Source unavailable. No allocation change was saved.')
  const lead = snapshot.leads.find((item) => item.key === input.key)

  if (input.action === 'OWNER_CHANGE') {
    if (!lead || lead.owner !== input.previousOwner)
      throw new Error('Lead owner changed since refresh. Refresh and try again.')
    if (!input.newOwner || !snapshot.staff.some((p) => p.name === input.newOwner && p.available))
      throw new Error('Choose an available person from Config.')
    if (lead.occurrenceCount > 1)
      throw new Error('This lead appears in multiple sheets. Resolve the duplicate rows before transfer.')
    if (!lead.transferWritable)
      throw new Error('Employee Main sheet is view-only for the CRM service account. Editor access is required for transfer.')
    if (!input.reason?.trim())
      throw new Error('Enter a reason for the owner change.')
  }

  if (input.action === 'VERIFIED_NO_CHANGE') {
    // Only audit-log; do NOT write to the employee sheet
    if (!lead) throw new Error('Lead not found in current snapshot. Refresh and try again.')
  }

  if (input.action === 'AVAILABILITY' && !snapshot.staff.some((p) => p.name === input.key))
    throw new Error('Person is not in Config.')
  if (input.action === 'START' && snapshot.startedAt)
    throw new Error('Morning check already started today.')
  if (
    input.action === 'CONFIRM' && (
      snapshot.leads.some((item) => !item.owner || !item.nextAction || !item.due || item.due === 'Missing / invalid') ||
      snapshot.staff.some((person) => !person.available && snapshot.leads.some((item) => item.owner === person.name))
    )
  ) throw new Error('Resolve unassigned work and unavailable owners before confirming.')
  if (input.action === 'CONFIRM' && !snapshot.startedAt)
    throw new Error('Start the morning check before confirming.')

  const duration = input.action === 'CONFIRM' && snapshot.startedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(snapshot.startedAt).getTime()) / 1000))
    : null

  const row = [
    crypto.randomUUID(), new Date().toISOString(), istDate(), actor, input.action,
    input.key || '', lead?.id || '', lead?.sourceSpreadsheetId || '', lead ? 'Main' : '', lead?.sourceRow || '',
    lead?.planned || '', input.previousOwner || '', input.newOwner || '', lead?.nextAction || '',
    duration === null ? input.reason?.trim() || '' : `Duration ${duration}s`,
    input.availability || '',
    snapshot.leads.length,
    snapshot.leads.filter((item) => !item.owner).length,
    snapshot.leads.filter((item) => item.status === 'Overdue').length,
    snapshot.leads.filter((item) => item.note || !item.owner).length,
  ]

  const rows: (string | number)[][] = [row]
  if (input.action === 'CONFIRM') {
    for (const item of snapshot.leads) rows.push([
      crypto.randomUUID(), row[1], row[2], actor, 'CONFIRMED_LEAD', item.key, item.id,
      item.sourceSpreadsheetId, 'Main', item.sourceRow, item.planned, item.originalOwner,
      item.owner, item.nextAction, `Run ${row[0]}`, '', '', '', '', '',
    ])
  }

  if (snapshot.logRowCount + rows.length >= 5000)
    throw new Error('Allocation log needs archiving before more records can be saved')

  const { sheets } = googleClients()
  // Only OWNER_CHANGE writes to the employee sheet; VERIFIED_NO_CHANGE does not
  if (input.action === 'OWNER_CHANGE' && lead)
    await transferSourceRow(sheets, lead, input.newOwner!, String(row[1]))

  try {
    await sheets.spreadsheets.values.append(
      {
        spreadsheetId: MASTER_SPREADSHEET_ID,
        range: `'${ALLOCATION_LOG_TAB}'!A:T`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: rows },
      },
      { timeout: 15000 },
    )
  } catch (error) {
    if (input.action === 'OWNER_CHANGE')
      throw new Error(
        'Source row transferred, but the master log could not be saved. Refresh and reconcile the transfer record.',
        { cause: error },
      )
    throw error
  }

  return { eventId: row[0], savedAt: row[1], durationSeconds: duration }
}
