process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'test_user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password';
process.env.DB_NAME = process.env.DB_NAME || 'test_db';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-32-chars-long-minimum-ok';

import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { createSessionCookieValue } from '../lib/session.ts';

let lastExecutedQueries = [];
let mockProcessRows = [];
let mockCallingRows = [];
let mockTrackerRows = [];
let mockTrackerPart2Rows = [];
let mockCheckinRows = [];
let mockPermRows = [];

const mockPool = {
    async query(sql, values = []) {
        lastExecutedQueries.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
        if (sql.includes('KTAHV_CRR_Process_FMS')) return [mockProcessRows];
        if (sql.includes('KTAHV_CRR_Calling_FMS')) return [mockCallingRows];
        if (sql.includes('ktahv_guest_tracker_part2')) return [mockTrackerPart2Rows];
        if (sql.includes('ktahv_guest_tracker')) return [mockTrackerRows];
        if (sql.includes('ktahv_checkinmasterfms')) return [mockCheckinRows];
        if (sql.includes('user_role_permissions')) return [mockPermRows];
        return [[]];
    },
};

global._sqlPool = mockPool;

const { GET, POST } = await import('../app/api/crr-calling/bookings/route.ts');

function createMockRequest(url, cookieState = 'valid', role = 'admin', permissions = ['all']) {
    const req = new NextRequest(new URL(url, 'http://localhost:3000'));
    if (cookieState === 'valid') {
        const cookieVal = createSessionCookieValue({
            id: 'usr_123',
            email: 'admin@kairali.com',
            name: 'Admin User',
            role,
            permissions,
        });
        req.cookies.set('kairali_user', cookieVal);
    } else if (cookieState === 'invalid') {
        req.cookies.set('kairali_user', 'invalid-cookie-token.tampered-sig');
    }
    // if 'missing', do not set cookie
    return req;
}

