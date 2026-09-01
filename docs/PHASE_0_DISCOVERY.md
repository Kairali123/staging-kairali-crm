# Kairali CRM — Phase 0 Discovery

Date: 2026-07-30  
Scope: `/Users/kritikakairali/Downloads/KairaliCRM_workbook`  
Mode: read-only application discovery; no product behavior or source code was changed.

## 1. Executive system map

This repository is a Next.js App Router CRM with React client pages and Vercel-style route handlers. The checked-in dependency baseline is Next `^16.0.7`, React `^19.2.1`, TypeScript `^5.9.3`, and NextAuth `^4.24.14`. It contains approximately 164,000 lines across 413 files under `app`, `components`, `hooks`, `contexts`, `lib`, `types`, `utils`, and `data`.

It is a hybrid data system:

- MySQL is accessed directly from server route handlers through `lib/db.ts`.
- Google Apps Script endpoints are used as adapters to many Google Sheets-backed operational systems.
- Google OAuth/NextAuth supplies Calendar and Meet access; refresh tokens are persisted in MySQL.
- A Google service account supplies Drive upload/read/delete for meeting audio.
- Zoom uses a separate OAuth cookie flow.
- OpenAI handles meeting transcription, diarization/processing, and task extraction.
- Gemini generates sales follow-up drafts.
- IndexedDB retains lead caches, recordings, and meeting pipeline checkpoints in the browser.
- Several screens are still driven entirely by local mock/static data while appearing as normal CRM modules.

There are two authentication domains:

1. The core CRM login posts credentials server-side to a Google Apps Script identity endpoint and mints a seven-day, HMAC-signed, HttpOnly `kairali_user` cookie. A localStorage copy supplies client UI state.
2. Meetings/calendar use a separate NextAuth Google JWT session with Google access and refresh tokens.

`middleware.ts` protects a named set of UI route prefixes, but explicitly excludes all `/api` routes. Only a small subset of route handlers performs its own session or bearer-token check.

## 2. Repository structure

| Area | Purpose |
|---|---|
| `app/` | 61 user-facing page routes, layouts/loading states, 101 API route files, and one server action module |
| `components/` | CRM feature modals, booking forms, navigation, notification/chat widgets, analytics blocks, and Radix/shadcn UI primitives |
| `hooks/` | Data adapters and client state for auth, leads, bookings, calls, reports, voice data, marketing, and employees |
| `contexts/` | Global loader and notification polling/audio state |
| `lib/` | MySQL pool, session signing, API auth, Drive, browser persistence, meeting pipeline, AI prompts, parsing, and general helpers |
| `types/` | Domain contracts for analytics, billing, booking, calls, CRR, FMS, helpdesk, leads, and performance |
| `utils/` | Duplicate-submit guard and standardized toast helpers |
| `data/` | Billing mock rows, static notifications, and rejected-partner seed data |
| `public/` | Logos, report imagery, QR image, placeholders, and property assets |
| `scratch/`, root scratch scripts, `temp/` | Database/schema inspection artifacts and an alternate booking page; not part of routed production UI |

The Git root is the parent `Downloads` directory, not this application folder. Repository status therefore includes many unrelated neighboring files; this report and all checks were scoped to `KairaliCRM_workbook`.

## 3. Cross-cutting application shell and access control

### `app/layout.tsx`

The root layout mounts `AuthProvider`, `RouteGuard`, `LeadsProvider`, `NotificationProvider`, `ContentProtectionProvider`, the NextAuth session provider, Sonner toasts, and the global CRM chat widget. It loads the Inter font and global CSS. A full older implementation remains commented below the live implementation.

### `components/dashboard-layout.tsx`

This is the main authenticated shell: sidebar, permission-filtered navigation, nested Marketing/FMS/Voice menus, global search, notification menu, cache clearing, page refresh, and logout. It also links to external operational portals (sales targets, call recordings, doctor portal, partner capture, and the media center). Some submenu destinations have no corresponding page in this repository, including the `/employee/*` and `/sales/{analytics,revenue,pipeline,metrics}` links.

### `hooks/use-auth.tsx`

The CRM auth provider:

- loads role permissions from a hard-coded Apps Script endpoint and caches them for one hour;
- restores UI identity from localStorage;
- logs in through `/api/auth/login`, which sets the signed HttpOnly cookie;
- logs out through `/api/auth/logout`;
- exposes page and action permission tests;
- maintains users created/edited/deleted in client memory only.

Fallback permissions are role-based, but live permissions are indexed by email when loaded. Action permissions use a separate per-page role map. Some action-role names (`fo_manager`, `superVisor`) are not members of the declared `UserRole` union.

### `middleware.ts` and `components/route-guard.tsx`

Middleware verifies the signed CRM cookie for listed UI prefixes. Client-side `RouteGuard` maps exact pathnames to permissions and redirects unauthorized authenticated users to `/access-denied`.

Observed access-control gaps:

- `/api` is excluded from middleware, so every API handler must authenticate itself; most do not.
- Several pages are not in the middleware protected-prefix list, including `/MR-FMS`, `/crr-fms`, `/deal-assistant`, `/ksereve-billing-auditer`, and `/riya-sharma`.
- Client guard keys are exact path strings. Query-string keys such as `/voicecall/data?tab=received` never match `usePathname()`.
- `fms/enquiry-reverification` is missing its leading slash in the permission map.
- Dynamic paths such as prescription preview, partner detail, and complaint detail are not matched.
- Client protection only redirects when a user object exists; it is not a server-side authorization boundary.

### Notifications and content controls

`contexts/notification-context.tsx` polls new leads, sent/received voice leads, two booking Apps Scripts, and static notification JSON every interval; it filters by user company, persists read IDs in localStorage, and plays remote sound effects. `components/content-protection-provider.tsx` uses the localStorage role to restrict copying/printing/context actions for selected roles. `contexts/LoaderContext.tsx` is a simple global loading counter/context and is not mounted by the root layout.

