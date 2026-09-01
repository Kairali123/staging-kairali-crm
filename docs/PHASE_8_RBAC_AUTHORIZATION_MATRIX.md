# Phase 8 — RBAC / Server-Authoritative Authorization Matrix

Status: **inventory, kept current with the local rollout.** It records what the repository currently
does for role/permission authorization, where the sources disagree, what the owner must decide, and
the order in which changes can be made safely.

Rollout steps 2, 4, 5, 6, 7, and 8 (§8) have been carried out locally in this working tree, and step
12 is partly done. The owner accepted this as a **behavior-changing RBAC hardening pass**, so unlike
the earlier slices some of these do move who can reach what. Three sections below therefore matter
more than the rest: §5 for what is enforced now, §8 for what each step landed, and this header for
the three-way split the owner asked for.

**Closed locally in this pass** — M6, M7 (the three malformed `RouteGuard` keys now match a
pathname and enforce their permissions), M10 (all six uncovered page prefixes are in
`protectedRoutes`; identity only, no role check in middleware), the role half of step 6 (all four
gated routes take their rule from `lib/authz.ts`), and two thirds of M8 (the two authorization-
relevant `localStorage.kairali_user` readers now read the verified session).

**Intentionally owner-deferred** — the folding `normalizeRole` as the authoritative role vocabulary
(D1), which is why step 6 landed on the exact-preserving `hasAdminRole` instead and why **M9 is
narrowed and made explicit rather than closed**; per-route server-side enforcement across the
remaining 105 API routes (steps 10-11), which needs a route-by-route policy mapping this repository
does not contain and which is **not** claimed as done; `pagePermissions` coverage for the 15 still-
unguarded pages (step 9, D7); server-authoritative `user.action` (step 13, D8, M13); and everything
in §1's out-of-scope table.

**Still not externally verifiable from this repository** — everything in §9, unchanged: the
permissions sheet's real contents, owner, and access setting; the real `role`, `permissions`, and
`action` values production accounts carry; whether the newly gated pages are reachable, linked, or
dead in production. Nothing in this pass was validated against a running system; browser testing is
the next step and has not been done.

Every claim below is anchored to a file and, where useful, a line number in the current working
tree at `HEAD = 5110e96` plus the inherited uncommitted Phase 1–7 work. Nothing here asserts a fact
about an external Google account, Apps Script source, spreadsheet, Vercel project, or mobile app —
those are marked as unproven and left to owner verification.

---

## 1. Scope

**In scope for Phase 8:** server-authoritative role/permission authorization for CRM browser
sessions — the signed session cookie, the client permission source, `components/route-guard.tsx`,
`middleware.ts`, and per-action authorization inside `app/api/**` route handlers.

**Explicitly out of scope and not to be touched (owner-deferred since Phase 1):**

| Surface | Evidence | Reason |
| --- | --- | --- |
| `/api/calendar/mobile` | `middleware.ts:48` (`exemptApiPaths`) | Anonymous mobile access preserved as-is |
| `/api/meetings` and the whole `/api/meetings/*` subtree | `middleware.ts:49`, `middleware.ts:54` (`exemptApiPrefixes`) | Same |
| Meetings wildcard CORS policy | Unchanged in the meetings routes | Same |
| Mobile authentication generally | No mobile source is present in this repository | Cannot be verified from the repo |

Any Phase 8 proposal that would add a role or permission check to those paths is out of scope until
the owner lifts the deferral. The `middleware.ts` comments at lines 47 and 52–53 already mark them
`OWNER-DEFERRED`; that marking is authoritative.

**Phase 4 items (`docs/AUDIT_WORKPACK_CROSS_REFERENCE.md:204`), current state:**

- Malformed `route-guard` keys (M6/M7) — **fixed in the completion pass.** They were recorded-not-
  fixed under the earlier inventory-only constraint; the owner's acceptance of a behavior-changing
  hardening pass lifted it, and step 8 was the named remedy.
- The Access Denied "Go Home" link to `/` (`app/access-denied/page.tsx:38`) — still not changed.
- The Accounts Tracker hard-coded role (`app/accounts-tracker/page.tsx:4074`, M11) — still not
  changed. It is a Phase 4 item the owner sequences, not a Phase 8 gate.

---

## 2. Authorization inputs — the four sources

There are four distinct places the application gets "who is this and what may they do," and they do
not agree. Naming them is the point of this section; the disagreements are catalogued in section 6.

### 2.1 Source A — the signed session cookie (server-authoritative today)

- Minted only by `app/api/auth/login/route.ts`, at the `createSessionCookieValue(finalUser)` call
  near the end of `POST`, after the route validates that `data.user` is a non-null non-array object.
- **Rollout step 5, completed locally:** the value signed is no longer the upstream payload verbatim.
  Before signing, the route resolves the role-permissions table through `lib/role-permissions.ts`
  (Source C, same helper `/api/auth/permissions` uses) and, when the table contains an array of
  strings under the upstream record's exact `email`, signs `{ ...user, permissions: <that array> }`.
  When the table is unavailable, unparseable, or has no usable row for that email, the upstream
  `user` is signed verbatim exactly as before — the lookup is best-effort and never fails a login
  whose credentials were already accepted. The same object is returned in the JSON reply, so the
  reply and the cookie cannot disagree. Every other field — `role`, `action`, and anything else the
  upstream returned — is still carried verbatim.
- Format and verification: `lib/session.ts`. Value is `<base64url payload>.<HMAC-SHA256 signature>`,
  signed with `process.env.NEXTAUTH_SECRET` (`lib/session.ts:5-9`), payload carries its own `exp`
  (`lib/session.ts:15`), TTL 7 days (`lib/session.ts:3`). `verifySessionCookieValue`
  (`lib/session.ts:20-45`) compares signatures with `timingSafeEqual` and rejects on bad shape,
  signature mismatch, unparseable payload, or elapsed expiry.
- Cookie attributes (`app/api/auth/login/route.ts`, `response.cookies.set`): name `kairali_user`,
  `httpOnly: true`, `secure` only when `NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`,
  `maxAge` 7 days.
