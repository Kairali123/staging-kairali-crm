const fs = require('fs');
let code = fs.readFileSync('app/api/lead-loss/route.ts', 'utf8');

// Replace the query functions to return Sets instead of counts where needed
// Actually, it's easier to just do a string replace of the exact variables inside the inner loop.
// In 3d4216b, the queryBuffer, queryCRM etc return Map<string, { leadIds... }> 
// I will just modify the aggregation logic inside the loop!

code = code.replace(
`          const bufDay = bufferData.get(date) || { leadIds: [], mobiles: [], sources: [] };
          const crmDay = crmData.get(date) || { total: 0, leadIds: [] };
          const kserveDay = kserveData.get(date) || { total: 0, leadIds: [] };
          const salesDay = salesData.get(date) || 0;

          // Filter buffer by source
          const bufSrcMobiles = bufDay.mobiles.filter(
            (_, i) => bufDay.sources[i]?.toLowerCase() === srcCfg.source.toLowerCase()
          );

          const direct = leadIds.length;
          const medium = direct; // medium = direct (same lead, goes to medium sheet)
          const duplicate = detectDuplicates(mobiles);
          const expectedDuplicateGap = duplicate;
          const directMediumGap = 0; // Direct→Medium is usually trigger-based; gap detected via buffer
          const buffer = bufDay.leadIds.length;
          const bufferTransfer = buffer;
          const mediumBufferLost = Math.max(0, direct - duplicate - buffer);
          const mediumBufferGap = mediumBufferLost;
          const crm = crmDay.total;
          const sameDayCrm = crm;
          const lateTransfer = 0;
          const masterCrmLost = Math.max(0, buffer - crm);
          const bufferCrmGap = masterCrmLost;
          const bufferToCrmGap = masterCrmLost;
          const kserve = kserveDay.total;
          const sales = salesDay;
          const assigned = kserve + sales;

          // Build lost records for popup
          const lostRecords = buildLostRecords(
            mobiles,
            leadIds,
            bufDay.mobiles,
            srcCfg.source,
            date,
            co.company
          );`,
`          const bufDay = bufferData.get(date) || { leadIds: [], mobiles: [], sources: [] };
          const crmDay = crmData.get(date) || { total: 0, leadIds: [] };
          const kserveDay = kserveData.get(date) || { total: 0, leadIds: [] };
          const salesDay = salesData.get(date) || 0; // In 3d4216b this was just a number. Wait, we need it to be mobiles!
          
          // Actually, let's just implement the intersection dynamically here by assuming the queries returned sets of mobiles 
          // Wait, queryCRM returns leadIds, not mobiles in 3d4216b!
          // I have to replace the query signatures too. It's safer to just rewrite the whole file preserving the end structures.
`
)

