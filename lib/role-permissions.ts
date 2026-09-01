// // // Server-side access to the role-permissions sheet.
// // //
// // // This module is the single copy of the upstream exchange that
// // // `app/api/auth/permissions/route.ts` used to own outright: the Apps Script
// // // deployment URL, the `action=getRolePermissions` request, the 15-second
// // // budget, the `cache: 'no-store'` fetch, and the record-shaped payload
// // // validation. It exists so `app/api/auth/login/route.ts` can resolve the same
// // // table before signing the session cookie and get byte-for-byte the same
// // // answer the client's `/api/auth/permissions` call would have produced —
// // // closing the gap where a fresh login showed the sheet's permissions while a
// // // reload showed the cookie's (docs/PHASE_8_RBAC_AUTHORIZATION_MATRIX.md M1/M2,
// // // rollout step 5).
// // //
// // // It answers "what does the permissions sheet say", not "what may the caller
// // // do". It reads no session and applies no authorization; both callers decide
// // // that for themselves.

// // // One server-only deployment URL for both login and permissions. Keeping it in
// // // this module prevents those two authentication calls from drifting onto
// // // different Apps Script deployments.
// // export const AUTH_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby0ADVGM4fa1d-qouIzCL7UyV8AXJYNSOQ8ZxsfKpdrld8O1Rc2dRqkjHLDiCL3yBcx/exec'

// // // One budget for the whole upstream exchange, matching the login route's, since
// // // it is the same deployment. The signal stays armed through response.json(), so
// // // a stalled body is cut off just like stalled headers.
// // const UPSTREAM_TIMEOUT_MS = 15_000

// // // A JSON value that can carry named fields: excludes null (typeof 'object') and
// // // arrays, both of which would otherwise index without error and read undefined.
// // function isRecord(value: unknown): value is Record<string, unknown> {
// //   return typeof value === 'object' && value !== null && !Array.isArray(value)
// // }

// // // Closed set of failure kinds. Each caller maps these to its own fixed status,
// // // message, and log category — nothing from the upstream body, URL, or exception
// // // travels in this value, so interpolating it into a log line stays sanitized.
// // export type RolePermissionsFailure =
// //   | 'configuration'
// //   | 'upstream-status'
// //   | 'timeout'
// //   | 'transport'
// //   | 'payload'

// // export type RolePermissionsResult =
// //   | { ok: true; rolePermissions: Record<string, unknown> }
// //   | { ok: false; reason: RolePermissionsFailure }

// // // Fetches the role-permissions table. Never throws and never logs: the caller
// // // owns both the reply it sends and the category it records, because a failure
// // // is a 502/504 for `/api/auth/permissions` and a silent fallback for login.
// // export async function fetchRolePermissions(): Promise<RolePermissionsResult> {
// //   const sharedSecret = process.env.GAS_SHARED_SECRET?.trim()
// //   if (!sharedSecret) {
// //     return { ok: false, reason: 'configuration' }
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
// //       body: JSON.stringify({ action: 'getRolePermissions', sharedSecret }),
// //       signal: controller.signal,
// //       cache: 'no-store',
// //     })

// //     // GAS answers failures with an HTML error page that can name the script,
// //     // the deployment, and the executing account. Status and body stay here.
// //     if (!gasResponse.ok) {
// //       return { ok: false, reason: 'upstream-status' }
// //     }

// //     // Still inside the timeout window, so a body that never finishes trips it.
// //     // Non-JSON — the interstitial or error page — throws here.
// //     data = await gasResponse.json()
// //   } catch {
// //     // The exception object is deliberately not surfaced: it can carry the
// //     // upstream URL.
// //     return { ok: false, reason: timedOut ? 'timeout' : 'transport' }
// //   } finally {
// //     clearTimeout(timer)
// //   }

// //   // The exact contract the client already required — `data.success && data.
// //   // rolePermissions` — with the table additionally held to the shape every
// //   // consumer assumes: a map indexed by key. A string or array here would have
// //   // been stored and then read as `rolePermissions[user.email] === undefined` at
// //   // every lookup, so rejecting it lands the caller on the same fallback it
// //   // would have reached anyway, one step earlier.
// //   if (!isRecord(data) || data.success !== true || !isRecord(data.rolePermissions)) {
// //     return { ok: false, reason: 'payload' }
// //   }

// //   return { ok: true, rolePermissions: data.rolePermissions }
// // }

