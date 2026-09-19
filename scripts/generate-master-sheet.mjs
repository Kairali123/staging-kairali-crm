import { getPool } from '../lib/db.js'
import { createNewMasterGoogleSheet, fetchCategoryHierarchyFromSheet, fetchAllMasterSheetRows, appendRowsToMasterSheet } from '../lib/google-client-sync.js'
import { normalizePhone, normalizeEmail, matchCategoryAndSubCategory, generateClientId } from '../lib/client-dedup-engine.js'

async function triggerSync() {
  console.log('[Script] Creating new Master Google Sheet & collecting data...')
  const pool = await getPool()

  // Ensure tables exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_database (
      id INT AUTO_INCREMENT PRIMARY KEY,
      unique_client_id VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NULL,
      phone VARCHAR(50) NULL,
      alternate_phone VARCHAR(50) NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'Uncategorized',
      sub_category VARCHAR(100) NULL DEFAULT 'General',
      source_sheet VARCHAR(255) NOT NULL DEFAULT 'Manual Entry',
      address TEXT NULL,
      city_state VARCHAR(255) NULL,
      country VARCHAR(100) NULL DEFAULT 'India',
      remarks TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_client_phone (phone),
      INDEX idx_client_email (email),
      INDEX idx_client_category (category),
      INDEX idx_client_sub_category (sub_category),
      INDEX idx_client_source (source_sheet)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  try {
    await pool.query(`ALTER TABLE client_database ADD COLUMN address TEXT NULL AFTER source_sheet`)
  } catch (e) {}

  try {
    await pool.query(`ALTER TABLE client_database ADD COLUMN country VARCHAR(100) NULL DEFAULT 'India' AFTER city_state`)
  } catch (e) {}

  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_sync_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sync_type VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'success',
      added_count INT NOT NULL DEFAULT 0,
      duplicate_count INT NOT NULL DEFAULT 0,
      details TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // 1. Create brand new Master Google Sheet in Drive folder
  const newSheet = await createNewMasterGoogleSheet('Central Master Client Database - Kairali CRM')
  console.log('[Script] New Master Google Sheet Created:', newSheet.spreadsheetUrl)

  // Save metadata
  await pool.query(
    `INSERT INTO client_sync_logs (sync_type, status, added_count, duplicate_count, details)
     VALUES ('MASTER_GOOGLE_SHEET_INFO', 'success', 0, 0, ?)`,
    [JSON.stringify({ spreadsheetId: newSheet.spreadsheetId, spreadsheetUrl: newSheet.spreadsheetUrl })]
  )

  // 2. Fetch category hierarchy
  const categoryHierarchy = await fetchCategoryHierarchyFromSheet()
  const sheetData = await fetchAllMasterSheetRows()

  const [countRes] = await pool.query('SELECT COUNT(*) as cnt FROM client_database')
  let currentCount = countRes[0]?.cnt || 0

  let totalSyncAdded = 0
  let totalDuplicatesSkipped = 0
  const newMasterSheetRows = []

  for (const sheetObj of sheetData) {
    const sheetName = sheetObj.sheetName
    const rows = sheetObj.rows
    if (!rows || rows.length <= 1) continue

    const rawHeaderRow = (rows[0] || []).map((h) => String(h || '').trim().toLowerCase())

    const idxName = rawHeaderRow.findIndex((h) => h.includes('name') || h.includes('client') || h.includes('guest'))
    const idxPhone = rawHeaderRow.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('contact'))
    const idxEmail = rawHeaderRow.findIndex((h) => h.includes('email') || h.includes('mail'))
    const idxAltPhone = rawHeaderRow.findIndex((h) => h.includes('alt') || h.includes('secondary'))
    const idxCategory = rawHeaderRow.findIndex((h) => h === 'category')
    const idxSubCategory = rawHeaderRow.findIndex((h) => h.includes('sub'))
    const idxAddress = rawHeaderRow.findIndex((h) => h.includes('address') || h.includes('street'))
    const idxCity = rawHeaderRow.findIndex((h) => h.includes('city') || h.includes('state') || h.includes('location'))
    const idxCountry = rawHeaderRow.findIndex((h) => h.includes('country') || h.includes('nation'))
    const idxRemarks = rawHeaderRow.findIndex((h) => h.includes('remark') || h.includes('note') || h.includes('detail'))

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const rawName = idxName !== -1 ? row[idxName] : (row[0] || row[1] || '')
      const rawPhone = idxPhone !== -1 ? row[idxPhone] : (row[1] || row[2] || '')
      const rawEmail = idxEmail !== -1 ? row[idxEmail] : (row[2] || row[3] || '')
      const rawAltPhone = idxAltPhone !== -1 ? row[idxAltPhone] : ''
      const rawCategory = idxCategory !== -1 ? row[idxCategory] : (row[4] || '')
      const rawSubCategory = idxSubCategory !== -1 ? row[idxSubCategory] : (row[5] || '')
      const rawAddress = idxAddress !== -1 ? row[idxAddress] : ''
      const rawCity = idxCity !== -1 ? row[idxCity] : (row[6] || '')
      const rawCountry = idxCountry !== -1 ? row[idxCountry] : 'India'
      const rawRemarks = idxRemarks !== -1 ? row[idxRemarks] : (row[7] || '')

      if (!rawName && !rawPhone && !rawEmail) continue

      const normPhone = normalizePhone(rawPhone)
      const normEmail = normalizeEmail(rawEmail)
      const normAltPhone = normalizePhone(rawAltPhone)

      let isDuplicate = false

      if (normPhone) {
        const [dupP] = await pool.query('SELECT id FROM client_database WHERE phone = ? LIMIT 1', [normPhone])
        if (dupP.length > 0) isDuplicate = true
      }

      if (!isDuplicate && normEmail) {
        const [dupE] = await pool.query('SELECT id FROM client_database WHERE email = ? LIMIT 1', [normEmail])
        if (dupE.length > 0) isDuplicate = true
      }

      if (isDuplicate) {
        totalDuplicatesSkipped++
        continue
      }

      currentCount++
      const uniqueClientId = generateClientId(currentCount)
      const { category: finalCategory, subCategory: finalSubCategory } = matchCategoryAndSubCategory(
        rawCategory,
        rawSubCategory,
        sheetName,
        rawRemarks,
        categoryHierarchy
      )

      await pool.query(
        `INSERT INTO client_database 
          (unique_client_id, name, email, phone, alternate_phone, category, sub_category, source_sheet, address, city_state, country, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uniqueClientId,
          rawName || 'Client ' + currentCount,
          normEmail || null,
          normPhone || null,
          normAltPhone || null,
          finalCategory,
          finalSubCategory,
          sheetName,
          rawAddress || null,
          rawCity || null,
          rawCountry || 'India',
          rawRemarks || null,
        ]
      )

      totalSyncAdded++

      newMasterSheetRows.push([
        uniqueClientId,
        rawName || 'Client ' + currentCount,
        normPhone || '',
        normEmail || '',
        normAltPhone || '',
        finalCategory,
        finalSubCategory,
        sheetName,
        rawAddress || '',
        rawCity || '',
        rawCountry || 'India',
        rawRemarks || '',
        new Date().toISOString(),
      ])
    }
  }

  if (newMasterSheetRows.length > 0 && newSheet.spreadsheetId) {
    await appendRowsToMasterSheet(newMasterSheetRows, newSheet.spreadsheetId)
    console.log(`[Script] Added ${newMasterSheetRows.length} rows to new Master Google Sheet!`)
  }

  console.log('[Script] COMPLETED! Master Sheet URL:', newSheet.spreadsheetUrl)
  process.exit(0)
}

triggerSync().catch((err) => {
  console.error('[Script Error]', err)
  process.exit(1)
})
