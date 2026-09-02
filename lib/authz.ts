// Server-side identity and authorization predicates over the signed session.
//
// Phase 8 rollout step 2 (docs/PHASE_8_RBAC_AUTHORIZATION_MATRIX.md §8): one
// helper that reads the signed `kairali_user` cookie and answers "who is this
// and what may they do", so the four routes that already gate (§5.3) stop
// reimplementing role normalization in four files (M9). The three *spellings*
// survive on purpose — see `hasAdminRole` — but there is one implementation.
//
// **Four importers, one per gated route — rollout step 6 is complete.**
// `app/api/test-db/route.ts` and `app/api/debug-leads/route.ts` call
// `getSessionUser`; `app/api/received-leads/route.ts` and
// `app/api/crr-calling/bookings/route.ts` call `getSessionUserResult`, because
// their 401/403 bodies distinguish "no cookie" from "cookie did not verify".
// All four now also take their role and permission rules from here — through
// `hasAdminRole`, `hasPermission`, `hasAnyPermission`, and `getPermissions`.
//
// The role predicate they took is `hasAdminRole`, **not** the folding
// `normalizeRole`. `normalizeRole` is still adopted by nothing: it is
// simultaneously wider and narrower than every live route rule (see its comment),
// and ratifying its vocabulary is still owner decision D1. `hasAdminRole` instead
// reproduces each route's existing spelling byte for byte, so consolidating moved
// no role decision in either direction.
//
// Adding checks to any *other* route is steps 10-13 and remains deferred for
// owner route-by-route policy mapping (D1/D3/D8).
//
// Server-only: it reaches into `lib/session.ts`, which uses Node's `crypto`.
// It must never be imported from a client component — the browser has its own
// `hasPermission` in `hooks/use-auth.tsx` and the two are not interchangeable.
//
// What this module deliberately does **not** do:
//   - It enforces no payload schema. `verifySessionCookieValue` returns `any`
//     and every consumer trusts the upstream login payload's fields verbatim
//     (§2.1). Validating `role`/`permissions`/`action` at verification time is
//     matrix decision D9 — an owner call, because a stricter schema logs out
//     every live session whose payload does not match. So the predicates here
//     read a loose value and answer "no" on anything unusable, rather than
//     rejecting the session itself.
//   - It knows nothing about `user.action`. There is no server-side
//     action-permission concept (M13) and inventing one is D8 / step 13.
//   - It does not touch `/api/calendar/mobile`, `/api/meetings/*`, mobile
//     authentication, or the Meetings CORS policy (§1, owner-deferred).

import type { NextRequest } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'

// The cookie `app/api/auth/login/route.ts` mints and `middleware.ts` verifies.
export const SESSION_COOKIE_NAME = 'kairali_user'

// The permission string that grants everything. This is the vocabulary already
// in force on both sides: `hooks/use-auth.tsx` short-circuits `hasPermission`
// on it, and both `app/api/received-leads/route.ts` and
// `app/api/crr-calling/bookings/route.ts` test for it before anything else.
export const PERMISSION_WILDCARD = 'all'