// // // The secured Apps Script normalizes email keys before returning the table.
// // // Prefer that form while retaining the exact-key lookup for compatibility with
// // // an older deployment during rollout.
// // //
// // // Every element must be a string: the value becomes `user.permissions`, which
// // // `hasPermission` reads with `.includes(...)` and which is signed into the
// // // session cookie. A non-string element could never match a permission literal,
// // // so rejecting the whole entry leaves the caller on its existing fallback
// // // rather than signing an array that grants nothing.
// // export function permissionsForEmail(
// //   rolePermissions: Record<string, unknown>,
// //   email: string,
// // ): string[] | null {
// //   const normalizedEmail = email.trim().toLowerCase()
// //   const entry = rolePermissions[normalizedEmail] ?? rolePermissions[email]
// //   if (!Array.isArray(entry) || !entry.every((p) => typeof p === 'string')) {
// //     return null
// //   }
// //   return entry as string[]
// // }


// // Server-side access to the role-permissions sheet.
// //
// // Shared upstream exchange for login and authenticated permission refresh. It
// // fetches and validates the Apps Script permission table on the server; callers
// // select the current user's entry and never expose the complete table publicly.

// // One server-only deployment URL for both login and permissions. Keeping it in
// // this module prevents those two authentication calls from drifting onto
// // different Apps Script deployments.
// export const AUTH_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby0ADVGM4fa1d-qouIzCL7UyV8AXJYNSOQ8ZxsfKpdrld8O1Rc2dRqkjHLDiCL3yBcx/exec'

// // One budget for the whole upstream exchange, matching the login route's, since
// // it is the same deployment. The signal stays armed through response.json(), so
// // a stalled body is cut off just like stalled headers.
// const UPSTREAM_TIMEOUT_MS = 15_000

// // A JSON value that can carry named fields: excludes null (typeof 'object') and
// // arrays, both of which would otherwise index without error and read undefined.
// function isRecord(value: unknown): value is Record<string, unknown> {
//   return typeof value === 'object' && value !== null && !Array.isArray(value)
// }

// // Closed set of failure kinds. Each caller maps these to its own fixed status,
// // message, and log category — nothing from the upstream body, URL, or exception
// // travels in this value, so interpolating it into a log line stays sanitized.
// export type RolePermissionsFailure =
//   | 'configuration'
//   | 'upstream-status'
//   | 'timeout'
//   | 'transport'
//   | 'payload'

// export type RolePermissionsResult =
//   | { ok: true; rolePermissions: Record<string, unknown> }
//   | { ok: false; reason: RolePermissionsFailure }

// // Fetches the role-permissions table. Never throws and never logs: each caller
// // owns the response and logging appropriate to its flow.
// export async function fetchRolePermissions(): Promise<RolePermissionsResult> {
//   const sharedSecret = process.env.GAS_SHARED_SECRET?.trim()
//   if (!sharedSecret) {
//     return { ok: false, reason: 'configuration' }
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
//       body: JSON.stringify({ action: 'getRolePermissions', sharedSecret }),
//       signal: controller.signal,
//       cache: 'no-store',
//     })

//     // GAS answers failures with an HTML error page that can name the script,
//     // the deployment, and the executing account. Status and body stay here.
//     if (!gasResponse.ok) {
//       return { ok: false, reason: 'upstream-status' }
//     }

//     // Still inside the timeout window, so a body that never finishes trips it.
//     // Non-JSON — the interstitial or error page — throws here.
//     data = await gasResponse.json()
//   } catch {
//     // The exception object is deliberately not surfaced: it can carry the
//     // upstream URL.
//     return { ok: false, reason: timedOut ? 'timeout' : 'transport' }
//   } finally {
//     clearTimeout(timer)
//   }

//   // The exact contract the client already required — `data.success && data.
//   // rolePermissions` — with the table additionally held to the shape every
//   // consumer assumes: a map indexed by key. A string or array here would have
//   // been stored and then read as `rolePermissions[user.email] === undefined` at
//   // every lookup, so rejecting it lands the caller on the same fallback it
//   // would have reached anyway, one step earlier.
//   if (!isRecord(data) || data.success !== true || !isRecord(data.rolePermissions)) {
//     return { ok: false, reason: 'payload' }
//   }

//   return { ok: true, rolePermissions: data.rolePermissions }
// }

