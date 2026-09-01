# Kairali CRM — Ecosystem Inventory (Phase 6 draft)

Date: 2026-08-01
Snapshot: worktree `/Users/kritikakairali/.codex/worktrees/65c6/KairaliCRM_workbook`, HEAD `5110e96`, with an uncommitted Phase 1–3 working tree.

## 1. Scope and status

**This document is a Phase 6 draft, not a completed ecosystem inventory.**

What it is:

- A **repo-local** inventory, derived only from checked-in source, local Git metadata, and the existing documents `docs/PHASE_0_DISCOVERY.md`, `docs/AUDIT_WORKPACK_CROSS_REFERENCE.md`, and `docs/REVIEW_CHANGELOG.md`.
- A record of what this one repository can prove about itself.

What it explicitly is **not**:

- It is **not** a claim that the external inventory is complete. No GitHub organisation enumeration, Vercel project listing, Google Workspace audit, Apps Script project listing, database administration review, or third-party portal audit has been performed for this document.
- It does **not** establish ownership of any external account, project, script, or domain.
- It does **not** cover other Kairali repositories, mobile application source, or any system whose code is not checked in here.

`docs/AUDIT_WORKPACK_CROSS_REFERENCE.md` §7 states that root `ECOSYSTEM.md` "should not be created as a claim of completion before the external inventory is actually run". This draft is written to satisfy the deliverable while honouring that constraint: every external-facing fact below is either sourced from checked-in code or explicitly marked **pending external verification**.

Counts in this document were measured against the current working tree and may differ from earlier documents, which reflect earlier snapshots. Where they differ, the earlier number is noted.

### Verification status legend

| Marker | Meaning |
|---|---|
| **Repo-verified** | Established from checked-in source or local Git metadata in this snapshot. |
| **Pending external verification** | Cannot be established from this repository; requires authenticated access to an external system or an owner statement. |
| **Owner-deferred** | Deliberately out of scope by prior instruction; see §9. |

## 2. Repository identity

| Item | Value | Status |
|---|---|---|
| Local Git remote `origin` | `https://github.com/jhaamit4060-alt/Kairali-CRM.git` | Repo-verified (local `.git/config` only) |
| Default branch | `main` (via `origin/HEAD`) | Repo-verified |
| Other remote branches seen locally | `origin/codex/fms-team-audit-remediation` | Repo-verified |
| Local branches | `main`, `fix/phase2-ktahv-booking-fms`, current detached HEAD worktree | Repo-verified |
| Tracked files | 476 | Repo-verified |
| Package name in `package.json` | `my-v0-project` (does not match the product name) | Repo-verified |
| GitHub **organisation/account ownership**, repository visibility (private/public), collaborator list, branch protection, fork/clone exposure | — | **Pending external verification** |
| Whether other Kairali repositories exist (mobile app, Apps Script sources, portals, marketing sites) | — | **Pending external verification** |
| Issues, projects, milestones, roadmaps | — | **Pending external verification** |

The mobile application referenced by `/api/calendar/mobile` and `/api/meetings/*` has **no source in this repository**; `docs/REVIEW_CHANGELOG.md` records it as "mobile app source not yet located".

## 3. Known internal app systems

Next.js 16 App Router application (React 19, TypeScript, Tailwind 4, Radix UI). Repo-verified counts in this snapshot:

- **61** `page.tsx` route files
- **108** `route.ts` files under `app/api`, plus one root handler `app/villa-bookings/route.ts` (109 total). Earlier documents record 101 under `app/api`; the increase reflects the Phase 1–3 routes added since (KTAHV action proxies, `/api/auth/me`).
- **127** component files, **34** hook files, **17** libraries in `lib/`, **2** contexts, **9** domain type files
- **43** files import `@/lib/db`, of which **41** are API routes

### Functional modules (top-level `app/` route groups)

| Module | Route group |
|---|---|
| Authentication / access | `/` (login), `access-denied` |
| Dashboard | `dashboard` |
| Leads & assignment | `leads` (incl. `leads/assign`, `leads/duplicates`) |
| Calls & voice | `calls`, `voicecall`, `sales-calling` |
| KTAHV Booking / FMS | `fms` (bookings team, villa-raag, enquiry reverification, complaints, pending tasks), `crr-fms`, `villa-bookings`, `new-order-fms` |
| Accounts & billing | `accounts-tracker`, `ksereve-billing-auditer` |
| Partners | `partners` |
| Doctor consultation | `doctor-consultation` |
| Marketing | `marketing`, `marketing-dashboard`, `marketing-funnel`, `google-adword-reports` |
| Sales & performance | `sales`, `performance`, `reports` |
| Meetings | `meetings`, `meet` |
| Deal assistant | `deal-assistant` |
| Helpdesk / complaints | `helpdesk`, `riya-sharma` |
| MR FMS | `MR-FMS` |
| User administration | `users` |

