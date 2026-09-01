# Phase 6 — External Host Matrix (repo-local)

Date: 2026-08-01
Snapshot: worktree `/Users/kritikakairali/.codex/worktrees/65c6/KairaliCRM_workbook`, HEAD `5110e96`, with the uncommitted Phase 1–3 working tree in place.

## 1. Scope and method

This document inventories **every external URL host and domain visible in the checked-in source and docs-relevant configuration of this repository**, and records for each one: which files reference it, whether the reference lives in server code / browser-shipped code / a dead artifact, what the surrounding code appears to use it for, whether it plausibly receives business data / auth tokens / uploaded files / audio or media (or is link-out, read-only, or asset-only), and what ownership, access, and deployment facts remain **pending external verification**.

Produced by **read-only repo-local inspection only**. No external host, portal, console, DNS record, WHOIS record, certificate log, or account was accessed. **No network call was made, and no host below was contacted or resolved.** No application source or behaviour was inspected for change, and none was modified.

### Explicit exclusion — `script.google.com`

Google Apps Script deployment URLs are **out of scope here by instruction**. All 58 deployment IDs, both URL forms (`script.google.com/macros/s/<ID>` and `script.google.com/a/macros/kairali.com/s/<ID>`), all 88 reference sites, their layers, live/dead state, observed read/write/auth use, and their per-deployment external gaps are already inventoried in `docs/PHASE_6_APPS_SCRIPT_DEPLOYMENT_MATRIX.md`. `script.google.com` is counted **nowhere** in this document's totals. It is by a wide margin the highest-volume external host in the tree (88 references across 56 files) and any reading of the totals below must add it back mentally.

### What this document establishes

- The complete set of external host strings present in checked-in source and in docs-relevant config (`components.json`, `next.config.mjs`, `.gitignore`, `package.json`, CSS).
- Every referencing file for every host, with the layer of each reference.
- Whether the host string ships to the browser, stays server-side, or survives only in a dead artifact or a comment.
- The **apparent** purpose of each host, argued from the immediately surrounding source.
- A data-flow classification per host: does the repo's own code plausibly send it business data, credentials, files, or media — or is the reference a link-out, a read, or a static asset?

### What this document does NOT establish

For **every host below**, all of the following are **pending external verification** and are asserted nowhere in this document:

- **Who owns the domain, the account behind it, or the service.** A `kairali.com` or `ktahv.com` subdomain in source is a *string in this repository*; it is not proof that Kairali controls the DNS zone, the host, the certificate, or the content. Nothing here establishes ownership of any domain or account.
- **Whether the host is reachable, resolvable, or currently serving anything at all.** No host was contacted. A checked-in URL is equally consistent with a live production system, a decommissioned one, a typo, and a placeholder.
- Where the host is deployed, by whom, under what contract, in what jurisdiction, or with what data-processing terms.
- What the host actually does with any data it receives, its retention, its access control, or its logging.
- Whether any traffic to it is currently flowing.

**No secret, credential, key, token, password, connection string, deployment ID, spreadsheet ID, or form ID value is reproduced anywhere in this document.** Where an identifier is unavoidable to locate the reference, the `file:line` citation is given instead of the value.

### Owner-deferred paths

`app/api/calendar/mobile/route.ts` and all files under `app/api/meetings/**` are **owner-deferred** (`ECOSYSTEM.md` §10, `docs/REVIEW_CHANGELOG.md` Phase 1 deferred list). Hosts referenced from those paths — `oauth2.googleapis.com`, `www.googleapis.com`, `meet.googleapis.com`, `api.zoom.us`, `api.openai.com`, `zoom.us` — are listed **only so the inventory is complete**. Those files were not inspected for change, nothing about mobile authentication or the Meetings wildcard CORS policy in `next.config.mjs` is addressed, and no change to either is proposed. `app/meetings/page.tsx` and `app/meet/page.tsx` are browser **pages**, not `/api/meetings/*`; references from them are recorded as observations only.

## 2. Legend

### Layer

| Layer | Meaning |
|---|---|
| **server** | Referenced only from `app/api/**`, `middleware.ts`, a `'use server'` module, or a `lib/` module whose importers are all server-side. The string does not reach the browser from that site. |
| **client** | Referenced from a browser-shipped file: `app/**` outside `app/api`, `components/`, `hooks/`, `contexts/`, `data/`, or an imported CSS file. |
| **server→browser data** | The host string is a **literal inside a server module's response payload** (in every case in this snapshot, mock data). The host is never contacted by the server; the URL is handed to the browser as a field and rendered as a link. |
| **dead-doc** | The only references are in a dead or non-executing artifact: root `index.html`, `*.bak`, `*_old*`, `scratch/`, a code comment, or a Markdown document. |
| **build/tooling** | Referenced by build or tool configuration rather than application code. |

### Data classification

| Value | Meaning |
|---|---|
| **business data** | Repo code sends records, payloads, or identifiers about leads, bookings, partners, patients, or payments. |
| **auth tokens** | Repo code sends or receives credentials, OAuth codes, access/refresh tokens, or API keys. |
| **uploaded files** | Repo code sends file bytes. |
| **audio/media** | Repo code fetches or streams recordings, audio, or video. |
| **link-out** | The browser is handed off to the host by anchor or `window.open`. No payload is sent by this repo beyond whatever is in the URL. |
| **read-only** | Repo code retrieves data and does not send a mutating payload. |
| **asset-only** | Static fonts, icons, sounds, images, or WASM binaries. No repo data is sent. |
| **none** | No traffic originates from this repository for this host. |

## 3. Host matrix — Kairali- and KTAHV-branded hosts

These carry Kairali or KTAHV branding **in the string**. That is the entire basis for grouping them. **Domain registration, DNS control, hosting, and account ownership for every one of them is pending external verification**, and no claim of Kairali ownership is made here.