- Return type is `any` (`lib/session.ts:20`). **No schema is enforced on the payload.** Whatever
  fields the upstream login returned — including `role`, `permissions`, and `action` — are carried
  and trusted verbatim by every server consumer.

This is the only tamper-resistant authorization input in the system.

### 2.2 Source B — `/api/auth/me` (identity readback of Source A)

- `app/api/auth/me/route.ts`, GET only. Re-derives the user from the cookie signature and returns
  `{ success: true, user }` with `Cache-Control: private, no-store`.
- Its own header comment is explicit: *"This route answers identity, not authorization."* It never
  mints, refreshes, or clears the cookie.
- It returns the **whole** signed record, so the browser receives the cookie's `role`,
  `permissions`, and `action` fields on every reload.

### 2.3 Source C — the role-permissions sheet via same-origin proxy

- Phase 8 rollout step 4 added `app/api/auth/permissions/route.ts` as the same-origin transport for
  the role-permissions sheet. `hooks/use-auth.tsx` now calls `/api/auth/permissions` instead of
  fetching the Apps Script deployment directly from the browser.
- The new route still performs the same upstream `action=getRolePermissions` request and returns the
  same client contract: `{ success: true, rolePermissions }`. The whole returned `rolePermissions`
  table is still stored in React state and cached in `localStorage` under
  `cached_role_permissions` with a 1-hour freshness window (`hooks/use-auth.tsx`).
- Rollout step 5 extracted that upstream exchange into `lib/role-permissions.ts` —
  `fetchRolePermissions()` (URL, `action=getRolePermissions`, 15s abort armed through `.json()`,
  `cache: 'no-store'`, `isRecord` validation of both the envelope and the table) plus
  `permissionsForEmail()` (exact-key lookup, array-of-strings only). `/api/auth/permissions` and
  `app/api/auth/login/route.ts` now both read Source C through it, so a fresh login and the client's
  table come from one implementation. The route's request shape, status codes (502/504), fixed
  `Permissions unavailable` message, `[permissions] …` log categories, and `{ success, rolePermissions }`
  body are unchanged by the extraction.
- The Apps Script deployment URL is no longer in the browser bundle. There are still two server-side
  literals — one in `lib/role-permissions.ts` for the `getRolePermissions` call and one in
  `app/api/auth/login/route.ts` for the `login` call. Moving both to configuration is still pending
  the external/env cleanup.
- A successful login now makes two upstream calls to that deployment, sequentially, each with its own
  15-second budget. This is the cost D2 anticipated.
- Unproven from the repo: who owns that deployment, whether it is public, and whether it returns the
  full cross-user permission table to any caller. Only the repository-side transport is established
  here; the deployed script's access setting cannot be read from this repo.

### 2.4 Source D — hard-coded client maps

Two maps live in `hooks/use-auth.tsx` and are compiled into the browser bundle:

- `actionPermissionsByPageByRole` (lines 75-97) — per-page action grants for `ktahvPage`,
  `villaRaagPage`, `kapplPage`. This is the only vocabulary `hasActionPermission` consults.
- `fallbackRolePermissions` (lines 100-214) — keyed by role name, used whenever Source C fails.

Both are static client data. Neither is consulted by any server route.

---

## 3. How the client assembles `user.permissions`

The assembly differed between a fresh login and a page reload. This was the root of the divergence
Phase 1 flagged (`docs/AUDIT_WORKPACK_CROSS_REFERENCE.md:89`). Rollout step 5 moved the sheet lookup
to the server side of login and then removed the client's re-application, so both paths now read one
array:

**Fresh login** (`hooks/use-auth.tsx:342-390`):

1. `POST /api/auth/login` returns `{ success, user }`. Since rollout step 5, `user.permissions` is
   already the sheet's array for that email when the sheet had one, and the **same object** is what
   was signed into the cookie.
2. The client takes that array as given: `data.user.permissions = Array.isArray(data.user.permissions)
   ? data.user.permissions : []` (`hooks/use-auth.tsx:367`). The former overwrite from the client's
   own `rolePermissions` React state is gone, so a `cached_role_permissions` copy up to an hour stale
   can no longer replace the value that is in the cookie. A missing or non-array `permissions` field
   becomes `[]`, which grants nothing and keeps `hasPermission`'s `.includes(...)` on a real array.
3. `data.user.action = data.user.action || {}` (line 369), then `setUser(data.user)` and a
   `localStorage` write (lines 371-372).

**Page reload** (`hooks/use-auth.tsx:275-340`):

1. Cached permissions are loaded from `localStorage` if under one hour old (lines 278-291), and a
   fresh `loadRolePermissions()` runs in the background (line 294).
2. Identity comes from `GET /api/auth/me` (lines 303-328). The returned `sessionUser` is used
   **as-is** — its `permissions` array is the one signed into the cookie at login. There is **no**
   re-application of the sheet permissions on this path.

Before rollout step 5 the UI permission set after a reload was the cookie's set and after a fresh
login it was the sheet's set, so an account saw different UI depending on how it arrived. The cookie
is now minted from the sheet's set, and the login path no longer rewrites it, so login and reload
read the same array. Note the scope of that statement: it is about the *local* code paths. What that
array contains still depends on the sheet, whose real per-email values, owner, and access setting
remain unverified from this repository (§9).

`refreshPermissions()` (lines 259-272) is now the only client-side writer of `user.permissions`, and
it still keys by `newPermissions[user.email]` against the client's freshly fetched table. It runs
only when something calls it explicitly — it is not part of login or reload — and it does not update
the cookie, so a manual refresh remains a way to put a set on screen that the cookie does not carry.
The `rolePermissions` state, its `cached_role_permissions` cache, and `loadRolePermissions()` are
retained for that path and for `createUser`/`updateUser` (lines 447, 460), which are client-only
(see M12).

---

## 4. The permission-checking functions