// The role pair every server-side check in the repository treats as elevated.
// All four gated routes now read it through `hasAdminRole` below, each naming
// the coercion its own rule always used.
export const ADMIN_ROLES: readonly string[] = ['super_admin', 'admin']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// One spelling of role normalization, replacing the three in M9:
// `String(user?.role ?? '').trim().toLowerCase()` (test-db, debug-leads),
// `String(user?.role || '').toLowerCase()` with no trim (received-leads), and
// a raw comparison with no normalization at all (crr-calling/bookings).
//
// Case and separator are both folded because the repository already carries
// every style: `super_admin`/`admin` snake_case in the four gated routes,
// `ADMIN` upper-case in `hooks/use-booking-auth.tsx:23`/`98`, `superVisor`
// camelCase and `fo_manager` snake_case side by side in the
// `actionPermissionsByPageByRole` keys (`hooks/use-auth.tsx:81-82`, M5), and
// `Front Office`/`Medical`-style spaced values in the `Department` union. So
// `Travel Consultant`, `travel-consultant`, and `travel_consultant` all land on
// `travel_consultant`, and `Calling Agent` on `calling_agent`, without this
// module inventing an alias table: no alias is asserted between two *different*
// words, only between spellings of the same one. (Neither `travel_consultant`
// nor `calling_agent` occurs anywhere in this repository today — the real role
// vocabulary lives in the upstream login payload, which §9 records as
// unverified from here.)
//
// A non-string role normalizes to '' and therefore matches nothing. That is one
// deliberate tightening over `String(user?.role ?? '')`, which would coerce a
// pathological `role: ['admin']` into the string `'admin'` and grant it. No
// route changes behavior from it today, since nothing calls this yet.
//
// Those two properties are exactly why none of the four gated routes calls this,
// or `hasRole`/`hasAnyRole` built on it. Against each route's live rule this
// function is *both* wider and narrower: wider on `super admin`, `super-admin`,
// and `_admin_`, all of which land on an admin role here and are rejected by all
// four routes today (`crr-calling/bookings` additionally rejects plain `Admin`,
// since it compares raw); narrower on a non-string `role`. Either direction
// changes who reaches a diagnostic endpoint or a booking write by an amount §9
// of the matrix records as unmeasurable from this repository, so ratifying this
// vocabulary stays an owner call (M9, D1). The four routes consolidated on
// `hasAdminRole` instead, which folds nothing.
//
// This function is therefore currently used only by `hasRole`/`hasAnyRole`,
// which are in turn used by nothing. They are kept as the shape D1 would adopt.
export function normalizeRole(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

// The verified session user, or null. Accepts a `NextRequest` (the route-handler
// case) or a raw cookie value already in hand. Returns `any` because that is
// what `verifySessionCookieValue` returns and what every caller already trusts
// (D9); missing, tampered, forged, and expired cookies all come back null.
export function getSessionUser(
  source: NextRequest | string | null | undefined
): any | null {
  if (!source) return null
  const raw =
    typeof source === 'string'
      ? source
      : source.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!raw) return null
  return verifySessionCookieValue(raw)
}

// The same read as `getSessionUser`, but keeping the two failure states apart.
//
// `getSessionUser` collapses "no cookie was sent" and "a cookie was sent and did
// not verify" into one `null`. That is why two of the four gated routes could
// not take it: `app/api/received-leads/route.ts` and
// `app/api/crr-calling/bookings/route.ts` answer `Access denied: Not logged in`
// for the first and `Access denied: Invalid session` for the second, so
// substituting a single `null` there would merge two distinct response bodies
// (§5.3, M9). This variant reads the same `SESSION_COOKIE_NAME` through the same
// `verifySessionCookieValue` and reports which of the two happened, so a route
// can adopt it without moving a single response. Both now do — and the status
// each pairs with those bodies is the route's own business, not this helper's:
// `received-leads` answers 401 for both, `crr-calling/bookings` answers 401 for
// both on GET and 403 for both on POST, all four unchanged by the adoption.
//
// The three states are exactly the tests the callers already run, in the order
// they already run them:
//   - `missing` — no `NextRequest`/cookie value in hand, or a cookie value that
//     is absent or empty. Their `if (!userCookie)`.
//   - `invalid` — a cookie value that `verifySessionCookieValue` answered falsy
//     for: bad shape, signature mismatch, unparseable payload, elapsed expiry,
//     or a well-signed payload whose `user` field is itself falsy. Their
//     `if (!user)`.
//   - `valid` — anything else, with `user` verbatim as the verifier returned it.
//
// It is deliberately **not** a schema check. Nothing about a truthy payload is
// inspected — no `role`, `permissions`, or `action` field is read, coerced, or
// required — so no session that verifies today stops verifying (D9 stays open,
// for the same reason `getSessionUser` leaves it open).
export type SessionUserResult =
  | { state: 'valid'; user: any }
  | { state: 'missing'; user: null }
  | { state: 'invalid'; user: null }

export function getSessionUserResult(
  source: NextRequest | string | null | undefined
): SessionUserResult {
  const raw = !source
    ? undefined
    : typeof source === 'string'
      ? source
      : source.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!raw) return { state: 'missing', user: null }
  const user = verifySessionCookieValue(raw)
  if (!user) return { state: 'invalid', user: null }
  return { state: 'valid', user }
}

// The session's normalized role, or '' when there is none.
export function getRole(user: unknown): string {
  return isRecord(user) ? normalizeRole(user.role) : ''
}