| # | Host | Referencing files | Layer | Apparent purpose | Data classification | Pending external verification |
|---|---|---|---|---|---|---|
| 1 | `www.kairali.com` | `components/dashboard-layout.tsx:226` (Portal Hub "Media Download Centre"); `app/fms/bookings/team/page.tsx:7136` (`window.open` KTAHV reservation form); `components/Loader.tsx:43` live, `:16` commented (loader GIF `<img src>`); `index.html:17` (dead artifact, same GIF) | client + dead-doc | Marketing/media site that also serves a `GoogleScript/KTAHV_Reservation_form/` path and a `KTAHV_PI_GoogleScript/images/` asset path — i.e. it fronts Apps-Script-adjacent content as well as static assets | **link-out** + **asset-only** (the loader GIF is fetched on every render of `Loader`) | Domain/DNS/hosting owner; who publishes the reservation form and the media-assets page; whether the two `GoogleScript` paths are the same Apps Script estate as the deployment matrix; availability guarantees for a GIF on the app's critical loading path |
| 2 | `www.kairali.ai` | `components/dashboard-layout.tsx:222` (Portal Hub "Call Recording Tracker"), `:223` ("Doctor Portal") | client | Two separate Kairali-branded portals under `/Google/callmanagement/` and `/Google/doctor_consulatation/doctor.html` | **link-out**; the destinations plausibly hold call recordings and doctor-consultation records, but this repo sends them nothing | Domain owner; who operates each portal and where its code lives; what data each holds; access control on both — the CRM side gates these menu entries **only** by the client-side permission strings `call_recording_portal.view` / `doctor_portal.view`, which hide a menu item and restrict nothing |
| 3 | `reports.kairali.com` | `app/api/doctor/consultations/route.ts` (8 refs: `clientReportLink`, `clientReportsLink`, `doshaTestReportLink`, `healthAssessmentReportLink` for two records) | server→browser data | Client/dosha/health report portal for doctor consultations. Every reference is a literal inside the route's `mockConsultations` array; rendered as anchors at `app/doctor-consultation/page.tsx:903+` | **link-out** (mock-sourced). No server-side fetch exists | Whether the host exists and is Kairali-operated; whether real consultation reports live there; whether the mock URL shape matches any real one; access control on patient reports |
| 4 | `upload.kairali.com` | `app/api/doctor/consultations/route.ts` (2 refs: `reportsUploadUrl`) | server→browser data | Upload destination for consultation reports; mock literal, rendered as an anchor at `app/doctor-consultation/page.tsx:964` | **link-out**; the *destination* is an upload endpoint, but no upload is performed by this repo | Owner and hosting; whether patient report uploads actually land there; authentication on the upload path; retention |
| 5 | `ivr.kairali.com` | `app/api/doctor/consultations/route.ts` (3 refs: `ivrUrl`) | server→browser data | IVR call recording/playback links for consultations; mock literals, rendered as anchors at `app/doctor-consultation/page.tsx:830` | **link-out** to **audio/media**. Note: `ivr.kairali.com` is **not** in the `/api/recording` allowlist (§5), so an IVR URL on this host handed to that proxy would be rejected | Owner and hosting; whether real call recordings are served there; whether recordings are access-controlled or URL-guessable; retention |
| 6 | `reports.ktahv.com` | `app/fms/complaints/page.tsx:125,168,210`; `app/fms/complaints/[id]/page.tsx:44` | client | `finalReportPDFLink` on complaint records — CAPA final-report PDFs | **link-out**. Both files hold hard-coded complaint arrays (`useState<Complaint[]>([…])` at `page.tsx:90`; `mockComplaintDetail` at `[id]/page.tsx:10`), so these are sample values shipped in the bundle | Owner and hosting; whether real CAPA reports are published there; whether PDF URLs are guessable or authenticated |
| 7 | `chat.ktahv.com` | `app/fms/complaints/page.tsx:123,166,208`; `app/fms/complaints/[id]/page.tsx:42` | client | `chatHistoryLink` on complaint records — guest chat transcripts | **link-out**; destination holds guest conversation content | Owner and hosting; whether guest chat transcripts are retained there; access control and retention; DPDP exposure of transcript URLs shipped in a browser bundle |
| 8 | `b2b-kairali.vercel.app` | `app/partners/page.tsx:135` (`FOM_URL`), opened at `:1526` via `window.open` | client | Login page of a **second Vercel deployment** — the B2B partner portal | **link-out** to a login page. No credentials or payload cross from this app | **Which Vercel team/project serves this**, its relationship to this project, who can deploy it, where its source lives, and whether it shares the CRM's database, session secret, or Apps Script estate. Already open as `ECOSYSTEM.md` §9 item 3 |
| 9 | `kairali.zoom.us` | `lib/meeting-url-parser.ts:42` — **comment only** | dead-doc (in a client-imported module) | Example of a Zoom vanity-subdomain URL the parser is expected to handle | **none** — the string is a comment and is stripped at build | Whether a Kairali Zoom vanity domain exists and who administers the Zoom account (same question as `ECOSYSTEM.md` §9 item 6) |

Hosts 3, 4, 5 sit in `app/api/doctor/**`, which `ECOSYSTEM.md` §3 already flags as mock-backed and *"appearing production-real without a sample label"*. That flag applies directly to these four Kairali-branded URLs: nothing in the UI distinguishes them from real links.

## 4. Host matrix — third-party SaaS, API, CDN, and asset hosts

