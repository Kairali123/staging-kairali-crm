import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

const checks = []

function check(name, pass, details = '') {
  checks.push({ name, pass: Boolean(pass), details })
}

function contains(file, pattern) {
  const text = read(file)
  return typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text)
}

function routeHas(file, patterns) {
  const text = read(file)
  return patterns.every(pattern => typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text))
}

const middleware = read('middleware.ts')
const activeExemptPathMatch = middleware.match(/^const exemptApiPaths = new Set\(\[([\s\S]*?)^\]\)/m)
const activeExemptPrefixMatch = middleware.match(/^const exemptApiPrefixes:\s*string\[\]\s*=\s*\[([\s\S]*?)^\]/m)
const activeExemptPaths = activeExemptPathMatch?.[1] || ''
const activeExemptPrefixes = activeExemptPrefixMatch?.[1] || ''
check('middleware no longer exempts /api/meetings exactly', !/['"`]\/api\/meetings['"`]/.test(activeExemptPaths))
check('middleware no longer exempts /api/meetings prefix', !/['"`]\/api\/meetings\/['"`]/.test(activeExemptPrefixes))
check('middleware audits denied access', middleware.includes('recordSecurityEvent'))

const nextConfig = read('next.config.mjs')
for (const header of [
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Content-Security-Policy-Report-Only',
  'Strict-Transport-Security',
]) {
  check(`security header configured: ${header}`, nextConfig.includes(header))
}

const session = read('lib/session.ts')
check('session cookies carry server-generated sid', session.includes('randomUUID()') && session.includes('sid:'))
check('session cookies carry embedded expiry', session.includes('exp:') && session.includes('Date.now() > payload.exp'))
check('session verification uses timing-safe signature comparison', session.includes('timingSafeEqual'))
check('legacy sid-less cookies rejected by default', session.includes('CRM_ALLOW_LEGACY_SESSION_COOKIES') && /payload\.sid[\s\S]{0,140}CRM_ALLOW_LEGACY_SESSION_COOKIES/.test(session))

check('login route rate-limits attempts', contains('app/api/auth/login/route.ts', 'checkLoginRateLimit'))
check('login route records security audit events', contains('app/api/auth/login/route.ts', 'recordSecurityEvent'))
check('login route has provider-backed MFA enforcement hook', contains('app/api/auth/login/route.ts', 'isMfaRequired() && !isMfaSatisfied(finalUser)'))

check('audit events support central webhook forwarding', contains('lib/security-audit.ts', 'CRM_SECURITY_AUDIT_WEBHOOK_URL'))

const highRiskRoutes = [
  ['account tracker', 'app/api/account-tracker/route.ts', ['getSessionUser', 'hasAccountsTrackerAccess']],
  ['bot lookup', 'app/api/bot-lookup/route.ts', ['getSessionUser']],
  ['bot lookup recent', 'app/api/bot-lookup/recent/route.ts', ['getSessionUser']],
  ['doctor calendar', 'app/api/doctor/calendar/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['doctor consultations', 'app/api/doctor/consultations/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['doctor consultation update', 'app/api/doctor/consultations/[id]/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['doctor consultation stages', 'app/api/doctor/consultations/[id]/stages/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['doctor history', 'app/api/doctor/history/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['doctor history export', 'app/api/doctor/history/export/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['doctor KPIs', 'app/api/doctor/kpis/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['prescription create', 'app/api/prescriptions/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['prescription read', 'app/api/prescriptions/[id]/route.ts', ['getSessionUser', 'hasDoctorConsultationAccess']],
  ['support ticket create', 'app/api/support-tickets/route.ts', ['getSessionUser']],
  ['support my tickets', 'app/api/support-tickets/my-tickets/route.ts', ['getSessionUser']],
  ['Gemini follow-up generation', 'app/api/generate-followup/route.ts', ['getSessionUser', 'hasDealAssistantAccess']],
  ['partner proxy', 'app/api/partners/route.ts', ['getSessionUser', 'hasPartnerAccess']],
  ['rejected partner proxy', 'app/api/rejected-partners/route.ts', ['getSessionUser', 'hasPartnerAccess']],
  ['capture partner proxy', 'app/api/capture-partner/route.ts', ['getSessionUser', 'hasPartnerAccess']],
  ['KTAHV payment', 'app/api/ktahv-bookings/actions/payment/route.ts', ['authorizeKtahvBookingAction', 'collectionSelf']],
  ['KTAHV approval', 'app/api/ktahv-bookings/actions/approval/route.ts', ['authorizeKtahvBookingAction', 'approvalSelf']],
  ['KTAHV cancellation', 'app/api/ktahv-bookings/actions/cancellation/route.ts', ['authorizeKtahvBookingAction', 'cancelSelf']],
  ['arrival/departure', 'app/api/arrival-departure/route.ts', ['authorizeKtahvBookingAction']],
  ['Villa bookings', 'app/api/villa-bookings/route.ts', ['hasServerActionPermission', 'booking_taken_by']],
  ['received leads transfer', 'app/api/received-leads/transfer/route.ts', ['getSessionUserResult', 'hasReceivedLeadsAccess']],
  ['received leads feedback', 'app/api/received-leads/feedback/route.ts', ['getSessionUserResult', 'hasReceivedLeadsAccess']],
  ['deal follow-up marker', 'app/api/mark-followed-up/route.ts', ['getSessionUser', 'hasDealAssistantAccess']],
]

for (const [name, file, patterns] of highRiskRoutes) {
  check(`${name} route has server-side authz gate`, routeHas(file, patterns))
}

check('meeting save stamps recorder from signed session', routeHas('app/api/meetings/save/route.ts', ['recorded_by = session.email', 'recorded_by_name = session.name']))
check('meeting audio validates ownership before proxying', routeHas('app/api/meetings/audio/route.ts', ['getMeetingSession', 'canAccessMeetingOwner']))
check('meeting upload sessions are owner-bound', routeHas('lib/meeting-upload-sessions.ts', ['ownerEmail', 'isMeetingUploadSessionOwner', 'isMeetingUploadedFileOwner']))

check(
  'support ticket history no longer trusts browser userId query',
  !read('components/bot-widget/ChatWidget.tsx').includes('support-tickets/my-tickets?userId='),
)
check(
  'support ticket creation uses signed session identity',
  !/userId\s*\|\|\s*null|userName\s*\|\|\s*null/.test(read('app/api/support-tickets/route.ts')),
)

const apiRoot = path.join(root, 'app/api')
const apiFiles = fs.readdirSync(apiRoot, { recursive: true })
  .filter(file => String(file).endsWith('route.ts'))
  .map(file => path.join('app/api', String(file)).replaceAll(path.sep, '/'))

const wildcardCors = apiFiles.filter(file => /Access-Control-Allow-Origin['"`]?\s*,\s*['"`]\*/.test(read(file)))
check('no API route sets wildcard Access-Control-Allow-Origin', wildcardCors.length === 0, wildcardCors.join(', '))

check('sendOtpEmail does not write OTP to disk', !/writeFileSync|last_otp/i.test(read('lib/sendOtpEmail.ts')))
check('no API route exposes or reads last_otp', !apiFiles.some(file => /last_otp/i.test(read(file))))
check('debug OTP route is disabled', contains('app/api/db-access/get-last-otp-debug/route.ts', 'disabled for security'))

const failures = checks.filter(item => !item.pass)

for (const item of checks) {
  const prefix = item.pass ? 'PASS' : 'FAIL'
  console.log(`${prefix} ${item.name}${item.details ? ` (${item.details})` : ''}`)
}

if (failures.length > 0) {
  console.error(`\n${failures.length} security static check(s) failed.`)
  process.exit(1)
}

console.log(`\n${checks.length} security static checks passed.`)
