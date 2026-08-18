# Security Hardening Progress - 2026-08-13

Working branch: `codex/security-hardening`

Roadmap baseline referenced by the owner: `main` at `2dc1200`

Operating rule: accuracy over speed. A control is marked `Complete` only when
implementation and verification evidence exist. Controls that depend on
production/staging state remain `External verification` until the owner supplies
evidence.

## Current phase status

| Roadmap area | Status | Evidence / reason |
| --- | --- | --- |
| Phase 0.1 dependency hardening | Partial; P0 critical/high previously satisfied | Previous registry-backed audit evidence showed `0 critical`, `0 high`, `2 moderate`. `xlsx` was removed and direct dependencies were patched. Current package tree still shows `exceljs -> uuid@8.3.2`; latest registry audit rerun needs explicit approval/network access. |
| Phase 0.2 credential rotation | Repo-side source hygiene partial; rotation external verification | `lib/db.ts` reads DB connection values from environment variables, but rotation/revocation of database, Apps Script, Google, Zoom, AI-provider, and other exposed credentials cannot be proved from source. |
| Phase 0.3 meeting IDOR / forged identity | Partial repo-side; major IDOR paths implemented; tests/live verification required | `/api/meetings/*` is no longer middleware-exempt. Meeting save/list/read/delete/task/audio/upload/transcribe/process routes now require a signed CRM session. Meeting owner/admin checks are applied where a saved meeting object exists. Upload/audio routes validate MIME/size/file IDs/upload URLs/chunks/ranges; AI routes are session-gated and rate-limited, with `process` additionally bounding transcript/title/type input. |
| Phase 1 MFA / password / brute-force / session lifecycle | Partial repo-side | Process-local login throttling, structured auth audit events, signed session IDs, and process-local logout revocation exist. MFA was explicitly deferred by owner instruction. Database-backed rate-limit/session tables are not implemented because the owner prohibited app-managed database create/update/delete/alter operations. Password policy enforcement, inactivity timeout, logout-all-devices, active-session listing, distributed security state, and trusted-proxy source-IP handling are still not complete. |
| Phase 2 full API authorization | Partial | Middleware authenticates most APIs, and several high-risk write/proxy routes now have explicit server-side permission or owner checks. Coverage is still incomplete because some route groups still lack full owner/role/department/branch/stage policy and automated negative tests. |
| Phase 3 audit and monitoring | Partial repo-side | Structured security events are emitted to application logs for auth flows. Centralized append-only audit storage, retention, alert delivery, SIEM routing, and tamper resistance are not verified. |
| Phase 4 data/file/infrastructure hardening | Partial / external verification | Browser headers and meeting upload/audio containment were added. DB grants, TLS, encryption at rest, malware scanning, private storage policy, backups, and restore evidence remain external verification. |
| Phase 5 DevSecOps gates | Partial repo-side | Dependency audit was run manually. A dependency-free `security:check` regression gate and GitHub Actions workflow now exist for core security controls. Full lint/typecheck/build enforcement, SAST, DAST, secret scanning, SBOM, dependency gates, and broader authorization test gates are not complete. |
| Phase 6 recovery/governance | External verification / not complete | Backup restoration, access reviews, policies, incident response, tabletop exercises, and governance evidence are outside repo evidence. |

## Dependency evidence

Implemented:

- Removed unused vulnerable `xlsx` dependency.
- Upgraded direct dependencies:
  - `next` to `^16.3.0`
  - `next-auth` to `^4.24.15`
  - `jspdf` to `^4.2.1`
  - `form-data` to `^4.0.6`
  - `postcss` to `^8.5.23`
- Added targeted npm overrides:
  - `glob -> minimatch@3.1.5`
  - `readdir-glob -> minimatch@5.1.9`
  - `brace-expansion@^1.1.7 -> 1.1.18`
  - `brace-expansion@^2.0.1 -> 2.1.4`
  - `qs@^6.15.0 -> 6.15.3`
  - `tmp -> 0.2.7`

Verification:

- Previous `npm audit --audit-level=moderate`
  - Critical: `0`
  - High: `0`
  - Moderate: `2`
  - Remaining package path: `exceljs -> uuid`
- Current registry-backed audit rerun:
  - Pending explicit owner approval/network access because it sends dependency
    metadata to the public npm registry.

