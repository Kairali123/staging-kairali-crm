import { spawnSync } from 'node:child_process'

const securityFiles = [
  'middleware.ts',
  'next.config.mjs',
  'lib/api-rate-limit.ts',
  'lib/authz.ts',
  'lib/ktahv-booking-auth.ts',
  'lib/login-rate-limit.ts',
  'lib/meeting-upload-sessions.ts',
  'lib/meetings-auth.ts',
  'lib/mfa-policy.ts',
  'lib/security-audit.ts',
  'lib/sendOtpEmail.ts',
  'lib/session.ts',
  'app/api/account-tracker/route.ts',
  'app/api/auth/login/route.ts',
  'app/api/auth/logout/route.ts',
  'app/api/arrival-departure/route.ts',
  'app/api/db-access/generate-otp/route.ts',
  'app/api/db-access/get-last-otp-debug/route.ts',
  'app/api/db-access/verify-otp/route.ts',
  'app/api/bot-lookup/route.ts',
  'app/api/bot-lookup/recent/route.ts',
  'app/api/capture-partner/route.ts',
  'app/api/doctor/calendar/route.ts',
  'app/api/doctor/consultations/route.ts',
  'app/api/doctor/consultations/[id]/route.ts',
  'app/api/doctor/consultations/[id]/stages/route.ts',
  'app/api/doctor/history/route.ts',
  'app/api/doctor/history/export/route.ts',
  'app/api/doctor/kpis/route.ts',
  'app/api/generate-followup/route.ts',
  'app/api/ktahv-bookings/actions/accounts/route.ts',
  'app/api/ktahv-bookings/actions/approval/route.ts',
  'app/api/ktahv-bookings/actions/cancellation/route.ts',
  'app/api/ktahv-bookings/actions/checkout/route.ts',
  'app/api/ktahv-bookings/actions/fo-pms/route.ts',
  'app/api/ktahv-bookings/actions/payment/route.ts',
  'app/api/mark-followed-up/route.ts',
  'app/api/meetings/[id]/route.ts',
  'app/api/meetings/audio/route.ts',
  'app/api/meetings/create-upload-session/route.ts',
  'app/api/meetings/diarize/route.ts',
  'app/api/meetings/extract-tasks/route.ts',
  'app/api/meetings/meet-participants/route.ts',
  'app/api/meetings/meet-status/route.ts',
  'app/api/meetings/process/route.ts',
  'app/api/meetings/save/route.ts',
  'app/api/meetings/tasks/route.ts',
  'app/api/meetings/transcribe/route.ts',
  'app/api/meetings/upload-audio/route.ts',
  'app/api/meetings/upload-chunk/route.ts',
  'app/api/meetings/zoom-meeting-status/route.ts',
  'app/api/meetings/zoom-participants/route.ts',
  'app/api/meetings/zoom-status/route.ts',
  'app/api/partners/route.ts',
  'app/api/pipeline/route.ts',
  'app/api/prescriptions/route.ts',
  'app/api/prescriptions/[id]/route.ts',
  'app/api/received-leads/feedback/route.ts',
  'app/api/received-leads/transfer/route.ts',
  'app/api/rejected-partners/route.ts',
  'app/api/support-tickets/route.ts',
  'app/api/support-tickets/my-tickets/route.ts',
  'app/api/villa-bookings/route.ts',
  'components/bot-widget/ChatWidget.tsx',
]

const escaped = securityFiles.map(file =>
  file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll('/', '[\\\\/]'),
)
const matcher = new RegExp(escaped.join('|'), 'i')

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const result = spawnSync(command, ['tsc', '--noEmit', '--pretty', 'false'], {
  encoding: 'utf8',
  shell: false,
})

const output = `${result.stdout || ''}${result.stderr || ''}`
const matchingLines = output
  .split(/\r?\n/)
  .filter(line => matcher.test(line))

if (matchingLines.length > 0) {
  console.error(matchingLines.join('\n'))
  console.error(`\nTOUCHED_SECURITY_FILE_ERROR_COUNT=${matchingLines.length}`)
  process.exit(1)
}

console.log('TOUCHED_SECURITY_FILE_ERROR_COUNT=0')
if (result.status !== 0) {
  console.log('Full repository typecheck still has errors outside the security-touched file set.')
}
