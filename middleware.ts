// import { NextRequest, NextResponse } from 'next/server'
// import { verifySessionCookieValue } from '@/lib/session'

// // Routes that don't need authentication
// const publicRoutes = ['/', '/access-denied']

// // Routes that require authentication
// const protectedRoutes = [
//   '/dashboard',
//   '/leads',
//   '/calls',
//   '/reports',
//   '/performance',
//   '/users',
//   '/helpdesk',
//   '/fms',
//   '/doctor-consultation',
//   '/marketing-dashboard',
//   '/marketing-funnel',
//   '/marketing',
//   '/google-adword-reports',
//   '/sales',
//   '/voicecall',
//   '/meetings',
//   '/partners',
//   '/accounts-tracker',
//   '/sales-calling',
//   '/new-order-fms',
//   // Six page prefixes the list had never caught up with, so these pages ran with
//   // no server-side identity check at all (matrix M10, rollout step 7). Identity
//   // only — this file still reads no role and no permission, and `/MR-FMS` and
//   // `/crr-fms` keep the client-side permission gate they already had in
//   // `components/route-guard.tsx`.
//   '/MR-FMS',
//   '/crr-fms',
//   '/deal-assistant',
//   '/ksereve-billing-auditer',
//   // Prefix-matches `/meetings` too, which is already protected here and equally
//   // identity-only, so the overlap changes nothing. The owner-deferred exemption
//   // is the `/api/meetings/*` API subtree below, not this page prefix.
//   '/meet',
//   '/riya-sharma',
// ]

// // ── API session boundary ─────────────────────────────────────────────────────
// // Every /api/* path requires a valid signed `kairali_user` cookie unless it is
// // listed below. Exemptions are exact paths (not prefixes) so near-matches such
// // as /api/leads-search, /api/conversion-extra or /api/leads/search stay behind
// // the session boundary.
// const exemptApiPaths = new Set([
//   // Sign-in / sign-out must be reachable without an existing session.
//   '/api/auth/login',
//   '/api/auth/logout',
//   // Same-origin replacement for the unauthenticated getRolePermissions fetch the
//   // browser used to make directly. The auth bootstrap runs it on the login screen
//   // before a session exists, so requiring one here would change which permission
//   // set a fresh login applies — a separate, owner-gated step (D2 / rollout step 5
//   // in docs/PHASE_8_RBAC_AUTHORIZATION_MATRIX.md), not this transport move.
//   '/api/auth/permissions',
//   // Zoom OAuth handshake — the provider redirects here without CRM cookies.
//   '/api/zoom/connect',
//   '/api/zoom/callback',
//   // Handlers already enforce bearer-or-session themselves (lib/api-auth.ts);
//   // the middleware must not turn that bearer into a key to the whole API.
//   '/api/leads',
//   '/api/conversion',
//   // OWNER-DEFERRED: anonymous mobile access, preserved as-is for now.
//   '/api/calendar/mobile',
//   '/api/meetings',
// ])

// // OWNER-DEFERRED: the mobile app calls these anonymously, so the whole
// // /api/meetings subtree stays exempt (its wildcard CORS policy is unchanged).
// const exemptApiPrefixes = ['/api/meetings/']

// // Runtime endpoints served by app/api/auth/[...nextauth]/route.ts (NextAuth v4).
// // Enumerated by action instead of exempting all of /api/auth/* so that a future
// // route group added under /api/auth is not silently exempt as well.
// const nextAuthActions = new Set([
//   'providers',
//   'session',
//   'csrf',
//   'signin',
//   'signout',
//   'callback',
//   'verify-request',
//   'error',
//   '_log',
// ])

// function isNextAuthRuntimePath(pathname: string): boolean {
//   if (!pathname.startsWith('/api/auth/')) return false
//   const segments = pathname.slice('/api/auth/'.length).split('/')
//   // NextAuth paths are "<action>" or "<action>/<provider>" — never deeper.
//   if (segments.length > 2) return false
//   return nextAuthActions.has(segments[0])
// }

// function isExemptApiPath(pathname: string): boolean {
//   if (exemptApiPaths.has(pathname)) return true
//   if (exemptApiPrefixes.some(prefix => pathname.startsWith(prefix))) return true
//   return isNextAuthRuntimePath(pathname)
// }

// function apiUnauthorized() {
//   return NextResponse.json(
//     { success: false, error: 'Unauthorized' },
//     { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
//   )
// }

// export function middleware(request: NextRequest) {
//   const pathname = request.nextUrl.pathname

//   if (pathname === '/api' || pathname.startsWith('/api/')) {
//     // "/api/x" and "/api/x/" reach the same handler, so match on one form only.
//     const apiPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

//     if (isExemptApiPath(apiPath)) {
//       return NextResponse.next()
//     }

//     // API callers get a JSON 401, never a redirect to the login page.
//     const apiUser = request.cookies.get('kairali_user')?.value
//     if (!apiUser || !verifySessionCookieValue(apiUser)) {
//       return apiUnauthorized()
//     }

//     return NextResponse.next()
//   }

//   // Skip middleware for public routes
//   if (publicRoutes.includes(pathname)) {
//     return NextResponse.next()
//   }

//   // Check if route is protected
//   const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

//   if (isProtectedRoute) {
//     // Check if user is authenticated (stored in a cookie or header)
//     const user = request.cookies.get('kairali_user')?.value

