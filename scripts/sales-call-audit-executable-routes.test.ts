import './setup-test-env'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import nodemailer from 'nodemailer'

import { GET as getAudit, POST as postAudit } from '../app/api/sales-call-audit/route'
import { GET as getCalls } from '../app/api/sales-call-audit/calls/route'
import { GET as getEmailData } from '../app/api/sales-call-audit/email-data/route'
import { POST as postSendEmail } from '../app/api/sales-call-audit/send-email/route'
import { GET as getCronEmail } from '../app/api/cron/sales-call-audit-daily-email/route'
import { middleware } from '../middleware'

const TEST_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-key-sales-audit-32'

function signPayload(payload: string): string {
  return createHmac('sha256', TEST_SECRET).update(payload).digest('base64url')
}

function makeSignedSessionCookie(
  user: { id?: number; email?: string; name?: string; role?: string; permissions?: string[]; employeeId?: string },
  expired = false
): string {
  const payload = {
    user: {
      id: user.id || 1,
      email: user.email || 'user@kairali.com',
      name: user.name || 'Test User',
      role: user.role || 'employee',
      permissions: user.permissions || [],
      employeeId: user.employeeId || 'EMP-001',
    },
    sid: randomUUID(),
    exp: expired ? Date.now() - 3600000 : Date.now() + 3600000,
    iat: Date.now() - 60000,
    tokenVersion: 1,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = signPayload(encoded)
  return `${encoded}.${sig}`
}

function createRequest(url: string, options: { method?: string; body?: any; cookie?: string } = {}): NextRequest {
  const headers: Record<string, string> = {}
  if (options.cookie) {
    headers.cookie = `kairali_user=${options.cookie}`
  }
  if (options.body) {
    headers['content-type'] = 'application/json'
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

test('Executable Route Handlers Suite (Sales Call Audit)', async (t) => {
  let dbShouldFail = false
  let lastCallsQuery: { sql: string; params: any[] } | null = null

  // Never reach the live HR-action Apps Script from tests.
  const gasPosts: any[] = []
  const originalFetch = global.fetch
  global.fetch = (async (url: any, init?: any) => {
    if (String(url).includes('script.google.com')) {
      gasPosts.push(JSON.parse(init?.body || '{}'))
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }
    return originalFetch(url, init)
  }) as typeof fetch
  t.after(() => {
    global.fetch = originalFetch
  })
  let dbReturnEmpty = false

  const mockDbPool = {
    query: async (sql: string, params: any[] = []) => {
      if (dbShouldFail) {
        throw new Error('Simulated MySQL Connection Failure')
      }
      if (dbReturnEmpty) {
        return [[], []]
      }

      const sqlTrim = sql.trim()

      if (sqlTrim.includes('daily_sales_reports_log_fms')) {
        return [
          [
            {
              id: 9,
              emp_id: 'K473',
              name: 'Zaki Ahmed',
              designation: 'SALES MANAGER',
              // 00:15 IST on 2 Sep = 18:45 UTC on 1 Sep: the day must be read in IST, not server time
              time_stamp: new Date('2026-09-01T18:45:00Z'),
              created_at: '2026-09-03 00:44:43',
              total_calls_audited: 6,
              good_calls: 2,
              bad_calls: 2,
              neutral: 1,
              not_related: 1,
              overall_performance: 'Bad',
              daily_fail_pass: 'FAIL',
              hr_name: 'Rupantar Rana',
            },
          ],
          [],
        ]
      }

      if (sqlTrim.includes('sales_call_audit_live_pilot_calls')) {
        lastCallsQuery = { sql: sqlTrim, params }
        const call = (id: number, overall: string | null, assessment: string, extra: Record<string, any> = {}) => ({
          id,
          call_id: `KA-20260902-${id}`,
          lead_id: `LEAD-${id}`,
          call_datetime: '2026-09-02 10:15:00',
          client: `Synthetic Client ${id}`,
          business_unit: 'KTAHV / Healing Village',
          call_stage: 'Follow-up',
          recording_drive_url: `https://drive.google.com/file/d/synthetic${id}/view`,
          crm_outcome: 'Follow-up',
          crm_notes: 'Synthetic note',
          sales_job_assessment: assessment,
          overall_performance: overall,
          overall_performance_remarks: `${overall ?? 'Not Rated'} — synthetic remark`,
          recommended_action: null,
          action_mode: null,
          followup_owner: null,
          followup_due: null,
          target_team: null,
          escalation_reason: null,
          cold_reason: null,
          remarks: null,
          what_went_wrong: null,
          suggested_solution: null,
          ...extra,
        })
        return [
          [
            call(1, 'Good', 'done_correctly'),
            call(2, 'Good', 'done_correctly'),
            call(3, 'Needs Improvement', 'partially_done'),
            call(4, 'Bad', 'not_done_correctly', { crm_outcome: 'Cold', recommended_action: 'Reopen', cold_reason: 'No Incoming Response' }),
            call(5, 'Neutral', 'neutral'),
            // Blank overall label falls back to the assessment mapping
            call(6, null, 'cannot_assess'),
          ],
          [],
        ]
      }

      return [[], []]
    },
  };

  (global as any)._sqlPool = mockDbPool

  let sentEmails: any[] = []
  let smtpShouldFail = false

  nodemailer.createTransport = (() => {
    return {
      sendMail: async (mailOptions: any) => {
        if (smtpShouldFail) {
          throw new Error('SMTP server connection timeout (535 Auth error)')
        }
        sentEmails.push(mailOptions)
        return { messageId: '<msg-id-sales-audit@kairali.com>' }
      },
    }
  }) as any

  await t.test('1. Unauthenticated and expired session requests return 401 across all 4 routes', async () => {
    const handlers = [
      () => getAudit(createRequest('http://localhost:3000/api/sales-call-audit')),
      () => postAudit(createRequest('http://localhost:3000/api/sales-call-audit', { method: 'POST', body: { id: 1 } })),
      () => getCalls(createRequest('http://localhost:3000/api/sales-call-audit/calls?record_id=9')),
      () => getEmailData(createRequest('http://localhost:3000/api/sales-call-audit/email-data')),
      () => postSendEmail(createRequest('http://localhost:3000/api/sales-call-audit/send-email', { method: 'POST', body: {} })),
    ]

    for (const h of handlers) {
      const res = await h()
      assert.equal(res.status, 401, 'Expected 401 on unauthenticated call')
      const cc = res.headers.get('cache-control') || ''
      assert.ok(cc.includes('no-store'), 'Expected no-store on 401')
    }

    const expiredCookie = makeSignedSessionCookie({ role: 'super_admin', permissions: ['all'] }, true)
    const resExpired = await getAudit(createRequest('http://localhost:3000/api/sales-call-audit', { cookie: expiredCookie }))
    assert.equal(resExpired.status, 401, 'Expected 401 on expired session')
  })

  await t.test('2. Missing permissions returns 403 Forbidden across route handlers', async () => {
    const unprivilegedCookie = makeSignedSessionCookie({ role: 'guest', permissions: [] })
    const res = await getCalls(createRequest('http://localhost:3000/api/sales-call-audit/calls?record_id=9', { cookie: unprivilegedCookie }))
    assert.equal(res.status, 403)
    const cc = res.headers.get('cache-control') || ''
    assert.ok(cc.includes('no-store'))
  })

  await t.test('3. Distinct Send Authority: write + viewAll without sales_call_audit.send is DENIED 403', async () => {
    // User holds write and viewAll, but NOT sales_call_audit.send
    const writeAndViewGroupCookie = makeSignedSessionCookie({
      role: 'manager',
      permissions: ['sales_call_audit.view', 'sales_call_audit.viewAll', 'sales_call_audit.write'],
    })

    sentEmails = []
    const req = createRequest('http://localhost:3000/api/sales-call-audit/send-email', {
      method: 'POST',
      body: {},
      cookie: writeAndViewGroupCookie,
    })
    const res = await postSendEmail(req)
    assert.equal(res.status, 403, 'Expected 403 when sales_call_audit.send is missing')
    assert.equal(sentEmails.length, 0, 'No email should be dispatched when 403 is returned')

    // User with dedicated sales_call_audit.send grant is ALLOWED
    const sendGrantCookie = makeSignedSessionCookie({
      role: 'qa_auditor',
      permissions: ['sales_call_audit.view', 'sales_call_audit.viewAll', 'sales_call_audit.send'],
    })
    const reqAllowed = createRequest('http://localhost:3000/api/sales-call-audit/send-email', {
      method: 'POST',
      body: {},
      cookie: sendGrantCookie,
    })
    const resAllowed = await postSendEmail(reqAllowed)
    assert.equal(resAllowed.status, 200, 'Expected 200 when sales_call_audit.send is held')
    assert.equal(sentEmails.length, 1, 'Email should be dispatched when authorized')
  })

  await t.test('4. Issue #60: Client-supplied tampered metrics or custom recipient is REJECTED 400', async () => {
    const adminCookie = makeSignedSessionCookie({ role: 'super_admin', permissions: ['all'] })
    sentEmails = []

    const tamperedPayloads = [
      { metrics: { teamAverageScore: 5.0 } },
      { employees: [{ id: 'FAKE-1', score: 5.0 }] },
      { to: 'attacker@outside.com' },
      { recipient: 'attacker@outside.com' },
      { reportContent: '<h1>Fake Report</h1>' },
    ]

    for (const body of tamperedPayloads) {
      const req = createRequest('http://localhost:3000/api/sales-call-audit/send-email', {
        method: 'POST',
        body,
        cookie: adminCookie,
      })
      const res = await postSendEmail(req)
      assert.equal(res.status, 400, 'Expected 400 Bad Request on tampered payload')
      const json = await res.json()
      assert.equal(json.success, false)
    }

    assert.equal(sentEmails.length, 0, 'No emails must be dispatched for tampered payloads')
  })

  await t.test('5. Fail-Closed: DB error, empty data, and SMTP failure return error and do not claim success', async () => {
    const adminCookie = makeSignedSessionCookie({ role: 'super_admin', permissions: ['all'] })
    sentEmails = []

    // 5a. Database Error -> 500
    dbShouldFail = true
    const reqDbErr = createRequest('http://localhost:3000/api/sales-call-audit/send-email', {
      method: 'POST',
      body: {},
      cookie: adminCookie,
    })
    const resDbErr = await postSendEmail(reqDbErr)
    assert.equal(resDbErr.status, 500)
    assert.equal(sentEmails.length, 0)
    dbShouldFail = false

    // 5b. Empty Data -> 404
    dbReturnEmpty = true
    const reqEmpty = createRequest('http://localhost:3000/api/sales-call-audit/send-email', {
      method: 'POST',
      body: {},
      cookie: adminCookie,
    })
    const resEmpty = await postSendEmail(reqEmpty)
    assert.equal(resEmpty.status, 404)
    assert.equal(sentEmails.length, 0)
    dbReturnEmpty = false

    // 5c. SMTP Failure -> 502
    smtpShouldFail = true
    const reqSmtpErr = createRequest('http://localhost:3000/api/sales-call-audit/send-email', {
      method: 'POST',
      body: {},
      cookie: adminCookie,
    })
    const resSmtpErr = await postSendEmail(reqSmtpErr)
    assert.equal(resSmtpErr.status, 502)
    const jsonSmtp = await resSmtpErr.json()
    assert.equal(jsonSmtp.success, false)
    smtpShouldFail = false
  })

  await t.test('6. Calls popup reads sales_call_audit_live_pilot_calls by exact salesperson and IST day of the daily record', async () => {
    const adminCookie = makeSignedSessionCookie({ role: 'super_admin', permissions: ['all'] })

    // record_id is required; client-supplied name/date are ignored
    const resMissing = await getCalls(createRequest('http://localhost:3000/api/sales-call-audit/calls?name=Other', { cookie: adminCookie }))
    assert.equal(resMissing.status, 400)

    lastCallsQuery = null
    const req = createRequest('http://localhost:3000/api/sales-call-audit/calls?record_id=9&name=Someone%20Else&date=01-01-2020', { cookie: adminCookie })
    const res = await getCalls(req)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)

    // Exact salesperson match, stored-IST day bounds, audited calls only, bounded
    // Set inside the mock pool, which TypeScript's narrowing cannot see
    const q = lastCallsQuery as { sql: string; params: any[] } | null
    assert.ok(q, 'calls table must be queried')
    assert.match(q.sql, /TRIM\(salesperson\) = \?/)
    assert.doesNotMatch(q.sql, /LIKE/i)
    assert.match(q.sql, /processing_status = 'Completed'/)
    assert.deepEqual(q.params, ['Zaki Ahmed', '2026-09-02 00:00:00', '2026-09-03 00:00:00', 100])

    // Per-call labels and tab groups (Needs Improvement groups with Bad)
    const byId = Object.fromEntries(json.calls.map((c: any) => [c.callId, c]))
    assert.equal(byId['KA-20260902-1'].group, 'good')
    assert.equal(byId['KA-20260902-3'].performance, 'Needs Improvement')
    assert.equal(byId['KA-20260902-3'].group, 'bad')
    assert.equal(byId['KA-20260902-4'].group, 'bad')
    assert.equal(byId['KA-20260902-5'].group, 'neutral')
    assert.equal(byId['KA-20260902-6'].performance, 'Not Rated')
    assert.equal(byId['KA-20260902-6'].group, 'not_rated')
    assert.equal(byId['KA-20260902-4'].coldReason, 'No Incoming Response')
    assert.match(byId['KA-20260902-1'].callTime, /^02 Sept? 2026, 10:15 am$/i)

    // Header counts come from the daily record (NULL-safe), not recomputed
    assert.deepEqual(
      [json.agent.totalCalls, json.agent.goodCalls, json.agent.badCalls, json.agent.neutralCalls, json.agent.notRatedCalls],
      [6, 2, 2, 1, 1]
    )
    assert.equal(json.agent.overallPerformance, 'Bad')
    assert.equal(json.agent.date, '2026-09-02')
  })

  await t.test('7. ViewSelf enforces SQL employee isolation and blocks cross-employee actions', async () => {
    const userK473Cookie = makeSignedSessionCookie({
      role: 'sales_executive',
      employeeId: 'K473',
      name: 'Zaki Ahmed',
      permissions: ['sales_call_audit.viewSelf', 'sales_call_audit.write'],
    })

    // Permitted to act on own row (id 9 is K473)
    const reqAllowed = createRequest('http://localhost:3000/api/sales-call-audit', {
      method: 'POST',
      body: { id: 9, hr_verify_status: 'Verified' },
      cookie: userK473Cookie,
    })
    const resAllowed = await postAudit(reqAllowed)
    assert.equal(resAllowed.status, 200)
    assert.equal(gasPosts.length, 1, 'HR action posts to the (stubbed) Apps Script once')
    assert.equal('avg_score' in gasPosts[0], false, 'avg_score is no longer sent')

    // User K999 attempting to act on K473 row -> 403
    const userK999Cookie = makeSignedSessionCookie({
      role: 'sales_executive',
      employeeId: 'K999',
      name: 'Other Agent',
      permissions: ['sales_call_audit.viewSelf', 'sales_call_audit.write'],
    })
    const reqDenied = createRequest('http://localhost:3000/api/sales-call-audit', {
      method: 'POST',
      body: { id: 9, hr_verify_status: 'Verified' },
      cookie: userK999Cookie,
    })
    const resDenied = await postAudit(reqDenied)
    assert.equal(resDenied.status, 403, 'Cross-employee update must be rejected with 403')
  })

  await t.test('8. All responses include private no-store cache control headers', async () => {
    const adminCookie = makeSignedSessionCookie({ role: 'super_admin', permissions: ['all'] })
    const resCalls = await getCalls(createRequest('http://localhost:3000/api/sales-call-audit/calls?record_id=9', { cookie: adminCookie }))
    const cc = resCalls.headers.get('cache-control') || ''
    assert.ok(cc.includes('private'), 'Cache-Control must contain private')
    assert.ok(cc.includes('no-store'), 'Cache-Control must contain no-store')
  })

  await t.test('9. Cron Daily Audit Email: Bearer token auth, skip on empty data, and automated dispatch', async () => {
    process.env.CRON_SECRET = 'test-cron-secret-token'
    sentEmails = []

    // 9a. Unauthorized when Authorization header is missing or wrong
    const reqNoAuth = new NextRequest('http://localhost:3000/api/cron/sales-call-audit-daily-email')
    const resNoAuth = await getCronEmail(reqNoAuth)
    assert.equal(resNoAuth.status, 401, 'Cron must require valid bearer token')

    const reqWrongAuth = new NextRequest('http://localhost:3000/api/cron/sales-call-audit-daily-email', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const resWrongAuth = await getCronEmail(reqWrongAuth)
    assert.equal(resWrongAuth.status, 401, 'Cron must reject invalid bearer token')

    // 9b. Skip send when no audit rows found for date
    dbReturnEmpty = true
    const reqEmptyDate = new NextRequest('http://localhost:3000/api/cron/sales-call-audit-daily-email?date=2026-09-01', {
      headers: { authorization: 'Bearer test-cron-secret-token' },
    })
    const resEmptyDate = await getCronEmail(reqEmptyDate)
    assert.equal(resEmptyDate.status, 200)
    const jsonEmpty = await resEmptyDate.json()
    assert.equal(jsonEmpty.skipped, true)
    assert.equal(jsonEmpty.reason, 'no-audit-rows')
    assert.equal(sentEmails.length, 0, 'No email should be dispatched when no rows exist')
    dbReturnEmpty = false

    // 9c. Successful dispatch with valid bearer token and audit data
    const reqValid = new NextRequest('http://localhost:3000/api/cron/sales-call-audit-daily-email?date=2026-09-02', {
      headers: { authorization: 'Bearer test-cron-secret-token' },
    })
    const resValid = await getCronEmail(reqValid)
    assert.equal(resValid.status, 200)
    const jsonValid = await resValid.json()
    assert.equal(jsonValid.success, true)
    assert.equal(jsonValid.skipped, false)
    assert.equal(jsonValid.smtpDispatched, true)
    assert.equal(sentEmails.length, 1, 'Cron must successfully dispatch email')
    assert.ok(sentEmails[0].html.includes('Agent-wise Call Audit Report'))
    assert.ok(sentEmails[0].html.includes('Zaki Ahmed'))
  })

  await t.test('10. Middleware session boundary allows cron endpoint without session cookie', async () => {
    const cronReq = new NextRequest('http://localhost:3000/api/cron/sales-call-audit-daily-email')
    const res = await middleware(cronReq)
    assert.equal(res.status, 200, 'Middleware should pass through cron request without session')
    assert.notEqual(res.status, 401, 'Middleware must not block cron endpoint with 401')

    // Non-exempt endpoint without session is still blocked with 401
    const protectedReq = new NextRequest('http://localhost:3000/api/cron/other-unexempt-endpoint')
    const resProtected = await middleware(protectedReq)
    assert.equal(resProtected.status, 401, 'Middleware must block non-exempt endpoint')
  })
})