## 4. User-facing route map

### Login, dashboard, and administration

| Route | Functionality and data |
|---|---|
| `/` | CRM email/password/company login; calls the custom auth route and redirects authenticated users. |
| `/access-denied` | Static permission-denied page. |
| `/dashboard` | Displays the current user/session profile, access/department/company details, and login timing from localStorage; no business-data write. |
| `/users` | User/role management UI. Reads auth context and mutates only the provider's in-memory `users` array; no persistence API is wired. |
| `/helpdesk` | Helpdesk dashboard backed by `use-helpdesk`, which uses local client state/mock tickets. The global bot separately persists support tickets to MySQL. |
| `/performance` | Employee/team performance dashboard backed by `use-performance` and `use-calls`; current data is provider-local/mock-derived. |

### Leads, calling, and deal assistance

| Route | Functionality and data |
|---|---|
| `/leads` | Lead list/search/filter/detail/edit UI using global `use-leads`. The same implementation is duplicated at `/leads/duplicates`. |
| `/leads/assign` | Large lead assignment and analytics hub. Reads master/staging MySQL lead data plus traffic, expense, payment, conversion, wasted-lead, potential-value, call-history, and multiple Apps Script detail feeds. Uses IndexedDB caching. Assignment/edit behavior ultimately relies on the leads Apps Script adapter. |
| `/leads/duplicates/assign` | Reduced/older assignment screen with API search and SQL call-history lookup. |
| `/leads/duplicates/duplicates` | Detects and groups duplicate leads from the global lead collection. |
| `/leads/duplicates_old` | Older duplicate-management page retained as a live route; effectively duplicates `/leads/duplicates/duplicates`. |
| `/calls` | Sales calling panel and calendar using client-side leads/calls providers; call sessions/logs are held in provider state rather than persisted here. |
| `/calls/reports` | Calls performance dashboard. Reads a hard-coded Apps Script via `use-calls-data`, with employee/date/company targets and charts. |
| `/sales-calling` | Daily combined dialer/AppSheet calling report proxied through `/api/sales-calling` to Apps Script. |
| `/deal-assistant` | MySQL-backed stalled-deal queue. Computes stage and days stalled, shows history, generates Gemini/local fallback summaries/messages, launches WhatsApp links, and records follow-up completion in MySQL. |

Deal Assistant stages are `new → qualified → proposal_sent → negotiating → payment_pending → won/lost`. Each active stage has a configurable inactivity threshold. The API derives the current stage from source data rather than writing stage transitions. `won` and `lost` use effectively infinite stall thresholds. Follow-up writes do not advance the source CRM stage.

### Marketing and reports

| Route | Functionality and data |
|---|---|
| `/marketing-dashboard` | Marketing-vs-sales dashboard composed from marketing components and `/api/marketing/*`; those endpoints currently return `lib/marketing-vs-sales-mock.ts`. |
| `/marketing-funnel` | Funnel, converted-leads, lead-quality, traffic-source, and target views. Mixes the mock marketing endpoints with direct Apps Script hooks for lead quality and targets. |
| `/marketing/google-ppc` | Google PPC charts/tables from a hard-coded Apps Script hook. The page also references missing `/api/google-ppc`, but the hook is the operative data source. |
| `/marketing/facebook-ppc` | Facebook PPC charts/tables from a hard-coded Apps Script hook. |
| `/google-adword-reports` | Company-specific campaign report through `/api/adword-reports`, which proxies a fixed Apps Script. |
| `/reports` | General reports hub backed by `use-analytics`; current analytics provider data is local/mock. |
| `/reports/sales-conversion` | Executive sales pipeline/conversion dashboard using the same local analytics provider. |
| `/sales/reports` | Sales performance report from a hard-coded Apps Script hook plus three additional Apps Script detail endpoints. |

### KTAHV booking/FMS

| Route | Functionality and data |
|---|---|
| `/fms` | FMS landing dashboard from local `use-fms` state. |
| `/fms/bookings/team` | Primary KTAHV booking operations system. Reads the MySQL aggregation endpoint and posts payment, approval, accounts, front-office, checkout, cancellation, and travel actions to fixed Apps Scripts. Role-based work queues cover sales, accounts, operations, and front office. |
| `/fms/bookings/ktahv` | Full KTAHV booking form entry point, implemented by the multi-step Booking Form components. It reads pricing/reference data from MySQL and submits reservation data through Apps Script. |
| `/fms/bookings/new` | Separate/older booking-entry page with a local booking auth provider and a placeholder endpoint reference; not the same form as `/ktahv`. |
| `/fms/bookings` | Earlier booking management/prototype screen containing sample links and embedded operational URLs. |
| `/fms/bookings/villa-raag` | Villa Raag booking FMS. Reads active bookings from MySQL and uses three fixed Apps Scripts for booking, payment, and booking-detail operations. |
| `/fms/bookings/employee-wise` | Static/mock employee booking-performance view. |
| `/fms/bookings/verified` | Static/mock verified-bookings list. |
| `/fms/bookings/unverified` | Static/mock unverified-bookings list. |
| `/accounts-tracker` | Large payment reconciliation/accounts workflow. Reads `/api/account-tracker` (MySQL) and writes operational/account verification actions to three Apps Scripts. Covers FO upload, settlement, account-data upload, account-head verification, PI/invoice/bank matching, overdue recovery, and stay-based views. |
| `/crr-fms` | Guest relationship/calling FMS with eleven planned stages, Apps Script persistence, role/stage permissions, locking by planned date, pending ownership by doer, and cancellation auto-close behavior. |
| `/fms/pending-tasks` | Cross-FMS bottleneck tracker. Fetches Apps Script operational data; on failure the UI explicitly falls back to local `data.ts` mock tables. |
| `/fms/enquiry-reverification` | Cold-enquiry reverification queue backed by MySQL. GET filters/paginates records; POST writes executive/senior verification fields and statuses. |
| `/new-order-fms` | Product order workflow backed by MySQL `orders_fms` and `dispatch_fms_factory`; displays stage progress, hold, cancellation/edit replacement, images, and shipment/deduction data. |
| `/MR-FMS` | Medical-representative FMS from a fixed Apps Script, with filters/KPIs and an MR data-check modal. The page also contains a large embedded set of call-recording examples. |

