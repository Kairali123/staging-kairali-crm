# Kairali CRM — Audit Workpack Cross-Reference

Date: 2026-07-30  
Workpack source: attached `pasted-text.txt`  
Code snapshot: `/Users/kritikakairali/Downloads/KairaliCRM_workbook`

This document ties the supplied audit workpack to the current workspace. It does not authorize or contain application fixes. Status meanings:

- **Confirmed** — the current code still exhibits the finding.
- **Partial** — part of the finding is already implemented or the current behavior differs materially.
- **Resolved in snapshot** — the cited defect is no longer present at the audited site.
- **Stale baseline** — the direction remains useful, but the supplied count/location does not match this snapshot.
- **External/manual** — cannot be proven from this repository alone.
- **Future scope** — strategic work, not a current defect implementation.

## 1. Baseline reconciliation

| Measure | Workpack | Current verified snapshot |
|---|---:|---:|
| Page routes | 60 headline | 61 `page.tsx` routes |
| API routes | 95 | 101 under `app/api`, plus `/villa-bookings` |
| API write-route files | 24 | 29 including auth; 34 distinct POST/PUT/PATCH/DELETE methods |
| TypeScript errors | 623 in 80 files | 595 in 78 files |
| `fetch()` call sites | ~207 | 226 |
| Distinct checked-in GAS IDs | 58 | 53 by current source regex |
| Error boundaries | 0 | 0 |
| Tests | 0 | 0 |
| CI workflows | none | none |
| ESLint configuration | absent | absent |
| `console.log` in `app` + `components` | 137 | 136 |
| Largest five files | 13,633 / 7,708 / 5,997 / 4,120 / 4,113 | 14,134 / 7,708 / 5,997 / 4,142 / 4,113 |

Dependencies were installed from the existing lockfile. `package.json` and `package-lock.json` hashes did not change. `npm run build` succeeds when Google Fonts are reachable. It skips type validation and warns about the deprecated/unrecognized `config` export in `app/api/pipeline/route.ts`.

The current folder is not a standalone Git checkout. `git rev-parse --show-toplevel` resolves to `/Users/kritikakairali/Downloads` on branch `master`, and this entire application directory is untracked there. A compliant `fix/phase1-security` branch cannot safely be created in this workspace without first obtaining the correct repository checkout.

## 2. Phase 1 — Security emergency

### 1.1 Hard-coded database credentials — Confirmed

Current files:

- `lib/db.ts` embeds host, port, database, username, and password.
- `check_29.js` embeds a second credential set.
- `scratch_check.js` embeds the same second credential set.

The source-level fix maps exactly to these files plus a non-secret environment-variable example. Password rotation, repository privacy, Vercel configuration, database firewalling/static egress, and history exposure are external/manual. The report intentionally does not reproduce credential values.

### 1.2 API routes without authentication — Confirmed, supplied count stale

`middleware.ts` excludes `/api`. Four business handlers visibly enforce an identity boundary:

- `/api/leads` and `/api/conversion` call `authorizeApiRequest`.
- `/api/crr-calling/bookings` verifies the signed CRM cookie.
- `/api/calendar/meetings` uses NextAuth.

Some Google/Zoom handlers read bearer/access-token cookies, but this is provider authorization rather than a consistent CRM session boundary. The remaining current route population is larger than the workpack snapshot. There are 29 route files with write methods, including destructive meeting/task/pipeline operations and partner/voice/FMS writes.

Files at the common boundary: `middleware.ts`, `lib/session.ts`, and `lib/api-auth.ts`. Exact public exemptions need to cover CRM login/logout and the NextAuth/Zoom OAuth callback mechanics. Existing bearer-authenticated measurement callers must remain able to reach `/api/leads` and `/api/conversion`.

### 1.3 Open server-side relay — Confirmed

`app/api/audio-proxy/route.ts` accepts any caller-provided URL, fetches it without an allowlist/timeout/try-catch, buffers the entire response, and returns permissive CORS. The safer `app/api/recording/route.ts` already demonstrates hostname allowlisting and Range streaming.

