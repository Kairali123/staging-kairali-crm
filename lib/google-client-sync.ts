import { google } from 'googleapis'
import { Readable } from 'stream'
import * as XLSX from 'xlsx'
import { getPool } from './db'

export const DEFAULT_CATEGORY_SHEET_ID = '1Gg0lUShFUbVIaKiFJW538pSTejy9SqUgOfOzGlkXdKg'
export const DEFAULT_INITIAL_SHEET_ID = '1VJNCXxat2bcItVqsvW24NT9aDwnthaTfqsN5R1KkWTY'
export const EXPLICIT_MASTER_SHEET_ID = '1XkE5g9kzbLNFn8DnyNW3Ielfal60frvQhp2dK9q_Vp4'
export const EXPLICIT_MASTER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1XkE5g9kzbLNFn8DnyNW3Ielfal60frvQhp2dK9q_Vp4/edit?gid=0#gid=0'
export const DEFAULT_DRIVE_FOLDER_ID = '14hJWI8WndvOL5srlKd44wI-misC8pWei'

export interface CategoryStructure {
  category: string
  subCategories: string[]
}

function parseServiceAccountJson(raw: string): any {
  // Strategy 1: direct parse (works if env var was set correctly)
  try {
    return JSON.parse(raw)
  } catch (_) {}

  // Strategy 2: the private_key field has LITERAL newlines (not \n escape sequences)
  // Replace every literal newline that appears inside a JSON string with \\n
  try {
    // Only replace newlines that are inside string values (between unescaped quotes)
    const fixed = raw.replace(/("(?:[^"\\]|\\[\s\S])*")/g, (match) =>
      match.replace(/\n/g, '\\n').replace(/\r/g, '')
    )
    return JSON.parse(fixed)
  } catch (_) {}

  // Strategy 3: strip ALL control characters outside JSON structural characters
  try {
    const stripped = raw
      .replace(/\r\n/g, '\\n')  // CRLF → JSON \n
      .replace(/\r/g, '\\n')    // CR   → JSON \n
      .replace(/\n/g, '\\n')    // LF   → JSON \n
      .replace(/\t/g, '\\t')    // TAB  → JSON \t
    return JSON.parse(stripped)
  } catch (err: any) {
    throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${err.message}`)
  }
}

export function getGoogleAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured.')

  const credentials = parseServiceAccountJson(raw)

  // Ensure private_key newlines are real newlines (not the string \\n)
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  })
}

export async function setupUserMasterGoogleSheet(
  spreadsheetId = EXPLICIT_MASTER_SHEET_ID
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // Ensure standard headers on user's master sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `A1:M1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          'Unique Client ID',
          'Client Name',
          'Phone Number',
          'Email Address',
          'Alternate Phone',
          'Category',
          'Sub Category',
          'Source Sheet',
          'Address',
          'City / State',
          'Country',
          'Remarks / Notes',
          'Created At',
        ],
      ],
    },
  })

  return { spreadsheetId, spreadsheetUrl: EXPLICIT_MASTER_SHEET_URL }
}

export async function fetchCategoryHierarchyFromSheet(sheetId = DEFAULT_CATEGORY_SHEET_ID): Promise<CategoryStructure[]> {
  try {
    const auth = getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A1:Z100',
    })
    const rows = res.data.values || []
    
    if (rows.length === 0) return getDefaultCategories()

    const result: CategoryStructure[] = []
    const catMap = new Map<string, string[]>()

    // Assuming row 0 is header ("Category", "SubCategory")
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      const catName = (row[0] || '').trim()
      const subName = (row[1] || '').trim()

      if (!catName) continue

      if (!catMap.has(catName)) {
        catMap.set(catName, [])
      }
      if (subName && !catMap.get(catName)!.includes(subName)) {
        catMap.get(catName)!.push(subName)
      }
    }

    for (const [category, subs] of catMap.entries()) {
      result.push({
        category,
        subCategories: subs.length > 0 ? subs : ['General'],
      })
    }

    return result.length > 0 ? result : getDefaultCategories()
  } catch (err) {
    console.error('[GoogleSync] Error fetching category sheet:', err)
    return getDefaultCategories()
  }
}

