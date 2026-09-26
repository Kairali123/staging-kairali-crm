"use client"

import { Card, CardContent } from "@/components/ui/card"
import { QrCode, Play, MessageSquare, Volume2, Globe, Star, Clock, Smile } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

import { LANGUAGES, TRANSLATIONS, SLIDES, KAIRALI_IMAGES, KAIRALI_VIDEOS, Lang, WIDGET_DATA, getLegacy, getAwards } from "./data"

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE WIDGETS — one unique interactive element per slide
// ─────────────────────────────────────────────────────────────────────────────


// Slide 1 — Live luxury clock & Welcome
function SlideWidgetClock({ lang }: { lang: Lang }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const localeMap: Partial<Record<Lang, string>> = { EN: "en-IN", HI: "hi-IN", ML: "ml-IN", DE: "de-DE", RU: "ru-RU", FR: "fr-FR", NL: "nl-NL", ES: "es-ES", AR: "ar-AE", ZH: "zh-CN" }
  const locale = localeMap[lang] || "en-IN"
  const hours = time.toLocaleTimeString(locale, { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true })
  const date  = time.toLocaleDateString(locale, { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" })
  const w = WIDGET_DATA.clock[lang] || WIDGET_DATA.clock.EN
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full">
      <div className="flex flex-col px-8 py-5 rounded-3xl bg-amber-50 border border-amber-200 shadow-md">
        <span className="text-[#C74B26] text-4xl md:text-5xl font-serif tracking-widest leading-none">{hours}</span>
        <span className="text-[#50725D] text-xs tracking-[0.2em] uppercase mt-2 font-medium">{date}</span>
      </div>
      <div className="flex flex-col gap-4 pl-2 sm:pl-0 sm:border-l sm:border-[#E6E2D3] sm:pl-6 py-2">
        <div className="flex items-center gap-3 text-[#264531] text-sm md:text-base font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
          {w.rec}
        </div>
        <div className="flex items-center gap-3 text-[#264531] text-sm md:text-base font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
          {w.doc}
        </div>
      </div>
    </motion.div>
  )
}

// Slide 2 — Explore Treatments & NABH Badge
const TREATMENTS_I18N: Partial<Record<Lang, { icon: string; label: string; desc: string }[]>> = {
  EN: [
    { icon: "💆", label: "Abhyangam",   desc: "Warm medicated oil massage" },
    { icon: "🫗", label: "Shirodhara",  desc: "Continuous oil flow therapy" },
    { icon: "🌿", label: "Panchakarma", desc: "Complete detox & purification" },
    { icon: "🍃", label: "Elakizhi",    desc: "Herbal pouch fomentation" },
  ],
  HI: [
    { icon: "💆", label: "अभ्यंगम",   desc: "गर्म औषधीय तेल मालिश" },
    { icon: "🫗", label: "शिरोधारा",  desc: "सतत तेल प्रवाह चिकित्सा" },
    { icon: "🌿", label: "पंचकर्म",   desc: "संपूर्ण डिटॉक्स और शुद्धि" },
    { icon: "🍃", label: "इलाकिझी",   desc: "हर्बल पाउच किझी" },
  ],
  DE: [
    { icon: "💆", label: "Abhyangam",   desc: "Warme medizinische Ölmassage" },
    { icon: "🫗", label: "Shirodhara",  desc: "Kontinuierlicher Ölguss" },
    { icon: "🌿", label: "Panchakarma", desc: "Komplette Entgiftung & Reinigung" },
    { icon: "🍃", label: "Elakizhi",    desc: "Kräuterstempelmassage" },
  ],
  RU: [
    { icon: "💆", label: "Абхьянгам",  desc: "Массаж тёплым лечебным маслом" },
    { icon: "🫗", label: "Широдхара",  desc: "Непрерывный поток масла" },
    { icon: "🌿", label: "Панчакарма", desc: "Полный детокс и очищение" },
    { icon: "🍃", label: "Элакижи",    desc: "Массаж травяными мешочками" },
  ],
}
const W2_BADGE: Partial<Record<Lang, string>> = { EN: "Accredited Hospital", HI: "प्रमाणित अस्पताल", ML: "അംഗീകൃത ആശുപത്രി", DE: "Akkreditiertes Krankenhaus", RU: "Аккредитованная больница", FR: "Hôpital Accrédité", NL: "Geaccrediteerd", ES: "Acreditado", AR: "معتمد", ZH: "认证" }
const W2_TITLE: Partial<Record<Lang, string>> = { EN: "✦ Explore Clinical Treatments", HI: "✦ नैदानिक उपचार देखें", ML: "✦ ക്ലിനിക്കൽ ചികിത്സ", DE: "✦ Klinische Behandlungen", RU: "✦ Клинические процедуры", FR: "✦ Traitements Cliniques", NL: "✦ Klinische Behandelingen", ES: "✦ Tratamientos", AR: "✦ العلاجات", ZH: "✦ 临床治疗" }

function SlideWidgetTreatments({ lang }: { lang: Lang }) {
  const list = TREATMENTS_I18N[lang] || TREATMENTS_I18N.EN!
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <div className="px-4 py-1.5 rounded-full bg-red-50 border border-red-300 flex items-center gap-2 shadow-sm">
          <span className="text-red-600 font-bold text-sm tracking-wide">NABH</span>
          <span className="w-1 h-1 bg-red-400 rounded-full"></span>
          <span className="text-[#264531] text-xs uppercase tracking-widest font-medium">{W2_BADGE[lang] || W2_BADGE.EN}</span>
        </div>
      </div>
      <p className="text-[#C74B26] text-xs tracking-[0.25em] uppercase font-bold mb-4">{W2_TITLE[lang] || W2_TITLE.EN}</p>
      <div className="grid grid-cols-2 gap-3">
        {list.map((item) => (
          <div key={item.label} className="flex flex-col text-left px-5 py-4 rounded-2xl border bg-white border-[#E6E2D3] shadow-sm">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl drop-shadow-md">{item.icon}</span>
              <span className="text-sm md:text-base font-semibold text-[#18311F]">{item.label}</span>
            </div>
            <span className="text-xs text-[#708F7D]">{item.desc}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// Slide 3 — Villa Stats
const VILLA_STATS_I18N: Partial<Record<Lang, { icon: string; value: string; unit: string; label: string }[]>> = {
  EN: [
    { icon: "🌴", value: "60",  unit: "Acres",   label: "Organic Nature" },
    { icon: "🏡", value: "30",  unit: "Villas",  label: "Vastu Architecture" },
    { icon: "⭐", value: "26+", unit: "Years",   label: "Legacy of Healing" },
    { icon: "👨‍⚕️", value: "12",  unit: "Doctors", label: "Expert Physicians" },
  ],
  HI: [
    { icon: "🌴", value: "60",  unit: "एकड़",    label: "जैविक प्रकृति" },
    { icon: "🏡", value: "30",  unit: "विला",    label: "वास्तु वास्तुकला" },
    { icon: "⭐", value: "26+", unit: "वर्ष",    label: "उपचार की विरासत" },
    { icon: "👨‍⚕️", value: "12",  unit: "डॉक्टर",  label: "विशेषज्ञ चिकित्सक" },
  ],
  DE: [
    { icon: "🌴", value: "60",  unit: "Morgen",  label: "Bio-Natur" },
    { icon: "🏡", value: "30",  unit: "Villen",  label: "Vastu Architektur" },
    { icon: "⭐", value: "26+", unit: "Jahre",   label: "Heilerbe" },
    { icon: "👨‍⚕️", value: "12",  unit: "Ärzte",   label: "Fachärzte" },
  ],
  RU: [
    { icon: "🌴", value: "60",  unit: "Акров",   label: "Органическая природа" },
    { icon: "🏡", value: "30",  unit: "Вилл",    label: "Архитектура Васту" },
    { icon: "⭐", value: "26+", unit: "Лет",     label: "Наследие исцеления" },
    { icon: "👨‍⚕️", value: "12",  unit: "Врачей",  label: "Опытные врачи" },
  ],
}
const W3_TITLE: Partial<Record<Lang, string>> = { EN: "✦ The Healing Village at a Glance", HI: "✦ हीलिंग विलेज एक नज़र में", ML: "✦ ഹീലിംഗ് വില്ലേജ്", DE: "✦ Das Heilungsdorf", RU: "✦ Деревня исцеления", FR: "✦ Le Village de Guérison", NL: "✦ Het Genezingsdorp", ES: "✦ El Pueblo de Sanación", AR: "✦ قرية الشفاء", ZH: "✦ 疗愈村一览" }

function SlideWidgetVillaStats({ lang }: { lang: Lang }) {
  const list = VILLA_STATS_I18N[lang] || VILLA_STATS_I18N.EN!
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full">
      <p className="text-[#C74B26] text-xs tracking-[0.25em] uppercase font-bold mb-4">{W3_TITLE[lang] || W3_TITLE.EN}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {list.map((s) => (
          <div key={s.label} className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white border border-[#E6E2D3] shadow-md">
            <span className="text-2xl mb-2">{s.icon}</span>
            <span className="text-[#0C1F12] text-2xl md:text-3xl font-serif font-bold">{s.value}</span>
            <span className="text-[#C74B26] text-[10px] font-bold tracking-widest uppercase mt-1 text-center">{s.unit}</span>
            <span className="text-[#708F7D] text-[10px] mt-1 text-center leading-tight">{s.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// Slide 4 — Cuisine & Dietary tags
const CUISINE_I18N: Partial<Record<Lang, { spec: string; meal: string; desc: string; tags: string[] }>> = {
  EN: { spec: "Chef's Special", meal: "Moong Dal Khichdi & Buttermilk", desc: "Today's Ayurvedic recommendation for optimal digestion.", tags: ["Sattvic Diet","Farm to Table","Gluten-Free","Vata Balancing","Pitta Calming"] },
  HI: { spec: "शेफ की विशेष पेशकश", meal: "मूंग दाल खिचड़ी और छाछ", desc: "इष्टतम पाचन के लिए आज की आयुर्वेदिक सिफारिश।", tags: ["सात्विक आहार","खेत से मेज","ग्लूटेन मुक्त","वात संतुलन","पित्त शांति"] },
  DE: { spec: "Spezialität des Küchenchefs", meal: "Moong Dal Khichdi & Buttermilch", desc: "Heutige ayurvedische Empfehlung für optimale Verdauung.", tags: ["Sattvische Ernährung","Farm to Table","Glutenfrei","Vata Ausgleich","Pitta Beruhigend"] },
  RU: { spec: "Спецпредложение шеф-повара", meal: "Мунг Дал Кхичди и Пахта", desc: "Сегодняшняя аюрведическая рекомендация для пищеварения.", tags: ["Саттвическая диета","С фермы на стол","Без глютена","Баланс Ваты","Успокоение Питты"] },
}
function SlideWidgetCuisine({ lang }: { lang: Lang }) {
  const c = CUISINE_I18N[lang] || CUISINE_I18N.EN!
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full">
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 mb-5 shadow-md">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/40 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl border border-amber-200">🍲</div>
          <div className="flex-1">
            <p className="text-[#C74B26] text-[10px] tracking-[0.2em] uppercase font-bold mb-1">{c.spec}</p>
            <p className="text-[#0C1F12] font-serif text-xl md:text-2xl leading-tight mb-2">{c.meal}</p>
            <p className="text-[#365942] text-sm">{c.desc}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {c.tags.map((tag) => (
          <span key={tag} className="px-4 py-1.5 rounded-full bg-green-50 border border-green-300 text-green-700 text-xs font-semibold tracking-wide shadow-sm">
            🌿 {tag}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

// Slide 5 — Quick Service Actions
const ACTIONS_I18N: Partial<Record<Lang, { title: string; items: { icon: string; label: string; sub: string }[] }>> = {
  EN: { title: "✦ Guest Services", items: [
    { icon: "📞", label: "Reception",    sub: "Dial 9" },
    { icon: "🤖", label: "Ask AI",       sub: "Available 24/7" },
    { icon: "🛏️", label: "Housekeeping", sub: "Request Service" },
    { icon: "🚗", label: "Transfers",    sub: "Book a Cab" },
  ]},
  HI: { title: "✦ अतिथि सेवाएँ", items: [
    { icon: "📞", label: "रिसेप्शन",     sub: "डायल 9" },
    { icon: "🤖", label: "AI से पूछें",   sub: "24/7 उपलब्ध" },
    { icon: "🛏️", label: "हाउसकीपिंग",  sub: "सेवा अनुरोध" },
    { icon: "🚗", label: "स्थानांतरण",   sub: "कैब बुक करें" },
  ]},
  DE: { title: "✦ Gästeservice", items: [
    { icon: "📞", label: "Rezeption",    sub: "Wählen Sie 9" },
    { icon: "🤖", label: "KI Fragen",    sub: "24/7 Verfügbar" },
    { icon: "🛏️", label: "Zimmerdienst", sub: "Service anfordern" },
    { icon: "🚗", label: "Transfers",    sub: "Taxi buchen" },
  ]},
  RU: { title: "✦ Услуги для гостей", items: [
    { icon: "📞", label: "Ресепшн",      sub: "Наберите 9" },
    { icon: "🤖", label: "Спросить AI",  sub: "Доступно 24/7" },
    { icon: "🛏️", label: "Уборка",       sub: "Запросить услугу" },
    { icon: "🚗", label: "Трансферы",    sub: "Заказать такси" },
  ]},
}
const ACTION_COLORS = [
  { color: "from-sky-50 to-blue-50",     border: "border-sky-200" },
  { color: "from-amber-50 to-yellow-50",   border: "border-amber-200" },
  { color: "from-violet-50 to-purple-50",  border: "border-violet-200" },
  { color: "from-emerald-50 to-green-50", border: "border-emerald-200" },
]

function SlideWidgetLegacy({ lang }: { lang: Lang }) {
  const items = getLegacy(lang)
  return (
    <div className="flex flex-col gap-4">
      {items.map((item: { title: string; desc: string }, idx: number) => (
        <div key={idx} className="flex items-center gap-4 bg-stone-50 border border-[#E6E2D3] rounded-xl p-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-[#D95D39]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[#0C1F12] font-bold text-sm">{item.title}</span>
            <span className="text-[#50725D] text-xs">{item.desc}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function SlideWidgetAwards({ lang }: { lang: Lang }) {
  const items = getAwards(lang)
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item: { title: string; desc: string }, idx: number) => (
        <div key={idx} className="flex flex-col items-center text-center gap-2 bg-white border border-[#E6E2D3] rounded-xl p-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <Star className="w-6 h-6 text-[#D95D39]" />
          </div>
          <span className="text-[#C74B26] font-bold text-sm mt-2 leading-tight">{item.title}</span>
          <span className="text-[#50725D] text-xs leading-tight">{item.desc}</span>
        </div>
      ))}
    </div>
  )
}

function SlideWidgetActions({ lang }: { lang: Lang }) {
  const { title, items } = ACTIONS_I18N[lang] || ACTIONS_I18N.EN!
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full">
      <p className="text-[#C74B26] text-xs tracking-[0.25em] uppercase font-bold mb-4">{title}</p>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {items.map((a, i) => (
          <div key={a.label} className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br ${ACTION_COLORS[i].color} border ${ACTION_COLORS[i].border} shadow-md`}>
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shadow-sm">{a.icon}</div>
            <div className="flex flex-col text-left">
              <span className="text-[#18311F] text-sm md:text-base font-bold tracking-wide">{a.label}</span>
              <span className="text-[#708F7D] text-xs mt-0.5">{a.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function GuestWelcomePage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [lang, setLang] = useState<keyof typeof LANGUAGES>("EN")
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setDeferredPrompt(null)
    } else {
      // Fallback for iOS/Safari
      alert("To install on iPad/iPhone: Tap the 'Share' icon at the top/bottom of Safari, then select 'Add to Home Screen'.")
    }
  }

  const t = TRANSLATIONS[lang]
  const ACTIVE_SLIDES = SLIDES.filter(s => kioskConfig?.enabledSlides ? kioskConfig.enabledSlides.includes(s.id) : true)
  const baseSlide = ACTIVE_SLIDES[currentSlideIndex] || SLIDES[0]
  const currentSlide = {
    ...baseSlide,
    title: kioskConfig?.slideOverrides?.[baseSlide.id]?.title || baseSlide.title,
    subtitle: kioskConfig?.slideOverrides?.[baseSlide.id]?.subtitle || baseSlide.subtitle,
  }

  const nextSlide = useCallback(() => {
    setIsPlaying(false)
    setCurrentSlideIndex((prev) => (prev + 1) % ACTIVE_SLIDES.length)
  }, [ACTIVE_SLIDES.length])

  const prevSlide = useCallback(() => {
    setIsPlaying(false)
    setCurrentSlideIndex((prev) => (prev - 1 + ACTIVE_SLIDES.length) % ACTIVE_SLIDES.length)
  }, [ACTIVE_SLIDES.length])

  // Kiosk config state — fetched from admin config page
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

  // Reset video when slide changes
  useEffect(() => {
    setIsPlaying(false)
  }, [currentSlideIndex])

  // Auto-advance every 30s (paused while video plays)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPlaying) nextSlide()
    }, 30000)
    return () => clearInterval(timer)
  }, [isPlaying, nextSlide])

  // Close language menu on outside click
  useEffect(() => {
    const handler = () => setShowLangMenu(false)
    if (showLangMenu) window.addEventListener("click", handler)
    return () => window.removeEventListener("click", handler)
  }, [showLangMenu])

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const diff = touchStartX - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      diff > 0 ? nextSlide() : prevSlide()
    }
    setTouchStartX(null)
  }

  return (
    <div
      className="fixed inset-0 flex flex-col h-[100dvh] w-screen bg-stone-100 overflow-hidden font-sans select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* Background Crossfade & Slow Zoom */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentSlide.id}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: 1.1 }}
          exit={{ opacity: 0 }}
          transition={{ 
            opacity: { duration: 1.5, ease: "easeInOut" },
            scale: { duration: 35, ease: "linear" } 
          }}
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${currentSlide.image}')` }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#F4F1E1]/95 via-[#F4F1E1]/75 to-[#F4F1E1]/40" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#F4F1E1]/80 via-transparent to-[#F4F1E1]/30" />

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="relative z-[100] p-5 md:px-12 md:py-8 flex justify-between items-center w-full max-w-[1500px] mx-auto"
      >
        <div className="flex items-center gap-3">
          {/* Emblem */}
          <div className="w-10 h-10 md:w-12 md:h-12 border-2 border-amber-600 rounded-full flex items-center justify-center text-[#C74B26] font-serif font-bold text-lg md:text-xl bg-amber-50 shadow-lg shrink-0">
            K
          </div>
          {/* Brand name */}
          <div className="flex flex-col leading-none">
            <h1 className="font-serif text-[#0C1F12] text-base md:text-xl tracking-[0.12em] uppercase font-semibold">
              Kairali
            </h1>
            <p className="text-[#C74B26] text-[9px] md:text-[11px] tracking-[0.22em] uppercase font-light mt-0.5">
              The Ayurvedic Healing Village
            </p>
          </div>
        </div>

        {/* ── Language Switcher ── */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowLangMenu(!showLangMenu); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-amber-300 bg-white hover:bg-amber-50 text-xs text-[#18311F] tracking-[0.15em] uppercase shadow-sm transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-[#D95D39]" />
            {LANGUAGES[lang].code}
          </button>

          <AnimatePresence>
            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 z-50 bg-white border border-[#E6E2D3] rounded-2xl overflow-hidden shadow-2xl w-40"
              >
                {Object.entries(LANGUAGES).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={(e) => { e.stopPropagation(); setLang(key as keyof typeof LANGUAGES); setShowLangMenu(false); setLangManuallySet(true) }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${lang === key ? "bg-amber-100 text-[#C74B26] font-semibold" : "text-[#365942] hover:bg-stone-100 hover:text-[#0C1F12]"}`}
                  >
                    <span className="text-xs tracking-widest font-bold opacity-60">{val.code}</span>
                    <span>{val.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* ── Main Content (Strict iPad Fit) ─────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row px-6 md:px-10 lg:px-20 items-center justify-between w-full max-w-[1500px] mx-auto h-full min-h-0 overflow-hidden gap-10">

        {/* Left – Slide Text & Subtitle */}
        <div className="flex-1 flex flex-col w-full max-w-2xl h-auto lg:h-full pt-10 lg:pt-0 pb-10 lg:overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="my-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentSlide.id}-${lang}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="flex flex-col"
            >
              <h2 className="text-4xl md:text-5xl lg:text-[4.5rem] font-serif text-[#0C1F12] mb-5 leading-[1.1] tracking-tight drop-shadow-sm">
                {currentSlide.title[lang]} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
                  {currentSlide.highlight[lang]}
                </span>
              </h2>
              <p className="text-lg md:text-xl lg:text-2xl text-[#365942] font-light max-w-xl leading-relaxed">
                {currentSlide.subtitle[lang]}
              </p>
            </motion.div>
          </AnimatePresence>
          </div>
        </div>

        {/* ── Right Side Variations (Unified Premium Cards) ────────────────── */}
        <div className="w-full lg:w-[460px] shrink-0 z-20 flex flex-col h-auto lg:h-full min-h-0 pb-10 lg:overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="my-auto w-full">
          <AnimatePresence mode="wait">

            {/* Slide 1: Clock & Video */}
            {currentSlide.id === 1 && (
              <motion.div
                key="slide-1-right"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col gap-5 w-full"
              >
                <Card className="border-0 bg-[#FDFBF7]/90 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-[#E6E2D3] p-6 md:p-8">
                  <SlideWidgetClock lang={lang} />
                </Card>

                {currentSlide.showVideo && (
                  <div className="w-full relative overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-white/10">
                    <div className="aspect-video bg-black relative">
                      {!isPlaying ? (
                        <>
                          <img
                            src={`https://img.youtube.com/vi/${currentSlide.videoId}/maxresdefault.jpg`}
                            alt="Welcome Video"
                            className="w-full h-full object-cover opacity-80"
                          />
                          <div className="absolute inset-0 bg-black/40" />
                          <button
                            onClick={() => setIsPlaying(true)}
                            className="absolute inset-0 flex items-center justify-center group"
                          >
                            <div className="w-16 h-16 rounded-full bg-amber-500/90 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-all shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                              <Play className="w-8 h-8 text-black ml-1" />
                            </div>
                          </button>
                        </>
                      ) : (
                        <>
                          <iframe
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${currentSlide.videoId}?start=${currentSlide.videoStart}&autoplay=1&mute=0&rel=0&modestbranding=1&showinfo=0`}
                            allowFullScreen
                          />
                          <button
                            onClick={() => setIsPlaying(false)}
                            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-black/70"
                          >
                            <Volume2 className="w-4 h-4 text-[#D95D39]" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Slide 2: Treatments */}
            {currentSlide.id === 2 && (
              <motion.div
                key="slide-2-right"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.8 }}
                className="w-full"
              >
                <Card className="border-0 bg-[#FDFBF7]/90 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-[#E6E2D3] p-6 md:p-8">
                  <SlideWidgetTreatments lang={lang} />
                </Card>
              </motion.div>
            )}

            {/* Slide 3: Villas & Resort Tour */}
            {currentSlide.id === 3 && (
              <motion.div
                key="slide-3-right"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col gap-5 w-full"
              >
                {currentSlide.showVideo && (
                  <div className="w-full relative overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-white/10">
                    <div className="aspect-[16/10] bg-black relative">
                      {!isPlaying ? (
                        <>
                          <img
                            src={`https://img.youtube.com/vi/${currentSlide.videoId}/maxresdefault.jpg`}
                            alt="Tour Video"
                            className="w-full h-full object-cover opacity-90"
                          />
                          <div className="absolute inset-0 bg-black/30" />
                          <button
                            onClick={() => setIsPlaying(true)}
                            className="absolute inset-0 flex items-center justify-center group"
                          >
                            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 transition-all shadow-2xl">
                              <Play className="w-8 h-8 text-white ml-1 drop-shadow-md" />
                            </div>
                          </button>
                          <div className="absolute bottom-6 left-6">
                            <p className="text-white text-lg font-serif">Virtual Resort Tour</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <iframe
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${currentSlide.videoId}?start=${currentSlide.videoStart}&autoplay=1&mute=0&rel=0&modestbranding=1&showinfo=0`}
                            allowFullScreen
                          />
                          <button
                            onClick={() => setIsPlaying(false)}
                            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-black/90"
                          >
                            <Volume2 className="w-5 h-5 text-white" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <Card className="border-0 bg-[#FDFBF7]/90 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-[#E6E2D3] p-6">
                  <SlideWidgetVillaStats lang={lang} />
                </Card>
              </motion.div>
            )}

            {/* Slide 4: Cuisine */}
            {currentSlide.id === 4 && (
              <motion.div
                key="slide-4-right"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.8 }}
                className="w-full"
              >
                <Card className="border-0 bg-[#FDFBF7]/90 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-[#E6E2D3] p-6 md:p-8">
                  <SlideWidgetCuisine lang={lang} />
                </Card>
              </motion.div>
            )}

            {/* Slide 5: Service & Feedback */}
            {currentSlide.id === 5 && (
              <motion.div
                key="slide-5-right"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col gap-5 w-full"
              >
                <Card className="border-0 bg-[#FDFBF7]/90 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-[#E6E2D3] p-4 md:p-5">
                  <SlideWidgetActions lang={lang} />
                </Card>

                <Card className="border-0 bg-[#FDFBF7]/90 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-[#E6E2D3] p-4 md:p-5">
                  <div className="mb-3">
                    <h3 className="font-serif text-[#0C1F12] text-2xl tracking-wide">
                      {t.feedback_title}
                    </h3>
                    <p className="text-[#50725D] text-sm mt-1">{t.feedback_sub}</p>
                  </div>

                  {/* Static Star Rating (No Click) */}
                  <div className="flex items-center gap-2 mb-6 opacity-50">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-7 h-7 text-[#D95D39]/50" />
                    ))}
                  </div>

                  <Link href="/guest-experience-light/feedback" className="block w-full mb-5">
                    <button className="w-full h-12 rounded-2xl bg-[#D95D39] hover:bg-[#C74B26] text-white font-semibold text-sm flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(217,119,6,0.3)] transition-all">
                      <MessageSquare className="w-4 h-4" />
                      {t.btn_feedback}
                    </button>
                  </Link>

                  <div className="flex flex-col gap-2 pt-4 border-t border-[#E6E2D3]">
                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-amber-500/50" />
                      <span className="text-[#50725D] text-sm font-medium">{t.btn_rate}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Smile className="w-4 h-4 text-amber-500/50" />
                      <span className="text-[#50725D] text-sm font-medium">{t.btn_request}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Slide 6: Legacy — Kairali Group */}
            {currentSlide.id === 6 && (
              <motion.div
                key="slide-6-right"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.8 }}
                className="w-full"
              >
                <Card className="border-0 bg-[#FDFBF7]/90 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-[#E6E2D3] p-6 md:p-8">
                  <SlideWidgetLegacy lang={lang as Lang} />
                </Card>
              </motion.div>
            )}

            {/* Slide 7: Awards & CSR */}
            {currentSlide.id === 7 && (
              <motion.div
                key="slide-7-right"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.8 }}
                className="w-full"
              >
                <Card className="border-0 bg-[#FDFBF7]/90 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-[#E6E2D3] p-6 md:p-8">
                  <SlideWidgetAwards lang={lang as Lang} />
                </Card>
              </motion.div>
            )}

            {/* Slide 8: Service & Feedback */}
            {currentSlide.id === 8 && (
              <motion.div
                key="slide-8-right"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.8 }}
                className="flex flex-col gap-3 w-full"
              >
                <Card className="border-0 bg-[#FDFBF7]/90 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-[#E6E2D3] p-4 md:p-5">
                  <SlideWidgetActions lang={lang as Lang} />
                </Card>
                <Card className="border-0 bg-[#FDFBF7]/90 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-[#E6E2D3] p-4 md:p-5">
                  <div className="mb-3">
                    <h3 className="font-serif text-[#0C1F12] text-2xl tracking-wide">{t.feedback_title}</h3>
                    <p className="text-[#50725D] text-sm mt-1">{t.feedback_sub}</p>
                  </div>
                  <div className="flex items-center gap-2 mb-6 opacity-50">
                    {[1,2,3,4,5].map((s) => <Star key={s} className="w-7 h-7 text-[#D95D39]/50" />)}
                  </div>
                  <Link href="/guest-experience-light/feedback" className="block w-full mb-5">
                    <button className="w-full h-12 rounded-2xl bg-[#D95D39] hover:bg-[#C74B26] text-white font-semibold text-sm flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(217,119,6,0.3)] transition-all">
                      <MessageSquare className="w-4 h-4" />
                      {t.btn_feedback}
                    </button>
                  </Link>
                  <div className="flex flex-col gap-2 pt-4 border-t border-[#E6E2D3]">
                    <div className="flex items-center gap-3"><Star className="w-4 h-4 text-amber-500/50" /><span className="text-[#50725D] text-sm font-medium">{t.btn_rate}</span></div>
                    <div className="flex items-center gap-3"><Smile className="w-4 h-4 text-amber-500/50" /><span className="text-[#50725D] text-sm font-medium">{t.btn_request}</span></div>
                  </div>
                </Card>
              </motion.div>
            )}

          </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Slide Navigation: ← Dots → ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="relative z-10 p-5 md:px-10 lg:px-20 pb-8 flex items-center justify-between w-full max-w-[1500px] mx-auto"
      >
        {/* Left: Slide Controls */}
        <div className="flex items-center gap-5">
          {/* ← Prev */}
          <button
            onClick={prevSlide}
            aria-label="Previous slide"
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white hover:bg-amber-50 border border-[#D9D3C1] hover:border-amber-400 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm"
          >
            <svg className="w-4 h-4 text-[#365942]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Dots */}
          <div className="flex items-center gap-3">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { setIsPlaying(false); setCurrentSlideIndex(idx) }}
                className={`transition-all duration-500 rounded-full ${
                  idx === currentSlideIndex
                    ? "w-8 h-2 bg-[#D95D39] shadow-md"
                    : "w-2 h-2 bg-stone-300 hover:bg-amber-400"
                }`}
                aria-label={`${t.slide_controls} ${idx + 1}`}
              />
            ))}
          </div>

          {/* → Next */}
          <button
            onClick={nextSlide}
            aria-label="Next slide"
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white hover:bg-amber-50 border border-[#D9D3C1] hover:border-amber-400 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm"
          >
            <svg className="w-4 h-4 text-[#365942]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Slide counter */}
          <div className="ml-2 flex items-center gap-4 hidden md:flex">
            <span className="text-[#708F7D] text-xs tracking-widest font-medium">
              {currentSlideIndex + 1} / {ACTIVE_SLIDES.length}
            </span>
            <span className="text-[#708F7D] text-[10px] tracking-[0.2em] uppercase px-3 py-1 border border-[#E6E2D3] rounded-full animate-pulse">
              Swipe to Explore
            </span>
            
            
          </div>
        </div>

        {/* Right: Riya Sharma QR Badge */}
        <div className="hidden md:flex items-center gap-5 bg-white border border-[#E6E2D3] rounded-3xl p-4 shadow-lg max-w-[440px]">
          <div className="relative shrink-0 rounded-2xl bg-stone-100 p-1.5 shadow-sm">
            <img src={KAIRALI_IMAGES.riyaQr} alt="Riya Sharma QR" className="w-20 h-20 md:w-24 md:h-24 object-contain rounded-xl" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
              <span className="text-[#C74B26] font-bold text-sm md:text-base tracking-wide">Riya Sharma / AI</span>
            </div>
            <span className="text-[#365942] text-[11px] md:text-xs leading-relaxed">
              Scan to report room or service concerns instantly. Get priority attention & faster resolution.
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
