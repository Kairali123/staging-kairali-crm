import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSessionUser } from '@/lib/authz'
import { marketingMailConfig, parseReportRecipients } from '@/lib/marketing-report-email'
import { checkApiRateLimit, rateLimitResponse } from '@/lib/api-rate-limit'
import { liveDoctorConsultDigest, buildDoctorConsultDigestHTML } from '@/lib/doctor-consultation-report-email'
import { fetchLiveDoctorReport, aggregateConsultationsBySource, SAMPLE_CONSULTATION_RECORDS, AVAILABLE_WEEKS } from '@/app/api/doctor/report/route'

const isoDate = /^\d{4}-\d{2}-\d{2}$/

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function POST(req: NextRequest) {
  const user = getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401, headers })
  const role = String(user?.role || '').trim().toLowerCase()
  if (role !== 'super_admin' && role !== 'super admin') return NextResponse.json({ error: 'Super administrator access required' }, { status: 403, headers })
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403, headers })
  const limit = await checkApiRateLimit(req, 'doctor-consult-report-email', user.id, 5, 60_000)
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds)

  let to: string[], periodLabel: string, company: string, weekStart: string | undefined, weekEnd: string | undefined, weekLabel: string | undefined
  try {
    const text = await req.text(); if (text.length > 5000) throw Error()
    const body = JSON.parse(text)
    to = parseReportRecipients(body.to)
    periodLabel = String(body.periodLabel || '').slice(0, 200) || 'Selected period'
    company = String(body.company || '').slice(0, 120) || 'All companies'
    weekStart = isoDate.test(body.weekStart) ? body.weekStart : undefined
    weekEnd = isoDate.test(body.weekEnd) ? body.weekEnd : undefined
    weekLabel = typeof body.weekLabel === 'string' ? body.weekLabel.slice(0, 200) : undefined
  } catch { return NextResponse.json({ error: 'Invalid request. Check recipients.' }, { status: 400, headers }) }

  const config = marketingMailConfig()
  if (!config.configured) return NextResponse.json({ error: 'Email sending is not configured. Contact an administrator.' }, { status: 503, headers })

  // Overall Cumulative is real (fetchLiveDoctorReport, backed by a manually verified
  // Google Apps Script feed). Weekly reuses the same sample-data aggregation the page's
  // own Weekly section uses for the same week the user had selected when they clicked
  // Email Digest — not GAS-sourced, same known limitation as the page. Doctors
  // Performance still has no live source at all, so it stays out of this email.
  const { rows, totals, isLive, lastSyncedAt } = await fetchLiveDoctorReport()
  const syncLabel = `${periodLabel}${isLive ? '' : ' (cached — GAS feed unreachable)'} · synced ${new Date(lastSyncedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`
  const currentWeek = AVAILABLE_WEEKS.find(w => w.isCurrent) || AVAILABLE_WEEKS[0]
  const wStart = weekStart || currentWeek?.startDate
  const wEnd = weekEnd || currentWeek?.endDate
  const weekly = wStart && wEnd ? {
    label: weekLabel || currentWeek?.shortLabel || periodLabel,
    ...aggregateConsultationsBySource(SAMPLE_CONSULTATION_RECORDS, wStart, wEnd, 'all', 'all'),
  } : undefined
  const digest = liveDoctorConsultDigest(rows, totals, syncLabel, company, weekly)
  const subject = `Doctor Consultation Report | ${periodLabel} | ${company}`
  const html = buildDoctorConsultDigestHTML(digest)

  try {
    const transport = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465, auth: { user: config.user!, pass: config.pass! }, connectionTimeout: 15000, socketTimeout: 20000, disableFileAccess: true, disableUrlAccess: true })
    const info = await transport.sendMail({ from: `Kairali Group <${config.user!}>`, to, subject, html, text: `${subject}\nThe formatted report is included in this email.`, disableFileAccess: true, disableUrlAccess: true })
    if (info.rejected?.length) return NextResponse.json({ error: 'Some recipients were rejected. Check delivery before retrying.' }, { status: 502, headers })
    return NextResponse.json({ success: true }, { headers })
  } catch { return NextResponse.json({ error: 'Delivery could not be confirmed. Check your mailbox before retrying.' }, { status: 502, headers }) }
}
