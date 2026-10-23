import { google } from 'googleapis'
import { getGoogleAuth } from '@/lib/google-client-sync'
import { DOCTOR_SHEET_ID, selectDoctorAssignments, validateDoctorHeaders, type DoctorAssignment } from './doctor-assignment'

function sheetsClient() { return google.sheets({ version: 'v4', auth: getGoogleAuth() }) }

export async function loadDoctorAssignments() {
  const sheets = sheetsClient()
  // Read display values so dates, phone numbers, IDs and amounts retain source formatting.
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: DOCTOR_SHEET_ID,
    ranges: ["'GuestTracker'!A10:AA", "'GuestTracker'!GF10:GW"],
    valueRenderOption: 'FORMATTED_VALUE',
  })
  const [base, workflow] = (response.data.valueRanges || []).map(r => r.values || [])
  validateDoctorHeaders(base?.[0] || [], workflow?.[0] || [])
  return selectDoctorAssignments(base.slice(1), workflow.slice(1))
}

/** Only called after every recipient is accepted. Never called by preview. */
export async function acknowledgeDoctorAssignments(rows: DoctorAssignment[], date: string) {
  if (!rows.length) return
  const current = await loadDoctorAssignments()
  const matches = new Map(current.map(r => [r.row, r.signature]))
  if (rows.some(r => matches.get(r.row) !== r.signature)) {
    throw Error('Source changed after email acceptance; review delivery and source before resuming')
  }
  await sheetsClient().spreadsheets.values.batchUpdate({
    spreadsheetId: DOCTOR_SHEET_ID,
    requestBody: { valueInputOption: 'RAW', data: rows.map(r => ({ range: `'GuestTracker'!GW${r.row}`, values: [[`Sent-CRM-${date}`]] })) },
  })
}