| # | Host | Referencing files | Layer | Apparent purpose | Data classification | Pending external verification |
|---|---|---|---|---|---|---|
| 10 | `docs.google.com` | `app/fms/pending-tasks/data.ts` (**162 spreadsheet URLs, 133 distinct spreadsheet IDs**); `app/fms/bookings/page.tsx:746` (Google Form, prefilled via `entry.*`); `app/api/doctor/consultations/[id]/route.ts:31` and `.../stages/route.ts:41` (truncated placeholder form URLs); `index.html:4507` (dead artifact, help text) | client + server→browser data + dead-doc | **The single largest external surface in this repository after Apps Script.** `data.ts` is a checked-in dataset of pending-task rows, each carrying a deep link (`/edit?gid=…&range=…`) into a specific Google Sheet, tab, and cell. It is imported live by `app/fms/pending-tasks/page.tsx:4` and rendered as an anchor at `:1136`, and by the dead `page.tsx.bak:4`. The bookings-page reference is a prefilled Google Form link-out | **link-out** at every site — but the *link set itself is business data*: 133 spreadsheet identities, their tab IDs, cell ranges, FMS names, companies, PC/doer/DME names, and pending/delay counts are all hard-coded and shipped in the browser bundle | Owner of each of the 133 spreadsheets; their sharing scope (a link is only a link if the sheet is restricted — **whether any of the 133 is world-readable is unknown and cannot be checked from here**); whether they overlap the spreadsheets bound to the 58 Apps Script deployments; whether the checked-in pending/delay figures are stale; owner and response destination of the Google Form |
| 11 | `drive.google.com` | `lib/google-drive.ts:107` live, `:42,:50` commented; `components/ksereve-billing-auditer/RecordingModal.tsx:53` (`/preview` iframe) + `:14–16` comments; `components/viewcallhistorymodel.tsx:263,265` (`uc?export=download` audio); `app/new-order-fms/page.tsx:206,213` (`/thumbnail` images); `components/Booking Form/BookingFormBase.tsx:384–386` comments; `components/Booking Form/BookingFormSteps2.tsx:117` help text; `components/billing-and-partner-intelligance-modal.tsx` (6 Drive-link form fields); `scratch/booking_data_result.json:83,93` (dead artifact, two real-looking file links); `index.html` ×4 (dead artifact) | server + client + dead-doc | Web-view/preview/download/thumbnail surfaces for Drive-hosted content: meeting recordings uploaded by `lib/google-drive.ts`, KSereve billing call recordings, new-order screenshots, and partner compliance documents (GST certificate, PAN card, cancelled cheque, agreement copy, agency logo) that users paste as Drive links | **audio/media** (recording preview and download), **uploaded files** (via the `www.googleapis.com` upload endpoint; `drive.google.com` is the resulting `webViewLink`), **business data** (the partner-document links are stored and displayed) | Ownership and sharing scope of the target Drive folder and of every user-pasted document link; whether partner KYC documents (PAN, GST, cheque) sit in personal Drives; retention; whether `scratch/booking_data_result.json` — tracked in Git — points at live files that are still shared. Overlaps `ECOSYSTEM.md` §7 (Drive) |
| 12 | `www.googleapis.com` | `app/api/calendar/meetings/route.ts:83` live, `:252` commented; `app/api/calendar/mobile/route.ts:92` (**owner-deferred**); `app/api/auth/[...nextauth]/route.ts:64,65` (scope strings); `lib/google-drive.ts:76` live, `:12` commented (scope string); `app/api/meetings/audio/route.ts:16`, `create-upload-session/route.ts:23,88` (**owner-deferred**) | server | Google Calendar v3 event reads and the **Drive resumable upload endpoint** (`/upload/drive/v3/files?uploadType=resumable`); also the canonical prefix for OAuth scope identifiers | **auth tokens** (bearer on every call), **business data** (calendar events), **uploaded files** (meeting recording bytes) | Google Cloud project behind the OAuth client and the Drive service account; consent-screen configuration; scope grants actually approved; quota and billing owner. `ECOSYSTEM.md` §9 item 5 |
| 13 | `oauth2.googleapis.com` | `app/api/auth/[...nextauth]/route.ts:28`; `app/api/calendar/mobile/route.ts:16` (**owner-deferred**); `app/api/meetings/create-upload-session/route.ts:24` (JWT `aud`), `:56` (token POST) (**owner-deferred**) | server | Google OAuth token endpoint — refresh-token exchange for the user flow, and service-account JWT-bearer exchange for the Drive flow | **auth tokens** — client ID, client secret, refresh token, and signed service-account JWTs are sent here. This is the highest-sensitivity third-party host in the matrix | Same Google Cloud project questions as #12, plus rotation status of the OAuth client secret and the service-account private key (`docs/PHASE_6_ENVIRONMENT_VARIABLE_MATRIX.md` §8, follow-ups 4–5) |
| 14 | `meet.googleapis.com` | `app/api/meetings/meet-status/route.ts:26,40`; `app/api/meetings/meet-participants/route.ts:178,211,255` live and `:59,:77,:96` commented (**all owner-deferred**) | server | Google Meet v2 — space lookup, conference records, participant lists | **auth tokens** + **business data** (who attended which internal meeting) | Meet API enablement and quota on the same Cloud project; whether participant data retention is acceptable. Listed for completeness; owner-deferred |
| 15 | `generativelanguage.googleapis.com` | `lib/config.ts:17` (single reference; `lib/config.ts` is imported only by `app/api/generate-followup/route.ts` and `app/api/stalled-deals/route.ts`) | server | Gemini `generateContent` REST endpoint for follow-up message generation | **auth tokens** (`GEMINI_API_KEY`) + **business data** (lead/deal context is placed in the prompt) | Which Google account/project holds the Gemini key; billing owner; data-retention setting for prompts submitted to the API; whether the pinned model string in `lib/config.ts` is a valid model at this endpoint |
| 16 | `meet.google.com` | `app/meetings/page.tsx:846` (builds join link), `:3685` (placeholder text); `app/meet/page.tsx:1165` (placeholder text); `app/api/calendar/meetings/route.ts:35` live, `:205` commented (strips the prefix off `hangoutLink`); `app/api/meetings/meet-participants/route.ts:167,168` live, `:45–48` commented (**owner-deferred**); `app/api/doctor/consultations/[id]/route.ts:30` (mock link); `lib/meeting-url-parser.ts:23` comment | client + server + server→browser data | Meet join URLs — constructed for the user, and string-stripped server-side to recover a meeting code | **link-out** (the browser joins the meeting) | Google Workspace domain/policy governing Meet; recording and retention policy for meetings joined this way |
| 17 | `calendar.google.com` | `app/api/doctor/consultations/route.ts:20,65,110` (`doctorCalendarLink`) | server→browser data | Doctor calendar links on consultation records; mock literals | **link-out** (mock-sourced) | Whether real doctor calendars are shared this way and with whom |
| 18 | `forms.gle` | `app/api/doctor/consultations/[id]/route.ts:33`; `app/api/doctor/consultations/[id]/stages/route.ts:65` | server→browser data | Shortened Google Form links in the doctor-consultation workflow ("post form"); mock literals | **link-out**; the destination form collects data | Which Google account owns the form, where responses land, who can read the response sheet |
| 19 | `fonts.googleapis.com` | `components/Booking Form/BookingForm.css:4` (`@import url(...)`, DM Sans), imported by `BookingForm.tsx`, `BookingFormBase.tsx`, `BookingFormSteps1.tsx` | client (+ build) | Web font for the KTAHV booking form | **asset-only** | None material to ownership. Note the *implicit* dependency: `app/layout.tsx:4` and `app/api/wasted-leads/route.ts:4` import from `next/font/google`, which fetches from `fonts.googleapis.com` and `fonts.gstatic.com` **at build time**. `fonts.gstatic.com` never appears literally in source. `docs/AUDIT_WORKPACK_CROSS_REFERENCE.md` §1 already records that `npm run build` succeeds only when Google Fonts are reachable — an unpinned build-time network dependency |
| 20 | `api.openai.com` | `app/api/meetings/transcribe/route.ts:536,572` (**owner-deferred**) | server | Whisper audio-transcription endpoint, called by raw `fetch` with an interpolated bearer header | **auth tokens** + **uploaded files** + **audio/media** — meeting recording bytes leave the estate here | OpenAI account/organisation owner, billing, key rotation, and **whether the account's data-retention / training settings exclude submitted audio**. `ECOSYSTEM.md` §9 item 6. Owner-deferred path; listed for completeness |
| 21 | `api.zoom.us` | `app/api/zoom/callback/route.ts:43`; `app/api/meetings/zoom-status/route.ts:42,67,79`, `zoom-participants/route.ts:32,47`, `zoom-meeting-status/route.ts:43` (last four **owner-deferred**) | server | Zoom REST v2 — current user, meeting status, participant reports | **auth tokens** + **business data** (attendee identity and participation reports) | Zoom account/app owner, app scopes granted, whether the app is account-level or user-level, retention of participant reports. `ECOSYSTEM.md` §9 item 6 |
| 22 | `zoom.us` | `app/api/zoom/connect/route.ts:18` (authorize redirect); `app/api/zoom/callback/route.ts:21` (token POST); `app/meetings/page.tsx:847` (join link), `:3685` and `app/meet/page.tsx:1165` (placeholders); `app/api/calendar/mobile/route.ts:50` (substring test, **owner-deferred**); `lib/meeting-url-parser.ts:39,41` comments | server + client | Zoom OAuth authorize and token endpoints, plus user-facing join links | **auth tokens** (client ID/secret and the authorization code cross here) + **link-out** | Same Zoom account questions as #21, plus whether the registered redirect URI matches `ZOOM_REDIRECT_URI` per environment (`docs/PHASE_6_ENVIRONMENT_VARIABLE_MATRIX.md` §8 follow-up 15) |
| 23 | `us04web.zoom.us` | `lib/meeting-url-parser.ts:40` — **comment only** | dead-doc | Example of a Zoom regional-subdomain URL form | **none** — comment, stripped at build | None; recorded so the sweep is complete |
| 24 | `appsheet.com` | `app/api/doctor/consultations/[id]/route.ts:32` (`nabhForm`) | server→browser data | AppSheet no-code app used for the NABH form in the doctor-consultation workflow; mock literal | **link-out**; the destination is a data-entry app | AppSheet account owner, the backing data source, licensing, and who can access the app. `ECOSYSTEM.md` §9 item 6 |
| 25 | `squadiq-call-recs.s3.amazonaws.com` | `app/api/audio-proxy/route.ts:16` (`ALLOWED_HOST`, exact match) and `:15` (comment naming two near-miss attacker hostnames); `app/leads/assign/page.tsx:750`; `app/leads/duplicates/assign/page.tsx:90` | server + client | AWS S3 bucket holding SquadIQ call recordings. Phase 1 hardened `/api/audio-proxy` to this **exact** hostname with HTTPS-only, no-credentials, no-port, no-redirect checks | **audio/media**, **read-only** (server-side GET with Range streaming). The two client references are hard-coded sample recording URLs in `getSqvData` | Who owns the S3 bucket and the SquadIQ account; bucket policy and whether objects are public or presigned; retention; whether the checked-in sample object is still readable — `docs/REVIEW_CHANGELOG.md` records that the repository's hard-coded sample currently returns **403**, so live playback verification is still outstanding. `ECOSYSTEM.md` §9 item 6 |
| 26 | `dialer1.elisiontec.com` | `app/MR-FMS/page.tsx` — **25 references, every one inside a commented-out mock data block** | dead-doc | Elision dialer call-recording MP3 URLs for MR-FMS leads | **none** today (all commented). Were they live, they would be **audio/media** — and note the block mixes `http://` and `https://` recording URLs, i.e. cleartext | Elision dialer account owner; whether these recordings still exist and are URL-guessable; **whether the commented URLs constitute retained personal data in Git history** — they embed customer phone numbers in the filenames, alongside free-text remarks naming customers and locations |
| 27 | `dialer.elisiontec.com` | `app/MR-FMS/page.tsx` — **6 references, all commented-out**, all `http://` | dead-doc | Second Elision dialer hostname, same recording path shape | **none** today; same caveat as #26 | Same as #26; also whether the two dialer hostnames are one tenant or two |
| 28 | `tinyurl.com` | `app/fms/complaints/page.tsx:1517, 1536, 1728` | client | URL shortener fronting a complaint's chat-history link, a proof screenshot, and a second screenshot — rendered as live anchors in the complaint detail panel | **link-out** through an **opaque third-party redirector**. The final destination is not visible in source and cannot be determined without following the link | Who created these three short links and what they resolve to; whether the underlying content is access-controlled; TinyURL account ownership (short links are typically anonymous and **not revocable or editable** without one). A shortener in a live workflow means a third party can observe or repoint traffic |
| 29 | `wa.me` | `app/deal-assistant/page.tsx:533` (`window.open`) | client | WhatsApp click-to-chat handoff for deal follow-ups | **link-out**, but the URL carries a **customer phone number and a generated message body** in the query string. `ECOSYSTEM.md` §4 correctly records "no server API, no webhook" | Nothing to own — `wa.me` is Meta-operated. Worth recording that customer phone numbers and message text transit a Meta URL and land in browser history |
| 30 | `unpkg.com` | `lib/audio-compress.ts:19` (`BASE_URL`), consumed at `:31–32` via `toBlobURL` for `ffmpeg-core.js` and `ffmpeg-core.wasm`; imported by `app/meetings/page.tsx:8` | client | ffmpeg.wasm core binary, fetched **at runtime from a third-party CDN** into the audio-compression path before meeting upload | **asset-only** by classification, but this is executable WASM + JS loaded into the page at runtime, version-pinned in the path (`@0.12.6`) and not integrity-checked. `ECOSYSTEM.md` §4 already calls it "an uncontrolled third-party CDN dependency in the audio path" | unpkg is community-operated with no availability or integrity guarantee. Pending: whether self-hosting the core binary is acceptable, and whether the audio path degrades gracefully when unpkg is unreachable (`:104` logs a warning and falls back to the original blob) |
| 31 | `cdnjs.cloudflare.com` | `components/Booking Form/BookingForm.css:5` (`@import`, Font Awesome 6.5.0), imported by three booking-form components; `index.html:8` (dead artifact) | client + dead-doc | Font Awesome icon stylesheet | **asset-only** | Third-party CDN with no integrity attribute on the import; availability is outside Kairali's control |
| 32 | `assets.mixkit.co` | `contexts/notification-context.tsx:53, 55` | client | Two notification sound effects, constructed as `new Audio(...)` on provider mount — so the notification system depends on a remote host on every session | **asset-only** | Mixkit licensing terms for commercial use of the two SFX; availability. `docs/AUDIT_WORKPACK_CROSS_REFERENCE.md` §5 item 7 already flags remote notification sounds with no user preference |
| 33 | `img.icons8.com` | `app/meetings/page.tsx:70, 74, 78` (Google Meet, Zoom, Microsoft Teams platform icons) | client | Platform icons rendered as remote `<img>` tags | **asset-only** | Icons8 licensing for commercial use and hotlinking; availability. `app/meetings/page.tsx` is a browser page, not `/api/meetings/*` — recorded as an observation only |
| 34 | `ui.shadcn.com` | `components.json:2` (`"$schema"`) | build/tooling | JSON Schema identifier for the shadcn/ui component config | **none** — a schema URI; resolved by an editor at most, never by the application | None |
| 35 | `www.tiket.com` | `app/api/ktahv-bookings/route.ts:13` | server | A member of the `CHANNEL_MANAGERS` set. **The full URL is the label** — the set is compared against booking-source strings; nothing is fetched | **none** (a data value, not an endpoint) | Whether the OTA integration exists anywhere outside this label list — no code in this repo talks to it |
| 36 | `www.roomsorder.com` | `app/api/ktahv-bookings/route.ts:13` | server | Same `CHANNEL_MANAGERS` set, same label semantics | **none** | Same as #35 |
| 37 | `recordings.example.com` | `app/leads/assign/page.tsx:740` | client | Randomly generated placeholder recording URLs in a mock call-history generator | **none** — `example.com` is IANA-reserved and can never resolve to a real service | None. Recorded because it is indistinguishable from a real recording link in the rendered UI — the same "mock looks production-real" pattern `ECOSYSTEM.md` §3 flags |
| 38 | `github.com` | `ECOSYSTEM.md:37` only (the local `origin` remote URL, already documented there) | dead-doc | Git remote of record | **none** from application code | Repository ownership, visibility, collaborators, and branch protection — already open as `ECOSYSTEM.md` §9 item 1 |
| 39 | `help.github.com` | `.gitignore:1` (comment) | dead-doc | Boilerplate documentation link in the generated `.gitignore` header | **none** | None |

