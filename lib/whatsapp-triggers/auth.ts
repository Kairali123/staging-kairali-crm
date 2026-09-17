import type {NextRequest} from 'next/server'
import {getSessionUser} from '@/lib/authz'
export const responseHeaders={'Cache-Control':'private, no-store'}
export function authorized(req:NextRequest){const user=getSessionUser(req);return ['super_admin','super admin'].includes(String(user?.role||'').trim().toLowerCase())?user:null}