`app/api/test-db/route.ts` exposes database connectivity and raw error messages. `app/api/debug-leads/route.ts` exposes lead-source diagnostics. Both are currently outside an API-wide session boundary.

The host intended by the workpack is interpreted as the exact hostname `squadiq-call-recs.s3.amazonaws.com`; the Google redirect wrapper present in the pasted text is not itself the recording host.

### 1.4 Browser-exposed unauthenticated GAS writes — Confirmed

`app/fms/bookings/team/page.tsx` directly posts cancellation, approval, account verification, front-office verification, checkout, and payment collection to a fixed Apps Script deployment. The request shapes are load-bearing and must remain unchanged.

Repo-side scope is the team page plus a new authenticated same-origin proxy route that preserves the current action names and payloads while attaching `GAS_SHARED_SECRET`. Script-side secret validation and staged deployment remain manual. Until each script is updated, the repo proxy requires an explicitly controlled compatibility path; silently changing every call at once would break production writes.

### 1.5 Client-side permission escalation — Partial

The workpack predates part of the current session work:

- `app/api/auth/login/route.ts` already signs the complete returned user object, including role, into an HttpOnly cookie.
- `middleware.ts` already verifies the HMAC and expiry rather than checking cookie existence only.

The remaining hole is real:

- `hooks/use-auth.tsx` restores the UI user and permissions from mutable localStorage.
- `components/route-guard.tsx` enforces exact-path permissions only in the browser.
- `middleware.ts` validates identity but does not authorize by role/permission.
- Most APIs validate neither identity nor action authorization.

The current signed cookie may contain a permissions array returned at login, while the client later replaces UI permissions from a separate permissions-sheet request. Those two sources can diverge. A server-authoritative Phase 1 rule must therefore specify whether coarse authorization uses the signed role or signed permissions; the workpack reserves the full RBAC matrix for Phase 8.

### 1.6 Login credentials in query strings — Confirmed, with current-flow nuance

`app/api/auth/login/route.ts` receives a JSON POST from the browser but then places email, password, and company in a GET query string sent to Apps Script. It has no rate limit, lockout, or timeout.

The same Apps Script URL remains in `hooks/use-auth.tsx`, but its current browser use is role-permission loading, not the login request itself. Removing it from the bundle therefore requires a new same-origin permissions endpoint as well as the login hardening.

Moving the GAS login call to a POST body requires the manual Apps Script change. The repo must retain a time-bounded fallback until that script-side rollout is confirmed. A Vercel-safe rate-limit store is an open design choice; process-memory rate limiting is not reliable across serverless instances.

## 3. Phase 2 — Stop the crashes

### 2.1 Error boundaries — Confirmed

No `app/error.tsx`, `app/global-error.tsx`, module `error.tsx`, or custom `app/not-found.tsx` exists. Next generates its default `/_not-found` route. The workpack’s requested root and module boundary locations remain applicable.

### 2.2 Nullability sites — Mixed; the “24 confirmed” list is stale

- **Confirmed:** `app/leads/page.tsx` and its identical `app/leads/duplicates/page.tsx` dereference `selectedLead.remarks.length` and `.map` without a fallback.
- **Confirmed:** `app/meetings/page.tsx` dereferences `nPopup.m.ai`, `m.kd`, `m.pa`, and participant `name[0]` without local fallbacks in the cited notes modal. Another `name[0]` occurs in the participant UI.
- **Resolved at cited block:** `app/fms/bookings/villa-raag/page.tsx` now starts the derived-payment expression with optional chaining and gates payment modal bodies on `selectedBookingForPayment`.
- **Resolved at cited render:** `app/fms/bookings/team/page.tsx` gates the payment-detail body on `selectedBookingForPayment`.
- **Not currently nullable:** `app/fms/pending-tasks/page.tsx` computes `chartData.compChart`, `severityChart`, `leaderboards.doers`, and `leaderboards.pcs` as arrays in local `useMemo` blocks before mapping them.
- **Deletion candidate remains:** `app/leads/duplicates_old` and `app/leads/duplicates/duplicates` are duplicate live routes, but their cited line numbers no longer map to the same nullability expression.

