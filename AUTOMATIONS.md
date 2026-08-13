# AUTOMATIONS

No unattended job is authorized until a complete row is marked `ACTIVE` by the owner.

| ID | Trigger | Task source | Allowed scope | Stop condition | Status | Last run UTC |
|---|---|---|---|---|---|---|
| AUTO-DB-001 | Each working day at an owner-approved time | Open database GitHub issues and that date's daily report | Create/update the sanitized daily roll-up; notify Satyam and governance owner; optionally send the approved email template | Missing sender/recipient/time/credential; GitHub unavailable; content contains restricted data; owner pauses | BLOCKED-CONFIG — recipient list, sender, time, and mail credential not supplied | Never |
