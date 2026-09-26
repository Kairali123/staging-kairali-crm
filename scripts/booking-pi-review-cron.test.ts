import './setup-test-env'
import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET, POST } from '../app/api/cron/booking-pi-review-alert/route'
import { middleware } from '../middleware'

test('Legacy Booking PI Review Cron Endpoint Suite', async (t) => {
  await t.test('1. Rejects calls without valid CRON_SECRET bearer token in production', async () => {
    process.env.CRON_SECRET = 'test-secret-token'
    ;(process.env as any).NODE_ENV = 'production'

    const reqNoAuth = new NextRequest('http://localhost:3000/api/cron/booking-pi-review-alert')
    const resNoAuth = await GET(reqNoAuth)
    assert.equal(resNoAuth.status, 401, 'Must require bearer token')

    const reqWrongAuth = new NextRequest('http://localhost:3000/api/cron/booking-pi-review-alert', {
      headers: { authorization: 'Bearer invalid-token' },
    })
    const resWrongAuth = await GET(reqWrongAuth)
    assert.equal(resWrongAuth.status, 401, 'Must reject invalid token')
  })

  await t.test('2. Authorized GET returns skipped without sending emails', async () => {
    process.env.CRON_SECRET = 'test-secret-token'
    ;(process.env as any).NODE_ENV = 'production'

    const req = new NextRequest('http://localhost:3000/api/cron/booking-pi-review-alert', {
      headers: { authorization: 'Bearer test-secret-token' },
    })
    const res = await GET(req)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.success, true)
    assert.equal(data.skipped, true)
    assert.equal(data.reason, 'superseded-by-email-triggers')
  })

  await t.test('3. Authorized POST returns skipped without sending emails', async () => {
    process.env.CRON_SECRET = 'test-secret-token'
    ;(process.env as any).NODE_ENV = 'production'

    const req = new NextRequest('http://localhost:3000/api/cron/booking-pi-review-alert', {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret-token' },
    })
    const res = await POST(req)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.success, true)
    assert.equal(data.skipped, true)
    assert.equal(data.reason, 'superseded-by-email-triggers')
  })

  await t.test('4. Middleware exempts /api/cron/booking-pi-review-alert without session cookie', async () => {
    const cronReq = new NextRequest('http://localhost:3000/api/cron/booking-pi-review-alert')
    const res = await middleware(cronReq)
    assert.equal(res.status, 200, 'Middleware should pass through cron request without session')
    assert.notEqual(res.status, 401, 'Middleware must not block cron endpoint with 401')
  })
})
