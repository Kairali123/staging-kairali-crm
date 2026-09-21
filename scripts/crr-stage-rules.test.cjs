const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./daily-sales-report.test.cjs');
const {autoCloseReason}=load('lib/crr-stage-rules.ts');
const TODAY='2026-09-21';
test('stages 9/10/11 auto-close only when unplanned and the gate date has passed',()=>{
 assert.match(autoCloseReason(null,'2026-09-20','Check-in',TODAY),/Check-in date passed/);
 assert.match(autoCloseReason(null,'20-Sep-2026','Check-in',TODAY),/Check-in date passed/,'API display format');
 assert.match(autoCloseReason(null,new Date('2026-09-19T18:30:00Z'),'Check-out',TODAY),/Check-out date passed/,'Date object');
 // 18:30Z is already the next calendar day in IST, so this gate date is today, not past.
 assert.equal(autoCloseReason(null,new Date('2026-09-20T18:30:00Z'),'Check-in',TODAY),null,'IST boundary');
 assert.equal(autoCloseReason(null,'2026-09-21','Check-in',TODAY),null,'today is not past');
 assert.equal(autoCloseReason(null,'2026-09-22','Check-in',TODAY),null,'future stays open');
 assert.equal(autoCloseReason('2026-09-25','2026-09-01','Check-in',TODAY),null,'a planned date blocks auto-close');
 assert.equal(autoCloseReason(null,null,'Check-in',TODAY),null,'no gate date, no close');
 assert.equal(autoCloseReason(null,'not-a-date','Check-in',TODAY),null,'unparseable never closes');
});
