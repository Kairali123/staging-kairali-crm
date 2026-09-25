"use client"
import { useState, useEffect } from "react"
import { MonitorDown, CheckCircle2 } from "lucide-react"

export default function GuestAppConfig() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true)
    }

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
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setIsInstalled(true)
      }
    } else {
      alert("To install on iPad/iPhone: Tap the 'Share' icon (square with arrow pointing up) at the top/bottom of Safari, then select 'Add to Home Screen'. This will create a Kairali App Icon on your device.")
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F0E6] flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-[#E0D8C3]">
        <div className="w-20 h-20 bg-[#E05E36]/10 text-[#E05E36] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <MonitorDown className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-serif text-[#132A13] mb-3">Kiosk Setup</h1>
        <p className="text-[#4A5D4E] mb-8 leading-relaxed">
          Install the Kairali Guest App directly to this device. It will appear on the home screen and run in full-screen mode.
        </p>
        
        {isInstalled ? (
          <div className="flex flex-col items-center gap-3 text-green-700 bg-green-50 p-4 rounded-xl border border-green-200">
            <CheckCircle2 className="w-8 h-8" />
            <span className="font-medium">App is successfully installed!</span>
            <p className="text-sm opacity-80 mt-1">You can now open it from your device home screen.</p>
          </div>
        ) : (
          <button 
            onClick={handleInstallClick}
            className="w-full py-4 rounded-xl bg-[#E05E36] hover:bg-[#C9502C] text-white font-bold tracking-wide shadow-lg transition-transform active:scale-95"
          >
            Install Guest App
          </button>
        )}
      </div>
    </div>
  )
}
