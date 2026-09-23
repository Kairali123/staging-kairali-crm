import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { ensureClientDatabaseTables } from '@/lib/client-db-init'
import { normalizePhone, normalizeEmail, isInternalEmail, matchCategoryAndSubCategory, generateClientId } from '@/lib/client-dedup-engine'
import {
  fetchCategoryHierarchyFromSheet,
  fetchAllDriveFolderSheetsData,
  fetchSingleSheetByIndex,
  setupUserMasterGoogleSheet,
  appendRowsToMasterSheet,
  fetchAllDriveFolderFiles,
  checkSheetsAccess,
  DEFAULT_DRIVE_FOLDER_ID,
  EXPLICIT_MASTER_SHEET_ID,
  EXPLICIT_MASTER_SHEET_URL,
  getGoogleAuth,
  fetchSheetById,
  fetchFileFromDriveParsed,
  getActiveMasterSheet,
} from '@/lib/google-client-sync'

export async function GET() {
  try {
    // Step 1: Check which known sheets the service account can access
    const accessStatus = await checkSheetsAccess()

    // Step 2: List raw files in the Drive folder
    const folderFiles = await fetchAllDriveFolderFiles()
    
    // Step 3: We don't fetch contents here anymore to prevent O(N^2) timeouts.
    // We just return the list of spreadsheet files (exclude ALL master shards from sync source).
    const pool2 = await getPool()
    await ensureClientDatabaseTables(pool2)
    
    // Fetch all known master sheet IDs (original + any shards)
    const [settingsRows]: any = await pool2.query(`SELECT key_value FROM app_settings WHERE key_name = 'active_master_sheet_id'`)
    const activeMasterSheetId = settingsRows[0]?.key_value || EXPLICIT_MASTER_SHEET_ID
    
    const validMimeTypes = new Set([
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ])
    const masterSheetIds = new Set([EXPLICIT_MASTER_SHEET_ID, activeMasterSheetId])
    const sheetsFiles = folderFiles.filter((f) => validMimeTypes.has(f.mimeType) && !masterSheetIds.has(f.id))

    const sheets = sheetsFiles.map((s, idx) => ({
      index: idx,
      fileId: s.id,
      fileName: s.name,
      sheetName: s.name,
      mimeType: s.mimeType,
      rowCount: '?', // Will be discovered during POST
    }))

    if (sheets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No Google Sheets could be read. Share the required sheets with the service account shown below.',
        folderFileCount: folderFiles.length,
        sheets: [],
        accessStatus,
      })
    }

    const pool = await getPool()
    let syncLogs = []
    let alreadySyncedNames = new Set<string>()
    
    try {
      // Fetch all successful sync logs to know which sheets we already processed
      const [rows]: any = await pool.query("SELECT details FROM client_sync_logs WHERE status = 'success' AND sync_type = 'Drive Sync Batch'")
      syncLogs = rows
      
      // Extract file names from the details string: "Processed sheet: <fileName> (...)"
      for (const row of rows) {
        if (row.details && row.details.startsWith('Processed sheet: ')) {
          const namePart = row.details.split(' (')[0].replace('Processed sheet: ', '')
          if (namePart) alreadySyncedNames.add(namePart)
        }
      }
    } catch(e) { console.error('Failed to fetch sync logs', e) }

    // Filter out sheets that have already been synced
    const pendingSheets = sheets.filter(s => !alreadySyncedNames.has(s.fileName))

    if (pendingSheets.length === 0 && sheets.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'No new sheets available to sync. All data is already sync done!',
        folderFileCount: folderFiles.length,
        sheets: [],
        accessStatus,
        syncLogs,
      })
    }

    // Get active master sheet info (supports auto-sharding)
    const activeMaster = await getActiveMasterSheet()

    return NextResponse.json({
      success: true,
      masterSheetUrl: activeMaster.url,
      masterSheetId: activeMaster.id,
      masterSheetPart: activeMaster.part,
      totalSheets: pendingSheets.length,
      sheets: pendingSheets,
      folderFileCount: folderFiles.length,
      accessStatus,
      syncLogs,
    })
  } catch (err: any) {
    console.error('[Sync GET] Error:', err?.message || err)
    return NextResponse.json({
      success: false,
      error: err?.message || 'Unknown error fetching Drive folder data.',
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const fileId = body.fileId
    const fileName = body.fileName

    const pool = await getPool()
    await ensureClientDatabaseTables(pool)
    const masterSheetId = EXPLICIT_MASTER_SHEET_ID
    const masterSheetUrl = EXPLICIT_MASTER_SHEET_URL

    await setupUserMasterGoogleSheet(masterSheetId)
    const categoryHierarchy = await fetchCategoryHierarchyFromSheet()

    let sheetDataToProcess: { fileName: string; sheetName: string; spreadsheetUrl: string; rows: any[] }[] = []
    let totalSheetsCount = 1

    if (fileId) {
      const mimeType = body.mimeType || 'application/vnd.google-apps.spreadsheet'
      const { google } = await import('googleapis')
      const auth = getGoogleAuth()
      const sheetsClient = google.sheets({ version: 'v4', auth })
      const driveClient = google.drive({ version: 'v3', auth })
      
      const { success, data, error } = await fetchFileFromDriveParsed(fileId, fileName || 'Unknown', mimeType, sheetsClient, driveClient)
      if (success && data.length > 0) {
        sheetDataToProcess = data
      } else {
        throw new Error(error || 'Failed to fetch sheet data')
      }
    } else {
      // Fallback for full sync if called without specific fileId
      const allSheetsData = await fetchAllDriveFolderSheetsData()
      sheetDataToProcess = allSheetsData
      totalSheetsCount = allSheetsData.length
    }

    const [countRes]: any = await pool.query('SELECT COALESCE(MAX(CAST(SUBSTRING(unique_client_id, 8) AS UNSIGNED)), 0) as cnt FROM client_database')
    let currentCount = countRes[0]?.cnt || 0

    // Load all existing contacts into memory for O(1) deduplication (prevents N+1 query slowdowns on huge files)
    const [allDbRows]: any = await pool.query('SELECT * FROM client_database')
    const existingByPhone = new Map<string, any>()
    const existingByEmail = new Map<string, any>()
    for (const r of allDbRows) {
      if (r.phone) existingByPhone.set(r.phone, r)
      if (r.email) existingByEmail.set(r.email, r)
    }

    let totalSyncAdded = 0
    let totalDuplicatesSkipped = 0
    const newMasterSheetRows: any[][] = []

    for (const sheetObj of sheetDataToProcess) {
      try {
        const sheetName = sheetObj.fileName ? `${sheetObj.fileName} – ${sheetObj.sheetName}` : sheetObj.sheetName
        const rows = sheetObj.rows

        if (!rows || rows.length <= 1) continue

        const rawHeaderRow = (rows[0] || []).map((h: any) => String(h || '').trim().toLowerCase())

        const idxName = rawHeaderRow.findIndex((h: string) => h.includes('name') || h.includes('client') || h.includes('guest') || h.includes('company') || h.includes('hospital') || h.includes('lead'))
        const idxPhone = rawHeaderRow.findIndex((h: string) => h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('whatsapp') || h.includes('tel'))
        const idxEmail = rawHeaderRow.findIndex((h: string) => h.includes('email') || h.includes('mail'))
        const idxAltPhone = rawHeaderRow.findIndex((h: string) => h.includes('alt') || h.includes('secondary') || h.includes('other'))
        const idxCategory = rawHeaderRow.findIndex((h: string) => h === 'category' || h.includes('type'))
        const idxSubCategory = rawHeaderRow.findIndex((h: string) => h.includes('sub') || h.includes('specialty'))
        const idxAddress = rawHeaderRow.findIndex((h: string) => h.includes('address') || h.includes('street') || h.includes('area') || h.includes('location'))
        const idxCity = rawHeaderRow.findIndex((h: string) => h.includes('city') || h.includes('state') || h.includes('region') || h.includes('district'))
        const idxCountry = rawHeaderRow.findIndex((h: string) => h.includes('country') || h.includes('nation'))
        const idxRemarks = rawHeaderRow.findIndex((h: string) => h.includes('remark') || h.includes('note') || h.includes('detail') || h.includes('comment') || h.includes('status'))

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.length === 0) continue

          let rawName = idxName !== -1 ? row[idxName] : ''
          let rawPhone = idxPhone !== -1 ? row[idxPhone] : ''
          let rawEmail = idxEmail !== -1 ? row[idxEmail] : ''
          let rawAltPhone = idxAltPhone !== -1 ? row[idxAltPhone] : ''
          let rawCategory = idxCategory !== -1 ? row[idxCategory] : ''
          let rawSubCategory = idxSubCategory !== -1 ? row[idxSubCategory] : ''
          let rawAddress = idxAddress !== -1 ? row[idxAddress] : ''
          let rawCity = idxCity !== -1 ? row[idxCity] : ''
          let rawCountry = idxCountry !== -1 ? row[idxCountry] : 'India'
          let rawRemarks = idxRemarks !== -1 ? row[idxRemarks] : ''

          let normPhone = normalizePhone(rawPhone)
          // Check if any cell in this row contains an internal email ID
          let hasInternalEmail = false
          for (let j = 0; j < row.length; j++) {
            if (isInternalEmail(row[j])) {
              hasInternalEmail = true
              break
            }
          }
          if (hasInternalEmail) continue

          let normEmail = normalizeEmail(rawEmail)
          let normAltPhone = normalizePhone(rawAltPhone)

          // Smart fallback: scan all columns for email, phone, and name if not strictly found by header
          if (!normEmail || !normPhone || !rawName) {
            for (let j = 0; j < row.length; j++) {
              const cell = String(row[j] || '').trim()
              if (!cell) continue

              if (!normEmail && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cell)) {
                const possibleEmail = normalizeEmail(cell)
                if (possibleEmail) normEmail = possibleEmail
              } else if (!normPhone && /^\+?[\d\s-]{8,}$/.test(cell)) {
                const possiblePhone = normalizePhone(cell)
                if (possiblePhone) {
                  // Make sure it doesn't just overwrite an already found alt phone, or we can just set it
                  normPhone = possiblePhone
                }
              } else if (!rawName && j === 0 && !cell.includes('@') && !/^\+?[\d\s-]{8,}$/.test(cell)) {
                 // Guess name from first column if empty
                 rawName = cell
              }
            }
          }

          // Rule: If BOTH phone AND email are empty, completely ignore the row
          if (!normPhone && !normEmail) continue

          const calcScore = (r: { name?: any; email?: any; phone?: any; altPhone?: any; address?: any; city?: any; country?: any; remarks?: any; category?: any; subCategory?: any }) => {
            let score = 0
            if (r.name && String(r.name).trim()) score++
            if (r.email && String(r.email).trim()) score++
            if (r.phone && String(r.phone).trim()) score++
            if (r.altPhone && String(r.altPhone).trim()) score++
            if (r.address && String(r.address).trim()) score++
            if (r.city && String(r.city).trim()) score++
            if (r.country && String(r.country).trim() && String(r.country).trim() !== 'India') score++
            if (r.remarks && String(r.remarks).trim()) score++
            if (r.category && String(r.category).trim() && String(r.category).trim() !== 'Uncategorized') score++
            if (r.subCategory && String(r.subCategory).trim() && String(r.subCategory).trim() !== 'General') score++
            return score
          }

          const candidateScore = calcScore({
            name: rawName,
            email: normEmail,
            phone: normPhone,
            altPhone: normAltPhone,
            address: rawAddress,
            city: rawCity,
            country: rawCountry,
            remarks: rawRemarks,
            category: rawCategory,
            subCategory: rawSubCategory,
          })

          let existingRecord: any = null
          if (normPhone && existingByPhone.has(normPhone)) {
            existingRecord = existingByPhone.get(normPhone)
          }
          if (!existingRecord && normEmail && existingByEmail.has(normEmail)) {
            existingRecord = existingByEmail.get(normEmail)
          }

          if (existingRecord) {
            const existingScore = calcScore({
              name: existingRecord.name,
              email: existingRecord.email,
              phone: existingRecord.phone,
              altPhone: existingRecord.alternate_phone,
              address: existingRecord.address,
              city: existingRecord.city_state,
              country: existingRecord.country,
              remarks: existingRecord.remarks,
              category: existingRecord.category,
              subCategory: existingRecord.sub_category,
            })

            if (candidateScore > existingScore) {
              const { category: finalCategory, subCategory: finalSubCategory } = matchCategoryAndSubCategory(
                rawCategory || existingRecord.category,
                rawSubCategory || existingRecord.sub_category,
                sheetName,
                rawRemarks || existingRecord.remarks,
                categoryHierarchy
              )

              await pool.query(
                `UPDATE client_database 
                 SET name = COALESCE(NULLIF(?, ''), name),
                     email = COALESCE(NULLIF(?, ''), email),
                     phone = COALESCE(NULLIF(?, ''), phone),
                     alternate_phone = COALESCE(NULLIF(?, ''), alternate_phone),
                     category = ?,
                     sub_category = ?,
                     source_sheet = ?,
                     source_sheet_url = ?,
                     address = COALESCE(NULLIF(?, ''), address),
                     city_state = COALESCE(NULLIF(?, ''), city_state),
                     country = COALESCE(NULLIF(?, ''), country),
                     remarks = COALESCE(NULLIF(?, ''), remarks)
                 WHERE id = ?`,
                [
                  rawName || existingRecord.name,
                  normEmail || existingRecord.email,
                  normPhone || existingRecord.phone,
                  normAltPhone || existingRecord.alternate_phone,
                  finalCategory,
                  finalSubCategory,
                  sheetName,
                  sheetObj.spreadsheetUrl || null,
                  rawAddress || existingRecord.address,
                  rawCity || existingRecord.city_state,
                  rawCountry || existingRecord.country,
                  rawRemarks || existingRecord.remarks,
                  existingRecord.id,
                ]
              )
              // Update memory maps
              existingRecord.name = rawName || existingRecord.name
              existingRecord.email = normEmail || existingRecord.email
              existingRecord.phone = normPhone || existingRecord.phone
              if (existingRecord.phone) existingByPhone.set(existingRecord.phone, existingRecord)
              if (existingRecord.email) existingByEmail.set(existingRecord.email, existingRecord)

              totalSyncAdded++
            } else {
              totalDuplicatesSkipped++
            }
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
              (unique_client_id, name, email, phone, alternate_phone, category, sub_category, source_sheet, source_sheet_url, address, city_state, country, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uniqueClientId,
              rawName || 'Client ' + currentCount,
              normEmail || null,
              normPhone || null,
              normAltPhone || null,
              finalCategory,
              finalSubCategory,
              sheetName,
              sheetObj.spreadsheetUrl || null,
              rawAddress || null,
              rawCity || null,
              rawCountry || 'India',
              rawRemarks || null,
            ]
          )

          // Add to memory map
          const newRecord = {
            id: uniqueClientId,
            name: rawName || 'Client ' + currentCount,
            email: normEmail || null,
            phone: normPhone || null,
          }
          if (normPhone) existingByPhone.set(normPhone, newRecord)
          if (normEmail) existingByEmail.set(normEmail, newRecord)

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
      } catch (sheetErr) {
        console.error('[Sync Sheet Error]', sheetErr)
      }
    }

    if (newMasterSheetRows.length > 0) {
      await appendRowsToMasterSheet(newMasterSheetRows, masterSheetId)
    }

    const processedSheetName = fileName || 'Unknown File'
    
    const totalProcessed = totalSyncAdded + totalDuplicatesSkipped

    await pool.query(
      `INSERT INTO client_sync_logs 
        (sync_type, status, added_count, duplicate_count, details)
       VALUES ('Batch Sync', 'success', ?, ?, ?)`,
      [
        totalSyncAdded,
        totalDuplicatesSkipped,
        `Processed sheet: ${processedSheetName} (${totalProcessed} total rows). Added ${totalSyncAdded} new, skipped ${totalDuplicatesSkipped} duplicates.`,
      ]
    )

    return NextResponse.json({
      success: true,
      message: `Batch Synced! Processed ${processedSheetName} (${totalProcessed} total rows): ${totalSyncAdded} added, ${totalDuplicatesSkipped} duplicates skipped.`,
      stats: {
        added: totalSyncAdded,
        duplicates: totalDuplicatesSkipped,
        totalSheets: totalSheetsCount,
        processedIndex: 0,
      },
    })
  } catch (err: any) {
    console.error('[API client-database sync]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
