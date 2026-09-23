# CRR Guest Handling PWA — Master Build Prompt

Copy the prompt below into Codex while Codex is opened inside the root folder of the existing **staging CRM repository**.

Before running it, replace only the values inside `<ANGLE_BRACKETS>` that are already known. Leave unknown values unchanged and let the implementation agent discover or document them.

---

## Copy-paste prompt

```text
You are working inside our existing STAGING CRM repository. Build and integrate a production-quality, installable Guest Handling PWA for Kairali airport-transfer vehicles. Do not touch production, do not deploy to production, and do not replace the CRM's existing architecture, authentication, design system, database conventions, or reporting framework.

Business context
----------------
The PWA will be installed on an iPad or Android device kept inside a guest vehicle. It welcomes international guests travelling from the airport, plays a Kairali welcome video, collects a very short transfer review, shows a QR code that opens the existing Riya Sharma AI Chat on the guest's own phone, and provides an Explore Kairali section.

Official media page:
https://www.kairali.com/media-assets.html

Riya Sharma AI Chat URL:
<RIYA_CHAT_URL_OR_CONFIGURE_IN_ADMIN>

Existing CRM staging URL, if known:
<STAGING_CRM_URL>

Critical operating rules
------------------------
1. Start by inspecting the repository, its AGENTS.md/instructions, framework, package manager, auth model, database layer, migration system, API conventions, admin navigation, design system, tests, and existing reporting pages.
2. Present a concise implementation map based on the real repository before editing. Ask only questions that are genuinely blocking; otherwise make safe, documented assumptions.
3. Preserve all existing user changes and unrelated code. Never use destructive Git commands.
4. Work only in staging. Do not send real guest data to production services.
5. Reuse the CRM's current stack. Do not introduce a second framework, database ORM, authentication system, component library, or state-management library unless absolutely required and explicitly justified.
6. Use the existing SQL database as the primary source of truth. Google Sheets is an asynchronous operational mirror, never the primary database.
7. Do not expose database, Google, CRM, or service-account credentials in the client/PWA bundle.
8. Make schema changes through the repository's normal migration mechanism. Include rollback guidance but do not run destructive rollbacks automatically.
9. Do not deploy anywhere unless explicitly asked. Complete and verify the staging implementation locally first.

Required product surfaces
-------------------------

A. Guest PWA

Create a responsive, installable PWA optimized first for iPad landscape and then for mobile/Android.

Home/welcome experience:
- Full-screen Kairali-branded welcome surface.
- Muted welcome video loops automatically when allowed by the device.
- A clear "Replay with sound" action after user interaction.
- Large touch-friendly actions: "Share Quick Feedback" and "Explore Kairali".
- A visible "Chat with Riya Sharma" QR card on tablet/iPad.
- On a mobile viewport, replace the self-scanning QR interaction with an "Open Riya Sharma AI Chat" button.
- Language selector. Use English as default. Structure translations so additional languages can be configured without duplicating pages.
- Automatic return to the welcome screen after an inactivity timeout and after a completed feedback session.
- Clear all guest-entered session state after reset.

Quick feedback:
- Target completion time: 30–45 seconds.
- Use large, accessible touch choices.
- Questions:
  1. How was your journey from the airport?
  2. Did your driver arrive on time?
  3. Was the airport pickup easy and well coordinated?
  4. Was the vehicle clean and comfortable?
  5. Were the air-conditioning and drinking water satisfactory?
  6. How would you rate the driver's courtesy and safe driving?
- Main answer choices: Excellent, Good, Needs attention.
- When "Needs attention" is selected, reveal relevant issue tags: driver arrived late, difficulty locating driver, poor coordination, vehicle cleanliness, uncomfortable seating, air-conditioning issue, drinking water unavailable, luggage assistance, driving comfort/safety, and other.
- Allow an optional short comment.
- Allow an optional "Please ask Guest Relations to contact me" choice. Collect personal/contact data only when this is selected and use the CRM's existing privacy conventions.
- Prevent accidental duplicate submissions.
- Show a thank-you state and then reset automatically.

Explore Kairali:
- Create a secondary information page; do not crowd the first screen.
- Include configurable cards for:
  - Kairali – The Ayurvedic Healing Village
  - Kairali Ayurvedic Products
  - Kairali Ayurvedic Centre
  - Villa Raag
- Include a prominent but secondary "Media & Download Center" link to:
  https://www.kairali.com/media-assets.html
- Explain that the media center contains official brochures, price lists, photo galleries, video tours, and company documents.
- External navigation must not trap the vehicle iPad away from the welcome experience. Use the safest pattern supported by the existing application and provide an obvious return path. A configurable media-page QR may be added for guests who prefer their own phone.

Offline behaviour:
- Cache the PWA shell, essential branding, the active configuration, and the selected welcome video where practical.
- Queue feedback locally when the connection is unavailable.
- Retry safely when connectivity returns.
- Use a client-generated idempotency/submission ID so retries cannot create duplicate SQL rows.
- Remove locally queued data only after confirmed server acceptance.
- Show a discreet offline/sync status that does not confuse guests.

B. CRM configuration module

Add a secured admin configuration page inside the existing CRM, using its current authentication and authorization.

Configuration must support:
- Welcome video upload/reference, poster image, heading, and message.
- Logo and approved brand assets.
- Riya Sharma AI Chat destination URL.
- Automatic QR generation from the configured URL.
- Optional custom QR image upload as a fallback.
- QR caption/instructions.
- Media Center URL and optional media QR.
- Group-company cards: name, logo, description, link, display order, active/inactive.
- Feedback questions, labels, order, active/inactive state, and issue tags.
- Languages and translated content.
- Thank-you message.
- Inactivity and post-submission reset timings.
- Device/car assignment and optional driver/route assignment.
- Draft, preview, and publish states.
- Configuration version history and audit fields using existing CRM conventions.

The PWA must read only the latest published configuration. Cache the last valid published version for offline use. Validate all uploaded files and URLs on the server.

C. SQL data model and API

Use the CRM's existing SQL engine and data-access conventions. Adapt names to repository conventions, but cover these concepts:
- guest feedback submissions
- individual answers or a safely validated structured answer payload
- selected issue tags
- registered PWA devices
- vehicle/device/driver/route assignment where the CRM already supports these entities
- PWA configuration and published versions
- QR campaigns/destinations
- Google Sheets synchronization status/log

Each feedback submission should support:
- immutable unique submission ID
- server timestamp and client-captured timestamp
- device and vehicle identifiers
- optional driver, route, booking, or pickup reference when available
- language
- answers and issue tags
- optional comment
- contact-request flag and authorized contact fields
- online/offline-origin metadata
- Google Sheets sync state

Expose authenticated/admin APIs and public-device APIs according to existing CRM patterns. Public PWA endpoints must use scoped device identification, validation, rate limiting, and least privilege. Never expose general CRM access to a vehicle device.

D. Google Sheets synchronization

Implement server-side asynchronous synchronization after the SQL transaction succeeds.

Required behaviour:
- SQL commit happens first.
- A failed Google Sheets write must never cause loss of the SQL feedback record.
- Retry with bounded exponential backoff or the repository's existing job/queue mechanism.
- Use submission ID as the idempotency key.
- Record last attempt, successful sync time, retry count, and safe error summary.
- Provide a staging-safe mock/test mode if Google credentials are not available.
- Add required environment variable names to `.env.example`; never commit secrets.

Likely configuration placeholders:
- GOOGLE_SHEETS_SPREADSHEET_ID
- GOOGLE_SHEETS_WORKSHEET_NAME
- GOOGLE_SERVICE_ACCOUNT_EMAIL
- GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
- RIYA_CHAT_URL

Use different names if the repository has an established convention.

E. Existing CRM reporting integration

Do not create reporting inside the public PWA. Integrate into the existing CRM reporting/navigation structure.

Provide or extend reporting for:
- total feedback
- overall journey rating
- on-time pickup percentage
- pickup coordination
- vehicle cleanliness and comfort
- AC and drinking-water satisfaction
- driver courtesy and safe driving
- driver, vehicle, device, date, language, and route filters where data exists
- "Needs attention" records
- contact-request queue
- Google Sheets pending/failed sync status

Reuse existing CRM charts, tables, exports, permissions, date filters, and pagination rather than rebuilding equivalents.

F. PWA installation and device operation

- Provide a valid web manifest, service worker/offline strategy, icons, and standalone display configuration.
- Support Safari "Add to Home Screen" for iPad/iPhone.
- Support Chrome PWA installation for Android.
- Do not call an APK an iPad package. If an Android APK wrapper is later requested, document it as a separate optional packaging step.
- Add an operations guide for iPad Guided Access/kiosk use, Android screen pinning, configuration refresh, cache refresh, device registration, and troubleshooting.

Security and privacy acceptance criteria
----------------------------------------
- Admin config and reports require existing CRM authorization.
- No server secret appears in rendered HTML, JavaScript bundles, logs, or local storage.
- Guest input is validated and safely encoded on both client and server.
- Uploads are type/size validated and stored using the CRM's safe storage pattern.
- Personal details are optional and collected only for a requested follow-up.
- Session details are cleared on guest reset.
- Device credentials are scoped and revocable.
- Audit important admin configuration changes.
- Apply the repository's CSRF, CORS, CSP, encryption, logging, and retention conventions.

Implementation sequence
-----------------------
1. Repository and architecture inspection.
2. Concise repository-specific implementation plan and route/schema map.
3. Database migration and server contracts.
4. CRM configuration module.
5. Guest PWA and responsive flows.
6. Offline queue and retry behaviour.
7. Google Sheets sync worker/service.
8. Existing CRM reporting integration.
9. Automated tests and end-to-end staging verification.
10. Documentation and handoff.

Verification requirements
-------------------------
- Run the repository's formatter, type checks, lint, targeted tests, migration checks, and build.
- Test tablet landscape, tablet portrait, and mobile widths.
- Test autoplay fallback, sound activation, QR rendering, chat link, feedback validation, duplicate prevention, success/reset, and external media navigation.
- Test offline submission, browser restart with a queued submission, reconnect, server acceptance, and queue cleanup.
- Test SQL success with Google Sheets failure, retry, and eventual sync.
- Test permissions for configuration and reporting.
- Test that no secrets are present in the client bundle.
- Preserve a clear list of any integration tests that require credentials or external staging services.

Final handoff
-------------
At completion, report:
- files and modules changed
- database migrations added
- routes/endpoints added
- environment variables required
- tests/builds executed and results
- staging URLs or exact local run commands
- how to install the PWA on iPad and Android
- remaining credential-dependent or CRM-owner actions
- known limitations

Do not claim completion if the build, migrations, core feedback flow, offline retry, or authorization checks have not been verified.
```

---

## Values to prepare

The implementation can begin without every item, but these will eventually be needed:

- Staging CRM repository and database access
- Riya Sharma AI Chat URL
- Approved Kairali logo and welcome video
- Google Sheet ID and worksheet name
- Google service account with access only to the selected staging sheet
- CRM roles allowed to configure the PWA and view reports
- Vehicle/device naming convention
- Existing driver/vehicle/booking table details, if applicable

