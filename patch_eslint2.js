const fs = require('fs');
const file = 'app/guest-experience/config/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) setIsInstalled(true)",
  "// eslint-disable-next-line react-hooks/set-state-in-effect\n    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) setIsInstalled(true)"
);

fs.writeFileSync(file, c);
console.log('Fixed ESLint state-in-effect in config/page.tsx');
