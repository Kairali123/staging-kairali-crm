import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = process.cwd()

function read(path) {
  return readFileSync(join(repoRoot, path), 'utf8')
}

function assertContains(path, expected, message) {
  const text = read(path)
  const needles = Array.isArray(expected) ? expected : [expected]
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`${path}: ${message} (missing ${JSON.stringify(needle)})`)
    }
  }
}

function assertNotContains(path, forbidden, message) {
  const text = read(path)
  const needles = Array.isArray(forbidden) ? forbidden : [forbidden]
  for (const needle of needles) {
    if (text.includes(needle)) {
      throw new Error(`${path}: ${message} (found ${JSON.stringify(needle)})`)
    }
  }
}

const guardedRoutes = [
  ['app/api/account-tracker/route.ts', ['getSessionUser', 'hasAccountsTrackerAccess']],
  ['app/api/bot-lookup/route.ts', ['getSessionUser']],
  ['app/api/bot-lookup/recent/route.ts', ['getSessionUser']],
  ['app/api/generate-followup/route.ts', ['getSessionUser', 'hasDealAssistantAccess']],
  ['app/api/prescriptions/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['app/api/prescriptions/[id]/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['app/api/support-tickets/route.ts', ['getSessionUser']],
  ['app/api/support-tickets/my-tickets/route.ts', ['getSessionUser']],
  ['app/api/doctor/calendar/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['app/api/doctor/consultations/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['app/api/doctor/consultations/[id]/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['app/api/doctor/consultations/[id]/stages/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['app/api/doctor/history/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['app/api/doctor/history/export/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['app/api/doctor/kpis/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['app/api/ktahv-bookings/actions/payment/route.ts', ['authorizeKtahvBookingAction']],
  ['app/api/ktahv-bookings/actions/approval/route.ts', ['authorizeKtahvBookingAction']],
  ['app/api/ktahv-bookings/actions/cancellation/route.ts', ['authorizeKtahvBookingAction']],
  ['app/api/arrival-departure/route.ts', ['authorizeKtahvBookingAction']],
  ['app/api/villa-bookings/route.ts', ['getSessionUser', 'hasServerActionPermission']],
  ['app/api/partners/route.ts', ['requirePartnerAccess']],
  ['app/api/capture-partner/route.ts', ['requirePartnerAccess']],
  ['app/api/rejected-partners/route.ts', ['requirePartnerAccess']],
  ['app/api/mark-followed-up/route.ts', ['getSessionUser', 'hasDealAssistantAccess']],
  ['app/api/received-leads/transfer/route.ts', ['getSessionUserResult', 'hasReceivedLeadsAccess']],
  ['app/api/received-leads/feedback/route.ts', ['getSessionUserResult', 'hasReceivedLeadsAccess']],
  ['app/api/pipeline/route.ts', ['getSessionUser', 'meetings.view']],
]

for (const [path, markers] of guardedRoutes) {
  assertContains(path, markers, 'expected route-level security guard')
}

assertNotContains(
  'components/bot-widget/ChatWidget.tsx',
  'support-tickets/my-tickets?userId=',
  'my-ticket lookup must not trust a browser-supplied userId',
)

assertNotContains(
  'app/api/support-tickets/route.ts',
  ['userId || null', 'userName || null'],
  'support ticket creator must use the signed session identity',
)

const middleware = read('middleware.ts')
const activeExemptApiPaths = middleware.match(/^const exemptApiPaths = new Set\(\[([\s\S]*?)^\]\)/m)?.[1] ?? ''
const activeExemptApiPrefixes = middleware.match(/^const exemptApiPrefixes:\s*string\[\]\s*=\s*\[([^\]]*)\]/m)?.[1] ?? ''
const activeApiExemptions = `${activeExemptApiPaths}\n${activeExemptApiPrefixes}`

if (/['"]\/api\/meetings['"]/.test(activeApiExemptions) || /['"]\/api\/meetings\/['"]/.test(activeApiExemptions)) {
  throw new Error('middleware.ts: /api/meetings must not be an active auth exemption')
}

console.log(`security-route-audit ok (${guardedRoutes.length} guarded routes checked)`)