| Function | File | Reads | Notes |
| --- | --- | --- | --- |
| `hasPermission(permission)` | `hooks/use-auth.tsx:406-414` | `user.permissions` only | `"all"` is a wildcard granting everything (line 410). Role is never consulted. Since rollout step 5 the array it reads is the cookie's on both the login and the reload path. |
| `hasActionPermission(page, action)` | `hooks/use-auth.tsx:416-437` | `user.action[page]` × `actionPermissionsByPageByRole` | `user.action[page]` is a comma-separated **role string** from the login payload/cookie; the grant table is the hard-coded Source D map. Unchanged by rollout step 5. |
| `getAllUsers()` | `hooks/use-auth.tsx:439-441` | `users` state | See M12 — the `users` state is never populated from any source. |

Both functions are **client-only**. Neither has a server counterpart, and nothing in `app/api/**`
imports them.

---

## 5. Current enforcement surfaces

### 5.1 `components/route-guard.tsx` — browser-side page gating

- Mounted once, wrapping all page content (`app/layout.tsx:46-69`).
- Holds children until the auth bootstrap settles (`components/route-guard.tsx:96`), then in an
  effect looks up `pagePermissions[pathname]` and `router.replace('/access-denied')` when the
  permission is missing (lines 76-89).
- `/` is unconditionally allowed (line 81).
- **This is a client-side redirect only.** It runs after the page component has already been sent to
  the browser and mounted, and it can be bypassed by anyone who disables JS, edits the bundle, or
  calls the underlying APIs directly.

Coverage, measured against the 61 `page.tsx` routes in `app/`:

| Measure | Count | Before this pass |
| --- | --- | --- |
| Keys in `pagePermissions` | 44 | 44 |
| Keys that can actually match a `usePathname()` value | **44** | 41 |
| Keys pointing at a route that does not exist | 0 | 0 |
| Page routes intentionally exempt (`/`, `/access-denied`) | 2 | 2 |
| **Page routes with no `pagePermissions` entry** | **15** | 18 |

No key was added or removed. The three that could never match were repaired in place (M6/M7), which
is why the effective-key count rose by three and the unguarded-page count fell by three.

The 15 still-unguarded page routes:

```
/deal-assistant                                 /partners
/doctor-consultation/prescription/preview/[id]  /partners/[id]
/fms/bookings/ktahv                             /riya-sharma
/fms/complaints/[id]                            /sales-calling
/ksereve-billing-auditer                        /voicecall/data
/leads/duplicates/assign                        /meet
/leads/duplicates/duplicates                    /new-order-fms
/leads/duplicates_old
```

Note `/leads/duplicates/duplicates` and `/leads/duplicates_old` each render a component that applies
its own `leads.view` check internally, so they are not fully open — but they are not guarded by
`RouteGuard`. Giving any of the 15 a `pagePermissions` entry is new policy, not a repair, and stays
step 9 / D7 — including `/voicecall/data`, whose two child pages are now guarded.

### 5.2 `middleware.ts` — identity only, never authorization

Two behaviors, both identity-level:

**Page requests.** `protectedRoutes` is now a **26**-entry prefix list. A matching path requires a
`kairali_user` cookie that passes `verifySessionCookieValue`, else redirect to `/`. No role or
permission is read anywhere in this file, before or after this pass.

The six page routes that previously matched no prefix — `/MR-FMS`, `/crr-fms`, `/deal-assistant`,
`/ksereve-billing-auditer`, `/meet`, `/riya-sharma` — are the six entries added (M10, step 7).
**Zero page routes now bypass the middleware identity check.** `/meet` also prefix-matches
`/meetings`, which was already in the list and is equally identity-only, so the overlap changes
nothing; the owner-deferred exemption is the `/api/meetings/*` API subtree, which is a different
mechanism in the same file and was not touched.

This is a real behavior change (D6): an unauthenticated request to any of those six is now
redirected to `/` instead of being served. Whether any of them was legitimately reached anonymously
is not knowable from this repository (§9) — the owner accepted the change knowing that.

**API requests.** Every `/api/*` path requires a valid signed cookie unless exempt (lines 95-110).
Exemptions are `/api/auth/login`, `/api/auth/logout`, `/api/zoom/connect`, `/api/zoom/callback`,
`/api/leads`, `/api/conversion`, the two owner-deferred mobile/meetings entries, and the enumerated
NextAuth runtime actions (lines 36-77). This is a **session boundary, not an authorization
boundary** — any signed-in user of any role passes it.

### 5.3 `app/api/**` — per-route authorization

| Measure | Count |
| --- | --- |
| Route files under `app/api` | 109 |
| Route files exporting `POST`/`PUT`/`PATCH`/`DELETE` | 35 |
| Route files with **any** server-side role or permission check | **4** |

The four, with their exact rule:

| Route | Rule | Role coercion | Evidence |
| --- | --- | --- | --- |
| `app/api/test-db/route.ts` | Role in `['super_admin','admin']` | `'trimmed-lower'` | line 31 |
| `app/api/debug-leads/route.ts` | Same rule | `'trimmed-lower'` | line 31 |
| `app/api/received-leads/route.ts` | `permissions` includes `all` or `ai_voice_received.view`, **or** role in `['super_admin','admin']` | `'lower'` (no trim) | lines 28-33 |
| `app/api/crr-calling/bookings/route.ts` | Read: `all` / `fms.admin` / admin role, or `crr_fms.view` / `fms.view` / `bookings.view` / any `crr_fms.stage*` prefix. Write: admin, or the exact `crr_fms.stage{n}` for the requested stage | `'raw'` (no coercion) | lines 56-65, 200-206 |

**Step 6 is complete: all four routes now take both their session read and their role/permission
rule from `lib/authz.ts`.** Nothing in `app/api/**` reads the `kairali_user` cookie inline, and no
route hand-rolls a role comparison any more.

*Session read.* `test-db` and `debug-leads` use `getSessionUser`; `received-leads` and
`crr-calling/bookings` use `getSessionUserResult`, which returns
`{ state: 'valid' | 'missing' | 'invalid' }` over the same cookie name and verifier so a route whose
auth-failure bodies distinguish "no cookie" from "cookie did not verify" keeps both. It inspects no
payload field, so it enforces no schema (D9). All four were like-for-like substitutions and remain so.

