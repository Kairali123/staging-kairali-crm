/** Kairali Trigger Monitor. Install this file in each monitored Apps Script project.
 * Run crmMonitorConfigure once while signed in as the trigger creator.
 * UserProperties keep each creator's token separate. Never paste tokens into source.
 * In each existing trigger handler use:
 *   function myHandler(e) { return crmMonitorRun(e, function () { ORIGINAL_CODE }); }
 * Do not rename/recreate existing triggers. This collector adds one hourly inventory trigger.
 */
function crmMonitorConfigure() {
  var ui = SpreadsheetApp.getUi();
  var endpoint = ui.prompt('CRM monitoring URL', 'Paste the HTTPS CRM origin (without a path)', ui.ButtonSet.OK_CANCEL);
  if (endpoint.getSelectedButton() !== ui.Button.OK) return;
  var token = ui.prompt('Project connector token', 'Paste the token generated for this account and project in CRM', ui.ButtonSet.OK_CANCEL);
  if (token.getSelectedButton() !== ui.Button.OK) return;
  crmMonitorSetup(endpoint.getResponseText().trim(), token.getResponseText().trim());
}
// For standalone projects set CRM_MONITOR_ORIGIN and CRM_MONITOR_TOKEN in UserProperties
// using your own setup function calling crmMonitorSetup(origin, token), then remove that function.
function crmMonitorSetup(origin, token) {
  if (!/^https:\/\/[^/\s?#]+$/.test(origin) || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Valid HTTPS origin and connector token required');
  var props = PropertiesService.getUserProperties();
  props.setProperties({CRM_MONITOR_ORIGIN:origin,CRM_MONITOR_TOKEN:token});
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  if (sheet) props.setProperty('CRM_MONITOR_SHEET_ID', sheet.getId());
  crmMonitorInventory();
  if (!ScriptApp.getProjectTriggers().some(function(t) {return t.getHandlerFunction()==='crmMonitorHeartbeat';})) {
    ScriptApp.newTrigger('crmMonitorHeartbeat').timeBased().everyHours(1).create();
  }
}
function crmMonitorIdentity_() {
  var email = Session.getEffectiveUser().getEmail();
  if (!email) throw new Error('Run the connector as the authorized trigger creator');
  return {email:email.toLowerCase(),scriptId:ScriptApp.getScriptId()};
}
function crmMonitorSend_(event) {
  var props=PropertiesService.getUserProperties(),origin=props.getProperty('CRM_MONITOR_ORIGIN'),token=props.getProperty('CRM_MONITOR_TOKEN');
  if (!origin || !token) throw new Error('Configure CRM monitoring first');
  var response=UrlFetchApp.fetch(origin+'/api/trigger-monitor/ingest',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+token},payload:JSON.stringify(event),muteHttpExceptions:true});
  if(response.getResponseCode()!==200) throw new Error('CRM monitoring rejected telemetry: HTTP '+response.getResponseCode());
}
function crmMonitorInventory() {
  var event=crmMonitorIdentity_();event.kind='inventory';event.at=new Date().toISOString();
  event.triggers=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction().indexOf('crmMonitor')!==0;}).map(function(t){var item={triggerId:t.getUniqueId(),handler:t.getHandlerFunction(),type:String(t.getEventType())};if(String(t.getTriggerSource())==='SPREADSHEETS'){try{item.sheetId=t.getTriggerSourceId();var ss=SpreadsheetApp.openById(item.sheetId);item.sheetName=ss.getName();var owner=ss.getOwner();if(owner)item.sheetOwner=owner.getEmail();}catch(ignored){}}return item;});
  var props=PropertiesService.getUserProperties(),id=props.getProperty('CRM_MONITOR_SHEET_ID');
  if(id){
    try {var sheet=SpreadsheetApp.openById(id);event.sheetId=sheet.getId();event.sheetName=sheet.getName();var owner=sheet.getOwner();if(owner)event.sheetOwner=owner.getEmail();} catch(ignored) { /* Ownership may be unavailable for shared-drive files. */ }
  }
  crmMonitorSend_(event);
}
function crmMonitorHeartbeat() {
  crmMonitorInventory();
  var props=PropertiesService.getUserProperties(),all=props.getProperties(),keys=Object.keys(all).filter(function(k){return k.indexOf('CRM_MONITOR_OUTBOX_')===0;}).sort();
  keys.slice(0,20).forEach(function(key){
    var event=JSON.parse(all[key]);
    if(Date.now()-Date.parse(event.startedAt)>29*86400000){props.deleteProperty(key);return;}
    try {crmMonitorSend_(event);props.deleteProperty(key);}catch(ignored){}
  });
}
function crmMonitorDeliver_(event) {
  try {crmMonitorSend_(event);} catch(ignored) {
    var props=PropertiesService.getUserProperties();
    var count=Object.keys(props.getProperties()).filter(function(k){return k.indexOf('CRM_MONITOR_OUTBOX_')===0;}).length;
    if(count<100)props.setProperty('CRM_MONITOR_OUTBOX_'+event.runId,JSON.stringify(event));
    console.warn('CRM telemetry delivery delayed; inspect monitoring health.');
  }
}
function crmMonitorReason_(error) {
  var msg=String(error && error.message || error).toLowerCase();
  if(/authoriz|permission to call/.test(msg))return 'authorization';
  if(/timed out|execution time/.test(msg))return 'timeout';
  if(/quota|too many|too much|limit exceeded/.test(msg))return 'quota';
  if(/access|permission|not found/.test(msg))return 'access';
  return 'exception';
}
function crmMonitorRun(e, work) {
  // Manual/editor executions have no triggerUid and are deliberately not attributed to a trigger.
  if(!e || !e.triggerUid)return work();
  var event;
  try {
    event=crmMonitorIdentity_();event.kind='execution';event.triggerId=String(e.triggerUid);event.runId=Utilities.getUuid();event.startedAt=new Date().toISOString();event.status='Running';event.reason='unknown';
    crmMonitorInventory();crmMonitorDeliver_(event);
  }catch(ignored){console.warn('CRM monitoring unavailable; business handler will still execute.');}
  var start=Date.now();
  try {var result=work();if(event){event.status='Success';event.reason='none';}return result;}
  catch(error){if(event){event.status='Failed';event.reason=crmMonitorReason_(error);}throw error;}
  finally {if(event){event.finishedAt=new Date().toISOString();event.durationMs=Date.now()-start;try{crmMonitorDeliver_(event);}catch(ignored){console.warn('CRM telemetry could not be queued.');}}}
}
