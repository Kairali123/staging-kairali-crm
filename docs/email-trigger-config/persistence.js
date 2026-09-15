// Production-shaped local persistence. No browser credential or report HTML is stored.
let initializedPersistence=false,storageReady=false,smtpReady=false,workerReady=false,actualSender='',savedRuns=[],savePending=false;
const beforePersistentDraw=draw,beforePersistentSubmit=$('#triggerForm').onsubmit;
function normalizeDraft(){draft.retry='No retries';draft.missed='Skip missed run';draft.attachment='None';draft.mode='Same email to all recipients';if(!['Always send','Only when data is available'].includes(draft.condition))draft.condition='Always send';draft.replyTo||='';if(draft.replyTo==='support@example.com')draft.replyTo='';draft.intro||='';draft.closing||='';draft.reportId=selectedReportId();draft.period||='Yesterday';draft.reportDetail||='Full report';}
function showServiceStatus(error=''){
 const badge=document.querySelector('.prototype');badge.textContent=error||(!storageReady?'Storage unavailable':!smtpReady?'SMTP not configured':!workerReady?'Worker offline':'Scheduler ready');badge.style.background=storageReady&&smtpReady&&workerReady?'#e4f4e9':'#fff0db';
 document.querySelector('.bottom').innerHTML='<span>Settings saved on this CRM server · '+(workerReady?'Background worker connected':'Background worker not connected')+'</span><span>Active = scheduled sending · Draft / Paused = no sending</span>';
}
function renderRuns(){document.querySelector('#history').innerHTML='<h3>Send history</h3><p>Accepted means accepted by the email provider; Unknown / Partial runs pause the trigger to avoid duplicate delivery.</p><div class="tablewrap"><table><thead><tr><th>Trigger</th><th>Scheduled</th><th>Result</th><th>Details</th></tr></thead><tbody>'+savedRuns.slice().reverse().map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+esc(new Date(r.scheduledAt).toLocaleString())+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.detail)+'</td></tr>').join('')+'</tbody></table>'+(savedRuns.length?'':'<p style="padding:25px">No scheduled sends yet.</p>')+'</div>'}
draw=function(){beforePersistentDraw();if(!linkedHost)return;normalizeDraft();const lockSelect=(name,options,value)=>{const el=document.querySelector('#details [name="'+name+'"]');if(el){el.innerHTML=options.map(v=>'<option>'+esc(v)+'</option>').join('');el.value=value}};
 lockSelect('company',['All companies','KTAHV','VILARAAG','KAPPL'],draft.company);lockSelect('retry',['No retries'],'No retries');lockSelect('missed',['Skip missed run'],'Skip missed run');lockSelect('attachment',['None'],'None');lockSelect('mode',['Same email to all recipients'],'Same email to all recipients');lockSelect('condition',['Always send','Only when data is available'],draft.condition);lockSelect('sender',[actualSender||'SMTP not configured'],actualSender||'SMTP not configured');
 const owner=document.querySelector('#details [name="owner"]');if(owner)owner.closest('label').remove();
 const status=document.querySelector('#details [name="status"]');if(status)status.closest('label').insertAdjacentHTML('beforeend','<small>Active: send at the next scheduled time. Draft / Paused: no sends.</small>');
 document.querySelectorAll('#details p').forEach(p=>{if(p.textContent.includes('Use sample addresses'))p.textContent='Separate multiple addresses with commas. These recipients will receive scheduled emails when Active.'});
 if(step===2)document.querySelectorAll('.scheduleCard p').forEach(p=>p.textContent='Schedule is stored on the server. Active configurations send while the background worker is online.');
 const cards=document.querySelectorAll('#details .scheduleCard');if(step===1)cards.forEach(c=>{c.innerHTML='<strong>Fresh report generated at every run</strong><p>Choose Today or Yesterday for a rolling report. Selected date stays fixed. Add recipients, set the schedule, then save as Active to begin sending.</p>'});
 const submit=$('#triggerForm button[type="submit"]');submit.textContent=savePending?'Saving…':draft.status==='Active'?'Save & activate':'Save configuration';submit.disabled=savePending||!storageReady;
};
$('#triggerForm').onsubmit=e=>{if(!linkedHost)return beforePersistentSubmit(e);e.preventDefault();if(savePending)return;collect();normalizeDraft();if(!storageReady){toast('Storage unavailable. Configuration has not been saved.');return}
 const config={...draft};if(typeof config.id!=='string')delete config.id;delete config.nextRun;delete config.lastResult;delete config.result;delete config.owner;delete config.sender;delete config.updatedAt;
 savePending=true;$('#triggerForm button[type="submit"]').disabled=true;window.parent.postMessage({type:'email-config-save',config},'*');};
