import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pool = await getPool()
    await pool.query('DELETE FROM client_database WHERE id = ?', [id])
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const pool = await getPool()
    
    const updates: string[] = []
    const values: any[] = []
    
    const allowedFields = ['name', 'phone', 'email', 'category', 'sub_category', 'is_unsubscribed']
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        // handle empty strings mapping to null if appropriate, but keeping it simple
        let val = body[field]
        if (typeof val === 'string' && val.trim() === '' && field !== 'name') {
           val = null
        }
        values.push(val)
      }
    }
    
    if (updates.length === 0) return NextResponse.json({ success: true })
    
    values.push(id)
    
    await pool.query(`UPDATE client_database SET ${updates.join(', ')} WHERE id = ?`, values)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
