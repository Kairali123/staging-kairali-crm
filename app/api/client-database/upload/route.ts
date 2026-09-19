import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { ensureClientDatabaseTables } from '@/lib/client-db-init'
import { normalizePhone, normalizeEmail, isInternalEmail, matchCategoryAndSubCategory, generateClientId } from '@/lib/client-dedup-engine'
import { fetchCategoryHierarchyFromSheet } from '@/lib/google-client-sync'

export async function GET() {
  try {
    const pool = await getPool()
    await ensureClientDatabaseTables(pool)
    const [rows]: any = await pool.query('SELECT * FROM client_upload_logs ORDER BY id DESC LIMIT 50')
    return NextResponse.json({ success: true, logs: rows })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const uploadedBy = (formData.get('uploadedBy') as string) || 'Admin User'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const content = buffer.toString('utf-8')

    // Parse CSV lines
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length <= 1) {
      return NextResponse.json({ success: false, error: 'CSV file is empty or missing data rows.' }, { status: 400 })
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase())
    
    // Find index of standard columns
    const idxName = headers.findIndex((h) => h.includes('name'))
    const idxPhone = headers.findIndex((h) => h.includes('phone') || h.includes('mobile'))
    const idxEmail = headers.findIndex((h) => h.includes('email'))
    const idxAltPhone = headers.findIndex((h) => h.includes('alt') || h.includes('secondary'))
    const idxCategory = headers.findIndex((h) => h === 'category')
    const idxSubCategory = headers.findIndex((h) => h.includes('sub') || h.includes('sub category') || h.includes('subcategory'))
    const idxSource = headers.findIndex((h) => h.includes('source'))
    const idxAddress = headers.findIndex((h) => h.includes('address') || h.includes('street'))
    const idxCity = headers.findIndex((h) => h.includes('city') || h.includes('state'))
    const idxCountry = headers.findIndex((h) => h.includes('country') || h.includes('nation'))
    const idxRemarks = headers.findIndex((h) => h.includes('remark') || h.includes('note'))

    const pool = await getPool()
    await ensureClientDatabaseTables(pool)
    const categoryHierarchy = await fetchCategoryHierarchyFromSheet()

    // Fetch current client ID count
    const [countRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM client_database')
    let currentCount = countRes[0]?.cnt || 0

    let addedCount = 0
    let rejectedCount = 0
    const rejectionReasons: { row: number; reason: string; data: string }[] = []

    for (let i = 1; i < lines.length; i++) {
      const rowStr = lines[i]
      const cols = rowStr.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      
      const rawName = idxName !== -1 ? cols[idxName] : cols[0]
      const rawPhone = idxPhone !== -1 ? cols[idxPhone] : cols[1]
      const rawEmail = idxEmail !== -1 ? cols[idxEmail] : cols[2]
      const rawAltPhone = idxAltPhone !== -1 ? cols[idxAltPhone] : ''
      const rawCategory = idxCategory !== -1 ? cols[idxCategory] : ''
      const rawSubCategory = idxSubCategory !== -1 ? cols[idxSubCategory] : ''
      const rawSource = idxSource !== -1 ? cols[idxSource] : file.name
      const rawAddress = idxAddress !== -1 ? cols[idxAddress] : ''
      const rawCity = idxCity !== -1 ? cols[idxCity] : ''
      const rawCountry = idxCountry !== -1 ? cols[idxCountry] : 'India'
      const rawRemarks = idxRemarks !== -1 ? cols[idxRemarks] : ''

      if (!rawName || (!rawPhone && !rawEmail)) {
        rejectedCount++
        rejectionReasons.push({ row: i + 1, reason: 'Missing name or contact method', data: rowStr })
        continue
      }

      let hasInternalEmail = false
      for (let j = 0; j < cols.length; j++) {
        if (isInternalEmail(cols[j])) {
          hasInternalEmail = true
          break
        }
      }
      if (hasInternalEmail) {
        rejectedCount++
        rejectionReasons.push({ row: i + 1, reason: 'Internal employee email domain excluded', data: rowStr })
        continue
      }

      const normPhone = normalizePhone(rawPhone)
      const normEmail = normalizeEmail(rawEmail)
      const normAltPhone = normalizePhone(rawAltPhone)

      // Calculate field completeness score (number of non-empty properties)
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
        if (r.category && String(r.category).trim()) score++
        if (r.subCategory && String(r.subCategory).trim()) score++
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

      // Duplicate Check against MySQL Table
      let existingRecord: any = null
      if (normPhone) {
        const [dupPhone]: any = await pool.query(
          'SELECT * FROM client_database WHERE phone = ? LIMIT 1',
          [normPhone]
        )
        if (dupPhone.length > 0) existingRecord = dupPhone[0]
      }

      if (!existingRecord && normEmail) {
        const [dupEmail]: any = await pool.query(
          'SELECT * FROM client_database WHERE email = ? LIMIT 1',
          [normEmail]
        )
        if (dupEmail.length > 0) existingRecord = dupEmail[0]
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

        // If new row has MORE or richer data fields, update the existing record!
        if (candidateScore > existingScore) {
          const { category: finalCategory, subCategory: finalSubCategory } = matchCategoryAndSubCategory(
            rawCategory || existingRecord.category,
            rawSubCategory || existingRecord.sub_category,
            rawSource,
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
              rawSource || file.name,
              rawAddress || existingRecord.address,
              rawCity || existingRecord.city_state,
              rawCountry || existingRecord.country,
              rawRemarks || existingRecord.remarks,
              existingRecord.id,
            ]
          )
          addedCount++
        } else {
          rejectedCount++
          rejectionReasons.push({ row: i + 1, reason: `Duplicate (kept existing richer record ${existingRecord.unique_client_id})`, data: rowStr })
        }
        continue
      }

      // Valid & Clean record - Insert to MySQL
      currentCount++
      const uniqueClientId = generateClientId(currentCount)
      const { category: finalCategory, subCategory: finalSubCategory } = matchCategoryAndSubCategory(
        rawCategory,
        rawSubCategory,
        rawSource,
        rawRemarks,
        categoryHierarchy
      )

      await pool.query(
        `INSERT INTO client_database 
          (unique_client_id, name, email, phone, alternate_phone, category, sub_category, source_sheet, address, city_state, country, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uniqueClientId,
          rawName,
          normEmail || null,
          normPhone || null,
          normAltPhone || null,
          finalCategory,
          finalSubCategory,
          rawSource || file.name,
          rawAddress || null,
          rawCity || null,
          rawCountry || 'India',
          rawRemarks || null,
        ]
      )

      addedCount++
    }

    // Upload original file to Google Drive folder
    let driveFileUrl: string | null = null
    let driveFileId: string | null = null
    try {
      const { uploadFileToDriveFolder } = await import('@/lib/google-client-sync')
      const fileBuffer = Buffer.from(bytes)
      const mimeType = file.name.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const driveResult = await uploadFileToDriveFolder(fileBuffer, file.name, mimeType)
      driveFileUrl = driveResult.webViewLink
      driveFileId = driveResult.fileId
    } catch (driveErr) {
      console.error('[Upload Route] Drive upload failed (non-fatal):', driveErr)
    }

    // Record upload log to MySQL
    await pool.query(
      `INSERT INTO client_upload_logs 
        (file_name, uploaded_by, total_rows, added_rows, rejected_rows, rejection_reasons, drive_file_id, drive_file_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        file.name,
        uploadedBy,
        lines.length - 1,
        addedCount,
        rejectedCount,
        JSON.stringify(rejectionReasons),
        driveFileId,
        driveFileUrl,
      ]
    )

    return NextResponse.json({
      success: true,
      message: `File processed! ${addedCount} records added, ${rejectedCount} rejected.`,
      addedRows: addedCount,
      rejectedRows: rejectedCount,
      rejectionReasons,
      driveFileUrl,
      stats: {
        totalRows: lines.length - 1,
        addedRows: addedCount,
        rejectedRows: rejectedCount,
        rejectionReasons,
      },
    })
  } catch (err: any) {
    console.error('[API client-database upload]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