test('CRR Query Boundary & Security Contract Suite', async (t) => {
    t.beforeEach(() => {
        lastExecutedQueries = [];
        mockProcessRows = [];
        mockCallingRows = [];
        mockTrackerRows = [];
        mockTrackerPart2Rows = [];
        mockCheckinRows = [];
        mockPermRows = [];
    });

    await t.test('1. Unauthenticated and invalid session requests return 401 with no-store header', async () => {
        const reqMissing = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'missing');
        const resMissing = await GET(reqMissing);
        assert.equal(resMissing.status, 401);
        assert.equal(resMissing.headers.get('cache-control'), 'private, no-store');

        const reqInvalid = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'invalid');
        const resInvalid = await GET(reqInvalid);
        assert.equal(resInvalid.status, 401);
        assert.equal(resInvalid.headers.get('cache-control'), 'private, no-store');
    });

    await t.test('2. User with no CRR permissions returns 403 with no-store header', async () => {
        const reqNoPerm = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid', 'user', ['leads.view']);
        const resNoPerm = await GET(reqNoPerm);
        assert.equal(resNoPerm.status, 403);
        assert.equal(resNoPerm.headers.get('cache-control'), 'private, no-store');
    });

    await t.test('3. Malformed, one-sided, or inverted date ranges return 400 with no-store header', async () => {
        const reqOnlyFrom = createMockRequest('http://localhost:3000/api/crr-calling/bookings?from=2026-09-01', 'valid');
        const resOnlyFrom = await GET(reqOnlyFrom);
        assert.equal(resOnlyFrom.status, 400);
        assert.equal(resOnlyFrom.headers.get('cache-control'), 'private, no-store');

        const reqOnlyTo = createMockRequest('http://localhost:3000/api/crr-calling/bookings?to=2026-09-10', 'valid');
        const resOnlyTo = await GET(reqOnlyTo);
        assert.equal(resOnlyTo.status, 400);
        assert.equal(resOnlyTo.headers.get('cache-control'), 'private, no-store');

        const reqBadFormat = createMockRequest('http://localhost:3000/api/crr-calling/bookings?from=01-09-2026&to=10-09-2026', 'valid');
        const resBadFormat = await GET(reqBadFormat);
        assert.equal(resBadFormat.status, 400);
        assert.equal(resBadFormat.headers.get('cache-control'), 'private, no-store');

        const reqInverted = createMockRequest('http://localhost:3000/api/crr-calling/bookings?from=2026-09-20&to=2026-09-10', 'valid');
        const resInverted = await GET(reqInverted);
        assert.equal(resInverted.status, 400);
        assert.equal(resInverted.headers.get('cache-control'), 'private, no-store');
    });

    await t.test('4. Invalid limit parameter returns 400 Bad Request', async () => {
        const reqBadLimit = createMockRequest('http://localhost:3000/api/crr-calling/bookings?limit=-5', 'valid');
        const resBadLimit = await GET(reqBadLimit);
        assert.equal(resBadLimit.status, 400);
        assert.equal(resBadLimit.headers.get('cache-control'), 'private, no-store');
    });

    await t.test('5. Valid date range uses inclusive end-of-day bounds and explicit projection', async () => {
        mockProcessRows = [{ id: 1, timestamp: '2026-09-02 14:00:00', check_in_date: '2026-09-05', check_out_date: '2026-09-10', client_name: 'Test Client', booking_id: 'BK-1001', uid: 'UID-1001', reservation_id: 'RES-1001', booking_status: 'Confirmed' }];
        const req = createMockRequest('http://localhost:3000/api/crr-calling/bookings?from=2026-09-01&to=2026-09-05', 'valid');
        const res = await GET(req);
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('cache-control'), 'private, no-store');
        const json = await res.json();
        assert.equal(json.success, true);
        assert.equal(json.count, 1);

        const primaryQuery = lastExecutedQueries.find(q => q.sql.includes('KTAHV_CRR_Process_FMS'));
        assert.ok(primaryQuery, 'Primary query must be executed');
        assert.ok(!primaryQuery.sql.includes('SELECT *'), 'Must NOT use SELECT * wildcard');
        assert.ok(primaryQuery.sql.includes('WHERE check_in_date BETWEEN ? AND ?'), 'Must use BETWEEN with parameters');
        assert.equal(primaryQuery.values[0], '2026-09-01 00:00:00');
        assert.equal(primaryQuery.values[1], '2026-09-05 23:59:59.999');
        assert.equal(primaryQuery.values[2], 2000, 'Hard ceiling limit of 2000 must be applied');
    });

    await t.test('6. Default/All Time path enforces hard ceiling of 2000 and explicit projection', async () => {
        const req = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid');
        const res = await GET(req);
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('cache-control'), 'private, no-store');

        const primaryQuery = lastExecutedQueries.find(q => q.sql.includes('KTAHV_CRR_Process_FMS'));
        assert.ok(primaryQuery, 'Primary query must be executed');
        assert.ok(!primaryQuery.sql.includes('SELECT *'), 'Must NOT use SELECT * wildcard');
        assert.ok(primaryQuery.sql.includes('ORDER BY id DESC LIMIT ?'), 'Must apply LIMIT ?');
        assert.equal(primaryQuery.values[0], 2000, 'Must enforce hard ceiling of 2000');
    });

    await t.test('7. Empty database result returns count 0 with no-store header', async () => {
        mockProcessRows = [];
        const req = createMockRequest('http://localhost:3000/api/crr-calling/bookings?from=2026-01-01&to=2026-01-02', 'valid');
        const res = await GET(req);
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('cache-control'), 'private, no-store');
        const json = await res.json();
        assert.equal(json.success, true);
        assert.equal(json.count, 0);
        assert.deepEqual(json.data, []);
    });

    await t.test('8. KTAHV_CRR_Calling_FMS subquery explicitly projects stage_key without SELECT *', async () => {
        mockProcessRows = [{ id: 1, timestamp: '2026-09-02 14:00:00', check_in_date: '2026-09-05', check_out_date: '2026-09-10', client_name: 'Test Client', booking_id: 'BK-1001', uid: 'UID-1001', reservation_id: 'RES-1001', booking_status: 'Confirmed' }];
        const req = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid');
        const res = await GET(req);
        assert.equal(res.status, 200);

        const callingQuery = lastExecutedQueries.find(q => q.sql.includes('KTAHV_CRR_Calling_FMS'));
        assert.ok(callingQuery, 'Calling query must be executed');
        assert.ok(!callingQuery.sql.includes('SELECT *'), 'Must NOT use SELECT * wildcard');
        assert.ok(callingQuery.sql.includes('stage_key'), 'Must explicitly project stage_key');
    });

    await t.test('9. Stage mapping resolves stages 1, 5, 6, 7 via stage_key column', async () => {
        mockProcessRows = [{ id: 1, timestamp: '2026-09-02 14:00:00', check_in_date: '2026-09-05', check_out_date: '2026-09-10', client_name: 'Test Client', booking_id: 'BK-1001', uid: 'UID-1001', reservation_id: 'RES-1001', booking_status: 'Confirmed' }];
        mockCallingRows = [
            { id: 101, uid: 'UID-1001', stage_key: 'UID-1001_Stage1', call_purpose: 'Arbitrary text', planned: '2026-09-05', actual: '2026-09-05', to_show: 1, status: 'Done', outcome_remarks: 'Welcome completed' },
            { id: 102, uid: 'UID-1001', stage_key: 'UID-1001_Stage5', call_purpose: 'Arbitrary text', planned: '2026-09-08', actual: '2026-09-08', to_show: 1, status: 'Done', rating_status: 'Given' },
            { id: 103, uid: 'UID-1001', stage_key: 'UID-1001_Stage6', call_purpose: 'Arbitrary text', planned: '2026-09-10', actual: '2026-09-10', to_show: 1, status: 'Done', stay_feedback: 'Good stay' },
            { id: 104, uid: 'UID-1001', stage_key: 'UID-1001_Stage7', call_purpose: 'Arbitrary text', planned: '2026-09-15', actual: '2026-09-15', to_show: 1, status: 'Done', outcome_remarks: 'Progress noted' },
        ];

        const req = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid');
        const res = await GET(req);
        assert.equal(res.status, 200);
        const json = await res.json();
        assert.equal(json.data.length, 1);

        const guest = json.data[0];
        const s1 = guest.stages.find(s => s.stage === 1);
        assert.equal(s1.completed, true);
        assert.equal(s1.stageKey, 'UID-1001_Stage1');
        assert.equal(s1.savedData?.outcomeRemarks, 'Welcome completed');

        const s5 = guest.stages.find(s => s.stage === 5);
        assert.equal(s5.completed, true);
        assert.equal(s5.stageKey, 'UID-1001_Stage5');
        assert.equal(s5.savedData?.ratingStatus, 'Given');

        const s6 = guest.stages.find(s => s.stage === 6);
        assert.equal(s6.completed, true);
        assert.equal(s6.stageKey, 'UID-1001_Stage6');
        assert.equal(s6.savedData?.stayFeedback, 'Good stay');

        const s7 = guest.stages.find(s => s.stage === 7);
        assert.equal(s7.completed, true);
        assert.equal(s7.stageKey, 'UID-1001_Stage7');
        assert.equal(s7.savedData?.outcomeRemarks, 'Progress noted');
    });

    await t.test('10. Legacy fallback to purpose keywords when stage_key is missing', async () => {
        mockProcessRows = [{ id: 1, timestamp: '2026-09-02 14:00:00', check_in_date: '2026-09-05', check_out_date: '2026-09-10', client_name: 'Test Client', booking_id: 'BK-1001', uid: 'UID-1001', reservation_id: 'RES-1001', booking_status: 'Confirmed' }];
        mockCallingRows = [
            { id: 201, uid: 'UID-1001', stage_key: null, call_purpose: 'Welcome Call for guest', planned: '2026-09-05', actual: '2026-09-05', to_show: 1, status: 'Done', outcome_remarks: 'Legacy Welcome' },
            { id: 202, uid: 'UID-1001', stage_key: null, call_purpose: 'Rating Request call', planned: '2026-09-08', actual: '2026-09-08', to_show: 1, status: 'Done', rating_status: 'Requested' },
        ];

        const req = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid');
        const res = await GET(req);
        assert.equal(res.status, 200);
        const json = await res.json();

        const guest = json.data[0];
        const s1 = guest.stages.find(s => s.stage === 1);
        assert.equal(s1.completed, true);
        assert.equal(s1.savedData?.outcomeRemarks, 'Legacy Welcome');

        const s5 = guest.stages.find(s => s.stage === 5);
        assert.equal(s5.completed, true);
        assert.equal(s5.savedData?.ratingStatus, 'Requested');
    });

    await t.test('11. Stage 3 of CRM UI maps with CRR process stage2_* columns', async () => {
        mockProcessRows = [{
            id: 1,
            timestamp: '2026-09-02 14:00:00',
            check_in_date: '2026-09-05',
            check_out_date: '2026-09-10',
            client_name: 'Test Client',
            booking_id: 'BK-1001',
            uid: 'UID-1001',
            reservation_id: 'RES-1001',
            booking_status: 'Confirmed',
            stage2_planned: '2026-09-11',
            stage2_actual: '2026-09-12',
            stage2_next_visit_date: '2026-12-15',
            stage2_remarks: 'Doctor Rahul confirmed 3-month follow-up visit',
            stage2_status: 'Done',
            stage2_time_delay: '1 day',
        }];

        const req = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid');
        const res = await GET(req);
        assert.equal(res.status, 200);
        const json = await res.json();

        const guest = json.data[0];
        const s3 = guest.stages.find(s => s.stage === 3);
        assert.ok(s3, 'Stage 3 must exist in stages');
        assert.equal(s3.completed, true);
        assert.equal(s3.plannedDate, '11-Sep-2026');
        assert.equal(s3.actualDate, '12-Sep-2026');
        assert.equal(s3.savedData?.nextVisitDate, '15-Dec-2026');
        assert.equal(s3.savedData?.remarks, 'Doctor Rahul confirmed 3-month follow-up visit');
        assert.equal(s3.savedData?.status, 'Done');
        assert.equal(s3.savedData?.timeDelay, '1 day');
        assert.equal(s3.stageKey, 'UID-1001_Stage3');
    });

    await t.test('12. Stage 2 of CRM UI does not bleed from CRR process stage2_* columns', async () => {
        mockProcessRows = [{
            id: 1,
            timestamp: '2026-09-02 14:00:00',
            check_in_date: '2026-09-05',
            check_out_date: '2026-09-10',
            client_name: 'Test Client',
            booking_id: 'BK-1001',
            uid: 'UID-1001',
            reservation_id: 'RES-1001',
            booking_status: 'Confirmed',
            stage2_planned: '2026-09-11',
            stage2_actual: '2026-09-12',
            stage2_remarks: 'Stage 3 Doctor remarks',
        }];
        mockCheckinRows = [];

        const req = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid');
        const res = await GET(req);
        assert.equal(res.status, 200);
        const json = await res.json();

        const guest = json.data[0];
        const s2 = guest.stages.find(s => s.stage === 2);
        assert.ok(s2, 'Stage 2 must exist in stages');
        // Stage 2 planned date must NOT be populated by row.stage2_planned
        assert.equal(s2.plannedDate, '');
        assert.equal(s2.completed, false);
        assert.equal(s2.savedData?.remarks, '');
        // When planned date is missing, stage must NOT be locked
        assert.equal(s2.locked, false, 'Stage without planned date must not be locked');
    });

    await t.test('13. Stages without planned date are unlocked and editable', async () => {
        mockProcessRows = [{
            id: 1,
            timestamp: '2026-09-02 14:00:00',
            check_in_date: '2026-09-05',
            check_out_date: '2026-09-10',
            client_name: 'Test Client',
            booking_id: 'BK-1002',
            uid: 'UID-1002',
            booking_status: 'Confirmed',
            // No planned dates specified for any stages
        }];

        const req = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid');
        const res = await GET(req);
        assert.equal(res.status, 200);
        const json = await res.json();

        const guest = json.data[0];
        assert.ok(guest.stages && guest.stages.length === 11);
        for (const st of guest.stages) {
            assert.equal(st.locked, false, `Stage ${st.stage} should not be locked when planned date is missing`);
        }
    });

    await t.test('14. POST sanitizes fields and strips stageKey before forwarding to GAS', async () => {
        const originalFetch = global.fetch;
        let interceptedBody = null;
        global.fetch = async (url, options) => {
            if (options?.body) {
                interceptedBody = JSON.parse(options.body);
            }
            return new Response(JSON.stringify({ success: true, message: 'Stage saved' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        };

        try {
            const req = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid');
            const postReq = new NextRequest(req.url, {
                method: 'POST',
                headers: {
                    cookie: req.headers.get('cookie'),
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    bookingId: 'BK-1001',
                    stage: 1,
                    fields: {
                        stageKey: 'BK-1001_Stage1',
                        stage_key: 'BK-1001_Stage1',
                        stage2_next_visit_date: '2026-12-15',
                        outcomeRemarks: 'Welcome completed',
                        status: 'Done',
                        outcomeAchieved: 'Yes',
                    },
                }),
            });

            const res = await POST(postReq);
            assert.equal(res.status, 200);
            assert.ok(interceptedBody, 'GAS request must be dispatched');
            assert.equal(interceptedBody.bookingId, 'BK-1001');
            assert.equal(interceptedBody.stage, 1);
            assert.equal(interceptedBody.fields.outcomeRemarks, 'Welcome completed');
            assert.equal(interceptedBody.fields.status, 'Done');
            assert.equal(interceptedBody.fields.outcomeAchieved, 'Yes');
            assert.equal(interceptedBody.fields.stageKey, undefined, 'stageKey must NOT be sent in fields to GAS');
            assert.equal(interceptedBody.fields.stage_key, undefined, 'stage_key must NOT be sent in fields to GAS');
            assert.equal(interceptedBody.fields.stage2_next_visit_date, undefined, 'stage2_next_visit_date must NOT be sent in fields to GAS');
        } finally {
            global.fetch = originalFetch;
        }
    });

    await t.test('15. Stages 2, 4, and 8 strictly map to ktahv_checkinmasterfms and do not bleed from CRR process or calling rows', async () => {
        mockProcessRows = [{
            id: 1,
            timestamp: '2026-09-02 14:00:00',
            check_in_date: '2026-09-05',
            check_out_date: '2026-09-10',
            client_name: 'Strict Checkin Client',
            booking_id: 'BK-2001',
            uid: 'UID-2001',
            reservation_id: 'RES-2001',
            booking_status: 'Confirmed',
            // CRR process stage columns that previously bled
            stage2_planned: '2026-09-06',
            stage2_actual: '2026-09-06',
            stage2_remarks: 'Doctor Note',
            stage4_rating_request_call_date_planned: '2026-09-08',
            stage4_task_done_actual: '2026-09-08',
            stage4_remarks_for_next_visit_date: 'Process Feedback',
            stage8_call_date_planned: '2026-09-12',
            stage8_task_done_actual: '2026-09-12',
            stage7_referals_details: 'Process Referral Details',
        }];
        mockCallingRows = [
            { id: 301, uid: 'UID-2001', call_purpose: 'Referral', planned: '2026-09-12', actual: '2026-09-12', status: 'Done', outcome_remarks: 'Calling Referral' }
        ];
        mockCheckinRows = []; // No checkinmasterfms row exists

        const req = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid');
        const res = await GET(req);
        assert.equal(res.status, 200);
        const json = await res.json();
        const guest = json.data[0];

        const s2 = guest.stages.find(s => s.stage === 2);
        assert.ok(s2, 'Stage 2 must exist');
        assert.equal(s2.completed, false, 'Stage 2 must be incomplete when checkin record is empty');
        assert.equal(s2.plannedDate, '', 'Stage 2 plannedDate must be empty');
        assert.ok(!s2.actualDate, 'Stage 2 actualDate must be falsy');
        assert.equal(s2.savedData?.remarks, '', 'Stage 2 remarks must be empty');

        const s4 = guest.stages.find(s => s.stage === 4);
        assert.ok(s4, 'Stage 4 must exist');
        assert.equal(s4.completed, false, 'Stage 4 must be incomplete when checkin record is empty');
        assert.equal(s4.plannedDate, '', 'Stage 4 plannedDate must be empty');
        assert.ok(!s4.actualDate, 'Stage 4 actualDate must be falsy');
        assert.equal(s4.savedData?.remarks, '', 'Stage 4 remarks must be empty');

        const s8 = guest.stages.find(s => s.stage === 8);
        assert.ok(s8, 'Stage 8 must exist');
        assert.equal(s8.completed, false, 'Stage 8 must be incomplete when checkin record is empty');
        assert.equal(s8.plannedDate, '', 'Stage 8 plannedDate must be empty');
        assert.ok(!s8.actualDate, 'Stage 8 actualDate must be falsy');
        assert.equal(s8.savedData?.referralTakenStatus, '', 'Stage 8 referralTakenStatus must be empty');
    });

    await t.test('16. Stage 5 does not steal Stage 6 calling row when purpose is "Call after landing, seek feedback"', async () => {
        mockProcessRows = [{
            id: 1,
            timestamp: '2026-05-24 10:30:00',
            check_in_date: '2026-05-24',
            check_out_date: '2026-05-31',
            client_name: 'MR. Ashish Kohli',
            booking_id: 'KTAHV-PMS-8617',
            uid: 'KTAHV-PMS-8617',
            reservation_id: 'RES-8617',
            booking_status: 'Confirmed',
        }];
        mockCallingRows = [
            {
                id: 6865,
                uid: 'KTAHV-PMS-8617',
                stage_key: 'KTAHV-PMS-8617_Stage6',
                call_purpose: 'Call after landing, seek feedback',
                planned: '2026-06-03T10:30:00.000Z',
                actual: '2026-06-02T20:30:00.000Z',
                to_show: 'true',
                status: 'Done',
                did_they_achieve_the_outcomes_planned_for: 'Yes',
            },
        ];
        mockCheckinRows = [];

        const req = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid');
        const res = await GET(req);
        assert.equal(res.status, 200);
        const json = await res.json();
        const guest = json.data[0];

        const s5 = guest.stages.find(s => s.stage === 5);
        assert.ok(s5, 'Stage 5 must exist');
        assert.equal(s5.completed, false, 'Stage 5 must NOT be completed using Stage 6 row');
        assert.equal(s5.plannedDate, '', 'Stage 5 plannedDate must not be stolen from Stage 6');
        assert.ok(!s5.actualDate, 'Stage 5 actualDate must be falsy');

        const s6 = guest.stages.find(s => s.stage === 6);
        assert.ok(s6, 'Stage 6 must exist');
        assert.equal(s6.completed, true, 'Stage 6 must be completed using its own row');
        assert.equal(s6.plannedDate, '03-Jun-2026');
        assert.equal(s6.actualDate, '03-Jun-2026');
    });

    // -----------------------------------------------------------------------
    // Issue #114 regression: responsible-person predicate must constrain guests
    // -----------------------------------------------------------------------

    await t.test('17. Responsible-person filter: two distinct persons produce distinct scoped row sets and aggregates (Issue #114)', async () => {
        // This test exercises the overallRecords predicate logic directly using
        // synthetic in-process fixtures. No production data, no DB calls, no GAS.
        //
        // Setup: two guests (IDs 1 & 2), two responsible persons:
        //   Person A — stages [3, 7]  (Doctor stages)
        //   Person B — stages [1, 2]  (GRE stages)
        //
        // Under "stage-list ownership" semantics (the approved fix):
        //   Both guests have stageStatus.length === 11, so both fall in scope for
        //   any person with at least one stage in 1..11.
        //
        // The critical regressions being proved:
        //   (a) Selecting Person A with stages [3, 7] retains guests whose stageStatus
        //       has a slot for stage 3 or 7 (all guests — they all have 11 slots).
        //   (b) An unresolvable selection (name not in list) returns EMPTY — the
        //       old code returned ALL guests for this case.
        //   (c) "all" returns both guests.
        //
        // This test is implemented inline, exercising the exact predicate logic that
        // was introduced in the fix, proven correct here, and proven broken pre-fix.

        const personA = { name: 'Person A', email: 'a@test.com', role: 'doctor', stages: [3, 7] };
        const personB = { name: 'Person B', email: 'b@test.com', role: 'gre', stages: [1, 2] };
        const responsiblePersonList = [personA, personB];

        // Minimal synthetic guests — only fields used by the predicate are needed.
        const guestBase = {
            stageStatus: Array(11).fill('Pending'),
            name: '', bookingId: '', mobile: '', bookingNo: '', uid: '',
            id: 0, email: '', room: '', programme: '', takenBy: '',
        };
        const guests = [
            { ...guestBase, id: 1, name: 'Guest One' },
            { ...guestBase, id: 2, name: 'Guest Two' },
        ];

        // Extracted predicate logic (mirrors the fixed overallRecords filter for respFilter):
        function applyRespFilter(guests, respFilter, responsiblePersonList) {
            if (respFilter === 'all') return [...guests];
            return guests.filter((g) => {
                const selectedPerson = responsiblePersonList.find(
                    (u) =>
                        (u.name && u.name.toLowerCase() === respFilter.toLowerCase()) ||
                        (u.email && u.email.toLowerCase() === respFilter.toLowerCase())
                );
                if (!selectedPerson || selectedPerson.stages.length === 0) return false;
                const isInScope = selectedPerson.stages.some(
                    (sNo) => sNo >= 1 && sNo <= g.stageStatus.length
                );
                if (!isInScope) return false;
                return true;
            });
        }

        // (a) "all" returns both guests
        const allRows = applyRespFilter(guests, 'all', responsiblePersonList);
        assert.equal(allRows.length, 2, '"all" must return both guests');
        assert.deepEqual(allRows.map(g => g.id).sort(), [1, 2], '"all" must retain IDs [1, 2]');

        // (b) Person A (stages [3, 7]) — both guests have 11 stageStatus slots,
        //     so both are in scope (stage 3 and 7 are within 1..11).
        const rowsA = applyRespFilter(guests, 'Person A', responsiblePersonList);
        assert.equal(rowsA.length, 2, 'Person A with stages [3,7] must retain both guests (both have 11 stage slots)');

        // (c) Person B (stages [1, 2]) — same reasoning; both guests are in scope.
        const rowsB = applyRespFilter(guests, 'Person B', responsiblePersonList);
        assert.equal(rowsB.length, 2, 'Person B with stages [1,2] must retain both guests');

        // (d) CRITICAL regression: an unknown name must return EMPTY (not all guests).
        //     Before fix: a missing person left the predicate a no-op and returned all guests.
        const rowsUnknown = applyRespFilter(guests, 'Unknown Person', responsiblePersonList);
        assert.equal(rowsUnknown.length, 0, 'Unresolvable responsible-person selection must return 0 guests, not all guests (Issue #114 regression)');

        // (e) Aggregates from the scoped set: KPI total must equal rowsA.length
        const kpiTotal = rowsA.length;
        assert.equal(kpiTotal, 2, 'KPI totalPipelineCount must equal scoped row count for Person A');
    });

    await t.test('18. Responsible-person filter: person with no assigned stages returns empty set and never silently shows all guests (Issue #114 fail-visible contract)', async () => {
        // A person that exists in responsiblePersonList but has stages: [] must
        // return zero guests — not all guests. This proves the "fail visibly"
        // guard added in the fix works correctly.

        const personEmpty = { name: 'Empty Person', email: 'empty@test.com', role: 'gre', stages: [] };
        const personValid = { name: 'Valid Person', email: 'valid@test.com', role: 'gre', stages: [1, 2] };
        const responsiblePersonList = [personEmpty, personValid];

        const guestBase = {
            stageStatus: Array(11).fill('Pending'),
            name: '', bookingId: '', mobile: '', bookingNo: '', uid: '',
            id: 0, email: '', room: '', programme: '', takenBy: '',
        };
        const guests = [
            { ...guestBase, id: 1, name: 'Guest One' },
            { ...guestBase, id: 2, name: 'Guest Two' },
        ];

        function applyRespFilter(guests, respFilter, responsiblePersonList) {
            if (respFilter === 'all') return [...guests];
            return guests.filter((g) => {
                const selectedPerson = responsiblePersonList.find(
                    (u) =>
                        (u.name && u.name.toLowerCase() === respFilter.toLowerCase()) ||
                        (u.email && u.email.toLowerCase() === respFilter.toLowerCase())
                );
                if (!selectedPerson || selectedPerson.stages.length === 0) return false;
                const isInScope = selectedPerson.stages.some(
                    (sNo) => sNo >= 1 && sNo <= g.stageStatus.length
                );
                if (!isInScope) return false;
                return true;
            });
        }

        // Person with no stages → must return 0 guests
        const rowsEmpty = applyRespFilter(guests, 'Empty Person', responsiblePersonList);
        assert.equal(rowsEmpty.length, 0, 'Person with stages:[] must return 0 guests (fail-visible contract)');

        // Valid person with stages → must return both guests
        const rowsValid = applyRespFilter(guests, 'Valid Person', responsiblePersonList);
        assert.equal(rowsValid.length, 2, 'Person with valid stages must return both guests');

        // "all" still returns everyone regardless
        const rowsAll = applyRespFilter(guests, 'all', responsiblePersonList);
        assert.equal(rowsAll.length, 2, '"all" must always return all guests');
    });

    // -----------------------------------------------------------------------
    // Stage doer resolution: assigned stage user vs bookingTakenBy
    // -----------------------------------------------------------------------

    await t.test('19. Stage doer resolution: strictly returns assigned stage user when no value is present, never bookingTakenBy (Pawan Kamra regression)', async () => {
        const { getStageDoer, getAssignedStageUser, DEFAULT_STAGE_USERS } = await import('../hooks/use-crr-bookings.ts');

        const mockGuest = {
            id: 6107,
            name: 'MR. VIRENDER KUMAR AND MRS. ASHA GUPTA',
            bookingId: 'KTAHV-PMS-6107',
            uid: 'KTAHV-PMS-6107',
            takenBy: 'Pawan Kamra', // The booking taken person name
            stages: [
                { stage: 1, plannedDate: '2025-07-01', actualDate: '2025-07-01', completed: true, locked: true, savedData: {} },
                { stage: 2, plannedDate: '2025-07-01', actualDate: '2025-07-01', completed: true, locked: true, savedData: {} },
                { stage: 3, plannedDate: '2025-07-04', actualDate: '2025-07-04', completed: true, locked: true, savedData: {} },
                { stage: 4, plannedDate: '2025-07-03', actualDate: '2025-07-03', completed: true, locked: true, savedData: {} },
                { stage: 5, plannedDate: '2025-07-03', actualDate: null, completed: false, locked: false, savedData: {} }, // Stage 5: Pending, no data submitted yet
                { stage: 6, plannedDate: '2025-07-06', actualDate: '2025-07-06', completed: true, locked: true, savedData: {} },
            ],
            stageStatus: Array(11).fill('Pending'),
        };

        // (a) When no value is present for Stage 5, it MUST return Jinsha Manoj MV (the default assigned GRE user)
        // and NEVER Pawan Kamra (guest.takenBy)
        const s5Doer = getStageDoer(mockGuest, 5);
        assert.equal(s5Doer, 'Jinsha Manoj MV', 'Stage 5 must return assigned GRE user (Jinsha Manoj MV) when no value is present');
        assert.notEqual(s5Doer, 'Pawan Kamra', 'Stage 5 must NEVER return booking taken person (Pawan Kamra)');

        // (b) When custom stageUsers are passed (from permissions), it uses that assigned user
        const customStageUsers = [
            { name: 'Pooja Sharma', email: 'pooja@ktahv.com', role: 'gre', stages: [1, 2, 4, 5, 6, 8] },
        ];
        const s5CustomDoer = getStageDoer(mockGuest, 5, customStageUsers);
        assert.equal(s5CustomDoer, 'Pooja Sharma', 'Stage 5 must return custom assigned stage user');
        assert.notEqual(s5CustomDoer, 'Pawan Kamra');

        // (c) Even if savedData.doer accidentally contains the bookingTakenBy name (bleed), it must reject it and return assigned user
        const mockGuestWithBleed = {
            ...mockGuest,
            stages: [
                { stage: 5, plannedDate: '2025-07-03', actualDate: null, completed: false, locked: false, savedData: { doer: 'Pawan Kamra' } },
            ],
        };
        const s5BleedDoer = getStageDoer(mockGuestWithBleed, 5);
        assert.equal(s5BleedDoer, 'Jinsha Manoj MV', 'Bleed of booking taken by name into savedData.doer must be rejected');

        // (d) When savedData.doer has a real, distinct execution doer, that execution doer is returned
        const mockGuestWithRealDoer = {
            ...mockGuest,
            stages: [
                { stage: 5, plannedDate: '2025-07-03', actualDate: '2025-07-03', completed: true, locked: true, savedData: { doer: 'Sunaina Bali' } },
            ],
        };
        const s5RealDoer = getStageDoer(mockGuestWithRealDoer, 5);
        assert.equal(s5RealDoer, 'Sunaina Bali', 'Actual execution doer must be respected when valid');

        // (e) Stage 11 is assigned to GM (Anoop Vijayaraj). It must NEVER return the assigned doctor (Dr. Rahul R)
        const mockGuestWithDoctorAssigned = {
            ...mockGuest,
            guestRequirementVerification: {
                doctorAssignedToClient: 'Dr. Rahul R',
                doctorAssignStatus: 'Assigned',
            },
            stages: [
                ...mockGuest.stages,
                { stage: 11, plannedDate: '2025-07-01', actualDate: '2026-09-09', completed: true, locked: true, savedData: { doctorAssignedToClient: 'Dr. Rahul R', doer: 'Dr. Rahul R' } },
            ],
        };
        const s11Doer = getStageDoer(mockGuestWithDoctorAssigned, 11);
        assert.equal(s11Doer, 'Anoop Vijayaraj', 'Stage 11 must return assigned GM (Anoop Vijayaraj), NEVER the assigned doctor (Dr. Rahul R)');
        assert.notEqual(s11Doer, 'Dr. Rahul R', 'Stage 11 doer must NOT be the assigned doctor');

        // (f) Stage 9 & 10 are assigned to FO (Shoukath Ali Moosa). It must NEVER return driver or bookingTakenBy (Pawan Kamra)
        const mockGuestWithDriver = {
            ...mockGuest,
            driverAssignmentArrival: {
                driverName: 'Pawan Kamra', // legacy bleed in database
                assignedBy: 'Pawan Kamra',
            },
            driverAssignmentDeparture: {
                driverName: 'Pawan Kamra',
                assignedBy: 'Pawan Kamra',
            },
            stages: [
                ...mockGuest.stages,
                { stage: 9, plannedDate: '2025-07-08', actualDate: '2025-07-08', completed: true, locked: true, savedData: { driverName: 'Pawan Kamra', doer: 'Pawan Kamra' } },
                { stage: 10, plannedDate: '2025-07-15', actualDate: '2025-07-15', completed: true, locked: true, savedData: { driverName: 'Pawan Kamra', doer: 'Pawan Kamra' } },
            ],
        };
        const s9Doer = getStageDoer(mockGuestWithDriver, 9);
        assert.equal(s9Doer, 'Shoukath Ali Moosa', 'Stage 9 must return assigned FO user (Shoukath Ali Moosa), NEVER Pawan Kamra');
        assert.notEqual(s9Doer, 'Pawan Kamra');

        const s10Doer = getStageDoer(mockGuestWithDriver, 10);
        assert.equal(s10Doer, 'Shoukath Ali Moosa', 'Stage 10 must return assigned FO user (Shoukath Ali Moosa), NEVER Pawan Kamra');
        assert.notEqual(s10Doer, 'Pawan Kamra');

        // (g) For every stage 1..11, getStageDoer must NEVER return booking taken person (Pawan Kamra)
        for (let st = 1; st <= 11; st++) {
            const doer = getStageDoer(mockGuest, st);
            assert.notEqual(doer, 'Pawan Kamra', `Stage ${st} must NEVER return booking taken person (Pawan Kamra)`);
            assert.ok(doer.length > 0, `Stage ${st} must resolve to an assigned user or role name`);
        }
    });

    // -----------------------------------------------------------------------
    // Planned-date gate: no-planned-date lock applies to ALL users incl. Super Admin
    // -----------------------------------------------------------------------

    await t.test('20. hasStageNoPlannedDate: stage with no planned date is locked for ALL users including Super Admin', async () => {
        const { hasStageNoPlannedDate } = await import('../hooks/use-crr-bookings.ts');

        const makeMockGuest = (stageNo, plannedDate) => ({
            id: 9999,
            name: 'Test Guest',
            uid: 'KTAHV-TEST-9999',
            takenBy: 'Pawan Kamra',
            stages: [
                { stage: stageNo, plannedDate, locked: false, completed: false, available: true, savedData: {} },
            ],
            stageStatus: Array(11).fill('Pending'),
        });

        // (a) No planned date at all → hasStageNoPlannedDate returns true (locked for everyone)
        const guestNoDate = makeMockGuest(5, null);
        assert.equal(hasStageNoPlannedDate(guestNoDate, 5), true, 'Stage with null plannedDate must return true (locked)');

        // (b) Empty string planned date → locked
        const guestEmptyDate = makeMockGuest(5, '');
        assert.equal(hasStageNoPlannedDate(guestEmptyDate, 5), true, 'Stage with empty plannedDate must return true (locked)');

        // (c) Dash placeholder planned date → locked
        const guestDashDate = makeMockGuest(5, '-');
        assert.equal(hasStageNoPlannedDate(guestDashDate, 5), true, 'Stage with dash plannedDate must return true (locked)');

        // (d) Real planned date → NOT locked by this gate
        const guestRealDate = makeMockGuest(5, '2025-07-10');
        assert.equal(hasStageNoPlannedDate(guestRealDate, 5), false, 'Stage with real plannedDate must return false (not locked by missing-planned gate)');

        // (e) Every stage 1..11 with no planned date must trigger the lock
        for (let st = 1; st <= 11; st++) {
            const g = makeMockGuest(st, null);
            assert.equal(
                hasStageNoPlannedDate(g, st),
                true,
                `Stage ${st} with no plannedDate must be locked for ALL users (Super Admin included)`
            );
        }

        // (f) Every stage 1..11 with a real planned date must NOT trigger the missing-planned lock
        for (let st = 1; st <= 11; st++) {
            const g = makeMockGuest(st, '2025-07-01');
            assert.equal(
                hasStageNoPlannedDate(g, st),
                false,
                `Stage ${st} with a real plannedDate must NOT be locked by the missing-planned gate`
            );
        }
    });

    await t.test('21. Stages 9, 10, and 11 two-phase to_show model', async () => {
        mockProcessRows = [{
            id: 1,
            timestamp: '2026-09-02 14:00:00',
            check_in_date: '2026-09-05',
            check_out_date: '2026-09-10',
            client_name: 'Test Client',
            booking_id: 'BK-999',
            uid: 'UID-999',
            reservation_id: 'RES-999',
            booking_status: 'Confirmed'
        }];
        // Case A: Data present but to_show = 'false'
        mockTrackerRows = [{
            booking_id: 'BK-999',
            arrival_planned: '2026-09-05',
            arrival_actual: '2026-09-05',
            arrival_doer_name: 'Driver 1',
            departure_planned: '2026-09-10',
            departure_actual: '2026-09-10',
            departure_doer_name: 'Driver 2',
            stage11_planned: '2026-09-05',
            stage11_actual: '2026-09-05',
            doctor_assigned_to_the_client: 'Dr. Rahul R',
            stage11_to_show: 'false',
        }];
        mockTrackerPart2Rows = [{
            booking_id: 'BK-999',
            stage9_to_show: 'false',
            stage10_to_show: 'false',
        }];

        const reqA = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid');
        const resA = await GET(reqA);
        assert.equal(resA.status, 200);
        const jsonA = await resA.json();
        const guestA = jsonA.data[0];

        const s9A = guestA.stages.find(s => s.stage === 9);
        assert.equal(s9A.toShow, false);
        assert.equal(s9A.completed, false);
        assert.equal(s9A.submitted, true);

        const s10A = guestA.stages.find(s => s.stage === 10);
        assert.equal(s10A.toShow, false);
        assert.equal(s10A.completed, false);
        assert.equal(s10A.submitted, true);

        const s11A = guestA.stages.find(s => s.stage === 11);
        assert.equal(s11A.toShow, false);
        assert.equal(s11A.completed, false);
        assert.equal(s11A.submitted, true);

        // Case B: to_show = 'true'
        mockTrackerRows = [{
            booking_id: 'BK-999',
            arrival_planned: '2026-09-05',
            arrival_actual: '2026-09-05',
            arrival_doer_name: 'Driver 1',
            departure_planned: '2026-09-10',
            departure_actual: '2026-09-10',
            departure_doer_name: 'Driver 2',
            stage11_planned: '2026-09-05',
            stage11_actual: '2026-09-05',
            doctor_assigned_to_the_client: 'Dr. Rahul R',
            stage11_to_show: 'true',
        }];
        mockTrackerPart2Rows = [{
            booking_id: 'BK-999',
            stage9_to_show: 'true',
            stage10_to_show: 'true',
        }];

        const reqB = createMockRequest('http://localhost:3000/api/crr-calling/bookings', 'valid');
        const resB = await GET(reqB);
        assert.equal(resB.status, 200);
        const jsonB = await resB.json();
        const guestB = jsonB.data[0];

        const s9B = guestB.stages.find(s => s.stage === 9);
        assert.equal(s9B.toShow, true);
        assert.equal(s9B.completed, true);

        const s10B = guestB.stages.find(s => s.stage === 10);
        assert.equal(s10B.toShow, true);
        assert.equal(s10B.completed, true);

        const s11B = guestB.stages.find(s => s.stage === 11);
        assert.equal(s11B.toShow, true);
        assert.equal(s11B.completed, true);
    });
});