## 5. Host **patterns** — the `/api/recording` proxy allowlist

`app/api/recording/route.ts:16–30` defines a 13-entry regular-expression allowlist for a server-side audio relay (`/api/recording?url=<encoded IVR url>`). These are the only appearances of most of these domains anywhere in the repository — **no literal URL on any of them is checked in**. The route accepts a caller-supplied URL, matches its hostname against the list, and streams the response with `redirect: "follow"`.

| Pattern | Vendor / meaning | Literal URL anywhere in repo? |
|---|---|---|
| `(^\|\.)servetel\.in$` | Servetel cloud telephony | No |
| `(^\|\.)tatateleservices\.com$` | Tata Tele Business Services | No |
| `(^\|\.)smartflo\.tatatele\.com$` | Tata Smartflo cloud call centre | No |
| `(^\|\.)exotel\.com$` | Exotel | No |
| `(^\|\.)exotel\.in$` | Exotel (India) | No |
| `(^\|\.)myoperator\.co$` | MyOperator | No |
| `(^\|\.)knowlarity\.com$` | Knowlarity | No |
| `(^\|\.)kaleyra\.com$` | Kaleyra | No |
| `(^\|\.)googleapis\.com$` | Any Google API subdomain | Yes — see #12–#15 |
| `(^\|\.)google\.com$` | **Any** `google.com` subdomain | Yes — see #10, #16, #17 |
| `(^\|\.)googleusercontent\.com$` | Google user-content hosts | No |
| `(^\|\.)amazonaws\.com$` | **Any** AWS host | Only the SquadIQ bucket, #25 |
| `(^\|\.)cloudfront\.net$` | **Any** CloudFront distribution | No |

