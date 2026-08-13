# CARMA-DB autonomous delivery architecture

CARMA-DB mirrors the governed Sunaj/CARMA structure for Satyam's database ownership.
GitHub holds durable coordination and evidence; a recurring Codex heartbeat performs
AI work and controlled email; scheduled GitHub Actions independently rebuild the plan
and update the dashboard.

## Durable control plane

```text
Codex heartbeat ───────┐
                      ├─► CARMA-DB planner ─► daily plan artifact
GitHub Action ─────────┘                           │
                                                 ├─► CARMA-DB dashboard
                                                 └─► batch / focus issues
                                                               │
metadata + health evidence ─► incidents / proof ────────────────┤
                                                               ▼
                         AI patch → backup plan → test → verify → rollout → monitor
                                                               │
                                                               ▼
                                      Sunaj verifies → Satyam accepts or returns
```

Durable artifacts:

- `database-control/policy.json` — authority, confidence and escalation;
- `database-control/state.json` — continuation point and learned rules;
- `database-control/asset-registry.json` — stable private metadata-only inventory;
- `public/database-control-registry.json` — browser-safe aggregate with paths, database
  object names, evidence text, rows and credentials removed;
- `public/database-control-plan.json` — browser-safe plan with paths and database
  object names removed;
- `monitoring/database-control-plan.json` — private workflow artifact;
- `[DB-CARMA Dashboard]` GitHub issue — programme status and ownership;
- `[DB-CARMA Batch]` GitHub issue — parallel wave and consolidated decisions;
- `[DB-CARMA Focus][DBS-n]` issues — detailed focus without blocking other cases;
- draft pull requests and append-only evidence events.

Chat memory is not the source of truth.

## Daily autonomous loop

1. **Discover:** reconcile all repository-visible database consumers and the approved
   live metadata/control evidence.
2. **Prove completeness:** update the eight-category coverage matrix and preserve
   unresolved/checked-none evidence.
3. **Observe:** read issues, PRs, runtime/test evidence, recurrence and prior decisions.
4. **Prepare:** run three weekday waves and advance at least 25 isolated ready cases per
   working day. This is a floor; Satyam may expand the case set and take any number of
   evidence-ready decisions.
5. **Act:** make only policy-authorized repository changes; otherwise prepare a draft,
   migration plan or precise decision packet.
6. **Verify:** run focused regression and original-failure-path checks; route higher
   risk database/infrastructure work to Sunaj.
7. **Decide:** ask Satyam only for data/schema intent, business priority, rollout
   acceptance or final approval after safe AI work is exhausted.
8. **Monitor:** record post-change evidence and promote the next ready case.

## Communication without noise

- GitHub updates routine progress without email.
- At most one email is sent per local day, only for a new decision batch, blocker,
  verification request, material phase/status change or completion.
- The existing CRM database thread is used; Satyam is the direct recipient, Sunaj and
  the owner loop are copied.
- Every decision packet states system, evidence, options, recommendation, consequence
  and deadline. “Please review” is not a valid request.
- Decision SLA is eight working hours. A single escalation may occur after 24 hours
  when the delay is newly material; safe independent work continues.

## Activation boundary

The planner, inventory scanner and GitHub workflow operate on repository metadata and
sanitized control evidence. Direct production database writes remain disabled. They
activate only as separate, approved operations after the exact target, credentials,
backup, rollback, regression proof and independent verification are available.
