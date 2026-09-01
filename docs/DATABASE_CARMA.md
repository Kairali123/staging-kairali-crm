# CARMA-DB: every database path individually, many in parallel

CARMA-DB is the governed completion loop for reviewing every Kairali CRM database
consumer, query path, object and operational control individually without processing
them sequentially. CARMA-DB AI exposes the full ready set through three weekday waves.
At least 25 ready cases advance each working day. This is a minimum, not a cap: Satyam
may expand the working set and take any number of additional ready decisions. AI cannot
silently skip a path or approve Satyam's final gate.

## Roles

| Role | Person/system | Responsibility |
|---|---|---|
| Execution owner | CARMA-DB AI | Discover, rank, diagnose, prepare or apply policy-safe repository fixes, test, log and monitor. |
| Accountable owner | Satyam (`@chauhansatyam`) | Own database delivery, decide data/schema intent, accept rollout and approve completion. |
| Independent verifier | Sunaj (`@Kairali123`) | Verify infrastructure, backup/restore, privilege, credential, environment, firewall and higher-risk database changes. |
| Sponsor | Abhilash (`@AbhilashKairali`) | Receive material escalation and the final digest; approve consequential production actions. |

Satyam may use Kairali AI or his own AI. He remains responsible for checking every
generated fact, query, patch, test and rollback. He cannot approve his own pull request.

## Mandatory inventory gate

Before repair can be promoted, every database system must resolve all eight categories:

1. route, job or consumer;
2. table or view;
3. schema keys and relationships;
4. indexes and constraints;
5. credential and runtime configuration;
6. migration and change history;
7. backup and restore;
8. monitoring, alerting, owner and runbook.

`discovered` requires safe evidence. `checked_none` requires an actual catalog or
repository search with evidence. Blank, missing and `unverified` never mean none.
Inventory is append-safe: an object not seen on a later scan remains recorded as
`not_seen_in_latest_scan` until reconciled.

## The five CARMA-DB gates

### C — Catalog and validate

Identify the consumer, environment class, database objects, read/write behavior,
business impact, current evidence and live-versus-repository gaps. Satyam confirms the
data purpose and priority after automated scans are exhausted.

### A — Accountability and architecture

Name the application owner, database owner, infrastructure verifier and approving
reviewer. Record data lineage, keys, constraints, indexes, privilege boundary,
retention, recovery and escalation. Shared or unknown ownership is an open defect, not
a closure condition.

### R — Repair and rollout

CARMA-DB prepares the smallest reversible fix. Repository-only changes may proceed
automatically only above the policy confidence threshold with tests, audit evidence and
rollback. Production data, schema, privileges, credentials, firewall, environment and
deployment changes always stop for approval and independent verification.

### M — Measure and monitor

Define the original failure signal, target, actual result and proof. Verify latency,
error behavior, affected-row or object counts, recovery evidence and recurrence. A
green build is not proof that the original database failure is gone.

### A — Approval and adaptation

Satyam accepts or returns the completed case after independent review. Rejection must
name the failed gate and becomes a learned rule. Production-consequential work also
requires Abhilash's recorded approval. Closure requires linked evidence and rollback.

## Parallel work and communication

CARMA-DB runs three weekday waves and advances at least 25 ready cases per working day,
with no upper workload or decision cap for Satyam. The full inventory is re-reconciled
each day; routine AI work never waits for one blocked system. Satyam receives one decision
batch, not one interruption per route. The decision SLA is eight working hours. After
24 hours, independent technical work continues and one material escalation may be sent.

GitHub is the coordination source of truth. Email links to the dashboard or decision
batch and never copies secrets, customer data, production rows or sensitive SQL output.
At most one CARMA-DB email is sent per local day, and only for a new decision batch,
blocker, verification request, material change or completion.

## Definition of complete

A database path is CARMA-DB complete only when inventory is certified, all five gates
pass, the original result is verified, independent review is recorded, rollback exists,
and Satyam approves. A reported fix, an AI answer, a successful build or a deployment
without failure-path proof is not completion.
