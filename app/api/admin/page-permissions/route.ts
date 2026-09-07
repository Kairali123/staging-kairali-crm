import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'
import {
  getCustomPagePermissionModules,
  upsertCustomPagePermissionModule,
  deleteCustomPagePermissionModule,
} from '@/lib/custom-page-permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const rawCookie = req.cookies.get('kairali_user')?.value
    const sessionUser = rawCookie ? verifySessionCookieValue(rawCookie) : null

    if (!sessionUser || !['super_admin', 'admin'].includes(sessionUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const customModules = await getCustomPagePermissionModules()
    return NextResponse.json({ success: true, modules: customModules })
  } catch (error: any) {
    console.error('[GET /api/admin/page-permissions] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch page permissions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawCookie = req.cookies.get('kairali_user')?.value
    const sessionUser = rawCookie ? verifySessionCookieValue(rawCookie) : null

    if (!sessionUser || sessionUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required to configure page permissions.' }, { status: 403 })
    }

    const body = await req.json()
    const { key, label, category, description, actions } = body

    if (!key || !label) {
      return NextResponse.json({ error: 'Module Key and Label are required.' }, { status: 400 })
    }

    const actionsArr = Array.isArray(actions) && actions.length > 0 ? actions : ['view']

    await upsertCustomPagePermissionModule({
      key: String(key).trim().toLowerCase().replace(/[^a-z0-9_\-\.]/g, '_'),
      label: String(label).trim(),
      category: String(category || 'Custom Modules').trim(),
      description: String(description || '').trim(),
      actions: actionsArr,
      isCustom: body.isCustom ?? true,
    })

    const updatedModules = await getCustomPagePermissionModules()
    return NextResponse.json({ success: true, message: 'Page permission module updated successfully.', modules: updatedModules })
  } catch (error: any) {
    console.error('[POST /api/admin/page-permissions] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update page permission module' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const rawCookie = req.cookies.get('kairali_user')?.value
    const sessionUser = rawCookie ? verifySessionCookieValue(rawCookie) : null

    if (!sessionUser || sessionUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const moduleKey = searchParams.get('key')

    if (!moduleKey) {
      return NextResponse.json({ error: 'Module key parameter is required.' }, { status: 400 })
    }

    await deleteCustomPagePermissionModule(moduleKey)
    const updatedModules = await getCustomPagePermissionModules()
    return NextResponse.json({ success: true, message: 'Module deleted successfully.', modules: updatedModules })
  } catch (error: any) {
    console.error('[DELETE /api/admin/page-permissions] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete module' }, { status: 500 })
  }
}