*Role rule.* The predicate adopted is `hasAdminRole(user, mode)`, **not** `hasAnyRole`/`normalizeRole`.
`hasAdminRole` reproduces each route's own coercion byte for byte — the third column above — and
folds nothing, so ` admin ` is still rejected by `received-leads`, plain `Admin` still rejected by
`crr-calling/bookings`, and `super-admin` still rejected everywhere, exactly as before. The three
modes are the three spellings M9 recorded, now declared at four call sites in one module instead of
being reimplemented in four files. Unifying them is still D1; see M9.

*Permission rule.* `received-leads` and `crr-calling/bookings` now read permissions through
`getPermissions` / `hasPermission` / `hasAnyPermission`, whose `all` wildcard is exactly the
`includes("all")` test each already ran first.

**One intentional behavior change, recorded rather than absorbed:**
`app/api/crr-calling/bookings/route.ts` previously dereferenced `user.permissions` with no array
guard and called `.some(p => p.startsWith(…))` on its elements, so a verified session whose payload
lacked `permissions`, or carried a non-array or non-string-element value, threw into the handler's
catch and became a **500** (`Could not reach the booking source` on GET, `Could not save stage data`
on POST). Reading through `getPermissions` makes those payloads `[]`, so they now fall through to the
existing **403 `Access denied: Insufficient permissions`**. This is a deny either way — no session
gains access — but the status and body a malformed payload sees have changed. No well-formed session
is affected. Everything else about all four routes is unchanged: response bodies and statuses on
every other path, `crr-calling/bookings`'s body-validation order and its five 400s, the stage range,
the 20-second upstream budget, the `adminOverride` flag, the 502/504/500 branches, the two
diagnostics' SQL and success shapes, `received-leads`'s caches and queries, and every cache header.

The count of 4 gated routes is unchanged; **no previously ungated route gained a check in this pass.**

Every other route — including all 35 write routes — performs at most an identity check. The six
KTAHV write proxies added in earlier phases (`app/api/ktahv-bookings/actions/*`) verify the signed
session but apply **no** role or action check; the `viewSelf`/`viewAll`/`accountsVerify`/`foVerify`/
`checkOutVerify` distinctions exist only in the browser (`app/fms/bookings/team/page.tsx:459-536`).

`app/api/ktahv-bookings/route.ts:57-58` deliberately does *not* use `authorizeApiRequest`, with the
stated reason that the `MEASUREMENT_API_TOKEN` bearer path must not grant access to booking data.
That reasoning is sound and should be preserved by any Phase 8 change.

**Server-authoritative per-route enforcement across the other 105 routes is owner-deferred, not
done.** This is steps 10-11, and it is explicitly *not* closed by the completion pass. The reason is
that there is no small established mapping to apply: `components/route-guard.tsx` names a permission
for 44 page paths, not for API paths, and the relationship between a page's permission and the
several API routes it calls is not recorded anywhere in this repository. Guessing it would 403
legitimate users, and M4 shows 17 of those 30 permissions are granted by no role in the only
permission table checked in. What steps 10-11 need first is an owner-supplied route-by-route policy
mapping (which permission gates which handler, and what a role-less `MEASUREMENT_API_TOKEN` bearer
may do — D5). Until that exists, the honest count stays **4 of 109**.

### 5.4 `lib/api-auth.ts` — the bearer path

`authorizeApiRequest` (lines 16-33) returns true for **either** a matching non-expired
`MEASUREMENT_API_TOKEN` bearer **or** a valid session cookie. It is used at exactly two call sites:
`app/api/leads/route.ts:167` and `app/api/conversion/route.ts:6` — the same two routes exempted in
`middleware.ts:45-46`.

A bearer caller therefore has **no role at all**. In `app/api/leads/route.ts` the only differentiation
is a 500-row page cap for external callers (lines 173-182). Any Phase 8 rule that says "authorize by
role" must state what a role-less bearer caller is allowed to do, or the rule cannot be applied to
these two routes.

---

## 6. Known mismatches

Each is a repo-proven divergence, not a hypothesis.

**M1 — The cookie's permissions and the UI's permissions are different sets.** *Closed locally by
rollout step 5, for the login and reload paths, subject to the caveats below.*
Previously the cookie was signed from the upstream login payload while the UI overwrote
`permissions` from the sheet immediately afterward, and the overwrite never reached the cookie.
`app/api/auth/login/route.ts` now resolves the sheet through `lib/role-permissions.ts` before signing
and returns the signed object, and `hooks/use-auth.tsx:367` now takes that array as given
(`Array.isArray(...) ? ... : []`) instead of re-applying the client's own `rolePermissions` state.
The stale-cache residue previously recorded as M1(a) is therefore gone: no `cached_role_permissions`
copy can replace the cookie's array on the login path. What remains is not a divergence but two
open questions: (b) when the sheet is unavailable or has no usable row, cookie and UI both fall back
to the upstream payload's array — consistent, but D4 still governs whether that is the right
degraded behavior; and `refreshPermissions()` (§3), which is invoked explicitly and never during
login or reload, still writes a client-side array without updating the cookie.

**M2 — Fresh login and reload produce different UI permission sets.** *Closed locally by rollout
step 5.*
Login applied the sheet (Source C) while reload applied the cookie (Source A) via `/api/auth/me`
with no re-application. The cookie is now minted from the sheet and the login path no longer rewrites
what the server returned, so the two paths read the same array for the same account. The one way to
change the on-screen set without a new login is the explicit `refreshPermissions()` call noted under
M1.

Both closures are repository-side only, and only for the local paths named. The sheet's actual
per-email values, its owner, and its access setting are still unverified from this repo (§9), so
what a given account's permission array *becomes* under the new signing path cannot be asserted
here — only that one array now feeds the cookie, the login reply, and the screen. Nothing here makes
authorization server-authoritative: `hasPermission` is still client-only and the server still
enforces a role or permission on just 4 of 109 API routes (§5.3, M13). Steps 9-13 remain open.