The implementation checklist must be regenerated from current AST/source rather than applying all 24 old line references blindly.

### 2.3 False payment success — Resolved in snapshot

The current `app/fms/bookings/team/page.tsx` has a shared `validateResponse` helper that:

- throws on opaque or non-OK responses;
- parses JSON/text safely;
- throws when upstream status is ERROR/FAIL or `success === false`.

`handlePaymentSubmit` calls this helper before refetch and before `submitWithGuard` can show success/reset the form. The same helper is used by cancellation, approval, accounts, front-office, and checkout writes. This item should be regression-tested but not reimplemented.

### 2.4 Poisoned module-level cache — Confirmed

`hooks/use-lead-target-report.tsx` caches `fetch(API_URL).then(res => res.json())` without `res.ok` validation and never clears `cachedPromise` after rejection.

### 2.5 Silent-error pages — Confirmed in principle

The Phase 0 map found console-only errors, empty/zero fallbacks, and mock fallback behavior across the named pages/hooks. Exact error UX must be checked per screen when Phase 2 begins. `app/fms/pending-tasks/page.tsx` at least shows an “offline/local backup” banner, so it is not wholly silent. `hooks/use-fms-bookings.tsx` exposes an error that the team page currently destructures but does not render.

### 2.6 Type-error ratchet — Confirmed, baseline updated

`next.config.mjs` still sets `ignoreBuildErrors: true`. The verified current baseline is **595 errors in 78 files**, recorded in `ts-error-baseline.txt`; it replaces the workpack’s 623/80 expectation for this snapshot.

## 4. Phase 3 — Speed

### 3.1 Shared `fetchJson` — Confirmed

There are 226 current `fetch()` call sites. Meeting utilities have timeout helpers, but there is no shared result-typed JSON fetch helper used across the application. Rollout order remains a behavior-preserving implementation decision.

### 3.2 GAS timeouts/retries — Confirmed

Of the 14 named GAS proxy routes, only `app/api/adword-reports/route.ts` currently has timeout handling. Login, onboarding parts, partners, CRR, three reports, sales-calling, voice-proxy, capture-partner, and rejected-partners do not.

`hooks/use-fms-bookings.tsx` still performs repeated attempts; the team page still does not render its exposed error. The artificial minimum-spinner behavior remains present in the large team page and requires current-line revalidation before edit.

### 3.3 Whole-table downloads — Confirmed, high coupling

The lead provider/assignment paths still request extremely high limits, and assignment analytics depend on the whole dataset. The workpack’s required ordering—server aggregation before table pagination—matches the Phase 0 data flow. Multiple SQL routes still have unbounded or very high-limit reads, and partner onboarding still fetches full part sheets before selecting individual records.

### 3.4 Polling — Confirmed

The received-voice page has frequent full-data refresh logic; the notification context fetches sent/received/booking datasets globally; meeting calendar behavior exists in both the meeting page and `CalendarTab`. Exact intervals should be captured in performance tests before changing user-visible freshness.

### 3.5 Bundle weight — Mostly confirmed

- `xlsx` is installed and has no source import.
- Three pages use Chart.js while Recharts is already widespread.
- jsPDF/html2canvas and ffmpeg are loaded from heavy paths; ffmpeg core is fetched from unpkg at runtime.
- `images.unoptimized` remains enabled.
- The named large public images exist.
- Accounts Tracker contains both truncated and full alert-list computations/renders.

Dependency versions and actual bundle deltas must be measured in the Phase 3 PRs.

### 3.6 Monolith decomposition — Confirmed, counts updated

Current line counts:

- `app/fms/bookings/team/page.tsx`: 14,134
- `app/leads/assign/page.tsx`: 7,708
- `app/accounts-tracker/page.tsx`: 5,997
- `app/crr-fms/page.tsx`: 4,142
- `app/meetings/page.tsx`: 4,113

The “extract only what a scoped change touches” rule is compatible with the no-rewrite operating rule.

