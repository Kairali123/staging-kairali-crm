import { getPool } from '@/lib/db'

export type AiCompanyCode = 'KTAHV' | 'KAPPL' | 'VILLARAAG' | 'KATC'

export type AiBotId =
  | 'priya-sharma'
  | 'product-priya-sharma'
  | 'villaraag-anjali-menon'
  | 'dr-aarika'
  | 'riya-sharma'

export type AiBotKind = 'lead_generation' | 'guest_support'

export interface ChannelMetric {
  channel: string
  chats: number
  enquiries: number
  enquiryPct: number
  conversions: number
  verifiedConversions: number
  conversionPct: number
  revenue: number
}

export interface OutcomeMetric {
  outcome: string
  count: number
  pct: number
}

export interface DailyTrendRow {
  date: string
  chats: number
  enquiries: number
  conversions: number
  riyaChats: number
  riyaResolved: number
}

export interface ChatSheetRecord {
  id: string
  botId: AiBotId
  botName: string
  dateTime: string
  date: string
  leadOrChatId: string
  clientName: string
  phone: string
  email: string
  company: AiCompanyCode
  rawCompany: string
  channel: string
  isEnquiry: boolean
  outcome: string
  status: string
  agentOrStaff: string
  isConverted: boolean
  isVerifiedConversion: boolean
  conversionAmount: number
  bookingOrderId: string
}

export interface CompanySubBotRow {
  botId: AiBotId
  botName: string
  kind: AiBotKind
  chats: number
  droppedChats: number
  enquiries: number
  enquiryPct: number
  verifiedConversions: number
  unverifiedConversions: number
  totalConversions: number
  enquiryToConversionPct: number
  chatToConversionPct: number
  revenue: number
  resolvedTickets: number
  openTickets: number
  escalatedTickets: number
  resolutionPct: number
}

export interface CompanySummaryRow {
  company: AiCompanyCode
  companyLabel: string
  leadChats: number
  droppedChats: number
  enquiries: number
  enquiryPct: number
  verifiedConversions: number
  unverifiedConversions: number
  totalConversions: number
  enquiryToConversionPct: number
  chatToConversionPct: number
  revenue: number
  guestSupportChats: number
  guestActionable: number
  guestResolved: number
  guestOpen: number
  guestEscalated: number
  guestResolutionPct: number
  totalAllChats: number
  bots: CompanySubBotRow[]
}

export interface BotSheetSummary {
  botId: AiBotId
  botName: string
  shortName: string
  subtitle: string
  sqlTable: string
  primaryCompany: AiCompanyCode
  kind: AiBotKind
  totalChats: number
  droppedChats: number
  enquiries: number
  enquiryPct: number
  verifiedConversions: number
  unverifiedConversions: number
  totalConversions: number
  enquiryToConversionPct: number
  chatToConversionPct: number
  revenue: number
  // Guest support specific (Riya Sharma)
  resolvedTickets: number
  openTickets: number
  escalatedTickets: number
  resolutionPct: number
  channels: ChannelMetric[]
  companies: {
    company: AiCompanyCode
    companyLabel: string
    chats: number
    enquiries: number
    enquiryPct: number
    conversions: number
    verifiedConversions: number
    conversionPct: number
    revenue: number
  }[]
  topOutcomes: OutcomeMetric[]
  recentRecords: ChatSheetRecord[]
}

export interface AiChatReportData {
  startDate: string
  endDate: string
  periodLabel: string
  companyScope: 'ALL' | AiCompanyCode
  generatedAt: string
  totals: {
    leadChats: number
    droppedChats: number
    enquiries: number
    enquiryPct: number
    verifiedConversions: number
    unverifiedConversions: number
    totalConversions: number
    enquiryToConversionPct: number
    chatToConversionPct: number
    revenue: number
    riyaChats: number
    riyaActionable: number
    riyaResolved: number
    riyaOpen: number
    riyaEscalated: number
    riyaResolutionPct: number
    allChatsCombined: number
  }
  companies: CompanySummaryRow[]
  bots: BotSheetSummary[]
  channels: ChannelMetric[]
  dailyTrend: DailyTrendRow[]
}

export const COMPANY_LABELS: Record<AiCompanyCode, string> = {
  KTAHV: 'KTAHV (Healing Village)',
  KAPPL: 'KAPPL (Ayurvedic Products)',
  VILLARAAG: 'Villa Raag (VILLARAAG)',
  KATC: 'KATC (Treatment Centres)',
}

export const ALL_COMPANY_CODES: readonly AiCompanyCode[] = [
  'KTAHV',
  'KAPPL',
  'VILLARAAG',
  'KATC',
] as const

export const BOT_META: Record<
  AiBotId,
  {
    botName: string
    shortName: string
    subtitle: string
    sqlTable: string
    primaryCompany: AiCompanyCode
    kind: AiBotKind
  }
> = {
  'priya-sharma': {
    botName: 'Priya Sharma Chat',
    shortName: 'Priya Sharma',
    subtitle: 'Main Website & Social AI Sales Assistant (KTAHV · KAPPL · KATC)',
    sqlTable: 'kairali_chatbase_leads_api_priya_sharma',
    primaryCompany: 'KTAHV',
    kind: 'lead_generation',
  },
  'product-priya-sharma': {
    botName: 'Product Priya Sharma',
    shortName: 'Product Priya',
    subtitle: 'Kairali Ayurvedic Products Website & Social AI Chat (KAPPL)',
    sqlTable: 'KAPPL_Chat_Base_Leads_API_Priya_Sharma',
    primaryCompany: 'KAPPL',
    kind: 'lead_generation',
  },
  'villaraag-anjali-menon': {
    botName: 'VillaRaag Anjali Menon',
    shortName: 'Anjali Menon (VillaRaag)',
    subtitle: 'Villa Raag Luxury Retreat Website & Social AI Chat',
    sqlTable: 'villaraag_chatbase_leads_api_anjali_menon',
    primaryCompany: 'VILLARAAG',
    kind: 'lead_generation',
  },
  'dr-aarika': {
    botName: 'Dr. Aarika Chat',
    shortName: 'Dr. Aarika',
    subtitle: 'Ayurvedic Doctor Consultation & Product Guidance AI Bot',
    sqlTable: 'Dr_Aarika_ChatBase_Leads_DB',
    primaryCompany: 'KAPPL',
    kind: 'lead_generation',
  },
  'riya-sharma': {
    botName: 'Riya Sharma Chat',
    shortName: 'Riya Sharma (Resort)',
    subtitle: 'KTAHV In-Resort Guest Concierge, Service Requests & CAPA AI',
    sqlTable: 'ktahv_capa_fms_resort_v3_urgencycorrectivefms',
    primaryCompany: 'KTAHV',
    kind: 'guest_support',
  },
}

const ALL_BOT_IDS: readonly AiBotId[] = [
  'priya-sharma',
  'product-priya-sharma',
  'villaraag-anjali-menon',
  'dr-aarika',
  'riya-sharma',
] as const

export function todayIST(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function shiftDays(ymd: string, deltaDays: number): string {
  const ms = Date.parse(`${ymd}T12:00:00Z`)
  if (!Number.isFinite(ms)) return ymd
  return new Date(ms + deltaDays * 86400000).toISOString().slice(0, 10)
}

export function isValidYmd(s: string | undefined | null): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s
}