### API namespaces (`app/api/*`)

`account-tracker`, `adword-reports`, `arrival-departure`, `audio-proxy`, `auth`, `b2b-leads`, `bot-lookup`, `calendar`, `capture-partner`, `conversion`, `crr-calling`, `debug-leads`, `doctor`, `enquiry`, `expense`, `fms`, `generate-followup`, `get-part1`, `get-part2`, `get-part3`, `inspect-db`, `invoice-history`, `ktahv-bookings`, `ktahv-partners`, `ktahv-payment-history`, `leads`, `mark-followed-up`, `marketing`, `meetings`, `new-order-fms`, `partners`, `payment`, `pipeline`, `potential-value`, `prescriptions`, `received-leads`, `received-leads-sql`, `recording`, `rejected-partners`, `reports`, `sales-calling`, `sent-leads`, `stalled-deals`, `support-tickets`, `test-assistant`, `test-db`, `total-traffic`, `villa-bookings`, `voice-proxy`, `voice-summary`, `voicecall`, `wasted-leads`, `zoom`.

### Cross-cutting internal mechanisms

| Mechanism | Location | Notes |
|---|---|---|
| Signed CRM session cookie `kairali_user` | `lib/session.ts` | HMAC-SHA256 over a base64url payload with embedded 7-day expiry, signed with `NEXTAUTH_SECRET`. |
| API session boundary | `middleware.ts` | Node runtime. All `/api/*` requires a valid signed cookie except an explicit exemption list (§9). |
| Bearer / session dual authorization | `lib/api-auth.ts` | `MEASUREMENT_API_TOKEN` with a hard `MEASUREMENT_API_TOKEN_EXPIRES_AT` cutoff; used by `/api/leads` and `/api/conversion`. |
| Identity bootstrap | `app/api/auth/me/` (untracked, new), `hooks/use-auth.tsx`, `components/route-guard.tsx` | Reload trusts only the signed cookie; localStorage retained as a post-verification UI cache. |
| NextAuth (v4) | `app/api/auth/[...nextauth]/route.ts` | Google provider, used for Calendar/Meet. Separate from the CRM cookie. |
| Client-side caches | `lib/idb.ts`, `lib/leads-cache-control.ts`, `lib/recording-store.ts`, `lib/pipeline-checkpoint.ts` | IndexedDB, localStorage, sessionStorage. |
| Mock-backed modules | `app/api/marketing/*`, `app/api/doctor/*`, `app/api/prescriptions/*`, `data/mockBillingData.ts`, `lib/marketing-vs-sales-mock.ts` | 20 files under `app/api` mention "mock" (keyword match, not a per-route behavior audit). Phase 0/4 flagged these modules as appearing production-real without a sample label. |

### Known dead-weight / duplicate artifacts still present

`scratch/`, `temp/`, `app/fms/pending-tasks/page.tsx.bak`, `components/WastedLeadsDetailModal (1).tsx`, `hooks/Use-call-history_old.tsx`, `show_indexes.js`, `output.json`, root `index.html`, `styles/globals.css`, `app/leads/duplicates_old/`, `app/leads/duplicates/duplicates/`, duplicate `app/villa-bookings/route.ts`. (`check_29.js` and `scratch_check.js` are deleted in the current working tree under Phase 1.)

Note: `hooks/Use-call-history_old.tsx` and `app/fms/pending-tasks/page.tsx.bak` still contain Apps Script deployment URLs and therefore contribute to the counts in §6.

## 4. Checked-in external integrations

Every row below is repo-verified from source. **Ownership, account, billing, quota, and administrative control of every one of these is pending external verification.**

