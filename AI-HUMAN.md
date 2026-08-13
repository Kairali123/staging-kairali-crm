# AI HUMAN — Database Delivery Control

This folder is one bounded worker. The brain may be Codex or Claude; the durable state
in this folder is authoritative.

## Start every session

1. Read `PARAMETERS.md`, `MASTER_CURSOR.md`, `OPEN_REGISTER.md`, and `TODAY.md`.
2. Read `FACTS.md`, `DECISIONS.md`, `TOOLBOX.md`, and `GATES.md` only as needed for the
   live task.
3. Name the live task ID, next action, exit evidence, and any blocker before changing
   state.
4. If no task is live, follow the task-selection authority in `PARAMETERS.md`. Do not
   silently invent or promote work.

## Work loop

1. Work on one task ID at a time.
2. If an error is not already in GitHub, sanitize it and create an issue with the
   database-error form before changing code or data. Never publish credentials,
   customer data, full SQL result sets, or production connection details.
3. Reproduce the error, state the root-cause hypothesis, and choose the smallest
   reversible fix. Satyam may use Kairali's AI or his own AI, but remains accountable
   for every generated change and every factual claim.
4. Keep each batch within the cap in `PARAMETERS.md` and keep one issue per branch/PR
   unless the issue explicitly approves a bounded batch.
5. Record a new idea in `OPEN_REGISTER.md`; do not execute it mid-task.
6. Use only tools and actions allowed by `TOOLBOX.md` and `GATES.md`.
7. After each batch or state change, update the GitHub issue, cursor, today table, and
   evidence. A blocker must name the decision, access, or evidence needed to unblock.
8. Mark work complete only after the result and its proof are available.

## Daily accountability loop

1. At the start of each working day, open that date's GitHub database daily report and
   list every open database issue, severity, owner, next action, and blocker.
2. Publish newly detected errors as separate GitHub issues immediately; do not wait for
   the daily report.
3. Work severity-first: P0, then P1, P2, and P3. Abhilash may override priority.
4. Before sign-off, update every issue touched that day and the daily report with
   opened, fixed, reviewed, verified, blocked, and carried-forward counts.
5. Notify `@AbhilashKairali` on the daily report. GitHub notifications are the initial
   email loop; direct-email automation remains disabled until its recipient list,
   sender, trigger time, and credentials are approved outside Git.

## Prevent drift and forgetting

- Do not import facts, instructions, or tasks from another folder unless a named source
  authorizes it.
- Do not rely on chat memory for owner decisions or project facts. Record them in
  `DECISIONS.md` or `FACTS.md`.
- If the current context becomes uncertain, stop taking new work, write the next action
  and blocker into `MASTER_CURSOR.md`, run the workspace validator, and continue in a
  fresh session.
- Do not let two writers change the same workspace concurrently.

## Close a task

1. Confirm the linked GitHub issue has the root cause, change, verification, reviewer,
   deployment state, and rollback/undo path.
2. Add the task to `COMPLETED_LEDGER.md` with before, after, and undo evidence.
3. Add verification to `EVIDENCE_LOG.md`.
4. Remove the task from `OPEN_REGISTER.md` and `TODAY.md`.
5. Set the next severity-ordered task in `MASTER_CURSOR.md`, or set it to `NOT SET`.
6. Run the workspace validator. “Changed” is not “done.”