Residual dependency risk:

| Package path | Severity | Reason | Current decision |
| --- | --- | --- | --- |
| `exceljs -> uuid@8.3.2` | Moderate | npm reports `uuid` missing a buffer bounds check in v3/v5/v6 when the caller supplies `buf`. | Do not run `npm audit fix --force` because npm would install `exceljs@3.4.0`, a breaking downgrade. Keep `exceljs@4.4.0` for report generation and review by 2026-09-13 unless a compatible patched path is available earlier. |

## DevSecOps gate status

Current status and blockers:

- `package.json` now has a practical ESLint gate:
  `eslint app/api lib middleware.ts scripts eslint.config.mjs next.config.mjs`.
  The previous unsupported `next lint` command has been replaced.
- ESLint 9 / Next 16 compatible config and dependencies are present.
- `npm.cmd run lint` passes for the scoped backend/security gate.
- `npm.cmd run build` passes after removing the online `next/font/google`
  dependency from the active layout. Build still skips TypeScript validation
  because `next.config.mjs` retains `typescript.ignoreBuildErrors: true`.
- `next.config.mjs` still contains `typescript.ignoreBuildErrors: true`, so a
  production build can succeed despite TypeScript errors until this is removed.
- `package.json` now includes a non-emitting `typecheck` script, but repo-wide
  typecheck still fails until existing TypeScript errors are resolved.
- `package.json` now includes `security:check`, a dependency-free Node
  regression gate for the highest-risk hardening invariants.
- `.github/workflows/security-checks.yml` runs `npm run security:check` on pull
  requests and pushes to `main` / `codex/**`.
- `security:check` now also asserts app code does not wire app-managed database
  security-state tables after the owner prohibited database create/update/delete/alter operations.

Recommended minimal gate restoration:

- Run and enforce `typecheck: tsc --noEmit --incremental false` after existing
  repo-wide TypeScript errors are resolved or explicitly baselined.
- Align React type packages with React 19 before enforcing repo-wide typecheck.
- Remove `typescript.ignoreBuildErrors: true` after current repo-wide TypeScript
  issues are fixed or explicitly baselined.
- Add broader CI gates for lint, typecheck, high-severity dependency audit, and
  build after the legacy type backlog is resolved or baselined.
- Keep expanding `scripts/security-regression-check.js` as new route-level
  controls are added.

## Meeting API evidence

Implemented:

- `middleware.ts`
  - Removed `/api/meetings` exact exemption.
  - Removed `/api/meetings/` prefix exemption.
- `lib/meetings-auth.ts`
  - Shared meeting session extraction from signed `kairali_user` cookie.
  - Owner/admin access predicate.
  - Google Drive file ID validation.
  - Drive resumable upload URL allowlist validation.
  - Internal audio URL parsing restricted to same-origin `/api/meetings/audio`.
  - Allowed meeting audio MIME types, maximum audio size, maximum chunk size,
    safe filename normalization, and safe positive-integer parsing.
- `lib/meeting-upload-sessions.ts`
  - Binds server-created Drive resumable upload URLs to the signed CRM session email for six hours.
  - Rejects upload/resume attempts by a different authenticated CRM user on the same app instance.
  - Tracks completed uploaded Drive file IDs to the signed CRM session email for
    meeting-save validation.
- `app/api/meetings/create-upload-session/route.ts`
  - Requires signed CRM session.
  - Applies per-user/IP rate limiting.
  - Requires a valid file size and allowed meeting audio MIME type.
  - Sanitizes the Drive filename server-side.
  - Records owner email in Drive `appProperties`.
  - Registers upload URL ownership.
- `app/api/meetings/upload-chunk/route.ts`
  - Requires signed CRM session.
  - Applies per-user/IP rate limiting.
  - Accepts only Google Drive resumable upload URLs.
  - Requires upload URL ownership match before proxying chunk or resume check.
  - Validates chunk size, total size, and `Content-Range` before forwarding to
    Drive.
- `app/api/meetings/audio/route.ts`
  - Requires signed CRM session.
  - Validates file ID shape.
  - Checks Drive `crmOwnerEmail` app property or saved meeting owner before streaming.
  - Rejects malformed or out-of-bounds audio Range requests.