#### KTAHV booking workflow

The primary team page represents four role-specific stage families:

- Sales/booking verification and edits/cancellation.
- Accounts verification, with up to three activated payment/collection stages.
- Front-office/PMS verification, with up to two activated stages.
- Checkout/final-transfer work.

A stage is activated by a non-empty planned timestamp and completed by an actual timestamp. Accounts and front-office modals dynamically choose the first activated incomplete stage and skip stage numbers with no planned date. Voucher/complimentary statuses can bypass normal payment progression. Cancellation marks booking-level state and writes cancelled actual/status values into the stage families; auto-released bookings are categorized separately. Work-list state is role-aware and gives cancellation priority over pending, then completed. Several predicates use `s?.planned || s.planned.trim() !== ""`; when `s` or `planned` is absent, the second operand can still be evaluated and is a fragile edge.

#### CRR workflow

The eleven stages are:

1. Arrival Welcome on Pickup
2. Guest Request & Complaint Management (QR)
3. Next Visit Planning & Confirmation
4. Guest Feedback & Outcome Confirmation
5. Online Rating & Review Request
6. Safe Return Confirmation
7. Result Tracking & Health Progress Check
8. Referral Collection & Lead Generation
9. Driver Assignment — Arrival Pickup
10. Driver Assignment — Departure Drop
11. Guest Requirement Verification

Each stage carries availability, lock, planned date, actual date, doer, and persisted form data from Apps Script. The first incomplete stage becomes current; all complete produces stage 12. Missing/unavailable stages lock safely. Admin-tier users can request a lock override, which the Apps Script must also enforce. Cancelled bookings auto-close the journey and are excluded from pending/actionable work. Stages 4 and 8 open separate feedback/referral Apps Script forms. Code comments conflict on historical stage availability and on whether completion is based on actual timestamp or a `Done` status, making the remote Apps Script contract authoritative.

#### New Order workflow

The nine display stages are Order, Address Verification, Packing, Quality Check, Dispatch, Tracking, Delivery, Deduction, and Feedback. Source rows are merged across `orders_fms` and `dispatch_fms_factory` by normalized order ID. Stage completion is inferred from heterogeneous actual/status/link fields. A cancelled order or an edited order with a replacement link is terminal; edited orders are labelled `Edited-Cancelled`. Hold remains non-terminal. The mapper advances `activeStage` from whichever later-stage evidence is present, so missing intermediate rows are skipped rather than blocking display progress.

### Partner onboarding

| Route | Functionality and data |
|---|---|
| `/partners` | Partner lead funnel, pending/onboarded/rejected lists, booking history, KPIs, and three onboarding forms. Reads B2B/travel-agent Apps Scripts and rejected-partner proxy data; writes form parts and rejections through route proxies. |
| `/partners/[id]` | Standalone single-partner edit/detail form through `/api/partners`, which proxies the same Apps Script. |

The partner workflow is:

1. Part 1 — contact capture and first impression.
2. Part 2 — qualifying conversation, scoring, suggested partner tier/commission, and next actions.
3. Part 3 — billing, tax/bank documents, commercial intelligence, and account details.

Part 2 explicitly flags Part 3 for the first booking, so Part 3 may intentionally be deferred. The overview can display any available part independently and allows opening each modal from a pending lead; the UI does not impose a strict previous-part completion gate. Leads are considered onboarded when their ID appears in the travel-agent dataset. Leads with rejected/lost/unresponsive/sunset stages, or IDs written to the rejection dataset, are removed from pending.

### Doctor consultation

| Route | Functionality and data |
|---|---|
| `/doctor-consultation` | Six-stage consultation dashboard, KPIs, SLA/pending cards, detail and handover interactions. APIs are mock-backed. |
| `/doctor-consultation/calendar` | Mock consultation calendar with range/status filters. |
| `/doctor-consultation/history` | Mock history analytics and mock CSV/PDF export. |
| `/doctor-consultation/prescription/new` | Prescription editor; loads a consultation, writes to mock prescription endpoint, and stores preview data in localStorage. |
| `/doctor-consultation/prescription/preview/[id]` | Reads mock prescription API and/or localStorage preview for printable preview. |
| `/fms/doctor-consultation` | Static FMS placeholder/overview separate from the doctor module. |

The six stages are Intake, Appointment Fix, Pre-Consult Documents, Day-of Reminder, Post-Consult Upload, and Handover to KAPPL/KTAHV. Statuses are completed, pending, overdue, or upcoming. The current API does not persist transitions: consultation PATCH returns a fabricated updated record, stage history is static, and prescription save only echoes success.

### Complaints and Riya Sharma

| Route | Functionality and data |
|---|---|
| `/fms/complaints` | Large complaint/CAPA dashboard and action modals; current complaint records and document links are embedded mock data. |
| `/fms/complaints/[id]` | Static mock complaint detail regardless of route ID. |
| `/fms/complaints/new` | Local new-complaint form without a persistence API. |
| `/riya-sharma` | Full AI complaint/report analysis from a fixed Apps Script via `useRiyaSharmaData`, including KPI and category/department charts and complaint detail modal. |
| `/fms/riya-sharma` | Static profile card linking the conceptual FMS module. |
| `/fms/v3` | Static V3 system-management placeholder. |