**M3 — `fallbackRolePermissions` is keyed by role, but every lookup uses email.**
The map's keys are role names (`super_admin`, `admin`, `sales_agent`, …, lines 100-214). The
remaining three lookups all index it by email: lines 266 (`refreshPermissions`), 447 (`createUser`),
460 (`updateUser`). When the sheet fetch fails and the fallback is in force,
`rolePermissions[user.email]` is `undefined` for every user, so the fallback map grants nothing.
Rollout step 5 removed the fourth lookup — the login-path overwrite, which had a commented-out
role-keyed variant beside it showing it was once role-keyed — so the fallback map no longer has any
influence on the permission set a login or reload produces. The observable effect of a Source C
outage is therefore *not* "degrade to the fallback role table": login keeps whatever the login
payload carried (`app/api/auth/login/route.ts`), and the client's `rolePermissions` state affects
only the three call sites above.

**M4 — 17 of the 30 permissions `RouteGuard` requires are granted to no role in the fallback map.**
```
accounts_tracker.view            marketing_facebook_report.view
ai_voice_received.view           marketing_funnel.view
ai_voice_sent.view               marketing_google_report.view
ai_voice_summary.view            meetings.view
calls_report.view                mr-fms.view
cold_enquiry_reverification.view non_qualified.view
crr_fms.view                     sales_report.view
doctor.consultation.view         task_fms.view
google_adword_report.view
```
These exist only in the sheet's vocabulary. The fallback map has 42 distinct permission strings and
none of these 17 are among them. Six of the 19 distinct `hasPermission("…")` literals used in page
and component code are likewise ungranted by the fallback: `ai_voice_received.view`,
`ai_voice_sent.view`, `booking.create`, `doctor.consultation.view`, `leads.create`, `meetings.view`.

**M5 — `actionPermissionsByPageByRole` names roles that are not in the `UserRole` union.**
`fo_manager` (line 81) and `superVisor` (line 82) appear as grant keys but are absent from the
`UserRole` type (lines 6-20). `villa_raag_manager` appears in both. Whatever populates
`user.action[page]` upstream is using a vocabulary the type system does not describe.

**M6 — Two `RouteGuard` keys carried query strings and could never match.** *Closed locally
(step 8).*
They were `'/voicecall/data?tab=received'` and `'/voicecall/data?tab=sent'`; `usePathname()` never
includes a query string, so `pagePermissions[pathname]` missed and `ai_voice_received.view` /
`ai_voice_sent.view` were unenforced by the guard. The keys are now the pathnames the two tabs
became, `'/voicecall/data/received'` and `'/voicecall/data/sent'`. The permissions are unchanged and
the mapping is evidenced, not invented: each page already requires exactly the permission its old key
named (`app/voicecall/data/received/page.tsx:1696`, `app/voicecall/data/sent/page.tsx:466`). Because
both pages self-check, the practical delta is that a user without the permission is now redirected to
`/access-denied` instead of reaching the page and being refused in place. `/voicecall/data` itself
deliberately stays unmapped — giving it one would be new policy (D7).

**M7 — One `RouteGuard` key had no leading slash.** *Closed locally (step 8).*
`'fms/enquiry-reverification'` never matched, so `cold_enquiry_reverification.view` was silently
never applied. The key is now `'/fms/enquiry-reverification'`; the permission is unchanged.

Unlike M6, this one is a genuinely new gate: `app/fms/enquiry-reverification/page.tsx` reads
`useAuth()` for `user`/`isLoading` but calls `hasPermission` nowhere, so the page had no access check
of any kind. Anyone reaching it today who lacks `cold_enquiry_reverification.view` will now be
redirected. That permission is one of the 17 in M4 that no role in `fallbackRolePermissions` grants,
so if Source C is unavailable *nobody* passes it — which is D3/D4, not something this repair
introduced, but it is the sharpest edge in this pass and the first thing to check in the browser.

**M8 — One of three direct `localStorage` user readers remains.** *Two closed locally (step 12).*
The Phase 1 bootstrap change made `localStorage.kairali_user` a *write-only compatibility cache*
(`hooks/use-auth.tsx:325-328`). The two authorization-relevant readers now read the verified session
from `useAuth()` instead:

| File | Status | What it derives |
| --- | --- | --- |
| `app/fms/bookings/team/page.tsx` | **Closed** — `getUserWorkType()` now returns `user?.action?.ktahvPage` from the `useAuth()` context the component already destructures at line 399 for `hasActionPermission` | KTAHV work type, consumed at line 2171 |
| `components/content-protection-provider.tsx` | **Closed** — now reads `user?.role` from `useAuth()`; it is mounted inside `AuthProvider` in `app/layout.tsx:45-49` | `super_admin` check driving copy/selection suppression |
| `components/Booking Form/BookingFormSteps2.tsx:1049-1050` | **Open** | display name for `paymentCollectionBy` (reads `sessionStorage` first, then `localStorage`) |

Both closures are behavior-preserving for an untampered browser: `AuthProvider` writes that cache
*from* the verified session and defaults `action` to `{}`, so the values read are identical. What
changes is that a devtools edit to the key no longer decides which bookings the KTAHV team page shows
or whether copy protection applies. `content-protection-provider` additionally shed a `useState`/
`useEffect` pair whose loading window is now the auth bootstrap's own.

The remaining reader is left deliberately: it derives a *display name* for a form field, not an
authorization decision, and it prefers `sessionStorage` — a different key with a different writer —
so switching it is a behavior question about that form, not a Phase 8 hardening item.

Neither closure makes anything server-authoritative. The KTAHV write proxies still apply no work-type
check (M13, D8, step 13); this only stops the *client* from trusting a mutable local record.

**M9 — Server-side role checks are string-normalized inconsistently.** *Narrowed and made explicit,
**not** closed. The three spellings are now three declared modes of one shared predicate instead of
four hand-rolled copies; unifying them is still D1.*

