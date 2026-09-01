# Phase 6 — Apps Script Deployment Matrix (repo-local)

Date: 2026-08-01
Snapshot: worktree `/Users/kritikakairali/.codex/worktrees/65c6/KairaliCRM_workbook`, HEAD `5110e96`, with the uncommitted Phase 1–3 working tree in place.

## 1. Scope and method

This document inventories **every Google Apps Script deployment ID visible in the checked-in source of this repository** and records, for each reference site, which layer it lives in, whether it is live or dead, and what the surrounding code appears to do with it.

Produced by **read-only repo-local inspection only**. No Google account, Apps Script console, Drive, spreadsheet, Vercel project, or any other external system was accessed. No network calls were made. No application source or behaviour was inspected for change, and none was modified.

### What this document establishes

- The complete set of deployment IDs present in checked-in source, in **both** URL forms used by this codebase.
- Every file and line that references each ID.
- The layer of each reference (server-side API / client-browser / component-hook-context-data / dead-legacy artifact).
- Whether each reference is live code or commented-out / in a dead file.
- What the **observed nearby source** does with the endpoint — read, write, auth, permissions, or unknown.
- An exact reconciliation of the 54-ID count in `ECOSYSTEM.md` §6 and the 58-ID claim in the audit workpack.

### What this document does NOT establish

For **every one of the 58 deployments below**, all of the following are **pending external verification** and are asserted nowhere in this document:

- Which Google account or Workspace user **owns** the script project.
- The **bound spreadsheet** (or whether one is bound at all).
- The **"Execute as"** setting (script owner vs. accessing user).
- The **"Who has access"** setting (`Anyone`, `Anyone with a Google account`, domain-restricted, or private).
- The **script source**, its handlers, and what it actually does server-side.
- **Deployment version history** and whether the checked-in ID is the current deployment.
- Whether the script validates `GAS_SHARED_SECRET` (the six KTAHV write proxies send it; no deployed script is confirmed to check it).

**None of that is derivable from a URL.** The "Observed use" column below describes what *this repository's code* does when it calls the endpoint. It is not a statement about what the script does.

`docs/AUDIT_WORKPACK_CROSS_REFERENCE.md` §7 and `ECOSYSTEM.md` §6 both record the per-script ownership and access matrix as the core Phase 6 **external** deliverable. This document is the repo-local half of it and does not close it.

### Identifier handling

Deployment IDs are rendered as a **fingerprint**: the first 14 and last 8 characters, e.g. `AKfycbw9IFX4Cu…q6YDoNmb`. Each fingerprint is unique across all 58 IDs in this snapshot, so it is sufficient to key this matrix and to match rows against an external deployment listing.

Full values are not reproduced here. They are already present at the exact `file:line` citations in every row, and are recoverable with a single `rg` over the tree. Deployment IDs are unguessable capability tokens for endpoints that are in several cases unauthenticated at the script end, so the full set is not duplicated into a document that may travel outside the repository. If the manager needs the untruncated list for external reconciliation, it can be produced on request.

No secret, credential, token, or password value appears anywhere in this document.

## 2. Legend

### URL form

| Form | Pattern | Note |
|---|---|---|
| **plain** | `script.google.com/macros/s/<ID>/exec` | Standard published web-app URL. |
| **domain** | `script.google.com/a/macros/kairali.com/s/<ID>/exec` | Workspace-domain-scoped published URL. The form indicates publication under a `kairali.com` Workspace; it does **not** establish ownership, access setting, or who can call it. |

### Reference layer

| Layer | Meaning |
|---|---|
| **server-api** | File under `app/api/**`. Runs server-side; ID is not shipped to the browser from this site. |
| **client-page** | File under `app/**` that is not under `app/api/**`. Ships to the browser. |
| **chc** | `components/`, `hooks/`, `contexts/`, `data/`. Ships to the browser. |
| **dead-artifact** | File is dead/legacy by filename or path alone: `*.bak`, `*_old*`, root `index.html`. |

### Reference state

| State | Meaning |
|---|---|
| **live** | Reachable, non-commented code in a live file. |
| **commented** | Inside a `//`, `/* */`, or `{/* */}` comment. Not executed. |
| **dead-file** | Live-looking code inside a `dead-artifact` file. |

### Observed use

Derived from the immediately surrounding source (HTTP method, `action=` parameter, handler name, what the response is bound to).

| Value | Meaning |
|---|---|
| **read** | Repo code issues a GET / fetches and consumes a payload, or builds a browser link that retrieves a view. |
| **write** | Repo code issues a POST that carries a mutating payload or a mutating `action=`. |
| **auth** | Repo code exchanges credentials for an identity decision. |
| **permissions** | Repo code retrieves role/permission data. |
| **unknown** | The nearby source does not settle it — e.g. a commented-out site, or an anchor/`window.open` that hands the user off to a GAS-hosted form whose behaviour is script-side. |

## 3. Deployment ID index

58 distinct deployment IDs. `Live?` is **no** when *every* reference to that ID is commented-out or in a dead file.

