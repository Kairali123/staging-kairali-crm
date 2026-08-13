# MASTER CURSOR

## LIVE TASK

**DB-012**

Operate the CARMA-DB autonomous database delivery structure for Satyam.

## NEXT ACTION

Obtain Satyam's accountable-owner review and Sunaj's independent-verifier review on
ready PR #12, merge after approval, run its first GitHub workflow wave, and use the
first 30-case preflight to advance the 51-system discovery inventory without production
database mutations.

## EXIT EVIDENCE

- All 51 registered systems have evidence for all eight discovery categories and
  Satyam's completeness attestation.
- Dashboard #15, Batch #16, and per-focus issues stay synchronized with the registry.
- Higher-risk changes have Sunaj's independent verification, regression proof, and a
  rollback record.
- No restricted data is published and no production database mutation is automated.
- Satyam gives final CARMA-DB approval and the final digest is delivered.

## LAST CHECKPOINT

2026-08-13T11:25Z: Owner selected the same autonomous structure used for Sunaj. The
CARMA-DB control plane discovered 51 repository-visible systems, 126 metadata-only
assets, 75 candidate objects, and 17 write-capable systems; validation passed with
production database writes disabled. GitHub Focus #14, Dashboard #15, and Batch #16
are live. Existing automation `crm-database-daily-control` now runs three weekday waves
at 09:15, 13:15, and 17:15 IST, with an 8-working-hour decision SLA and at most one
material email per local day. Satyam is accountable; Sunaj is independent verifier;
Abhilash receives material/final escalations. DB-003 remains open in the register while
DB-012 is the single live control task. PR #12 is ready, mergeable, and requests reviews
from both Satyam and Sunaj; the known Vercel team-invite status remains unrelated and
failed.