- `app/api/meetings/upload-audio/route.ts`
  - Requires signed CRM session.
  - Applies per-user/IP rate limiting.
  - Rejects empty, oversized, or unsupported audio/video meeting uploads.
- `app/api/meetings/save/route.ts`
  - `POST` stamps `recorded_by` and `recorded_by_name` from verified session.
  - `POST` accepts only same-origin `/api/meetings/audio?id=...` audio URLs
    whose completed file ID is bound to the same signed CRM session.
  - `GET` scopes regular users to their own recordings; admins can view all or filter.
  - `PATCH` checks existing meeting owner/admin before update.
- `app/api/meetings/[id]/route.ts`
  - `GET` and `DELETE` authorize through verified session owner/admin.
- `app/api/meetings/tasks/route.ts`
  - `GET`, `POST`, `PATCH`, and `DELETE` verify parent meeting owner/admin.
  - `POST` uses signed-session identity for assignment creator.
  - Flagged-task counts are scoped to the requested meeting or, for non-admin
    users, only to meetings owned by the signed session.
- Expensive AI/processing endpoints:
  - `transcribe`, `process`, `diarize`, and `extract-tasks` require signed CRM session.
  - Added process-local per-user/IP rate limits with `429` and `Retry-After`.
  - `process` now bounds transcript/title/type input before calling OpenAI.

Important limitation:

- Upload URL ownership and AI endpoint rate limits currently use in-memory state.
  They are useful repo-side controls and local/staging evidence, but production
  completion requires shared storage such as Redis or a database table.
- Completed uploaded-file ownership is also process-local. Production completion
  should store upload-session/file bindings in shared storage or verify Drive
  `appProperties` directly at save time.

Still required before Phase 0.3 is fully `Complete`:

- Automated tests for anonymous, malformed session, forged query/body identity,
  owner access, cross-user denial, admin access, and upload URL replay.
- Production/staging verification using real cookie, Drive, Zoom/Meet, and audio
  recording flows.

## Auth, rate-limit, and audit evidence

Implemented:

- `lib/session.ts`
  - Signed cookie payload now includes `iat`, `exp`, and `sid`.
  - `verifySessionCookieValue` rejects expired, forged, malformed, and revoked
    session IDs.
  - `revokeSessionCookieValue` records logout revocation until the original
    cookie expiry.
  - Transition caveat: old signed cookies without `sid` still verify until their
    normal expiry, so logout revocation applies only to newly minted `sid`
    sessions.
- `app/api/auth/logout/route.ts`
  - Revokes the current session ID before clearing the cookie.
  - Emits a structured logout audit event.
- `lib/login-rate-limit.ts`
  - Process-local fallback login limiter using source IP and normalized account identifier.
  - IP limit: 30 attempts per 15 minutes.
  - Account limit: 8 attempts per 15 minutes.
  - Progressive temporary block from 5 minutes up to 60 minutes.
- `app/api/auth/login/route.ts`
  - Emits audit events for malformed login attempts, invalid credentials,
    rate-limit denial, and successful login.
  - Emits sanitized audit events for unparseable bodies, auth-service failures,
    unexpected upstream payloads, and session-cookie signing failures.
  - Uses generic credential messages and returns `429` with `Retry-After` when
    rate-limited.
- `lib/security-audit.ts`
  - Structured event helper with event ID, timestamp, actor, action, outcome,
    source IP, correlation ID, target, and safe context.
  - Avoids passwords, tokens, cookies, raw request bodies, transcript content,
    and file contents.

Important limitation:

- Login limiter and logout revocation are process-local. They reduce risk on
  one runtime instance but do not satisfy the distributed production
  requirement.
- Distributed login/session security state remains blocked by owner policy:
  app-managed database create/update/delete/alter operations are strictly
  prohibited. A production distributed control now requires an approved
  external/shared store or pre-provisioned tables with an explicitly allowed
  write contract.

## Browser and edge hardening evidence

Implemented in `next.config.mjs` and middleware response handling:

- No wildcard CORS is configured for authenticated CRM APIs.
- Added:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()`
  - `Content-Security-Policy-Report-Only`
  - Production-only `Strict-Transport-Security: max-age=31536000; includeSubDomains`

Rollout note:

- CSP is intentionally report-only first. Enforced CSP should be applied after
  observing required third-party resources in staging.
- These headers are source-configured. Deployed response-header verification is
  still required before this control is marked production complete.

## API authorization inventory status

Middleware now creates a signed-session boundary for most `/api/*` routes. The
current exact unauthenticated/service exemptions are:

- `/api/auth/login`
- `/api/auth/logout`
- `/api/zoom/connect`
- `/api/zoom/callback`
- `/api/leads`
- `/api/conversion`
- `/api/calendar/mobile` - intentional owner-approved exception

The active prefix exemption list is empty, so `/api/meetings/*` is not exempt.
NextAuth runtime actions under `/api/auth/*` are separately allowed only for the
expected NextAuth action paths.

High-risk groups still requiring additional explicit route-level authorization
policy and tests include:

- pipeline/checkpoint CRUD;
- remaining booking/workflow routes that need deeper department, branch, and
  workflow-stage checks beyond the newly added KTAHV/Villa action gates;
- medical/helpdesk write endpoints that should not be writable by any signed
  user.

These groups should be fixed in P0/P1 order, with write routes first, before
Phase 2 can move beyond `Partial`.

High-risk write-route improvements implemented in this pass:

- `app/api/received-leads/transfer/route.ts`
  - Now requires a verified signed session and `ai_voice_received.view` or admin
    access before updating lead transfer/status fields.
- `app/api/received-leads/feedback/route.ts`
  - Now requires a verified signed session and `ai_voice_received.view` or admin
    access before locking/submitting feedback.
- `app/api/mark-followed-up/route.ts`
  - Now requires a verified signed session and `deal_assistant.view` or admin
    access.
  - Ignores browser-supplied `markedBy` and stamps `marked_by` from the signed
    session email/name.
- `app/api/voice-proxy/route.ts`
  - Now requires a verified signed session plus `ai_voice_sent.view`,
    `ai_voice_received.view`, or admin depending on the selected upstream.
  - Rejects unknown `type_proxy` values with `400` instead of defaulting to the
    received/all upstream.
- `app/api/pipeline/route.ts`
  - Now requires a verified signed session and `meetings.view` or admin access
    before checkpoint create/read/update/delete.
  - Owner-level checkpoint isolation still needs a schema change or trusted
    ownership column because current checkpoint IDs are only browser
    `sessionStorage` references.
- `app/api/ktahv-bookings/actions/accounts/route.ts`
  - Now requires admin or server-side `ktahvPage.accountsVerify` action
    permission from the signed session's `user.action.ktahvPage` before
    proxying accounts verification stages.
- `app/api/ktahv-bookings/actions/fo-pms/route.ts`
  - Now requires admin or server-side `ktahvPage.foVerify` action permission
    from the signed session's `user.action.ktahvPage` before proxying FO/PMS
    verification stages.
- `app/api/ktahv-bookings/actions/checkout/route.ts`
  - Now requires admin or server-side `ktahvPage.checkOutVerify` action
    permission from the signed session's `user.action.ktahvPage` before
    proxying checkout verification.
- `app/api/ktahv-bookings/actions/payment/route.ts`
  - Now requires admin, `ktahvPage.collectionAll`, or
    `ktahvPage.collectionSelf` with authoritative booking-owner verification
    before proxying payment collection to GAS.
  - Browser-supplied `paymentCollectedBy` is overwritten with the signed
    session identity.
- `app/api/ktahv-bookings/actions/approval/route.ts`
  - Now requires admin, `ktahvPage.approvalAll`, or
    `ktahvPage.approvalSelf` with authoritative booking-owner verification
    before proxying approval upload to GAS.
  - Browser-supplied uploader identity is overwritten with the signed session
    identity.
- `app/api/ktahv-bookings/actions/cancellation/route.ts`
  - Now requires admin, `ktahvPage.cancelAll`, or `ktahvPage.cancelSelf` with
    authoritative booking-owner verification before proxying cancellation to
    GAS.
  - No current KTAHV action-map role grants `cancelAll`; today this means admin
    or owner-matched `cancelSelf` in practice unless the action map is
    deliberately expanded.
  - Browser-supplied cancellation actor fields are overwritten with the signed
    session identity.
- `lib/ktahv-booking-auth.ts`
  - Centralizes KTAHV write authorization.
  - Loads the authoritative booking row from
    `ktahv_bookings_fms_v3_part1` joined to
    `ktahv_bookings_fms_v3_nb_booking_verification_stage`.
  - Treats `nb_bvs_doer` as the owner field for Self actions because the
    active KTAHV bookings page checks `booking.assignedTo`, which is derived
    from `nb_bvs_doer`.
  - Uses the shared name alias normalization from `lib/utils.ts` before
    comparing signed-session `user.name` with the booking owner.
- `app/api/villa-bookings/route.ts`
  - `GET` now requires a verified signed session and `villa_raag.view` or admin
    access before returning booking rows or payment-collection lookup data.
  - `POST action="payment"` now requires admin, `villaRaagPage.manageAll`,
    `villaRaagPage.collectionAll`, or `villaRaagPage.collectionSelf` with
    server-verified `booking_taken_by` ownership.
  - `POST action="cancel"` now requires admin, `villaRaagPage.manageAll`, or
    `villaRaagPage.cancelSelf` with server-verified `booking_taken_by`
    ownership.
  - Payment collector is now stamped from the signed session identity instead
    of trusting browser-supplied `paymentCollectedBy`.
- Partner onboarding and partner proxy routes:
  - `app/api/partners/route.ts` now requires a verified signed CRM session
    and `partners.view` or admin before read/create/update proxy calls.
  - `app/api/capture-partner/route.ts` now requires the same verified signed
    CRM session and `partners.view` or admin before forwarding partner capture
    writes.
  - `app/api/rejected-partners/route.ts` now requires the same verified signed
    CRM session and `partners.view` or admin before reading/writing rejected
    partner data, including the local fallback JSON store.
  - `app/api/ktahv-partners/route.ts` now requires the same verified signed CRM
    session and `partners.view` or admin before exposing travel-agent lookup
    data.
  - Partner create/capture/reject actor fields are stamped from the signed
    session where the route has such fields, rather than trusting browser
    identity fields.
- `app/api/arrival-departure/route.ts`
  - Now requires a verified signed session before proxying arrival/departure
    submissions.
  - Arrival submissions require admin or `ktahvPage.arrivalFlightSelf`.
  - Departure submissions require admin or `ktahvPage.departureFlightSelf`.
  - All-scope checks are wired for `ktahvPage.arrivalFlightAll` and
    `ktahvPage.departureFlightAll`; no current role grants those actions unless
    the action map is expanded.
  - Non-admin Self submissions now load the authoritative KTAHV booking row and
    require the signed session name to match `nb_bvs_doer`.
  - Browser-supplied `uploadedby` is overwritten with the signed session
    identity before forwarding.

Remaining high-risk write groups include owner-level pipeline/checkpoint
isolation, medical/helpdesk-style write endpoints, and automated negative tests
for the newly hardened KTAHV/Villa/partner routes.

Booking-action authorization note:

- The UI contains `ktahvPage` / `villaRaagPage` action concepts such as
  `collectionSelf`, `collectionAll`, `approvalSelf`, `approvalAll`,
  `accountsVerify`, `foVerify`, `checkOutVerify`, and cancellation actions.
- These action checks are currently client-side. Before enforcing them safely in
  API routes, the action predicate should be extracted into a server-safe module
  and each write route should load the authoritative booking row to decide
  whether a `Self` action applies. Browser-supplied assignee/doer/collector
  fields must not decide ownership.
- KTAHV payment/cancellation/approval and arrival/departure routes now enforce
  server-side action checks with authoritative booking-owner lookup for Self
  actions. They still need automated tests and staging/prod verification before
  the control can be called production complete.

## Verification commands run

- Previous `npm audit --audit-level=moderate`
  - Result: `0 critical`, `0 high`, `2 moderate`.
- `npm audit --omit=dev --json`
  - Earlier result in this task: `0 critical`, `0 high`, `2 moderate`.
  - Latest rerun on 2026-08-13 was not completed because external npm registry
    access was blocked/rejected to avoid disclosing dependency metadata without
    explicit approval.
- Focused TypeScript check filtered to security-touched files:
  - Result after latest meeting/API hardening:
    `TOUCHED_FILE_ERROR_COUNT=0`.
- Focused TypeScript check filtered to the latest partner, arrival/departure,
  Villa, and authorization helper files:
  - Files covered: `lib/authz.ts`, partner proxy routes,
    `app/api/arrival-departure/route.ts`, and
    `app/api/villa-bookings/route.ts`.
  - Result: `TOUCHED_FILE_ERROR_COUNT=0`.
- Focused TypeScript check filtered to the latest proxy/booking-action security
  files:
  - Files covered: partner proxy routes, voice proxy,
    KTAHV action routes, `app/api/arrival-departure/route.ts`,
    `app/api/villa-bookings/route.ts`, `lib/authz.ts`, and
    `lib/ktahv-booking-auth.ts`.
  - Result: `TOUCHED_FILE_ERROR_COUNT=0`.
- `npm.cmd run security:check`
  - Result: `Security regression check passed (27 checks)`.
  - Covered middleware meeting exemption removal, partner permission gate,
    KTAHV Self/All authorization wiring, Villa owner/actor rules, auth
    rate-limit/logout revocation wiring, the absence of app-managed database
    security-state table usage, voice-proxy selector validation, and security
    header presence.
- Focused TypeScript API check for security-touched files:
  - Result: `totalDiagnostics=0`, `targetDiagnostics=0`.
- Independent final verification of auth/security helper files:
  - Focused compiler check covered auth login/logout, `lib/authz.ts`,
    `lib/session.ts`, `middleware.ts`, and new security helper files with no
    diagnostics.
- Independent final verification of key dependency versions:
  - `form-data@4.0.6`
  - `googleapis@171.4.0`
  - `mysql2@3.18.2`
  - `next-auth@4.24.15`
  - `next@16.3.0`
  - override paths show `minimatch`, `brace-expansion`, `tmp`, and `qs` resolved
    to the intended patched versions.
- `node -e "const ExcelJS=require('exceljs'); const { jsPDF }=require('jspdf'); ..."`
  - Result: `exceljs+jspdf smoke ok`.
- `node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false`
  - Earlier result: failed on existing repo-wide TypeScript errors unrelated to
    the security files.
  - Latest 2026-08-13 rerun via `npm.cmd run typecheck`: still fails on
    legacy repo-wide TypeScript errors outside the security-touched file set.
- `npm.cmd run lint`
  - Passes the scoped ESLint gate.
- `npm.cmd run build`
  - Passes. Remaining build warnings: deprecated `middleware` convention and an
    ignored App Router `config` export in `app/api/pipeline/route.ts`.
- `git diff --check`
  - Security-touched paths: no whitespace errors, only CRLF conversion warnings.
  - Full repo: blocked by unrelated trailing-whitespace errors in other modified
    API files.

Known verification blocker:

- Full repo raw TypeScript evidence is not available yet. Security-touched files
  pass focused diagnostics, and lint/build now pass, but repo-wide TypeScript
  errors must be resolved or explicitly baselined before removing
  `typescript.ignoreBuildErrors`.

## Current score estimate

Provisional source-only repository score after the current hardening:
**approximately 7.4/10**.

Reason:

- Critical/high dependency advisories are cleared.
- Main meeting IDOR and forged-identity paths are hardened repo-side.
- Meeting audio/upload/transcription abuse controls are improved.
- Login throttling, session IDs, logout revocation, structured auth audit
  events, and browser hardening headers now exist.
- Additional high-risk write/proxy surfaces are now server-gated, including
  partner onboarding proxies, strict voice proxy, arrival/departure submissions, Villa
  payment/cancellation, and KTAHV payment/approval/cancellation with signed
  session ownership checks where the route has authoritative owner data.

Why this is not an overall production security score:

- MFA is not implemented.
- Rate limits and revocation are not distributed.
- Full API authorization matrix and automated negative tests are not complete.
- Audit events are not centralized/append-only and alerts are not verified.
- DB grants, TLS, encryption, backups, restore tests, SIEM, incident response,
  access reviews, and credential rotation require external evidence.
- Full repo raw TypeScript verification is currently blocked by unrelated
  legacy errors.

Verified production security posture remains unscored until automated tests,
staging/prod evidence, infrastructure controls, and external security evidence
are supplied.

Target score remains:

- **7.8-8.2/10** after repository-side tests, API authorization coverage, and
  build verification are completed.
- **8.5-9.0/10** only after verified MFA, distributed session/rate controls,
  centralized audit/monitoring, infrastructure evidence, recovery evidence, and
  independent testing.