| # | ID fingerprint | Form | Layers | Refs | Live? | Observed use | Module |
|---|---|---|---|---:|---|---|---|
| 1 | `AKfycbw9IFX4Cu…q6YDoNmb` | plain | server-api | 3 | yes | read | Reports (daily/weekly/monthly) |
| 2 | `AKfycbwLCFHAEz…9SUNmlzA` | plain | chc | 1 | yes | read | MR-FMS leads |
| 3 | `AKfycbwLa1rvsE…ycNKR15w` | plain | client-page | 1 | yes | read | Partners — agent bookings |
| 4 | `AKfycbwMMPtbBY…E-Vl0-dG` | plain | client-page | 1 | yes | read | Sales reports — collection |
| 5 | `AKfycbwN81e5Do…t5aWs5Kg` | plain | client-page | 1 | yes | read | Calls reports — actual calls |
| 6 | `AKfycbwSMoJW2b…HYFO6PIA` | plain | chc | 1 | yes | read | Voice summary |
| 7 | `AKfycbwTbyuZ0c…C9cFqVNU` | plain | chc | 1 | yes | read | KTAHV booking detail popup |
| 8 | `AKfycbwWgf5uN9…NIhNWK-T` | plain | client-page | 1 | **no** | unknown | Leads assign — collection (disabled) |
| 9 | `AKfycbwaNGxqJU…PK4qIyGQ` | plain | chc | 1 | **no** | unknown | New-order FMS (superseded) |
| 10 | `AKfycbwiJWIPRo…zJKflUuV` | plain | server-api, client-page | 3 | yes | read, write | Partners — B2B / travel / rejected |
| 11 | `AKfycbwm61wP8s…j-sHjBXQ` | **domain** | client-page | 2 | **no** | unknown | Leads assign — conversions (disabled) |
| 12 | `AKfycbwmKA0gqG…jJKLQ3W-` | plain | chc | 1 | yes | read | Google PPC data |
| 13 | `AKfycbwpbLZ2qi…JVkw_tOm` | plain | server-api, client-page, chc | 8 | yes | write, read | KTAHV Booking FMS (all six write actions) |
| 14 | `AKfycbwsH0Jf7H…uPY6F_Bw` | plain | chc | 1 | **no** | unknown | Booking form — alternate submit (disabled) |
| 15 | `AKfycbwsOWM3jX…6kJ2q5Ng` | plain | chc | 1 | yes | read | Riya Sharma — chat history |
| 16 | `AKfycbxG36YGk3…rdRfG7QS` | plain | chc | 1 | yes | read | Lead target report |
| 17 | `AKfycbxGKmbfFe…hKuiKWrQ` | plain | client-page | 1 | yes | read | Sales reports — detailed sales |
| 18 | `AKfycbxRd-RX7i…Octh5a5r` | plain | server-api, client-page | 6 | yes | read, write | Partner onboarding (parts 1–3, capture) |
| 19 | `AKfycbxd1cRN0u…OFF2DE5g` | plain | client-page | 1 | yes | unknown | KTAHV bookings — "New Booking" form |
| 20 | `AKfycbxdLHJ-2b…cCtwRKl6` | plain | client-page | 1 | yes | read | Villa Raag — outlet charges |
| 21 | `AKfycbxdh66fFh…XsuxKBAu` | plain | chc | 1 | yes | read | Facebook PPC data |
| 22 | `AKfycbxivpk2sK…kC0XX399` | plain | chc | 1 | yes | unknown | Portal Hub — Sales Target Portal |
| 23 | `AKfycbxjuQRZga…7mSk1ZdT` | plain | chc | 1 | yes | read | KSereve billing auditor |
| 24 | `AKfycbxkYE09SC…_k3j_zLx` | plain | chc | 1 | yes | read | Riya Sharma — complaints data |
| 25 | `AKfycbxwCVCcjx…J3YuE5IQ` | plain | chc | 1 | yes | **write** | Leads (create / update / remark) |
| 26 | `AKfycby3a04v18…xebHUQnQ` | plain | server-api | 1 | yes | write | KTAHV arrival / departure |
| 27 | `AKfycby5rkCGv1…fYWh2Dac` | plain | client-page | 1 | **no** | unknown | Leads assign — unverified (disabled) |
| 28 | `AKfycby5x4cuxg…mCq5afRw` | **domain** | client-page | 1 | yes | unknown | CRR-FMS — guest feedback form |
| 29 | `AKfycbyAJuushB…VTouY01w` | plain | chc | 2 | yes | read | Employee directory (two hooks) |
| 30 | `AKfycbyLepNDol…L2e2B6Wg` | plain | client-page | 1 | yes | **write** | Meetings page — task delegate/HT/email |
| 31 | `AKfycbyOfcVtcr…MqvzjSuY` | plain | chc | 1 | **no** | unknown | Sales data (disabled variant) |
| 32 | `AKfycbyZgL_rJ8…DhQEeixg` | plain | server-api | 1 | yes | read | Voice proxy — all voice |
| 33 | `AKfycby_VtW5Pl…o2q4MrZP` | plain | chc | 1 | yes | read | Lead quality data |
| 34 | `AKfycbydtBk2cL…eBK0HReQ` | **domain** | chc | 1 | **no** | unknown | Portal Hub — partner contact (disabled) |
| 35 | `AKfycbydzH-IMa…83torBcU` | plain | chc | 1 | yes | read | Calls data |
| 36 | `AKfycbye9xqvbQ…5XG9gvSw` | plain | chc | 1 | **no** | unknown | Lead quality data (disabled variant) |
| 37 | `AKfycbyepUl170…Vdp_YhoA` | plain | client-page | 2 | **no** | unknown | Leads assign — wasted qty (disabled) |
| 38 | `AKfycbym45pQfg…be50bMH0` | plain | server-api | 1 | yes | read | Voice proxy — sent voice |
| 39 | `AKfycbyn6C8yZO…VtDcR8-N` | plain | client-page | 1 | yes | read | Villa Raag — payment details |
| 40 | `AKfycbyqoDenAH…8eEfi1fO` | plain | client-page | 2 | yes | read | Sales reports — unverified / collection |
| 41 | `AKfycbz1wmE_4s…7JzOD5nA` | plain | server-api | 1 | yes | read | Sales calling |
| 42 | `AKfycbz3TmE2vj…tSmDyCdw` | plain | client-page, dead-artifact | 2 | yes | read | FMS pending tasks |
| 43 | `AKfycbzDC3m9yU…5KCwvH-i` | plain | server-api, chc | 2 | yes | **auth**, **permissions** | CRM login + role permissions |
| 44 | `AKfycbzEAt6d7C…EOy1qO5g` | plain | chc | 3 | yes | read | Lead quality report |
| 45 | `AKfycbzG_1Y18I…miel6eqA` | plain | server-api | 1 | yes | read, write | CRR calling — bookings |
| 46 | `AKfycbzLPdQWxK…oVKQJ7FF` | plain | client-page | 1 | yes | read | Accounts tracker — pending actions |
| 47 | `AKfycbzSgSgfw_…qoo9KJ4Q` | plain | chc, dead-artifact | 2 | yes | read | Call history |
| 48 | `AKfycbzXE_P1ni…gq3thUWA` | plain | server-api | 1 | yes | read | AdWords reports |
| 49 | `AKfycbzXpMajQy…1_WTGmlw` | plain | client-page | 1 | yes | read | Villa Raag — add-ons |
| 50 | `AKfycbzZx7Qb7m…lqDtdQAw` | plain | chc | 1 | yes | unknown | Portal Hub — add new partner contact |
| 51 | `AKfycbzbvstR-5…v102GzGq` | plain | chc, dead-artifact | 3 | **no** | unknown / read | Booking form data (superseded by MySQL route) |
| 52 | `AKfycbzexHfvw5…pt8E0xr9` | plain | chc, dead-artifact | 3 | yes | **write** | Booking form submission (direct from browser) |
| 53 | `AKfycbzl525FWF…AZO8vmvl` | plain | chc | 2 | yes | read | Sales data |
| 54 | `AKfycbzrsZGVVL…tAfn2R8l` | **domain** | client-page | 1 | yes | unknown | CRR-FMS — referral form |
| 55 | `AKfycbzs_oaQ9z…dFw7VPvw` | plain | client-page | 1 | yes | read | Accounts tracker — edit-form updates |
| 56 | `AKfycbzyqlXSnC…S-cmBvYf` | plain | client-page | 1 | yes | read | Accounts tracker — account data |
| 57 | `AKfycbzzVJc9kR…ccGkHMVg` | plain | client-page | 1 | yes | read | KTAHV bookings — payment details link |
| 58 | `AKfycbzzu8kft6…WgynJH7Q` | plain | chc | 1 | yes | read | Notifications — Villa Raag FMS |