//     // If no user, redirect to login
//     if (!user) {
//       return NextResponse.redirect(new URL('/', request.url))
//     }

//     // Verify the signed session — rejects missing, tampered, forged, or expired cookies
//     const userData = verifySessionCookieValue(user)
//     if (!userData) {
//       return NextResponse.redirect(new URL('/', request.url))
//     }
//   }

//   return NextResponse.next()
// }

// // Configure which routes to run middleware on
// export const config = {
//   // Node.js runtime, not Edge — verifySessionCookieValue uses Node's `crypto`
//   // module (createHmac/timingSafeEqual), which the Edge runtime doesn't support.
//   runtime: 'nodejs',
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      */
//     '/((?!api|_next/static|_next/image|favicon.ico).*)',
//     // API surface — guarded by the session boundary above.
//     '/api/:path*',
//   ],
// }


import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'

// Routes that don't need authentication
const publicRoutes = ['/', '/access-denied']

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/leads',
  '/calls',
  '/reports',
  '/performance',
  '/users',
  '/helpdesk',
  '/fms',
  '/doctor-consultation',
  '/marketing-dashboard',
  '/marketing-funnel',
  '/marketing',
  '/google-adword-reports',
  '/sales',
  '/voicecall',
  '/meetings',
  '/partners',
  '/accounts-tracker',
  '/sales-calling',
  '/new-order-fms',
  // Six page prefixes the list had never caught up with, so these pages ran with
  // no server-side identity check at all (matrix M10, rollout step 7). Identity
  // only — this file still reads no role and no permission, and `/MR-FMS` and
  // `/crr-fms` keep the client-side permission gate they already had in
  // `components/route-guard.tsx`.
  '/MR-FMS',
  '/crr-fms',
  '/deal-assistant',
  '/ksereve-billing-auditer',
  // Prefix-matches `/meetings` too, which is already protected here and equally
  // identity-only, so the overlap changes nothing. The owner-deferred exemption
  // is the `/api/meetings/*` API subtree below, not this page prefix.
  '/meet',
  '/riya-sharma',
]

// ── API session boundary ─────────────────────────────────────────────────────
// Every /api/* path requires a valid signed `kairali_user` cookie unless it is
// listed below. Exemptions are exact paths (not prefixes) so near-matches such
// as /api/leads-search, /api/conversion-extra or /api/leads/search stay behind
// the session boundary.
const exemptApiPaths = new Set([
  // Sign-in / sign-out must be reachable without an existing session.
  '/api/auth/login',
  '/api/auth/logout',
  // Zoom OAuth handshake — the provider redirects here without CRM cookies.
  '/api/zoom/connect',
  '/api/zoom/callback',
  // Handlers already enforce bearer-or-session themselves (lib/api-auth.ts);
  // the middleware must not turn that bearer into a key to the whole API.
  '/api/leads',
  '/api/conversion',
  // OWNER-DEFERRED: anonymous mobile access, preserved as-is for now.
  '/api/calendar/mobile',
  '/api/meetings',
])

// OWNER-DEFERRED: the mobile app calls these anonymously, so the whole
// /api/meetings subtree stays exempt (its wildcard CORS policy is unchanged).
const exemptApiPrefixes = ['/api/meetings/']

// Runtime endpoints served by app/api/auth/[...nextauth]/route.ts (NextAuth v4).
// Enumerated by action instead of exempting all of /api/auth/* so that a future
// route group added under /api/auth is not silently exempt as well.
const nextAuthActions = new Set([
  'providers',
  'session',
  'csrf',
  'signin',
  'signout',
  'callback',
  'verify-request',
  'error',
  '_log',
])

function isNextAuthRuntimePath(pathname: string): boolean {
  if (!pathname.startsWith('/api/auth/')) return false
  const segments = pathname.slice('/api/auth/'.length).split('/')
  // NextAuth paths are "<action>" or "<action>/<provider>" — never deeper.
  if (segments.length > 2) return false
  return nextAuthActions.has(segments[0])
}

function isExemptApiPath(pathname: string): boolean {
  if (exemptApiPaths.has(pathname)) return true
  if (exemptApiPrefixes.some(prefix => pathname.startsWith(prefix))) return true
  return isNextAuthRuntimePath(pathname)
}

function apiUnauthorized() {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
  )
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    // "/api/x" and "/api/x/" reach the same handler, so match on one form only.
    const apiPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

    if (isExemptApiPath(apiPath)) {
      return NextResponse.next()
    }

    // API callers get a JSON 401, never a redirect to the login page.
    const apiUser = request.cookies.get('kairali_user')?.value
    if (!apiUser || !verifySessionCookieValue(apiUser)) {
      return apiUnauthorized()
    }

    return NextResponse.next()
  }

  // Skip middleware for public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Check if user is authenticated (stored in a cookie or header)
    const user = request.cookies.get('kairali_user')?.value

    // If no user, redirect to login
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Verify the signed session — rejects missing, tampered, forged, or expired cookies
    const userData = verifySessionCookieValue(user)
    if (!userData) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  // Node.js runtime, not Edge — verifySessionCookieValue uses Node's `crypto`
  // module (createHmac/timingSafeEqual), which the Edge runtime doesn't support.
  runtime: 'nodejs',
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    // API surface — guarded by the session boundary above.
    '/api/:path*',
  ],
}