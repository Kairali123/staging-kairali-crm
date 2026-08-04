import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createSessionCookieValue } from '@/lib/session'
import { AUTH_SCRIPT_URL } from '@/lib/role-permissions'

// Same GAS endpoint hooks/use-auth.tsx used to call directly from the browser.
// Moved server-side so credentials never sit in a client-visible URL, and so this
// route is the one place that verifies identity before minting a session cookie.
// One budget for the whole upstream exchange. The signal stays armed through
// response.json(), so a stalled body is cut off just like stalled headers —
// without it a half-open GAS response would pin the request until the platform
// killed it.
const UPSTREAM_TIMEOUT_MS = 20_000

// A login reply carries the session cookie and the user record: never cacheable,
// never shared. Applied to every response this route can return.
const NO_STORE = 'private, no-store'

// Fixed user-facing strings. Nothing from the upstream payload, the request, or
// an exception is ever folded into a reply.
// MSG_MISSING_FIELDS answers every malformed request — absent, empty, wrongly
// typed, or unparseable — so a client learns that its credentials payload was
// unusable without learning which part of it we rejected.
const MSG_MISSING_FIELDS = 'Missing email, password, or company'
const MSG_INVALID_CREDENTIALS = 'Invalid credentials or inactive account'
const MSG_TIMEOUT = 'Login service timed out'
const MSG_FAILED = 'Login failed'

function jsonNoStore(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': NO_STORE } })
}