// // The secured Apps Script normalizes email keys before returning the table.
// // Prefer that form while retaining the exact-key lookup for compatibility with
// // an older deployment during rollout.
// //
// // Every element must be a string: the value becomes `user.permissions`, which
// // `hasPermission` reads with `.includes(...)` and which is signed into the
// // session cookie. A non-string element could never match a permission literal,
// // so rejecting the whole entry leaves the caller on its existing fallback
// // rather than signing an array that grants nothing.
// export function permissionsForEmail(
//   rolePermissions: Record<string, unknown>,
//   email: string,
// ): string[] | null {
//   const normalizedEmail = email.trim().toLowerCase()
//   const entry = rolePermissions[normalizedEmail] ?? rolePermissions[email]
//   if (!Array.isArray(entry) || !entry.every((p) => typeof p === 'string')) {
//     return null
//   }
//   return entry as string[]
// }

// Server-side access to the role-permissions sheet.
//
// Server-side role-permission access for authenticated permission refresh. The
// deployment URL is also shared with login, while the full table is fetched
// only by the explicit refresh flow and is never exposed publicly.

// One server-only deployment URL for both login and permissions. Keeping it in
// this module prevents those two authentication calls from drifting onto
// different Apps Script deployments.
export const AUTH_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby0ADVGM4fa1d-qouIzCL7UyV8AXJYNSOQ8ZxsfKpdrld8O1Rc2dRqkjHLDiCL3yBcx/exec'

// One budget for the whole upstream exchange, matching the login route's, since
// it is the same deployment. The signal stays armed through response.json(), so
// a stalled body is cut off just like stalled headers.
const UPSTREAM_TIMEOUT_MS = 15_000

// A JSON value that can carry named fields: excludes null (typeof 'object') and
// arrays, both of which would otherwise index without error and read undefined.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Closed set of failure kinds. Each caller maps these to its own fixed status,
// message, and log category — nothing from the upstream body, URL, or exception
// travels in this value, so interpolating it into a log line stays sanitized.
export type RolePermissionsFailure =
  | 'configuration'
  | 'upstream-status'
  | 'timeout'
  | 'transport'
  | 'payload'

export type RolePermissionsResult =
  | { ok: true; rolePermissions: Record<string, unknown> }
  | { ok: false; reason: RolePermissionsFailure }

// Fetches the role-permissions table. Never throws and never logs: each caller
// owns the response and logging appropriate to its flow.
export async function fetchRolePermissions(): Promise<RolePermissionsResult> {
  const sharedSecret = process.env.GAS_SHARED_SECRET?.trim()
  if (!sharedSecret) {
    return { ok: false, reason: 'configuration' }
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
    const gasResponse = await fetch(AUTH_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getRolePermissions', sharedSecret }),
      signal: controller.signal,
      cache: 'no-store',
    })

    // GAS answers failures with an HTML error page that can name the script,
    // the deployment, and the executing account. Status and body stay here.
    if (!gasResponse.ok) {
      return { ok: false, reason: 'upstream-status' }
    }

    // Still inside the timeout window, so a body that never finishes trips it.
    // Non-JSON — the interstitial or error page — throws here.
    data = await gasResponse.json()
  } catch {
    // The exception object is deliberately not surfaced: it can carry the
    // upstream URL.
    return { ok: false, reason: timedOut ? 'timeout' : 'transport' }
  } finally {
    clearTimeout(timer)
  }

  // The exact contract the client already required — `data.success && data.
  // rolePermissions` — with the table additionally held to the shape every
  // consumer assumes: a map indexed by key. A string or array here would have
  // been stored and then read as `rolePermissions[user.email] === undefined` at
  // every lookup, so rejecting it lands the caller on the same fallback it
  // would have reached anyway, one step earlier.
  if (!isRecord(data) || data.success !== true || !isRecord(data.rolePermissions)) {
    return { ok: false, reason: 'payload' }
  }

  return { ok: true, rolePermissions: data.rolePermissions }
}

// The secured Apps Script normalizes email keys before returning the table.
// Prefer that form while retaining the exact-key lookup for compatibility with
// an older deployment during rollout.
//
// Every element must be a string: the value becomes `user.permissions`, which
// `hasPermission` reads with `.includes(...)` and which is signed into the
// session cookie. A non-string element could never match a permission literal,
// so rejecting the whole entry leaves the caller on its existing fallback
// rather than signing an array that grants nothing.
export function permissionsForEmail(
  rolePermissions: Record<string, unknown>,
  email: string,
): string[] | null {
  const normalizedEmail = email.trim().toLowerCase()
  const entry = rolePermissions[normalizedEmail] ?? rolePermissions[email]
  if (!Array.isArray(entry) || !entry.every((p) => typeof p === 'string')) {
    return null
  }
  return entry as string[]
}