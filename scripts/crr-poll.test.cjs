const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./daily-sales-report.test.cjs');
const {nextPollDelay,processingTargets,hasToShowFlip,chunk,POLL_DELAYS_MS,MAX_POLL_BOOKINGS}=load('lib/crr-poll.ts');

const guest=(id,bookingId,statuses,stages)=>({id,bookingId,uid:`U${id}`,stageStatus:statuses,stages});

test('backoff eases off and then holds at the longest delay',()=>{
 assert.equal(nextPollDelay(0),POLL_DELAYS_MS[0]);
 assert.equal(nextPollDelay(-5),POLL_DELAYS_MS[0],'never negative index');
 assert.equal(nextPollDelay(99),POLL_DELAYS_MS.at(-1),'clamps, does not grow forever');
 assert.ok(POLL_DELAYS_MS.every((d,i,a)=>i===0||d>=a[i-1]),'monotonic');
});

test('only bookings with a Processing stage are polled, and never the open modal row',()=>{
 const guests=[
  guest(1,'B1',['Complete','Processing'],[]),
  guest(2,'B2',['Complete','Complete'],[]),
  guest(3,'B3',['Pending','Processing'],[]),
  guest(4,'',['Processing'],[]),
 ];
 assert.deepEqual(processingTargets(guests).map(t=>t.bookingId),['B1','B3'],'no B2 (settled), no blank id');
 assert.deepEqual(processingTargets(guests,1).map(t=>t.bookingId),['B3'],'locked row excluded');
 assert.deepEqual(processingTargets([],null),[]);
 assert.equal(processingTargets(guests)[0].uid,'U1');
});

test('a flip is detected only when the server disagrees with what the client holds',()=>{
 const guests=[guest(1,'B1',['Processing'],[{stage:5,toShow:false},{stage:7,toShow:true}])];
 assert.equal(hasToShowFlip(guests,[{bookingId:'B1',toShow:{5:false,7:true}}]),false,'same state, no refetch');
 assert.equal(hasToShowFlip(guests,[{bookingId:'B1',toShow:{5:true}}]),true,'stage 5 confirmed');
 assert.equal(hasToShowFlip(guests,[{bookingId:'B1',toShow:{9:true}}]),false,'stage the client does not track');
 assert.equal(hasToShowFlip(guests,[{bookingId:'NOPE',toShow:{5:true}}]),false,'unknown booking');
 assert.equal(hasToShowFlip(guests,[{bookingId:'B1',toShow:{5:true}}],1),false,'locked row never triggers a refetch');
 assert.equal(hasToShowFlip(guests,[{bookingId:'B1'}]),false,'missing toShow is not a flip');
});

test('requests are chunked so a busy page never exceeds the route cap',()=>{
 const targets=Array.from({length:MAX_POLL_BOOKINGS*2+3},(_,i)=>({bookingId:`B${i}`,uid:`U${i}`}));
 const batches=chunk(targets);
 assert.equal(batches.length,3);
 assert.ok(batches.every(b=>b.length<=MAX_POLL_BOOKINGS),'no batch over the cap');
 assert.equal(batches.flat().length,targets.length,'nothing dropped');
 assert.deepEqual(batches.flat(),targets,'order preserved');
 assert.deepEqual(chunk([]),[],'empty stays empty');
 assert.throws(()=>chunk(targets,0),'a zero size would loop forever');
});
