# Kairali CRM

Kairali Group CRM Application.

## Environment setup

The database configuration and Phase 1 server-side secrets covered here are read
from environment variables. Do not add fallback or built-in credentials.

`.env.example` is the template for the database variables and the Phase 1 security
variables. It is not a complete inventory of application configuration: other
integrations in this codebase (for example AI providers, Google services, Zoom,
measurement, and the Apps Script endpoint) require additional environment variables
that must be configured separately and are out of scope for this template.

### Database variables

`lib/db.ts` requires `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`, and throws if
any of them is unset or empty. `DB_PORT` is optional and defaults to `3306`.

That check runs when `lib/db.ts` is first loaded, which is not necessarily at process
start. A missing database variable may therefore surface on the first code path that
loads the module rather than at boot.

### Local development

1. Copy the template:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in real values from your team's secret store.
3. Add any additional variables required by the integrations you use locally.
4. Never commit `.env.local` or any real value. Only `.env.example`, which contains
   placeholders, is tracked in Git.

### Vercel (deployed environments)

Add the variables from `.env.example`, plus the variables required by the other
integrations that environment uses, under **Project -> Settings -> Environment
Variables**, for each environment (Production / Preview / Development) that needs them.
Redeploy after changing values: environment variables are read at build and runtime,
so existing deployments keep the old values until redeployed.

## Security notes

Read these before treating credential cleanup as complete.

- **Rotate the exposed database credentials.** Database credentials were previously
  committed to this repository in scratch scripts. Rotate them at the database itself
  (outside this repo), then update the new values in `.env.local` and in Vercel.
- **Confirm the old credentials no longer work.** After rotating, verify that the
  previous credentials are rejected by the database. Rotation is not complete until
  this is confirmed.
- **Deleting the files does not purge Git history.** The scratch scripts have been
  removed from the working tree, but their contents remain reachable in past commits
  and in any clone, fork, or backup. Treat the old values as permanently disclosed;
  rotation is the only real remedy. Purging history (e.g. `git filter-repo`) is a
  separate, coordinated operation that rewrites shared history.
- **Never commit `.env.local` or real values.** Keep secrets in the secret store,
  Vercel environment variables, and local untracked files only.
- **`GAS_SHARED_SECRET` must be provisioned and enforced on both sides.** Set it in
  Vercel and in the local runtime, *and* have the deployed Google Apps Script handlers
  enforce it on incoming requests. Protected KTAHV forwarding is not complete until
  both the app and the deployed Apps Script handlers check the shared secret.
