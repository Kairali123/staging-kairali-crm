import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serializeLeadDateIST } from '../lib/lead-date-serialization.ts'

test('preserves IST midnight on UTC and IST servers without losing early-day leads', () => {
  const previous = process.env.TZ
  try {
    for (const timezone of ['UTC','Asia/Kolkata','America/New_York']) {
      process.env.TZ = timezone
      assert.equal(serializeLeadDateIST(new Date('2026-09-09T18:30:00Z')), '10/09/2026 00:00:00')
      assert.equal(serializeLeadDateIST(new Date('2026-09-09T23:59:59Z')), '10/09/2026 05:29:59')
      assert.equal(serializeLeadDateIST(new Date('2026-09-10T18:29:59Z')), '10/09/2026 23:59:59')
      assert.equal(serializeLeadDateIST(new Date('2026-09-10T18:30:00Z')), '11/09/2026 00:00:00')
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous }
})
test('preserves SQL string wall times and safely handles missing dates',()=>{
  assert.equal(serializeLeadDateIST('2026-09-10 00:00:00'),'10/09/2026 00:00:00')
  assert.equal(serializeLeadDateIST(null),'')
  assert.equal(serializeLeadDateIST(new Date('invalid')),'')
})
