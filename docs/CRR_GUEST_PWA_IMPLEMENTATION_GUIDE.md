# CRR Guest Handling PWA — Staging Integration Guide

This guide explains how to use the accompanying master prompt inside an existing staging CRM repository.

## What this package is

The master prompt instructs a coding agent to add:

- An installable guest-facing PWA for vehicle iPads and Android devices
- A quick airport-transfer feedback flow
- A Riya Sharma AI Chat QR experience
- An Explore Kairali and Media Center section
- SQL-first data storage
- Reliable background synchronization to Google Sheets
- A secured configuration module in the existing CRM
- Reporting integration in the existing CRM

It does **not** authorize production deployment or replacement of existing CRM architecture.

## Files

- `docs/CRR_GUEST_PWA_MASTER_PROMPT.md` — copy-paste implementation prompt
- `docs/CRR_GUEST_PWA_IMPLEMENTATION_GUIDE.md` — this setup and verification guide

## Recommended setup

1. Place both files inside the root of the staging CRM repository, preserving the `docs/` folder.
2. Open that staging CRM folder in Codex.
3. Make sure the repository is on the intended staging branch or worktree.
4. Keep a recoverable backup or Git commit of the current staging state.
5. Confirm that the development database points to staging/local resources, never production.
6. Open `docs/CRR_GUEST_PWA_MASTER_PROMPT.md`.
7. Replace known placeholders such as `<RIYA_CHAT_URL_OR_CONFIGURE_IN_ADMIN>` and `<STAGING_CRM_URL>`.
8. Copy the complete prompt into a new Codex task opened at the CRM repository root.

Do not paste service-account private keys or database passwords into the prompt. Add secrets only through the staging environment/secrets system already used by the CRM.

## First agent checkpoint

Before the agent edits code, its repository-specific plan should identify:

- CRM framework and language
- Frontend framework and component system
- Authentication and permission model
- SQL engine and ORM/query layer
- Migration command
- Existing background-job mechanism
- Existing reporting module
- Upload/media-storage convention
- Proposed guest-PWA routes
- Proposed admin-config route
- Proposed SQL tables/migrations
- Google Sheets synchronization mechanism

If the agent proposes replacing the current CRM stack, stop and correct it. The new feature should fit the existing application.

## Suggested application boundaries

Exact paths must follow the existing CRM conventions, but the logical separation should remain:

```text
Guest-facing PWA
  Welcome/video
  Quick feedback
  Riya Sharma QR/chat link
  Explore Kairali
  Offline queue

CRM admin
  PWA configuration
  Devices/vehicle mapping
  Published configuration
  Existing reporting integration
  Google Sheets sync status

Server
  Public scoped device/config API
  Feedback submission API
  Admin configuration API
  SQL persistence
  Google Sheets sync worker
```

## Suggested URL map

These are examples, not mandatory route names:

```text
/guest-experience                 Guest PWA home
/guest-experience/feedback        Quick feedback
/guest-experience/explore         Kairali group and media

/admin/guest-experience/config    CRM configuration
/admin/guest-experience/devices   Device and vehicle mapping
/admin/reports/guest-transfers    Existing CRM reporting surface

/api/guest-experience/config      Latest published device config
/api/guest-experience/feedback    Feedback submission
/api/admin/guest-experience/*     Authenticated configuration APIs
```

## Environment configuration

The implementation agent should use the CRM's existing environment naming style. Typical staging values are:

```text
RIYA_CHAT_URL=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_WORKSHEET_NAME=Guest Transfer Feedback
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
```

Only variable names and safe sample values belong in `.env.example`. Actual secrets belong in the staging secret store or local ignored environment file.

## Google Sheets preparation

1. Create a dedicated staging spreadsheet.
2. Create a worksheet such as `Guest Transfer Feedback`.
3. Create a least-privilege Google service account.
4. Share only the staging spreadsheet with the service-account email.
5. Put credentials in the CRM's staging secret manager.
6. Test with fake guest data before any real data is used.

Recommended columns:

```text
Submission ID
Server timestamp
Client timestamp
Device
Vehicle
Driver
Route/pickup reference
Language
Journey rating
Driver on time
Pickup coordination
Vehicle comfort
AC and water
Driver courtesy and safety
Issue tags
Comment
Contact requested
Offline origin
SQL record ID
Sheet synced at
```

The application should map columns by a controlled schema, not by blindly appending arbitrary client fields.

## Riya Sharma AI Chat preparation

Obtain the canonical HTTPS chat URL. Prefer configuring the destination URL and letting the CRM generate the QR instead of permanently uploading a QR image.

If supported by Riya Sharma, add non-sensitive query parameters such as:

```text
source=vehicle-pwa
device=<public-device-reference>
language=<selected-language>
campaign=<campaign-reference>
```

Do not put guest names, phone numbers, booking numbers, credentials, or sensitive CRM identifiers directly inside the QR URL.

## Media and group-company content

The official Media & Download Center URL is:

https://www.kairali.com/media-assets.html

The current page provides centralized access to group brochures, prices, photos, videos, and documents. Keep this link configurable so it can be changed without releasing a new PWA version.

Group-company cards should also be configuration-driven. Initial entries:

- Kairali – The Ayurvedic Healing Village
- Kairali Ayurvedic Products
- Kairali Ayurvedic Centre
- Villa Raag

## Staging test checklist

### Guest experience

- Welcome video loops muted.
- Sound starts only after guest interaction.
- Layout works in iPad landscape and portrait.
- Mobile view uses a direct Riya Chat button instead of a self-scan-only QR.
- QR opens the configured staging chat destination.
- Media link and return journey are clear.
- Feedback can be completed in under 45 seconds.
- Conditional issue tags appear only when required.
- Successful submission shows a thank-you screen.
- Guest state clears after automatic reset.

### Data

- One guest submission creates one SQL record.
- Repeated offline retries do not create duplicates.
- Google Sheets failure does not roll back the SQL record.
- Failed sheet sync is retried and visible to admins.
- Contact details are absent unless follow-up was requested.
- Device/vehicle attribution is correct.

### Offline

- Previously loaded PWA starts without a connection.
- Welcome media/configuration uses the cached published version.
- Offline feedback survives a page refresh or browser restart.
- Feedback syncs after reconnection.
- Local queued data clears only after server confirmation.

### CRM security

- Unauthenticated users cannot access configuration or reports.
- Unauthorized CRM roles receive the correct denial response.
- Public vehicle endpoints cannot query general CRM data.
- Uploaded content is type- and size-validated.
- No SQL, Google, or CRM secret appears in the browser bundle.
- Configuration changes have an audit trail.

## iPad installation

After the staging PWA is served over HTTPS:

1. Open the staging PWA URL in Safari.
2. Tap Share.
3. Tap **Add to Home Screen**.
4. Launch the new PWA icon and verify standalone mode.
5. Register/assign the device in the CRM configuration module.
6. Load the published configuration and welcome video while online.
7. Test offline startup and feedback queueing.
8. Enable iPad Guided Access for the PWA during guest use.

APK files do not run on iPad. Android devices can install the same PWA from Chrome. Android APK wrapping should be treated as a separate optional delivery step.

## Definition of staging-ready

The feature is staging-ready only when:

- Database migrations apply successfully.
- The CRM build, type checks, lint, and relevant tests pass.
- Admin configuration can be drafted, previewed, and published.
- The PWA loads the published configuration.
- Feedback works online and offline.
- SQL records are created exactly once.
- Google Sheets synchronization succeeds or safely retries.
- Existing CRM permissions protect config and reporting.
- Tablet and mobile flows have been visually verified.
- Required environment variables and device-installation steps are documented.

## Production promotion

Production promotion is a separate, explicitly approved step. Before promotion:

- Replace all staging URLs and credentials.
- Confirm data-retention and privacy policy.
- Confirm CRM roles and device revocation process.
- Use the production Google Sheet/service account only after approval.
- Test at least one real iPad in the vehicle operating environment.
- Confirm welcome-video file size and mobile-data usage.
- Prepare a rollback plan for application and database changes.

