import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { authorizeApiRequest, unauthorizedResponse } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
    if (!(await authorizeApiRequest(req))) {
        return unauthorizedResponse(req)
    }

    try {
        const pool = await getPool()

        const { searchParams } = new URL(req.url)

        const type = searchParams.get('type') // verified | unverified | all
        const companyParam = searchParams.get('company')

        let conditions: string[] = []
        let values: any[] = []

        // ✅ VERIFIED FILTER
        if (type === 'verified') {
            conditions.push(`
                is_verified = 1 
                AND LOWER(booking_status) = 'confirmed'
            `)
        }

        // ✅ UNVERIFIED FILTER (FIXED)
        if (type === 'unverified') {
            conditions.push(`
                is_verified = 0 
                AND LOWER(booking_status) NOT IN 
                ('booking cancelled','cancelled','no show','voucher','complimentary')
                AND LOWER(booking_type) != 'sample order'
            `)
        }

        // ✅ COMPANY FILTER
        if (companyParam) {
            conditions.push(`company = ?`)
            values.push(companyParam)
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : ''

        const [rows] = await pool.execute(
            `SELECT 
                DATE_FORMAT(date_and_time, '%d-%m-%Y') as formatted_date,
                date_and_time,
                week_number,
                month_name,
                year,
                booking_order_id,
                name_of_client,
                mobile,
                email,
                NBD_CRR,
                sales_person_name,
                is_verified,
                conversion_amount,
                amount_after_return,
                verified_source,
                booking_status,
                booking_type,
                company,
                return_id
            FROM spalabsdomain_Kairali_CRM_Db.conversion_updates_employeewise
            ${whereClause}
            ORDER BY company, date_and_time ASC`,
            values
        ) as any[]

        const result: Record<string, any> = {}

        rows.forEach((row: any) => {
            const company = row.company || 'KAPPL'
            const source = row.verified_source || 'Others'
            const status = (row.booking_status || '').toLowerCase()
            const returnId = row.return_id || ""

            // ✅ AMOUNT FIX
            const processAmount = (val: any) => {
                if (!val) return 0
                const str = String(val).replace(/[^0-9.-]+/g, '')
                const num = Number(str)
                return isNaN(num) ? 0 : num
            }
            let amount;

            // ✅ IST DATE FIX (Independent of server timezone: Local vs Vercel)
            let dateKey = ''
            if (row.formatted_date && typeof row.formatted_date === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(row.formatted_date)) {
                dateKey = row.formatted_date
            } else if (row.date_and_time) {
                const strVal = String(row.date_and_time).trim()
                const ymd = strVal.match(/^(\d{4})-(\d{2})-(\d{2})/)
                if (ymd) {
                    dateKey = `${ymd[3]}-${ymd[2]}-${ymd[1]}`
                } else {
                    const dmy = strVal.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/)
                    if (dmy) {
                        dateKey = `${dmy[1]}-${dmy[2]}-${dmy[3]}`
                    } else {
                        const d = new Date(row.date_and_time)
                        if (isNaN(d.getTime())) return
                        const istParts = new Intl.DateTimeFormat('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        }).formatToParts(d)
                        const dd = istParts.find(p => p.type === 'day')?.value.padStart(2, '0') || '01'
                        const mm = istParts.find(p => p.type === 'month')?.value.padStart(2, '0') || '01'
                        const yyyy = istParts.find(p => p.type === 'year')?.value || '2026'
                        dateKey = `${dd}-${mm}-${yyyy}`
                    }
                }
            }

            if (!dateKey) return

            // ✅ INIT STRUCTURE
            if (!result[company]) result[company] = {}
            if (!result[company][dateKey]) result[company][dateKey] = {}

            if (!result[company][dateKey][source]) {
                result[company][dateKey][source] = {
                    verified_conversion_count: 0,
                    verified_conversion_amount: 0,
                    verified_conversion_amt_percentage: 0,
                    verified_conversion_row: [],

                    unverified_conversion_count: 0,
                    unverified_conversion_amount: 0,
                    unverified_conversion_percentage: 0,
                    unverified_conversion_row: [],
                    canceled_booking_order_qty: 0,
                    cancelled_order_amount: 0,
                    cancelled_order_percentage: 0,
                }
            }

            const obj = result[company][dateKey][source]

            // =========================
            // ✅ KAPPL LOGIC
            // =========================
            if (company === "KAPPL") {
                amount =
                    processAmount(row.amount_after_return) ||
                    processAmount(row.conversion_amount) ||
                    0
                if (row.is_verified == 1 && returnId === "") {
                    obj.verified_conversion_count += 1
                    obj.verified_conversion_amount += amount
                    obj.verified_conversion_row.push(row)
                }

                if (
                    row.is_verified == 0 &&
                    returnId === "" &&
                    !['voucher', 'complimentary'].includes(status)
                ) {
                    obj.unverified_conversion_count += 1
                    obj.unverified_conversion_amount += amount
                    obj.unverified_conversion_row.push(row)
                }

                if (returnId !== "") {
                    obj.canceled_booking_order_qty += 1
                    obj.cancelled_order_amount += amount
                }

            } else {
                amount = processAmount(row.conversion_amount) ||
                    0

                // ✅ VERIFIED
                if (row.is_verified == 1 && status === 'confirmed') {
                    obj.verified_conversion_count += 1
                    obj.verified_conversion_amount += amount
                    obj.verified_conversion_row.push(row)
                }

                // ✅ UNVERIFIED (FIXED)
                if (
                    row.is_verified == 0 &&
                    ![
                        'booking cancelled',
                        'cancelled',
                        'no show',
                        'voucher',
                        'complimentary'
                    ].includes(status)
                ) {
                    obj.unverified_conversion_count += 1
                    obj.unverified_conversion_amount += amount
                    obj.unverified_conversion_row.push(row)
                }

                // ✅ CANCELLED
                if (
                    status === 'cancelled' ||
                    status === 'booking cancelled' ||
                    status === 'no show'
                ) {
                    obj.canceled_booking_order_qty += 1
                    obj.cancelled_order_amount += amount
                }
            }
        })

        // =========================
        // ✅ PERCENTAGE CALCULATION
        // =========================
        Object.keys(result).forEach(company => {
            Object.keys(result[company]).forEach(date => {
                Object.keys(result[company][date]).forEach(source => {
                    const obj = result[company][date][source]

                    const totalAmount =
                        obj.verified_conversion_amount +
                        obj.unverified_conversion_amount

                    const totalCount =
                        obj.verified_conversion_count +
                        obj.unverified_conversion_count

                    obj.verified_conversion_amt_percentage =
                        totalAmount > 0
                            ? (obj.verified_conversion_amount / totalAmount) * 100
                            : 0

                    obj.unverified_conversion_percentage =
                        totalAmount > 0
                            ? (obj.unverified_conversion_amount / totalAmount) * 100
                            : 0

                    obj.cancelled_order_percentage =
                        totalCount > 0
                            ? (obj.canceled_booking_order_qty / totalCount) * 100
                            : 0
                })
            })
        })

        return NextResponse.json({
            success: true,
            data: result,
            totalRows: rows.length,
            filterApplied: {
                type: type || 'all',
                company: companyParam || 'all'
            }
        })

    } catch (error: any) {
        console.error('[Conversion API Error]:', error)

        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Something went wrong',
            },
            { status: 500 }
        )
    }
}
/*
🔥 ✅ Final API Endpoints
👉 KAPPL Verified:
/api/conversion?type=verified&company=KAPPL
👉 KAPPL Unverified:
/api/conversion?type=unverified&company=KAPPL
👉 Only KAPPL (all data):
/api/conversion?company=KAPPL
👉 All companies verified:
/api/conversion?type=verified
*/