Complaint type contracts define `open → in-progress → resolved → closed`, but the mock action modal only logs changes. The Riya Sharma report is the live external-data implementation in this area.

### Voice-call qualification

| Route | Functionality and data |
|---|---|
| `/voicecall/data` | Redirect/helper route to the sent/received views. |
| `/voicecall/data/sent` | Sent-to-KServe lead table using MySQL `ai_voice_leads_sent`. |
| `/voicecall/data/received` | Received-call results from MySQL `ai_voice_leads_received`; supports feedback writes, transfer verification, audio proxying, filtering, and direct ID lookup. |
| `/voicecall/summary` | Sent/received/qualified/non-qualified/pending source summary using `/api/voice-summary` and modal drilldowns. |
| `/voicecall/non-qualified` | MySQL non-qualified lead explorer and charts. |

Received lead outcomes include qualified, not qualified, pending/reschedule, completed, not connected, failed, busy, in progress, and scheduled. Transfer writes update the received row. Feedback is stored on the same table. File-system JSON fallback/cache logic exists in the sent/received API handlers, which is unreliable on ephemeral/serverless filesystems.

### Meetings

| Route | Functionality and data |
|---|---|
| `/meetings` | Current meeting insights application: Google calendar, Meet/Zoom discovery, browser recording/recovery, resumable Drive upload, transcription/diarization, AI notes, MySQL meeting/task persistence, task management, permissions, and deletion. |
| `/meet` | Older parallel meeting recorder/notes implementation using overlapping APIs and a different pipeline UI. |

Current pipeline:

1. Discover or enter a Google Meet/Zoom/offline meeting.
2. Capture participant and meeting status where APIs permit.
3. Record audio in browser; append chunks to IndexedDB for crash/reload recovery.
4. Compress audio with ffmpeg loaded from unpkg.
5. Create a Google Drive resumable session and upload chunks, or use the server upload endpoint.
6. Transcribe with OpenAI; retry/fallback logic handles truncated/bad-header audio.
7. Diarize/identify speakers and generate notes.
8. Save meeting metadata/transcript/notes/audio URL in MySQL.
9. Extract tasks with OpenAI and insert them into `meeting_tasks`.
10. Update task status/ownership/dates or delete meetings/tasks.

The browser pipeline checkpoint API allows resume after interruptions. Google Meet participant/report endpoints may return no completed conference record while a meeting is live. Zoom participant lookup falls back from the report endpoint to the live endpoint. Zoom connectivity depends on a separate `zoom_access_token` cookie, while Google calendar depends on NextAuth. Microsoft Teams is presented as a platform choice/icon but has no Microsoft Graph/OAuth integration.

### Accounts, billing, and other reports

| Route | Functionality and data |
|---|---|
| `/ksereve-billing-auditer` | Billing auditor table, filters, gap/KPI cards, transcript and recording modals; entirely backed by `data/mockBillingData.ts`. |
| `/accounts-tracker` | Described in KTAHV FMS above; real MySQL read plus Apps Script writes. |

## 5. API and server-function inventory

Every routed API file is accounted for below.

### Authentication, calendar, Zoom, and meetings

- `/api/auth/login` POST: forwards credentials to Apps Script and sets the signed CRM cookie.
- `/api/auth/logout` POST: expires the CRM cookie.
- `/api/auth/[...nextauth]` GET/POST: Google OAuth, JWT refresh, Calendar/Meet scopes, and `google_tokens` persistence.
- `/api/calendar/meetings` GET: NextAuth-authenticated Calendar event listing and Meet URL normalization.
- `/api/calendar/mobile` GET: uses a stored Google refresh token for mobile calendar access.
- `/api/zoom/connect` GET and `/api/zoom/callback` GET: Zoom OAuth authorization code flow and cookie storage.
- `/api/meetings/zoom-status` GET/POST and `/api/meetings/zoom-meeting-status` GET: Zoom meeting/host checks.
- `/api/meetings/zoom-participants` POST: Zoom report/live participant lookup.
- `/api/meetings/meet-status` GET and `/api/meetings/meet-participants` POST: Google Meet space/conference status and participant lookup using supplied access tokens.
- `/api/meetings/create-upload-session` POST, `/upload-chunk` PUT/POST, `/upload-audio` POST, and `/audio` GET: Drive resumable upload, proxy upload, and authenticated Range-capable audio serving.
- `/api/meetings/transcribe` POST, `/diarize` POST, `/process` POST, `/extract-tasks` POST: OpenAI transcription, speaker handling, notes, and action-item extraction.
- `/api/meetings/save` GET/POST/PATCH, `/meetings/[id]` GET/DELETE, `/meetings/tasks` GET/POST/PATCH/DELETE: MySQL `meetings` and `meeting_tasks` CRUD.
- `/api/pipeline` GET/POST/PATCH/DELETE: MySQL `pipeline_checkpoints` lifecycle.

### Leads, deal assistant, and analytics

- `/api/leads`, `/filter`, `/search`, `/[id]`: read and normalize `master_buffer` plus `staging_buffer_new`.
- `/api/leads/[id]/history`: combines master/staging rows with `followup_activity` and `followup_communication`.
- `/api/debug-leads`: exposes source-table inspection data.
- `/api/enquiry/[id]`: enquiry-specific master/staging lookup.
- `/api/total-traffic`, `/expense`, `/payment`, `/conversion`, `/potential-value`: MySQL aggregate endpoints used by lead assignment.
- `/api/wasted-leads`: combines reverification, lead buffers, and source-wise lost potential values.
- `/api/stalled-deals`: derives stalled pipeline rows and joins follow-up/conversion activity.
- `/api/mark-followed-up`: inserts into `deal_assistant_followups`.
- `/api/generate-followup`: Gemini generation with cache and deterministic local fallback.
- `/api/reports/daily`, `/weekly`, `/monthly`: fixed Apps Script report proxies.
- `/api/marketing/channels`, `/kpis`, `/overview/{channel-performance,funnel,geo}`, `/perf/leads-vs-revenue`, `/planning/{leads-and-conversion,leads}`, `/revenue/by-source`, `/trends/{monthly,quarterly}`: slices of one local mock dataset.

