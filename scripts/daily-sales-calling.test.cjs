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
 assert.equal(callingSummary({pending:{},employees:[row]},'ALL').pendingAppsheet,39);
});

test('company employee filter and totals exclude other companies without inventing zero for missing values',()=>{const {scopedEmployees,employeeTotal}=load('lib/daily-sales-calling.ts');const data={employees:[{name:'A',companies:['KTAHV'],pending:4},{name:'B',companies:['KAPPL'],pending:8},{name:'C',pending:null}]};assert.equal(scopedEmployees(data,'KTAHV').length,1);assert.equal(employeeTotal(scopedEmployees(data,'KTAHV'),'pending'),4);assert.equal(scopedEmployees(data,'ALL').length,3);assert.equal(employeeTotal(scopedEmployees(data,'ALL'),'pending'),12);assert.equal(employeeTotal([{name:'C',pending:null}],'pending'),null);assert.equal(scopedEmployees(data,'VILLARAAG').length,0)})

test('booking-date sales remain gross while CW cancellations use their own selected day',async()=>{const {bookingAmounts,cancellationDates}=load('lib/daily-sales-bookings.ts');const rows=await bookingAmounts([{agent:'A',bookingDate:'2026-09-14',currency:'INR',amount:100,records:1}],[{agent:'A',bookingDate:'2026-09-01',currency:'INR',amount:40,records:1}]);assert.equal(rows.reduce((n,r)=>n+r.verified,0),100);assert.equal(rows.reduce((n,r)=>n+r.cancelled,0),40);await assert.rejects(()=>bookingAmounts([{agent:'A',bookingDate:'2026-09-14',currency:'UNKNOWN',amount:100,records:1}],[]))})

test('loadCalling checks database first and falls back to DialerPending sheet snapshot when DB has no data',async()=>{
 const {loadCalling}=load('lib/daily-sales-calling-server.ts');
 const mockDBWithData={query:async(sql)=>{
  if(String(sql).includes('SHOW TABLES'))return[['dialer_pending']];
  return[[{company:'KTAHV',national_pending:50,international_pending:10,appsheet_pending:20}]];
 }};
 const dbResult=await loadCalling(mockDBWithData,'2026-09-14');
 assert.equal(dbResult.pendingMode,'database');
 assert.equal(dbResult.pending.KTAHV.national,50);
 assert.equal(dbResult.pending.KTAHV.international,10);
 assert.equal(dbResult.pending.KTAHV.appsheet,20);

 const mockDBEmpty={query:async()=>[]};
 const fallbackResult=await loadCalling(mockDBEmpty,'2026-09-14');
 assert.ok(['live','snapshot'].includes(fallbackResult.pendingMode));
 assert.ok(fallbackResult.pending.KTAHV.national>0);
 assert.ok(fallbackResult.pending.VILLARAAG.national>0);
 assert.ok(fallbackResult.pending.KAPPL.national>0);
});

test('mapEmployeeCompanies resolves companies from userlogin and all_users formats correctly',()=>{
 const {mapEmployeeCompanies,parseEmployeeCompany}=load('lib/daily-sales-calling.ts');
 assert.equal(parseEmployeeCompany('KTAHV - HO'),'KTAHV');
 assert.equal(parseEmployeeCompany('KAPPL- FACTORY'),'KAPPL');
 assert.equal(parseEmployeeCompany('KAPPL- HO'),'KAPPL');
 assert.equal(parseEmployeeCompany('UNKNOWN'),null);

 const employees=[
   {name:'Pawan Kamra',pending:11,appsheet:3,dialer:0,done:3,date:'2026-09-21',updatedAt:'',campaign:''},
   {name:'Dhaneshwar Chaturvedi',pending:453,appsheet:0,dialer:0,done:0,date:'2026-09-21',updatedAt:'',campaign:''},
   {name:'Bhuvaneshwari',pending:52,appsheet:0,dialer:0,done:0,date:'2026-09-21',updatedAt:'',campaign:''},
   {name:'Zaki Ahmed',pending:45,appsheet:9,dialer:0,done:9,date:'2026-09-21',updatedAt:'',campaign:''}
 ];
 const records=[
   {user_name:'Pawan Kamra',company:'KTAHV',company_name:'KTAHV'},
   {user_name:'Dhaneshwar Chaturvedi',company:'KAPPL- HO',company_name:'KAIRALI PRODUCTS (HO)'},
   {user_name:'Bhuvaneshwari',company:'KAPPL- FACTORY',company_name:'KAIRALI PRODUCTS FACTORY'},
   {user_name:'Zaki Ahmed',company:'KAPPL',company_name:'KAPPL'}
 ];
 const valid={KTAHV:'Healing Village',VILLARAAG:'Villa Raag',KAPPL:'Products'};
 mapEmployeeCompanies(employees,records,valid);
 assert.deepEqual(employees[0].companies,['KTAHV']);
 assert.deepEqual(employees[1].companies,['KAPPL']);
 assert.deepEqual(employees[2].companies,['KAPPL']);
 assert.deepEqual(employees[3].companies,['KAPPL']);
});
