const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vm = require('node:vm')

function loadTsModule(relPath, mocks = {}) {
  const fullPath = path.resolve(relPath)
  const source = fs.readFileSync(fullPath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
      esModuleInterop: true,
    },
  }).outputText
  const module = { exports: {} }
  const req = (id) => {
    if (id in mocks) return mocks[id]
    return require(id)
  }
  vm.runInNewContext(transpiled, {
    module,
    exports: module.exports,
    require: req,
    process,
    Buffer,
    console,
    Date,
    Intl,
    Math,
    Number,
    String,
    Set,
    Map,
    Promise,
  })
  return module.exports
}

const aiChat = loadTsModule('lib/ai-chat-reports.ts', {
  '@/lib/db': { getPool: async () => ({ query: async () => [[]] }) },
})

test('classifyChatCompany maps Kairali divisions accurately', () => {
  assert.equal(aiChat.classifyChatCompany('Kairali The Ayurvedic Healing Village', 'KAPPL'), 'KTAHV')
  assert.equal(aiChat.classifyChatCompany('Kairali Ayurvedic Products', 'KTAHV'), 'KAPPL')
  assert.equal(aiChat.classifyChatCompany('Kairali Ayurvedic Training Institute', 'KTAHV'), 'KAPPL')
  assert.equal(aiChat.classifyChatCompany('Kairali Ayurvedic Centers', 'KTAHV'), 'KATC')
  assert.equal(aiChat.classifyChatCompany('Villaraag', 'KTAHV'), 'VILLARAAG')
  assert.equal(aiChat.classifyChatCompany('', 'VILLARAAG'), 'VILLARAAG')
})

test('isChatbaseEnquiry distinguishes real enquiries from Transfer to Delete', () => {
  assert.equal(aiChat.isChatbaseEnquiry('Transfer to Delete 18-Nov-26', '+91 9876543210', ''), false)
  assert.equal(aiChat.isChatbaseEnquiry('Transfer to ChatBase Medium 18-Nov-26', '', ''), true)
  assert.equal(aiChat.isChatbaseEnquiry('', '+91 98765 43210', ''), true)
  assert.equal(aiChat.isChatbaseEnquiry('', '', 'guest@example.com'), true)
  assert.equal(aiChat.isChatbaseEnquiry('', '', ''), false)
})

test('classifyChannel normalizes Widget, WhatsApp, Instagram and Messenger', () => {
  assert.equal(aiChat.classifyChannel('Widget or Iframe', '', ''), 'Website')
  assert.equal(aiChat.classifyChannel('WhatsApp', '', ''), 'WhatsApp')
  assert.equal(aiChat.classifyChannel('API', '', ''), 'WhatsApp')
  assert.equal(aiChat.classifyChannel('Instagram', '', ''), 'Instagram')
  assert.equal(aiChat.classifyChannel('Messenger', '', ''), 'Facebook')
  assert.equal(aiChat.classifyChannel('', '', 'WhatsApp Bot'), 'WhatsApp')
  assert.equal(aiChat.classifyChannel('', '', 'ChatBase Bot'), 'Website')
})

test('renderAiChatWeeklyEmailHtml escapes HTML and renders all 5 AI chat assistants', () => {
  const sampleReport = {
    startDate: '2026-11-21',
    endDate: '2026-11-27',
    periodLabel: '21 Nov 2026 – 27 Nov 2026 (7 Days)',
    companyScope: 'ALL',
    generatedAt: '2026-11-28T05:30:00.000Z',
    totals: {
      leadChats: 500,
      droppedChats: 320,
      enquiries: 180,
      enquiryPct: 36.0,
      verifiedConversions: 12,
      unverifiedConversions: 3,
      totalConversions: 15,
      enquiryToConversionPct: 8.3,
      chatToConversionPct: 3.0,
      revenue: 485000,
      riyaChats: 42,
      riyaActionable: 40,
      riyaResolved: 39,
      riyaOpen: 1,
      riyaEscalated: 0,
      riyaResolutionPct: 97.5,
      allChatsCombined: 542,
    },
    companies: [
      {
        company: 'KTAHV',
        companyLabel: 'KTAHV <script>alert(1)</script>',
        leadChats: 300,
        droppedChats: 190,
        enquiries: 110,
        enquiryPct: 36.7,
        verifiedConversions: 8,
        unverifiedConversions: 2,
        totalConversions: 10,
        enquiryToConversionPct: 9.1,
        chatToConversionPct: 3.3,
        revenue: 420000,
        guestSupportChats: 42,
        guestActionable: 40,
        guestResolved: 39,
        guestOpen: 1,
        guestEscalated: 0,
        guestResolutionPct: 97.5,
        totalAllChats: 342,
        bots: [],
      },
    ],
    bots: [
      {
        botId: 'priya-sharma',
        botName: 'Priya Sharma Chat',
        shortName: 'Priya Sharma',
        subtitle: 'Main Website Bot',
        sqlTable: 'kairali_chatbase_leads_api_priya_sharma',
        primaryCompany: 'KTAHV',
        kind: 'lead_generation',
        totalChats: 300,
        droppedChats: 190,
        enquiries: 110,
        enquiryPct: 36.7,
        verifiedConversions: 8,
        unverifiedConversions: 2,
        totalConversions: 10,
        enquiryToConversionPct: 9.1,
        chatToConversionPct: 3.3,
        revenue: 420000,
        resolvedTickets: 0,
        openTickets: 0,
        escalatedTickets: 0,
        resolutionPct: 0,
        channels: [],
        companies: [],
        topOutcomes: [],
        recentRecords: [],
      },
      {
        botId: 'riya-sharma',
        botName: 'Riya Sharma Chat',
        shortName: 'Riya Sharma',
        subtitle: 'Resort Bot',
        sqlTable: 'ktahv_capa_fms_resort_v3_urgencycorrectivefms',
        primaryCompany: 'KTAHV',
        kind: 'guest_support',
        totalChats: 42,
        droppedChats: 2,
        enquiries: 40,
        enquiryPct: 95.2,
        verifiedConversions: 0,
        unverifiedConversions: 0,
        totalConversions: 0,
        enquiryToConversionPct: 0,
        chatToConversionPct: 0,
        revenue: 0,
        resolvedTickets: 39,
        openTickets: 1,
        escalatedTickets: 0,
        resolutionPct: 97.5,
        channels: [],
        companies: [],
        topOutcomes: [],
        recentRecords: [],
      },
    ],
    channels: [
      {
        channel: 'Website',
        chats: 300,
        enquiries: 110,
        enquiryPct: 36.7,
        conversions: 10,
        verifiedConversions: 8,
        conversionPct: 9.1,
        revenue: 420000,
      },
    ],
    dailyTrend: [
      {
        date: '2026-11-27',
        chats: 70,
        enquiries: 25,
        conversions: 2,
        riyaChats: 6,
        riyaResolved: 6,
      },
    ],
  }

  const html = aiChat.renderAiChatWeeklyEmailHtml(sampleReport, {
    appUrl: 'https://staging-kairali-crm.vercel.app',
  })
  assert.ok(html.includes('AI Chat Weekly Performance Report'))
  assert.ok(html.includes('Priya Sharma Chat'))
  assert.ok(html.includes('Riya Sharma Chat'))
  assert.ok(html.includes('<!--email-intro-->'))
  assert.ok(html.includes('<!--email-closing-->'))
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.ok(!html.includes('<script>alert(1)</script>'))
})
