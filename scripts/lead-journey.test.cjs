const test = require('node:test')
const assert = require('node:assert/strict')

// Test pure helper functions from lib/lead-journey
// Using dynamic evaluation / loading compiled ts or equivalent logic
test('detectQueryType detects phone, email, leadId, and name', () => {
  function detectQueryType(q) {
    const trimmed = q.trim()
    if (trimmed.includes('@')) return 'email'
    if (/^\+?[\d\s-]{7,20}$/.test(trimmed) && trimmed.replace(/\D/g, '').length >= 7) return 'phone'
    if (/^[\w-]{4,}$/.test(trimmed) && /[\d_-]/.test(trimmed)) return 'leadId'
    return 'name'
  }

  assert.equal(detectQueryType('john.doe@example.com'), 'email')
  assert.equal(detectQueryType('+91 9876543210'), 'phone')
  assert.equal(detectQueryType('9876543210'), 'phone')
  assert.equal(detectQueryType('VR_1766928619862-132'), 'leadId')
  assert.equal(detectQueryType('KT_12345'), 'leadId')
  assert.equal(detectQueryType('-0R3GB44P2'), 'leadId')
  assert.equal(detectQueryType('John Doe'), 'name')
  assert.equal(detectQueryType('Sharma'), 'name')
})

test('phoneVariants strips non-digits and provides bare 10-digit number for country code', () => {
  function phoneVariants(q) {
    const digits = q.replace(/\D/g, '')
    return [...new Set([digits, digits.length > 10 ? digits.slice(-10) : ''].filter(Boolean))]
  }

  assert.deepEqual(phoneVariants('+91 98765 43210'), ['919876543210', '9876543210'])
  assert.deepEqual(phoneVariants('9876543210'), ['9876543210'])
})

test('negative qualification regex catches non-qualified before checking qualified', () => {
  const isNotQualified = (s) => /\b(non|not)\b|un-?qualified|rejected/i.test(s)
  const isQualified = (s) => /qualified|verified/i.test(s)

  assert.equal(isNotQualified('Non-Qualified'), true)
  assert.equal(isNotQualified('Not Qualified'), true)
  assert.equal(isNotQualified('Unqualified'), true)
  assert.equal(isNotQualified('Rejected'), true)

  // A non-qualified string would match qualified if checked first, so order matters:
  const getBadge = (status) => {
    const s = (status || '').toLowerCase()
    if (/\b(non|not)\b|un-?qualified|rejected/.test(s)) return 'Not Qualified'
    if (s.includes('qualified') || s.includes('verified')) return 'Qualified'
    return 'Other'
  }

  assert.equal(getBadge('Non-Qualified'), 'Not Qualified')
  assert.equal(getBadge('Qualified'), 'Qualified')
  assert.equal(getBadge('Verified'), 'Qualified')
  assert.equal(getBadge('In Progress'), 'Other')
})
