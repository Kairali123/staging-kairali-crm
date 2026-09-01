"use client"

import React from "react"
import { Bell, ArrowRight, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

export interface Notification {
  id: string
  type: "system" | "lead" | "update"
  title: string
  body: string
  time: string
  link?: string
  read: boolean
  notifId?: string | null
  arrivalDate?: string
  exiting?: boolean
}

interface FloatingNotificationStackProps {
  toasts: Notification[]
  onCloseToast: (id: string) => void
}

function formatNotificationTime(timeString: string | undefined | null): string {
  if (!timeString) return "JUST NOW"
  
  let date = new Date(timeString)
  
  // If invalid, try parsing slash-separated format (e.g. DD/MM/YYYY HH:mm:ss or DD/MM/YYYY HH:mm)
  if (isNaN(date.getTime())) {
    try {
      const match = timeString.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/)
      if (match) {
        const [_, day, month, year, hours, minutes, seconds = "0"] = match
        date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds))
      }
    } catch (e) {
      console.error("Failed to parse custom date format", e)
    }
  }

  if (isNaN(date.getTime())) {
    return "JUST NOW"
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
}

export function FloatingNotificationStack({ toasts, onCloseToast }: FloatingNotificationStackProps) {
  return (
    <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-4 w-[380px] max-w-[calc(100vw-32px)] pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const isSystem = toast.type === "system"
          
          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: -50, scale: 0.9, height: 0 }}
              animate={{ opacity: 1, y: 0, scale: 1, height: "auto" }}
              exit={{ opacity: 0, scale: 0.9, height: 0, transition: { duration: 0.2 } }}
              transition={{ 
                type: "spring",
                stiffness: 500,
                damping: 30,
                mass: 1
              }}
              key={toast.id}
              className="w-full bg-white border border-slate-150 rounded-[20px] shadow-[0_10px_35px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col pointer-events-auto relative origin-top"
            >
              {/* Top Accent Green/Blue Line */}
              <div className={`h-1.5 w-full ${isSystem ? "bg-blue-600" : "bg-[#009270]"}`} />
              
              <div className="p-5 flex gap-4 relative">
                {/* Close Button top-right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseToast(toast.id)
                  }}
                  className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-650"
                  aria-label="Close notification"
                >
                  <X className="h-4 w-4 stroke-[2.5]" />
                </button>

                {/* Left Icon Area - Notification Bell */}
                <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${
                  isSystem 
                    ? "bg-blue-50 text-blue-600" 
                    : "bg-[#e6f4f0] text-[#009270]"
                }`}>
                  <Bell className="h-5.5 w-5.5 stroke-[2.25]" />
                </div>
                
                {/* Content Section */}
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-[14px] font-bold text-slate-900 leading-snug">
                    {toast.title}
                  </h4>
                  <p className="text-[12px] text-slate-500 mt-1 leading-relaxed font-semibold">
                    {toast.body}
                  </p>
                  
                  {/* Footer Actions */}
                  <div className="flex items-center justify-between mt-3.5">
                    <button
                      className={`text-[11px] font-bold py-1.5 px-4 rounded-full flex items-center gap-1.5 transition-all shadow-sm border ${
                        isSystem
                          ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                          : "bg-white border-[#009270] text-[#009270] hover:bg-[#e6f4f0]"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (toast.link) {
                          window.open(toast.link, "_blank")
                        }
                        onCloseToast(toast.id)
                      }}
                    >
                      View Details <ArrowRight className="h-3 w-3 stroke-[2.5]" />
                    </button>
                    
                    <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase select-none">
                      {formatNotificationTime(toast.time)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
