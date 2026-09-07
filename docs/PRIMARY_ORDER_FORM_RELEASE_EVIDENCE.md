# KAPPL Primary Order Form — release evidence

Scope: staging review only. No production sales rollout is authorized by this document.

## Security and release-blocker mapping

1. **Authenticated UI** — The React bundle is hosted at the same-origin protected path `/new-order-fms/primary-order-form/app/`. Middleware validates the signed `kairali_user` session before the wrapper or bundle/assets are served.
2. **Server-side RBAC** — `/api/order-form` re-verifies the signed session and maps every allowed action to `new-order-fms.view`, `new-order-fms.edit`, or `new-order-fms.manage`. Admin and `all` retain the CRM's existing override behavior.
3. **Rate limits, audit, safe errors** — A shared MySQL fixed-window limiter protects each actor/IP/action. In compliance with **Issue #77**, hot request paths execute 100% pure DML without any runtime DDL (`CREATE TABLE`) or random cleanup (`Math.random()`), failing closed with 503 if tables are unavailable. Table provisioning and rollback are managed strictly out-of-band via migration scripts. Security events go to the existing structured logger/webhook and `order_form_audit_log`. Public responses omit stack traces, secrets, raw payloads, and upstream implementation details.
4. **Apps Script boundary** — URL and shared secret exist only in server environment variables. Apps Script fails closed unless `_serverSecret` matches the 32+ character Script Property `ORDER_FORM_API_SECRET`. Direct requests without the secret return `UNAUTHORIZED`. The browser bundle contains neither value.
5. **Review workflow** — Changes are submitted from feature branches and must be reviewed in PR/Vercel Preview before merge or promotion.
6. **Data-safety evidence** — The existing suite covers validation, edit-as-new Buyer ID preservation, idempotent duplicate submission, durable queued receipt, and 20 simultaneous submissions without overwritten header/product rows.
7. **Public standalone retirement** — The legacy standalone deployment (`kappl-primary-order-form.vercel.app`) is decommissioned and paused (`HTTP 503 DEPLOYMENT_PAUSED`), completely preventing any public unauthenticated bypass.
8. **UI safeguard** — Edit Order tab is restricted and visually disabled in UI (`ENABLE_EDIT_ORDER = false`) preventing edits until management approves, while business logic remains intact in code.
9. **Live gate** — Production promotion is gated on passing the preview verification checklist below and receiving management sign-off.

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

# Provision tables (idempotent DDL migration)
npm run db:order-form:migrate

# Rollback tables (disaster recovery)
npm run db:order-form:rollback
```

### Table Verification
- `order_form_rate_limits`: Stores fixed-window rate keys with `expires_at` index.
- `order_form_audit_log`: Stores audit events with `event_id`, `actor`, `source_ip`, `action_name`, `outcome`, `duration_ms`.

## Direct Apps Script Bypass Rejection Evidence

Direct external request without `_serverSecret`:
```bash
curl -X POST "https://script.google.com/macros/s/DEPLOYMENT_ID/exec" \
  -H "Content-Type: application/json" \
  -d '{"action":"getProducts"}'
```
Response:
```json
{
  "ok": false,
  "error": "UNAUTHORIZED"
}
```

## Runtime Audit Log Evidence

Sample authenticated runtime entry captured from MySQL `order_form_audit_log`:
```json
{
  "id": 82,
  "event_id": "fae98e46-e8c8-4592-9aaf-ae8df0416c35",
  "created_at": "2026-09-07 09:15:30.655",
  "actor": "developer2@kairali.com",
  "role_name": "super_admin",
  "action_name": "syncProducts",
  "source_ip": "::1",
  "correlation_id": "66e351fa-c118-48b9-981e-378dbb52e26d",
  "duration_ms": 200
}
```

## Staging Verification Test Payload

Sample payload utilized for staging preview end-to-end verification and QA testing:
```json
{
  "submissionId": "TEST-SUB-20260907-001",
  "orderType": "Institutional",
  "paymentTerms": "Advance",
  "buyer": {
    "name": "TEST - Quality Assurance Verification",
    "phone": "9876543210",
    "email": "qa-test@kairali.com",
    "address": "Kairali Ayurvedic Products Ltd, Staging Test Dept, New Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "gstin": "07AAAAA0000A1Z5"
  },
  "items": [
    {
      "productName": "Abhayarishtam",
      "sku": "CAAB02450NP0425",
      "pack": "450ml",
      "quantity": 1,
      "price": 150.00,
      "discount": 0,
      "cgst": 6,
      "sgst": 6,
      "igst": 0,
      "total": 168.00
    }
  ],
  "remarks": "AUTOMATED_STAGING_TEST_VERIFICATION_DO_NOT_DISPATCH"
}
```

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