// A JSON value that can carry named fields: excludes null (typeof 'object') and
// arrays, both of which would otherwise index without error and read undefined.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Credentials go upstream verbatim, so the only accepted form is a string that
// already has content. No trimming or coercion: a value that reaches the Apps
// Script must be exactly what the client sent.
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID()
  const startedAt = Date.now()
  const elapsed = () => Date.now() - startedAt

  console.info(`[login:${requestId}] request started`)

  let payload: unknown

  try {
    payload = await req.json()
  } catch {
    // A body we cannot parse is a malformed client request, not a server fault.
    // The log line is fixed: neither the body nor the parse error is recorded.
    console.error(`[login:${requestId}] request body could not be parsed (${elapsed()}ms)`)
    return jsonNoStore({ success: false, message: MSG_MISSING_FIELDS }, 400)
  }

  // A primitive, array, or null body has no credentials to read, and every
  // field lookup on it would silently yield undefined.
  if (!isRecord(payload)) {
    return jsonNoStore({ success: false, message: MSG_MISSING_FIELDS }, 400)
  }

  const { email, password, company } = payload

  // Typed before the URL is built. Previously any truthy value was accepted and
  // String()-coerced, so a number or object became a credential like "[object
  // Object]" in the upstream query.
  if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(company)) {
    return jsonNoStore({ success: false, message: MSG_MISSING_FIELDS }, 400)
  }

  const sharedSecret = process.env.GAS_SHARED_SECRET?.trim()
  if (!sharedSecret) {
    console.error(`[login:${requestId}] GAS_SHARED_SECRET is not configured (${elapsed()}ms)`)
    return jsonNoStore({ success: false, message: MSG_FAILED }, 503)
  }

  const controller = new AbortController()
  // Distinguishes our own deadline from an unrelated abort or transport error:
  // reading err.name is unreliable once undici wraps the body-stream failure.
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, UPSTREAM_TIMEOUT_MS)

  let data: unknown
  try {
    const upstreamStartedAt = Date.now()
    const gasResponse = await fetch(AUTH_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email,
        password,
        company,
        sharedSecret,
      }),
      signal: controller.signal,
      cache: 'no-store',
    })
    console.info(`[login:${requestId}] upstream responded status=${gasResponse.status} in ${Date.now() - upstreamStartedAt}ms`)

    if (!gasResponse.ok) {
      // GAS answers failures with an HTML error page that can name the script,
      // the deployment, and the executing account. Status and body stay here.
      console.error(`[login:${requestId}] upstream returned a non-success status (${elapsed()}ms)`)
      return jsonNoStore({ success: false, message: MSG_FAILED }, 502)
    }

    // Still inside the timeout window, so a body that never finishes trips it.
    // Non-JSON (an interstitial or error page) throws and is handled below.
    data = await gasResponse.json()
    console.info(`[login:${requestId}] upstream JSON parsed (${elapsed()}ms)`)
  } catch {
    if (timedOut) {
      console.error(`[login:${requestId}] upstream request timed out after ${elapsed()}ms`)
      return jsonNoStore({ success: false, message: MSG_TIMEOUT }, 504)
    }
    // Transport failure or malformed upstream payload. The exception object is
    // deliberately not logged: transport errors can still contain sensitive
    // request metadata.
    console.error(`[login:${requestId}] upstream request failed (${elapsed()}ms)`)
    return jsonNoStore({ success: false, message: MSG_FAILED }, 502)
  } finally {
    clearTimeout(timer)
  }

  // Well-formed JSON that isn't a result object is an upstream fault, not a
  // rejected login — reporting it as 401 would blame the user for an outage.
  if (!isRecord(data)) {
    console.error(`[login:${requestId}] upstream returned an unexpected payload (${elapsed()}ms)`)
    return jsonNoStore({ success: false, message: MSG_FAILED }, 502)
  }

  // Only a literal false is a rejection. Fixed message: upstream diagnostics
  // ("no such sheet row", account state) are not for the login form.
  // use-auth.tsx matches this exact string to show "You have entered wrong Id /
  // Password".
  if (data.success === false) {
    console.info(`[login:${requestId}] upstream rejected credentials (${elapsed()}ms)`)
    return jsonNoStore({ success: false, message: MSG_INVALID_CREDENTIALS }, 401)
  }

  const user = data.user

  // The gate on the session cookie. Both halves are exact: a truthy-but-not-true
  // success (the string "false", 1) or a user that is a string, array, or null
  // is a payload this route does not understand, and an unrecognised payload
  // must never be read as a granted login. Anything short of the full contract
  // is reported as the upstream fault it is, under the same fixed log category.
  if (data.success !== true || !isRecord(user)) {
    console.error(`[login:${requestId}] upstream returned an unexpected payload (${elapsed()}ms)`)
    return jsonNoStore({ success: false, message: MSG_FAILED }, 502)
  }

  // GAS login already returns the authenticated user's final permissions. Keep
  // login to one upstream call and sign exactly the user the login action
  // returned. A malformed permission value grants nothing instead of breaking
  // client permission checks.
  const finalUser = {
    ...user,
    permissions: Array.isArray(user.permissions) && user.permissions.every(p => typeof p === 'string')
      ? user.permissions
      : [],
  }

  let sessionCookie: string
  try {
    // Throws when NEXTAUTH_SECRET is unset — a deployment fault, not upstream.
    sessionCookie = createSessionCookieValue(finalUser)
  } catch {
    console.error(`[login:${requestId}] session cookie could not be signed (${elapsed()}ms)`)
    return jsonNoStore({ success: false, message: MSG_FAILED }, 500)
  }

  // The same object that was signed. The reply and the cookie cannot disagree,
  // so /api/auth/me on the next reload returns the set the UI received here.
  const response = jsonNoStore({ success: true, user: finalUser }, 200)

  response.cookies.set('kairali_user', sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  console.info(`[login:${requestId}] login succeeded (${elapsed()}ms)`)

  return response
}

// // import { NextRequest, NextResponse } from 'next/server'
// // import { createSessionCookieValue } from '@/lib/session'
// // import {
// //   AUTH_SCRIPT_URL,
// //   fetchRolePermissions,
// //   permissionsForEmail,
// // } from '@/lib/role-permissions'

// // // Same GAS endpoint hooks/use-auth.tsx used to call directly from the browser.
// // // Moved server-side so credentials never sit in a client-visible URL, and so this
// // // route is the one place that verifies identity before minting a session cookie.
// // // One budget for the whole upstream exchange. The signal stays armed through
// // // response.json(), so a stalled body is cut off just like stalled headers —
// // // without it a half-open GAS response would pin the request until the platform
// // // killed it.
// // const UPSTREAM_TIMEOUT_MS = 15_000

