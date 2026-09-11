# KAPPL Primary Order Form — release evidence

Scope: production-repository release candidate. This document records implementation
evidence only; production migration and sales rollout still require the approvals and
runtime proof listed below.

## Security and release-blocker mapping

1. **Authenticated UI** — The React bundle is hosted at the same-origin protected path `/new-order-fms/primary-order-form/app/`. Middleware validates the signed `kairali_user` session before the wrapper or bundle/assets are served.
2. **Server-side RBAC** — `/api/order-form` re-verifies the signed session and maps every allowed action to `new-order-fms.view`, `new-order-fms.edit`, or `new-order-fms.manage`. Admin and `all` retain the CRM's existing override behavior.
3. **Rate limits, audit, safe errors** — A shared MySQL fixed-window limiter protects each actor/IP/action. In compliance with **Issue #77**, the runtime security module contains no schema DDL or retention deletion and fails closed with 503 if required tables are unavailable. Provisioning is out-of-band and explicitly approval-gated. Security events go to the existing structured logger/webhook and `order_form_audit_log`. Public responses omit stack traces, secrets, raw payloads, and upstream implementation details.
4. **Apps Script boundary** — The API accepts only an HTTPS `script.google.com` URL and a 32+ character shared secret from server environment variables. There is no fallback to the retired standalone service. The browser bundle contains neither value. Runtime proof that Apps Script rejects a direct request is still required.
5. **Review workflow** — Changes are submitted from feature branches and must be reviewed in PR/Vercel Preview before merge or promotion.
6. **Data-safety evidence** — Source and focused security checks exist. Authorized end-to-end proof for validation, edit-as-new Buyer ID preservation, idempotent duplicate submission, durable queued receipt, and simultaneous submissions must be attached before approval.
7. **Public standalone retirement** — The legacy standalone deployment (`kappl-primary-order-form.vercel.app`) is decommissioned and paused (`HTTP 503 DEPLOYMENT_PAUSED`), completely preventing any public unauthenticated bypass.
8. **UI safeguard** — Edit Order tab is restricted and completely hidden from the UI (`ENABLE_EDIT_ORDER = false`) preventing edits until management approves, while business logic remains intact in code.
9. **Live gate** — Production promotion is gated on completing the verification checklist below, recording a recovery point, independent `Kairali123` review of the exact head, and Abhilash's explicit approval.

## Permission policy

| Actions | Required permission |
| --- | --- |
| `health`, `getProducts`, `getUsers` | `new-order-fms.view` |
| `findBuyer`, `getOrder`, `status`, `submit`, `uploadFile` | `new-order-fms.edit` |
| `syncProducts`, `retry` | `new-order-fms.manage` |

The existing `user_role_permissions.new-order-fms` value can be `view`, `view,edit`, or `view,edit,manage`. A truthy/all module grant keeps the CRM's current behavior and generates all module permissions.

## Database Provisioning and Rollback (Issue #77 Resolution)

Database provisioning is decoupled from the application request path:

```bash
# Check table existence and schema status
npm run db:order-form:status

# Print the additive migration plan without connecting to a database
npm run db:order-form:plan

# Provision tables (idempotent DDL migration)
npm run db:order-form:migrate

# Print the non-destructive application rollback guidance
npm run db:order-form:rollback
```

`db:order-form:migrate` fails closed unless the approved runner supplies
`ORDER_FORM_MIGRATION_APPROVAL=APPROVED`, `ORDER_FORM_RECOVERY_POINT`, and
`ORDER_FORM_CHANGE_ID`. These values are change-control metadata, not credentials.

Rollback means reverting the application deployment while retaining the additive rate
limit and audit tables. The rollback command never drops schema objects or deletes audit
data. Any later archival/removal is a separate Gate 4 change.

### Table Verification
- `order_form_rate_limits`: Stores fixed-window rate keys with `expires_at` index.
- `order_form_audit_log`: Stores audit events with `event_id`, `actor`, `source_ip`, `action_name`, `outcome`, `duration_ms`.

## Runtime evidence status

Do not replace pending rows with examples or expected output. Attach sanitized captured
output from the exact reviewed commit and approved test records.

| Evidence | Status | Required attachment |
| --- | --- | --- |
| Direct Apps Script request without secret | **PENDING — attach captured output** | Timestamp, redacted endpoint identifier, HTTP status, sanitized `UNAUTHORIZED` body |
| Authorized New Order | **PENDING — attach captured output** | Actor role, test Order ID, header/product row counts |
| Authorized Edit-as-New | **PENDING — attach captured output** | Original/revised test Order IDs and preserved Buyer ID |
| Idempotent retry | **PENDING — attach captured output** | One submission ID, same returned Order ID, no duplicate row counts |
| Validation rejection | **PENDING — attach captured output** | Sanitized invalid field and proof of zero writes |
| Concurrent reconciliation | **PENDING — attach captured output** | Distinct test IDs and reconciled header/product counts |
| Runtime audit/rate limit | **PENDING — attach captured output** | Sanitized non-loopback source, action/outcome/correlation fields, 429 proof |
| Recovery point and rollback rehearsal | **PENDING — attach captured output** | Backup/recovery reference, restore verification, application revert proof |

## Automated checks

Run from the CRM repository:

```bash
npm run test:order-form-security
npm run security:regression
npm run security:routes
npm run security:static
npm run security:typecheck
npm run typecheck
```

## Preview verification checklist

- Anonymous GET of the protected form redirects to CRM login.
- Anonymous POST to `/api/order-form` returns JSON `401` and writes nothing.
- Authenticated user without `new-order-fms.view` reaches Access Denied.
- View-only user can load catalog/users but cannot search buyers, load orders, upload, submit, or retry.
- Edit user can perform New Order and Edit-as-New; the latter gets a new Order ID and preserves Buyer ID.
- Invalid required-field submission is rejected before persistence.
- Reusing one submission ID returns the same durable order instead of a duplicate.
- Ten or more distinct concurrent submissions reconcile one header and all product rows per Order ID in approved test sheets.
- Direct Apps Script request without `_serverSecret` returns `UNAUTHORIZED`.
- Audit rows show actor, action, outcome, source IP, correlation ID, target ID, duration, and safe error code without request contents.

Record test Order IDs and sheet row counts in the PR. Do not use production sheets or customer records for preview evidence.
