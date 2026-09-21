-- Migration: Create not_checkedin_yet table
-- Feature: CRR FMS "Not CheckedIn Yet" state
-- Records from KTAHV_CRR_Process_FMS whose booking_id has no matching
-- reservation_id in ktahv_checkinmasterfms are stored here temporarily.
-- When the guest checks in (reservation_id appears in ktahv_checkinmasterfms),
-- the record is deleted from this table and re-enters normal Pending/Completed logic.
--
-- Run once on the target database before deploying the application changes.

CREATE TABLE IF NOT EXISTS not_checkedin_yet (
    id            INT          NOT NULL AUTO_INCREMENT,
    process_id    INT          NOT NULL COMMENT 'KTAHV_CRR_Process_FMS.id — the source row',
    booking_id    VARCHAR(100) NOT NULL COMMENT 'booking_id from KTAHV_CRR_Process_FMS (matches reservation_id in ktahv_checkinmasterfms)',
    uid           VARCHAR(100)          COMMENT 'uid from KTAHV_CRR_Process_FMS',
    client_name   VARCHAR(255)          COMMENT 'client_name snapshot for quick reference',
    check_in_date DATETIME              COMMENT 'check_in_date snapshot',
    check_out_date DATETIME             COMMENT 'check_out_date snapshot',
    booking_status VARCHAR(100)         COMMENT 'booking_status snapshot',
    recorded_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'First time this record was flagged as not-checked-in',
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last time this row was refreshed',
    PRIMARY KEY (id),
    UNIQUE  KEY uq_booking_id  (booking_id),   -- Prevents duplicates; makes upserts safe
    INDEX   idx_process_id     (process_id),
    INDEX   idx_uid            (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Temporary silo for CRR FMS records not yet present in ktahv_checkinmasterfms. Auto-maintained by loadBookings() on every GET /api/crr-calling/bookings call.';
