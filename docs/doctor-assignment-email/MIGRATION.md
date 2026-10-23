# Doctor assignment email migration — TRG-001

Source verified 23 October 2026: Guest Tracker FMS, spreadsheet `1zWuoDnB-TyenkwNFWc3gPP4_fZOpInvV4ZJpZQm1ILQ`, tab GuestTracker (gid 0). Apps Script project `1LKNj0JJhFaeKAYuKbltYKVfn3GjM9HYBCeYAOJeCW71BUVkQ192pb2LH`, file newEmailer.gs, function sendEmailNewForUpdate.

## Verified legacy flow

Rows start at 11. Selection: GR (200) = Noted; GF (188) and GL (194) nonblank; GW (205) blank. Copy A:AA plus GL to `1ugXY7Z0DfIebzRjHRQvrr-ymZL-BIi3eo4XsG6DSuqg` / Bookings. B1 must be Sent. Legacy code clears the staging rows and B1, copies up to 20 records and writes GW before actual mail delivery. The separate final sender was observed through Gmail; its implementation and installed schedule have not been retrieved. Emails observed at approximately 09:31, 12:31 and 17:31 IST; new daily 09:30 is a proposed default, not verified legacy trigger metadata.

## New CRM flow

Read the source directly using existing server-side Google credentials; validate header mapping before sending. Preserve formatted values, blank values and all 28 fields. No intermediate report sheet, B1 sentinel, or 20-record truncation. W is correctly labelled Booking Status. The complete field order is defined in lib/email-triggers/doctor-assignment.ts. Preview is administrator-only, private/no-store, read-only and does not acknowledge rows.

Only after all recipients are accepted by SMTP, re-read the source and verify row number, complete rendered values and workflow signature. Mark matching GW cells Sent-CRM-date. Source-write failure or uncertain/partial SMTP acceptance pauses the trigger for reconciliation. Provider acceptance is not mailbox delivery confirmation. Google Sheets offers no compare-and-swap cell update here: the legacy sender and concurrent source row restructuring must be stopped during cutover.

## Configuration and cutover

Settings → Automation → Email Triggers → Client Assigned to Doctor Reports. Default Paused, daily 09:30 Asia/Kolkata, full report, KTAHV, only when data available. Recipients copied from the observed mail; sender is existing CRM SMTP, not an invented info@ alias.

1. Verify source preview and actual SMTP sender in staging.
2. User disables legacy staging/export trigger AND its separate report-sheet mail sender; reconcile any outstanding Bookings batch first.
3. Activate the CRM trigger. Existing nonblank GW markers are respected, including old Sent markers.
4. Verify first provider acceptance, source markers and mailbox receipt separately. No live send or source-write test is performed during setup.

Rollback: pause the CRM trigger first. Redeploy prior staging deployment dpl_6PiLmh48R6VJWkgrLepNppbxbksV if required. Review accepted CRM messages and markers before resuming the legacy sender; do not clear markers in bulk.
