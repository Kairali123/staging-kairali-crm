# WhatsApp trigger configuration — WA-001

Route: `/settings/automation/whatsapp` (Super Admin). Navigation: Settings → Automation → WhatsApp Triggers.

## Current implementation

- Two report mappings: Daily Sales Report Alert and Marketing Daily Report.
- Persisted local Draft/Paused configurations with recipients, consent, company, previous completed day, daily time and start date.
- Actual report JPEG preview/download using the existing report endpoints/renderers.
- Redlava template refresh and explicit single-recipient test send. Each send rechecks APPROVED status, English, IMAGE header, variables 1/2, and absence of unsupported interactive components.
- Test send is revision-checked, consent-checked, rate-limited and durably reserved by request ID. Unknown results are never automatically retried. Accepted means provider acceptance, not delivery.
- Server-only `REDLAVA_API_KEY`, optional `REDLAVA_PHONE_ID`; never put the key into browser code or committed files.
- Local private state: `.local/whatsapp-triggers/state.json` (ignored, mode 0600, atomic writes and exclusive lock). No production database changes.

**Local automatic dispatch is implemented.** Run `npm run whatsapp-trigger:worker` alongside the CRM on port 3011. The worker authenticates with its private local secret, verifies renderer health, and advances due daily schedules. Active requires a recent worker heartbeat, consent, recipients and a verified approved image template. Runs are durably reserved; missed runs skip, revision changes cancel unsent recipients, and uncertain sends pause the trigger without retries. Hosted Vercel scheduling still fails closed until shared durable storage is provided.

The renderer uses a fresh headless Edge context with scripts and network disabled. `WHATSAPP_CHROMIUM_PATH` can select an installed Chromium binary on another host. No user browser session is reused. A synthetic health-check JPEG was rendered successfully on this Mac. Both saved triggers remain Draft and no recipient messages were sent.

## Provider evidence (2026-09-16)

Inspected the signed-in Edge Redlava account and its native API documentation:
https://wa.redlava.in/Integrations/ApiDocumentation

Existing `dailysalesreport` and `marketing_daily_reports_lead_status_report` are APPROVED / UTILITY / en, but both use DOCUMENT upload and their approved bodies reference PDF. They cannot satisfy the requested image-header flow unchanged.

Replacement mappings (submitted 2026-09-16; latest Redlava readback PENDING):

| Report | Template name | Header | Variables |
|---|---|---|---|
| Daily Sales Report Alert | crm_daily_sales_report_image | IMAGE | 1 = report date, 2 = company |
| Marketing Daily Report | crm_marketing_daily_report_image | IMAGE | 1 = report date, 2 = company |

Body (replace REPORT TITLE for each report):

    Dear Team,
    Your requested REPORT TITLE for {{1}} covering {{2}} is attached as an image.
    This is your scheduled internal report notification.
    Kairali Group

Footer: `Internal report • Kairali Group`. Language en. Requested category UTILITY; Meta determines the final category and approval.
Examples: `15 September 2026`, `All companies`. Use `sales-sample.jpg` / `marketing-sample.jpg`; both contain only synthetic sample labels, no live report data.

The user approved enabling Edge ChatGPT extension file-URL access; the switch was enabled and verified. Both synthetic sample uploads succeeded and both templates were submitted: sales at 16:11:31 and marketing at 16:15:07 on 2026-09-16 (provider UI times). Both returned PENDING; approval is not yet confirmed. Existing TestKey was found in the provider API Keys UI. User authorized local configuration, but the computer-use tool denied native Terminal access, so the credential was not transferred or stored locally. Browser login alone does not authenticate the public API: Swagger read-only getTemplates returned HTTP 401 without an API key. Local `.env.local` has no Redlava/WhatsApp variable names.

## Verified API contract

- POST `/api/v1/messageTemplate/getTemplates`: `{pagination:{current,pageSize},order:[{fieldName:'creationTime',dir:'desc'}],search:[]}`; response `results[].template`, `total`.
- POST `/api/v1/whatsapp/sendMessage`: `templateName`, `language`, `to`, `base64File:{name,body}`, `templateVariables`.
- Header `x-api-key`; optional `x-phone-id` (required for multiple connected numbers).
- HTTP 200 may contain `error`; require `waMessageId` to confirm provider acceptance.

## Validation and rollback

Run `node --test scripts/whatsapp-triggers.test.cjs` for validation/authentication/persistence/provider-gate and duplicate-send tests. Provider network calls are mocked; these do not prove live provider delivery.

Rollback the scoped WhatsApp page/API/library/navigation changes. Preserve or archive the private local state if needed; no database rollback is required. Existing provider templates were left unchanged. No recipient message was sent.

## Browser verification

On 2026-09-16 the user signed into the local CRM as Super Admin. Both report drafts saved and survived reload, and both live report endpoints generated JPEG previews for 2026-09-15. No browser console errors were observed. Both drafts intentionally have no recipients and no consent checked. No WhatsApp message was sent. Focused tests: 18/18, ESLint clean; full TypeScript check has 24 errors in untouched files. The CARMA workspace validator fails on existing missing workflow files.
