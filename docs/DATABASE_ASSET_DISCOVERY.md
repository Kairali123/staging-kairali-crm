# CARMA-DB asset discovery and change control

Inventory comes before repair. A database-backed CRM flow can contain application
routes, scheduled jobs, queries, tables, views, keys, indexes, triggers, routines,
credentials, environments, backups, monitors and external data sources. CARMA-DB
therefore tracks the business/system path separately from its database assets.

The controlled register is `database-control/asset-registry.json`. Its browser-safe
copy is `public/database-control-registry.json`. Both contain metadata only—never rows,
credentials, connection strings or unrestricted SQL.

## Required discovery sequence

1. Scan every tracked source file for shared database-client use and SQL operations.
2. Reconcile every API route, background job and script that reads or writes data.
3. Extract repository-visible table/view references and dynamic-query gaps.
4. Compare with approved metadata-only live schema evidence.
5. Enumerate columns, keys, indexes, constraints, triggers, routines and events.
6. Reconcile runtime variable presence and ownership without reading values.
7. Record migration/change-history ownership or checked-none evidence.
8. Verify backup, retention and isolated restore evidence.
9. Verify grants, firewall/egress, monitoring, alerts and runbook ownership.
10. Ask Satyam for completeness attestation only after automated scans finish.

## Individual system record

Every system has:

- a stable `DBS-*` identity and one or more `DBA-*` asset identities;
- source path, HTTP methods or job trigger, company queue and business area;
- read/write classification and sanitized table/view names;
- the eight-category coverage matrix;
- evidence, owner, AI and human to-dos;
- a value-free aggregate-audit reconciliation packet after the live-control request;
- append-only change history; and
- backup, rollback, regression and independent-review state.

## Write gate

Discovery does not authorize a write. A production mutation is blocked until the exact
target and environment are resolved, a restorable backup or recovery point exists,
rollback is documented and tested where practical, regression/failure-path checks are
ready, Sunaj independently verifies the infrastructure/database plan, and Abhilash
approves the consequential action on the linked issue.

Refresh the repository-visible inventory with:

```bash
npm run database:control:inventory
```

Then validate and rebuild the plan:

```bash
npm run database:control:plan
npm run database:control:validate
```