### Booking, CRR, accounts, and orders

- `/api/ktahv-bookings`: large MySQL booking aggregation across booking, payment, invoice, verification, transfer, cancellation, auto-release, credential, and guest-tracker tables.
- `/api/ktahv-bookings/formdataktahv`: booking-form reference/reservation/pricing/room/service/travel-agent aggregation.
- `/api/ktahv-payment-history` and `/api/invoice-history`: payment and invoice history.
- `/api/account-tracker`: reads `ktahv_account_tracker`.
- `/api/crr-calling/bookings` GET/POST: authenticated Apps Script proxy for CRR list/stage saves.
- `/api/arrival-departure` POST: arrival/departure Apps Script write proxy.
- `/api/villa-bookings` and the duplicate root `/villa-bookings` route: read `villa_raag_client_booking_fms`.
- `/api/new-order-fms`: merges `orders_fms` and `dispatch_fms_factory`.
- `/api/fms/enquiry-reverification` GET/POST: reads and updates `fms_enquiry_cold_reverification_v2`.

### Partners

- `/api/b2b-leads` and `/api/ktahv-partners`: environment-based Apps Script read proxies.
- `/api/get-part1`, `/get-part2`, `/get-part3`: fixed Apps Script reads for onboarding parts.
- `/api/capture-partner`: fixed Apps Script write proxy for all three form parts.
- `/api/partners` GET/POST: single-record Apps Script read/write.
- `/api/rejected-partners` GET/POST: configurable/fallback Apps Script rejection store with local JSON fallback.

### Voice, calls, and support

- `/api/sent-leads`, `/received-leads`, `/voice-summary/leads`, `/voicecall/non-qualified`: MySQL voice-lead reads.
- `/api/received-leads/feedback` and `/transfer`: update received voice-lead feedback/transfer state.
- `/api/received-leads-sql`: backward-compatible redirect.
- `/api/voice-summary`: calls the `app/actions/crmData.ts` server action.
- `/api/voice-proxy`: fixed Apps Script voice-data proxy.
- `/api/audio-proxy`: unrestricted URL fetch proxy with permissive CORS.
- `/api/recording`: allowlisted, Range-capable IVR recording proxy.
- `/api/sales-calling`: Apps Script calling report proxy.
- `/api/support-tickets` POST and `/my-tickets` GET: MySQL `support_tickets`.
- `/api/bot-lookup` and `/recent`: cross-table CRM ID lookup/recent items for the chat widget.

### Mock, compatibility, and diagnostics

- `/api/doctor/calendar`, `/consultations`, `/consultations/[id]`, `/consultations/[id]/stages`, `/history`, `/history/export`, `/kpis`, `/prescriptions`, and `/prescriptions/[id]`: mock/static doctor system.
- `/api/adword-reports`: fixed Apps Script proxy.
- `/api/expense`, `/payment`, `/conversion`, `/potential-value`: real MySQL aggregates noted above.
- `/api/inspect-db`: returns a static “Ready”.
- `/api/test-db`: executes `SELECT 1`.
- `/api/test-assistant`: static diagnostic response.
- `/api/received-leads-sql`: compatibility redirect noted above.

## 6. Shared modules

### Hooks

- `use-auth`: CRM identity, permissions, local UI user management.
- `use-leads`: Google Apps Script/MySQL lead loading, normalization, IndexedDB/memory caching, refresh/clear.
- `use-sql-call-history`: per-lead SQL history.
- `Use-call-history` and `Use-call-history_old`: duplicate Apps Script call-history adapters.
- `use-calls`, `use-performance`, `use-analytics`, `use-fms`, `use-helpdesk`: provider-local/demo state for their respective dashboards.
- `use-fms-bookings`: KTAHV booking API normalization and pending counts.
- `use-active-bookings`: Villa Raag MySQL bookings.
- `use-crr-bookings`: CRR Apps Script data, stage hydration, locks, completion, and saves.
- `use-new-order-fms`: MySQL order/dispatch merge and stage inference.
- `use-accounts-tracker`: account-tracker API normalization/filter state.
- `Usemrfmsleads`: MR Apps Script adapter.
- `use-adword-reports`: adword proxy aggregation.
- `use-calls-data`, `useSalesData`, `useFacebookPPCData`, `useGooglePPCData`, `useLeadQualityData`, `useLeadQualityReport`, `use-lead-target-report`: Apps Script reporting adapters.
- `useReceivedLeads`, `useSentLeads`, `voicecall/useVoiceSummary`: voice lead adapters.
- `riyasharma/useRiyaSharmaData`: complaint-analysis Apps Script normalization.
- `use-employee-list` and `useEmployees`: duplicate employee Apps Script adapters.
- `use-booking-auth`: booking-specific localStorage identity, separate from CRM auth.
- `use-copy-protection`, `use-mobile`, and `use-toast`: UI utility hooks.

### Feature components

