# AUTOMATIONS

No unattended job is authorized until a complete row is marked `ACTIVE` by the owner.

| ID | Trigger | Task source | Allowed scope | Stop condition | Status | Last run UTC |
|---|---|---|---|---|---|---|
| AUTO-DB-001 | Working days at 09:15, 13:15, and 17:15 Asia/Kolkata | CARMA-DB policy/state/registry/plan; open database GitHub issues and PRs; durable workspace; latest established CRM database email thread | Advance at least 25 ready database cases per working day across three waves, with no upper case or Satyam-decision limit; refresh Dashboard, Batch, Focus, and daily issues; continue safe AI work without waiting; route higher-risk verification to Sunaj; send at most one material email per local day to both Satyam addresses with sysadmin, owner, and EA copied | Restricted data would leave a controlled system; GitHub/Gmail unavailable; a gated production mutation or owner decision is required; owner pauses | ACTIVE — Codex automation `crm-database-daily-control` | 2026-08-18T11:52Z — three scheduled waves complete; 45/25; 51/51 requests; 39/51 reconciliation packets; 12 optional remain; closeout email suppressed |