The three spellings were: `String(user?.role ?? '').trim().toLowerCase()` (`test-db`,
`debug-leads`), `String(user?.role || "").toLowerCase()` with no trim (`received-leads`), and a raw
`["super_admin","admin"].includes(user.role)` (`crr-calling/bookings`) alongside an unguarded
`user.permissions` dereference.

All four now call `hasAdminRole(user, mode)` from `lib/authz.ts` with `mode` spelled at the call
site — `'trimmed-lower'`, `'trimmed-lower'`, `'lower'`, `'raw'` respectively. That is deliberately
**not** a unification. It removes the duplication (one implementation, four callers) and makes the
divergence visible in one type instead of hidden across four files, while preserving each route's
accepts and rejects exactly. The same account can still be an admin on `test-db` and not on
`crr-calling/bookings`, precisely as before.

Why not unify: the shared `normalizeRole` folds, and against every one of the four live rules it is
simultaneously **wider** — `super admin`, `super-admin`, and `_admin_` all land on an admin role
there and are rejected by all four routes, and `crr-calling/bookings` additionally rejects plain
`Admin` — and **narrower**, returning `''` for a non-string `role` where `String(user?.role ?? '')`
coerces a pathological `role: ['admin']` to `'admin'` and grants it. Either direction changes who
reaches a DB diagnostic or a booking write, and §9 records that the real `role` values production
accounts carry are unknowable from this repository, so the size of the set either direction moves
cannot be measured here. The owner accepted a behavior-changing pass; they did not pick a role
vocabulary, and this document will not pick one for them. `normalizeRole`, `hasRole`, and
`hasAnyRole` therefore remain imported by nothing, kept as the shape D1 would adopt.

M9 closes when D1 answers. The answer lands in one place: `RoleMatchMode` in `lib/authz.ts`.

The session read that step 6 landed first is unaffected by any of this. `getSessionUser` reads the
same `kairali_user` cookie and defers to the same `verifySessionCookieValue`, with the same null on a
missing, empty, tampered, forged, or expired value; `getSessionUserResult` is that same read
reporting `missing` where a route tested `!userCookie` and `invalid` where it tested `!user`, so the
two routes with distinct auth-failure bodies keep both. Neither reads a field of the payload, so
neither is the stricter schema D9 governs.

`hasPermission`/`hasAnyPermission` honor the `all` wildcard, matching what the client and both
permission-checking routes already do, and permission strings are compared verbatim — only roles are
ever normalized, because permissions are matched exactly today
(`includes("ai_voice_received.view")`, `startsWith("crr_fms.stage")`) and folding them would widen
every existing rule.

**M10 — Six page routes bypassed the middleware identity check entirely.** *Closed locally
(step 7).*
`/MR-FMS`, `/crr-fms`, `/deal-assistant`, `/ksereve-billing-auditer`, `/meet`, and `/riya-sharma`
matched no `protectedRoutes` prefix. All six are now in the list, so every page route outside
`publicRoutes` requires a verified session. Identity only — `middleware.ts` still reads no role and
no permission, by design (§5.2). The behavior change and its D6 caveat are recorded in §5.2.

**M11 — Accounts Tracker hard-codes its own role.**
`app/accounts-tracker/page.tsx:4074` sets `const role: UserRole = 'admin'`, feeding
`canEditPaymentVerify` and `canExport` (lines 59-60), which are typed against a local four-value
`UserRole` (line 56) unrelated to the auth `UserRole` union. Every visitor to that page is treated
as an admin by its own gating. *Recorded per Phase 4; not fixed in this task.*

**M12 — `getAllUsers()` always returns an empty array on a fresh load.**
The `users` state (`hooks/use-auth.tsx:220`) is only ever written by the in-memory `createUser`,
`updateUser`, and `deleteUser` (lines 447, 452, 467). There is no fetch that populates it and no
`app/api/users` route exists. `app/users/page.tsx:98` seeds its table from `getAllUsers()`, and
`app/leads/page.tsx:106` passes it into the leads table for assigned-user lookup. Any Phase 8 design
that expects to enumerate users, or to resolve a user list server-side, is starting from nothing.

**M13 — There is no server-side action-permission concept at all.**
`hasActionPermission` and `actionPermissionsByPageByRole` have no server counterpart. The KTAHV
stage semantics (`accountsVerify`, `foVerify`, `checkOutVerify`, `approvalSelf` vs `approvalAll`)
exist only in the browser. The corresponding server proxies accept any signed session.

---

## 7. Owner decisions required before any Phase 8 code change

These are blocking. Phase 8 cannot pick a rule without them, and each has a real consequence.

**D1 — Is server-authoritative authorization keyed on the signed `role` or the signed `permissions`?**
Restates open question 4 in `docs/AUDIT_WORKPACK_CROSS_REFERENCE.md:309`, now with M1/M2 as
evidence that the two are genuinely different sets. Choosing `permissions` means accepting whatever
the login payload carried; choosing `role` means the sheet's finer-grained grants stop being
enforceable server-side. **Still open after rollout step 2.** `lib/authz.ts` answers both kinds of
question — `hasRole`/`hasAnyRole` and `hasPermission`/`hasAnyPermission` — precisely so that adding
it does not pre-empt this decision; which predicate a route should call is what D1 settles.
Rollout step 6 surfaced a second, narrower question that D1 must answer alongside the first: **is
`normalizeRole`'s folding the authoritative role vocabulary?** Adopting it would both admit
separator/case spellings the routes reject today and reject a non-string `role` they accept (M9), by
an amount §9 records as unmeasurable from this repository. Step 6 completed *around* that question
rather than through it, by adopting `hasAdminRole`, which reproduces each route's existing spelling
exactly. **D1 is therefore still open and is now the only thing standing between M9 and closure**;
when it answers, the answer is a one-line change to `RoleMatchMode` in `lib/authz.ts`.

