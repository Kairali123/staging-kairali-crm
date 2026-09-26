const fs = require('fs');
let code = fs.readFileSync('app/api/lead-loss/route.ts', 'utf8');

code = code.replace(
  /: Promise<Map<string, { leadIds: string\[\]; mobiles: string\[\]; sources: string\[\] }>>/g,
  ''
);
code = code.replace(
  /: Promise<Map<string, { total: number; leadIds: string\[\] }>>/g,
  ''
);
code = code.replace(
  /: Promise<Map<string, number>>/g,
  ''
);

fs.writeFileSync('app/api/lead-loss/route.ts', code);
