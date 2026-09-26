const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync('lib/morning-lead-allocation.ts', 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const moduleExports = {}
vm.runInNewContext(compiled, { exports: moduleExports, require: () => ({}), Intl, Date, Map, Set, Math, String, Number, RegExp, Error })
const header = Array(20).fill('')
header[2] = 'ID'; header[11] = 'Assign To MR'; header[13] = 'Planned'; header[14] = 'Actual'; header[16] = 'Status '; header[19] = 'Remarks'
const employee = { name: 'Example Agent', id: 'example-sheet-id' }
function row(id, planned, actual, owner = 'Example Agent') {
  const cells = Array(20).fill('')
  cells[2] = id; cells[3] = 'Example Lead'; cells[11] = owner; cells[13] = planned; cells[14] = actual
  return cells
}
test('only Main rows with Planned filled and Actual blank are pending', () => {
  const rows = [header, row('A', 46300.5, ''), row('B', 46300.5, 46300.6), row('C', '', ''), row('D', '25/09/2026 10:00:00', '')]
  const actual = moduleExports.parsePendingMainRows(rows, employee, new Date('2026-09-25T05:00:00Z'))
  assert.deepEqual(Array.from(actual, lead => lead.id), ['A', 'D'])
  assert.equal(actual[0].sourceRow, 7)
  assert.equal(actual[1].sourceRow, 10)
})
test('missing owner stays visible as an exception', () => {
  const actual = moduleExports.parsePendingMainRows([header, row('E', '25/09/2026 10:00:00', '', '')], employee, new Date('2026-09-25T05:00:00Z'))
  assert.equal(actual[0].owner, '')
  assert.match(actual[0].note, /Unassigned/)
})
test('rows marked Transfer are removed from the actionable queue', () => {
  const transferred = row('F', '25/09/2026 10:00:00', '')
  transferred[16] = 'Transfer'
  transferred[19] = 'Transfer by Morning lead allocation page due to overdue lead'
  const actual = moduleExports.parsePendingMainRows([header, transferred, row('G', '25/09/2026 10:00:00', '')], employee, new Date('2026-09-25T05:00:00Z'))
  assert.deepEqual(Array.from(actual, lead => lead.id), ['G'])
})
test('owner transfer writes only L, Q and T in the source Main row', async () => {
  const cells = Array(18).fill('')
  cells[0] = 'A'; cells[9] = 'Example Agent'; cells[11] = '25/09/2026 10:00:00'; cells[17] = 'Existing note'
  const writes = []
  const sheets = { spreadsheets: {
    values: {
      get: async () => ({ data: { values: [cells] } }),
      update: async (request) => { writes.push({ range: request.range, value: request.requestBody.values[0][0] }) },
      batchUpdate: async (request) => { writes.push(...request.requestBody.data.map(item => ({ range: item.range, value: item.values[0][0] }))) },
      batchGet: async () => ({ data: { valueRanges: writes.map(item => ({ values: [[item.value]] })) } }),
    },
  } }
  const lead = { id: 'A', key: 'id:a', sourceSpreadsheetId: 'example-sheet-id', sourceRow: 7, originalOwner: 'Example Agent', status: 'Overdue' }
  await moduleExports.transferSourceRow(sheets, lead, 'New Agent', '2026-09-25T05:00:00.000Z')
  assert.deepEqual(writes.map(item => item.range), ['Main!L7', 'Main!Q7', 'Main!T7'])
  assert.deepEqual(writes.map(item => item.value).slice(0, 2), ['New Agent', 'Transfer'])
  assert.match(writes[2].value, /Existing note\nTransfer by Morning lead allocation page due to overdue lead/)
  assert.match(writes[2].value, /25 Sept 2026.*IST/)
})
test('owner transfer refuses a changed source row before writing', async () => {
  const cells = Array(18).fill('')
  cells[0] = 'A'; cells[9] = 'Someone Else'; cells[11] = '25/09/2026 10:00:00'
  let wrote = false
  const sheets = { spreadsheets: {
    values: { get: async () => ({ data: { values: [cells] } }), update: async () => { wrote = true } },
  } }
  const lead = { id: 'A', key: 'id:a', sourceSpreadsheetId: 'example-sheet-id', sourceRow: 7, originalOwner: 'Example Agent', status: 'Overdue' }
  await assert.rejects(moduleExports.transferSourceRow(sheets, lead, 'New Agent', '2026-09-25T05:00:00.000Z'), /Source row changed/)
  assert.equal(wrote, false)
})
test('owner transfer retries transfer marks when a first read misses them', async () => {
  const cells = Array(18).fill('')
  cells[0] = 'A'; cells[9] = 'Example Agent'; cells[11] = '25/09/2026 10:00:00'
  let marks = 0
  const sheets = { spreadsheets: { values: {
    get: async () => ({ data: { values: [cells] } }),
    update: async () => ({}),
    batchUpdate: async () => { marks++ },
    batchGet: async () => ({ data: { valueRanges: [
      { values: [['New Agent']] }, { values: [[marks > 1 ? 'Transfer' : '']] },
      { values: [[marks > 1 ? 'Transfer by Morning lead allocation page due to overdue lead | 25 Sept 2026, 10:30 IST | Example Agent → New Agent' : '']] },
    ] } }),
  } } }
  const lead = { id: 'A', key: 'id:a', sourceSpreadsheetId: 'example-sheet-id', sourceRow: 7, originalOwner: 'Example Agent', status: 'Overdue' }
  await moduleExports.transferSourceRow(sheets, lead, 'New Agent', '2026-09-25T05:00:00.000Z')
  assert.equal(marks, 2)
})
