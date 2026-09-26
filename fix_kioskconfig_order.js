const fs = require('fs');

['app/guest-experience/page.tsx', 'app/guest-experience-light/page.tsx'].forEach(file => {
  let c = fs.readFileSync(file, 'utf8');

  // Extract the kioskConfig declaration block
  const configBlockRegex = /  \/\/ Kiosk config state — fetched from admin config page\n  const \[kioskConfig, setKioskConfig\] = useState[\s\S]*?}, \[langManuallySet\]\)\n\n  useEffect\(\(\) => \{\n    fetchKioskConfig\(\)\n    const interval = setInterval\(fetchKioskConfig, 60000\)\n    return \(\) => clearInterval\(interval\)\n  \}, \[fetchKioskConfig\]\)\n\n/g;
  
  const match = c.match(configBlockRegex);
  if (match) {
    const configBlock = match[0];
    c = c.replace(configBlock, '');
    
    // Inject it at the top of the component
    const componentStart = 'export default function GuestExperienceApp() {\n';
    c = c.replace(componentStart, componentStart + configBlock);
    
    fs.writeFileSync(file, c);
    console.log('Fixed order in ' + file);
  } else {
    console.log('Block not found in ' + file);
  }
});