### 3.7 Request waterfalls — Confirmed

Lead KPI requests, partner part-sheet requests, and Accounts Tracker mount requests are independent in the current flow and are candidates for parallel execution. Semantics and shared loading/error state must remain unchanged.

### 3.8 Dead-weight deletion — Confirmed

Every named artifact is present:

`scratch/`, `temp/`, `app/fms/pending-tasks/page.tsx.bak`, `components/WastedLeadsDetailModal (1).tsx`, `hooks/Use-call-history_old.tsx`, `check_29.js`, `scratch_check.js`, `show_indexes.js`, `output.json`, root `index.html`, `.DS_Store` files, `styles/globals.css`, and duplicate `app/villa-bookings/route.ts`.

The lead-page copies are also present. Deletion must occur on its own Phase 3.8 branch, except the two credential-bearing scratch scripts which Phase 1.1 explicitly moves into the security PR.

## 5. Phase 4 — Experience quick wins

All eight themes are confirmed against the current snapshot:

1. `components/content-protection-provider.tsx` and `hooks/use-copy-protection.tsx` suppress normal clipboard/selection behavior.
2. Team and Villa booking tables default to five rows; Accounts Tracker hard-codes ten rows.
3. Current live source contains 40 `alert()` calls and three `confirm()` calls, more than the workpack headline.
4. Dashboard navigation contains the eight dead Employee/Sales destinations, lacks a clear complaint entry, and is a long flat list.
5. Header search only filters navigation labels and is hidden below the medium breakpoint; `/api/leads/search` exists.
6. Dashboard `LiveBadge`, complaint KPIs, marketing mock APIs, doctor mock APIs, and billing-auditor mock rows can appear production-real without a sample label.
7. Notification sounds are remote and enabled without a user preference; badge semantics are raw-row oriented.
8. Access Denied links “Go Home” to `/`; malformed route-guard keys remain; Accounts Tracker hard-codes `role = 'admin'`.

These are user-visible changes. Under the workpack’s ordering, Phase 1 security now overrides the earlier “UI/UX first” default. Phase 4 still requires before/after screenshots and the screen-level definition of done.

## 6. Phase 5 — Engineering machinery

Confirmed current state:

- ESLint dependency/config is absent and `npm run lint` cannot work.
- `.github/workflows` is absent.
- No test files exist.
- Sentry is absent.
- Version strings using `latest` remain.
- README is one sentence; CONTRIBUTING and ECOSYSTEM are absent.
- 136 `console.log` calls exist in `app` and `components`.

Branch protection, review requirements, Vercel preview/staging, and Sentry account setup are external/manual.

## 7. Phase 6 — Ecosystem expansion

- Current source extraction finds 53 distinct Apps Script deployment IDs, not 58. The difference may be snapshot drift, URL formatting, or deployments only present outside the checked-in source.
- Other GitHub repositories, ownership, deploy targets, secrets, and issues cannot be enumerated from this non-Git checkout without authenticated GitHub access and explicit Phase 6 execution.
- External portal audit and MySQL backup/grant/firewall review remain external/manual.
- `components/Booking Form/BookingFormBase.tsx` contains the large inline country/state dataset described by the workpack.

The first Phase 6 deliverable remains root `ECOSYSTEM.md`; it should not be created as a claim of completion before the external inventory is actually run.

## 8. Phase 7 — Re-architecture

This is future scope. The prescribed order—Leads, FMS/Bookings, Accounts, Voice/Calls, then Marketing—and the “complete one touched module” rule are consistent with the current dependency map. It must not begin before stabilization phases are merged and separately approved.

## 9. Owner-level gaps

Backups/restores, uptime monitoring, offboarding, 2FA, external account ownership, DPDP/privacy review, bus factor, and Friday operational metrics cannot be established from this repository. They remain explicit manual owner actions rather than code findings.

## 10. Phase 1 proposed implementation scope — awaiting confirmation

### Current behavior

