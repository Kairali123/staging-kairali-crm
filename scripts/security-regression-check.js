const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "..")

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function assertContains(file, pattern, message) {
  const text = read(file)
  const ok = pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern)
  if (!ok) {
    throw new Error(`${file}: ${message}`)
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file)
  const ok = pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern)
  if (ok) {
    throw new Error(`${file}: ${message}`)
  }
}

function filesUnder(relativePath) {
  const absolutePath = path.join(root, relativePath)
  if (fs.statSync(absolutePath).isFile()) return [relativePath]

  return fs.readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relativePath, entry.name)
    return entry.isDirectory() ? filesUnder(child) : [child]
  })
}

function assertPathsNotContain(relativePaths, pattern, message) {
  for (const file of relativePaths.flatMap(filesUnder)) {
    assertNotContains(file, pattern, message)
  }
}

function middlewareActiveApiExemptions() {
  const text = read("middleware.ts")
  const match = text.match(/^const exemptApiPaths = new Set\(\[([\s\S]*?)^\]\)/m)
  if (!match) {
    throw new Error("middleware.ts: active exemptApiPaths set was not found")
  }
  return match[1]
}

const checks = [
  () => assertContains(
    "middleware.ts",
    /const exemptApiPrefixes:\s*string\[\]\s*=\s*\[\]/,
    "meeting APIs must not be prefix-exempt from middleware auth",
  ),
  () => {
    if (/['"]\/api\/meetings['"]/.test(middlewareActiveApiExemptions())) {
      throw new Error("middleware.ts: meeting APIs must not be exact-exempt from middleware auth")
    }
  },
  () => assertContains(
    "lib/authz.ts",
    /hasAnyPermission\(user,\s*\['partners\.view'\]\)/,
    "partner APIs must require partners.view",
  ),
  () => assertContains(
    "lib/authz.ts",
    /hasAdminRole\(user,\s*'lower'\)/,
    "partner APIs must allow existing admin roles",
  ),
  ...[
    "app/api/partners/route.ts",
    "app/api/capture-partner/route.ts",
    "app/api/rejected-partners/route.ts",
    "app/api/ktahv-partners/route.ts",
  ].map((file) => () => assertContains(
    file,
    "hasPartnerAccess",
    "partner proxy routes must use the shared partner authorization helper",
  )),
  () => assertNotContains(
    "app/api/partners/route.ts",
    /body\?\.(capturedBy|\['Captured By'\]|\["Captured By"\])/,
    "partner route must not trust browser-supplied actor identity",
  ),
  () => assertNotContains(
    "app/api/capture-partner/route.ts",
    /body\?\.(capturedBy|\['Captured By'\]|\["Captured By"\])/,
    "capture-partner route must not trust browser-supplied actor identity",
  ),
  () => assertContains(
    "lib/ktahv-booking-auth.ts",
    "SELECT nbs.nb_bvs_doer",
    "KTAHV self-action checks must use the authoritative assigned owner field",
  ),
  () => assertContains(
    "lib/ktahv-booking-auth.ts",
    "hasServerActionPermission(user, \"ktahvPage\", allAction)",
    "KTAHV helper must enforce All action permissions",
  ),
  () => assertContains(
    "lib/ktahv-booking-auth.ts",
    "hasServerActionPermission(user, \"ktahvPage\", selfAction)",
    "KTAHV helper must enforce Self action permissions",
  ),
  () => assertContains(
    "app/api/ktahv-bookings/actions/payment/route.ts",
    /authorizeKtahvBookingAction\([\s\S]*"collectionSelf"[\s\S]*"collectionAll"/,
    "payment route must enforce KTAHV collection Self/All authorization",
  ),
  () => assertContains(
    "app/api/ktahv-bookings/actions/approval/route.ts",
    /authorizeKtahvBookingAction\([\s\S]*"approvalSelf"[\s\S]*"approvalAll"/,
    "approval route must enforce KTAHV approval Self/All authorization",
  ),
  () => assertContains(
    "app/api/ktahv-bookings/actions/cancellation/route.ts",
    /authorizeKtahvBookingAction\([\s\S]*"cancelSelf"[\s\S]*"cancelAll"/,
    "cancellation route must enforce KTAHV cancellation Self/All authorization",
  ),
  () => assertContains(
    "app/api/arrival-departure/route.ts",
    /arrivalFlightAll/,
    "arrival/departure route must include all-scope arrival authorization wiring",
  ),
  () => assertContains(
    "app/api/arrival-departure/route.ts",
    /departureFlightAll/,
    "arrival/departure route must include all-scope departure authorization wiring",
  ),
  () => assertContains(
    "app/api/villa-bookings/route.ts",
    /booking\?\.booking_taken_by/,
    "Villa self-action checks must use server-loaded booking_taken_by",
  ),
  () => assertContains(
    "app/api/villa-bookings/route.ts",
    /const modifier = user\.name \|\| user\.email \|\| "System"/,
    "Villa actor stamping must prefer signed session name",
  ),
  () => assertContains(
    "app/api/auth/login/route.ts",
    /\bcheckLoginRateLimit\(sourceIp,\s*email\)/,
    "login must keep rate-limit enforcement wired",
  ),
  () => assertContains(
    "app/api/auth/logout/route.ts",
    /\brevokeSessionCookieValue\(rawSession\)/,
    "logout must revoke signed session IDs",
  ),
  () => {
    if (fs.existsSync(path.join(root, "lib/security-state-db.ts"))) {
      throw new Error("lib/security-state-db.ts: app-managed database security state must stay removed")
    }
  },
  () => assertPathsNotContain(
    ["app", "lib", "middleware.ts"],
    /security-state-db|\b(?:checkLoginRateLimit|clearLoginRateLimit|revokeSessionCookieValue|verifySessionCookieValue)(?:InDatabase|WithDatabase)\b|\brecordSessionCookieValue\b|\bcrm_security(?:_[A-Za-z0-9_]+)?\b/,
    "runtime code must not depend on app-managed database security state",
  ),
  () => assertNotContains(
    "lib/session.ts",
    /security-state-db|InDatabase|WithDatabase|recordSessionCookieValue|\bcrm_security(?:_[A-Za-z0-9_]+)?\b|from\s+['"]@\/lib\/db['"]/,
    "session verification must not depend on app-managed database security-state tables",
  ),
  () => assertContains(
    "app/api/voice-proxy/route.ts",
    /type !== 'sent' && type !== 'all'/,
    "voice proxy must reject unknown upstream selector values",
  ),
  () => assertContains(
    "next.config.mjs",
    "Content-Security-Policy-Report-Only",
    "security headers must include CSP report-only rollout",
  ),
  () => assertNotContains(
    "lib/sendOtpEmail.ts",
    /writeFileSync|last_otp/i,
    "sendOtpEmail must not write OTP or credentials to disk",
  ),
  () => assertPathsNotContain(
    ["app/api"],
    /last_otp/i,
    "API routes must not read or expose last_otp files",
  ),
  () => assertContains(
    ".gitignore",
    /temp\//,
    ".gitignore must include temp/ directory",
  ),
  () => {
    if (fs.existsSync(path.join(root, "temp/last_otp.txt"))) {
      throw new Error("temp/last_otp.txt must not exist in repository")
    }
  },
]

const failures = []
for (const check of checks) {
  try {
    check()
  } catch (error) {
    failures.push(error.message)
  }
}

if (failures.length > 0) {
  console.error("Security regression check failed:")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`Security regression check passed (${checks.length} checks).`)
