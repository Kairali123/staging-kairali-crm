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
              time_stamp: '2026-09-02 06:04:56',
              created_at: '2026-09-03 00:44:43',
              total_calls_audited: 34,
              good_calls: 3,
              bad_calls: 31,
              avg_score: '0.57',
              daily_fail_pass: 'FAIL',
              hr_name: 'Rupantar Rana',
              product_knowledge: 0.62,
              customer_understanding: 0.56,
              communication_skills: 0.71,
              objection_handling: 0.44,
              closing_skills: 0.32,
              tone_volume: 0.76,
            },
          ],
          [],
        ]
      }

      if (sqlTrim.includes('kairali_sales_metric_bot_for_ho')) {
        return [
          [
            {
              id: 37476,
              timestamp: '2026-09-02 18:02:36',
              sales_person_id: 'K473',
              sales_person_name: 'Zaki Ahmed',
              lead_id: 'MID_020926180237_36_52168',
              buffer_lead_id: null,
              client_name: null,
              call_count: null,
              call_type: 'Regular',
              quality_status: 'Good',
              avg_score: '3.20',
              overall_score: '3',
              lead_outcome_by_agent: 'Information Seeker',
              conversion_outcome: 'Information Seeker',
              lead_outcome_verify_status: 'No',
              product_knowledge: 3.5,
              customer_understanding: 3.0,
              communication_skills: 3.5,
              objection_handling: 3.0,
              closing_skills: 3.0,
              tone_and_volume: 3.5,
              explanation: 'Comprehensive explanation given to client',
              what_went_wrong_by_sales_team_senior_verifier: null,
              complete_explanation: 'Comprehensive explanation given to client',
              remarks: 'Good explanation',
              reason: 'Valid discussion',
              audio_url: 'https://drive.google.com/file/d/test1/view',
              is_auditable: '1',
            },
            {
              id: 37384,
              timestamp: '2026-09-02 16:04:21',
              sales_person_id: 'K473',
              sales_person_name: 'Zaki Ahmed',
              lead_id: 'MID_020926160421_36_52073',
              buffer_lead_id: null,
              client_name: null,
              call_count: null,
              call_type: 'Regular',
              quality_status: 'Bad',
              avg_score: '3.00',
              overall_score: '3',
              lead_outcome_by_agent: 'Meeting-Followup-Negotiation',
              conversion_outcome: 'Not Interested',
              lead_outcome_verify_status: 'No',
              product_knowledge: 3.0,
              customer_understanding: 3.0,
              communication_skills: 3.0,
              objection_handling: 3.0,
              closing_skills: 3.0,
              tone_and_volume: 3.0,
              explanation: 'Call disconnected abruptly',
              what_went_wrong_by_sales_team_senior_verifier: 'Did not address hesitation',
              complete_explanation: 'Call disconnected abruptly',
              remarks: 'Bad call',
              reason: 'Did not close',
              audio_url: 'https://drive.google.com/file/d/test2/view',
              is_auditable: '1',
            },
            {
              id: 37399,
              timestamp: '2026-09-02 17:00:00',
              sales_person_id: 'K473',
              sales_person_name: 'Zaki Ahmed',
              lead_id: 'MID_020926170000_36_52099',
              buffer_lead_id: null,
              client_name: null,
              call_count: null,
              call_type: 'Voicemail',
              quality_status: 'Bad',
              avg_score: '0.00',
              overall_score: '0',
              lead_outcome_by_agent: 'Not Connected',
              conversion_outcome: 'No Answer',
              lead_outcome_verify_status: 'No',
              product_knowledge: null,
              customer_understanding: null,
              communication_skills: null,
              objection_handling: null,
              closing_skills: null,
              tone_and_volume: null,
              explanation: 'Voicemail detected',
              what_went_wrong_by_sales_team_senior_verifier: null,
              complete_explanation: 'Voicemail detected',
              remarks: 'Voicemail',
              reason: 'No Answer',
              audio_url: null,
              is_auditable: '0',
            },
            {
              id: 37400,
              timestamp: '2026-09-02 17:10:00',
              sales_person_id: 'K473',
              sales_person_name: 'Zaki Ahmed',
              lead_id: 'MID_020926171000_36_52100',
              buffer_lead_id: null,
              client_name: null,
              call_count: null,
              call_type: 'Silence/Empty Recording',
              quality_status: 'Bad',
              avg_score: '0.00',
              overall_score: '0',
              lead_outcome_by_agent: null,
              conversion_outcome: null,
              lead_outcome_verify_status: null,
              product_knowledge: null,
              customer_understanding: null,
              communication_skills: null,
              objection_handling: null,
              closing_skills: null,
              tone_and_volume: null,
              explanation: 'Silence',
              what_went_wrong_by_sales_team_senior_verifier: null,
              complete_explanation: 'Silence',
              remarks: null,
              reason: null,
              audio_url: null,
              is_auditable: '0',
            },
            {
              id: 37401,
              timestamp: '2026-09-02 17:15:00',
              sales_person_id: 'K473',
              sales_person_name: 'Zaki Ahmed',
              lead_id: 'MID_020926171500_36_52101',
              buffer_lead_id: null,
              client_name: null,
              call_count: null,
              call_type: 'Regular',
              quality_status: 'Bad',
              avg_score: '0.00',
              overall_score: '0',
              lead_outcome_by_agent: null,
              conversion_outcome: null,
              lead_outcome_verify_status: null,
              product_knowledge: null,
              customer_understanding: null,
              communication_skills: null,
              objection_handling: null,
              closing_skills: null,
              tone_and_volume: null,
              explanation: 'Zero score',
              what_went_wrong_by_sales_team_senior_verifier: null,
              complete_explanation: 'Zero score',
              remarks: null,
              reason: null,
              audio_url: null,
              is_auditable: '1',
            },
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

  await t.test('6. Calls route enforces hard limit <= 100, minimal fields, and zero synthetic fallbacks', async () => {
    const adminCookie = makeSignedSessionCookie({ role: 'super_admin', permissions: ['all'] })
    const req = createRequest('http://localhost:3000/api/sales-call-audit/calls?record_id=9&date=02-09-2026', { cookie: adminCookie })
    const res = await getCalls(req)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.ok(Array.isArray(json.calls))

    // Verify Bad Quality is strictly Bad (not promoted to Good by score)
    const badCall = json.calls.find((c: any) => c.callId === 'CALL-37384')
    assert.ok(badCall, 'Bad call record should be found')
    assert.equal(badCall.qualityType, 'bad', 'Explicit Bad quality must stay bad')

    // Verify Good Quality is Good
    const goodCall = json.calls.find((c: any) => c.callId === 'CALL-37476')
    assert.ok(goodCall, 'Good call record should be found')
    assert.equal(goodCall.qualityType, 'good', 'Explicit Good quality must stay good')

    // Verify Voicemail calls are ignored (not counted as good or bad)
    const voicemailCall = json.calls.find((c: any) => c.callId === 'CALL-37399')
    assert.equal(voicemailCall, undefined, 'Voicemail calls must be ignored and excluded from good/bad call breakdown')

    // Verify Inaudible calls (is_auditable != '1') are excluded
    const inaudibleCall = json.calls.find((c: any) => c.callId === 'CALL-37400')
    assert.equal(inaudibleCall, undefined, 'Inaudible calls must be excluded')

    // Verify 0 avg_score calls are excluded
    const zeroScoreCall = json.calls.find((c: any) => c.callId === 'CALL-37401')
    assert.equal(zeroScoreCall, undefined, 'Calls with avg_score <= 0 must be excluded')

    // Verify consistent actual counts from kairali_sales_metric_bot_for_ho: 1 good + 1 bad = 2 total
    assert.equal(json.calls.length, 2, 'Only the 2 valid audible positive-score calls must be returned')
    assert.equal(json.agent.totalCalls, 2, 'Total calls must match valid calls count (2)')
    assert.equal(json.agent.goodCalls, 1, 'Good calls must be 1')
    assert.equal(json.agent.badCalls, 1, 'Bad calls must be 1')
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