## 4. Per-reference matrix

88 reference sites. Every referencing file for every ID.

| # | File : line | Layer | State | Observed use | Evidence in nearby source |
|---|---|---|---|---|---|
| 1 | `app/api/reports/daily/route.ts:2` | server-api | live | read | `REPORTS_GAS_URL`; `GET()` fetch, 20 s deadline |
| 1 | `app/api/reports/monthly/route.ts:2` | server-api | live | read | Same constant and shape |
| 1 | `app/api/reports/weekly/route.ts:2` | server-api | live | read | Same constant and shape |
| 2 | `hooks/Usemrfmsleads.tsx:5` | chc | live | read | `GAS_API_URL`; `fetch(GAS_API_URL)` at :90 → `mapApiRow` |
| 3 | `app/partners/page.tsx:137` | client-page | live | read | `BOOKING_API`; `fetch(\`${BOOKING_API}?agentId=…\`)` at :416 |
| 4 | `app/sales/reports/page.tsx:1260` | client-page | live | read | `<a href>` new tab, `?date&month&year&employee&company` — "collection report" |
| 5 | `app/calls/reports/page.tsx:1286` | client-page | live | read | `<a href>` new tab, `?company&employee&month&year` |
| 6 | `hooks/voicecall/useVoiceSummary.tsx:215` | chc | live | read | `fetch(url)` default GET → `transformApiToUI` |
| 7 | `components/Bookingdetailpopup.tsx:3` | chc | live | read | `API_BASE`; `fetch(\`${API_BASE}?action=getByBookingId&bookingId=…\`)` at :451 |
| 8 | `app/leads/assign/page.tsx:5370` | client-page | **commented** | unknown | Inside `{/* <td … */}`; link shape `?type=collection&company&date` |
| 9 | `hooks/use-new-order-fms.tsx:110` | chc | **commented** | unknown | `// const API_URL = …`; live `API_URL = '/api/new-order-fms'` at :112 |
| 10 | `app/api/rejected-partners/route.ts:8` | server-api | live | read, write | `DEFAULT_GAS_READ_URL`; also the **final fallback for `GAS_WRITE_URL`** when `GAS_REJECT_URL` / `GAS_WRITE_URL` / `NEXT_PUBLIC_*` are all unset |
| 10 | `app/partners/page.tsx:442` | client-page | live | read | `fetch(url + "?action=b2b", {cache:"no-store"})` |
| 10 | `app/partners/page.tsx:508` | client-page | live | read | `fetch(url + "?action=travel", {cache:"no-store"})` |
| 11 | `app/leads/assign/page.tsx:5627` | client-page | **commented** | unknown | Inside `{/* <td … */}`; converted-quantity link |
| 11 | `app/leads/assign/page.tsx:5655` | client-page | **commented** | unknown | Inside `{/* <td … */}`; conversion-amount link |
| 12 | `hooks/useGooglePPCData.tsx:29` | chc | live | read | `API_URL`; fetched and parsed into PPC rows |
| 13 | `app/api/ktahv-bookings/actions/accounts/route.ts:8` | server-api | live | write | Session-gated proxy; fixed upstream `action=accountStatusUpdate1|2|3` |
| 13 | `app/api/ktahv-bookings/actions/approval/route.ts:8` | server-api | live | write | Session-gated proxy; fixed upstream action |
| 13 | `app/api/ktahv-bookings/actions/cancellation/route.ts:8` | server-api | live | write | Session-gated proxy; fixed `action=cancelBooking` |
| 13 | `app/api/ktahv-bookings/actions/checkout/route.ts:10` | server-api | live | write | Session-gated proxy; fixed `action=checkoutStatusUpdate1` |
| 13 | `app/api/ktahv-bookings/actions/fo-pms/route.ts:8` | server-api | live | write | Session-gated proxy; fixed `action=foStatusUpdate1|2` |
| 13 | `app/api/ktahv-bookings/actions/payment/route.ts:8` | server-api | live | write | Session-gated proxy; fixed `action=paymentCollection` |
| 13 | `app/fms/bookings/team/page.tsx:4411` | client-page | **commented** | write | Legacy direct browser write `?action=accountStatusUpdate1`, superseded by the proxy above |
| 13 | `contexts/notification-context.tsx:163` | chc | live | read | `fetchFMS(url, "team", "KTAHV")` → GET, reads `data.bookings` |
| 14 | `components/Booking Form/BookingFormBase.tsx:16` | chc | **commented** | unknown | `//const SUBMIT_API = …` — alternate submit target |
| 15 | `hooks/riyasharma/useRiyaSharmaData.ts:314` | chc | live | read | Builds `chatHistoryLink` `?chatId=` for the browser to open |
| 16 | `hooks/use-lead-target-report.tsx:35` | chc | live | read | `API_URL`; module-cached `fetch(API_URL)` at :77 |
| 17 | `app/sales/reports/page.tsx:1235` | client-page | live | read | `<a href>` new tab — "detailed sales report" |
| 18 | `app/api/capture-partner/route.ts:4` | server-api | live | write | `GAS_URL`; `POST` forwards the parsed client body |
| 18 | `app/api/get-part1/route.ts:4` | server-api | live | read | `?action=getAll&part=1` at :20 |
| 18 | `app/api/get-part2/route.ts:4` | server-api | live | read | `?action=getAll&part=2` at :20 |
| 18 | `app/api/get-part3/route.ts:4` | server-api | live | read | `?action=getAll&part=3` at :20 |
| 18 | `app/api/partners/route.ts:8` | server-api | live | read, write | `GET` all/`?row=`; `POST` at :51 forwards a body |
| 18 | `app/partners/page.tsx:134` | client-page | live | read | `FORM_URL` (aliased `EDIT_FORM_URL`); `?action=getAll&part=1|2|3` at :461/:474/:487 |
| 19 | `app/fms/bookings/page.tsx:726` | client-page | live | unknown | `<a href>` "New Booking" → GAS-hosted form, `?ktahvId&user&bookingType&resId`; hard-coded sample values |
| 20 | `app/fms/bookings/villa-raag/page.tsx:452` | client-page | live | read | `OUTLET_API_URL`; `<a href …?bookingId=>` at :2506, :2761, :2951 |
| 21 | `hooks/useFacebookPPCData.tsx:59` | chc | live | read | Inline `fetch(url)` → parsed PPC rows |
| 22 | `components/dashboard-layout.tsx:221` | chc | live | unknown | Portal Hub menu entry "🎯 Sales Target Portal", opened in the browser; gated only by the **client-side** permission string `sales_target_portal.view` |
| 23 | `data/mockBillingData.ts:4` | chc | live | read | `API_URL`; `fetch(API_URL, {cache:'no-store'})`; consumed by `app/ksereve-billing-auditer/page.tsx` |
| 24 | `hooks/riyasharma/useRiyaSharmaData.ts:210` | chc | live | read | `?action=gettabledata` / `?action=getstagedata` at :426, :427, :468 |
| 25 | `hooks/use-leads.tsx:34` | chc | live | **write** | `GoogleSheetsAPI` class (:36–:69); three `POST` methods only — `action: 'createLead' \| 'updateLead' \| 'addRemark'`. No read method. **Direct browser→GAS write.** |
| 26 | `app/api/arrival-departure/route.ts:4` | server-api | live | write | `POST`; body `action` restricted to `arrival` \| `departure`, forwarded at :40 |
| 27 | `app/leads/assign/page.tsx:5824` | client-page | **commented** | unknown | Inside `{/* <td … */}`; unverified-conversion link |
| 28 | `app/crr-fms/page.tsx:91` | client-page | live | unknown | `FEEDBACK_FORM_BASE_URL`; `window.open(buildFeedbackFormUrl(bookingId))` at :2250, anchors at :3363/:3373. Hands the guest to a GAS-hosted feedback form. |
| 29 | `hooks/use-employee-list.tsx:26` | chc | live | read | `SCRIPT_URL`; `new URL(SCRIPT_URL)` + params at :53 → user list |
| 29 | `hooks/useEmployees.ts:9` | chc | live | read | `GAS_EMPLOYEES_URL`; `fetch(...)` at :27, 10-minute module cache |
| 30 | `app/meetings/page.tsx:120` | client-page | live | **write** | `GAS_URL`; `callGAS(action, tasks)` at :1440 issues `POST` with `action` ∈ `delegate` \| `ht` \| `email` and a task payload. **Direct browser→GAS write.** This is the Meetings **page**, not `/api/meetings/*`; documented only, not touched. |
| 31 | `hooks/useSalesData.tsx:69` | chc | **commented** | unknown | Commented alternative inside the `fetch(` argument list |
| 32 | `app/api/voice-proxy/route.ts:6` | server-api | live | read | `ALL_VOICE_GAS_URL`; selected when `type_proxy !== 'sent'` at :56 |
| 33 | `hooks/useLeadQualityData.tsx:186` | chc | live | read | Active `fetch(...)` argument (line :185 above it is the commented alternative) |
| 34 | `components/dashboard-layout.tsx:224` | chc | **commented** | unknown | Commented domain-scoped variant of the "Add New Partner Contact" Portal Hub entry |
| 35 | `hooks/use-calls-data.tsx:85` | chc | live | read | `fetch(url)` → `CallsDateGroup[]` |
| 36 | `hooks/useLeadQualityData.tsx:97` | chc | **commented** | unknown | Inside a fully commented-out `fetchData` block (:92–:180) |
| 37 | `app/leads/assign/page.tsx:5707` | client-page | **commented** | unknown | Inside `{/* <td … */}`; wasted-quantity link |
| 37 | `app/leads/assign/page.tsx:5759` | client-page | **commented** | unknown | Inside the same commented block; lost-reason links |
| 38 | `app/api/voice-proxy/route.ts:4` | server-api | live | read | `SENT_VOICE_GAS_URL`; selected when `type_proxy === 'sent'` at :56 |
| 39 | `app/fms/bookings/villa-raag/page.tsx:907` | client-page | live | read | `payment_details` case builds `?bookingId=` and calls `window.open(url, "_blank")` |
| 40 | `app/sales/reports/page.tsx:1273` | client-page | live | read | `<a href>` — "unverified report", `&type=unverified` |
| 40 | `app/sales/reports/page.tsx:1286` | client-page | live | read | `<a href>` — "collection report" |
| 41 | `app/api/sales-calling/route.ts:4` | server-api | live | read | `SALES_CALLING_GAS_URL`; GET with 20 s deadline |
| 42 | `app/fms/pending-tasks/page.tsx:56` | client-page | live | read | `API_URL`; `fetch(API_URL)` at :91 |
| 42 | `app/fms/pending-tasks/page.tsx.bak:55` | **dead-artifact** | dead-file | read | `.bak` backup of the page above; tracked in Git |
| 43 | `app/api/auth/login/route.ts:7` | server-api | live | **auth** | `SCRIPT_URL`; CRM credential exchange, 15 s deadline, mints the signed session cookie on success. Credentials are still placed in a **GET query string** (recorded in `docs/REVIEW_CHANGELOG.md`). |
| 43 | `hooks/use-auth.tsx:72` | chc | live | **permissions** | `SCRIPT_URL`; `loadRolePermissions()` at :225 calls `?action=getRolePermissions`, result cached in `localStorage` as `cached_role_permissions` |
| 44 | `hooks/useLeadQualityReport.tsx:18` | chc | live | read | Explicit `method: "GET"` fetch |
| 44 | `hooks/useLeadQualityData.tsx:98` | chc | **commented** | unknown | Inside the commented-out `fetchData` block |
| 44 | `hooks/useLeadQualityData.tsx:185` | chc | **commented** | unknown | Commented alternative directly above the live line :186 |
| 45 | `app/api/crr-calling/bookings/route.ts:5` | server-api | live | read, write | Session-gated; `GET` at :48 and `POST` at :160 against the same deployment |
| 46 | `app/accounts-tracker/page.tsx:296` | client-page | live | read | `PENDING_ACTIONS_API`; `fetch(..., {redirect:'follow'})` at :4104 |
| 47 | `hooks/Use-call-history.tsx:65` | chc | live | read | `API_URL`; `?id=${leadId}` at :178 and :235 |
| 47 | `hooks/Use-call-history_old.tsx:65` | **dead-artifact** | dead-file | read | `_old` duplicate of the hook above; tracked in Git |
| 48 | `app/api/adword-reports/route.ts:5` | server-api | live | read | `ADWORD_GAS_URL`; per-company GET. Source comment: "⚠️ Better: move this to env variable in production" |
| 49 | `app/fms/bookings/villa-raag/page.tsx:451` | client-page | live | read | `ADDON_API_URL`; `<a href …?bookingId=>` at :2499, :2754, :2944 |
| 50 | `components/dashboard-layout.tsx:225` | chc | live | unknown | Portal Hub menu entry "🤝 Add New Partner Contact" — a GAS-hosted onboarding form (write-oriented, but no write is issued from this repo); gated only by the **client-side** permission `partner_onboard_form.view` |
| 51 | `components/Booking Form/BookingFormBase.tsx:14` | chc | **commented** | unknown | `// const DATA_API = …`; the live `DATA_API` at :13 is now `/api/ktahv-bookings/formdataktahv` |
| 51 | `index.html:4884` | **dead-artifact** | dead-file | read | Root standalone "Multi-Step Form" HTML (9,423 lines, single `Add project files` commit); `getDataViaAPI()` GET |
| 51 | `index.html:7786` | **dead-artifact** | dead-file | read | `?id=&formType=` GET in the same standalone artifact |
| 52 | `components/Booking Form/BookingFormBase.tsx:15` | chc | live | **write** | `SUBMIT_API` — booking-form submission sent **directly from the browser** to GAS. Explicitly outside the approved proxy scope (`docs/REVIEW_CHANGELOG.md`, `ECOSYSTEM.md` §6). |
| 52 | `index.html:6812` | **dead-artifact** | dead-file | write | `POST` form submit in the standalone artifact |
| 52 | `index.html:6857` | **dead-artifact** | dead-file | write | `submitFormToGoogleSheetsWithResponse()` — `POST`, but the function body begins with an unconditional `return` (:6851), so it is unreachable even within the dead file |
| 53 | `hooks/useSalesData.tsx:68` | chc | **commented** | unknown | Commented duplicate of the live line :70 (same ID) |
| 53 | `hooks/useSalesData.tsx:70` | chc | live | read | Active `fetch(...)` argument |
| 54 | `app/crr-fms/page.tsx:101` | client-page | live | unknown | `REFERRAL_FORM_BASE_URL`; `window.open(buildReferralFormUrl(bookingId))` at :2313, anchors at :3490/:3500 |
| 55 | `app/accounts-tracker/page.tsx:433` | client-page | live | read | `EDIT_FORM_UPDATE_API`; `fetch(..., {redirect:'follow'})` at :447. Despite the name, the observed call is a GET returning a data payload. |
| 56 | `app/accounts-tracker/page.tsx:279` | client-page | live | read | `ACCOUNT_DATA_UPLOAD_API`; `fetch(..., {redirect:'follow'})` at :4162. Despite the name, the observed call is a GET. |
| 57 | `app/fms/bookings/page.tsx:736` | client-page | live | read | `<a href>` "Payment Details", `?bookingId=`; hard-coded sample booking ID |
| 58 | `contexts/notification-context.tsx:164` | chc | live | read | `fetchFMS(url, "villa", "VILLARAAG")` → GET, reads `data.bookings` |