| Integration | Wiring in this repo | Notes |
|---|---|---|
| **MySQL** | `lib/db.ts` (`mysql2/promise` pool), consumed by 41 API routes | Schema `spalabsdomain_Kairali_CRM_Db` (§6). |
| **Google Apps Script / Sheets** | 54 distinct deployment IDs across 54 files (§5) | Primary system of record for large parts of KTAHV, partners, calls, sales, and permissions. |
| **CRM login backend** | `app/api/auth/login/route.ts` → Apps Script | Credentials are still sent to GAS in a **GET query string**; a POST-body migration requires a script-side change. |
| **Google OAuth / Calendar / Meet** | `app/api/auth/[...nextauth]/route.ts`, `app/api/calendar/*`, `app/api/meetings/meet-*` | `oauth2.googleapis.com`, `meet.googleapis.com`, `www.googleapis.com`. Refresh tokens persisted in a `google_tokens` table. |
| **Google Drive** | `lib/google-drive.ts`, `app/api/meetings/upload-audio`, `create-upload-session`, `[id]` | Service-account based; meeting recordings uploaded to a fixed folder ID. |
| **Zoom** | `app/api/zoom/connect`, `app/api/zoom/callback`, `app/api/meetings/zoom-*` | OAuth; access token/user identity stored in cookies. No webhook receiver in repo. |
| **OpenAI** | `app/api/meetings/{transcribe,diarize,process,extract-tasks}` | Transcription plus diarization/notes/task extraction. |
| **Google Gemini** | `app/api/generate-followup/route.ts`, `lib/config.ts` | Direct REST call to `generativelanguage.googleapis.com`. Model string in `lib/config.ts` is `gemini-3.5-flash`. |
| **ffmpeg.wasm** | `lib/audio-compress.ts` | Core binary fetched from **`unpkg.com` at runtime** — an uncontrolled third-party CDN dependency in the audio path. |
| **SquadIQ call recordings (AWS S3)** | `app/api/audio-proxy/route.ts`, `app/api/recording/route.ts`, `app/leads/assign/*` | Exact host allowlist `squadiq-call-recs.s3.amazonaws.com`. |
| **Elision dialer / IVR** | `app/MR-FMS/page.tsx` (`dialer1.elisiontec.com`, `dialer.elisiontec.com`); `app/api/doctor/consultations/route.ts` (`ivr.kairali.com`) | Direct client-side calls to the dialer host. |
| **Kairali-operated hosts** | `reports.kairali.com`, `upload.kairali.com`, `ivr.kairali.com` (doctor consultations); `reports.ktahv.com`, `chat.ktahv.com` (complaints); `www.kairali.com`, `www.kairali.ai` | Separate deployed systems referenced by URL only; **their code, hosting, and ownership are pending external verification.** |
| **B2B partner portal** | `app/partners/page.tsx` → `b2b-kairali.vercel.app` | A second Vercel deployment referenced from this app; **project/owner pending external verification.** |
| **AppSheet + Google Forms** | `app/api/doctor/consultations/[id]/*`, `.../stages` (`appsheet.com`, `forms.gle`) | Doctor-consultation workflow depends on external no-code artifacts. |
| **WhatsApp (link-out only)** | `app/deal-assistant/page.tsx` (`wa.me`) | No server API, no webhook. |
| **Remote media/assets** | `assets.mixkit.co` (notification sounds, `contexts/notification-context.tsx`), `img.icons8.com` (`app/meetings/page.tsx`), `cdnjs.cloudflare.com` (`components/Booking Form/BookingForm.css`), `fonts.googleapis.com` (build) | Third-party assets loaded at runtime. |
| **URL shortener** | `tinyurl.com` in `app/fms/complaints/page.tsx` | External redirect dependency in a live workflow. |
| **Vercel Analytics** | `@vercel/analytics` installed | Phase 0 found no mounted `Analytics` component. |

No inbound webhook routes exist for Google, Zoom, payments, WhatsApp, or any other provider (repo-verified; consistent with Phase 0).

## 5. Environment variables and secrets

### Names referenced in checked-in source (repo-verified)

