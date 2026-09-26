import re

with open('app/api/lead-loss/route.ts', 'r') as f:
    code = f.read()

# Replace queryBuffer to return Set
code = re.sub(
    r'const byDate = new Map<string, { leadIds: string\[\]; mobiles: string\[\]; sources: string\[\] }>\(\);.*?\n\s+return byDate;',
    '''const byDate = new Map<string, Set<string>>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    if (!byDate.has(dt)) byDate.set(dt, new Set());
    byDate.get(dt)!.add(normMobile(r.Mobile));
  }
  return byDate;''', code, flags=re.DOTALL
)

# Replace queryCRM
code = re.sub(
    r'const byDate = new Map<string, { total: number; leadIds: string\[\] }>\(\);.*?\n\s+return byDate;',
    '''const byDate = new Map<string, Set<string>>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    if (!byDate.has(dt)) byDate.set(dt, new Set());
    byDate.get(dt)!.add(normMobile(r.Phone_Number_of_User));
  }
  return byDate;''', code, flags=re.DOTALL
)
code = code.replace('Lead_id\n       FROM staging_buffer_new', 'Phone_Number_of_User\n       FROM staging_buffer_new')

# Replace queryKServe
code = re.sub(
    r'const byDate = new Map<string, { total: number; leadIds: string\[\] }>\(\);.*?\n\s+return byDate;',
    '''const byDate = new Map<string, Set<string>>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    if (!byDate.has(dt)) byDate.set(dt, new Set());
    byDate.get(dt)!.add(normMobile(r.mobile));
  }
  return byDate;''', code, flags=re.DOTALL
)
code = code.replace('lead_id\n       FROM ai_voice_leads_received', 'mobile\n       FROM ai_voice_leads_received')

# Replace querySales
code = re.sub(
    r'SELECT DATE\(enquiry_date_time\) AS dt, COUNT\(\*\) AS cnt',
    'SELECT DATE(enquiry_date_time) AS dt, mobile', code
)
code = code.replace('GROUP BY dt', '')
code = re.sub(
    r'const byDate = new Map<string, number>\(\);.*?\n\s+return byDate;',
    '''const byDate = new Map<string, Set<string>>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    if (!byDate.has(dt)) byDate.set(dt, new Set());
    byDate.get(dt)!.add(normMobile(r.mobile));
  }
  return byDate;''', code, flags=re.DOTALL
)

# Replace buildLostRecords signature and logic
code = re.sub(
    r'function buildLostRecords.*?return records;\n}',
    '''function buildLostRecords(
  directMobiles: string[],
  directLeadIds: string[],
  bufferMobileSet: Set<string>,
  crmMobileSet: Set<string>,
  source: string,
  date: string,
  company: string
) {
  const records: any[] = [];
  const seen24h = new Map<string, string>(); 

  directMobiles.forEach((mobile, i) => {
    const leadId = directLeadIds[i] || `${source}_${i}`;
    const norm = normMobile(mobile);

    if (norm && seen24h.has(norm)) {
      records.push({
        id: leadId, name: "", phone: mobile, date, company, source,
        generatedAt: date, timestamp: date, transferTimestamp: "", bufferTimestamp: "",
        currentStatus: "Lost", transferStatus: "Not transferred", bufferStatus: "Not in buffer", crmStatus: "N/A",
        assignee: "", tatMin: 0, tat: "—",
        isDuplicate: true, validDuplicate: true, expectedDuplicateGap: true,
        inMedium: false, toBuffer: false, inBuffer: false, inCrm: false, assigned: false,
        stage: "direct", status: "Duplicate", reason: `Duplicate mobile in same source within 24hrs`,
      });
    } else {
      if (norm) seen24h.set(norm, leadId);
      const inBuf = norm ? bufferMobileSet.has(norm) : false;
      const inCrm = norm ? crmMobileSet.has(norm) : false;
      if (!inBuf) {
        records.push({
          id: leadId, name: "", phone: mobile, date, company, source,
          generatedAt: date, timestamp: date, transferTimestamp: "", bufferTimestamp: "",
          currentStatus: "Lost", transferStatus: "Not transferred", bufferStatus: "Not in buffer", crmStatus: "N/A",
          assignee: "", tatMin: 0, tat: "—",
          isDuplicate: false, inMedium: false, toBuffer: false, inBuffer: false, inCrm: false, assigned: false,
          stage: "direct", status: "Lost", reason: "Lead received in Direct API but not found in Buffer (Gap 1: Direct→Medium)",
        });
      } else if (!inCrm) {
         records.push({
          id: leadId, name: "", phone: mobile, date, company, source,
          generatedAt: date, timestamp: date, transferTimestamp: date, bufferTimestamp: date,
          currentStatus: "Lost", transferStatus: "Transferred", bufferStatus: "In Buffer", crmStatus: "Not in CRM",
          assignee: "", tatMin: 0, tat: "—",
          isDuplicate: false, inMedium: true, toBuffer: true, inBuffer: true, inCrm: false, assigned: false,
          stage: "buffer", status: "Lost", reason: "Lead found in Buffer but missing from CRM (Gap 2)",
        });
      }
    }
  });
  return records;
}''', code, flags=re.DOTALL
)

# Replace the inner loop logic
code = re.sub(
    r'const bufDay = bufferData.get\(date\).*?const assigned = kserve \+ sales;',
    '''const bufSet = bufferData.get(date) || new Set();
          const crmSet = crmData.get(date) || new Set();
          const kvSet = kserveData.get(date) || new Set();
          const sSet = salesData.get(date) || new Set();

          const direct = leadIds.length;
          const duplicate = detectDuplicates(mobiles);
          
          let buffer = 0, crm = 0, kserve = 0, sales = 0;
          const directUnique = new Set(mobiles.map(normMobile).filter(Boolean));
          
          for (const m of Array.from(directUnique)) {
             if (bufSet.has(m)) buffer++;
             if (crmSet.has(m)) crm++;
             if (kvSet.has(m)) kserve++;
             if (sSet.has(m)) sales++;
          }

          const medium = direct; 
          const expectedDuplicateGap = duplicate;
          const directMediumGap = 0; 
          const bufferTransfer = buffer;
          const mediumBufferLost = Math.max(0, direct - duplicate - buffer);
          const mediumBufferGap = mediumBufferLost;
          const sameDayCrm = crm;
          const lateTransfer = 0;
          const masterCrmLost = Math.max(0, buffer - crm);
          const bufferCrmGap = masterCrmLost;
          const bufferToCrmGap = masterCrmLost;
          const assigned = kserve + sales;''', code, flags=re.DOTALL
)

code = code.replace(
    'const lostRecords = buildLostRecords(\n            mobiles,\n            leadIds,\n            bufDay.mobiles,\n            srcCfg.source,\n            date,\n            co.company\n          );',
    'const lostRecords = buildLostRecords(mobiles, leadIds, bufSet, crmSet, srcCfg.source, date, co.company);'
)

with open('app/api/lead-loss/route.ts', 'w') as f:
    f.write(code)