**D2 — Does the permissions sheet become server-side, and does it become part of the cookie?**
Concretely: build `app/api/auth/permissions/route.ts` (already anticipated at
`docs/AUDIT_WORKPACK_CROSS_REFERENCE.md:273`) and have the login route resolve permissions *before*
signing, so the cookie and the UI hold one set? That closes M1 and M2 together, at the cost of a
second upstream call inside the login deadline (currently one 15-second budget, `login/route.ts`).
*Implemented locally* by rollout steps 4 and 5: the sheet is server-side, its array is signed into
the cookie, and the client now trusts the signed array instead of re-applying its own, so M1 and M2
are closed for the login and reload paths. The anticipated cost is real — a successful login makes
two sequential upstream calls, each with its own 15-second budget. The owner still has to ratify
that trade and answer D4 for the failure path, which currently keeps the upstream payload's array.

**D3 — What is the authoritative permission vocabulary?** *Open, and now load-bearing.*
M4 shows 17 route-guard permissions and 6 in-code permissions that the fallback map does not know.
Either the fallback map is extended to cover them, or it is accepted as a deliberately minimal
degraded mode, or it is removed. This cannot be inferred from the repository — the sheet's real
contents are not checked in.

Step 8 raised the stakes: `cold_enquiry_reverification.view`, `ai_voice_received.view`, and
`ai_voice_sent.view` are all among M4's 17, and all three are now actually enforced by the guard. If
Source C is unavailable, `fallbackRolePermissions` grants none of them to anyone (M3), so those three
pages become unreachable for every user rather than merely ungated. That is D3 and D4 meeting, and it
is the specific failure mode to exercise in the browser.

**D4 — What should happen when the permissions source is unavailable?**
M3 shows the current answer is accidental. Fail closed (no permissions, user sees nothing), fail to
the last known good set, or fail to a role-keyed fallback that actually works?

**D5 — What is a `MEASUREMENT_API_TOKEN` bearer caller authorized to do?**
`/api/leads` and `/api/conversion` have no role for a bearer caller. A blanket "authorize by role"
rule breaks both unless the bearer is assigned an explicit synthetic role or an explicit exemption.

**D6 — Should the six unguarded pages (M10) be added to `protectedRoutes`?** *Answered by the owner
and implemented (step 7).* All six are in the list. The behavior change stands as described: an
anonymous request to `/deal-assistant`, `/meet`, or the other four now redirects to `/`. The
repository still does not record how those pages are used (§9), so browser testing is where a
regression would surface.

**D7 — Should the 15 still-unguarded page routes (§5.1) get `pagePermissions` entries, and which?**
*Open; step 9 deferred on it.* Some are dynamic segments (`/partners/[id]`, `/fms/complaints/[id]`)
that the current exact-match lookup cannot express at all — that needs a pattern-matching guard, not
just more keys. The three malformed keys repaired in step 8 were **repairs of existing intent**, not
answers to this question, and no new page was given a permission it did not already name.

**D8 — Does `user.action` become server-authoritative (M13)?**
Enforcing `viewSelf`/`viewAll` and the stage-verify actions on the KTAHV proxies is the largest
single behavior risk in Phase 8: it would start rejecting writes that currently succeed. It also
requires knowing that `action` in the signed payload is trustworthy and correctly populated
upstream, which cannot be confirmed from this repository.

**D9 — Is a stricter session payload schema acceptable?**
`verifySessionCookieValue` returns `any`. Validating `role: string`, `permissions: string[]`, and
`action: Record<string,string>` at verification time would invalidate any live session whose payload
does not match — i.e. it can log people out at deploy. That is an owner call. **Still open after
rollout step 2, by design.** `lib/authz.ts` deliberately enforces no schema and does not wrap
`verifySessionCookieValue` with one: it reads the payload loosely and answers "no" on an unusable
`role` or `permissions` rather than rejecting the session. A session that verifies today still
verifies, and no live login is invalidated by step 2. `getSessionUserResult`, added during step 6,
holds the same line: its `invalid` state is exactly the falsy return the adopting route already
tested for, and it reads no field of a payload that verifies, so it distinguishes *how the cookie
read failed* without making any new payload fail.

---

## 8. Safe rollout order

Ordered so that each step is independently reviewable. Steps 1–3 are strictly additive; 5 was the
first behavior-changing step. Steps 7 and 8 *can* lock a user out of a screen they can currently
reach, which is why they waited for the owner's acceptance of a behavior-changing pass.

Landed locally: **2, 4, 5, 6, 7, 8, and part of 12.** Not attempted, and explicitly not claimed as
done: **3, 9, 10, 11, 13, and the rest of 12.**