export function formatDisplayDate(ymd: string): string {
  if (!isValidYmd(ymd)) return ymd
  const d = new Date(`${ymd}T12:00:00Z`)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatINR(amount: number): string {
  const n = Number(amount) || 0
  if (n === 0) return '₹0'
  return (
    '₹' +
    Math.round(n).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })
  )
}

export function pct(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

function normPhone(raw: unknown): string {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length < 10) return ''
  const last10 = digits.slice(-10)
  // Ignore dummy all-zero or repeated single-digit placeholders
  if (/^(\d)\1{9}$/.test(last10)) return ''
  return last10
}

function normEmail(raw: unknown): string {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (!s || !s.includes('@') || s === 'na' || s === 'n/a' || s === 'none') return ''
  return s
}

export function classifyChatCompany(
  rawCompany: unknown,
  defaultCompany: AiCompanyCode
): AiCompanyCode {
  const s = String(rawCompany ?? '')
    .trim()
    .toLowerCase()
  if (!s || s === 'na' || s === 'n/a' || s.includes('error/technical') || s.includes('research')) {
    return defaultCompany
  }
  if ((s.includes('villa') && !s.includes('village')) || s.includes('raag')) {
    return 'VILLARAAG'
  }
  if (
    s.includes('product') ||
    s.includes('training institute') ||
    s.includes('kappl') ||
    s.includes('kapl')
  ) {
    return 'KAPPL'
  }
  if (
    s.includes('center') ||
    s.includes('centre') ||
    s.includes('katc') ||
    s === 'kac'
  ) {
    return 'KATC'
  }
  if (s.includes('healing village') || s.includes('ktahv') || s.includes('palakkad') || s === 'kairali') {
    return 'KTAHV'
  }
  return defaultCompany
}

export function classifyChannel(
  src: unknown,
  mailStatus: unknown,
  botType?: unknown
): string {
  const a = String(src ?? '').trim().toLowerCase()
  const b = String(mailStatus ?? '').trim().toLowerCase()
  const c = String(botType ?? '').trim().toLowerCase()

  if (a === 'whatsapp' || a === 'api' || b === 'whatsapp' || b === 'api' || c.includes('whatsapp')) {
    return 'WhatsApp'
  }
  if (a === 'instagram' || b === 'instagram') {
    return 'Instagram'
  }
  if (a === 'messenger' || a === 'facebook' || b === 'messenger' || b === 'facebook') {
    return 'Facebook'
  }
  if (a === 'playground' || b === 'playground') {
    return 'Playground'
  }
  if (a === 'widget or iframe' || a === 'web' || b === 'widget or iframe' || b === 'web' || c.includes('chatbase')) {
    return 'Website'
  }
  return 'Website'
}

export function isChatbaseEnquiry(
  sentStatus: unknown,
  phone: unknown,
  email: unknown
): boolean {
  const status = String(sentStatus ?? '').trim().toLowerCase()
  if (status.startsWith('transfer to delete')) {
    return false
  }
  if (status.startsWith('transfer to chatbase medium')) {
    return true
  }
  const hasPhone = normPhone(phone).length === 10
  const hasEmail = normEmail(email).length > 0
  return hasPhone || hasEmail
}

export function normalizeCompanyScope(input?: string | null): 'ALL' | AiCompanyCode {
  const s = String(input ?? '')
    .trim()
    .toUpperCase()
  if (!s || s === 'ALL' || s === 'ALL COMPANIES') return 'ALL'
  if (s === 'VILARAAG' || s === 'VILLARAAG' || s === 'VILLA RAAG') return 'VILLARAAG'
  if (s === 'KAPL' || s === 'KAPPL') return 'KAPPL'
  if (s === 'KAC' || s === 'KATC') return 'KATC'
  if (s === 'KTAHV') return 'KTAHV'
  return 'ALL'
}

export function resolveReportWindow(params: {
  preset?: string | null
  from?: string | null
  to?: string | null
  endDate?: string | null
  days?: number
}): { startDate: string; endDate: string; periodLabel: string } {
  const today = todayIST()
  const yesterday = shiftDays(today, -1)

  if (isValidYmd(params.from) && isValidYmd(params.to)) {
    const startDate = params.from <= params.to ? params.from : params.to
    const endDate = params.from <= params.to ? params.to : params.from
    return {
      startDate,
      endDate,
      periodLabel:
        startDate === endDate
          ? formatDisplayDate(startDate)
          : `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`,
    }
  }

  if (isValidYmd(params.endDate)) {
    const span = Math.max(1, params.days || 7)
    const startDate = shiftDays(params.endDate, -(span - 1))
    return {
      startDate,
      endDate: params.endDate,
      periodLabel:
        span === 1
          ? formatDisplayDate(params.endDate)
          : `${formatDisplayDate(startDate)} – ${formatDisplayDate(params.endDate)} (${span} Days)`,
    }
  }

  const preset = String(params.preset || 'weekly')
    .trim()
    .toLowerCase()

  if (preset === 'today') {
    return { startDate: today, endDate: today, periodLabel: `Today (${formatDisplayDate(today)})` }
  }
  if (preset === 'yesterday') {
    return {
      startDate: yesterday,
      endDate: yesterday,
      periodLabel: `Yesterday (${formatDisplayDate(yesterday)})`,
    }
  }
  if (preset === 'mtd' || preset === 'this_month') {
    const startDate = `${today.slice(0, 8)}01`
    return {
      startDate,
      endDate: today,
      periodLabel: `This Month (${formatDisplayDate(startDate)} – ${formatDisplayDate(today)})`,
    }
  }
  if (preset === 'last30') {
    const startDate = shiftDays(yesterday, -29)
    return {
      startDate,
      endDate: yesterday,
      periodLabel: `Last 30 Days (${formatDisplayDate(startDate)} – ${formatDisplayDate(yesterday)})`,
    }
  }
  if (preset === 'all') {
    return {
      startDate: '2024-01-01',
      endDate: today,
      periodLabel: `All Time (Up to ${formatDisplayDate(today)})`,
    }
  }

  // Default: Weekly (Last 7 completed days ending yesterday IST)
  const startDate = shiftDays(yesterday, -6)
  return {
    startDate,
    endDate: yesterday,
    periodLabel: `Weekly · Last 7 Days (${formatDisplayDate(startDate)} – ${formatDisplayDate(yesterday)})`,
  }
}

interface RawConversionRow {
  id: number
  dt: string
  company: string
  booking_order_id: string | null
  name_of_client: string | null
  mobile: string | null
  email: string | null
  verified_source: string | null
  is_verified: number | null
  booking_status: string | null
  booking_type: string | null
  return_id: string | null
  conversion_amount: number | string | null
  amount_after_return: number | string | null
  sales_person_name: string | null
}