## 5. Summary counts

All figures repo-verified against the current working tree.

### Totals

| Measure | Count |
|---|---:|
| Distinct deployment IDs (both URL forms) | **58** |
| Total reference sites | **88** |
| Files containing at least one reference | **56** |
| IDs in the plain `…/macros/s/<ID>` form | **54** |
| IDs in the domain `…/a/macros/kairali.com/s/<ID>` form | **4** |
| IDs appearing in **both** forms | **0** |

### By layer (distinct IDs; an ID may appear in several layers)

| Layer | Distinct IDs |
|---|---:|
| server-api (`app/api/**`) | 11 |
| client-page (`app/**` excl. `app/api`) | 24 |
| component / hook / context / data | 28 |
| dead-artifact files (`index.html`, `*.bak`, `*_old*`) | 4 |
| **Browser-reachable** (client-page ∪ chc) | **51** |
| Referenced from **both** server and browser | 4 |
| Server-only (never shipped to the browser) | 7 |

### By liveness

| State | Distinct IDs |
|---|---:|
| At least one live reference | 48 |
| Every reference commented-out or in a dead file | **10** |

The 10 with no live reference: #8, #9, #11, #14, #27, #31, #34, #36, #37, #51.

### By observed use (distinct IDs with at least one live reference of that kind)

