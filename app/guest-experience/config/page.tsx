"use client"
import { useState, useEffect } from "react"
import {
  MonitorDown, CheckCircle2, User, BedDouble, Calendar, Settings2,
  Globe, LayoutGrid, Save, RefreshCw, Loader2, MessageSquare, Star,
  ChevronDown, ChevronUp, Smartphone, Info
} from "lucide-react"

const SLIDES_META = [
  { id: 1, label: "Welcome & Clock" },
  { id: 2, label: "Clinical Treatments (NABH)" },
  { id: 3, label: "Healing Villas" },
  { id: 4, label: "Ayurvedic Cuisine" },
  { id: 5, label: "Services & Feedback" },
  { id: 6, label: "115 Years Legacy & Group" },
  { id: 7, label: "Awards & CSR" },
  { id: 8, label: "Riya AI Services" },
]

const LANGUAGES = ["EN", "HI", "ML", "DE", "RU", "FR", "NL", "ES", "AR", "ZH"]
const LANG_LABELS: Record<string, string> = {
  EN: "English", HI: "हिन्दी", ML: "മലയാളം", DE: "Deutsch",
  RU: "Русский", FR: "Français", NL: "Nederlands", ES: "Español", AR: "العربية", ZH: "中文"
}

export default function GuestAppConfig() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>("guest")

  const [config, setConfig] = useState({
    guestName: "",
    roomNumber: "",
    checkIn: "",
    checkOut: "",
    welcomeMessage: "",
    activeTheme: "dark",
    enabledSlides: [1, 2, 3, 4, 5, 6, 7, 8],
    defaultLanguage: "EN",
    kioskLabel: "Reception Lobby",
    lastUpdated: "",
  })

  useEffect(() => {
    // PWA Install detection
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true)
    }
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)

    // Load config from API
    fetch("/api/guest-experience/config")
      .then(r => r.json())
      .then(data => { setConfig(data); setLoading(false) })
      .catch(() => setLoading(false))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') { setDeferredPrompt(null); setIsInstalled(true) }
    } else {
      alert("iPad/iPhone: Safari ▸ Share icon ▸ 'Add to Home Screen' — Kairali app icon will appear on your device.")
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/guest-experience/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    setSaving(false)
  }

  const toggleSlide = (id: number) => {
    setConfig(c => ({
      ...c,
      enabledSlides: c.enabledSlides.includes(id)
        ? c.enabledSlides.filter(s => s !== id)
        : [...c.enabledSlides, id].sort((a, b) => a - b)
    }))
  }

  const Section = ({ id, title, icon: Icon, children }: any) => (
    <div className="border border-[#E0D8C3] rounded-2xl overflow-hidden mb-4">
      <button
        onClick={() => setOpenSection(openSection === id ? null : id)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[#FDFBF7] hover:bg-[#F5F0E8] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-[#C74B26]" />
          <span className="font-semibold text-[#132A13]">{title}</span>
        </div>
        {openSection === id ? <ChevronUp className="w-4 h-4 text-[#4A5D4E]" /> : <ChevronDown className="w-4 h-4 text-[#4A5D4E]" />}
      </button>
      {openSection === id && (
        <div className="px-5 py-5 bg-white border-t border-[#E0D8C3] space-y-4">
          {children}
        </div>
      )}
    </div>
  )

  const Field = ({ label, children }: any) => (
    <div>
      <label className="block text-xs font-bold text-[#4A5D4E] uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  )

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-[#E0D8C3] bg-[#FDFBF7] text-[#132A13] text-sm focus:outline-none focus:border-[#C74B26] focus:ring-1 focus:ring-[#C74B26]/30 transition"

  if (loading) return (
    <div className="min-h-screen bg-[#F3F0E6] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#C74B26]" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F3F0E6] p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[#C74B26]/10 rounded-xl flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-[#C74B26]" />
            </div>
            <div>
              <h1 className="text-2xl font-serif text-[#132A13] font-bold">Guest Kiosk Config</h1>
              <p className="text-xs text-[#708F7D]">
                {config.lastUpdated ? `Last saved: ${new Date(config.lastUpdated).toLocaleString("en-IN")}` : "Not saved yet"}
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-700">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p>Changes saved here will reflect <strong>instantly</strong> on the Guest Experience app when it refreshes. The guest app auto-refreshes every 60 seconds.</p>
        </div>

        {/* 1. Guest Details */}
        <Section id="guest" title="Guest Assignment" icon={User}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Guest Name">
              <input className={inputCls} placeholder="e.g. Mr. Rajiv Mehta"
                value={config.guestName} onChange={e => setConfig(c => ({ ...c, guestName: e.target.value }))} />
            </Field>
            <Field label="Room Number">
              <input className={inputCls} placeholder="e.g. Villa 04"
                value={config.roomNumber} onChange={e => setConfig(c => ({ ...c, roomNumber: e.target.value }))} />
            </Field>
            <Field label="Check-in Date">
              <input type="date" className={inputCls}
                value={config.checkIn} onChange={e => setConfig(c => ({ ...c, checkIn: e.target.value }))} />
            </Field>
            <Field label="Check-out Date">
              <input type="date" className={inputCls}
                value={config.checkOut} onChange={e => setConfig(c => ({ ...c, checkOut: e.target.value }))} />
            </Field>
          </div>
          <Field label="Kiosk Location Label">
            <input className={inputCls} placeholder="e.g. Reception Lobby / Room 04 TV"
              value={config.kioskLabel} onChange={e => setConfig(c => ({ ...c, kioskLabel: e.target.value }))} />
          </Field>
          <Field label="Custom Welcome Message (optional)">
            <textarea rows={2} className={inputCls + " resize-none"} placeholder="e.g. Welcome to Kairali, Mr. Rajiv! Enjoy your healing journey."
              value={config.welcomeMessage} onChange={e => setConfig(c => ({ ...c, welcomeMessage: e.target.value }))} />
          </Field>
        </Section>

        {/* 2. Theme & Language */}
        <Section id="display" title="Display Settings" icon={Globe}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Active Theme">
              <select className={inputCls}
                value={config.activeTheme} onChange={e => setConfig(c => ({ ...c, activeTheme: e.target.value }))}>
                <option value="dark">Dark (Black Background)</option>
                <option value="light">Light (Earthy/Cream)</option>
              </select>
            </Field>
            <Field label="Default Language">
              <select className={inputCls}
                value={config.defaultLanguage} onChange={e => setConfig(c => ({ ...c, defaultLanguage: e.target.value }))}>
                {LANGUAGES.map(l => <option key={l} value={l}>{LANG_LABELS[l]} ({l})</option>)}
              </select>
            </Field>
          </div>
        </Section>

        {/* 3. Slides */}
        <Section id="slides" title="Active Slides" icon={LayoutGrid}>
          <p className="text-xs text-[#708F7D] mb-3">Toggle which slides appear in the Guest Experience slideshow.</p>
          <div className="grid grid-cols-2 gap-2">
            {SLIDES_META.map(s => (
              <button key={s.id}
                onClick={() => toggleSlide(s.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${config.enabledSlides.includes(s.id) ? "bg-[#C74B26]/10 border-[#C74B26]/40 text-[#C74B26]" : "bg-[#F5F0E8] border-[#E0D8C3] text-[#708F7D]"}`}
              >
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-xs ${config.enabledSlides.includes(s.id) ? "border-[#C74B26] bg-[#C74B26] text-white" : "border-[#D9D3C1]"}`}>
                  {config.enabledSlides.includes(s.id) ? "✓" : s.id}
                </span>
                {s.label}
              </button>
            ))}
          </div>
        </Section>

        {/* 4. Feedback preview */}
        <Section id="feedback" title="Feedback & Reviews" icon={Star}>
          <div className="text-sm text-[#4A5D4E] space-y-2">
            <p>Guest feedback submitted via the app is available in:</p>
            <a href="/guest-experience/feedback" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-medium hover:bg-amber-100 transition text-sm">
              <MessageSquare className="w-4 h-4" /> View Guest Feedback Reports
            </a>
          </div>
        </Section>

        {/* 5. Install App */}
        <Section id="install" title="Install App on Device" icon={Smartphone}>
          <p className="text-sm text-[#4A5D4E] mb-4">
            Open this config page on the iPad/Mobile you want to use as a kiosk, then tap <strong>Install Guest App</strong>. A Kairali icon will appear on the home screen.
          </p>
          {isInstalled ? (
            <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-xl border border-green-200">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-semibold">App installed on this device!</p>
                <p className="text-xs opacity-80 mt-0.5">Open from home screen icon whenever needed.</p>
              </div>
            </div>
          ) : (
            <button onClick={handleInstallClick}
              className="w-full py-3.5 rounded-xl bg-[#C74B26] hover:bg-[#A83D1E] text-white font-bold tracking-wide shadow-md flex items-center justify-center gap-2 transition active:scale-95">
              <MonitorDown className="w-5 h-5" /> Install Guest App
            </button>
          )}
        </Section>

        {/* Save Button */}
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-4 rounded-2xl bg-[#132A13] hover:bg-[#1E3D1E] text-white font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-60">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {saving ? "Saving..." : saved ? "Saved!" : "Save & Apply Config"}
          </button>
          <button onClick={() => { setLoading(true); fetch("/api/guest-experience/config").then(r=>r.json()).then(d=>{setConfig(d);setLoading(false)}) }}
            className="px-5 py-4 rounded-2xl border border-[#D9D3C1] bg-white text-[#4A5D4E] hover:bg-[#F5F0E8] transition">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <p className="text-center text-xs text-[#708F7D] mt-4">
          Guest app will auto-refresh with latest config. You can also send this page link to iPad via WhatsApp to set it up remotely.
        </p>
      </div>
    </div>
  )
}