// The session's permissions, always a real array of strings.
//
// Malformed or missing values become `[]` — which grants nothing — rather than
// throwing. `app/api/crr-calling/bookings/route.ts` used to dereference
// `user.permissions` with no array guard and call `.some(p => p.startsWith(…))`
// on its elements, so a payload without the field, or with a non-string element
// in it, was a 500 there. It now reads through this function, so those payloads
// get a deterministic 403 instead — the deliberate hardening recorded with
// rollout step 6. Non-string elements are dropped because they could never equal
// a permission literal anyway.
//
// The strings themselves are returned verbatim, never case-folded: unlike roles,
// permissions are compared exactly today (`includes('ai_voice_received.view')`,
// `startsWith('crr_fms.stage')`) and folding them would silently widen every
// existing rule.
export function getPermissions(user: unknown): string[] {
  const raw = isRecord(user) ? user.permissions : undefined
  if (!Array.isArray(raw)) return []
  return raw.filter((entry): entry is string => typeof entry === 'string')
}

// Does the session hold this exact role? Both sides are normalized, so the
// caller may write `hasRole(user, 'super_admin')` or `hasRole(user, 'Super
// Admin')` and get the same answer.
export function hasRole(user: unknown, role: string): boolean {
  const normalized = normalizeRole(role)
  return normalized !== '' && getRole(user) === normalized
}

// ── Exact-preserving admin-role predicate (rollout step 6, role half) ────────
//
// The one role predicate the four gated routes actually call. It exists because
// `normalizeRole` folds and folding moves who gets in (M9): the owner accepted a
// behavior-changing Phase 8 hardening pass, but not a silent change to the admin
// vocabulary, which is still D1. So this reproduces each of the three spellings
// M9 recorded, byte for byte, and folds nothing — `super admin`, `super-admin`,
// and `_admin_` are rejected here exactly as the routes reject them today.
//
// The mode is spelled at every call site on purpose. Three modes is not an
// oversight: it *is* M9, made visible in one place instead of hidden in four
// files. Collapsing them to one is the owner call, and when D1 answers, this
// type is where the answer lands.
//
//   'trimmed-lower' — `String(user?.role ?? '').trim().toLowerCase()`
//                     (`app/api/test-db`, `app/api/debug-leads`)
//   'lower'         — `String(user?.role || '').toLowerCase()`, no trim
//                     (`app/api/received-leads`)
//   'raw'           — `['super_admin','admin'].includes(user.role)`, no
//                     coercion at all (`app/api/crr-calling/bookings`)
//
// `'raw'` guards on `typeof role === 'string'` first, which is not a narrowing:
// `Array.prototype.includes` over an array of strings is already false for every
// non-string, so the guard only tells TypeScript what the runtime already knew.
export type RoleMatchMode = 'trimmed-lower' | 'lower' | 'raw'

export function hasAdminRole(user: unknown, mode: RoleMatchMode): boolean {
  const role = isRecord(user) ? user.role : undefined
  if (mode === 'raw') {
    return typeof role === 'string' && ADMIN_ROLES.includes(role)
  }
  const coerced =
    mode === 'trimmed-lower'
      ? String(role ?? '').trim().toLowerCase()
      : String(role || '').toLowerCase()
  return ADMIN_ROLES.includes(coerced)
}

// Any one of these roles. An empty list grants nothing — "any of none" is false,
// never "unrestricted".
//
// Unused, like `hasRole`: it normalizes through `normalizeRole` and so is
// blocked on D1. See `hasAdminRole` for what the routes call instead.
export function hasAnyRole(user: unknown, roles: readonly string[]): boolean {
  const actual = getRole(user)
  if (actual === '') return false
  return roles.some((role) => normalizeRole(role) === actual)
}

// Does the session grant this permission? `all` is a wildcard, matching what
// `hooks/use-auth.tsx` does on the client and what both permission-checking
// routes already test for explicitly, so this predicate can express their
// existing rules without changing them.
export function hasPermission(user: unknown, permission: string): boolean {
  const permissions = getPermissions(user)
  return (
    permissions.includes(PERMISSION_WILDCARD) || permissions.includes(permission)
  )
}

// Any one of these permissions, wildcard included. An empty list grants nothing,
// for the same reason as `hasAnyRole` — the wildcard answers "may they do X",
// and with no X there is nothing to allow.
export function hasAnyPermission(
  user: unknown,
  permissions: readonly string[]
): boolean {
  if (permissions.length === 0) return false
  const granted = getPermissions(user)
  if (granted.includes(PERMISSION_WILDCARD)) return true
  return permissions.some((permission) => granted.includes(permission))
}

export function hasReceivedLeadsAccess(user: unknown): boolean {
  return (
    hasAnyPermission(user, ['ai_voice_received.view']) ||
    hasAdminRole(user, 'lower')
  )
}

export function hasDealAssistantAccess(user: unknown): boolean {
  return (
    hasAnyPermission(user, ['deal_assistant.view']) ||
    hasAdminRole(user, 'lower')
  )
}