function getDefaultCategories(): CategoryStructure[] {
  return [
    {
      category: 'KTAHV Hospital',
      subCategories: ['IPD Patient', 'OPD Patient', 'Ayurvedic Treatment', 'Wellness Guest', 'General'],
    },
    {
      category: 'KAPPL Products',
      subCategories: ['Medicines', 'Cosmetics & Personal Care', 'Retail Buyer', 'Distributor', 'General'],
    },
    {
      category: 'Villa Raag Resort',
      subCategories: ['Weekend Stay', 'Day Outing', 'Corporate Booking', 'Event & Wedding', 'General'],
    },
    {
      category: 'Doctor / Vaidya',
      subCategories: ['Ayurvedic Doctor', 'Consultant', 'Clinic Owner', 'General'],
    },
    {
      category: 'Corporate Client',
      subCategories: ['B2B Partner', 'Corporate Wellness', 'Vendor', 'General'],
    },
    {
      category: 'General Enquiry',
      subCategories: ['Website Enquiry', 'Social Media Lead', 'Phone Call Lead', 'General'],
    },
  ]
}

export async function fetchAllDriveFolderFiles(folderId = DEFAULT_DRIVE_FOLDER_ID): Promise<{ id: string; name: string; mimeType: string }[]> {
  try {
    const auth = getGoogleAuth()
    const drive = google.drive({ version: 'v3', auth })
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 200,
    })
    const files = (res.data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
    }))
    console.log(`[GoogleSync] Drive folder ${folderId} — found ${files.length} files:`, files.map(f => `${f.name} (${f.mimeType})`))
    return files
  } catch (err: any) {
    console.error('[GoogleSync] Error listing Drive folder files:', err?.message || err)
    return []
  }
}

// All known Google Sheet IDs that should always be attempted directly
// (Drive folder listing doesn't reliably work for service accounts on personal My Drive)
export const KNOWN_SYNCABLE_SHEET_IDS: { id: string; label: string }[] = [
  { id: DEFAULT_INITIAL_SHEET_ID, label: 'Master Seed Data Sheet' },
]
export async function fetchFileFromDriveParsed(
  fileId: string,
  fileName: string,
  mimeType: string,
  sheetsClient: ReturnType<typeof google.sheets>,
  driveClient: ReturnType<typeof google.drive>
): Promise<{ success: boolean; data: { fileName: string; sheetName: string; spreadsheetUrl: string; rows: any[] }[]; error?: string }> {
  try {
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      return await fetchSheetById(fileId, fileName, sheetsClient)
    }
    
    // For Excel / CSV, download the file binary and parse with XLSX
    const res = await driveClient.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    )
    
    const buffer = Buffer.from(res.data as ArrayBuffer)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const data: { fileName: string; sheetName: string; spreadsheetUrl: string; rows: any[] }[] = []
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' })
      data.push({
        fileName,
        sheetName,
        spreadsheetUrl: `https://drive.google.com/file/d/${fileId}/view`,
        rows: rows
      })
    }
    return { success: true, data }
  } catch (e: any) {
    console.error(`[GoogleSync] Error parsing file ${fileName} (${fileId}):`, e)
    return { success: false, data: [], error: e.message || 'Unknown parsing error' }
  }
}

/** Try to read every tab of a specific spreadsheet by its ID */
export async function fetchSheetById(
  sheetId: string,
  label: string,
  sheetsClient: ReturnType<typeof google.sheets>
): Promise<{ success: boolean; data: { fileName: string; sheetName: string; spreadsheetUrl: string; rows: any[] }[]; error?: string }> {
  try {
    const meta = await sheetsClient.spreadsheets.get({ spreadsheetId: sheetId })
    const fileName = meta.data.properties?.title || label
    const tabs = meta.data.sheets || []
    const data: { fileName: string; sheetName: string; spreadsheetUrl: string; rows: any[] }[] = []
    for (const s of tabs) {
      const sheetName = s.properties?.title || 'Sheet1'
      const res = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'${sheetName}'!A1:Z5000`,
      })
      data.push({ 
        fileName, 
        sheetName, 
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`,
        rows: res.data.values || [] 
      })
    }
    return { success: true, data }
  } catch (e: any) {
    const errMsg = e?.message || String(e)
    console.error(`[GoogleSync] Cannot read sheet ${sheetId} (${label}): ${errMsg}`)
    return { success: false, data: [], error: errMsg }
  }
}

let cachedSheetsData: { data: { fileName: string; sheetName: string; spreadsheetUrl: string; rows: any[] }[]; timestamp: number } | null = null
const CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes

