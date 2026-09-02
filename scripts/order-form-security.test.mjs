import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const route = readFileSync(new URL('../app/api/order-form/route.ts', import.meta.url), 'utf8')
const security = readFileSync(new URL('../lib/order-form-security.ts', import.meta.url), 'utf8')
const policy = readFileSync(new URL('../lib/order-form-policy.ts', import.meta.url), 'utf8')
const middleware = readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8')
const nextConfig = readFileSync(new URL('../next.config.mjs', import.meta.url), 'utf8')
const page = readFileSync(new URL('../app/new-order-fms/primary-order-form/page.tsx', import.meta.url), 'utf8')
const bundledIndex = readFileSync(new URL('../public/new-order-fms/primary-order-form/app/index.html', import.meta.url), 'utf8')

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

test('rate limits and audits use shared database tables', () => {
  assert.match(security, /CREATE TABLE IF NOT EXISTS order_form_rate_limits/)
  assert.match(security, /ON DUPLICATE KEY UPDATE request_count = request_count \+ 1/)
  assert.match(security, /CREATE TABLE IF NOT EXISTS order_form_audit_log/)
  assert.match(security, /INSERT INTO order_form_audit_log/)
})

test('Apps Script URL and secret are server-only and safe errors are returned', () => {
  assert.match(route, /process\.env\.ORDER_FORM_APPS_SCRIPT_URL/)
  assert.match(route, /process\.env\.ORDER_FORM_APPS_SCRIPT_SECRET/)
  assert.match(route, /_serverSecret: serverSecret/)
  assert.doesNotMatch(bundledIndex, /script\.google\.com/)
  assert.match(route, /publicUpstreamError/)
})
