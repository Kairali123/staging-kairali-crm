"use client"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  MonitorDown, CheckCircle2, User, BedDouble, Calendar, Settings2,
  Globe, LayoutGrid, Save, RefreshCw, Loader2, MessageSquare, Star,
  ChevronDown, ChevronUp, Smartphone, Info, Edit3, Plus, Trash2, List
} from "lucide-react"

const SLIDES_META = [
  { id: 1, label: "Welcome & Clock", defaultTitle: "Kairali", defaultSub: "The Ayurvedic Healing Village" },
  { id: 2, label: "Clinical Treatments", defaultTitle: "Clinical & Traditional", defaultSub: "NABH Accredited Ayurveda" },
  { id: 3, label: "Healing Villas", defaultTitle: "Healing Architecture", defaultSub: "Villas based on Vedic astrology" },
  { id: 4, label: "Ayurvedic Cuisine", defaultTitle: "Ayurvedic Cuisine", defaultSub: "Farm-to-table organic meals" },
  { id: 5, label: "Services & Feedback", defaultTitle: "Guest Services", defaultSub: "How can we assist you today?" },
  { id: 6, label: "115 Years Legacy", defaultTitle: "Our Heritage", defaultSub: "115 years of Ayurvedic excellence" },
  { id: 7, label: "Awards & CSR", defaultTitle: "Global Recognition", defaultSub: "Top Ayurvedic Resort" },
  { id: 8, label: "Riya AI Services", defaultTitle: "Meet Riya Sharma", defaultSub: "Your AI Guest Manager" },
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
    slideOverrides: {} as Record<string, { title: string; subtitle: string }>,
    feedbackQuestions: [] as string[],
    lastUpdated: "",
  })

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) setIsInstalled(true)
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)

    fetch("/api/guest-experience/config")
      .then(r => r.json())
      .then(data => { 
        setConfig({
          ...data, 
          slideOverrides: data.slideOverrides || {},
          feedbackQuestions: data.feedbackQuestions || []
        })
        setLoading(false) 
      })
      .catch(() => setLoading(false))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') { setDeferredPrompt(null); setIsInstalled(true) }
    } else {
      alert("iPad/iPhone: Safari ▸ Share icon ▸ 'Add to Home Screen'.")
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

  const updateSlideOverride = (id: number, field: "title" | "subtitle", value: string) => {
    setConfig(c => {
      const overrides = { ...c.slideOverrides }
      if (!overrides[id]) overrides[id] = { title: "", subtitle: "" }
      overrides[id][field] = value
      return { ...c, slideOverrides: overrides }
    })
  }

  const updateQuestion = (index: number, value: string) => {
    const qs = [...config.feedbackQuestions]
    qs[index] = value
    setConfig(c => ({ ...c, feedbackQuestions: qs }))
  }
  
  const removeQuestion = (index: number) => {
    const qs = [...config.feedbackQuestions]
    qs.splice(index, 1)
    setConfig(c => ({ ...c, feedbackQuestions: qs }))
  }
  
  const addQuestion = () => {
    setConfig(c => ({ ...c, feedbackQuestions: [...c.feedbackQuestions, ""] }))
  }

  const Section = ({ id, title, icon: Icon, children }: any) => (
    <div className="border border-[#E0D8C3] rounded-2xl overflow-hidden mb-4 shadow-sm bg-white">
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
        <div className="px-5 py-5 border-t border-[#E0D8C3] space-y-4">
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
    <DashboardLayout>
      <div className="min-h-screen bg-[#F3F0E6] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C74B26]" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F3F0E6] p-4 md:p-8 font-sans">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-[#C74B26]/10 rounded-xl flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-[#C74B26]" />
              </div>
              <div>
                <h1 className="text-2xl font-serif text-[#132A13] font-bold">Guest Kiosk & Content Config</h1>
                <p className="text-xs text-[#708F7D]">
                  {config.lastUpdated ? `Last saved: ${new Date(config.lastUpdated).toLocaleString("en-IN")}` : "Not saved yet"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-700">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Changes saved here reflect <strong>instantly</strong> on the Guest App (auto-refreshes every 60s). This configures the dynamic content.</p>
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
              <input className={inputCls} placeholder="e.g. Reception Lobby"
                value={config.kioskLabel} onChange={e => setConfig(c => ({ ...c, kioskLabel: e.target.value }))} />
            </Field>
          </Section>

          {/* 2. Display Settings */}
          <Section id="display" title="Theme & Global Display" icon={Globe}>
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
            <Field label="Custom Welcome Message (Slide 1 Overlay)">
              <textarea rows={2} className={inputCls + " resize-none"} placeholder="Optional welcome note..."
                value={config.welcomeMessage} onChange={e => setConfig(c => ({ ...c, welcomeMessage: e.target.value }))} />
            </Field>
          </Section>

          {/* 3. Slide Content Editor */}
          <Section id="slides" title="Dynamic Slide Editor" icon={Edit3}>
            <p className="text-xs text-[#708F7D] mb-4">Toggle slides on/off, and customize their titles/subtitles (English base). Leave fields blank to use defaults.</p>
            
            <div className="space-y-4">
              {SLIDES_META.map(s => {
                const isActive = config.enabledSlides.includes(s.id)
                const override = config.slideOverrides[s.id] || { title: "", subtitle: "" }
                return (
                  <div key={s.id} className={`p-4 rounded-xl border ${isActive ? 'border-[#C74B26]/30 bg-[#C74B26]/5' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <button onClick={() => toggleSlide(s.id)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${isActive ? "bg-[#C74B26] text-white" : "bg-white border-2 border-gray-300"}`}>
                        {isActive && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <h4 className={`font-semibold ${isActive ? "text-[#132A13]" : "text-gray-400"}`}>Slide {s.id}: {s.label}</h4>
                    </div>
                    
                    {isActive && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Custom Title</label>
                          <input className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white" 
                            placeholder={s.defaultTitle}
                            value={override.title} onChange={e => updateSlideOverride(s.id, "title", e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Custom Subtitle</label>
                          <input className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white" 
                            placeholder={s.defaultSub}
                            value={override.subtitle} onChange={e => updateSlideOverride(s.id, "subtitle", e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>

          {/* 4. Feedback Questions Config */}
          <Section id="feedback" title="Dynamic Feedback Form" icon={List}>
            <p className="text-xs text-[#708F7D] mb-4">Edit the questions asked in the quick feedback flow.</p>
            
            <div className="space-y-3">
              {config.feedbackQuestions.map((q, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 text-center text-xs font-bold text-gray-400">{i + 1}.</div>
                  <input className={inputCls + " flex-1 !py-2"} placeholder="Enter question..."
                    value={q} onChange={e => updateQuestion(i, e.target.value)} />
                  <button onClick={() => removeQuestion(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button onClick={addQuestion} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#C74B26] hover:bg-[#C74B26]/10 rounded-lg mt-2 ml-8">
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-[#E0D8C3] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#132A13]">Guest Responses</h4>
                <p className="text-xs text-[#708F7D]">View submitted feedback scores</p>
              </div>
              <a href="/guest-experience/feedback" target="_blank" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#132A13] text-white text-sm font-medium hover:bg-[#1E3D1E] transition">
                <Star className="w-4 h-4" /> View Feedback Report
              </a>
            </div>
          </Section>

          {/* 5. Install */}
          <Section id="install" title="Install Device App" icon={Smartphone}>
             <button onClick={handleInstallClick}
              className="w-full py-3.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold tracking-wide shadow-md flex items-center justify-center gap-2 transition active:scale-95">
              <MonitorDown className="w-5 h-5" /> Install Guest App Fullscreen
            </button>
          </Section>

          {/* Save Button */}
          <div className="flex gap-3 mt-6 pb-12">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-4 rounded-2xl bg-[#C74B26] hover:bg-[#A83D1E] text-white font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-60 text-lg">
              {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : saved ? <CheckCircle2 className="w-6 h-6" /> : <Save className="w-6 h-6" />}
              {saving ? "Saving..." : saved ? "Published Successfully!" : "Publish Kiosk Changes"}
            </button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