- Booking: `Booking Form/BookingForm`, `BookingFormBase`, `BookingFormSteps1`, `BookingFormSteps2`, `useBookingPricing`, and booking `types`; `Bookingdetailpopup`, `Paymentrecordsmodal`, `InvoiceHistoryPopup`, `TodayStayModal`, `arrivalticketmodel`, `departureticketmodel`, `Driverassignmentarrivalmodal`, `Driverassignmentdeparturemodal`, and `Guestrequirementverificationmodal`.
- Lead/call: `LeadDetailModal`, `VerifiedDetailModal`, `UnverifiedDetailModal`, `CollectionDetailModal`, both `WastedLeadsDetailModal` copies, `viewcallhistorymodel`, `Verifytransferleadmodal`, `summaryallDetailModal`, `summarysentDetailsModal`, `Kservercvdleadsmodal`, and `Kservesentleadsmodal`.
- Enquiry/MR: `ExecutiveverifyModel`, `SeniorVerifyModel`, and `Mrdatacheck`.
- Partner: `contact-capture-modal`, `parner-qualify-modal`, and `billing-and-partner-intelligance-modal`.
- Complaint: `ComplaintViewModal` and `fms/complaint-action-modal`.
- Analytics/marketing: `analytics-charts`, `analytics-kpi-cards`, `analytics-table-blocks`; `channel-card`, `channel-drawer`, `channel-performance-section`, `charts-section`, `converted-leads-reports`, `error-boundary`, `kpi-card`, `kpi-section`, `lead-quality-section`, `lead-target-report`, `loading-skeleton`, and `traffic-source-performance`.
- Billing auditor: `BillingTable`, `CategoryGapImpact`, `FiltersCard`, `HeaderBanner`, `KpiSummary`, `Pagination`, `RecordingModal`, `StatusBadge`, and `TranscriptModal`.
- Lead search: `FollowUpModal`, `Header`, `NoResultModal`, `ResultsTable`, and `SearchForm`.
- Global shell: `dashboard-layout`, `route-guard`, `content-protection-provider`, `session-provider`, `back-button`, `Loader`, `floating-notification-stack`, `notification-toast`, `theme-provider`, and `fms/stage-wise-pendings`.
- Chat/support: `bot-widget/ChatBubble`, `ChatWidget`, `ResultCard`, `TicketForm`, and `types`.

`components/ui` contains the explicitly routed design-system primitives: accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle-group, toggle, tooltip, use-mobile, and use-toast. These are presentation primitives and do not independently read or write business data.

### Libraries and utilities

- `db`: singleton MySQL pool and exponential query retry.
- `session`: signed/expiring CRM session cookie.
- `api-auth`: CRM cookie or expiring bearer-token authorization helper.
- `google-drive`: service-account Drive upload/delete and internal audio URL.
- `audio-compress`, `chunked-upload`, `recording-store`, `pipeline-checkpoint`, `with-timeout`, `meeting-url-parser`: resilient meeting capture pipeline.
- `idb`, `leads-cache-control`: lead cache persistence and invalidation.
- `config`: Deal Assistant thresholds and Gemini prompts.
- `employees`: employee normalization/grouping.
- `lead-search-types`: standalone search domain types.
- `marketing-vs-sales-mock`: all current `/api/marketing/*` data.
- `utils`: Tailwind class merging.
- `submit-guard` and `toast-utils`: guarded form submission/toast behavior.
- `app/actions/crmData`: server action used by voice summary.

### Domain types

- `analytics`: combined sales, leads, performance, FMS, helpdesk, and executive KPIs.
- `billing`: call-billing audit record and duration mismatch.
- `booking`: seven-stage generic booking, payments, approvals, alerts, operations, and booking roles.
- `call`: dispositions, call sessions/logs, and agent performance.
- `crr`: eleven-stage guest journey and persisted stage form payloads.
- `fms`: booking/complaint entries and aggregate stats.
- `helpdesk`: ticket/comment/knowledge-base/SLA contracts.
- `lead`: lead lifecycle, activity, and metrics.
- `performance`: employee/team metrics and alerts.

## 7. Third-party integration wiring

