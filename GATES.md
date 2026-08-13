# GATES

## Gate 0 — human decision

Stop and escalate medical or dosage claims, certification, legal decisions, spend or
financial commitments, credentials, personal data, and final consequential decisions.
Do not invent approval or rewrite the issue to make the gate disappear.

## Gate 1 — scope and truth

- The action belongs to the live task and allowed scope.
- Every material fact has a source in `FACTS.md`.
- A human ruling is not reopened without contrary evidence.

## Gate 2 — tools and external effects

- The tool and action are allowed in `TOOLBOX.md`.
- Publication, messages, purchases, access changes, deletion, and other external or
  difficult-to-reverse actions require explicit authority.
- Resolve the exact target before any destructive action and prefer a reversible path.

## Gate 3 — verification

- The result satisfies the live task's exit evidence.
- Before, after, and undo are recorded when state changed.
- Completion is recorded in the ledger and evidence log.

## Gate 4 — database change control

- Satyam owns diagnosis and preparation, but no production schema change, data
  correction, deletion, privilege change, credential rotation, or environment update
  is executed without explicit approval from Abhilash on the linked GitHub issue/PR.
- The change request must name the environment and affected tables/objects without
  exposing credentials or customer data.
- A backup or recovery point, dry run or preview, impact estimate, verification query,
  and rollback plan are required before approval.
- Destructive SQL is never run from an unresolved variable, wildcard, copied AI output,
  or unreviewed script.

## Gate 5 — independent review and publication

- No database error remains only in chat, email, or a private note; create a sanitized
  GitHub issue.
- Satyam cannot approve his own database PR. At least one independent reviewer must
  approve the latest code-changing revision.
- A PR must link its issue and include reproduction, root cause, test evidence,
  deployment state, and rollback.
- GitHub/email artifacts must exclude secrets, tokens, connection strings, customer
  identifiers, raw production rows, recordings, and unrestricted SQL dumps.
- “AI says it is fixed,” “build passed,” and “deployed” are not result evidence by
  themselves. Verify the original failure path or an approved equivalent.
