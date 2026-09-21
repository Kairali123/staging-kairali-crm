import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const route = readFileSync(new URL('../app/api/order-form/route.ts', import.meta.url), 'utf8')
const security = readFileSync(new URL('../lib/order-form-security.ts', import.meta.url), 'utf8')
const policy = readFileSync(new URL('../lib/order-form-policy.ts', import.meta.url), 'utf8')
const middleware = readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8')
const nextConfig = readFileSync(new URL('../next.config.mjs', import.meta.url), 'utf8')
const page = readFileSync(new URL('../app/new-order-fms/primary-order-form/page.tsx', import.meta.url), 'utf8')
const bundledIndex = readFileSync(new URL('../public/new-order-fms/primary-order-form/app/index.html', import.meta.url), 'utf8')
const migration = readFileSync(new URL('./migrate-order-form-security.mjs', import.meta.url), 'utf8')
const evidence = readFileSync(new URL('../docs/PRIMARY_ORDER_FORM_RELEASE_EVIDENCE.md', import.meta.url), 'utf8')
const migrationPath = fileURLToPath(new URL('./migrate-order-form-security.mjs', import.meta.url))

test('form and browser API stay on the authenticated CRM origin', () => {
  assert.match(page, /PRIMARY_ORDER_FORM_URL = "\/new-order-fms\/primary-order-form\/app\/index\.html"/)
  assert.doesNotMatch(page, /kappl-primary-order-form\.vercel\.app/)
  assert.match(bundledIndex, /\/new-order-fms\/primary-order-form\/app\/assets\//)
  assert.match(middleware, /pathname\.startsWith\('\/new-order-fms\/primary-order-form'\)/)
})

test('embedded form allows same-origin framing while cross-origin framing stays blocked', () => {
  assert.match(middleware, /EMBEDDED_PRIMARY_ORDER_FORM_PATH = '\/new-order-fms\/primary-order-form\/app\/'/)
  assert.match(middleware, /isEmbeddedPrimaryOrderForm[\s\S]*'SAMEORIGIN'/)
  assert.match(middleware, /frame-ancestors 'self'/)
  assert.match(nextConfig, /source: '\/new-order-fms\/primary-order-form\/app\/:path\*'/)
  assert.match(nextConfig, /X-Frame-Options', value: 'SAMEORIGIN'/)
  assert.match(nextConfig, /frame-ancestors 'self'/)
  assert.doesNotMatch(nextConfig, /X-Frame-Options', value: '\*'/)
})

test('API enforces signed identity, same origin, client marker, and action authorization', () => {
  assert.match(route, /getVerifiedOrderFormUser\(req\)/)
  assert.match(route, /isSameOriginOrderFormRequest\(req\)/)
  assert.match(route, /x-kappl-client/)
  assert.match(route, /authorizeOrderFormAction\(user, action\)/)
  assert.match(route, /'UNAUTHORIZED'/)
  assert.match(route, /'FORBIDDEN'/)
})

test('sensitive actions require edit/manage permissions and never view alone', () => {
  assert.match(policy, /findBuyer: \{ permissions: \['new-order-fms\.edit'\]/)
  assert.match(policy, /getOrder: \{ permissions: \['new-order-fms\.edit'\]/)
  assert.match(policy, /submit: \{ permissions: \['new-order-fms\.edit'\]/)
  assert.match(policy, /uploadFile: \{ permissions: \['new-order-fms\.edit'\]/)
  assert.match(policy, /syncProducts: \{ permissions: \['new-order-fms\.manage'\]/)
  assert.match(policy, /retry: \{ permissions: \['new-order-fms\.manage'\]/)
})

test('rate limits and audits use pre-provisioned shared database tables', () => {
  assert.match(security, /ON DUPLICATE KEY UPDATE request_count = request_count \+ 1/)
  assert.match(security, /INSERT INTO order_form_audit_log/)
})

test('P1 Issue #77: hot request paths execute pure DML without per-request DDL or random cleanup (fail-closed)', () => {
  assert.doesNotMatch(security, /Math\.random\(\)/)
  assert.doesNotMatch(security, /ensureOrderFormTables/)
  assert.doesNotMatch(security, /cleanupExpiredRateLimits/)
  assert.doesNotMatch(security, /\b(?:CREATE|ALTER|DROP|TRUNCATE)\s+TABLE\b/i)
  assert.doesNotMatch(security, /DELETE\s+FROM\s+order_form_rate_limits/i)
})

test('Apps Script URL and secret are server-only and safe errors are returned', () => {
  assert.match(route, /process\.env\.ORDER_FORM_APPS_SCRIPT_URL/)
  assert.match(route, /process\.env\.ORDER_FORM_APPS_SCRIPT_SECRET/)
  assert.match(route, /_serverSecret: appsScript\.secret/)
  assert.doesNotMatch(bundledIndex, /script\.google\.com/)
  assert.doesNotMatch(route, /kappl-primary-order-form\.vercel\.app/)
  assert.match(route, /url\.hostname !== 'script\.google\.com'/)
  assert.match(route, /secret\.length < 32/)
  assert.match(route, /publicUpstreamError/)
})

test('migration rollback is non-destructive and production execution is explicitly gated', () => {
  assert.doesNotMatch(migration, /DROP\s+TABLE/i)
  assert.match(migration, /ORDER_FORM_MIGRATION_APPROVAL/)
  assert.match(migration, /ORDER_FORM_RECOVERY_POINT/)
  assert.match(migration, /No schema objects or stored audit data are deleted/)
})

test('migration commands execute a safe plan/rollback and block an unapproved apply', () => {
  const cleanEnvironment = { ...process.env }
  delete cleanEnvironment.ORDER_FORM_MIGRATION_APPROVAL
  delete cleanEnvironment.ORDER_FORM_RECOVERY_POINT
  delete cleanEnvironment.ORDER_FORM_CHANGE_ID

  const plan = spawnSync(process.execPath, [migrationPath, '--plan'], { encoding: 'utf8' })
  assert.equal(plan.status, 0)
  assert.match(plan.stdout, /no cleanup or destructive rollback is included/i)

  const rollback = spawnSync(process.execPath, [migrationPath, '--down'], { encoding: 'utf8' })
  assert.equal(rollback.status, 0)
  assert.match(rollback.stdout, /No schema objects or stored audit data are deleted/)

  const apply = spawnSync(process.execPath, [migrationPath, '--up'], {
    encoding: 'utf8',
    env: cleanEnvironment,
  })
  assert.notEqual(apply.status, 0)
  assert.match(`${apply.stdout}\n${apply.stderr}`, /Migration blocked/)
})

test('release evidence does not present placeholder or localhost samples as completed proof', () => {
  assert.doesNotMatch(evidence, /DEPLOYMENT_ID/)
  assert.doesNotMatch(evidence, /"source_ip": "::1"/)
  assert.match(evidence, /PENDING — attach captured output/)
})

test('P1 Issue #100: server strictly validates statutory PIN code and PAN formats without heuristic derivation', () => {
  assert.doesNotMatch(route, /\.match\(/)
  assert.doesNotMatch(route, /\.slice\(2,\s*12\)/)
  assert.match(route, /\/\^\[1-9]\[0-9]\{5\}\$\//)
  assert.match(route, /\/\^\[A-Z]\{5\}\[0-9]\{4\}\[A-Z]\$\//)
})

test('products are synchronized directly from MySQL product_inventory table', () => {
  assert.match(route, /import\s*\{[^}]*getPool[^}]*\}\s*from\s*['"]@\/lib\/db['"]/)
  assert.match(route, /FROM\s+product_inventory/i)
  assert.match(route, /action\s*===\s*'getProducts'\s*\|\|\s*action\s*===\s*'syncProducts'/)
  assert.match(route, /const sku = String\(r\.sku/)
  assert.match(route, /price:\s*Number\(r\.price\)/)
  assert.match(route, /inventory:\s*Number\(r\.inventory\)/)
})

test('users are synchronized directly from MySQL all_users table', () => {
  assert.match(route, /FROM\s+all_users/i)
  assert.match(route, /action\s*===\s*'getUsers'/)
  assert.match(route, /all_users/i)
})

test('buyer details are synchronized directly from MySQL master_conversion_sheet_kappl_ktahv table', () => {
  assert.match(route, /FROM\s+master_conversion_sheet_kappl_ktahv/i)
  assert.match(route, /action\s*===\s*'findBuyer'/)
  assert.match(route, /name_of_client/)
  assert.match(route, /billing_address/)
  assert.match(route, /shipping_address/)
  assert.match(route, /client_category/)
})
