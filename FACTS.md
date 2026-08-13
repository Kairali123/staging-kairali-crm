# FACTS

Only store project facts with a named source. Unknown stays unknown.

| Fact ID | Fact | Value | Source | Verified UTC | Status |
|---|---|---|---|---|---|
| F-001 | Database delivery owner | Satyam Kumar / `@chauhansatyam` is in charge of database work and may use AI to accelerate fixes | Owner instruction in Codex task, 2026-08-13 | 2026-08-13 | Verified |
| F-002 | Governance owner | Abhilash K. Ramesh / `@AbhilashKairali` | Authenticated GitHub profile | 2026-08-13 | Verified |
| F-003 | GitHub repository | Private `kairali-digital/KairaliGroup_CRM`, default branch `main` | GitHub repository metadata | 2026-08-13 | Verified |
| F-004 | Satyam repository access | `@chauhansatyam` has write access | GitHub collaborators API | 2026-08-13 | Verified |
| F-005 | Existing issue/PR state | No open GitHub issues and no open pull requests were returned | GitHub issue and PR search | 2026-08-13 | Verified at timestamp only |
| F-006 | Credential-risk residue | Database credentials were previously committed. Sunaj reported on 2026-07-31 that rotation, Vercel updates, deployment and database/application smoke checks succeeded; independent proof that the previous credential is rejected remains required | Authenticated Gmail thread plus `README.md` and `docs/REVIEW_CHANGELOG.md` | 2026-08-13T11:14Z | Reported complete; independent rejection/current-runtime proof open |
| F-007 | Direct email configuration | Satyam's established company and personal delivery addresses and the owner/sysadmin copy loop were resolved from authenticated Gmail history; the connected Gmail app holds the mail credential outside Git | Authenticated Gmail history and Codex automation readback | 2026-08-13T11:14Z | Verified and active |
| F-008 | Initial owner email | A sanitized launch summary linking GitHub issues 1–10 was sent to the authenticated Gmail account | Gmail send readback | 2026-08-13T10:36Z | Sent |
| F-009 | Daily control schedule | Working days at 18:00 Asia/Kolkata; GitHub daily report plus email to the established Satyam/owner/sysadmin loop | Codex automation `crm-database-daily-control` | 2026-08-13T11:11Z | ACTIVE |
| F-010 | Corrected operational handoff | Live queue, control rules, rotation-evidence correction, and 18:00 IST deadline were sent in the existing CRM database thread to both Satyam addresses with Sunaj copied | Gmail send readback | 2026-08-13T11:12Z | Sent |