Three repo-verified observations, recorded as observations and not as change requests:

1. **Eight telephony vendors are allowlisted that appear nowhere else in the tree.** Either historical IVR providers, aspirational entries, or providers used by systems whose code is not in this repository. Which (if any) is current is **pending external verification**, and the answer bears directly on `ECOSYSTEM.md` §9 item 6.
2. **The last four patterns are suffix matches on very large shared domains.** `(^|\.)amazonaws\.com$` admits every S3 bucket on earth, `(^|\.)cloudfront\.net$` every CloudFront distribution, and `(^|\.)google\.com$` every Google subdomain. `app/api/audio-proxy/route.ts:14–15` explicitly documents the opposite choice for the same threat — an **exact** host match, with a comment naming why a suffix check is unsafe. The two audio proxies in this repository therefore apply materially different host policies.
3. **`ivr.kairali.com` (#5) is not on this list.** The doctor-consultation IVR links could not be proxied through `/api/recording` as written.

`/api/recording` sits behind the Phase 1 middleware session boundary, so the allowlist is not reachable anonymously. This document does not propose changing any of it.

## 6. Excluded from the totals, with reasons

| String | Where | Why excluded |
|---|---|---|
| `script.google.com` | 88 references across 56 files | **Out of scope by instruction**; fully covered by `docs/PHASE_6_APPS_SCRIPT_DEPLOYMENT_MATRIX.md`. Counted nowhere below. |
| `www.w3.org` | 17 references across `public/*.svg`, `app/riya-sharma/page.tsx`, `app/leads/duplicates/assign/page.tsx`, `components/ksereve-billing-auditer/FiltersCard.tsx` | SVG XML-namespace URIs (`xmlns="http://www.w3.org/2000/svg"`). A namespace identifier, never dereferenced. Not a network dependency. |
| `localhost` | 16 references, all in `app/api/{total-traffic,expense,payment}/route.ts` usage-comment blocks | Local development addresses in comments. Not external. |
| `https://...` | `app/fms/bookings/new/page.tsx:592` | A literal input `placeholder` string, not a host. |
| `evil-squadiq-call-recs.s3.amazonaws.com` | `app/api/audio-proxy/route.ts:15` | A hostname named **in a comment as an example of what the exact-match check rejects**. Not a dependency. |
| `prev.m.ai`, `recordings.example.com` (as a domain) | code expressions / reserved TLD | `prev.m.ai` is a false positive from the property chain `prev.m.ai` in meeting code. `recordings.example.com` **is** counted, as row #37, because it renders as a link. |

## 7. Summary

All figures repo-verified against the current working tree, and **all exclude `script.google.com`** per §1.

### Totals

| Measure | Count |
|---|---:|
| **Distinct literal external hosts in checked-in source and docs-relevant config** | **39** |
| Additional **domain patterns** allowlisted in `/api/recording` (§5) | **13** |
| **Total host entries inventoried** | **52** |
| Excluded by instruction (`script.google.com`) | 1 host, 88 references |
| Excluded as non-network strings (§6) | 3 (`www.w3.org`, `localhost`, and two comment/placeholder artifacts) |

### First-party-looking (Kairali/KTAHV-branded) hosts — 9

`www.kairali.com`, `www.kairali.ai`, `reports.kairali.com`, `upload.kairali.com`, `ivr.kairali.com`, `reports.ktahv.com`, `chat.ktahv.com`, `b2b-kairali.vercel.app`, `kairali.zoom.us`.

Of these: **7** are on the `kairali.com` / `kairali.ai` / `ktahv.com` apex domains; **1** (`b2b-kairali.vercel.app`) is a Kairali-named project on Vercel's shared domain; **1** (`kairali.zoom.us`) is a Zoom-hosted vanity subdomain appearing only in a comment. **Ownership of all 9 is pending external verification.** Branding in a string is not evidence of control.

**5 of the 9 are referenced only from mock data** (`reports.kairali.com`, `upload.kairali.com`, `ivr.kairali.com`, `reports.ktahv.com`, `chat.ktahv.com`) — they render as production-looking links in the doctor-consultation and complaints UIs with no sample label.

### Third-party SaaS / API / CDN hosts — 30 literal + 13 patterns

| Group | Hosts |
|---|---|
| Google (non-Apps-Script) — 10 | `docs.google.com`, `drive.google.com`, `www.googleapis.com`, `oauth2.googleapis.com`, `meet.googleapis.com`, `generativelanguage.googleapis.com`, `meet.google.com`, `calendar.google.com`, `forms.gle`, `fonts.googleapis.com` |
| Zoom — 3 | `zoom.us`, `api.zoom.us`, `us04web.zoom.us` |
| AI — 2 | `api.openai.com`, `generativelanguage.googleapis.com` (also counted under Google) |
| Telephony / recordings — 3 literal + 8 patterns | `squadiq-call-recs.s3.amazonaws.com`, `dialer1.elisiontec.com`, `dialer.elisiontec.com`; plus Servetel, Tata Teleservices, Smartflo, Exotel ×2, MyOperator, Knowlarity, Kaleyra as allowlist patterns |
| No-code / forms — 2 | `appsheet.com`, `forms.gle` (also counted under Google) |
| CDN / assets — 4 | `unpkg.com`, `cdnjs.cloudflare.com`, `assets.mixkit.co`, `img.icons8.com` |
| Redirector / messaging — 2 | `tinyurl.com`, `wa.me` |
| Tooling / documentation — 2 | `ui.shadcn.com`, `github.com` (+ `help.github.com`) |
| Data labels, not endpoints — 2 | `www.tiket.com`, `www.roomsorder.com` |
| Reserved placeholder — 1 | `recordings.example.com` |

### Browser-reachable vs. server-only

An external host is **browser-reachable** when its string ships to the client — either because the reference is in browser-shipped code, or because a server module emits it as a data field the UI renders as a link.

| Class | Count | Hosts |
|---|---:|---|
| **Browser-reachable** | **24** | `www.kairali.com`, `www.kairali.ai`, `reports.kairali.com`*, `upload.kairali.com`*, `ivr.kairali.com`*, `reports.ktahv.com`, `chat.ktahv.com`, `b2b-kairali.vercel.app`, `docs.google.com`, `drive.google.com`, `meet.google.com`, `calendar.google.com`*, `forms.gle`*, `fonts.googleapis.com`, `zoom.us`, `appsheet.com`*, `squadiq-call-recs.s3.amazonaws.com`, `tinyurl.com`, `wa.me`, `unpkg.com`, `cdnjs.cloudflare.com`, `assets.mixkit.co`, `img.icons8.com`, `recordings.example.com` |
| **Server-only** | **8** | `www.googleapis.com`, `oauth2.googleapis.com`, `meet.googleapis.com`, `generativelanguage.googleapis.com`, `api.openai.com`, `api.zoom.us`, `www.tiket.com`, `www.roomsorder.com` — plus all 13 `/api/recording` allowlist patterns |
| **Dead-doc / comment / tooling only** | **7** | `kairali.zoom.us`, `us04web.zoom.us`, `dialer1.elisiontec.com`, `dialer.elisiontec.com`, `ui.shadcn.com`, `github.com`, `help.github.com` |

\* reaches the browser as **mock data emitted by a server route**, not as a client-code literal.

**Every credential-bearing call is made from server code.** The seven hosts that receive auth tokens — `oauth2.googleapis.com`, `www.googleapis.com`, `meet.googleapis.com`, `api.zoom.us`, `zoom.us`, `api.openai.com`, `generativelanguage.googleapis.com` — are contacted only from `app/api/**` or a server-only `lib/` module. `zoom.us` also appears in browser-shipped code, but only as a user-facing join link; its OAuth authorize redirect and token exchange are both server-side (`app/api/zoom/connect/route.ts:18`, `app/api/zoom/callback/route.ts:21`). No secret leaves the server in this snapshot — consistent with `docs/PHASE_6_ENVIRONMENT_VARIABLE_MATRIX.md` §6, which finds no secret-class environment variable referenced from any client module.

### By data classification (a host may appear in more than one row)

| Classification | Hosts |
|---|---|
| **auth tokens** | `oauth2.googleapis.com`, `www.googleapis.com`, `meet.googleapis.com`, `api.zoom.us`, `zoom.us`, `api.openai.com`, `generativelanguage.googleapis.com` — **7** |
| **uploaded files** | `www.googleapis.com` (Drive resumable upload), `api.openai.com` (audio bytes) — **2** |
| **audio / media** | `squadiq-call-recs.s3.amazonaws.com`, `drive.google.com`, `api.openai.com`, `ivr.kairali.com` (link-out), the two Elision dialer hosts (commented), and the 13 `/api/recording` allowlist patterns |
| **business data** | `www.googleapis.com`, `meet.googleapis.com`, `api.zoom.us`, `generativelanguage.googleapis.com`, `drive.google.com`; and — indirectly but materially — `docs.google.com`, whose 133 checked-in spreadsheet links *are themselves* a business-data inventory |
| **link-out only** | `www.kairali.ai`, `b2b-kairali.vercel.app`, `reports.kairali.com`, `upload.kairali.com`, `ivr.kairali.com`, `reports.ktahv.com`, `chat.ktahv.com`, `calendar.google.com`, `forms.gle`, `appsheet.com`, `meet.google.com`, `tinyurl.com`, `wa.me`, `docs.google.com` |
| **asset-only** | `unpkg.com`, `cdnjs.cloudflare.com`, `assets.mixkit.co`, `img.icons8.com`, `fonts.googleapis.com`, `www.kairali.com` (loader GIF) — **6** |
| **none** (label, comment, schema, or reserved) | `www.tiket.com`, `www.roomsorder.com`, `ui.shadcn.com`, `github.com`, `help.github.com`, `kairali.zoom.us`, `us04web.zoom.us`, `recordings.example.com` — **8** |

### Concentration

| Host references | File |
|---:|---|
| 162 | `app/fms/pending-tasks/data.ts` — 133 distinct Google Sheets, one host |
| 31 | `app/MR-FMS/page.tsx` — Elision dialer recordings, **all commented out** |
| 16 | `app/api/doctor/consultations/route.ts` — 3 Kairali-branded hosts (13 refs) plus `calendar.google.com` (3), every one a mock literal |
| 9 | `app/fms/complaints/page.tsx` — `reports.ktahv.com` (3), `chat.ktahv.com` (3), `tinyurl.com` (3) |
| 3 | `components/dashboard-layout.tsx` — Portal Hub: `www.kairali.ai` ×2, `www.kairali.com` ×1 (its Apps Script entries are excluded per §1) |

## 8. Manual follow-ups

Owner/operations actions. **None can be closed from inside this repository**, and none is a code change proposed by this document. Items that duplicate an existing open item are cross-referenced rather than renumbered.

**Ownership and access**

1. **Establish domain and hosting ownership for all 7 apex-domain Kairali/KTAHV hosts** (`www.kairali.com`, `www.kairali.ai`, `reports.kairali.com`, `upload.kairali.com`, `ivr.kairali.com`, `reports.ktahv.com`, `chat.ktahv.com`): registrar, DNS operator, hosting, TLS management, who can change records, and where each system's source lives. Extends `ECOSYSTEM.md` §9 item 7 — which named five of these — to all seven.
2. **Confirm whether the five mock-only Kairali hosts exist at all.** `reports.kairali.com`, `upload.kairali.com`, `ivr.kairali.com`, `reports.ktahv.com`, and `chat.ktahv.com` appear **only** in mock data. They may be live systems, planned systems, or invented sample strings. The repository cannot distinguish these cases, and the UI presents them identically.
3. **Audit the 133 Google Sheets in `app/fms/pending-tasks/data.ts`** — owner, sharing scope (restricted vs. link-accessible vs. public), and overlap with the spreadsheets bound to the 58 Apps Script deployments. Every one of the 133 links is shipped in the browser bundle. This is the largest single external-artifact set in the repository after the Apps Script deployments and is not covered by `ECOSYSTEM.md` §9 item 4.
4. **Identify the Vercel project behind `b2b-kairali.vercel.app`** and whether it shares this app's database, session secret, or Apps Script estate. Already `ECOSYSTEM.md` §9 item 3.
5. **Identify the Google Form owner and response destination** for `app/fms/bookings/page.tsx:746`, and for the two placeholder form URLs in the doctor-consultation routes.
6. **Identify the AppSheet app owner and its backing data source** (`ECOSYSTEM.md` §9 item 6).
7. **Resolve and take ownership of the three `tinyurl.com` links** in `app/fms/complaints/page.tsx`. Determine what each resolves to, whether the destination is access-controlled, and whether an account controls them — anonymous short links generally cannot be edited or revoked. Replace with direct links or a Kairali-controlled redirect if the destinations are legitimate.
8. **Determine the current IVR/telephony vendor** and reconcile it against the 13-entry `/api/recording` allowlist. Eight vendors are allowlisted with no other trace in the repository; the two Elision dialer hosts appear only in commented-out code.

**Data protection**

9. **Assess the commented Elision dialer block in `app/MR-FMS/page.tsx`** (31 references). The URLs embed customer phone numbers in recording filenames and sit beside free-text remarks naming customers and locations. It is dead code that is still tracked in Git, so deleting it does not remove it from history — the same standing caveat as the committed database credentials (`ECOSYSTEM.md` §9 item 9).
10. **Confirm Drive sharing scope for partner KYC documents.** `components/billing-and-partner-intelligance-modal.tsx` collects six user-pasted Drive links including GST certificate, PAN card, and cancelled cheque. Whether these live in Kairali-controlled Drives or in partners' personal accounts is unknown here. Feeds the DPDP review at `ECOSYSTEM.md` §9 item 15.
11. **Check `scratch/booking_data_result.json`** — tracked in Git, listed as dead weight, and containing two real-looking Drive file links to booking screenshots. Confirm whether those files still exist and are shared.
12. **Confirm the OpenAI account's data-retention and training settings** for submitted meeting audio, and the Gemini API's retention setting for submitted prompts. Owner-deferred for the OpenAI path; recorded so the question is not lost.

**Supply chain and availability**

13. **Decide the fate of the runtime `unpkg.com` dependency.** `lib/audio-compress.ts` fetches ffmpeg core JS and WASM from a community CDN with no integrity check, in the meeting-audio path. Self-hosting or pinning with integrity is the standard remedy; the current fallback silently uses the uncompressed blob.
14. **Record the build-time Google Fonts dependency as a release-blocking external.** `next/font/google` in `app/layout.tsx` means a build fails when `fonts.googleapis.com` / `fonts.gstatic.com` are unreachable — already observed in `docs/AUDIT_WORKPACK_CROSS_REFERENCE.md` §1.
15. **Confirm licensing for the commercial use of `assets.mixkit.co` sound effects and `img.icons8.com` icons**, both hotlinked at runtime.
16. **Decide whether the `www.kairali.com` loader GIF should be self-hosted.** It is fetched by `components/Loader.tsx` on the app's loading path, so an outage on the marketing host degrades the CRM's own loading UI.

**Consistency**

17. **Reconcile the two audio-proxy host policies.** `/api/audio-proxy` uses an exact-host match with an explicit comment explaining why suffix matching is unsafe; `/api/recording` uses suffix regexes including `amazonaws.com`, `cloudfront.net`, and `google.com`. Both are session-gated, so this is a defence-in-depth question, not an open relay. Recorded as an observation; no change is proposed here.
18. **Label the mock-backed modules.** Rows #3, #4, #5, #6, #7, #17, #18, #24, and #37 are all sample data rendered as live links. `ECOSYSTEM.md` §3 and `docs/AUDIT_WORKPACK_CROSS_REFERENCE.md` §5 item 6 already carry this as a Phase 4 item; the external-host view adds that the sample links name **real-looking external hosts**, which makes the mock harder to spot and the follow-up more valuable.

## 9. Reconciliation with `ECOSYSTEM.md` §4

`ECOSYSTEM.md` §4 lists external integrations grouped by service. This matrix enumerates the same tree by host and finds the following differences — all of them additions or attributions, none contradicting a security conclusion there.

| Item | `ECOSYSTEM.md` §4 | This matrix |
|---|---|---|
| `docs.google.com` | Not listed as a host | **133 distinct Google Sheets** deep-linked from `app/fms/pending-tasks/data.ts`, plus a prefilled Google Form in `app/fms/bookings/page.tsx`. The largest non-Apps-Script external surface in the repository. |
| `/api/recording` allowlist | Not mentioned | 13 host patterns, 8 telephony vendors with no other trace in the tree (§5). |
| `drive.google.com` | Listed under Google Drive as service-account uploads | Also used **client-side** for recording preview, download, and thumbnails, and as the destination for six user-pasted partner KYC document links. |
| `calendar.google.com`, `forms.gle`, `appsheet.com` | AppSheet + Google Forms noted | Confirmed, and all three are **mock literals** in `app/api/doctor/**`, not live integrations. |
| Kairali-branded hosts | Seven listed as "separate deployed systems referenced by URL only" | Confirmed, plus the finding that **five of the seven appear only in mock data** — so "separate deployed systems" is itself unverified. `www.kairali.com` additionally serves a live loader asset and a live reservation-form link-out. |
| Elision dialer | "Direct client-side calls to the dialer host" | **Every one of the 31 dialer references is commented out.** No live call to either dialer host exists in this snapshot. The IVR reference `ECOSYSTEM.md` cites in the same row (`ivr.kairali.com`) is a mock literal in `app/api/doctor/consultations/route.ts`, not a client-side call. Recorded as a correction of attribution, not of the security posture. |
| `www.tiket.com`, `www.roomsorder.com` | Not listed | Present, but as **label strings** in the `CHANNEL_MANAGERS` set — not endpoints. |
| `ui.shadcn.com`, `github.com`, `help.github.com`, `recordings.example.com` | Not listed | Present in tooling config, documentation, and mock data respectively; no traffic. |

## 10. How this document was produced

Read-only inspection of the working tree on 2026-08-01:

- `rg -o 'https?://[A-Za-z0-9._~%-]+'` across the tree (excluding `node_modules`, `.next`, `package-lock.json`), piped through `sed`/`sort`/`uniq -c` to produce a frequency-ranked host list; re-run with `-uu --glob '!.git'` to include ignored and hidden files, which produced a set-identical host list and confirmed no host is hidden by an ignore rule.
- A second independent sweep with a **bare-domain** pattern (`\b[a-z0-9-]+(\.[a-z0-9-]+)+\.(com|org|net|io|ai|app|dev|gle|me|us|co|…)\b`, excluding `*.md`) to catch hosts written without a scheme. It surfaced `evil-squadiq-call-recs.s3.amazonaws.com` (a comment example), the `s3.amazonaws.com` / `googleusercontent.com` / `amazonaws.com` allowlist patterns, and the false positive `prev.m.ai`; no otherwise-missed host.
- Targeted `rg -n` per host to enumerate every `file:line`, plus `rg -c` / `rg -l` for the per-host reference and file counts in §3, §4, and §7.
- `rg -o 'docs\.google\.com/spreadsheets/d/[A-Za-z0-9_-]+' | sort -u | wc -l` to establish 133 distinct spreadsheet IDs across 162 references in a single file.
- `sed -n` context reads around every non-trivial reference site to determine live vs. commented vs. dead-file state, and to read the surrounding expression (anchor, `window.open`, `fetch`, `new Audio`, `<img src>`, allowlist constant, set member) that yields the "apparent purpose" and data classification.
- Import tracing with `rg -ln` to fix each host's layer: `lib/config.ts` → API routes only (server); `lib/audio-compress.ts` → `app/meetings/page.tsx` (client); `lib/meeting-url-parser.ts` → `app/meetings/page.tsx`, `app/meet/page.tsx` (client, comments only); `components/Booking Form/BookingForm.css` → three booking-form components (client); `app/fms/pending-tasks/data.ts` → `page.tsx` and `page.tsx.bak`.
- Direct reads of `app/api/recording/route.ts`, `app/api/audio-proxy/route.ts`, `next.config.mjs`, `components.json`, `package.json`, `.gitignore`, and `app/layout.tsx` for configuration- and build-level host references.
- `git ls-files --error-unmatch` to confirm `app/fms/pending-tasks/data.ts`, `index.html`, and `scratch/booking_data_result.json` are tracked.
- Direct reads of `ECOSYSTEM.md`, `docs/PHASE_6_APPS_SCRIPT_DEPLOYMENT_MATRIX.md`, `docs/PHASE_6_ENVIRONMENT_VARIABLE_MATRIX.md`, `docs/AUDIT_WORKPACK_CROSS_REFERENCE.md`, and `docs/REVIEW_CHANGELOG.md` for prior findings, counts, and boundaries.
- `git status --porcelain` before and after, to confirm the working tree is otherwise unchanged and that nothing was staged.

**No external system was accessed, no network call was made, no host in this document was contacted or resolved, no application source was modified, and nothing was staged, committed, or pushed.** `/api/calendar/mobile`, `/api/meetings/*`, mobile authentication, and the Meetings wildcard CORS policy were not inspected for change; hosts referenced from those paths appear in §4 for inventory completeness only, and no change to any of them is proposed. `script.google.com` deployment details are excluded by instruction and remain covered solely by `docs/PHASE_6_APPS_SCRIPT_DEPLOYMENT_MATRIX.md`.