function evaluateConversion(row: RawConversionRow): {
  isVerified: boolean
  isUnverified: boolean
  amount: number
  company: AiCompanyCode
} {
  const rawComp = String(row.company || 'KAPPL').trim().toUpperCase()
  const company: AiCompanyCode =
    rawComp === 'VILLARAAG' || rawComp === 'VILARAAG'
      ? 'VILLARAAG'
      : rawComp === 'KTAHV'
        ? 'KTAHV'
        : rawComp === 'KATC' || rawComp === 'KAC'
          ? 'KATC'
          : 'KAPPL'

  const status = String(row.booking_status || '').trim().toLowerCase()
  const returnId = String(row.return_id || '').trim()
  const bookingType = String(row.booking_type || '').trim().toLowerCase()

  const convAmt = Number(row.conversion_amount) || 0
  const afterRet = Number(row.amount_after_return) || 0
  const amount = company === 'KAPPL' ? (afterRet !== 0 ? afterRet : convAmt) : convAmt

  const isVerified =
    Number(row.is_verified) === 1 &&
    ((company === 'KAPPL' && returnId === '') || (company !== 'KAPPL' && status === 'confirmed'))

  const isUnverified =
    Number(row.is_verified) === 0 &&
    bookingType !== 'sample order' &&
    ((company === 'KAPPL' && returnId === '' && !['voucher', 'complimentary'].includes(status)) ||
      (company !== 'KAPPL' &&
        !['cancelled', 'booking cancelled', 'no show', 'voucher', 'complimentary'].includes(status)))

  return { isVerified, isUnverified, amount: Math.max(0, amount), company }
}

interface InternalItem {
  id: string
  botId: AiBotId
  dateTime: string
  date: string
  leadOrChatId: string
  clientName: string
  phone: string
  email: string
  company: AiCompanyCode
  rawCompany: string
  channel: string
  isEnquiry: boolean
  outcome: string
  status: string
  agentOrStaff: string
  invoiceAmount: number
  // For Riya Sharma
  isResolved: boolean
  isOpen: boolean
  isEscalated: boolean
  // Matched conversions
  verifiedConversions: number
  unverifiedConversions: number
  revenue: number
  bookingOrderId: string
}

