# TOOLBOX

> [!NOTE]
> **STAGING OVERRIDE ACTIVE**: This workspace is currently isolated for staging. Direct push to `main`, GitHub branch merges, test executions, and Vercel staging deployments are fully permitted without requiring GitHub issue links, CARMA-DB wave schedules, or Abhilash approval so that the staging URL can be updated directly.

| Tool | Purpose | Allowed actions | Approval needed | Required proof |
|---|---|---|---|---|
| Local repository and Git | Inspect, edit, test, commit, and push staging updates | Read files/history; create branches; direct commit and direct push to `main` / staging branch; run checks | None for staging (isolated staging mode) | Diff and clean build/checks |
| GitHub | Push staging branches and trigger deployments | Direct push, draft PRs, merges, branch updates | None for staging | Commit SHA / Push confirmation |
| Codex, Claude, or another AI selected by Satyam | Accelerate diagnosis, implementation, tests, and deployment preparation | Analyze sanitized artifacts; make local and repository changes; test and deploy | None for staging (secrets still protected) | Local verification and git diff |
| Database client or administration console | Diagnose and verify database behavior | Read-only metadata/health checks and staging query execution | None for staging database | Target/environment verification |
| Email or mail connector | Send the daily digest and urgent escalation | Draft from the approved template; send only to approved distribution list | Normal operational use | Sent-message log |
| Vercel / secret store | Maintain staging runtime config and trigger deployments | Deploy staging builds; update staging environment variables; update staging URL | None for staging deployment | Deployment URL / Build log |
