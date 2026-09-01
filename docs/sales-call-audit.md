# Sales Call Audit prototype

## Data boundary

The committed dashboard and email preview use synthetic fixtures only (`DEMO-*` and
`Synthetic Lead *`). No employee names, customer identifiers, production recordings,
attendance records, or Pagarbook data are committed to the repository.

The KPI cards, charts, date totals, and monthly table are derived from the same in-memory
fixture rows so the displayed totals reconcile after filters are applied. The Listen
control generates a short synthetic browser tone; it is not a production call recording.

## Access control

Owner ruling, 2026-09-01: four **composable** permissions, not a ladder. A user may hold
any combination. Page access, data scope, and write capability are three separate axes.

| Permission | Grants |
|---|---|
| `sales_call_audit.view` | Opens the page. Grants **no data**. |
| `sales_call_audit.viewSelf` | Own rows only, read-only. |
| `sales_call_audit.viewAll` | Every row, read-only. |
| `sales_call_audit.write` | Save HR actions on rows already in scope. |

- `view` alone is a valid state: the page renders with an empty table and an explanatory
  notice. It is not an error.
- `viewAll` supersedes `viewSelf` when both are held; the scope is their union.
- **Write is scope-bound.** `write` says a session may save, the scope says which rows it
  may save against, so a `viewSelf` holder cannot edit a colleague's record by posting its
  id. `write` with no scope reaches no row and is refused.
- `role === "super_admin"` does everything here regardless of permissions. Plain `admin`
  no longer bypasses — it goes through grants like every other role.
- The `all` wildcard continues to grant everything.
- `sales_call_audit.read` is the pre-split spelling and is honoured as `viewAll`, so no
  session that works today stops working.

`viewSelf` is enforced **server-side in SQL**, matched on the session's `employeeId`
(`lib/db-auth.ts`) against `daily_sales_reports_log_fms.emp_id`. It was previously a
client-side `useMemo` filter over a response that contained every row, which meant any
reader could recover the whole team from the network tab.

Team-wide artifacts — `/api/sales-call-audit/email-data` and `/send-email` — require
`viewAll` outright, because there is no self-scoped version of a team average, a
failed-employee count, or a per-employee table.

The client route guard gates the page on `view`, and the email template on `viewAll`. The
API verifies the signed `kairali_user` session cookie on every request and re-derives the
scope server-side; the client gate is a redirect, never the enforcement boundary.

All four permissions are grantable from the Users admin screen under
**Sales & Call Management**.

## Durable HR action storage

The browser does not use `localStorage`. HR actions are read and written through
`/api/sales-call-audit/actions`, which targets the existing MySQL runtime connection and
expects the table below. The route never creates or alters schema automatically. Until
the table is approved and provisioned by the database owner, the UI remains read-only and
the API returns HTTP 503.

Proposed additive schema (not executed by this change):

```sql
CREATE TABLE sales_call_audit_hr_actions (
  audit_date DATE NOT NULL,
  employee_id VARCHAR(80) NOT NULL,
  verify_status VARCHAR(40) NOT NULL,
  calling_action VARCHAR(60) NOT NULL,
  remarks VARCHAR(1000) NULL,
  half_day_leave BOOLEAN NOT NULL DEFAULT FALSE,
  pagarbook_updated BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by VARCHAR(190) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_date, employee_id)
);
```

Production employee/call data and recording URLs must be supplied by an authenticated,
permission-filtered server API in a separately reviewed change. They must not be added as
client fixtures.

## Completed prototype interactions

- CSV export respects the active employee/outcome/disposition filters.
- Email report links deep-link to the selected date and synthetic employee.
- Listen plays an explicit synthetic audio sample.
- KPI and monthly summaries reconcile to the currently committed fixture source.