| Variable | Consumed by | Present in `.env.example` |
|---|---|---|
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `lib/db.ts` (throws if unset) | Yes |
| `DB_PORT` | `lib/db.ts` (optional, defaults 3306) | Yes |
| `NEXTAUTH_SECRET` | `lib/session.ts`, NextAuth | Yes |
| `GAS_SHARED_SECRET` | 6 KTAHV action proxies | Yes |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | NextAuth, calendar, meetings | **No** |
| `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_FOLDER_ID` | `lib/google-drive.ts`, meetings upload | **No** |
| `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI` | Zoom OAuth | **No** |
| `OPENAI_API_KEY` | meetings AI routes | **No** |
| `GEMINI_API_KEY` | `/api/generate-followup` | **No** |
| `GAS_URL`, `GAS_WRITE_URL`, `GAS_REJECT_URL` | partner routes | **No** |
| `NEXT_PUBLIC_GAS_URL`, `NEXT_PUBLIC_GAS_WRITE_URL`, `NEXT_PUBLIC_GAS_REJECT_URL` | client bundle (**browser-visible by definition**) | **No** |
| `MEASUREMENT_API_TOKEN`, `MEASUREMENT_API_TOKEN_EXPIRES_AT` | `lib/api-auth.ts` | **No** |
| `NODE_ENV` | build/runtime | n/a |

`.env.example` is a **partial template by design** — it covers the database and Phase 1 security variables only, and says so. `README.md` documents this limitation. Twelve non-`NEXT_PUBLIC` secrets above have no template entry.

`.gitignore` ignores `.env*` with an allowlist exception for `/.env.example` (repo-verified). No `.env` file is tracked.

### Secret handling — pending external verification

- Where each secret is actually stored (Vercel env vars, a password manager, individual laptops) — **pending**.
- Which values are shared across Production/Preview/Development — **pending**.
- **Rotation status of the previously committed database credentials**, and confirmation that the old credentials are rejected — **pending**; `README.md` and `docs/REVIEW_CHANGELOG.md` both record this as outstanding external work.
- Whether the exposed credentials remain reachable in Git history, forks, clones, or backups — **pending**; a history rewrite has not been performed.
- Provisioning and Apps-Script-side enforcement of `GAS_SHARED_SECRET` — **pending**; the six KTAHV write proxies send it, but no deployed script is confirmed to validate it.
- Rotation policy/expiry for `MEASUREMENT_API_TOKEN`, OAuth client secrets, the Drive service account key, and both AI provider keys — **pending**.
- Whether `NEXTAUTH_SECRET` differs per environment (a shared value makes a Preview-issued session cookie valid in Production) — **pending**.

## 6. Apps Script deployment inventory (summary)

Repo-verified from checked-in source in this snapshot:

| Measure | Count |
|---|---|
| Distinct `script.google.com/macros/s/<ID>` deployment IDs | **54** |
| Files containing at least one deployment URL | **54** |
| Distinct IDs referenced from server code (`app/api/**`) | 11 |
| Distinct IDs referenced from client/browser code (`app/` excl. `api`, `components/`, `hooks/`, `contexts/`, `data/`) | 47 |
| IDs referenced from **both** server and client | 4 |

The audit workpack claimed 58 and `docs/AUDIT_WORKPACK_CROSS_REFERENCE.md` measured 53. The current 54 reflects the working tree at this snapshot. The residual gap to 58 is unexplained and may be snapshot drift, URL formatting, or **deployments that exist only outside the checked-in source** — that cannot be settled from this repository.

Concentration (files with the most deployment URLs): `hooks/useLeadQualityData.tsx`, `app/sales/reports/page.tsx`, `app/partners/page.tsx`, `app/leads/assign/page.tsx` (4 each); `hooks/useSalesData.tsx`, `components/Booking Form/BookingFormBase.tsx`, `app/fms/bookings/villa-raag/page.tsx`, `app/accounts-tracker/page.tsx` (3 each).

Structural observations (repo-verified):

- There is **no shared Apps Script client, version registry, or deployment manifest**. Each URL is hard-coded at its call site.
- 47 distinct deployment IDs are **shipped in the browser bundle**, so every one of those endpoints is publicly reachable to anyone who opens the app.
- Two dead files (`hooks/Use-call-history_old.tsx`, `app/fms/pending-tasks/page.tsx.bak`) still contain deployment URLs.
- Deliberate remaining direct-from-browser writes outside the approved proxy scope: `components/Booking Form/BookingFormBase.tsx` (booking form submission) and `components/Bookingdetailpopup.tsx` (booking detail).

**Pending external verification for every deployment ID:** which Google account or Workspace user owns the script project; the bound spreadsheet; the "Execute as" and "Who has access" settings; whether the deployment is `Anyone` / `Anyone with Google account` / restricted; the script source; deployment version history; and whether any script validates `GAS_SHARED_SECRET`. **None of that is derivable from a URL.** A per-script ownership and access matrix is the core Phase 6 external deliverable and has not been produced.