| Integration | Wiring |
|---|---|
| MySQL | `mysql2/promise` pool in `lib/db.ts`; direct connection configuration is embedded in source. Used by lead, booking, accounts, voice, meeting, pipeline, bot, support, and deal APIs. |
| Google Apps Script / Sheets | Dozens of hard-coded deployment URLs in hooks/pages/routes; `GAS_URL` and rejection-specific env overrides exist for a few partner endpoints. Requests use GET query parameters or JSON/text POST bodies. There is no common client, version registry, or webhook receiver. |
| Core auth | Apps Script login endpoint plus `NEXTAUTH_SECRET`-signed `kairali_user` cookie. Role permissions come from the same Apps Script family and are cached in localStorage. |
| Google OAuth / Calendar / Meet | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET`; NextAuth requests Calendar readonly and Meet space readonly plus offline access. Refresh tokens are stored in `google_tokens`. Calendar mobile refreshes independently from that table. |
| Google Drive | `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_DRIVE_FOLDER_ID`; server-side Drive APIs upload/private-stream meeting recordings. Browser direct resumable upload uses a server-created Google upload session. |
| Zoom | `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI`; OAuth callback stores access token/user identity in cookies. Meeting/participant APIs consume the access token passed/read by route handlers. No webhook receiver is present. |
| OpenAI | `OPENAI_API_KEY`; audio transcription endpoint plus SDK-based diarization/notes/task extraction. Build-time fallback uses a dummy key string. |
| Gemini | `GEMINI_API_KEY`; direct REST call to the configured generative-language model, with local fallback and caching. |
| ffmpeg.wasm | Browser loads ffmpeg core from unpkg, then compresses meeting audio before upload. |
| IVR/dialer/audio | Direct recording URLs, allowlisted recording proxy, unrestricted audio proxy, and fixed voice Apps Script proxies. |
| WhatsApp | Deal Assistant opens `wa.me` with generated message; no WhatsApp server API/webhook. |
| Vercel Analytics | Package is installed, but no `Analytics` component was found mounted in the inspected source. |

At the time of the initial source inventory, no `.env*` file existed inside the scoped application directory. During the later audit-baseline run, the managed build environment materialized a gitignored `.env.local`; its contents were not copied into this report or committed. Required environment names found in source are:

`NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_FOLDER_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GAS_URL`, `NEXT_PUBLIC_GAS_URL`, `GAS_REJECT_URL`, `GAS_WRITE_URL`, `NEXT_PUBLIC_GAS_REJECT_URL`, `NEXT_PUBLIC_GAS_WRITE_URL`, `MEASUREMENT_API_TOKEN`, and `MEASUREMENT_API_TOKEN_EXPIRES_AT`.

No inbound webhook routes were found for Google, Zoom, payments, WhatsApp, or any other provider.

## 8. Observed fragility, workarounds, and known-risk areas

These are discovery findings, not change proposals.

### Security and authorization

- Live database connection credentials are hard-coded in `lib/db.ts`.
- Most API routes are callable without the CRM session because middleware excludes `/api` and handlers generally omit `authorizeApiRequest`.
- Diagnostic routes include an unauthenticated database connectivity test.
- `/api/audio-proxy` accepts an arbitrary URL and fetches it server-side without host/private-network validation.
- Several write proxies trust arbitrary JSON and forward it to Apps Script without local authorization or schema validation.
- `next.config.mjs` enables `typescript.ignoreBuildErrors`, so production builds can deploy with type errors even though the current non-emitting TypeScript check passes.
- Meeting route handlers generally accept caller-supplied access tokens/user identifiers and do not consistently bind operations to the CRM identity.

### Data consistency and deployment model

- Business data is split among MySQL, many independently deployed Apps Scripts/Sheets, browser localStorage/IndexedDB, and static files. Cross-system writes are not transactional.
- Hard-coded Apps Script deployment URLs are repeated across pages/hooks/routes, and active URLs coexist with commented older URLs.
- Some Vercel route handlers read/write JSON under filesystem paths as fallback storage; serverless filesystems are ephemeral and may be read-only outside temporary directories.
- Client pages frequently infer completion from non-empty strings and heterogeneous status spellings. Source normalization is extensive but inconsistent between modules.
- Date parsing contains many module-specific parsers for ISO, US slash dates, DMY, and named-month values.
- Global notifications independently refetch multiple full operational datasets.

### Mock/live ambiguity

- Doctor consultation, general analytics/reports, helpdesk UI, performance, calls provider, FMS employee/verified/unverified screens, complaints, and KServe billing auditor are mock or client-memory backed.
- Marketing dashboard endpoints are local mock data, while adjacent PPC/quality sections use live Apps Scripts.
- Several mock pages contain plausible production links and records, making their non-persistent status easy to miss.

### Duplication and dead/legacy paths

- `Use-call-history_old.tsx`, `WastedLeadsDetailModal (1).tsx`, `/leads/duplicates_old`, and `/meet` duplicate newer/live counterparts.
- `/leads` and `/leads/duplicates` contain the same page implementation.
- `/api/villa-bookings` is duplicated by `app/villa-bookings/route.ts`.
- `lib/google-drive.ts`, `app/layout.tsx`, Booking Form files, and several large pages retain extensive commented previous implementations.
- Dashboard navigation references routes that do not exist in the repo.
- Root `scratch*`, `show_indexes.js`, `check_29.js`, `temp/new-booking-page.tsx`, and schema/result JSON files are development artifacts included in TypeScript/file scope.

### Complexity hotspots

- `app/fms/bookings/team/page.tsx` is over 14,000 lines.
- `app/leads/assign/page.tsx` is over 7,700 lines.
- `app/accounts-tracker/page.tsx` is about 6,000 lines.
- `app/crr-fms/page.tsx` and `app/meetings/page.tsx` exceed 4,000 lines each.
- Many other feature pages/components exceed 1,000 lines and mix data adaptation, workflow state, validation, rendering, and network writes.
- Large modules contain copied blocks, commented alternatives, console debugging, and status checks with subtly different semantics.

### Specific contract inconsistencies

- CRR comments alternately define completion by `actualCol` and by status `Done`, while the hook uses the server-provided boolean.
- Generic `types/booking.ts` models seven stages, while the primary KTAHV team page uses separate role-specific stage objects and the order workflow has nine stages.
- Core auth declares one set of user roles, while action permission maps use additional spellings.
- Google PPC page references `/api/google-ppc`, which does not exist.
- `/api/calendar/meetings`, `/api/meetings/extract-tasks`, `/api/meetings/meet-participants`, `/api/meetings/tasks`, `/api/pipeline`, and `/api/wasted-leads` contain old implementations in comments, which caused simple static method counts to appear duplicated.
- `capture-partner` treats a non-JSON Apps Script response as success, potentially masking upstream failures.
- User administration success messages do not correspond to durable writes.

## 9. Validation performed

- Enumerated all page, layout, loading, API, component, hook, context, library, type, utility, data, public, scratch, and temporary files.
- Traced page imports to hooks/components and page/hook calls to internal/external endpoints.
- Extracted every referenced environment variable, external URL class, and SQL table reference.
- Inspected authentication, route guard, session, MySQL, Google Drive, meeting persistence, and workflow helpers directly.
- After installing the locked dependencies, ran the local compiler with `--noEmit --pretty false --incremental false`; the verified baseline is 595 TypeScript errors across 78 files. The earlier silent `npx` attempt made before dependencies were installed was not a valid check.
- Ran `npm run build`; the sandboxed attempt could not reach Google Fonts, while the approved network-enabled retry completed successfully. The build skips type validation because `ignoreBuildErrors` is enabled and warns that `app/api/pipeline/route.ts` exports a deprecated/unrecognized route `config`.
- Confirmed no application source file was modified during discovery. The only created artifacts are this report and the review changelog.

## 10. Exact route coverage index

This index is intentionally redundant with the functional sections above. It provides a mechanically checkable record that no routed module was omitted.

### Page routes (61)

`/`, `/access-denied`, `/dashboard`, `/users`, `/helpdesk`, `/performance`, `/leads`, `/leads/assign`, `/leads/duplicates`, `/leads/duplicates/assign`, `/leads/duplicates/duplicates`, `/leads/duplicates_old`, `/calls`, `/calls/reports`, `/sales-calling`, `/deal-assistant`, `/marketing-dashboard`, `/marketing-funnel`, `/marketing/google-ppc`, `/marketing/facebook-ppc`, `/google-adword-reports`, `/reports`, `/reports/sales-conversion`, `/sales/reports`, `/fms`, `/fms/bookings`, `/fms/bookings/team`, `/fms/bookings/ktahv`, `/fms/bookings/new`, `/fms/bookings/villa-raag`, `/fms/bookings/employee-wise`, `/fms/bookings/verified`, `/fms/bookings/unverified`, `/accounts-tracker`, `/crr-fms`, `/fms/pending-tasks`, `/fms/enquiry-reverification`, `/new-order-fms`, `/MR-FMS`, `/partners`, `/partners/[id]`, `/doctor-consultation`, `/doctor-consultation/calendar`, `/doctor-consultation/history`, `/doctor-consultation/prescription/new`, `/doctor-consultation/prescription/preview/[id]`, `/fms/doctor-consultation`, `/fms/complaints`, `/fms/complaints/[id]`, `/fms/complaints/new`, `/riya-sharma`, `/fms/riya-sharma`, `/fms/v3`, `/voicecall/data`, `/voicecall/data/sent`, `/voicecall/data/received`, `/voicecall/summary`, `/voicecall/non-qualified`, `/meetings`, `/meet`, and `/ksereve-billing-auditer`.

### API routes under `/api` (101), plus one root route handler

Authentication/calendar/Zoom:

`/api/auth/[...nextauth]`, `/api/auth/login`, `/api/auth/logout`, `/api/calendar/meetings`, `/api/calendar/mobile`, `/api/zoom/connect`, and `/api/zoom/callback`.

Meetings:

`/api/meetings/[id]`, `/api/meetings/audio`, `/api/meetings/create-upload-session`, `/api/meetings/diarize`, `/api/meetings/extract-tasks`, `/api/meetings/meet-participants`, `/api/meetings/meet-status`, `/api/meetings/process`, `/api/meetings/save`, `/api/meetings/tasks`, `/api/meetings/transcribe`, `/api/meetings/upload-audio`, `/api/meetings/upload-chunk`, `/api/meetings/zoom-meeting-status`, `/api/meetings/zoom-participants`, `/api/meetings/zoom-status`, and `/api/pipeline`.

Leads/deals/reports:

`/api/leads`, `/api/leads/[id]`, `/api/leads/[id]/history`, `/api/leads/filter`, `/api/leads/search`, `/api/debug-leads`, `/api/enquiry/[id]`, `/api/total-traffic`, `/api/expense`, `/api/payment`, `/api/conversion`, `/api/potential-value`, `/api/wasted-leads`, `/api/stalled-deals`, `/api/mark-followed-up`, `/api/generate-followup`, `/api/reports/daily`, `/api/reports/weekly`, and `/api/reports/monthly`.

Marketing mock endpoints:

`/api/marketing/channels`, `/api/marketing/kpis`, `/api/marketing/overview/channel-performance`, `/api/marketing/overview/funnel`, `/api/marketing/overview/geo`, `/api/marketing/perf/leads-vs-revenue`, `/api/marketing/planning/leads-and-conversion`, `/api/marketing/planning/leads`, `/api/marketing/revenue/by-source`, `/api/marketing/trends/monthly`, and `/api/marketing/trends/quarterly`.

Bookings/accounts/orders/CRR:

`/api/account-tracker`, `/api/arrival-departure`, `/api/crr-calling/bookings`, `/api/fms/enquiry-reverification`, `/api/invoice-history`, `/api/ktahv-bookings`, `/api/ktahv-bookings/formdataktahv`, `/api/ktahv-payment-history`, `/api/new-order-fms`, and `/api/villa-bookings`. A duplicate root route handler also exists at `/villa-bookings`; it is outside the 101-file `/api` count.

Partners:

`/api/b2b-leads`, `/api/capture-partner`, `/api/get-part1`, `/api/get-part2`, `/api/get-part3`, `/api/ktahv-partners`, `/api/partners`, and `/api/rejected-partners`.

Voice/calls/support/bot:

`/api/audio-proxy`, `/api/bot-lookup`, `/api/bot-lookup/recent`, `/api/received-leads`, `/api/received-leads/feedback`, `/api/received-leads/transfer`, `/api/received-leads-sql`, `/api/recording`, `/api/sales-calling`, `/api/sent-leads`, `/api/support-tickets`, `/api/support-tickets/my-tickets`, `/api/voice-proxy`, `/api/voice-summary`, `/api/voice-summary/leads`, and `/api/voicecall/non-qualified`.

Doctor mock endpoints:

`/api/doctor/calendar`, `/api/doctor/consultations`, `/api/doctor/consultations/[id]`, `/api/doctor/consultations/[id]/stages`, `/api/doctor/history`, `/api/doctor/history/export`, `/api/doctor/kpis`, `/api/prescriptions`, and `/api/prescriptions/[id]`.

Other/diagnostic:

`/api/adword-reports`, `/api/inspect-db`, `/api/test-assistant`, and `/api/test-db`.

## 11. Phase boundary

No fixes or version-upgrade plan is proposed here. Phase 0 is complete at the repository/source level. The next action is to receive the audit workpack, tie each finding to this map, and handle UI/UX findings first. Before any module is edited, its observed current behavior and the intended change must be restated for confirmation.
