import './setup-test-env'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { GET as getDialShreeSent, clearDialShreeSentMemoryCache } from '../app/api/dialshree/sent/route'

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

test('Executable Route Handlers Suite (DialShree Sent Outreach)', async (t) => {
  let dbShouldFail = false
  let executedSql = ''
  let executedParams: any[] = []

  const cleanupTempCache = () => {
    clearDialShreeSentMemoryCache()
    const tmpFile = path.join(os.tmpdir(), "dialshree_sent_cache_v1.json")
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    } catch {}
  }

  cleanupTempCache()
  t.after(() => {
    cleanupTempCache()
    delete (global as any)._sqlPool
  })

  const mockDbPool = {
    getConnection: async () => {
      if (dbShouldFail) {
        throw new Error('Simulated MySQL Connection Failure')
      }
      return {
        execute: async (sql: string, params: any[] = []) => {
          executedSql = sql
          executedParams = params
          if (dbShouldFail) {
            throw new Error('Simulated Query Failure')
          }
          return [
            [
              {
                id: 101,
                timestamp: '2026-09-04 18:30:00',
                enquiry_date_time: '2026-09-04 18:30:00',
                lead_id: 'VR-101-TEST',
                name_of_client: 'Test Client',
                mobile: '+919876543210',
                email_id: 'test@example.com',
                subjects: 'Ayurvedic Retreat',
                notes: 'Inquired about Panchakarma',
                url: 'https://kairali.com/retreat',
                website_name: 'Kairali The Ayurvedic Healing Village',
                data_source: 'Online PPC Enquiry',
                assign_to: 'KTAHV SALES',
                remarks_history: 'Lead added to queue',
                sqv_lead_intent: 'High',
                campaign_name: 'KTAHV SALES',
                list_id: '240322102925',
                sqv_remarks: 'Immediate call required',
                alt_mobile: '+919876543211',
                alt_email_id: 'alt@example.com',
                geo: 'India',
                response_result: 'Sent to - Sadik Rehman',
                timestamp_sent_not_sent: '2026-09-04 18:35:00',
                action_after_getting_exception: null,
                timestamp_after_action: null,
                location: 'Delhi',
                timezone: 'Asia/Kolkata',
                utc_offset: '+05:30',
                business_hours_start: '09:00:00',
                business_hours_end: '18:00:00',
                weekdays_config: 'Mon-Sat',
                code: '+91',
                region: 'North',
                location_2: 'NCR',
                created_at: '2026-09-05 05:19:36',
                updated_at: '2026-09-05 05:19:36',
              },
            ],
            [],
          ]
        },
        release: () => {},
      }
    },
  }

  ;(global as any)._sqlPool = mockDbPool

  await t.test('1. Unauthenticated requests return 401 with no-store cache header', async () => {
    const req = createRequest('http://localhost:3000/api/dialshree/sent')
    const res = await getDialShreeSent(req)
    assert.equal(res.status, 401)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.match(json.error, /Access denied/i)
    assert.match(res.headers.get('cache-control') || '', /no-store/)
  })

  await t.test('2. Expired session returns 401', async () => {
    const expiredCookie = makeSignedSessionCookie({ role: 'super_admin' }, true)
    const req = createRequest('http://localhost:3000/api/dialshree/sent', { cookie: expiredCookie })
    const res = await getDialShreeSent(req)
    assert.equal(res.status, 401)
  })

  await t.test('3. Non-permitted user without elevated role returns 403 Forbidden', async () => {
    const nonPermittedCookie = makeSignedSessionCookie({ role: 'employee', permissions: ['other_perm.view'] })
    const req = createRequest('http://localhost:3000/api/dialshree/sent', { cookie: nonPermittedCookie })
    const res = await getDialShreeSent(req)
    assert.equal(res.status, 403)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.match(json.error, /Insufficient permissions/i)
  })

  await t.test('4. User with dialshree_sent.view permission returns 200 OK', async () => {
    const permittedCookie = makeSignedSessionCookie({ role: 'employee', permissions: ['dialshree_sent.view'] })
    const req = createRequest('http://localhost:3000/api/dialshree/sent?force=1', { cookie: permittedCookie })
    const res = await getDialShreeSent(req)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(Array.isArray(data))
    assert.equal(data.length, 1)
    assert.equal(data[0].leadId, 'VR-101-TEST')
    assert.equal(data[0].deliveryStatus.category, 'sent')
    assert.equal(data[0].deliveryStatus.color, 'green')
  })

  await t.test('5. Super Admin returns 200 OK with projected fields', async () => {
    const adminCookie = makeSignedSessionCookie({ role: 'super_admin' })
    const req = createRequest('http://localhost:3000/api/dialshree/sent?force=1', { cookie: adminCookie })
    const res = await getDialShreeSent(req)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(Array.isArray(data))
    assert.equal(data[0].clientName, 'Test Client')
    assert.equal(data[0].company, 'KTAHV')
  })

  await t.test('6. SQL Query strictly enforces explicit projection and bounded limit (no SELECT *)', async () => {
    const adminCookie = makeSignedSessionCookie({ role: 'admin' })
    const req = createRequest('http://localhost:3000/api/dialshree/sent?force=1', { cookie: adminCookie })
    await getDialShreeSent(req)
    assert.ok(!executedSql.includes('SELECT *'), 'SQL must not contain wildcard SELECT *')
    assert.ok(executedSql.includes('FROM dialshree_kairali_sent'))
    assert.ok(executedSql.includes('LIMIT 25000'), 'SQL must enforce bounded scan ceiling')
  })

  await t.test('7. Fail-Closed: DB failure returns 500 without leaking credentials or internal error stack', async () => {
    dbShouldFail = true
    try {
      const adminCookie = makeSignedSessionCookie({ role: 'super_admin' })
      const req = createRequest('http://localhost:3000/api/dialshree/sent?force=1', { cookie: adminCookie })
      const res = await getDialShreeSent(req)
      assert.equal(res.status, 500)
      const json = await res.json()
      assert.equal(json.success, false)
      assert.equal(json.error, 'Database error fetching DialShree sent outreach records')
      assert.equal((json as any).password, undefined)
      assert.equal((json as any).host, undefined)
    } finally {
      dbShouldFail = false
    }
  })
})
