# KAPPL Primary Order Form — release evidence

Scope: staging review only. No production sales rollout is authorized by this document.

## Security and release-blocker mapping

1. **Authenticated UI** — The React bundle is hosted at the same-origin protected path `/new-order-fms/primary-order-form/app/`. Middleware validates the signed `kairali_user` session before the wrapper or bundle/assets are served.
2. **Server-side RBAC** — `/api/order-form` re-verifies the signed session and maps every allowed action to `new-order-fms.view`, `new-order-fms.edit`, or `new-order-fms.manage`. Admin and `all` retain the CRM's existing override behavior.
3. **Rate limits, audit, safe errors** — A shared MySQL fixed-window limiter protects each actor/IP/action. Security events go to the existing structured logger/webhook and `order_form_audit_log`. Public responses omit stack traces, secrets, raw payloads, and upstream implementation details.
4. **Apps Script boundary** — URL and shared secret exist only in server environment variables. Apps Script fails closed unless `_serverSecret` matches the 32+ character Script Property `ORDER_FORM_API_SECRET`. The browser bundle contains neither value.
5. **Review workflow** — Changes are submitted from feature branches and must be reviewed in PR/Vercel Preview before merge or promotion.
6. **Data-safety evidence** — The existing suite covers validation, edit-as-new Buyer ID preservation, idempotent duplicate submission, durable queued receipt, and 20 simultaneous submissions without overwritten header/product rows.
7. **Public standalone retirement** — The legacy form root redirects to the authenticated CRM route and its old API returns `410 MOVED_TO_CRM`, preventing a bypass around CRM authorization.
8. **Live gate** — Production remains blocked until the preview checks below pass and management approves promotion.

## Permission policy

| Actions | Required permission |
| --- | --- |
| `health`, `getProducts`, `getUsers` | `new-order-fms.view` |
| `findBuyer`, `getOrder`, `status`, `submit`, `uploadFile` | `new-order-fms.edit` |
| `syncProducts`, `retry` | `new-order-fms.manage` |

The existing `user_role_permissions.new-order-fms` value can be `view`, `view,edit`, or `view,edit,manage`. A truthy/all module grant keeps the CRM's current behavior and generates all module permissions.

## Automated checks

Run from the order-form repository:

```bash
npm test
```

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