export function hasPartnerAccess(user: unknown): boolean {
  return (
    hasAnyPermission(user, ['partners.view']) ||
    hasAdminRole(user, 'lower')
  )
}

export function hasDoctorConsultationAccess(user: unknown): boolean {
  return (
    hasAnyPermission(user, ['doctor.consultation.view', 'prescriptions.create']) ||
    hasAdminRole(user, 'lower')
  )
}

export function hasAccountsTrackerAccess(user: unknown): boolean {
  return (
    hasAnyPermission(user, ['accounts_tracker.view']) ||
    hasAdminRole(user, 'lower')
  )
}

// ── Sales Call Audit: page access, data scope, and write are three axes ──────
//
// Owner ruling (2026-09-01): this page has four *composable* permissions, not a
// ladder. A user may hold any combination.
//
//   sales_call_audit.view      — may open the page. Grants no data.
//   sales_call_audit.viewSelf  — may see their own rows. Read-only.
//   sales_call_audit.viewAll   — may see every row. Read-only.
//   sales_call_audit.write     — may save HR actions. Grants no data.
//
// So `view` is the door, `viewSelf`/`viewAll` decide how much data comes through
// it, and `write` decides whether saving works. `view` alone is a real state:
// the page renders with zero rows.
//
// This replaces `hasSalesCallAuditReadAccess`/`hasSalesCallAuditWriteAccess`,
// which had one permission for two audiences and let `.view` grant writes (#48).
// The self/all vocabulary is the one already used by `SERVER_ACTION_PERMISSIONS`
// below for `ktahvPage` and `villaPage`.
export const SALES_CALL_AUDIT_VIEW = 'sales_call_audit.view'
export const SALES_CALL_AUDIT_VIEW_SELF = 'sales_call_audit.viewSelf'
export const SALES_CALL_AUDIT_VIEW_ALL = 'sales_call_audit.viewAll'
export const SALES_CALL_AUDIT_WRITE = 'sales_call_audit.write'

// Pre-split spelling. It meant "see the dashboard data", so it maps to viewAll
// rather than being dropped, and no session that works today stops working.
const SALES_CALL_AUDIT_LEGACY_READ = 'sales_call_audit.read'

// `super_admin` does everything here, by owner ruling, regardless of permissions.
//
// Deliberately *not* `hasAdminRole`, which also admits plain `admin`: under the
// four-permission model `admin` goes through grants like everyone else. Matching
// folds case and separators — and accepts the unseparated `superadmin` — because
// `lib/db-auth.ts:178` copies `role` out of the database verbatim, so the stored
// spelling is not guaranteed. `super_admin` is the canonical value.
export function isSalesCallAuditSuperAdmin(user: unknown): boolean {
  const role = isRecord(user) ? user.role : undefined
  if (typeof role !== 'string') return false
  const folded = role.trim().toLowerCase().replace(/[\s\-_]+/g, '')
  return folded === 'superadmin'
}

// How much of the table this session may read.
//
//   'all'  — every row
//   'self' — only rows whose employee identity matches the session
//   'none' — no rows. The page may still open if `view` is held.
//
// `viewAll` wins when both scope permissions are held: the scope is their union.
export type SalesCallAuditScope = 'all' | 'self' | 'none'

export function getSalesCallAuditScope(user: unknown): SalesCallAuditScope {
  if (isSalesCallAuditSuperAdmin(user)) return 'all'
  if (hasAnyPermission(user, [SALES_CALL_AUDIT_VIEW_ALL, SALES_CALL_AUDIT_LEGACY_READ])) return 'all'
  if (hasPermission(user, SALES_CALL_AUDIT_VIEW_SELF)) return 'self'
  return 'none'
}

// May this session open the page at all? Holding a scope implies the door: a
// grant of `viewAll` without `view` is a mis-grant, not a reason to 403 someone
// out of data they were explicitly given.
export function hasSalesCallAuditPageAccess(user: unknown): boolean {
  if (isSalesCallAuditSuperAdmin(user)) return true
  return (
    hasPermission(user, SALES_CALL_AUDIT_VIEW) ||
    getSalesCallAuditScope(user) !== 'none'
  )
}

// May this session save HR actions? Only `write` grants this — never `view`.
//
// Write is also scope-bound, which this predicate does not answer on its own:
// see `isRowInSalesCallAuditScope`. `write` with scope 'none' can reach no row.
export function hasSalesCallAuditWriteAccess(user: unknown): boolean {
  if (isSalesCallAuditSuperAdmin(user)) return true
  return hasPermission(user, SALES_CALL_AUDIT_WRITE)
}