export async function fetchAllDriveFolderSheetsData(
  folderId = DEFAULT_DRIVE_FOLDER_ID,
  forceRefresh = false
): Promise<{ fileName: string; sheetName: string; spreadsheetUrl: string; rows: any[] }[]> {
  try {
    if (!forceRefresh && cachedSheetsData && Date.now() - cachedSheetsData.timestamp < CACHE_TTL_MS) {
      return cachedSheetsData.data
    }

    const auth = getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const result: { fileName: string; sheetName: string; spreadsheetUrl: string; rows: any[] }[] = []
    const seenIds = new Set<string>()

    // ── Strategy 1: Try folder listing (works if files are individually shared OR in Shared Drive) ──
    const files = await fetchAllDriveFolderFiles(folderId)
    const sheetsFiles = files.filter((f) => f.mimeType === 'application/vnd.google-apps.spreadsheet')
    console.log(`[GoogleSync] Folder listing found ${sheetsFiles.length} Google Sheet(s) in ${folderId}`)

    for (const file of sheetsFiles) {
      if (file.id === EXPLICIT_MASTER_SHEET_ID) continue // skip master output sheet
      if (seenIds.has(file.id)) continue
      seenIds.add(file.id)
      const { data } = await fetchSheetById(file.id, file.name, sheets)
      result.push(...data)
    }

    // ── Strategy 2: Always try all known sheet IDs directly ──
    // (Folder listing won't see these if they aren't individually shared — try them anyway)
    for (const known of KNOWN_SYNCABLE_SHEET_IDS) {
      if (seenIds.has(known.id) || known.id === EXPLICIT_MASTER_SHEET_ID) continue
      seenIds.add(known.id)
      const { success, data } = await fetchSheetById(known.id, known.label, sheets)
      if (success) {
        console.log(`[GoogleSync] Direct-ID access succeeded for "${known.label}" (${known.id})`)
        result.push(...data)
      }
    }

    console.log(`[GoogleSync] Total sheet tabs collected: ${result.length}`)
    cachedSheetsData = { data: result, timestamp: Date.now() }
    return result
  } catch (err: any) {
    console.error('[GoogleSync] Error fetching drive folder sheets:', err?.message || err)
    return []
  }
}

/** Check which known sheets are accessible to the service account right now */
export async function checkSheetsAccess(): Promise<{
  serviceAccount: string
  sheets: { id: string; label: string; accessible: boolean; url: string; error?: string }[]
}> {
  const auth = getGoogleAuth()
  const sheetsClient = google.sheets({ version: 'v4', auth })
  const serviceAccount = 'kairali-crm-sync@kairali-crm-sync.iam.gserviceaccount.com'

  const allToCheck = [
    ...KNOWN_SYNCABLE_SHEET_IDS,
    { id: DEFAULT_CATEGORY_SHEET_ID, label: 'Category Structure Sheet' },
    { id: EXPLICIT_MASTER_SHEET_ID, label: 'Master Output Sheet (write target)' },
  ]

  const results = await Promise.all(
    allToCheck.map(async ({ id, label }) => {
      const { success, error } = await fetchSheetById(id, label, sheetsClient)
      return {
        id,
        label,
        accessible: success,
        url: `https://docs.google.com/spreadsheets/d/${id}`,
        error,
      }
    })
  )
  return { serviceAccount, sheets: results }
}

export async function fetchSingleSheetByIndex(
  targetIndex: number,
  folderId = DEFAULT_DRIVE_FOLDER_ID
): Promise<{ data: { fileName: string; sheetName: string; spreadsheetUrl: string; rows: any[] }; totalSheets: number } | null> {
  const all = await fetchAllDriveFolderSheetsData(folderId, false)
  if (targetIndex >= 0 && targetIndex < all.length) {
    return { data: all[targetIndex], totalSheets: all.length }
  }
  return null
}


