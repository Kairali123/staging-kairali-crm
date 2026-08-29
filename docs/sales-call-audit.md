# Sales Call Audit prototype

## Data boundary

The committed dashboard and email preview use synthetic fixtures only (`DEMO-*` and
`Synthetic Lead *`). No employee names, customer identifiers, production recordings,
attendance records, or Pagarbook data are committed to the repository.

The KPI cards, charts, date totals, and monthly table are derived from the same in-memory
fixture rows so the displayed totals reconcile after filters are applied. The Listen
control generates a short synthetic browser tone; it is not a production call recording.

## Access control

- `sales_call_audit.read` is required for the dashboard, email preview, and action reads.
- `sales_call_audit.write` is required for HR verification and attendance-action writes.
- The existing `all` wildcard continues to grant both permissions.

Both the client route guard and the API route enforce these dedicated permissions. The
API additionally verifies the signed `kairali_user` session cookie on every request.

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