// // // A login reply carries the session cookie and the user record: never cacheable,
// // // never shared. Applied to every response this route can return.
// // const NO_STORE = 'private, no-store'

// // // Fixed user-facing strings. Nothing from the upstream payload, the request, or
// // // an exception is ever folded into a reply.
// // // MSG_MISSING_FIELDS answers every malformed request — absent, empty, wrongly
// // // typed, or unparseable — so a client learns that its credentials payload was
// // // unusable without learning which part of it we rejected.
// // const MSG_MISSING_FIELDS = 'Missing email, password, or company'
// // const MSG_INVALID_CREDENTIALS = 'Invalid credentials or inactive account'
// // const MSG_TIMEOUT = 'Login service timed out'
// // const MSG_FAILED = 'Login failed'

// // function jsonNoStore(body: Record<string, unknown>, status: number) {
// //   return NextResponse.json(body, { status, headers: { 'Cache-Control': NO_STORE } })
// // }

// // // A JSON value that can carry named fields: excludes null (typeof 'object') and
// // // arrays, both of which would otherwise index without error and read undefined.
// // function isRecord(value: unknown): value is Record<string, unknown> {
// //   return typeof value === 'object' && value !== null && !Array.isArray(value)
// // }

// // // Credentials go upstream verbatim, so the only accepted form is a string that
// // // already has content. No trimming or coercion: a value that reaches the Apps
// // // Script must be exactly what the client sent.
// // function isNonEmptyString(value: unknown): value is string {
// //   return typeof value === 'string' && value.length > 0
// // }

// // export async function POST(req: NextRequest) {
// //   let payload: unknown

// //   try {
// //     payload = await req.json()
// //   } catch {
// //     // A body we cannot parse is a malformed client request, not a server fault.
// //     // The log line is fixed: neither the body nor the parse error is recorded.
// //     console.error('[login] request body could not be parsed')
// //     return jsonNoStore({ success: false, message: MSG_MISSING_FIELDS }, 400)
// //   }

// //   // A primitive, array, or null body has no credentials to read, and every
// //   // field lookup on it would silently yield undefined.
// //   if (!isRecord(payload)) {
// //     return jsonNoStore({ success: false, message: MSG_MISSING_FIELDS }, 400)
// //   }

// //   const { email, password, company } = payload

// //   // Typed before the URL is built. Previously any truthy value was accepted and
// //   // String()-coerced, so a number or object became a credential like "[object
// //   // Object]" in the upstream query.
// //   if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(company)) {
// //     return jsonNoStore({ success: false, message: MSG_MISSING_FIELDS }, 400)
// //   }

// //   const sharedSecret = process.env.GAS_SHARED_SECRET?.trim()
// //   if (!sharedSecret) {
// //     console.error('[login] GAS_SHARED_SECRET is not configured')
// //     return jsonNoStore({ success: false, message: MSG_FAILED }, 503)
// //   }

// //   const controller = new AbortController()
// //   // Distinguishes our own deadline from an unrelated abort or transport error:
// //   // reading err.name is unreliable once undici wraps the body-stream failure.
// //   let timedOut = false
// //   const timer = setTimeout(() => {
// //     timedOut = true
// //     controller.abort()
// //   }, UPSTREAM_TIMEOUT_MS)

// //   let data: unknown
// //   try {
// //     const gasResponse = await fetch(AUTH_SCRIPT_URL, {
// //       method: 'POST',
// //       headers: { 'Content-Type': 'application/json' },
// //       body: JSON.stringify({
// //         action: 'login',
// //         email,
// //         password,
// //         company,
// //         sharedSecret,
// //       }),
// //       signal: controller.signal,
// //       cache: 'no-store',
// //     })

// //     if (!gasResponse.ok) {
// //       // GAS answers failures with an HTML error page that can name the script,
// //       // the deployment, and the executing account. Status and body stay here.
// //       console.error('[login] upstream returned a non-success status')
// //       return jsonNoStore({ success: false, message: MSG_FAILED }, 502)
// //     }