export async function uploadFileToDriveFolder(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId = DEFAULT_DRIVE_FOLDER_ID
): Promise<{ fileId: string; webViewLink: string }> {
  const auth = getGoogleAuth()
  const drive = google.drive({ version: 'v3', auth })
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)

  const res = await drive.files.create({
    supportsAllDrives: true,
    fields: 'id, webViewLink',
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType,
    },
    media: { mimeType, body: stream },
  } as any)

  const fileId = res.data.id!
  const webViewLink = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`
  return { fileId, webViewLink }
}

/** Get the currently active Master Sheet ID and URL from DB (supports sharding) */
export async function getActiveMasterSheet(): Promise<{ id: string; url: string; part: number }> {
  try {
    const pool = await getPool()
    const [rows]: any = await pool.query(
      `SELECT key_name, key_value FROM app_settings WHERE key_name IN ('active_master_sheet_id', 'active_master_sheet_url', 'master_sheet_part')`
    )
    const map: Record<string, string> = {}
    for (const r of rows) map[r.key_name] = r.key_value
    return {
      id: map['active_master_sheet_id'] || EXPLICIT_MASTER_SHEET_ID,
      url: map['active_master_sheet_url'] || EXPLICIT_MASTER_SHEET_URL,
      part: parseInt(map['master_sheet_part'] || '1', 10),
    }
  } catch {
    return { id: EXPLICIT_MASTER_SHEET_ID, url: EXPLICIT_MASTER_SHEET_URL, part: 1 }
  }
}

/** Create a new shard sheet in the Drive folder, set headers, and save it as active */
async function createNewMasterShard(partNumber: number): Promise<{ id: string; url: string }> {
  const auth = getGoogleAuth()
  const drive = google.drive({ version: 'v3', auth })
  const sheets = google.sheets({ version: 'v4', auth })

  const sheetTitle = `Central Master Client Database - Kairali CRM (Part ${partNumber})`

  // Create blank spreadsheet
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: sheetTitle },
    },
  })
  const newSheetId = created.data.spreadsheetId!
  const newSheetUrl = `https://docs.google.com/spreadsheets/d/${newSheetId}/edit`

  // Move it into the correct Drive folder
  await drive.files.update({
    fileId: newSheetId,
    addParents: DEFAULT_DRIVE_FOLDER_ID,
    fields: 'id, parents',
  })

  // Set standard headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: newSheetId,
    range: 'A1:M1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        'Unique Client ID', 'Client Name', 'Phone Number', 'Email Address',
        'Alternate Phone', 'Category', 'Sub Category', 'Source Sheet',
        'Address', 'City / State', 'Country', 'Remarks / Notes', 'Created At',
      ]],
    },
  })

  // Save new active sheet to DB
  const pool = await getPool()
  await pool.query(
    `INSERT INTO app_settings (key_name, key_value) VALUES (?, ?), (?, ?), (?, ?)
     ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
    [
      'active_master_sheet_id', newSheetId,
      'active_master_sheet_url', newSheetUrl,
      'master_sheet_part', String(partNumber),
    ]
  )

  console.log(`[GoogleSync] ✅ New shard created: "${sheetTitle}" → ${newSheetUrl}`)
  return { id: newSheetId, url: newSheetUrl }
}

const MAX_ROWS_PER_MASTER_SHEET = 100_000

export async function appendRowsToMasterSheet(
  newRows: any[][],
  _spreadsheetId?: string, // ignored – always uses active sheet from DB
  rangeName = 'A1'
): Promise<void> {
  if (!newRows || newRows.length === 0) return
  try {
    const auth = getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })

    // Get the currently active master sheet
    let active = await getActiveMasterSheet()

    // Count how many rows currently exist in the active sheet
    let currentRowCount = 0
    try {
      const metaRes = await sheets.spreadsheets.values.get({
        spreadsheetId: active.id,
        range: 'A:A',
        majorDimension: 'COLUMNS',
      })
      currentRowCount = (metaRes.data.values?.[0]?.length || 1) - 1 // subtract header row
    } catch {
      currentRowCount = 0
    }

    // Check if adding newRows would exceed the 100k limit
    if (currentRowCount + newRows.length > MAX_ROWS_PER_MASTER_SHEET) {
      console.log(`[GoogleSync] 🔄 Master sheet at ${currentRowCount} rows. Limit is ${MAX_ROWS_PER_MASTER_SHEET}. Creating new shard (Part ${active.part + 1})...`)
      active = { ...await createNewMasterShard(active.part + 1), part: active.part + 1 }
    }

    // Append to the (possibly new) active sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: active.id,
      range: rangeName,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: newRows },
    })
  } catch (err) {
    console.error('[GoogleSync] Error appending to master sheet:', err)
  }
}
