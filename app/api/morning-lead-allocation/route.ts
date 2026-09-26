import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, hasAdminRole, hasPermission } from '@/lib/authz'
import { loadMorningAllocation, saveMorningAllocationAction, type AllocationAction } from '@/lib/morning-lead-allocation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

function canView(user: unknown) { return hasAdminRole(user, 'trimmed-lower') || hasPermission(user, 'leads.view') || hasPermission(user, 'leads.assign') }
function canEdit(user: unknown) { return hasAdminRole(user, 'trimmed-lower') || hasPermission(user, 'leads.assign') }
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  const denied = /403|PERMISSION_DENIED|permission/i.test(message)
  const missing = /not configured/i.test(message)
  return NextResponse.json({
    error: denied
      ? 'Google Sheets denied the CRM service account. It needs Editor access to the master Sheet and each employee Sheet in Config for owner transfers, then refresh.'
      : missing
        ? 'CRM Google service account is missing from server configuration.'
        : 'Could not load or save the allocation. Try again or use the manual source list.',
    code: denied ? 'SHEET_PERMISSION_DENIED' : missing ? 'SHEET_CREDENTIAL_MISSING' : 'SOURCE_UNAVAILABLE',
  }, { status: 503, headers })
}

export async function GET(req: NextRequest) {
  const user = getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  if (!canView(user)) return NextResponse.json({ error: 'Access denied' }, { status: 403, headers })
  try {
    const result = await loadMorningAllocation()
    return NextResponse.json({ ...result, canEdit: canEdit(user) }, { headers })
  } catch (error) { return failure(error) }
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  if (!canEdit(user)) return NextResponse.json({ error: 'Lead assignment permission required' }, { status: 403, headers })
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403, headers })
  let input: AllocationAction
  try { input = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers }) }
  if (!input || !['START', 'OWNER_CHANGE', 'AVAILABILITY', 'CONFIRM'].includes(input.action) ||
    [input.key, input.previousOwner, input.newOwner, input.reason].some((item) => item && (typeof item !== 'string' || item.length > 300)) ||
    (input.action === 'AVAILABILITY' && !['available', 'unavailable'].includes(input.availability || ''))) {
    return NextResponse.json({ error: 'Invalid allocation action' }, { status: 400, headers })
  }
  const actor = String(user.email || user.user_name || user.username || user.id || '').trim()
  if (!actor) return NextResponse.json({ error: 'Signed-in user has no auditable identity' }, { status: 403, headers })
  try {
    const result = await saveMorningAllocationAction(actor, input)
    return NextResponse.json(result, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/Source row transferred, but the master log/.test(message)) return NextResponse.json({ error: message, code: 'TRANSFER_LOG_INCOMPLETE' }, { status: 502, headers })
    if (/changed since refresh|Choose an available|Enter a reason|Person is not in Config|Resolve unassigned|Start the morning check|already started|Source unavailable|multiple sheets|view-only|Remarks cell|partly updated/.test(message)) return NextResponse.json({ error: message }, { status: 409, headers })
    return failure(error)
  }
}
