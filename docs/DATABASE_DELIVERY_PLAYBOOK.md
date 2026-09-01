# Database Delivery Playbook

This playbook is governed by the same autonomous structure used for Sunaj's CARMA
programme. The database adaptation is CARMA-DB; see
[`DATABASE_CARMA.md`](DATABASE_CARMA.md),
[`DATABASE_ASSET_DISCOVERY.md`](DATABASE_ASSET_DISCOVERY.md), and
[`DATABASE_CONTROL_AUTOPILOT.md`](DATABASE_CONTROL_AUTOPILOT.md).

## Mandate

Satyam Kumar (`@chauhansatyam`) owns fast delivery of all Kairali CRM database work.
He may use Kairali's AI tools or his own AI tools for diagnosis, coding, tests, and
review preparation. AI accelerates the work; it does not replace Satyam's ownership,
independent review, or proof.

Abhilash K. Ramesh (`@AbhilashKairali`) is the governance owner. He may reprioritize,
pause, approve consequential database actions, or nominate an independent reviewer.

## Non-negotiable operating rules

1. Every detected database error gets a sanitized GitHub issue immediately.
2. One issue is the source of truth for impact, severity, owner, next action, blocker,
   root cause, change, proof, and rollback.
3. One issue per branch and PR unless the issue explicitly approves a bounded batch.
4. Direct pushes to `main` are not part of the database workflow.
5. Satyam cannot approve his own PR. The latest revision needs an independent review.
6. Production data, schema, privilege, credential, or environment changes require
   Gate 4 approval on the linked issue or PR before execution.
7. Secrets, customer data, production rows, recordings, connection strings, and
   unrestricted SQL output never enter GitHub, email, or an AI prompt.
8. “Fixed” means the original failure path has been rechecked and the proof is linked.

## Priority and work states

| Priority | Meaning | Rule |
|---|---|---|
| P0 | Active security exposure, material data loss/corruption, database unavailable, or critical production flow stopped | Stop lower-priority work, publish immediately, notify both owners, and work continuously until mitigated or explicitly blocked |
| P1 | Major production failure or high-risk defect without a safe workaround | Same-working-day focus; no P2/P3 promotion while a ready P1 is idle |
| P2 | Limited-impact defect, data-quality issue, or safe workaround exists | Keep in the visible queue and complete severity-first |
| P3 | Improvement, cleanup, observability, or preventive work | Schedule only after higher priorities or by owner override |

Use these states: `NEW → REPRODUCED → FIXING → REVIEW → VERIFIED → CLOSED`.
Use `BLOCKED` only when the issue states exactly what decision, access, dependency, or
evidence is missing and who can provide it.

## Daily pressure loop

At the start of each working day, Satyam opens one **Database daily report** issue for
the date and copies in every open database issue with priority, state, next action, and
blocker. A new error still gets its own issue immediately; it is not held for the
report.

At every material state change, Satyam updates the issue. Before sign-off he updates
the daily report with:

- issues opened, reproduced, fixed, sent to review, verified, closed, blocked, and
  carried forward;
- PRs awaiting review and the named reviewer;
- P0/P1 items with next action;
- AI assistance used and the human verification performed;
- the first task for the next working period.

The active Codex automation runs on working days at 09:15, 13:15, and 17:15
Asia/Kolkata. Each wave refreshes the sanitized Dashboard, Batch, Focus, and daily
issues. It emails the established Satyam/owner/sysadmin loop through the connected
owner mailbox at most once per local day, and only for a material decision,
verification request, blocker, status change, or completion. Routine wave progress
stays in GitHub. The private recipient list and mail credential remain outside Git.

## Fast fix lane

1. Open or claim the issue; set severity and impact.
2. Reproduce with sanitized evidence. If it cannot be reproduced, record attempts and
   the missing condition.
3. Ask AI for root-cause candidates, the smallest fix, tests, and rollback. Give the AI
   only the files and sanitized evidence it needs.
4. Satyam challenges the answer against the schema/query path and rejects unsupported
   assumptions.
5. Create an issue-scoped branch, make the smallest reversible change, and run focused
   checks first.
6. Open a draft PR early. Complete the database PR checklist and link the issue.
7. Request independent review. New code-changing commits invalidate earlier approval.
8. After approval, execute any separately approved deployment/database step, verify
   the original failure path, record rollback, and close the issue.

## Definition of done

An issue closes only when all applicable items exist:

- sanitized reproduction and impact;
- root cause supported by code/schema/query evidence;
- linked PR, migration/change record, or documented no-code resolution;
- focused test results and regression coverage;
- independent reviewer and approval of the latest revision;
- production approval for Gate 4 actions;
- deployment/environment state;
- after-check proving the failure is gone;
- rollback or undo path;
- no secrets or customer data in the artifacts.

## Daily management scorecard

The owner should expect:

- 100% of detected database errors represented by GitHub issues;
- zero P0/P1 issues without a named next action;
- zero self-approved database merges;
- zero closures without verification and rollback evidence;
- zero restricted-data disclosures;
- every carried-forward issue explained in the daily report.

Raw issue counts are not the goal. Verified closure of the highest-impact errors is.

## Repository enforcement still requiring owner setup

The repository includes issue forms, a PR template, and `CODEOWNERS`. To enforce the
review gate, an administrator must enable a `main` branch ruleset that requires a pull
request, at least one approval, approval from Code Owners, dismissal of stale approvals,
and no direct/bypass push for Satyam. Do not enable a required status check until that
check is known to pass reliably in this repository.

The direct-email automation is active; see `AUTOMATIONS.md`. Receipt of its first
scheduled digest and the repository enforcement rules remain open in GitHub issue #11.
