## Linked database issue

Closes #<issue-number>

Priority: P0 / P1 / P2 / P3

## Root cause and scope

Describe the supported root cause, the smallest change, and what is deliberately out of scope.

Change class: query/application code / schema migration / data correction / credential or environment / documentation-only

## Verification

List exact focused checks and sanitized results. Include the original failure-path recheck.

- [ ] I reproduced or safely observed the original failure.
- [ ] I added or ran focused regression checks.
- [ ] I verified the original failure path after the change.
- [ ] I reviewed the complete AI-generated diff and validated its assumptions.

## Database safety

- [ ] No secret, customer data, production rows, recordings, or unrestricted SQL output is included.
- [ ] The target environment and affected tables/objects are named safely.
- [ ] Any production mutation has explicit Gate 4 approval on the linked issue/PR.
- [ ] A backup/recovery point and impact estimate exist for any production mutation.

## Rollback plan

State the exact undo path and the signal that would trigger rollback.

## Deployment and review

Deployment state: not deployed / preview / production

Independent reviewer: @<reviewer>

- [ ] The latest code-changing revision has independent approval.
- [ ] The linked issue and daily report have been updated.