## 7. Databases and data stores

### MySQL (primary)

| Item | Value | Status |
|---|---|---|
| Driver | `mysql2/promise`, pooled, `connectionLimit: 10`, `connectTimeout: 30000` | Repo-verified |
| Schema referenced by name in queries | `spalabsdomain_Kairali_CRM_Db` | Repo-verified |
| Consumers | 41 API routes (43 files importing `@/lib/db`) | Repo-verified |
| Retry behaviour | `executeWithRetry`, 3 attempts, exponential backoff | Repo-verified |
| Host, instance, provider, region, version | — | **Pending external verification** |
| Backups, restore testing, retention | — | **Pending external verification** |
| Grants / least-privilege review (the app appears to use one credential set for all access) | — | **Pending external verification** |
| Firewall / network allowlist, and whether a static egress IP exists for Vercel | — | **Pending external verification** |
| Replication, monitoring, alerting | — | **Pending external verification** |

Table families visible in queries include KTAHV bookings/FMS stage tables (`ktahv_bookings_fms_v3_*`, `ktahv_reservation_database_add_edit_part1`, `ktahv_account_tracker`, `ktahv_guest_tracker`, `ktahv_invoicing_format`, `ktahv_pms_auto_release`, `ktahv_services`, `ktahv_room`), leads/voice (`ai_voice_leads_sent`, `ai_voice_leads_received`, `master_buffer`, `staging_buffer_new`), meetings (`meetings`, `meeting_tasks`, `participants`, `google_tokens`), pipeline/deals (`pipeline_checkpoints`, `deal_assistant_followups`, `followup_activity`), and analytics (`conversion_updates_employeewise`, `total_traffic_table`, `source_wise_lost_potential_value`, `expense_performance`, `payment_collection`). This list is indicative, not an authoritative schema — no live schema dump was taken for this document.

### Google Sheets (via Apps Script)

The 54 Apps Script deployments front an unknown number of spreadsheets that function as a **second system of record** alongside MySQL. Spreadsheet identity, ownership, sharing, and revision retention are **pending external verification**. No sync or reconciliation mechanism between MySQL and Sheets exists in this repo.

### Google Drive

Meeting recordings are uploaded to the folder identified by `GOOGLE_DRIVE_FOLDER_ID` using `GOOGLE_SERVICE_ACCOUNT_JSON`. Folder ownership, sharing scope, retention, and quota are **pending external verification**.

### Client-side stores (repo-verified)

- **IndexedDB** — `lib/idb.ts`, `lib/recording-store.ts`, `lib/leads-cache-control.ts` (leads cache, recordings).
- **localStorage** — 14 files, including the post-verification permissions/user compatibility cache in `hooks/use-auth.tsx` and per-user table preferences.
- **sessionStorage** — 8 files, including `lib/pipeline-checkpoint.ts` and booking-form step state.

These hold business data on user devices; no clearing policy exists in the repo.

### External data holders (no code here)

`reports.kairali.com`, `reports.ktahv.com`, `chat.ktahv.com`, `upload.kairali.com`, `ivr.kairali.com`, the Elision dialer, SquadIQ S3 recordings, AppSheet, and Google Forms all hold or receive Kairali data. **Ownership, contents, retention, and access control for all of these are pending external verification.**

## 8. Deployment and operations — unknowns

Repo-verified: there is **no `.github/` directory, no CI workflow, no `vercel.json`, no ESLint configuration, no test files, no Sentry or error-reporting integration, and no `Analytics` mount**. `next.config.mjs` sets `typescript.ignoreBuildErrors: true` and `images.unoptimized: true`. `package.json` pins several dependencies to `latest`. Package manager is npm (`package-lock.json` only).

Everything below is **pending external verification** — none of it can be established from this repository:

