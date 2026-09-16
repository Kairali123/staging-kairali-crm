const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');

const compiled = ts.transpileModule(
  fs.readFileSync('app/api/marketing-daily-report/conversions/route.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText;

function harness(user, mockRows = null) {
  let allocations = 0;
  let lastQuery = null;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, ...options }) } };
      if (name === '@/lib/authz') return { getSessionUser: () => user, hasPermission: () => false };
      if (name === '@/lib/db') return {
        getPool: () => {
          allocations++;
          if (!mockRows) throw new Error('DB unavailable');
          return {
            getConnection: async () => ({
              query: async (queryObj, params) => {
                if (typeof queryObj === 'object' && queryObj.sql && queryObj.sql.includes('SELECT')) {
                  lastQuery = { sql: queryObj.sql, params };
                  return [mockRows];
                }
                return [];
              },
              rollback: async () => {},
              release: () => {},
            }),
          };
        },
      };
      if (name === '@/lib/marketing-report-query') return {
        reportWindow: (date) => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date');
          return [date, date];
        },
      };
      if (name === '@/lib/lead-source') return {
        normalizeVSrc: (s) => ({ key: String(s).toUpperCase(), label: String(s) }),
        normalizeVSrcKey: (s) => String(s).toUpperCase().trim(),
      };
      throw new Error('Unknown module: ' + name);
    },
    Intl,
    Date,
    console,
    Math,
    String,
    Number,
    Array,
    Object,
  });

  return {
    get: (date, company = '', source = '', kind = 'verified') =>
      exports.GET({
        nextUrl: new URL(`http://localhost/api?date=${date}&company=${company}&source=${source}&kind=${kind}`),
      }),
    allocations: () => allocations,
    lastQuery: () => lastQuery,
  };
}

test('conversion route: missing session returns 401 before SQL allocation', async () => {
  const h = harness(null);
  const res = await h.get('2026-09-10');
  assert.equal(res.status, 401);
  assert.equal(h.allocations(), 0);
});

test('conversion route: insufficient permission returns 403 before SQL allocation', async () => {
  for (const u of [{}, { role: 'sales' }, { role: 'agent' }]) {
    const h = harness(u);
    const res = await h.get('2026-09-10');
    assert.equal(res.status, 403);
    assert.equal(h.allocations(), 0);
  }
});

test('conversion route: invalid report date returns 400 before SQL allocation', async () => {
  const h = harness({ role: 'super_admin' });
  const res = await h.get('not-a-date');
  assert.equal(res.status, 400);
  assert.equal(h.allocations(), 0);
});

test('conversion route: returns conversions from DB when rows exist (verified)', async () => {
  const sampleRows = [
    {
      id: 101,
      booking_order_id: 'BK-101',
      name_of_client: 'Rajesh Kumar',
      mobile: '9876543210',
      email: 'rajesh@example.com',
      verified_source: 'Website',
      sales_person_name: 'Dr. Suresh',
      conversion_amount: 50000,
      amount_after_return: 0,
      booking_status: 'confirmed',
      booking_type: 'Ayurveda package',
      company: 'KTAHV',
      date_and_time: '2026-09-10 12:00',
    },
  ];
  const h = harness({ role: 'super_admin' }, sampleRows);
  const res = await h.get('2026-09-10', 'KTAHV', 'Website', 'verified');
  assert.equal(res.body.kind, 'verified');
  assert.equal(res.body.count, 1);
  assert.equal(res.body.totalAmount, 50000);
  assert.equal(res.body.conversions[0].clientName, 'Rajesh Kumar');
  assert.equal(res.body.conversions[0].bookingOrderId, 'BK-101');
  assert(h.lastQuery().sql.includes('is_verified = 1'));
});

test('conversion route: returns unverified sales from DB using unverified condition', async () => {
  const sampleRows = [
    {
      id: 202,
      booking_order_id: 'BK-202',
      name_of_client: 'Sunita Verma',
      mobile: '9871154321',
      email: 'sunita@example.com',
      verified_source: 'Priyasharma AI Chat',
      sales_person_name: 'Priya Sharma AI',
      conversion_amount: 263617.14,
      amount_after_return: 0,
      booking_status: 'Pending Verification',
      booking_type: 'Treatment Package',
      company: 'KTAHV',
      date_and_time: '2026-09-10 09:40',
    },
  ];
  const h = harness({ role: 'super_admin' }, sampleRows);
  const res = await h.get('2026-09-10', 'KTAHV', 'Priyasharma AI Chat', 'unverified');
  assert.equal(res.body.kind, 'unverified');
  assert.equal(res.body.count, 1);
  assert.equal(res.body.totalAmount, 263617.14);
  assert.equal(res.body.conversions[0].clientName, 'Sunita Verma');
  assert(h.lastQuery().sql.includes('is_verified = 0'));
});

test('conversion route: fallback demo data is supplied for unverified sales when DB fails', async () => {
  const h = harness({ role: 'super_admin' }, null); // causes DB error
  const res = await h.get('2026-09-10', 'KTAHV', 'Priyasharma AI Chat', 'unverified');
  assert.equal(res.body.company, 'KTAHV');
  assert.equal(res.body.source, 'Priyasharma AI Chat');
  assert.equal(res.body.kind, 'unverified');
  assert(res.body.count >= 1);
  assert.equal(res.body.conversions[0].clientName, 'Mrs. Sunita Verma');
  assert.equal(res.body.totalAmount, 263617.14);
  assert.equal(res.body.isDemo, true);
});