// //     // Still inside the timeout window, so a body that never finishes trips it.
// //     // Non-JSON (an interstitial or error page) throws and is handled below.
// //     data = await gasResponse.json()
// //   } catch {
// //     if (timedOut) {
// //       console.error('[login] upstream request timed out')
// //       return jsonNoStore({ success: false, message: MSG_TIMEOUT }, 504)
// //     }
// //     // Transport failure or malformed upstream payload. The exception object is
// //     // deliberately not logged: transport errors can still contain sensitive
// //     // request metadata.
// //     console.error('[login] upstream request failed')
// //     return jsonNoStore({ success: false, message: MSG_FAILED }, 502)
// //   } finally {
// //     clearTimeout(timer)
// //   }

// //   // Well-formed JSON that isn't a result object is an upstream fault, not a
// //   // rejected login — reporting it as 401 would blame the user for an outage.
// //   if (!isRecord(data)) {
// //     console.error('[login] upstream returned an unexpected payload')
// //     return jsonNoStore({ success: false, message: MSG_FAILED }, 502)
// //   }

// //   // Only a literal false is a rejection. Fixed message: upstream diagnostics
// //   // ("no such sheet row", account state) are not for the login form.
// //   // use-auth.tsx matches this exact string to show "You have entered wrong Id /
// //   // Password".
// //   if (data.success === false) {
// //     return jsonNoStore({ success: false, message: MSG_INVALID_CREDENTIALS }, 401)
// //   }

// //   const user = data.user

// //   // The gate on the session cookie. Both halves are exact: a truthy-but-not-true
// //   // success (the string "false", 1) or a user that is a string, array, or null
// //   // is a payload this route does not understand, and an unrecognised payload
// //   // must never be read as a granted login. Anything short of the full contract
// //   // is reported as the upstream fault it is, under the same fixed log category.
// //   if (data.success !== true || !isRecord(user)) {
// //     console.error('[login] upstream returned an unexpected payload')
// //     return jsonNoStore({ success: false, message: MSG_FAILED }, 502)
// //   }

// //   // Resolve the role-permissions sheet before signing, so the cookie carries
// //   // the same permission set the UI is about to show. Until now the browser
// //   // overwrote `user.permissions` from that sheet after login while the cookie
// //   // kept the upstream payload's array, so a reload — which rebuilds the user
// //   // from the cookie via /api/auth/me — could show a different set than the
// //   // login that preceded it (docs/PHASE_8_RBAC_AUTHORIZATION_MATRIX.md M1/M2,
// //   // rollout step 5). The lookup mirrors the client's exactly: the upstream
// //   // record's own `email`, matched as a literal key, unnormalized.
// //   //
// //   // Strictly best-effort. This runs only after the credentials are already
// //   // accepted, so an unavailable sheet, an unparseable table, or a missing row
// //   // must not turn a valid login into a failure — every one of those paths keeps
// //   // the upstream `user` verbatim, which is exactly what this route signed
// //   // before. The cost is a second upstream call on the success path, with its
// //   // own 15-second budget on top of the login call's.
// //   let finalUser = user
// //   const table = await fetchRolePermissions()

// //   if (!table.ok) {
// //     // `reason` is one of five fixed literals from lib/role-permissions.ts; no
// //     // upstream body, URL, or exception text reaches the log.
// //     console.warn(`[login] role-permissions table unavailable (${table.reason}); keeping upstream permissions`)
// //   } else {
// //     const email = user.email
// //     const sheetPermissions = isNonEmptyString(email)
// //       ? permissionsForEmail(table.rolePermissions, email)
// //       : null

// //     if (sheetPermissions) {
// //       finalUser = { ...user, permissions: sheetPermissions }
// //     } else {
// //       // No row for this account, or a row that is not an array of permission
// //       // strings. Same outcome as an unavailable table: the upstream array
// //       // stands. The account is not named in the log.
// //       console.warn('[login] role-permissions table has no usable entry for this account; keeping upstream permissions')
// //     }
// //   }

// //   let sessionCookie: string
// //   try {
// //     // Throws when NEXTAUTH_SECRET is unset — a deployment fault, not upstream.
// //     sessionCookie = createSessionCookieValue(finalUser)
// //   } catch {
// //     console.error('[login] session cookie could not be signed')
// //     return jsonNoStore({ success: false, message: MSG_FAILED }, 500)
// //   }

