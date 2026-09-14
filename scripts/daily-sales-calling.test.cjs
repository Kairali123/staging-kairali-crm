const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./daily-sales-report.test.cjs');
const {parseEmployees,parsePending,callingSummary}=load('lib/daily-sales-calling.ts');
const snapshot={rows:Array.from({length:16},()=>[])};snapshot.rows[0]=['COUNT','','','KTAHV','VILLARAAG','KAPPL'];for(const i of [5,10,15])snapshot.rows[i]=['TOTAL','','',1,0,2];
test('pending sheet totals use the three company summary rows',()=>{
 const pending=parsePending(snapshot.rows);
 const data={pending,employees:[]};
 const all=callingSummary(data,'ALL');
 assert.deepEqual([all.pendingAppsheet,all.pendingNational,all.pendingInternational],[3,3,3]);
 assert.equal(callingSummary(data,'KTAHV').pendingAppsheet,1);
 assert.equal(callingSummary(data,'VILLARAAG').pendingAppsheet,0);
 assert.throws(()=>parsePending([['changed']]));
});
test('employee column mapping preserves source date and errors without exposing extra fields',()=>{
 const [row]=parseEmployees([{Name:'Agent',Date:'12/09/2026 17:46:20','Appsheet - Total Calls Done':17,'Dialer - Total Calls Done ':15,'Appsheet - Total Calls Pending (Till Today)':39,privateURL:'hidden'}]);
 assert.deepEqual([row.pending,row.appsheet,row.dialer,row.done,row.date],[39,17,15,32,'2026-09-12']);
 assert.equal(row.privateURL,undefined);
 const [bad]=parseEmployees([{Name:'Agent','Appsheet - Total Calls Done':'#REF!'}]);
 assert.equal(bad.done,null);
 assert.equal(callingSummary({pending:{},employees:[row]},'KTAHV').appsheet,null);
 assert.equal(callingSummary({pending:{},employees:[row]},'ALL').appsheet,17);
});

test('company employee filter and totals exclude other companies without inventing zero for missing values',()=>{const {scopedEmployees,employeeTotal}=load('lib/daily-sales-calling.ts');const data={employees:[{name:'A',companies:['KTAHV'],pending:4},{name:'B',companies:['KAPPL'],pending:8},{name:'C',pending:null}]};assert.equal(scopedEmployees(data,'KTAHV').length,1);assert.equal(employeeTotal(scopedEmployees(data,'KTAHV'),'pending'),4);assert.equal(scopedEmployees(data,'ALL').length,3);assert.equal(employeeTotal(scopedEmployees(data,'ALL'),'pending'),null);assert.equal(scopedEmployees(data,'VILLARAAG').length,0)})

test('booking-date sales remain gross while CW cancellations use their own selected day',async()=>{const {bookingAmounts,cancellationDates}=load('lib/daily-sales-bookings.ts');const rows=await bookingAmounts([{agent:'A',bookingDate:'2026-09-14',currency:'INR',amount:100,records:1}],[{agent:'A',bookingDate:'2026-09-01',currency:'INR',amount:40,records:1}]);assert.equal(rows.reduce((n,r)=>n+r.verified,0),100);assert.equal(rows.reduce((n,r)=>n+r.cancelled,0),40);await assert.rejects(()=>bookingAmounts([{agent:'A',bookingDate:'2026-09-14',currency:'UNKNOWN',amount:100,records:1}],[]))})