| # | Step | Behavior risk | Blocked on |
| --- | --- | --- | --- |
| 1 | This inventory | None (docs only) | — |
| 2 | **Completed locally:** `lib/authz.ts` reads the signed session (`getSessionUser` / `getSessionUserResult`) and answers `getRole` / `getPermissions` / `hasRole` / `hasAnyRole` / `hasPermission` / `hasAnyPermission` / `hasAdminRole`, with the `all` wildcard preserved. Step 6 has since adopted the session reads, `hasAdminRole`, and the permission predicates in all four gated routes. `normalizeRole`, `hasRole`, and `hasAnyRole` are imported by nothing — they are the shape D1 would adopt, held until it answers. | None — the adopted predicates each reproduce an existing rule exactly | D1, for the unadopted three only |
| 3 | Add **observation-only** logging or a report route recording what a role/permission check *would* have decided on the four already-gated routes plus the highest-value ungated writes. Produces the real-traffic evidence D3/D8 need. | None if it only records | D1 |
| 4 | **Completed locally:** build `app/api/auth/permissions/route.ts` as a same-origin proxy for Source C, and switch `loadRolePermissions()` to call it. Removes the Apps Script URL from the browser bundle. Permission *values* are unchanged. | Low — same data, different transport | D2 |
| 5 | **Completed locally, both halves.** Server half: extract the Source C exchange into `lib/role-permissions.ts` and have `app/api/auth/login/route.ts` resolve the table before `createSessionCookieValue`, signing and returning one object. Client half: `hooks/use-auth.tsx` stops overwriting `data.user.permissions` from its own `rolePermissions` state and takes the server's array (`[]` if absent or not an array). **Closes M1 and M2** for the login and reload paths; `loadRolePermissions()`, the `cached_role_permissions` cache, and `/api/auth/permissions` are retained for `refreshPermissions`/`createUser`/`updateUser`. | Medium — a user whose sheet and login-payload permissions differ will see their effective set change; sheet failures keep the upstream array, so no login can fail on this path | D1, D2, D4 |
| 6 | **Completed locally.** Session read: all four gated routes take `getSessionUser` / `getSessionUserResult`, so none reads the `kairali_user` cookie inline. Role and permission rules: all four take `hasAdminRole(user, mode)` plus `getPermissions` / `hasPermission` / `hasAnyPermission`, with `mode` naming each route's own coercion (`'trimmed-lower'` ×2, `'lower'`, `'raw'`). The folding `normalizeRole` was **not** adopted — it is wider and narrower than every live rule (M9) and ratifying it is D1 — so this step removed the duplication without moving any role decision. **M9 is narrowed, not closed.** | None on who is admitted — every accept and reject is preserved. One deliberate status change: a malformed `permissions` payload on `crr-calling/bookings` now takes the existing 403 instead of throwing into a 500 (§5.3) | Step 2 (done). D1 remains, for M9's closure only |
| 7 | **Completed locally.** `middleware.ts` `protectedRoutes` extended to the six uncovered pages (M10). Identity only — still no role check in middleware. | Medium, as landed — anonymous access to those six ends | D6 (answered by the owner) |
| 8 | **Completed locally.** The three malformed `RouteGuard` keys are repaired (M6, M7), so each now enforces the permission it always named. | Medium, as landed — users lacking those three permissions lose access to pages they can reach today, and all three permissions are among M4's 17 that no fallback role grants (see D3) | D3 remains open; the owner accepted the change ahead of it |
| 9 | Add `pagePermissions` coverage for the 15 still-unguarded routes, including a pattern form for dynamic segments (§5.1). **Owner-deferred.** | Medium–high | D7 |
| 10 | Add server-side permission checks to read routes, matching the permission each route's page already requires client-side. **Owner-deferred: needs a route-by-route policy mapping this repository does not contain** (§5.3). Not attempted in the completion pass. | Medium — mismatches surface as new 403s | D1, D3, D5, step 5 |
| 11 | Add server-side permission checks to the 35 write routes. **Owner-deferred, same reason.** | High | Same, plus step 10's evidence |
| 12 | **Partly completed locally.** The two authorization-relevant `localStorage.kairali_user` readers now read the verified session from `useAuth()` — `getUserWorkType()` in the KTAHV team page and `components/content-protection-provider.tsx`. The third (`BookingFormSteps2`, a display name that prefers `sessionStorage`) is left as a form question, not a Phase 8 item (M8). | Low, as landed — identical values for an untampered browser; a tampered local record simply stops being consulted | Step 5 (done) |
| 13 | Make `user.action` server-authoritative on the KTAHV proxies (M13, D8). **Highest risk in Phase 8; owner-deferred** — do last, after step 3 has produced traffic evidence. | High | D8, step 3 |
| — | Accounts Tracker hard-coded role (M11) and Access Denied "Go Home" (Phase 4) | — | Sequenced by the owner; both are Phase 4 items, not Phase 8 gates |

Two ordering rules that hold throughout:

- **Never add a server check before the corresponding permission is provably present in the signed
  cookie.** Steps 10–13 all depend on step 5 for this reason; doing them first would 403 legitimate
  users whose cookie carries the pre-sheet permission set.
- **Never touch the deferred surfaces in §1** at any step, including step 11 — the 35 write routes
  counted there exclude nothing under `/api/meetings/*`, so that subtree must be filtered out
  explicitly when step 11 is scoped.

---

## 9. What this document does not establish

- The actual contents, owner, access setting, or response schema of the `getRolePermissions` Apps
  Script deployment. Only the client's call to it is visible here.
- The real `role`, `permissions`, and `action` values any production account carries. Everything
  about the login payload is inferred from how the code consumes it.
- Whether the six pages in M10 and the 15 in §5.1 are reachable in production, linked from
  navigation, or dead. `components/dashboard-layout.tsx` gates nav items at 11 `hasPermission` sites
  (lines 234-420), but nav visibility is not access control and was not reconciled against the route
  list here.
- Anything about the mobile app, `/api/calendar/mobile` callers, or the Meetings CORS policy — out
  of scope by §1 and unverifiable from this repository.
- Whether any of the mismatches in §6 have been exploited. This is a static inventory; no logs,
  traffic, or external systems were consulted.

---

## 10. Reproducing the counts

All figures in §5 and §6 come from the working tree at `HEAD = 5110e96` plus the inherited
uncommitted changes, and can be re-derived with:

```bash
find app -name page.tsx | wc -l                                    # 61 page routes
find app/api -name route.ts | wc -l                                # 109 API route files
grep -rl "export async function \(POST\|PUT\|PATCH\|DELETE\)" \
  app/api --include=route.ts | wc -l                               # 35 write routes
grep -rl "@/lib/authz" app/api --include=route.ts | wc -l           # 4 gated routes
grep -rn "hasPermission(" app components hooks | wc -l             # 38 client call sites
grep -rn "hasActionPermission(" app components hooks | wc -l       # 4 client call sites
grep -rl "localStorage.getItem(.kairali_user.)" app components hooks   # 1 direct reader
grep -cE "^  '/" components/route-guard.tsx                        # 44 route-guard keys
```

Since the completion pass, all four gated routes are exactly the four importers of `lib/authz.ts`,
which is why the gated-route count is now grepped that way rather than by matching `.permissions` or
`user?.role` — no route spells its own role or permission read any more.

The route-guard key counts (44 total / 44 effective / 15 unmapped pages) and the permission
vocabulary comparisons in M4 were derived by parsing the `pagePermissions` object in
`components/route-guard.tsx` and the `fallbackRolePermissions` object in `hooks/use-auth.tsx` and
differencing them against the `page.tsx` route list. Before the pass the effective/unmapped figures
were 41 and 18; the three repaired keys account for the whole difference.
