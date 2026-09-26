const fs = require('fs');
const file = 'app/api/lead-loss/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace the source-agnostic buffer/crm counts with source-filtered counts
// Or intersection with direct mobiles
code = code.replace(
  "const buffer = bufDay.leadIds.length;",
  `// Intersection of direct mobiles with buffer mobiles for accuracy
          const directMobilesSet = new Set(mobiles.map(normMobile).filter(Boolean));
          let buffer = 0;
          for (let i = 0; i < bufDay.mobiles.length; i++) {
             // either the source matches EXACTLY, or the mobile is in the direct set
             const m = bufDay.mobiles[i];
             const srcMatch = bufDay.sources[i]?.toLowerCase().includes(srcCfg.source.toLowerCase());
             if (srcMatch || (m && directMobilesSet.has(m))) buffer++;
          }`
);

// wait, if I count intersection + srcMatch, I might double count if I iterate all bufDay.mobiles for multiple sources!
// Better: 
