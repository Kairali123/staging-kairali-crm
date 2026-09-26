const fs = require('fs');

['app/guest-experience/page.tsx', 'app/guest-experience-light/page.tsx'].forEach(file => {
  let c = fs.readFileSync(file, 'utf8');

  const configBlock = `  // Kiosk config state — fetched from admin config page
  const [kioskConfig, setKioskConfig] = useState<{
    guestName: string; roomNumber: string; welcomeMessage: string;
    enabledSlides: number[]; defaultLanguage: string; activeTheme: string; kioskLabel: string;
  } | null>(null)
  const [langManuallySet, setLangManuallySet] = useState(false)

  const fetchKioskConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/guest-experience/config")
      const data = await res.json()
      setKioskConfig(data)
      if (!langManuallySet && data.defaultLanguage && data.defaultLanguage in LANGUAGES) {
        setLang(data.defaultLanguage as keyof typeof LANGUAGES)
      }
    } catch {}
  }, [langManuallySet])

  useEffect(() => {
    fetchKioskConfig()
    const interval = setInterval(fetchKioskConfig, 60000)
    return () => clearInterval(interval)
  }, [fetchKioskConfig])

`;

  const componentStart = 'export default function GuestWelcomePage() {\n';
  
  if (c.includes(componentStart)) {
    c = c.replace(componentStart, componentStart + configBlock);
    fs.writeFileSync(file, c);
    console.log('Restored config in ' + file);
  } else {
    console.log('Component start not found in ' + file);
  }
});