// //   // The same object that was signed. The reply and the cookie cannot disagree,
// //   // so /api/auth/me on the next reload returns the set the UI received here.
// //   const response = jsonNoStore({ success: true, user: finalUser }, 200)

// //   response.cookies.set('kairali_user', sessionCookie, {
// //     httpOnly: true,
// //     secure: process.env.NODE_ENV === 'production',
// //     sameSite: 'lax',
// //     path: '/',
// //     maxAge: 60 * 60 * 24 * 7, // 7 days
// //   })

// //   return response
// // }

// import { NextRequest, NextResponse } from 'next/server'
// import { createSessionCookieValue } from '@/lib/session'
// import { AUTH_SCRIPT_URL } from '@/lib/role-permissions'

// // Same GAS endpoint hooks/use-auth.tsx used to call directly from the browser.
// // Moved server-side so credentials never sit in a client-visible URL, and so this
// // route is the one place that verifies identity before minting a session cookie.
// // One budget for the whole upstream exchange. The signal stays armed through
// // response.json(), so a stalled body is cut off just like stalled headers —
// // without it a half-open GAS response would pin the request until the platform
// // killed it.
// const UPSTREAM_TIMEOUT_MS = 15_000

// // A login reply carries the session cookie and the user record: never cacheable,
// // never shared. Applied to every response this route can return.
// const NO_STORE = 'private, no-store'

// // Fixed user-facing strings. Nothing from the upstream payload, the request, or
// // an exception is ever folded into a reply.
// // MSG_MISSING_FIELDS answers every malformed request — absent, empty, wrongly
// // typed, or unparseable — so a client learns that its credentials payload was
// // unusable without learning which part of it we rejected.
// const MSG_MISSING_FIELDS = 'Missing email, password, or company'
// const MSG_INVALID_CREDENTIALS = 'Invalid credentials or inactive account'
// const MSG_TIMEOUT = 'Login service timed out'
// const MSG_FAILED = 'Login failed'

// function jsonNoStore(body: Record<string, unknown>, status: number) {
//   return NextResponse.json(body, { status, headers: { 'Cache-Control': NO_STORE } })
// }

// // A JSON value that can carry named fields: excludes null (typeof 'object') and
// // arrays, both of which would otherwise index without error and read undefined.
// function isRecord(value: unknown): value is Record<string, unknown> {
//   return typeof value === 'object' && value !== null && !Array.isArray(value)
// }

// // Credentials go upstream verbatim, so the only accepted form is a string that
// // already has content. No trimming or coercion: a value that reaches the Apps
// // Script must be exactly what the client sent.
// function isNonEmptyString(value: unknown): value is string {
//   return typeof value === 'string' && value.length > 0
// }

// export async function POST(req: NextRequest) {
//   let payload: unknown

//   try {
//     payload = await req.json()
//   } catch {
//     // A body we cannot parse is a malformed client request, not a server fault.
//     // The log line is fixed: neither the body nor the parse error is recorded.
//     console.error('[login] request body could not be parsed')
//     return jsonNoStore({ success: false, message: MSG_MISSING_FIELDS }, 400)
//   }

//   // A primitive, array, or null body has no credentials to read, and every
//   // field lookup on it would silently yield undefined.
//   if (!isRecord(payload)) {
//     return jsonNoStore({ success: false, message: MSG_MISSING_FIELDS }, 400)
//   }

//   const { email, password, company } = payload

//   // Typed before the URL is built. Previously any truthy value was accepted and
//   // String()-coerced, so a number or object became a credential like "[object
//   // Object]" in the upstream query.
//   if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(company)) {
//     return jsonNoStore({ success: false, message: MSG_MISSING_FIELDS }, 400)
//   }

//   const sharedSecret = process.env.GAS_SHARED_SECRET?.trim()
//   if (!sharedSecret) {
//     console.error('[login] GAS_SHARED_SECRET is not configured')
//     return jsonNoStore({ success: false, message: MSG_FAILED }, 503)
//   }

