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
let mockCheckinRows = [];
let mockPermRows = [];

const mockPool = {
    async query(sql, values = []) {
        lastExecutedQueries.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
        if (sql.includes('KTAHV_CRR_Process_FMS')) return [mockProcessRows];
        if (sql.includes('KTAHV_CRR_Calling_FMS')) return [mockCallingRows];
        if (sql.includes('ktahv_guest_tracker')) return [mockTrackerRows];
        if (sql.includes('ktahv_checkinmasterfms')) return [mockCheckinRows];
        if (sql.includes('user_role_permissions')) return [mockPermRows];
        return [[]];
    },
};

global._sqlPool = mockPool;

const { GET } = await import('../app/api/crr-calling/bookings/route.ts');

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
        assert.ok(primaryQuery.sql.includes('WHERE timestamp BETWEEN ? AND ?'), 'Must use BETWEEN with parameters');
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
});