window.addEventListener('message',event=>{if(event.source!==window.parent||window.parent===window)return;const m=event.data;
 if(m?.type==='email-config-init'){
  if(initializedPersistence)return;initializedPersistence=true;
  storageReady=!!m.state;smtpReady=!!m.state?.smtpReady;workerReady=!!m.state?.workerReady;actualSender=m.state?.sender||'';savedRuns=m.state?.runs||[];
  const unsaved={...draft,replyTo:''};triggers=(m.state?.triggers||[]).map(t=>({...t,result:t.lastResult}));
  $('#editor').close();if(m.autoCreate){const existing=triggers.find(t=>t.reportId===m.report);if(existing){openEditor(existing.id);step=1;draw()}else{draft=unsaved;editId=null;step=1;draw();$('#editor').showModal()}}
  $('#new').onclick=()=>{draft={...seedTrigger,id:Date.now(),name:'New email trigger',to:'',cc:'',bcc:'',replyTo:'',status:'Draft',reportId:'daily-sales-report',source:'Daily Sales Report Alert',template:'Daily Sales Report Alert',bodyType:'Full report in email body',period:'Yesterday',reportDetail:'Full report',start:new Date().toISOString().slice(0,10)};editId=null;step=0;normalizeDraft();draw();$('#editor').showModal()};
  document.querySelector('#listTabs [data-tab="History"]').classList.remove('hidden');renderRuns();render();showServiceStatus(m.error);
 }else if(m?.type==='email-config-saved'){
  savePending=false;if(m.error){toast(m.error);draw();return}const item={...m.trigger,result:m.trigger.lastResult};const exists=triggers.some(t=>t.id===item.id);triggers=exists?triggers.map(t=>t.id===item.id?item:t):[item,...triggers];$('#editor').close();render();toast(item.status==='Active'?'Saved and activated. Next send: '+new Date(item.nextRun).toLocaleString():'Configuration saved on server.');
 }else if(m?.type==='email-config-storage-error'){storageReady=false;showServiceStatus(m.error);toast(m.error)}
});
// Existing row buttons use numeric IDs in the demo; persisted IDs are UUIDs.
$('#rows').onclick=e=>{const b=e.target.closest('[data-edit]');if(!b)return;const id=linkedHost?b.dataset.edit:+b.dataset.edit;openEditor(id)};

const beforePersistentRender=render;
render=function(){beforePersistentRender();if(!linkedHost)return;document.querySelectorAll('#rows tr').forEach(row=>{const id=row.querySelector('[data-edit]')?.dataset.edit,t=triggers.find(x=>x.id===id);if(t&&row.cells[2])row.cells[2].insertAdjacentHTML('beforeend','<small>'+(t.nextRun?'Next: '+esc(new Date(t.nextRun).toLocaleString()):'No scheduled send')+'</small>')});};
window.addEventListener('message',event=>{if(event.source!==window.parent||window.parent===window||event.data?.type!=='email-config-state')return;const m=event.data;if(!m.state){showServiceStatus(m.error);return}smtpReady=m.state.smtpReady;workerReady=m.state.workerReady;savedRuns=m.state.runs;triggers=m.state.triggers.map(t=>({...t,result:t.lastResult}));render();renderRuns();showServiceStatus()});
const refreshState=setInterval(()=>{if(linkedHost&&!savePending)window.parent.postMessage({type:'email-config-refresh'},'*')},30000);
