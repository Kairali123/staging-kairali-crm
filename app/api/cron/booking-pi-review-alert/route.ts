/**
 * /api/cron/booking-pi-review-alert
 *
 * Runs daily at 18:30 IST (13:00 UTC) — vercel.json: "0 13 * * *"
 *
 * Logic:
 *  1. Load today's Booking PI review status from DB
 *  2. Build the HTML email summarising:
 *       - Total PIs today
 *       - Reviewed Yes count
 *       - Reviewed No count
 *       - Pending (not yet actioned) count
 *  3. Send the email via SMTP (same transport as other email triggers)
 *  4. If any booking PIs are still Pending (no review action taken at all)
 *     → create a help ticket via the configured Google Form (helpdesk_config)
 *       for EACH pending item so that Accounts team is alerted
 *
 * Authorization: Vercel CRON_SECRET header OR local worker key.
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'
import { getPool } from '@/lib/db'
import { marketingMailConfig } from '@/lib/marketing-report-email'
import { loadBookingPIReviewAlertData } from '@/lib/email-triggers/load-booking-pi-review'
import { buildPIReviewAlertEmail } from '@/lib/email-triggers/templates/booking-pi-review-alert'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// ── Auth ──────────────────────────────────────────────────────────────────────

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const header = req.headers.get('authorization') || ''

  // 1. Vercel CRON_SECRET
  const secret = process.env.CRON_SECRET
  if (secret && safeCompare(header, `Bearer ${secret}`)) return true

  // 2. Local worker key
  try {
    const localKey = (
      await readFile(path.join(process.cwd(), '.local/email-triggers/worker.key'), 'utf8')
    ).trim()
    if (localKey.length >= 32 && safeCompare(header, `Bearer ${localKey}`)) return true
  } catch {
    // Key absent — skip
  }

  // 3. Dev mode (no secret configured) — allow locally
  if (process.env.NODE_ENV !== 'production') return true

  return false
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function istDay(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(at)
}

// ── Main handler ──────────────────────────────────────────────────────────────

async function handle(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const today  = istDay(new Date())

  // ── 1. Load review data ────────────────────────────────────────────────────
  const alertData = await loadBookingPIReviewAlertData(today, appUrl)

  const result: Record<string, any> = {
    date:        today,
    totalPIs:    alertData.totalPIs,
    reviewedYes: alertData.reviewedYes,
    reviewedNo:  alertData.reviewedNo,
    pending:     alertData.pending,
  }

  // ── 2. Build & send email ─────────────────────────────────────────────────
  const emailResult = await sendAlertEmail(alertData)
  result.email = emailResult

  // ── 3. Create help tickets for every still-pending booking PI ─────────────
  if (alertData.pending > 0) {
    const ticketResult = await createHelpTickets(alertData, today)
    result.helpTickets = ticketResult
  } else {
    result.helpTickets = { skipped: true, reason: 'No pending reviews — all PIs actioned' }
  }

  return NextResponse.json(result)
}

// ── Email sender ──────────────────────────────────────────────────────────────

async function sendAlertEmail(alertData: Awaited<ReturnType<typeof loadBookingPIReviewAlertData>>) {
  const mailCfg = marketingMailConfig()
  if (!mailCfg.configured) {
    return { sent: false, reason: 'SMTP not configured' }
  }

  const to = process.env.BOOKING_PI_ALERT_EMAIL || process.env.SMTP_FROM || mailCfg.user || ''
  if (!to) return { sent: false, reason: 'No recipient email configured (BOOKING_PI_ALERT_EMAIL)' }

  const html    = buildPIReviewAlertEmail(alertData)
  const subject = alertData.pending > 0
    ? `⚠️ [PI Review Alert] ${alertData.pending} Pending Review${alertData.pending > 1 ? 's' : ''} — ${alertData.reportDate}`
    : `✅ [PI Review] All ${alertData.totalPIs} Bookings Reviewed — ${alertData.reportDate}`

  try {
    const transport = nodemailer.createTransport({
      host:              mailCfg.host,
      port:              mailCfg.port,
      secure:            mailCfg.port === 465,
      auth:              { user: mailCfg.user!, pass: mailCfg.pass! },
      connectionTimeout: 15000,
      socketTimeout:     30000,
      disableFileAccess: true,
      disableUrlAccess:  true,
    })
    try {
      const res = await transport.sendMail({
        from:    mailCfg.user,
        to,
        subject,
        html,
        text:    subject + '\nPlease view this in an HTML-capable email client.',
        disableFileAccess: true,
        disableUrlAccess:  true,
      })
      return {
        sent:     true,
        to,
        accepted: res.accepted?.length || 0,
        rejected: res.rejected?.length || 0,
      }
    } finally {
      transport.close()
    }
  } catch (err: any) {
    console.error('[booking-pi-review-alert] email error:', err)
    return { sent: false, reason: err?.message || 'SMTP error' }
  }
}

// ── Help ticket creator ───────────────────────────────────────────────────────

async function createHelpTickets(
  alertData: Awaited<ReturnType<typeof loadBookingPIReviewAlertData>>,
  today: string
) {
  const pool = await getPool()

  // Load helpdesk config
  let config: any = null
  try {
    const [rows]: any[] = await pool.query('SELECT * FROM helpdesk_config LIMIT 1')
    if (rows && rows.length > 0) config = rows[0]
  } catch (e: any) {
    return { created: 0, skipped: 0, reason: 'helpdesk_config table error: ' + e.message }
  }

  if (!config || !config.is_active || !config.form_url) {
    return { created: 0, skipped: 0, reason: 'Helpdesk automation disabled or form_url not set' }
  }

  // Ensure booking_pi_review_tickets table exists (prevents duplicate tickets per day)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_pi_review_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reservation_id VARCHAR(100) NOT NULL,
      ticket_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_res_date (reservation_id, ticket_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {/* table may already exist */})

  let created = 0
  let skipped  = 0
  const errors: string[] = []

  // Only submit tickets for items that are truly Pending (no review at all)
  const pendingOnly = alertData.pendingItems.filter(item => item.reviewStatus === 'Pending')

  for (const item of pendingOnly) {
    // Skip if already ticketed today
    try {
      const [existing]: any[] = await pool.query(
        'SELECT id FROM booking_pi_review_tickets WHERE reservation_id = ? AND ticket_date = ?',
        [item.reservationId, today]
      )
      if (existing && existing.length > 0) { skipped++; continue }
    } catch { /* ignore */ }

    const issueText =
      `Booking PI review pending for ${today}. ` +
      `Reservation: ${item.reservationId} | PI: ${item.piNumber} | ` +
      `Guest: ${item.guest} | Sales: ${item.salesDoer} | ` +
      `Amount: ₹${item.invoiceAmount.toLocaleString('en-IN')} | ` +
      `Check-in: ${item.checkInDate || '—'}. Accounts review NOT completed by 18:30 IST.`

    try {
      const formData = new URLSearchParams()
      // Map helpdesk form fields — re-use existing field config where possible
      if (config.entry_lead_id)  formData.append(config.entry_lead_id,  item.reservationId)
      if (config.entry_name)     formData.append(config.entry_name,     item.guest)
      if (config.entry_phone)    formData.append(config.entry_phone,    '')
      if (config.entry_email)    formData.append(config.entry_email,    '')
      if (config.entry_source)   formData.append(config.entry_source,   'Booking PI Review')
      if (config.entry_company)  formData.append(config.entry_company,  'KTAHV')
      if (config.entry_issue)    formData.append(config.entry_issue,    issueText)

      const response = await fetch(config.form_url, {
        method:  'POST',
        body:    formData,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      if (response.ok) {
        await pool.query(
          'INSERT IGNORE INTO booking_pi_review_tickets (reservation_id, ticket_date) VALUES (?, ?)',
          [item.reservationId, today]
        )
        created++
      } else {
        errors.push(`${item.reservationId}: HTTP ${response.status}`)
      }
    } catch (e: any) {
      errors.push(`${item.reservationId}: ${e.message}`)
    }
  }

  return { created, skipped, pendingCount: pendingOnly.length, errors }
}

// ── Route exports ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
