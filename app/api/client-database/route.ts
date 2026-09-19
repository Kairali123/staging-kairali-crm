import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { ensureClientDatabaseTables } from '@/lib/client-db-init'
import { normalizePhone, normalizeEmail, isInternalEmail, matchCategoryAndSubCategory, generateClientId } from '@/lib/client-dedup-engine'
import { fetchCategoryHierarchyFromSheet } from '@/lib/google-client-sync'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '25', 10)))
    const offset = (page - 1) * limit
    const search = (searchParams.get('search') || '').trim()
    const category = (searchParams.get('category') || '').trim()
    const subCategory = (searchParams.get('subCategory') || '').trim()
    const source = (searchParams.get('source') || '').trim()

    const pool = await getPool()
    
    // Auto-create MySQL tables if missing
    await ensureClientDatabaseTables(pool)

    let whereClause = 'WHERE 1=1'
    const queryParams: any[] = []

    if (search) {
      whereClause += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR unique_client_id LIKE ? OR city_state LIKE ? OR address LIKE ? OR country LIKE ? OR category LIKE ? OR sub_category LIKE ?)'
      const term = `%${search}%`
      queryParams.push(term, term, term, term, term, term, term, term, term)
    }

    if (category && category !== 'ALL') {
      whereClause += ' AND category = ?'
      queryParams.push(category)
    }

    if (subCategory && subCategory !== 'ALL') {
      whereClause += ' AND sub_category = ?'
      queryParams.push(subCategory)
    }

    if (source && source !== 'ALL') {
      whereClause += ' AND source_sheet = ?'
      queryParams.push(source)
    }

    const sortField = searchParams.get('sortField') || 'id'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC'
    
    const allowedSortFields = ['id', 'name', 'category', 'sub_category', 'created_at']
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'id'

    // Total count
    const [countRows]: any = await pool.query(
      `SELECT COUNT(*) as total FROM client_database ${whereClause}`,
      queryParams
    )
    const total = countRows[0]?.total || 0

    // Fetch paginated data
    const [rows]: any = await pool.query(
      `SELECT * FROM client_database ${whereClause} ORDER BY ${safeSortField} ${sortOrder} LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    )

    // KPI Metrics
    const [kpiRows]: any = await pool.query(`
      SELECT 
        COUNT(*) as totalClients,
        COUNT(DISTINCT NULLIF(phone, '')) as uniquePhones,
        COUNT(DISTINCT NULLIF(email, '')) as uniqueEmails,
        COUNT(DISTINCT category) as totalCategories,
        COUNT(DISTINCT sub_category) as totalSubCategories
      FROM client_database ${whereClause}
    `, queryParams)

    // Source Sheets Dropdown Data
    const [sourceRows]: any = await pool.query(`
      SELECT source_sheet, COUNT(*) as count
      FROM client_database
      GROUP BY source_sheet
      ORDER BY count DESC
    `)

    return NextResponse.json({
      success: true,
      clients: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: kpiRows[0] || {
        totalClients: 0,
        uniquePhones: 0,
        uniqueEmails: 0,
        totalCategories: 0,
        totalSubCategories: 0,
      },
      sourceSheets: sourceRows || []
    })
  } catch (err: any) {
    console.error('[API client-database GET]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, phone, alternate_phone, category, sub_category, source_sheet, address, city_state, country, remarks } = body

    if (!name || (!phone && !email)) {
      return NextResponse.json(
        { success: false, error: 'Client Name and at least one contact method (Phone or Email) are required.' },
        { status: 400 }
      )
    }

    if (isInternalEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Internal employee email addresses cannot be saved in the client database.' },
        { status: 400 }
      )
    }

    const normPhone = normalizePhone(phone)
    const normEmail = normalizeEmail(email)
    const normAltPhone = normalizePhone(alternate_phone)

    const pool = await getPool()

    // Auto-create MySQL tables if missing
    await ensureClientDatabaseTables(pool)

    // Deduplication check
    if (normPhone) {
      const [dupPhone]: any = await pool.query(
        'SELECT id, unique_client_id, name FROM client_database WHERE phone = ? LIMIT 1',
        [normPhone]
      )
      if (dupPhone.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Duplicate record found! Phone number ${normPhone} belongs to client "${dupPhone[0].name}" (${dupPhone[0].unique_client_id}).`,
          },
          { status: 409 }
        )
      }
    }

    if (normEmail) {
      const [dupEmail]: any = await pool.query(
        'SELECT id, unique_client_id, name FROM client_database WHERE email = ? LIMIT 1',
        [normEmail]
      )
      if (dupEmail.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Duplicate record found! Email ID ${normEmail} belongs to client "${dupEmail[0].name}" (${dupEmail[0].unique_client_id}).`,
          },
          { status: 409 }
        )
      }
    }

    // Auto Category & Sub-category Classification if not specified
    const categoryHierarchy = await fetchCategoryHierarchyFromSheet()
    const { category: finalCategory, subCategory: finalSubCategory } = matchCategoryAndSubCategory(
      category,
      sub_category,
      source_sheet || 'Manual Entry',
      remarks,
      categoryHierarchy
    )

    // Generate Unique Client ID
    const [countRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM client_database')
    const currentCount = (countRes[0]?.cnt || 0) + 1
    const uniqueClientId = generateClientId(currentCount)

    await pool.query(
      `INSERT INTO client_database 
        (unique_client_id, name, email, phone, alternate_phone, category, sub_category, source_sheet, address, city_state, country, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uniqueClientId,
        name.trim(),
        normEmail || null,
        normPhone || null,
        normAltPhone || null,
        finalCategory,
        finalSubCategory,
        source_sheet || 'Dashboard Add Form',
        address || null,
        city_state || null,
        country || 'India',
        remarks || null,
      ]
    )

    return NextResponse.json({
      success: true,
      message: `Client ${name} added successfully with ID ${uniqueClientId}!`,
      unique_client_id: uniqueClientId,
    })
  } catch (err: any) {
    console.error('[API client-database POST]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