The application currently connects to MySQL using credentials embedded in three files; protects only selected UI routes and a handful of APIs; exposes an unrestricted audio relay and diagnostics; sends critical KTAHV writes directly from the browser to Apps Script; trusts localStorage for visible permissions; and forwards login credentials to Apps Script in a URL without rate limiting or timeout. The signed CRM cookie and HMAC verification already exist and should be preserved.

### Intended behavior

Phase 1 would move database configuration to environment variables, establish API-wide signed-session enforcement with narrowly documented OAuth/auth exemptions and preserved bearer access, restrict the audio relay, remove credential-bearing diagnostics, proxy the named KTAHV writes through authenticated server code without changing GAS payloads, make coarse role enforcement server-authoritative, and add login timeout/rate limiting while preparing a POST-body GAS migration fallback.

### Files intended for Phase 1

Existing files:

- `lib/db.ts`
- `lib/session.ts`
- `lib/api-auth.ts`
- `middleware.ts`
- `app/api/audio-proxy/route.ts`
- `app/api/test-db/route.ts` (delete or disable; final choice to be stated before edit)
- `app/api/debug-leads/route.ts` (delete or admin-gate; final choice to be stated before edit)
- `app/api/auth/login/route.ts`
- `hooks/use-auth.tsx`
- `components/route-guard.tsx`
- `app/fms/bookings/team/page.tsx`
- `check_29.js` (delete)
- `scratch_check.js` (delete)
- `.gitignore` only if verification shows the existing rule is insufficient; currently `.env*` is already ignored
- `README.md` only for Phase 1 environment/manual setup notes, without taking over the broader Phase 5 documentation scope
- `docs/REVIEW_CHANGELOG.md`

Potential new files, subject to design confirmation:

- `.env.example` containing names/placeholders only
- `app/api/auth/permissions/route.ts` to remove the permissions GAS URL from the client
- `lib/rate-limit.ts` or a MySQL-backed equivalent
- `app/api/ktahv-bookings/actions/route.ts` as the authenticated GAS write proxy
- focused security tests if a runnable test harness is introduced within Phase 1; otherwise curl/integration proof is required by the workpack

Baseline file already added during setup:

- `ts-error-baseline.txt` with the verified value 595

### Behavior changes

- Unauthenticated data/API requests return JSON 401.
- External callers must present an approved bearer/shared credential or signed session.
- Login requests can time out and repeated failures can be rate-limited/locked.
- Tampering with localStorage no longer grants server-authorized access.
- The audio proxy only accepts the approved HTTPS recording host.
- Test/debug data endpoints are removed or restricted.
- Critical KTAHV actions travel through the authenticated CRM proxy; during GAS rollout, compatibility behavior must be explicit and temporary.

### Manual dependencies

- Obtain the correct GitHub checkout and create `fix/phase1-security`; do not branch the unrelated parent Downloads repository.
- Confirm the GitHub repository is private and enable reviewed PR/preview testing.
- Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in every Vercel environment before removing literal fallback.
- Rotate all exposed database credentials and verify the old passwords no longer work.
- Choose/provision stable application egress before firewalling MySQL.
- Inventory legitimate server-to-server callers that will receive 401 after API protection.
- Provision and rotate `GAS_SHARED_SECRET`; update each Apps Script to validate it before switching that action.
- Update the login Apps Script to accept credentials in a POST body.
- Choose a Vercel-safe shared rate-limit store.

### Ambiguities requiring resolution before edits

1. Which actual Git repository/worktree should receive the branch? The current app folder is untracked under an unrelated parent Git root.
2. Should `test-db` and `debug-leads` be deleted, or retained behind an admin-only policy?
3. What legitimate cron, Apps Script, mobile, portal, or measurement callers currently invoke `/api/*` without a browser session?
4. Is server-side coarse authorization role-based for Phase 1, or should the signed cookie carry the permissions-sheet result?
5. Which durable store should back rate limiting on Vercel?
6. What is the approved expiry/removal criterion for the temporary GAS compatibility fallback?
7. Can a static egress path be provided for the MySQL firewall requirement?

No Phase 1 application edits should start until these scope points and the file plan are confirmed.
