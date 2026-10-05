import { createHash, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { getSessionUser } from '../authz'
export const privateHeaders = { 'Cache-Control': 'private, no-store' }
export function administrator(req: NextRequest) {
  const user = getSessionUser(req)
  return user && ['super_admin','super admin'].includes(String(user.role).trim().toLowerCase()) ? user : null
}
export function sameOrigin(req: NextRequest) { return req.headers.get('origin') === req.nextUrl.origin }
export const hash = (s: string) => createHash('sha256').update(s).digest('hex')
export function secureEqual(a: string, b: string) { const x=Buffer.from(a), y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y) }
function key() { const s=process.env.TRIGGER_MONITOR_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET; if (!s || s.length<32) throw Error('Token encryption key is not configured'); return createHash('sha256').update('trigger-monitor-v1:'+s).digest() }
export function encrypt(value: string) { const iv=randomBytes(12), c=createCipheriv('aes-256-gcm',key(),iv); return Buffer.concat([iv,c.update(value,'utf8'),c.final(),c.getAuthTag()]).toString('base64url') }
export function decrypt(value: string) { const b=Buffer.from(value,'base64url'),d=createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));d.setAuthTag(b.subarray(-16));return Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString('utf8') }
export function appOrigin() { const value=process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL : undefined); if(!value) throw Error('NEXT_PUBLIC_APP_URL is required'); const u=new URL(value); if(u.protocol!=='https:' && !['localhost','127.0.0.1'].includes(u.hostname)) throw Error('HTTPS application URL required'); return u.origin }
