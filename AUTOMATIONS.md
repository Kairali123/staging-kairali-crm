# AUTOMATIONS

No unattended job is authorized until a complete row is marked `ACTIVE` by the owner.

| ID | Trigger | Task source | Allowed scope | Stop condition | Status | Last run UTC |
|---|---|---|---|---|---|---|
| AUTO-DB-001 | Working days at 18:00 Asia/Kolkata | Open database GitHub issues, PRs, durable workspace state, and that date's daily report | Create/update the sanitized daily roll-up; email the established Satyam addresses with owner and sysadmin copied; escalate P0/P1, overdue blockers, unreviewed/self-approved database changes, failed verification, and direct pushes to `main` | GitHub or Gmail unavailable; content contains restricted data; a consequential change needs approval; owner pauses | ACTIVE — Codex automation `crm-database-daily-control` | Never; created 2026-08-13T11:11Z |