// The identities a 'self'-scoped session may act as. `employeeId` is the join key
// against `daily_sales_reports_log_fms.emp_id` (`lib/db-auth.ts:218`); `name` is
// the fallback for rows that carry no employee id.
export function getSalesCallAuditIdentity(user: unknown): { employeeId: string; name: string } {
  const employeeId = isRecord(user) && typeof user.employeeId === 'string' ? user.employeeId.trim() : ''
  const name = isRecord(user) && typeof user.name === 'string' ? user.name.trim() : ''
  return { employeeId, name }
}

// Is one row readable/writable by this session? The row-level companion to
// `getSalesCallAuditScope`, so a 'self' session cannot reach another employee's
// record by posting its id.
export function isRowInSalesCallAuditScope(
  user: unknown,
  row: { emp_id?: string | null; name?: string | null }
): boolean {
  const scope = getSalesCallAuditScope(user)
  if (scope === 'all') return true
  if (scope === 'none') return false

  const { employeeId, name } = getSalesCallAuditIdentity(user)
  const rowEmpId = String(row.emp_id ?? '').trim()
  const rowName = String(row.name ?? '').trim()

  if (employeeId && rowEmpId) return rowEmpId.toLowerCase() === employeeId.toLowerCase()
  if (name && rowName) return rowName.toLowerCase() === name.toLowerCase()
  return false
}

export function hasDialShreeSummaryAccess(user: unknown): boolean {
  return (
    hasAnyPermission(user, ['dialshree_summary.view', 'dialshree_menu.view', 'dialshree_sent.view', 'ai_voice_sent.view']) ||
    hasAdminRole(user, 'lower')
  )
}

export function hasDialShreeSentAccess(user: unknown): boolean {
  return (
    hasAnyPermission(user, ['dialshree_sent.view', 'dialshree_menu.view', 'ai_voice_sent.view']) ||
    hasAdminRole(user, 'lower')
  )
}

const SERVER_ACTION_PERMISSIONS: Record<string, Record<string, readonly string[]>> = {
  ktahvPage: {
    sales_agent: ['viewSelf', 'editSelf', 'cancelSelf', 'approvalSelf', 'collectionSelf', 'arrivalFlightSelf', 'departureFlightSelf'],
    sales_manager: ['viewSelf', 'editSelf', 'cancelSelf', 'approvalSelf', 'collectionSelf', 'arrivalFlightSelf', 'departureFlightSelf'],
    account_manager: ['viewAll', 'accountsVerify'],
    operation_manager: ['viewAll', 'approvalAll', 'collectionAll', 'foVerify'],
    fo_manager: ['viewAll', 'collectionAll', 'checkOutVerify'],
    superVisor: ['viewAll'],
  },
  villaRaagPage: {
    sales_agent: ['viewSelf', 'editSelf', 'cancelSelf', 'approvalSelf', 'collectionSelf'],
    sales_manager: ['viewSelf', 'editSelf', 'cancelSelf', 'approvalSelf', 'collectionSelf'],
    account_manager: ['viewAll', 'accountsVerify'],
    operation_manager: ['viewAll', 'approvalAll', 'collectionAll', 'foVerify'],
    villa_raag_manager: ['viewAll', 'editAll', 'manageAll'],
  },
  kapplPage: {
    sales_agent: ['viewSelf', 'editSelf', 'cancelSelf', 'approvalSelf', 'collectionSelf'],
    sales_manager: ['viewSelf', 'editSelf', 'cancelSelf', 'approvalSelf', 'collectionSelf'],
    account_manager: ['viewAll', 'accountsVerify'],
    operation_manager: ['viewAll', 'approvalAll', 'collectionAll', 'foVerify'],
  },
}

export function hasServerActionPermission(
  user: unknown,
  page: string,
  action: string,
): boolean {
  if (!isRecord(user) || !isRecord(user.action)) return false
  const pageRolesValue = user.action[page]
  if (typeof pageRolesValue !== 'string' || !pageRolesValue.trim()) return false

  const pagePermissions = SERVER_ACTION_PERMISSIONS[page]
  if (!pagePermissions) return false

  const pageRoles = pageRolesValue.includes(',')
    ? pageRolesValue.split(',').map(role => role.trim()).filter(Boolean)
    : [pageRolesValue.trim()]

  return pageRoles.some(role => pagePermissions[role]?.includes(action))
}
