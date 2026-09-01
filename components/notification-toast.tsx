"use client"

import React from "react"
import { Bell, Info, ArrowRight, X } from "lucide-react"

interface NotificationToastProps {
  notification: {
    id: string
    type: "system" | "lead" | "update"
    title: string
    body: string
    time: string
    link?: string
  }
  onClose: () => void
}

export function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const isSystem = notification.type === "system"
  
  return (
    <div className="w-full max-w-[400px] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
      <div className={`h-1.5 w-full ${isSystem ? "bg-blue-600" : "bg-emerald-600"}`} />
      
      <div className="p-4 flex gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isSystem ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
          {isSystem ? <Info className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[14px] font-bold text-slate-900 truncate pr-4">{notification.title}</h4>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }} 
              className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 -mt-1 -mr-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[12px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
          
          <div className="flex items-center justify-between mt-4">
            <button 
              className={`text-[11px] font-bold py-1.5 px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-sm ${
                isSystem 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (notification.link) window.open(notification.link, "_blank");
                onClose();
              }}
            >
              View Details <ArrowRight className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-slate-400 font-semibold tracking-tight uppercase">
              {new Date(notification.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