//   const controller = new AbortController()
//   // Distinguishes our own deadline from an unrelated abort or transport error:
//   // reading err.name is unreliable once undici wraps the body-stream failure.
//   let timedOut = false
//   const timer = setTimeout(() => {
//     timedOut = true
//     controller.abort()
//   }, UPSTREAM_TIMEOUT_MS)

//   let data: unknown
//   try {
//     const gasResponse = await fetch(AUTH_SCRIPT_URL, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         action: 'login',
//         email,
//         password,
//         company,
//         sharedSecret,
//       }),
//       signal: controller.signal,
//       cache: 'no-store',
//     })

//     if (!gasResponse.ok) {
//       // GAS answers failures with an HTML error page that can name the script,
//       // the deployment, and the executing account. Status and body stay here.
//       console.error('[login] upstream returned a non-success status')
//       return jsonNoStore({ success: false, message: MSG_FAILED }, 502)
//     }

//     // Still inside the timeout window, so a body that never finishes trips it.
//     // Non-JSON (an interstitial or error page) throws and is handled below.
//     data = await gasResponse.json()
//   } catch {
//     if (timedOut) {
//       console.error('[login] upstream request timed out')
//       return jsonNoStore({ success: false, message: MSG_TIMEOUT }, 504)
//     }
//     // Transport failure or malformed upstream payload. The exception object is
//     // deliberately not logged: transport errors can still contain sensitive
//     // request metadata.
//     console.error('[login] upstream request failed')
//     return jsonNoStore({ success: false, message: MSG_FAILED }, 502)
//   } finally {
//     clearTimeout(timer)
//   }

//   // Well-formed JSON that isn't a result object is an upstream fault, not a
//   // rejected login — reporting it as 401 would blame the user for an outage.
//   if (!isRecord(data)) {
//     console.error('[login] upstream returned an unexpected payload')
//     return jsonNoStore({ success: false, message: MSG_FAILED }, 502)
//   }

//   // Only a literal false is a rejection. Fixed message: upstream diagnostics
//   // ("no such sheet row", account state) are not for the login form.
//   // use-auth.tsx matches this exact string to show "You have entered wrong Id /
//   // Password".
//   if (data.success === false) {
//     return jsonNoStore({ success: false, message: MSG_INVALID_CREDENTIALS }, 401)
//   }

//   const user = data.user

//   // The gate on the session cookie. Both halves are exact: a truthy-but-not-true
//   // success (the string "false", 1) or a user that is a string, array, or null
//   // is a payload this route does not understand, and an unrecognised payload
//   // must never be read as a granted login. Anything short of the full contract
//   // is reported as the upstream fault it is, under the same fixed log category.
//   if (data.success !== true || !isRecord(user)) {
//     console.error('[login] upstream returned an unexpected payload')
//     return jsonNoStore({ success: false, message: MSG_FAILED }, 502)
//   }

//   // GAS login already returns the authenticated user's final permissions. Keep
//   // login to one upstream call and sign exactly the user the login action
//   // returned. A malformed permission value grants nothing instead of breaking
//   // client permission checks.
//   const finalUser = {
//     ...user,
//     permissions: Array.isArray(user.permissions) && user.permissions.every(p => typeof p === 'string')
//       ? user.permissions
//       : [],
//   }

//   let sessionCookie: string
//   try {
//     // Throws when NEXTAUTH_SECRET is unset — a deployment fault, not upstream.
//     sessionCookie = createSessionCookieValue(finalUser)
//   } catch {
//     console.error('[login] session cookie could not be signed')
//     return jsonNoStore({ success: false, message: MSG_FAILED }, 500)
//   }

//   // The same object that was signed. The reply and the cookie cannot disagree,
//   // so /api/auth/me on the next reload returns the set the UI received here.
//   const response = jsonNoStore({ success: true, user: finalUser }, 200)

//   response.cookies.set('kairali_user', sessionCookie, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: 'lax',
//     path: '/',
//     maxAge: 60 * 60 * 24 * 7, // 7 days
//   })

//   return response
// }