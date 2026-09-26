const fs = require('fs');
const file = 'lib/whatsapp-triggers/render.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace('// @ts-ignore — optional peer dep, only present in serverless environments', '// @ts-expect-error — optional peer dep, only present in serverless environments');

fs.writeFileSync(file, c);
console.log('Fixed ESLint in render.ts');
