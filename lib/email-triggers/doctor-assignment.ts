/** Verified against GuestTracker row 10 and newEmailer.gs on 23 October 2026. */
export const DOCTOR_SHEET_ID = '1zWuoDnB-TyenkwNFWc3gPP4_fZOpInvV4ZJpZQm1ILQ'
export const DOCTOR_REPORT_ID = 'client-assigned-doctor-report' as const
export const DOCTOR_HEADERS = [
  'Timestamp', 'Buyer ID', 'Booking ID', 'Name of Client', 'Mobile', 'Email', 'Gender',
  'Data Source', 'Client Category', 'Client Type', 'Billing Address', 'Country Coming From',
  'Arrival Date', 'Departure Date', 'Nights of Stay', 'Package Type', 'Programme / Package Name',
  'Room Type', 'Room Category', 'Invoice Amount', 'Payment Terms', 'Payment Date (to be paid)',
  'Booking Status', 'Booking Taken By', 'MID', 'Booking No', 'Booking URL',
  'Change The Doctor- (If Required)',
] as const
export type DoctorAssignment = { row: number; values: string[]; signature: string }
const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()

export function validateDoctorHeaders(base: unknown[], workflow: unknown[]) {
  for (let i = 0; i < 27; i++) {
    if (norm(base[i]) !== DOCTOR_HEADERS[i]) throw Error('GuestTracker field mapping changed; review the source headers before sending')
  }
  for (const [index, expected] of [[0, 'Actual'], [6, DOCTOR_HEADERS[27]], [12, 'Status'], [17, 'Email Send To Doctor for Client Assign']] as const) {
    if (norm(workflow[index]) !== expected) throw Error('GuestTracker doctor workflow mapping changed; review before sending')
  }
}

/** A:AA plus GF:GW. Exactly the legacy predicate, without its 20-row truncation. */
export function selectDoctorAssignments(base: unknown[][], workflow: unknown[][]): DoctorAssignment[] {
  return base.flatMap((row, i) => {
    const w = workflow[i] || []
    if (w[12] !== 'Noted' || norm(w[0]) === '' || norm(w[6]) === '' || norm(w[17]) !== '') return []
    if (!norm(row[2])) throw Error('A pending doctor assignment has no Booking ID; source review required')
    const values = Array.from({ length: 27 }, (_, col) => String(row[col] ?? ''))
    values.push(String(w[6]))
    return [{ row: i + 11, values, signature: JSON.stringify([values, w[0], w[12]]) }]
  })
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const safeLink = (s: string) => { try { const u = new URL(s); return u.protocol === 'https:' ? u.href : null } catch { return null } }

export function renderDoctorAssignments(rows: DoctorAssignment[], date: string) {
  const doctors = new Map<string, number>()
  rows.forEach(r => doctors.set(r.values[27], (doctors.get(r.values[27]) || 0) + 1))
  const groups: [string, number[]][] = [
    ['Guest & contact', [0, 1, 2, 3, 4, 5, 6, 10, 11]],
    ['Stay & programme', [12, 13, 14, 15, 16, 17, 18, 22]],
    ['Booking & payment', [19, 20, 21, 23, 24, 25, 26]],
    ['Client details', [7, 8, 9, 27]],
  ]
  const cards = rows.map((r, i) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid #dce5df;border-radius:12px;background:white"><tr><td style="padding:20px;background:#edf4ef"><div style="font-size:12px;color:#52655b">CLIENT ${i + 1} · ${esc(r.values[2])}</div><h2 style="font-size:21px;line-height:1.4;margin:6px 0;color:#163f30">${esc(r.values[3] || 'Guest name unavailable')}</h2><div style="color:#345747">Doctor: <strong>${esc(r.values[27])}</strong></div></td></tr>${groups.map(([title, indices]) => `<tr><td style="padding:16px 20px 8px"><h3 style="margin:0;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#50675a">${title}</h3></td></tr><tr><td style="padding:0 20px 20px"><table width="100%" cellspacing="0" cellpadding="0">${indices.map(index => {
    const value = r.values[index] || '—', url = index === 26 ? safeLink(value) : null
    return `<tr><td style="width:40%;padding:9px 12px 9px 0;border-bottom:1px solid #edf1ee;vertical-align:top;color:#52655b;font-size:13px">${esc(DOCTOR_HEADERS[index])}</td><td style="padding:9px 0;border-bottom:1px solid #edf1ee;vertical-align:top;font-size:14px;overflow-wrap:anywhere;word-break:break-word">${url ? `<a href="${esc(url)}" style="color:#176348">${esc(value)}</a>` : esc(value)}</td></tr>`
  }).join('')}</table></td></tr>`).join('')}</table>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f3f6f3;color:#233c2e;font:14px/1.6 Arial,sans-serif"><div style="max-width:760px;margin:auto;padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="background:#174c3c;color:white;padding:28px 24px;border-radius:12px"><div style="font-size:12px;letter-spacing:2px;color:#d8e8dd">KAIRALI · HEALING VILLAGE</div><h1 style="font-size:26px;line-height:1.3;margin:12px 0">Client Assigned to Doctor Reports</h1><div>${esc(date)} · Asia/Kolkata</div></td></tr></table><!--email-intro--><p style="margin:24px 8px 12px">Dear Doctor,<br>Please find the pending client assignments below. Each client includes the complete booking and contact details from GuestTracker.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 24px"><tr><td style="width:50%;padding:18px;background:#e8f0e9"><strong style="font-size:28px">${rows.length}</strong><br>Pending assignments</td><td style="padding:18px;background:#e8f0e9"><strong style="font-size:28px">${doctors.size}</strong><br>Assigned doctors</td></tr></table>${rows.length ? `<p style="margin:0 8px 20px;color:#52655b">${Array.from(doctors, ([name, count]) => `${esc(name)}: ${count}`).join(' · ')}</p>${cards}` : '<p style="padding:24px;background:white;border:1px solid #dce5df">No pending doctor assignments at the time of this report.</p>'}<!--email-closing--><p style="font-size:12px;color:#52655b;padding:12px 8px">Confidential · For the authorised care and operations team.<br>Source: GuestTracker · A:AA + GL · All 28 source fields included per client.<br>“—” indicates a blank source value. Preview does not send or mark records.</p></div></body></html>`
}
