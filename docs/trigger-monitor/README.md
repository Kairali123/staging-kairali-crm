# Trigger Management rollout (TRG-001)

Entry: `/settings/automation/trigger-management`, Super Admin only. This module monitors Google Apps Script installable triggers; it does not delete, recreate, pause or execute business triggers.

## Setup

1. Existing `email_trigger_state` table must be provisioned (see `scripts/migrate-email-triggers.mjs`). Monitoring uses **row 2**, independently of email scheduling row 1. No request creates schema. No production schema migration was executed for this feature.
2. Staging OAuth: configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXT_PUBLIC_APP_URL` (or the Vercel-provided `VERCEL_PROJECT_PRODUCTION_URL`). The registered Google callback is `<origin>/api/trigger-monitor/callback`. Enable Drive API. Consent requests only identity/email and read-only Drive metadata.
3. `TRIGGER_MONITOR_ENCRYPTION_KEY` (32+ characters), or existing `NEXTAUTH_SECRET`, encrypts Google refresh tokens with AES-256-GCM. Keep the key stable; rotation requires reconnecting accounts. Tokens never enter dashboard JSON or logs.
4. Connect each account through Google consent. Drive discovery lists accessible **standalone script projects**, not all sheet-bound scripts or all triggers. Register bound script IDs in the page. Partial pagination and failed scans stay visible.
5. Generate a **project/account-scoped** connector token; download `connector.gs` and add it to that script. As the trigger creator run `crmMonitorConfigure`. For standalone projects, use a temporary setup function calling `crmMonitorSetup(origin, token)`, remove that setup function afterward. UserProperties isolate credentials per Google user; do not commit tokens. Rotate from the dashboard if exposed.
6. Preserve existing trigger handlers and schedules. Wrap each handler:
   ```js
   function existingHandler(e) {
     return crmMonitorRun(e, function () {
       // Existing synchronous business logic goes here.
     });
   }
   ```
   Preserve return values. Existing thrown exceptions are rethrown. Manual executions (without `triggerUid`) are not attributed to a trigger. Hard process termination cannot send completion and becomes Unknown after 10 minutes. Partial errors swallowed by business code are not visible to the wrapper. The connector reports metadata and reason codes only, never sheet cell contents or raw exceptions.
7. Setup adds one hourly inventory heartbeat in that project for that creator. It excludes its own triggers from inventory. Up to 100 delayed execution outcomes are queued in UserProperties and 20 retried per heartbeat. Monitor stale status and Google execution logs if delivery fails. Google account authorization and per-project installation are required; entering an email alone cannot grant access.
8. In Daily Email Configuration enter recipients and time (default 09:00 IST), save draft, then activate through the existing CRM email configuration once SMTP and scheduler readiness are confirmed. The `trigger-health-digest` renderer is registered there. Existing `/api/cron/email-triggers` handles reservations and delivery history; `/api/cron/trigger-monitor` performs bounded discovery every 15 minutes and requires `CRON_SECRET`.

## Data truth and limits

- Trigger creator is the configured connector account (the connector uses the effective Google user). Sheet owner is separate and may be unavailable for shared drives. A connector credential is trusted only for its registered project/account.
- Google Trigger objects expose neither historical creation timestamps nor existing schedule details. Those fields are shown as unavailable, separately from first discovery; use the linked Apps Script Triggers page to inspect schedules.
- Success/failure percentages use completed retained executions started in the rolling last 24 hours. Running/unknown are excluded, and zero completed runs yields no percentage.
- Failure stays open until a newer successful execution. Acknowledging does not change outcome. Removed trigger inventory is retained. History retention is 30 days and 50,000 execution records; truncation is disclosed.
- Accounts and project connections are not proof of complete inventory. Stale inventory (>2 hours), unwrapped functions and missing completion telemetry remain Unknown.
- Apps Script property storage and service quotas limit throughput. This collector suits modest scheduled automation; high-volume workloads require an external telemetry queue before expanding.

## Verification

`node --test scripts/trigger-monitor.test.cjs scripts/email-triggers.test.cjs`

`node --max-old-space-size=4096 node_modules/typescript/bin/tsc -p tsconfig.trigger-monitor.json`

`node node_modules/eslint/bin/eslint.js lib/trigger-monitor app/api/trigger-monitor app/api/cron/trigger-monitor app/settings/automation/trigger-management`

Full-repository typecheck exhausted the default Node heap; the scoped strict check is the feature validation. Builds inherit the repository's existing `ignoreBuildErrors` setting, so a successful build alone is not type evidence.

## Rollback

Redeploy the previously verified staging deployment. Disable the new daily digest in Email Configuration, revoke connector tokens, and remove only each creator's `crmMonitorHeartbeat` collector trigger if abandoning monitoring. Do not remove business triggers. Keep row 2 for recovery; no destructive rollback SQL is needed. Remove wrappers by restoring the original handler bodies. DB-012's previous control checkpoint remains preserved.

## References

- https://developers.google.com/apps-script/reference/script/script-app#getProjectTriggers()
- https://developers.google.com/apps-script/reference/script/trigger
- https://developers.google.com/apps-script/guides/bound
