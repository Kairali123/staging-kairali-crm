import test from 'node:test';
import assert from 'node:assert/strict';
import { istToday, stageBlockReason, stageDateLock, toYmd } from '../lib/crr-stage-rules.ts';

// Check-in 10-Sept-2026 (API display format), check-out 15-Sept-2026, planned 20-Sept-2026.
const booking = (stage, info = {}) => ({
    checkIn: '10-Sept-2026',
    checkOut: '15-Sept-2026',
    bookingStatus: 'Confirmed',
    info: { stage, available: true, locked: false, completed: false, plannedDate: '20-Sep-2026', ...info },
});

test('each stage opens on its rule date (IST, date only) — issue #157', () => {
    const opensOn = {
        1: '2026-09-09', 2: '2026-09-10', 3: '2026-09-15', 4: '2026-09-10', 5: '2026-09-15',
        6: '2026-09-20', 7: '2026-09-20', 8: '2026-09-10', 11: '2026-09-09',
    };
    for (const [stage, day] of Object.entries(opensOn)) {
        const n = Number(stage);
        const prev = new Date(Date.UTC(...day.split('-').map((v, i) => (i === 1 ? v - 1 : +v))) - 86400000).toISOString().slice(0, 10);
        assert.match(stageDateLock(n, booking(n), prev), /opens on/, `stage ${n} locked on ${prev}`);
        assert.equal(stageDateLock(n, booking(n), day), null, `stage ${n} open on ${day}`);
    }
    // Driver stages: no date gate, only a planned date is needed
    assert.equal(stageDateLock(9, booking(9), '2000-01-01'), null);
    assert.equal(stageDateLock(10, booking(10), '2000-01-01'), null);
});

test('opens at 12:00 AM IST, not UTC midnight', () => {
    // 18:30Z on 8 Sep = 00:00 IST on 9 Sep → stage 1 (check-in - 1) opens
    assert.equal(istToday(new Date('2026-09-08T18:29:59Z')), '2026-09-08');
    assert.equal(istToday(new Date('2026-09-08T18:30:00Z')), '2026-09-09');
    assert.equal(stageDateLock(1, booking(1), istToday(new Date('2026-09-08T18:30:00Z'))), null);
});

test('planned date, cancellation, completion and processing block every role', () => {
    const today = '2026-12-01';
    assert.match(stageBlockReason(9, booking(9, { plannedDate: '' }), today), /Planned date is not scheduled/);
    assert.match(stageBlockReason(2, booking(2, { plannedDate: '-' }), today), /Planned date is not scheduled/);
    assert.match(stageBlockReason(2, { ...booking(2), checkIn: '' }, today), /Check-in date is missing/);
    assert.match(stageBlockReason(2, { ...booking(2), bookingStatus: 'Cancelled' }, today), /cancelled/);
    assert.match(stageBlockReason(2, booking(2, { completed: true }), today), /already completed/);
    assert.match(stageBlockReason(1, booking(1, { submitted: true, toShow: false }), today), /already submitted/);
    assert.equal(stageBlockReason(1, booking(1), today), null);
});

test('toYmd accepts the API display formats', () => {
    assert.equal(toYmd('18-Sept-2026'), '2026-09-18');
    assert.equal(toYmd('06-Aug-2026'), '2026-08-06');
    assert.equal(toYmd('2026-08-06'), '2026-08-06');
    assert.equal(toYmd(''), null);
    assert.equal(toYmd('garbage'), null);
});

test('derived savedData values do not mark an untouched stage as Processing', () => {
    // API output for stage 9 with only a planned date: pickupRequired is derived as "Yes"
    const info = { stage: 9, available: true, locked: false, completed: false, plannedDate: '08-Jan-2099', toShow: false, submitted: false, actualDate: '', savedData: { pickupRequired: 'Yes', driverName: '', stageKey: 'U_Stage9' } };
    assert.equal(stageBlockReason(9, { checkIn: '', checkOut: '', bookingStatus: 'Confirmed', info }, '2026-01-01'), null);
    // Genuinely submitted and awaiting to_show stays Processing
    assert.match(stageBlockReason(9, { checkIn: '', checkOut: '', bookingStatus: 'Confirmed', info: { ...info, submitted: true } }, '2026-01-01'), /already submitted/);
});