- Vercel team/account, project name(s), and which project serves production.
- Which environments exist (Production / Preview / Development), their URLs, and which environment variables are set in each.
- Production domain(s), DNS ownership, and TLS/certificate management.
- The Vercel project for `b2b-kairali.vercel.app` and its relationship to this one.
- Deployment trigger (branch auto-deploy vs manual), who can deploy, and deployment history.
- Whether branch protection, required reviews, or preview-testing gates exist on the GitHub repository.
- Serverless region, function limits, and outbound IP behaviour (directly relevant to the MySQL firewall question).
- Uptime monitoring, alerting, on-call, log retention, and where runtime errors are currently observed at all.
- Any cron jobs, scheduled Apps Script triggers, or external schedulers that call `/api/*`.
- Which legitimate server-to-server callers exist — Phase 1 hardening returns 401 to any caller without a session or the measurement bearer token, and the full caller list has never been enumerated.

## 9. Explicit external and manual follow-ups

These are owner/operations actions, not code changes. None can be closed from inside this repository.

**Access and ownership**

1. Confirm GitHub organisation/account ownership of `jhaamit4060-alt/Kairali-CRM`, its visibility, collaborator list, and branch protection.
2. Enumerate all other Kairali repositories, including any holding the mobile app or Apps Script sources.
3. Identify the Vercel team, all projects (including `b2b-kairali`), environments, domains, and who holds deploy rights.
4. Identify the Google account/Workspace that owns each of the 54 Apps Script deployments, their bound spreadsheets, and their execution/access settings.
5. Identify the Google Cloud project behind the OAuth client, the Drive service account, and the Gemini key; confirm ownership and consent-screen configuration.
6. Identify the owner of the Zoom app, the OpenAI account, the SquadIQ/S3 recording bucket, the Elision dialer account, the AppSheet app, and the Google Forms.
7. Audit the external portals — `reports.kairali.com`, `reports.ktahv.com`, `chat.ktahv.com`, `upload.kairali.com`, `ivr.kairali.com` — for owner, hosting, code location, and access control.

**Secrets**

8. Rotate the previously committed database credentials and verify the old ones are rejected.
9. Decide on and, if approved, execute a coordinated Git-history purge; treat the old values as permanently disclosed regardless.
10. Provision `GAS_SHARED_SECRET` in every runtime and enforce it in each deployed Apps Script handler; until then the KTAHV write proxies are unauthenticated at the script end.
11. Inventory where every secret in §5 is stored, confirm per-environment separation (especially `NEXTAUTH_SECRET`), and set rotation owners and dates.
12. Extend `.env.example` to cover the twelve untemplated secrets, or document deliberately why not.

**Data**

13. Review MySQL backups, restore testing, grants/least privilege, and firewall/allowlist; provision a static egress path before firewalling.
14. Establish retention and access review for Drive recordings, Sheets, and the S3 recordings bucket.
15. Run a DPDP/privacy review over the personal data held across MySQL, Sheets, Drive, S3, and browser-side stores.

**Operations**

16. Enumerate every legitimate non-browser caller of `/api/*` (cron, Apps Script, mobile, portals, measurement partners) before further boundary tightening.
17. Establish uptime monitoring, error reporting, and log retention.
18. Record offboarding, 2FA enforcement, and bus-factor status for every account above.
19. Reconcile the 54-vs-58 Apps Script count against the actual Google account listing.

## 10. Forbidden and deferred areas

Untouched by this document and by the Phase 6 work that produced it:

- **`/api/calendar/mobile`, all `/api/meetings/*`, mobile authentication, and the Meetings wildcard CORS policy in `next.config.mjs`** — owner-deferred. Both paths remain exempt from the middleware session boundary and anonymous mobile behaviour is intentionally preserved. This document describes their current state only; it proposes no change.
- **Phase 7 re-architecture** — future scope, not started.
- No application source or behaviour was inspected for change here, and none was modified. This is a documentation-only artifact.

## 11. How this draft was produced

Read-only inspection of the checked-in working tree on 2026-08-01: `rg` for environment variables, external hostnames, and Apps Script deployment IDs; `find`/`ls` for route, component, hook, and artifact counts; `git status`, `git remote -v`, `git branch -a`, `git ls-files` for repository metadata; and direct reads of `middleware.ts`, `lib/db.ts`, `lib/session.ts`, `lib/api-auth.ts`, `lib/config.ts`, `next.config.mjs`, `package.json`, `.env.example`, `.gitignore`, `README.md`, `docs/AUDIT_WORKPACK_CROSS_REFERENCE.md`, `docs/REVIEW_CHANGELOG.md`, and `docs/PHASE_0_DISCOVERY.md`.

No external system, portal, console, or account was accessed. No network calls were made. No credentials or secret values are reproduced anywhere in this document.