export async function loadAiChatReportData(options: {
  preset?: string | null
  from?: string | null
  to?: string | null
  endDate?: string | null
  days?: number
  company?: string | null
  recordLimitPerBot?: number
}): Promise<AiChatReportData> {
  const { startDate, endDate, periodLabel } = resolveReportWindow(options)
  const companyScope = normalizeCompanyScope(options.company)
  const recordLimit = options.recordLimitPerBot ?? 250

  const startTs = `${startDate} 00:00:00`
  const nextDayAfterEnd = shiftDays(endDate, 1)
  const endTsExclusive = `${nextDayAfterEnd} 00:00:00`

  const pool = await getPool()

  const chatbaseSelect = (hasSrc: boolean) => `
    SELECT
      id,
      DATE_FORMAT(COALESCE(timestamp, chat_created_date_time), '%Y-%m-%d %H:%i:%s') AS dt,
      DATE_FORMAT(COALESCE(timestamp, chat_created_date_time), '%Y-%m-%d') AS d,
      COALESCE(lead_id, conversation_id, CAST(id AS CHAR)) AS ref_id,
      COALESCE(name, '') AS name,
      COALESCE(phone, '') AS phone,
      COALESCE(email, '') AS email,
      COALESCE(lead_relates_to_which_company, '') AS raw_company,
      COALESCE(sent_status, '') AS sent_status,
      COALESCE(lead_outcome, lead_category, '') AS outcome,
      COALESCE(call_status_disposition, disposition_by_agent, actual_sent_to, '') AS status_text,
      COALESCE(agent_name, '') AS agent_name,
      COALESCE(conversion_amount_as_per_invoice_created, 0) AS invoice_amt,
      COALESCE(mail_status, '') AS mail_status,
      COALESCE(chatbase_bot_whatsapp_bot, '') AS bot_col,
      ${hasSrc ? 'COALESCE(src, \'\')' : '\'\''} AS src_col
    FROM __TABLE__
    WHERE COALESCE(timestamp, chat_created_date_time) >= ?
      AND COALESCE(timestamp, chat_created_date_time) < ?
    ORDER BY COALESCE(timestamp, chat_created_date_time) DESC
  `

  const riyaSql = `
    SELECT
      id,
      DATE_FORMAT(COALESCE(stage1_chat_done_date_time, stage1_generate_date_time), '%Y-%m-%d %H:%i:%s') AS dt,
      DATE_FORMAT(COALESCE(stage1_chat_done_date_time, stage1_generate_date_time), '%Y-%m-%d') AS d,
      COALESCE(stage1_chat_id, stage1_conversation_id, CAST(id AS CHAR)) AS ref_id,
      COALESCE(stage1_name, '') AS name,
      COALESCE(stage1_phone, '') AS phone,
      COALESCE(stage1_email, '') AS email,
      COALESCE(stage1_room_number, '') AS room_no,
      COALESCE(stage1_type, 'Request') AS req_type,
      COALESCE(stage1_final_outcome, 'Actionable') AS final_outcome,
      COALESCE(stage1_category, stage1_issue_type, 'General') AS category,
      COALESCE(stage1_department, 'Front Office') AS department,
      COALESCE(NULLIF(TRIM(stage2_department_staff_action_status), ''), 'Open') AS staff_status,
      COALESCE(NULLIF(TRIM(stage2_resolved_by), ''), NULLIF(TRIM(stage2_doer_staff), ''), COALESCE(stage1_department_staff_name, '')) AS staff_name
    FROM ktahv_capa_fms_resort_v3_urgencycorrectivefms
    WHERE COALESCE(stage1_chat_done_date_time, stage1_generate_date_time) >= ?
      AND COALESCE(stage1_chat_done_date_time, stage1_generate_date_time) < ?
    ORDER BY COALESCE(stage1_chat_done_date_time, stage1_generate_date_time) DESC
  `

  // Conversions from startDate onwards so chat enquiries in [startDate, endDate] can match subsequent conversions
  const conversionsSql = `
    SELECT
      id,
      DATE_FORMAT(date_and_time, '%Y-%m-%d %H:%i:%s') AS dt,
      COALESCE(company, 'KAPPL') AS company,
      booking_order_id,
      name_of_client,
      mobile,
      email,
      verified_source,
      is_verified,
      booking_status,
      booking_type,
      return_id,
      conversion_amount,
      amount_after_return,
      sales_person_name
    FROM conversion_updates_employeewise
    WHERE date_and_time >= DATE_SUB(?, INTERVAL 1 DAY)
  `

  const [
    [priyaRows],
    [prodPriyaRows],
    [anjaliRows],
    [aarikaRows],
    [riyaRows],
    [convRows],
  ] = await Promise.all([
    pool.query<any[]>(
      chatbaseSelect(true).replace('__TABLE__', '`kairali_chatbase_leads_api_priya_sharma`'),
      [startTs, endTsExclusive]
    ),
    pool.query<any[]>(
      chatbaseSelect(true).replace('__TABLE__', '`KAPPL_Chat_Base_Leads_API_Priya_Sharma`'),
      [startTs, endTsExclusive]
    ),
    pool.query<any[]>(
      chatbaseSelect(true).replace('__TABLE__', '`villaraag_chatbase_leads_api_anjali_menon`'),
      [startTs, endTsExclusive]
    ),
    pool.query<any[]>(
      chatbaseSelect(false).replace('__TABLE__', '`Dr_Aarika_ChatBase_Leads_DB`'),
      [startTs, endTsExclusive]
    ),
    pool.query<any[]>(riyaSql, [startTs, endTsExclusive]),
    pool.query<any[]>(conversionsSql, [startTs]),
  ])

  const typedConvRows = convRows as RawConversionRow[]

  // Index conversions by normalized phone & email for O(1) attribution without double-counting
  const convByPhone = new Map<string, RawConversionRow[]>()
  const convByEmail = new Map<string, RawConversionRow[]>()
  for (const c of typedConvRows) {
    const p = normPhone(c.mobile)
    const e = normEmail(c.email)
    if (p) {
      const list = convByPhone.get(p)
      if (list) list.push(c)
      else convByPhone.set(p, [c])
    }
    if (e) {
      const list = convByEmail.get(e)
      if (list) list.push(c)
      else convByEmail.set(e, [c])
    }
  }

  const claimedConversionKeys = new Set<string>()
  const convDedupKey = (c: RawConversionRow) => {
    const ord = String(c.booking_order_id || '').trim()
    const ret = String(c.return_id || '').trim()
    return ord ? `${c.company}|${ord}|${ret}` : `id:${c.id}`
  }

  const items: InternalItem[] = []

  const ingestChatbase = (botId: AiBotId, rows: any[]) => {
    const defaultComp = BOT_META[botId].primaryCompany
    // Process chronologically (oldest chat first) so earliest touch claims conversion cleanly
    const chronological = [...rows].reverse()
    const built: InternalItem[] = []

    for (const r of chronological) {
      const company = classifyChatCompany(r.raw_company, defaultComp)
      const channel = classifyChannel(r.src_col, r.mail_status, r.bot_col)
      const isEnq = isChatbaseEnquiry(r.sent_status, r.phone, r.email)
      const p = normPhone(r.phone)
      const e = normEmail(r.email)
      const chatDay = String(r.d || '').slice(0, 10)
      const minConvDay = shiftDays(chatDay, -1)

      let verifiedCnt = 0
      let unverifiedCnt = 0
      let rev = 0
      const orderIds: string[] = []

      if (isEnq && (p || e)) {
        const candidates = [
          ...(p ? convByPhone.get(p) || [] : []),
          ...(e ? convByEmail.get(e) || [] : []),
        ]
        for (const c of candidates) {
          const cDay = String(c.dt || '').slice(0, 10)
          if (cDay && chatDay && cDay < minConvDay) continue
          const key = convDedupKey(c)
          if (claimedConversionKeys.has(key)) continue
          const evalRes = evaluateConversion(c)
          if (!evalRes.isVerified && !evalRes.isUnverified) continue
          claimedConversionKeys.add(key)
          if (evalRes.isVerified) {
            verifiedCnt++
            rev += evalRes.amount
          } else if (evalRes.isUnverified) {
            unverifiedCnt++
          }
          if (c.booking_order_id) orderIds.push(String(c.booking_order_id))
        }
      }

      // Fallback: if table itself recorded invoice conversion amount and no CRM conversion row matched
      const invAmt = Number(r.invoice_amt) || 0
      if (verifiedCnt === 0 && unverifiedCnt === 0 && invAmt > 0) {
        verifiedCnt = 1
        rev += invAmt
      }

      const rawOutcome = String(r.outcome || '').trim()
      const outcome = rawOutcome || (isEnq ? 'General Enquiry' : 'Did Not Enquire')
      const statusStr = String(r.status_text || '').trim() || (isEnq ? 'Transferred to CRM' : 'Dropped / No Contact')

      built.push({
        id: `${botId}-${r.id}`,
        botId,
        dateTime: String(r.dt || ''),
        date: chatDay,
        leadOrChatId: String(r.ref_id || r.id),
        clientName: String(r.name || '').trim() || 'Website Visitor',
        phone: String(r.phone || '').trim(),
        email: String(r.email || '').trim(),
        company,
        rawCompany: String(r.raw_company || '').trim() || COMPANY_LABELS[company],
        channel,
        isEnquiry: isEnq,
        outcome,
        status: statusStr,
        agentOrStaff: String(r.agent_name || '').trim(),
        invoiceAmount: invAmt,
        isResolved: false,
        isOpen: false,
        isEscalated: false,
        verifiedConversions: verifiedCnt,
        unverifiedConversions: unverifiedCnt,
        revenue: rev,
        bookingOrderId: orderIds.join(', '),
      })
    }

    // Push back in reverse chronological order (newest first)
    for (let i = built.length - 1; i >= 0; i--) {
      items.push(built[i])
    }
  }

  ingestChatbase('priya-sharma', priyaRows)
  ingestChatbase('product-priya-sharma', prodPriyaRows)
  ingestChatbase('villaraag-anjali-menon', anjaliRows)
  ingestChatbase('dr-aarika', aarikaRows)

  // Also check conversion_updates_employeewise inside [startDate, endDate] explicitly tagged with AI Chat verified_source
  // that were not already claimed by a chat row in the window (e.g. earlier chat converting this week)
  const unclaimedAiConversions: {
    botId: AiBotId
    company: AiCompanyCode
    date: string
    dateTime: string
    isVerified: boolean
    isUnverified: boolean
    amount: number
    row: RawConversionRow
  }[] = []

  for (const c of typedConvRows) {
    const cDay = String(c.dt || '').slice(0, 10)
    if (!cDay || cDay < startDate || cDay > endDate) continue
    const vSrc = String(c.verified_source || '').trim().toLowerCase()
    if (
      !vSrc.includes('priya') &&
      !vSrc.includes('anjali') &&
      !vSrc.includes('aarika')
    ) {
      continue
    }
    const key = convDedupKey(c)
    if (claimedConversionKeys.has(key)) continue
    const evalRes = evaluateConversion(c)
    if (!evalRes.isVerified && !evalRes.isUnverified) continue
    claimedConversionKeys.add(key)

    let botId: AiBotId = 'priya-sharma'
    if (vSrc.includes('anjali') || evalRes.company === 'VILLARAAG') {
      botId = 'villaraag-anjali-menon'
    } else if (vSrc.includes('aarika')) {
      botId = 'dr-aarika'
    }

    unclaimedAiConversions.push({
      botId,
      company: evalRes.company,
      date: cDay,
      dateTime: String(c.dt || ''),
      isVerified: evalRes.isVerified,
      isUnverified: evalRes.isUnverified,
      amount: evalRes.isVerified ? evalRes.amount : 0,
      row: c,
    })
  }

  // Ingest Riya Sharma (In-Resort Guest Support - KTAHV)
  for (const r of riyaRows) {
    const chatDay = String(r.d || '').slice(0, 10)
    const reqType = String(r.req_type || 'Request').trim()
    const finalOutcome = String(r.final_outcome || '').trim().toLowerCase()
    const isActionable =
      finalOutcome === 'actionable' ||
      ['request', 'complaint', 'emergency'].includes(reqType.toLowerCase())

    const staffStatus = String(r.staff_status || 'Open').trim()
    const statusLower = staffStatus.toLowerCase()
    const isResolved = statusLower === 'resolved' || statusLower === 'closed' || statusLower === 'completed'
    const isEscalated = statusLower.includes('escalat')
    const isOpen = isActionable && !isResolved

    const roomLabel = r.room_no ? ` (Room ${r.room_no})` : ''

    items.push({
      id: `riya-sharma-${r.id}`,
      botId: 'riya-sharma',
      dateTime: String(r.dt || ''),
      date: chatDay,
      leadOrChatId: String(r.ref_id || r.id),
      clientName: (String(r.name || '').trim() || 'Resort Guest') + roomLabel,
      phone: String(r.phone || '').trim(),
      email: String(r.email || '').trim(),
      company: 'KTAHV',
      rawCompany: 'KTAHV Resort',
      channel: 'In-Resort Guest Chat',
      isEnquiry: isActionable,
      outcome: `${reqType}: ${String(r.category || 'General').trim()}`,
      status: staffStatus,
      agentOrStaff: `${String(r.department || 'Front Office').trim()}${r.staff_name ? ' · ' + r.staff_name : ''}`,
      invoiceAmount: 0,
      isResolved: isActionable && isResolved,
      isOpen,
      isEscalated,
      verifiedConversions: 0,
      unverifiedConversions: 0,
      revenue: 0,
      bookingOrderId: '',
    })
  }

  // Apply company scope filter
  const scopedItems =
    companyScope === 'ALL' ? items : items.filter((x) => x.company === companyScope)
  const scopedExtraConv =
    companyScope === 'ALL'
      ? unclaimedAiConversions
      : unclaimedAiConversions.filter((x) => x.company === companyScope)

  // Build Bot Summaries
  const bots: BotSheetSummary[] = ALL_BOT_IDS.map((botId) => {
    const meta = BOT_META[botId]
    const botItems = scopedItems.filter((x) => x.botId === botId)
    const botExtra = scopedExtraConv.filter((x) => x.botId === botId)

    const totalChats = botItems.length
    const enquiries = botItems.filter((x) => x.isEnquiry).length
    const droppedChats = totalChats - enquiries

    const verifiedConversions =
      botItems.reduce((s, x) => s + x.verifiedConversions, 0) +
      botExtra.filter((x) => x.isVerified).length
    const unverifiedConversions =
      botItems.reduce((s, x) => s + x.unverifiedConversions, 0) +
      botExtra.filter((x) => x.isUnverified).length
    const totalConversions = verifiedConversions + unverifiedConversions
    const revenue =
      botItems.reduce((s, x) => s + x.revenue, 0) +
      botExtra.reduce((s, x) => s + x.amount, 0)

    const resolvedTickets = botItems.filter((x) => x.isResolved).length
    const openTickets = botItems.filter((x) => x.isOpen).length
    const escalatedTickets = botItems.filter((x) => x.isEscalated).length

    // Channel breakdown
    const channelMap = new Map<
      string,
      { chats: number; enquiries: number; conversions: number; verified: number; revenue: number }
    >()
    for (const x of botItems) {
      const cur = channelMap.get(x.channel) || {
        chats: 0,
        enquiries: 0,
        conversions: 0,
        verified: 0,
        revenue: 0,
      }
      cur.chats++
      if (x.isEnquiry) cur.enquiries++
      cur.conversions += x.verifiedConversions + x.unverifiedConversions
      cur.verified += x.verifiedConversions
      cur.revenue += x.revenue
      channelMap.set(x.channel, cur)
    }
    if (botExtra.length > 0) {
      const cur = channelMap.get('Website') || {
        chats: 0,
        enquiries: 0,
        conversions: 0,
        verified: 0,
        revenue: 0,
      }
      for (const ex of botExtra) {
        cur.conversions++
        if (ex.isVerified) {
          cur.verified++
          cur.revenue += ex.amount
        }
      }
      channelMap.set('Website', cur)
    }

    const channels: ChannelMetric[] = [...channelMap.entries()]
      .map(([channel, v]) => ({
        channel,
        chats: v.chats,
        enquiries: v.enquiries,
        enquiryPct: pct(v.enquiries, v.chats),
        conversions: v.conversions,
        verifiedConversions: v.verified,
        conversionPct: pct(v.conversions, v.enquiries || v.chats),
        revenue: v.revenue,
      }))
      .sort((a, b) => b.chats - a.chats || b.conversions - a.conversions)

    // Company breakdown within bot
    const compCodes = companyScope === 'ALL' ? ALL_COMPANY_CODES : [companyScope]
    const companies = compCodes
      .map((code) => {
        const cItems = botItems.filter((x) => x.company === code)
        const cExtra = botExtra.filter((x) => x.company === code)
        const cChats = cItems.length
        const cEnq = cItems.filter((x) => x.isEnquiry).length
        const cVer =
          cItems.reduce((s, x) => s + x.verifiedConversions, 0) +
          cExtra.filter((x) => x.isVerified).length
        const cUnver =
          cItems.reduce((s, x) => s + x.unverifiedConversions, 0) +
          cExtra.filter((x) => x.isUnverified).length
        const cConv = cVer + cUnver
        const cRev =
          cItems.reduce((s, x) => s + x.revenue, 0) +
          cExtra.reduce((s, x) => s + x.amount, 0)
        return {
          company: code,
          companyLabel: COMPANY_LABELS[code],
          chats: cChats,
          enquiries: cEnq,
          enquiryPct: pct(cEnq, cChats),
          conversions: cConv,
          verifiedConversions: cVer,
          conversionPct:
            meta.kind === 'guest_support'
              ? pct(cItems.filter((x) => x.isResolved).length, cEnq)
              : pct(cConv, cEnq),
          revenue: cRev,
        }
      })
      .filter((c) => c.chats > 0 || c.conversions > 0)

    // Top outcomes
    const outcomeMap = new Map<string, number>()
    for (const x of botItems) {
      outcomeMap.set(x.outcome, (outcomeMap.get(x.outcome) || 0) + 1)
    }
    const topOutcomes: OutcomeMetric[] = [...outcomeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([outcome, count]) => ({
        outcome,
        count,
        pct: pct(count, totalChats),
      }))

    const recentRecords: ChatSheetRecord[] = botItems.slice(0, recordLimit).map((x) => ({
      id: x.id,
      botId: x.botId,
      botName: meta.botName,
      dateTime: x.dateTime,
      date: x.date,
      leadOrChatId: x.leadOrChatId,
      clientName: x.clientName,
      phone: x.phone,
      email: x.email,
      company: x.company,
      rawCompany: x.rawCompany,
      channel: x.channel,
      isEnquiry: x.isEnquiry,
      outcome: x.outcome,
      status: x.status,
      agentOrStaff: x.agentOrStaff,
      isConverted: x.verifiedConversions + x.unverifiedConversions > 0 || x.isResolved,
      isVerifiedConversion: x.verifiedConversions > 0,
      conversionAmount: x.revenue,
      bookingOrderId: x.bookingOrderId,
    }))

    return {
      botId,
      botName: meta.botName,
      shortName: meta.shortName,
      subtitle: meta.subtitle,
      sqlTable: meta.sqlTable,
      primaryCompany: meta.primaryCompany,
      kind: meta.kind,
      totalChats,
      droppedChats,
      enquiries,
      enquiryPct: pct(enquiries, totalChats),
      verifiedConversions,
      unverifiedConversions,
      totalConversions,
      enquiryToConversionPct: pct(totalConversions, enquiries),
      chatToConversionPct: pct(totalConversions, totalChats),
      revenue,
      resolvedTickets,
      openTickets,
      escalatedTickets,
      resolutionPct: pct(resolvedTickets, enquiries),
      channels,
      companies,
      topOutcomes,
      recentRecords,
    }
  })

  // Build Company-Wise Consolidated Summary
  const targetCompanies = companyScope === 'ALL' ? ALL_COMPANY_CODES : [companyScope]
  const companies: CompanySummaryRow[] = targetCompanies.map((code) => {
    const compLeadItems = scopedItems.filter(
      (x) => x.company === code && BOT_META[x.botId].kind === 'lead_generation'
    )
    const compExtra = scopedExtraConv.filter((x) => x.company === code)
    const compSupportItems = scopedItems.filter(
      (x) => x.company === code && BOT_META[x.botId].kind === 'guest_support'
    )

    const leadChats = compLeadItems.length
    const enquiries = compLeadItems.filter((x) => x.isEnquiry).length
    const droppedChats = leadChats - enquiries

    const verifiedConversions =
      compLeadItems.reduce((s, x) => s + x.verifiedConversions, 0) +
      compExtra.filter((x) => x.isVerified).length
    const unverifiedConversions =
      compLeadItems.reduce((s, x) => s + x.unverifiedConversions, 0) +
      compExtra.filter((x) => x.isUnverified).length
    const totalConversions = verifiedConversions + unverifiedConversions
    const revenue =
      compLeadItems.reduce((s, x) => s + x.revenue, 0) +
      compExtra.reduce((s, x) => s + x.amount, 0)

    const guestSupportChats = compSupportItems.length
    const guestActionable = compSupportItems.filter((x) => x.isEnquiry).length
    const guestResolved = compSupportItems.filter((x) => x.isResolved).length
    const guestOpen = compSupportItems.filter((x) => x.isOpen).length
    const guestEscalated = compSupportItems.filter((x) => x.isEscalated).length

    const subBots: CompanySubBotRow[] = ALL_BOT_IDS.map((botId) => {
      const meta = BOT_META[botId]
      const bItems = scopedItems.filter((x) => x.company === code && x.botId === botId)
      const bExtra = scopedExtraConv.filter((x) => x.company === code && x.botId === botId)
      const chats = bItems.length
      const enq = bItems.filter((x) => x.isEnquiry).length
      const ver =
        bItems.reduce((s, x) => s + x.verifiedConversions, 0) +
        bExtra.filter((x) => x.isVerified).length
      const unver =
        bItems.reduce((s, x) => s + x.unverifiedConversions, 0) +
        bExtra.filter((x) => x.isUnverified).length
      const totConv = ver + unver
      const rev =
        bItems.reduce((s, x) => s + x.revenue, 0) + bExtra.reduce((s, x) => s + x.amount, 0)
      const resolved = bItems.filter((x) => x.isResolved).length
      const open = bItems.filter((x) => x.isOpen).length
      const escalated = bItems.filter((x) => x.isEscalated).length

      return {
        botId,
        botName: meta.botName,
        kind: meta.kind,
        chats,
        droppedChats: chats - enq,
        enquiries: enq,
        enquiryPct: pct(enq, chats),
        verifiedConversions: ver,
        unverifiedConversions: unver,
        totalConversions: totConv,
        enquiryToConversionPct: pct(totConv, enq),
        chatToConversionPct: pct(totConv, chats),
        revenue: rev,
        resolvedTickets: resolved,
        openTickets: open,
        escalatedTickets: escalated,
        resolutionPct: pct(resolved, enq),
      }
    }).filter((b) => b.chats > 0 || b.totalConversions > 0)

    return {
      company: code,
      companyLabel: COMPANY_LABELS[code],
      leadChats,
      droppedChats,
      enquiries,
      enquiryPct: pct(enquiries, leadChats),
      verifiedConversions,
      unverifiedConversions,
      totalConversions,
      enquiryToConversionPct: pct(totalConversions, enquiries),
      chatToConversionPct: pct(totalConversions, leadChats),
      revenue,
      guestSupportChats,
      guestActionable,
      guestResolved,
      guestOpen,
      guestEscalated,
      guestResolutionPct: pct(guestResolved, guestActionable),
      totalAllChats: leadChats + guestSupportChats,
      bots: subBots,
    }
  })

  // Consolidated Channel Breakdown (Lead Generation Bots + In-Resort Chat)
  const globalChannelMap = new Map<
    string,
    { chats: number; enquiries: number; conversions: number; verified: number; revenue: number }
  >()
  for (const x of scopedItems) {
    const cur = globalChannelMap.get(x.channel) || {
      chats: 0,
      enquiries: 0,
      conversions: 0,
      verified: 0,
      revenue: 0,
    }
    cur.chats++
    if (x.isEnquiry) cur.enquiries++
    cur.conversions += x.verifiedConversions + x.unverifiedConversions
    cur.verified += x.verifiedConversions
    cur.revenue += x.revenue
    globalChannelMap.set(x.channel, cur)
  }
  for (const ex of scopedExtraConv) {
    const cur = globalChannelMap.get('Website') || {
      chats: 0,
      enquiries: 0,
      conversions: 0,
      verified: 0,
      revenue: 0,
    }
    cur.conversions++
    if (ex.isVerified) {
      cur.verified++
      cur.revenue += ex.amount
    }
    globalChannelMap.set('Website', cur)
  }
  const channels: ChannelMetric[] = [...globalChannelMap.entries()]
    .map(([channel, v]) => ({
      channel,
      chats: v.chats,
      enquiries: v.enquiries,
      enquiryPct: pct(v.enquiries, v.chats),
      conversions: v.conversions,
      verifiedConversions: v.verified,
      conversionPct: pct(v.conversions, v.enquiries || v.chats),
      revenue: v.revenue,
    }))
    .sort((a, b) => b.chats - a.chats)

  // Daily trend
  const dayMap = new Map<string, DailyTrendRow>()
  for (const x of scopedItems) {
    if (!x.date) continue
    const row = dayMap.get(x.date) || {
      date: x.date,
      chats: 0,
      enquiries: 0,
      conversions: 0,
      riyaChats: 0,
      riyaResolved: 0,
    }
    if (x.botId === 'riya-sharma') {
      row.riyaChats++
      if (x.isResolved) row.riyaResolved++
    } else {
      row.chats++
      if (x.isEnquiry) row.enquiries++
      row.conversions += x.verifiedConversions + x.unverifiedConversions
    }
    dayMap.set(x.date, row)
  }
  for (const ex of scopedExtraConv) {
    if (!ex.date) continue
    const row = dayMap.get(ex.date) || {
      date: ex.date,
      chats: 0,
      enquiries: 0,
      conversions: 0,
      riyaChats: 0,
      riyaResolved: 0,
    }
    row.conversions++
    dayMap.set(ex.date, row)
  }
  const dailyTrend = [...dayMap.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 31)

  const leadChats = companies.reduce((s, c) => s + c.leadChats, 0)
  const droppedChats = companies.reduce((s, c) => s + c.droppedChats, 0)
  const enquiries = companies.reduce((s, c) => s + c.enquiries, 0)
  const verifiedConversions = companies.reduce((s, c) => s + c.verifiedConversions, 0)
  const unverifiedConversions = companies.reduce((s, c) => s + c.unverifiedConversions, 0)
  const totalConversions = verifiedConversions + unverifiedConversions
  const revenue = companies.reduce((s, c) => s + c.revenue, 0)

  const riyaBot = bots.find((b) => b.botId === 'riya-sharma')!
  const riyaChats = riyaBot.totalChats
  const riyaActionable = riyaBot.enquiries
  const riyaResolved = riyaBot.resolvedTickets
  const riyaOpen = riyaBot.openTickets
  const riyaEscalated = riyaBot.escalatedTickets

  return {
    startDate,
    endDate,
    periodLabel,
    companyScope,
    generatedAt: new Date().toISOString(),
    totals: {
      leadChats,
      droppedChats,
      enquiries,
      enquiryPct: pct(enquiries, leadChats),
      verifiedConversions,
      unverifiedConversions,
      totalConversions,
      enquiryToConversionPct: pct(totalConversions, enquiries),
      chatToConversionPct: pct(totalConversions, leadChats),
      revenue,
      riyaChats,
      riyaActionable,
      riyaResolved,
      riyaOpen,
      riyaEscalated,
      riyaResolutionPct: pct(riyaResolved, riyaActionable),
      allChatsCombined: leadChats + riyaChats,
    },
    companies,
    bots,
    channels,
    dailyTrend,
  }
}

function escHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return ch
    }
  })
}

export function renderAiChatWeeklyEmailHtml(
  report: AiChatReportData,
  options?: {
    appUrl?: string
    includeDetails?: boolean
  }
): string {
  const appUrl = (options?.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://staging-kairali-crm.vercel.app').replace(/\/+$/, '')
  const includeDetails = options?.includeDetails !== false
  const t = report.totals
  const scopeText =
    report.companyScope === 'ALL'
      ? 'All Companies (KTAHV · KAPPL · Villa Raag · KATC)'
      : COMPANY_LABELS[report.companyScope]

  const companyRowsHtml = report.companies
    .map(
      (c, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding:11px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a;">${escHtml(c.companyLabel)}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#1e293b;">${c.leadChats.toLocaleString('en-IN')}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0369a1;">${c.enquiries.toLocaleString('en-IN')}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#0f766e;font-weight:600;">${c.enquiryPct.toFixed(1)}%</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#15803d;">${c.totalConversions.toLocaleString('en-IN')}${c.unverifiedConversions > 0 ? ` <span style="font-size:11px;font-weight:500;color:#64748b;">(${c.verifiedConversions}V + ${c.unverifiedConversions}P)</span>` : ''}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#15803d;">${c.enquiryToConversionPct.toFixed(1)}%</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#475569;">${c.chatToConversionPct.toFixed(1)}%</td>
        <td style="padding:11px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a;">${escHtml(formatINR(c.revenue))}</td>
      </tr>`
    )
    .join('')

  const leadBots = report.bots.filter((b) => b.kind === 'lead_generation')
  const riyaBot = report.bots.find((b) => b.botId === 'riya-sharma')

  const botRowsHtml = leadBots
    .map(
      (b, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding:11px 12px;border-bottom:1px solid #e2e8f0;">
          <div style="font-weight:700;color:#0f172a;">${escHtml(b.botName)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${escHtml(b.subtitle)}</div>
        </td>
        <td style="padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#1e293b;">${b.totalChats.toLocaleString('en-IN')}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b;">${b.droppedChats.toLocaleString('en-IN')}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0369a1;">${b.enquiries.toLocaleString('en-IN')}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#0f766e;font-weight:600;">${b.enquiryPct.toFixed(1)}%</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#15803d;">${b.totalConversions.toLocaleString('en-IN')}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#15803d;">${b.enquiryToConversionPct.toFixed(1)}%</td>
        <td style="padding:11px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a;">${escHtml(formatINR(b.revenue))}</td>
      </tr>`
    )
    .join('')

  const channelRowsHtml = includeDetails
    ? report.channels
        .map(
          (ch, idx) => `
          <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">${escHtml(ch.channel)}</td>
            <td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${ch.chats.toLocaleString('en-IN')}</td>
            <td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#0369a1;font-weight:600;">${ch.enquiries.toLocaleString('en-IN')}</td>
            <td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${ch.enquiryPct.toFixed(1)}%</td>
            <td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#15803d;font-weight:600;">${ch.conversions.toLocaleString('en-IN')}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${escHtml(formatINR(ch.revenue))}</td>
          </tr>`
        )
        .join('')
    : ''

  const trendRowsHtml = includeDetails
    ? report.dailyTrend
        .slice(0, 7)
        .map(
          (d, idx) => `
          <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;">${escHtml(formatDisplayDate(d.date))}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${d.chats.toLocaleString('en-IN')}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#0369a1;font-weight:600;">${d.enquiries.toLocaleString('en-IN')}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#15803d;font-weight:600;">${d.conversions.toLocaleString('en-IN')}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#6d28d9;">${d.riyaChats.toLocaleString('en-IN')}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#0f766e;">${d.riyaResolved.toLocaleString('en-IN')}</td>
          </tr>`
        )
        .join('')
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Chat Weekly Consolidated Report</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:960px;margin:0 auto;padding:24px 14px;">
    <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(15,23,42,0.06);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0f2942 0%,#134e4a 100%);background-color:#0f2942;padding:26px 28px;color:#ffffff;">
        <div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#99f6e4;font-weight:700;">Kairali Group · Consolidated SQL Intelligence</div>
        <h1 style="margin:6px 0 6px;font-size:22px;font-weight:800;line-height:1.25;color:#ffffff;">AI Chat Weekly Performance Report</h1>
        <div style="font-size:13px;color:#e2e8f0;">
          <strong>Period:</strong> ${escHtml(report.periodLabel)} &nbsp;|&nbsp;
          <strong>Scope:</strong> ${escHtml(scopeText)}
        </div>
        <div style="font-size:12px;color:#cbd5e1;margin-top:4px;">
          Covers: Priya Sharma Chat · Product Priya Sharma · VillaRaag Anjali Menon · Dr. Aarika · Riya Sharma (Resort)
        </div>
      </div>

      <!--email-intro-->

      <div style="padding:22px 24px;">
        <!-- KPI Summary Table (Outlook/Gmail safe) -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;border-spacing:10px 0;margin:0 -10px 22px;">
          <tr>
            <td width="25%" valign="top" style="background:#f8fafc;border:1px solid #e2e8f0;border-top:4px solid #2563eb;border-radius:10px;padding:14px;">
              <div style="font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;">Website &amp; Social Chats</div>
              <div style="font-size:24px;font-weight:800;color:#0f172a;margin:6px 0 2px;">${t.leadChats.toLocaleString('en-IN')}</div>
              <div style="font-size:11px;color:#64748b;">Dropped without contact: ${t.droppedChats.toLocaleString('en-IN')}</div>
            </td>
            <td width="25%" valign="top" style="background:#f0f9ff;border:1px solid #bae6fd;border-top:4px solid #0284c7;border-radius:10px;padding:14px;">
              <div style="font-size:11px;text-transform:uppercase;color:#0369a1;font-weight:700;">Enquiries Generated</div>
              <div style="font-size:24px;font-weight:800;color:#0c4a6e;margin:6px 0 2px;">${t.enquiries.toLocaleString('en-IN')}</div>
              <div style="font-size:11px;color:#0369a1;font-weight:600;">Chat &rarr; Enquiry: ${t.enquiryPct.toFixed(1)}%</div>
            </td>
            <td width="25%" valign="top" style="background:#f0fdf4;border:1px solid #bbf7d0;border-top:4px solid #16a34a;border-radius:10px;padding:14px;">
              <div style="font-size:11px;text-transform:uppercase;color:#15803d;font-weight:700;">Conversions &amp; Revenue</div>
              <div style="font-size:24px;font-weight:800;color:#14532d;margin:6px 0 2px;">${t.totalConversions.toLocaleString('en-IN')} <span style="font-size:13px;font-weight:600;">(${t.enquiryToConversionPct.toFixed(1)}%)</span></div>
              <div style="font-size:11px;color:#15803d;font-weight:700;">Verified Rev: ${escHtml(formatINR(t.revenue))}</div>
            </td>
            <td width="25%" valign="top" style="background:#f5f3ff;border:1px solid #ddd6fe;border-top:4px solid #7c3aed;border-radius:10px;padding:14px;">
              <div style="font-size:11px;text-transform:uppercase;color:#6d28d9;font-weight:700;">Riya Sharma (Resort)</div>
              <div style="font-size:24px;font-weight:800;color:#3b0764;margin:6px 0 2px;">${t.riyaChats.toLocaleString('en-IN')}</div>
              <div style="font-size:11px;color:#6d28d9;font-weight:600;">Resolved: ${t.riyaResolved}/${t.riyaActionable} (${t.riyaResolutionPct.toFixed(1)}%)</div>
            </td>
          </tr>
        </table>

        <!-- Section 1: Company-Wise Summary -->
        <h2 style="margin:6px 0 10px;font-size:15px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.4px;">1. Company-Wise Chat &rarr; Enquiry &rarr; Conversion Summary</h2>
        <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#0f172a;color:#ffffff;">
                <th align="left" style="padding:10px 12px;font-weight:700;">Company</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Total Chats</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Enquiries</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Chat&rarr;Enq %</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Conversions</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Enq&rarr;Conv %</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Chat&rarr;Conv %</th>
                <th align="right" style="padding:10px 12px;font-weight:700;">Verified Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${companyRowsHtml}
              <tr style="background:#ecfdf5;font-weight:800;color:#0f172a;">
                <td style="padding:11px 12px;border-top:2px solid #0f766e;">GROUP TOTAL</td>
                <td align="right" style="padding:11px 10px;border-top:2px solid #0f766e;">${t.leadChats.toLocaleString('en-IN')}</td>
                <td align="right" style="padding:11px 10px;border-top:2px solid #0f766e;color:#0369a1;">${t.enquiries.toLocaleString('en-IN')}</td>
                <td align="right" style="padding:11px 10px;border-top:2px solid #0f766e;color:#0f766e;">${t.enquiryPct.toFixed(1)}%</td>
                <td align="right" style="padding:11px 10px;border-top:2px solid #0f766e;color:#15803d;">${t.totalConversions.toLocaleString('en-IN')}</td>
                <td align="right" style="padding:11px 10px;border-top:2px solid #0f766e;color:#15803d;">${t.enquiryToConversionPct.toFixed(1)}%</td>
                <td align="right" style="padding:11px 10px;border-top:2px solid #0f766e;">${t.chatToConversionPct.toFixed(1)}%</td>
                <td align="right" style="padding:11px 12px;border-top:2px solid #0f766e;">${escHtml(formatINR(t.revenue))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Section 2: Bot / Sheet-Wise Breakdown -->
        <h2 style="margin:6px 0 10px;font-size:15px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.4px;">2. AI Chatbot Sheet-Wise Performance (Lead &amp; Sales Bots)</h2>
        <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:22px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#134e4a;color:#ffffff;">
                <th align="left" style="padding:10px 12px;font-weight:700;">AI Chat Sheet</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Chats</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Dropped</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Enquiries</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Enquiry %</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Conversions</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Conv %</th>
                <th align="right" style="padding:10px 12px;font-weight:700;">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${botRowsHtml}
            </tbody>
          </table>
        </div>

        ${
          riyaBot
            ? `
        <!-- Section 3: Riya Sharma In-Resort Guest Concierge -->
        <h2 style="margin:6px 0 10px;font-size:15px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.4px;">3. Riya Sharma Chat — In-Resort Guest Concierge &amp; CAPA (KTAHV)</h2>
        <div style="overflow-x:auto;border:1px solid #ddd6fe;border-radius:10px;margin-bottom:22px;background:#faf5ff;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#4c1d95;color:#ffffff;">
                <th align="left" style="padding:10px 12px;font-weight:700;">Assistant</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Guest Chats</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Actionable Tickets</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Resolved</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Open / Pending</th>
                <th align="right" style="padding:10px 10px;font-weight:700;">Escalated</th>
                <th align="right" style="padding:10px 12px;font-weight:700;">Resolution %</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background:#ffffff;">
                <td style="padding:11px 12px;font-weight:700;color:#3b0764;">
                  Riya Sharma Chat (KTAHV Resort)
                  <div style="font-size:11px;font-weight:400;color:#64748b;">Service Requests, Complaints &amp; Guest Assistance</div>
                </td>
                <td align="right" style="padding:11px 10px;font-weight:700;">${riyaBot.totalChats.toLocaleString('en-IN')}</td>
                <td align="right" style="padding:11px 10px;font-weight:700;color:#6d28d9;">${riyaBot.enquiries.toLocaleString('en-IN')}</td>
                <td align="right" style="padding:11px 10px;font-weight:700;color:#15803d;">${riyaBot.resolvedTickets.toLocaleString('en-IN')}</td>
                <td align="right" style="padding:11px 10px;color:#b45309;font-weight:600;">${riyaBot.openTickets.toLocaleString('en-IN')}</td>
                <td align="right" style="padding:11px 10px;color:#b91c1c;font-weight:600;">${riyaBot.escalatedTickets.toLocaleString('en-IN')}</td>
                <td align="right" style="padding:11px 12px;font-weight:800;color:#15803d;">${riyaBot.resolutionPct.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>`
            : ''
        }

        ${
          includeDetails && channelRowsHtml
            ? `
        <!-- Section 4: Channel Breakdown -->
        <h2 style="margin:6px 0 10px;font-size:15px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.4px;">4. Channel-Wise Chat Performance</h2>
        <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:22px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#334155;color:#ffffff;">
                <th align="left" style="padding:9px 12px;">Channel</th>
                <th align="right" style="padding:9px 10px;">Chats</th>
                <th align="right" style="padding:9px 10px;">Enquiries / Tickets</th>
                <th align="right" style="padding:9px 10px;">Enquiry %</th>
                <th align="right" style="padding:9px 10px;">Conversions</th>
                <th align="right" style="padding:9px 12px;">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${channelRowsHtml}
            </tbody>
          </table>
        </div>`
            : ''
        }

        ${
          includeDetails && trendRowsHtml
            ? `
        <!-- Section 5: Daily Trend -->
        <h2 style="margin:6px 0 10px;font-size:15px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.4px;">5. Day-by-Day Activity Breakdown</h2>
        <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#475569;color:#ffffff;">
                <th align="left" style="padding:8px 12px;">Date</th>
                <th align="right" style="padding:8px 10px;">Lead Chats</th>
                <th align="right" style="padding:8px 10px;">Enquiries</th>
                <th align="right" style="padding:8px 10px;">Conversions</th>
                <th align="right" style="padding:8px 10px;">Riya Guest Chats</th>
                <th align="right" style="padding:8px 12px;">Riya Resolved</th>
              </tr>
            </thead>
            <tbody>
              ${trendRowsHtml}
            </tbody>
          </table>
        </div>`
            : ''
        }

        <div style="text-align:center;margin:22px 0 8px;">
          <a href="${escHtml(appUrl)}/ai-chat-reports" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:11px 22px;border-radius:8px;">Open Interactive AI Chat Reports in CRM &rarr;</a>
        </div>
      </div>

      <!--email-closing-->

      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 24px;font-size:11px;color:#64748b;text-align:center;">
        Generated live from Kairali CRM SQL Database · ${escHtml(new Date(report.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))} IST
      </div>
    </div>
  </div>
</body>
</html>`
}