| Observed use | Distinct IDs |
|---|---:|
| read | 38 |
| write | 8 |
| auth | 1 |
| permissions | 1 |
| unknown only | 5 |

The five categories overlap (an ID can be both read and write) and are scored over the 48 IDs with at least one live reference: 38 read + 4 write-only (#25, #26, #30, #52) + 1 auth/permissions (#43) + 5 unknown-only = 48.

Live write endpoints: #10 (write fallback), #13, #18, #25, #26, #30, #45, #52.
Of these, **three are written to directly from the browser** with no same-origin proxy: **#25** (`hooks/use-leads.tsx`), **#30** (`app/meetings/page.tsx`), **#52** (`components/Booking Form/BookingFormBase.tsx`).

### Concentration

| Distinct IDs | File |
|---:|---|
| 4 | `app/leads/assign/page.tsx` (all 4 commented-out) |
| 3 | `app/accounts-tracker/page.tsx` |
| 3 | `app/fms/bookings/villa-raag/page.tsx` |
| 3 | `app/partners/page.tsx` |
| 3 | `app/sales/reports/page.tsx` |
| 3 | `components/Booking Form/BookingFormBase.tsx` |
| 3 | `components/dashboard-layout.tsx` |
| 3 | `hooks/useLeadQualityData.tsx` |
| 2 | `app/api/voice-proxy/route.ts`, `app/crr-fms/page.tsx`, `hooks/useSalesData.tsx`, `hooks/riyasharma/useRiyaSharmaData.ts`, `app/fms/bookings/page.tsx` |

## 6. Count reconciliation — 53 / 54 / 58

### The 54 in `ECOSYSTEM.md` §6 — confirmed, and explained

`ECOSYSTEM.md` §6 reports **54 distinct deployment IDs across 54 files**, with 11 server-side, 47 client-side, and 4 in both.

This matrix reproduces every one of those numbers exactly **for the plain URL form**:

| `ECOSYSTEM.md` §6 | This matrix (plain form only) | Match |
|---|---|---|
| 54 distinct IDs | 54 | ✅ |
| 11 IDs from `app/api/**` | 11 | ✅ |
| 47 IDs from client/component code | 47 | ✅ |
| 4 IDs in both server and client | 4 | ✅ |
| 54 files | **55** | ⚠️ off by one |

The file-count difference is fully explained: the plain form appears in **55** files, one of which is root **`index.html`**. That path falls outside the globs `ECOSYSTEM.md` §6 describes (`app/api/**`; `app/` excl. `api`, `components/`, `hooks/`, `contexts/`, `data/`), so it was counted for IDs but not for files. `55 − 1 = 54`. No ID is affected, because both IDs in `index.html` (#51, #52) also appear in `components/Booking Form/BookingFormBase.tsx`.

### The 58 in the audit workpack — **now fully accounted for**

`docs/AUDIT_WORKPACK_CROSS_REFERENCE.md` §1 records the workpack claim of **58** against a measured 53, and §7 states: *"The difference may be snapshot drift, URL formatting, or deployments only present outside the checked-in source."* `ECOSYSTEM.md` §6 repeats the gap as "unexplained".

**The cause is URL formatting.** Both earlier measurements used a regex anchored on the literal path `script.google.com/macros/s/`. That pattern **cannot match** the Workspace-domain-scoped form this codebase also uses:

```
script.google.com/a/macros/kairali.com/s/<ID>/exec
```

Four distinct deployment IDs appear **only** in that form, in four reference sites across three files:

| # | ID fingerprint | Reference | State |
|---|---|---|---|
| 28 | `AKfycby5x4cuxg…mCq5afRw` | `app/crr-fms/page.tsx:91` — guest feedback form | live |
| 54 | `AKfycbzrsZGVVL…tAfn2R8l` | `app/crr-fms/page.tsx:101` — referral form | live |
| 11 | `AKfycbwm61wP8s…j-sHjBXQ` | `app/leads/assign/page.tsx:5627`, `:5655` | commented |
| 34 | `AKfycbydtBk2cL…eBK0HReQ` | `components/dashboard-layout.tsx:224` | commented |

None of the four overlaps the 54 plain-form IDs.

```
54 (plain form) + 4 (domain form) = 58 distinct deployment IDs
```

**This matches the audit workpack's 58 claim exactly.** The workpack figure was correct; the two repo-side measurements that contradicted it were under-counting because of the path pattern used.

### The 53 in `docs/AUDIT_WORKPACK_CROSS_REFERENCE.md` — snapshot drift, unresolved

The cross-reference measured 53 plain-form IDs against the `/Users/kritikakairali/Downloads/KairaliCRM_workbook` snapshot, which its §1 records was not a standalone Git checkout. That tree is not available here, so the 53→54 delta cannot be settled from this worktree.

It is **not** caused by the uncommitted Phase 1–3 working tree. Verified directly: the committed state at `HEAD` (`5110e96`) and the current dirty working tree contain **the identical set of 58 IDs across 56 files** — `git grep` over `HEAD` and `rg` over the worktree produce set-identical results, with no ID present in one and absent from the other. The six new KTAHV action proxies added in Phase 2 all reuse ID #13, which was already present at `app/fms/bookings/team/page.tsx:4411`, so they add no new ID.

### Residual gap

**None for the ID count.** With the domain form included, the repo-local count and the workpack claim agree at 58 with no unexplained remainder in this snapshot.

This does **not** mean the deployment inventory is complete. It means the *checked-in source* has been fully enumerated. Deployments that exist in the Google account but are not referenced from this repository — including any script that the mobile app, a portal, a cron trigger, or another repository calls — remain invisible here and can only be found by listing the Apps Script projects in the owning Google account. `ECOSYSTEM.md` §9 item 19 should be read as *"enumerate the account listing and diff it against these 58"*, not as an open arithmetic discrepancy.

## 7. Repo-verified structural observations

- **No shared client, registry, or manifest.** Every one of the 88 references is a hard-coded string literal at its call site. There is no central module, no environment-driven mapping (except the partner routes' `GAS_URL` / `GAS_WRITE_URL` / `GAS_REJECT_URL` overrides, which fall back to a checked-in literal), and no deployment version pinning.
- **51 of 58 IDs are browser-reachable.** They ship in the client bundle, so every one of those endpoints is discoverable by anyone who opens the app and reads the bundle.
- **Two IDs serve double duty across the trust boundary.** #13 and #18 are called both from session-gated server routes and directly from browser code, so the server-side hardening does not remove browser reachability of the same deployment.
- **Three live browser-direct writes.** #25 (`hooks/use-leads.tsx` — create/update/remark), #30 (`app/meetings/page.tsx` — task delegate/HT/email), #52 (`components/Booking Form/BookingFormBase.tsx` — booking submission). `ECOSYSTEM.md` §6 lists only the booking form and `components/Bookingdetailpopup.tsx`; the latter is in fact a **read** (`action=getByBookingId`), and #25 and #30 are not listed there. Recorded as an observation, not a change request.
- **Authentication and authorization both terminate at a single deployment.** #43 backs both the CRM login exchange (`app/api/auth/login/route.ts`, server-side) and the role-permission fetch (`hooks/use-auth.tsx`, browser-side). It is the highest-sensitivity ID in this matrix and the only one classified `auth` or `permissions`.
- **Three Portal Hub entries (#22, #34, #50) are gated only by client-side permission strings** (`sales_target_portal.view`, `partner_onboard_form.view`). The gate hides a menu item; it does not restrict the deployment.
- **10 of 58 IDs have no live reference at all** — they survive only in commented-out code, a `.bak` file, an `_old` hook, or the standalone root `index.html`. Each is still a real deployment that may still be published and reachable. Removing the dead code does not retire the deployment.
- **Three dead artifacts still carry deployment IDs and are tracked in Git:** `index.html` (2 IDs), `app/fms/pending-tasks/page.tsx.bak` (1), `hooks/Use-call-history_old.tsx` (1). `ECOSYSTEM.md` §3 names the latter two; `index.html` is listed as dead weight there but not as an Apps Script carrier.
- **Two constants are named for writes but observed doing reads:** `ACCOUNT_DATA_UPLOAD_API` (#56) and `EDIT_FORM_UPDATE_API` (#55) in `app/accounts-tracker/page.tsx`. The names are misleading about the observed call; what the scripts do on their side is unknown.
- **Duplicate hooks share one deployment.** `hooks/use-employee-list.tsx` and `hooks/useEmployees.ts` both point at #29.
- **`app/api/adword-reports/route.ts:5` carries a source comment** — "⚠️ Better: move this to env variable in production" — an acknowledged hard-coding.

## 8. Pending external verification

For **each of the 58 deployment IDs above**, the following remain unestablished and cannot be established from this repository:

1. Owning Google account or Workspace user, and whether that person is still with the organisation.
2. Bound spreadsheet (identity, owner, sharing scope, revision retention), or confirmation that none is bound.
3. "Execute as" setting.
4. "Who has access" setting — `Anyone`, `Anyone with a Google account`, domain-restricted, or private.
5. Script source and handler inventory, including which `action=` values each accepts.
6. Deployment version history, and whether the checked-in ID is the current deployment or a stale one.
7. Whether the script validates `GAS_SHARED_SECRET` — required for #13 before the six KTAHV write proxies are authenticated end-to-end.
8. For #43 specifically: whether the login handler can accept credentials in a POST body, which is the precondition for removing them from the GET query string.
9. For the 10 IDs with no live reference: whether the deployment is still published, and whether it should be **archived or undeployed** rather than merely deleted from source.
10. Whether the four domain-form deployments (#11, #28, #34, #54) are in fact restricted to the `kairali.com` Workspace. The URL form is consistent with domain-scoped publication but does **not** prove the access setting.
11. Whether any deployment exists in the owning account that is **not** referenced anywhere in this repository — the only remaining source of ID-count divergence once the account listing is available.

Nothing in §8 is asserted, inferred, or partially answered anywhere above.

## 9. How this document was produced

Read-only inspection of the working tree on 2026-08-01:

- `rg -n -o 'script\.google\.com/macros/s/[A-Za-z0-9_-]+'` and `rg -n -o 'script\.google\.com/a/macros/[^/]+/s/[A-Za-z0-9_-]+'` across the tree, plus a combined pattern, to enumerate every reference site with `file:line`.
- `rg -o 'AKfycb[A-Za-z0-9_-]+'` as an independent cross-check that no deployment ID appears in any other URL shape or as a bare token.
- Small `node -e` one-liners to group references by ID, classify each file into a layer, and compute the distinct-ID and per-layer counts in §5.
- `sed -n` context reads (±6–12 lines) around all 88 reference sites, plus `rg` traces of each named constant to its call site, to establish live-vs-commented state and observed use.
- `git grep` over `HEAD` compared against `rg` over the working tree, and `comm` over the two sorted ID sets, to confirm the uncommitted Phase 1–3 changes alter no deployment ID.
- `git ls-files --error-unmatch` to confirm `index.html`, `app/fms/pending-tasks/page.tsx.bak`, and `hooks/Use-call-history_old.tsx` are tracked.
- Direct reads of `ECOSYSTEM.md`, `docs/AUDIT_WORKPACK_CROSS_REFERENCE.md`, and `docs/REVIEW_CHANGELOG.md` for prior counts, boundaries, and status.

No external system was accessed, no network call was made, no application source was modified, and nothing was staged, committed, or pushed. `/api/calendar/mobile`, `/api/meetings/*`, mobile authentication, and the Meetings wildcard CORS policy were not inspected for change and are not addressed here; entry #30 concerns `app/meetings/page.tsx`, a browser page, and is recorded as an observation only.
