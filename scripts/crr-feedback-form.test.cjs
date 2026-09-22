const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./daily-sales-report.test.cjs');
const m=load('lib/crr-feedback-form.ts');
const {FEEDBACK_SECTIONS,stepMissing,nextStepIndex,visibleSteps,formMissing,isSectionSkipped,FEEDBACK_FIELD_NAMES,HIDDEN_FEEDBACK_FIELDS}=m;
const idx=t=>FEEDBACK_SECTIONS.findIndex(s=>s.title===t);

test('the schema matches the reference form',()=>{
 assert.equal(FEEDBACK_SECTIONS.length,15);
 assert.equal(FEEDBACK_SECTIONS[0].title,'Guest Details');
 const taker=FEEDBACK_SECTIONS.flatMap(s=>s.fields).find(f=>f.name==='feedback-taker');
 assert.equal(taker.readOnly,true,'feedback taker is filled from the session, not typed');
 assert.equal(taker.required,true);
});

test('a rating step needs every row answered',()=>{
 const sec=FEEDBACK_SECTIONS[idx('3. Accommodation')];
 assert.equal(stepMissing(sec,{}).length,sec.fields.length,'nothing answered');
 const all=Object.fromEntries(sec.fields.map(f=>[f.name,'good']));
 assert.deepEqual(stepMissing(sec,all),[],'all answered');
 const one={...all};delete one[sec.fields[0].name];
 assert.equal(stepMissing(sec,one).length,1,'one row left blank still blocks');
});

test('consent must be ticked, publish is optional',()=>{
 const sec=FEEDBACK_SECTIONS[idx('Consent')];
 const base={'feedback-taker':'Someone'};
 assert.ok(stepMissing(sec,base).includes(sec.fields[0].label),'consent required');
 assert.deepEqual(stepMissing(sec,{...base,consent:true}),[],'publish stays optional');
});

test('answering no to recommend skips the recommended-person step',()=>{
 const overall=idx('10. Overall Experience'), rec=idx('Recommended Person Details');
 assert.equal(nextStepIndex(overall,{recommend:'yes'},1),rec,'yes walks into it');
 assert.equal(nextStepIndex(overall,{recommend:'no'},1),rec+1,'no steps over it');
 assert.equal(nextStepIndex(rec+1,{recommend:'no'},-1),overall,'and going back skips it too');
 assert.equal(visibleSteps({recommend:'no'}),14);
 assert.equal(visibleSteps({recommend:'yes'}),15);
 assert.equal(isSectionSkipped(FEEDBACK_SECTIONS[rec],{recommend:'no'}),true);
 assert.equal(formMissing({recommend:'no'}).some(l=>l==='Recommended Person Name'),false,'skipped step is not demanded');
});

test('stepping never runs off either end',()=>{
 assert.equal(nextStepIndex(0,{},-1),0);
 assert.equal(nextStepIndex(FEEDBACK_SECTIONS.length-1,{},1),FEEDBACK_SECTIONS.length-1);
});

test('the booking id rides along as UID and survives the proxy allow-list',()=>{
 assert.deepEqual([...HIDDEN_FEEDBACK_FIELDS],['UID']);
 assert.ok(FEEDBACK_FIELD_NAMES.has('UID'),'proxy would otherwise reject it as unknown');
 assert.equal(FEEDBACK_SECTIONS.some(s=>s.fields.some(f=>f.name==='UID')),false,'never rendered as an input');
 assert.deepEqual(formMissing({}).filter(l=>l==='UID'),[],'not something a user can be asked to fill');
});
