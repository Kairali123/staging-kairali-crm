# Email Trigger Config — local backend

## What now works

CRM sidebar → Email Trigger Config. The Auto Trigger email report action still preselects the report. Saved configurations persist on this machine across reloads and server restarts. Admin-only APIs validate recipients, report identity, schedule and revision. Active saves calculate the next run; Draft/Paused do not send.

The local worker checks due work every 15 seconds and uses the existing SMTP configuration. Each run builds a fresh report with the existing read-only sources and the report's existing email layout. No saved browser session or old report snapshot is used for sending. Existing report coverage warnings remain visible.

Start the CRM with `npm run dev -- --port 3011` and worker with `npm run email-trigger:worker`. Both processes and the computer must remain running. The browser may close. This is not a hosted deployment or OS boot service.

Local private state and the worker bearer key live in `.local/email-triggers/`, excluded from Git, with restrictive file permissions. The config API exposes no worker key or SMTP secret. The worker endpoint requires the separate bearer key. Credentials, recipients and report data must not be published.

## Delivery behavior

Daily, weekly, monthly, one-time, custom times and every 1–168 hours are supported. Timezones: Asia/Kolkata, Asia/Dubai, UTC (fixed offsets). Today/Yesterday use the report's IST reporting calendar; Selected date stays fixed. Active starts at the next future schedule, not immediately on Save.

A durable reservation is recorded before SMTP. Concurrent ticks cannot claim the same scheduled run. Provider accepted, failed, skipped, partial and uncertain outcomes are recorded. Partial/uncertain outcomes pause the trigger; inspect the mailbox before resuming. Crashed in-flight runs older than 10 minutes pause as Unknown. Automatic SMTP retries are deliberately unavailable because an ambiguous timeout can already have delivered mail.

Missed runs older than 15 minutes skip; the grace window accommodates ordinary worker delays. Up to five due configurations are handled per tick. No-data condition skips empty scoped reports. Automatic attachments and per-recipient personalised reports are not enabled in this implementation; the form exposes only supported choices. All recipients receive the same body.

Atomic state writes plus exclusive directory locking protect local concurrency. If a process dies while holding the short state lock, writes fail closed: stop the worker, back up state and review it before an operator removes the stale lock. Never remove a live lock.

## Hosted boundary

The file store explicitly refuses Vercel execution. Hosted activation needs shared durable storage with atomic reservation semantics, a configured recurring execution service, environment setup and deployment. No production schema, environment or deployment mutation was performed. Do not deploy this as a working hosted scheduler without those changes.

## Verification

11 scheduler/dispatch tests pass using temporary stores and fake delivery: IST boundaries, recurrence, end dates, invalid dates, duplicate protection, pause during preparation, ambiguous SMTP, no-data, late-run skip and data-source failure. Scoped TypeScript and ESLint pass. Unauthenticated config/worker requests return 401. Browser verified sidebar entry, worker-ready status, save and restore after dev-server restart. One inactive blank-recipient Daily Sales Report draft remains. No actual test email was sent; SMTP configuration presence was checked, not live mailbox delivery.

Undo: pause Active configurations first, stop the worker, preserve private state for recovery, then revert the API/menu/bridge/backend additions. Existing reports and manual email/export paths were not changed by this backend work.

## Git publication

Published on `codex/email-trigger-config`, based on the existing Daily Sales Report Alert branch. This branch explicitly disables Vercel Git auto-deployment in `vercel.json`; no hosted scheduler is provisioned. Verification: 11 mocked-delivery tests, scoped TypeScript and ESLint pass. Private runtime state, recipients, worker key and environment files are excluded.
