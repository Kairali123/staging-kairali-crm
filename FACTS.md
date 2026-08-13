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
| F-009 | CARMA-DB control schedule | Working days at 09:15, 13:15, and 17:15 Asia/Kolkata; three waves × 10 cases; no more than 10 consolidated human decisions; one material email per local day | Codex automation `crm-database-daily-control` and `database-control/policy.json` | 2026-08-13T11:25Z | ACTIVE |
| F-010 | Corrected operational handoff | Live queue, control rules, rotation-evidence correction, and 18:00 IST deadline were sent in the existing CRM database thread to both Satyam addresses with Sunaj copied | Gmail send readback | 2026-08-13T11:12Z | Sent |
| F-011 | Initial CARMA-DB inventory | Repository scan registered 51 database systems, 126 metadata-only controlled assets, 75 candidate database objects, and 17 write-capable systems; no migration file was found | `database-control/asset-registry.json`; validator readback | 2026-08-13T11:23Z | Verified repository-visible scope only |
| F-012 | CARMA-DB role split | Satyam is accountable; Sunaj independently verifies higher-risk database/infrastructure changes; Abhilash receives material escalations and the final digest | Owner instruction to use Sunaj's structure; `database-control/policy.json` | 2026-08-13T11:25Z | Active |
| F-013 | CARMA-DB GitHub surface | Focus #14, Dashboard #15, and Batch #16 are open; the scheduled workflow will refresh them after merge | GitHub create-issue readbacks | 2026-08-13T11:25Z | Active |
| F-014 | CARMA-DB review handoff | PR #12 is ready for review and requests both Satyam and Sunaj; GitHub reports it mergeable, while the unrelated Vercel team-invite status remains failed | GitHub PR readback | 2026-08-13T11:31Z | Review pending |
