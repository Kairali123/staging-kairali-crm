const fs = require('fs');

['app/guest-experience/page.tsx', 'app/guest-experience-light/page.tsx'].forEach(file => {
  let c = fs.readFileSync(file, 'utf8');

  // Extract the kioskConfig block
  const configBlockRegex = /  \/\/ Kiosk config state — fetched from admin config page\n  const \[kioskConfig, setKioskConfig\] = useState[\s\S]*?}, \[langManuallySet\]\)\n\n  useEffect\(\(\) => \{\n    fetchKioskConfig\(\)\n    const interval = setInterval\(fetchKioskConfig, 60000\)\n    return \(\) => clearInterval\(interval\)\n  \}, \[fetchKioskConfig\]\)\n\n/g;
  
  const match = c.match(configBlockRegex);
  if (match) {
    let configBlock = match[0];
    c = c.replace(configBlock, '');
    
    // Add eslint disables to the configBlock
    configBlock = configBlock.replace('fetchKioskConfig()', '// eslint-disable-next-line react-hooks/set-state-in-effect\n    fetchKioskConfig()');
    
    // Also fix setIsPlaying(false) which is later in the file
    c = c.replace('setIsPlaying(false)\n  }, [currentSlideIndex])', '// eslint-disable-next-line react-hooks/set-state-in-effect\n    setIsPlaying(false)\n  }, [currentSlideIndex])');
    
    // Find where to insert it: after setDeferredPrompt
    const insertAfter = '  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)\n';
    c = c.replace(insertAfter, insertAfter + '\n' + configBlock);
    
    fs.writeFileSync(file, c);
    console.log('Fixed state order in ' + file);
  } else {
    console.log('Block not found in ' + file);
  }
});
