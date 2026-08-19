"use client"

import React, { createContext, useContext, useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"


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
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAllNotifications: () => void
  checkForUpdates: () => Promise<void>
  triggerDemoNotification: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const POLL_INTERVAL = 20 * 60 * 1000 // 20 minutes
const CLEANUP_THRESHOLD = 5 * 60 * 1000 // 5 minutes

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const lastCheckRef = useRef<string>(new Date().toISOString())

  useEffect(() => {
    const stored = localStorage.getItem("read_notifications")
    if (stored) {
      try {
        setReadIds(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to parse read notifications", e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("read_notifications", JSON.stringify(readIds))
  }, [readIds])

  const fetchLeads = async () => {
    if (!user) return []
    try {
      const response = await fetch(`/api/leads?since=${lastCheckRef.current}&limit=10`)
      const result = await response.json()
      if (result.success && result.data) {
        return result.data
          .filter((lead: any) => user.permissions.includes("all") || lead.company === user.company)
          .map((lead: any) => ({
            id: `lead-${lead.id}`,
            type: "lead",
            title: "New Lead Received",
            body: `${lead.name} (${lead.phone}) from ${lead.source}`,
            time: lead.createdAt || new Date().toISOString(),
            arrivalDate: new Date().toISOString(),
            link: "/leads/assign",
            notifId: lead.id,
            read: false
          }))
      }
    } catch (error) { console.error("Leads fetch error:", error) }
    return []
  }

  const fetchFMS = async (url: string, prefix: string, company: string) => {
    if (!user) return []
    if (!user.permissions.includes("all") && user.company !== company) return []
    try {
      const response = await fetch(url)
      if (!response.ok) return []
      const text = await response.text()
      if (!text || text.trim().startsWith("<")) return []
      const data = JSON.parse(text)
      const bookings = data.bookings || data || []
      const lastCheckTime = new Date(lastCheckRef.current).getTime()

      return (Array.isArray(bookings) ? bookings : [])
        .filter((b: any) => {
          const bTime = new Date(b.timestamp || b["Booking Date and Time"] || b.bookingDate).getTime()
          return bTime > lastCheckTime
        })
        .map((b: any) => ({
          id: `${prefix}-${b.id || b.bookingId}`,
          type: "lead",
          title: `New Booking: ${prefix.toUpperCase()}`,
          body: `${b.guestDetails?.guestName || b.guestName || "Guest"} - ${b.roomDetails?.roomNo || b.roomNumber || ""}`,
          time: new Date().toISOString(),
          arrivalDate: new Date().toISOString(),
          link: prefix === "team" ? "/fms/bookings/team" : "/fms/bookings/villa-raag",
          notifId: b.bookingId,
          read: false
        }))
    } catch (error) { console.error(`${prefix} FMS fetch error:`, error) }
    return []
  }

  const fetchVoiceLeads = async (type: "received" | "sent") => {
    if (!user) return []
    try {
      const response = await fetch(`/api/${type}-leads`)
      if (!response.ok) return []
      const data = await response.json()
      const lastCheckTime = new Date(lastCheckRef.current).getTime()

      return (Array.isArray(data) ? data : [])
        .filter((l: any) => {
          if (!user.permissions.includes("all") && l.company !== user.company) return false
          const lTime = new Date(l.timestamp || l.dateTime).getTime()
          return lTime > lastCheckTime
        })
        .map((l: any) => ({
          id: `voice-${type}-${l.id}`,
          type: "update",
          title: `Voice Call ${type === "received" ? "Received" : "Sent"}`,
          body: `${l.clientName || "Unknown"} (${l.mobile}) - ${l.callstatus || ""}`,
          time: new Date().toISOString(),
          arrivalDate: new Date().toISOString(),
          link: `/voicecall/data/${type}`,
          notifId: l.id,
          read: false
        }))
    } catch (error) { console.error(`Voice ${type} fetch error:`, error) }
    return []
  }

  const fetchSystemNotifications = async () => {
    try {
      const response = await fetch("/data/notifications.json")
      if (response.ok) {
        const data: Notification[] = await response.json()
        return data.map((n) => ({
          ...n, 
          arrivalDate: n.arrivalDate || n.time || new Date().toISOString(),
          read: readIds.includes(n.id) 
        }))
      }
    } catch (error) {}
    return []
  }

  const checkForUpdates = async () => {
    if (!user) return

    const [newLeads, teamFMS, villaFMS, voiceReceived, voiceSent, sysNotifs] = await Promise.all([
      fetchLeads(),
      fetchFMS("https://script.google.com/macros/s/AKfycbwpbLZ2qiWthyEBKoTovx40lgclcqe8FdwoaurGdWJJ3MJ0F7KjnrJdO0wGJVkw_tOm/exec", "team", "KTAHV"),
      fetchFMS("https://script.google.com/macros/s/AKfycbzzu8kft6pqinOA3QOku8A56Vb-0pTGkkP2V6PRiTV3EBD05oJ185bwtbsAC9WgynJH7Q/exec", "villa", "VILLARAAG"),
      fetchVoiceLeads("received"),
      fetchVoiceLeads("sent"),
      fetchSystemNotifications()
    ])

    const dynamicItems = [...newLeads, ...teamFMS, ...villaFMS, ...voiceReceived, ...voiceSent]
    
    setNotifications(prev => {
      const now = Date.now()
      const prevIds = prev.map(n => n.id)
      
      // 1. Cleanup Dynamic Items
      const filteredPrev = prev.filter(n => {
        if (n.type === 'system') return true 
        if (dynamicItems.length > 0) return false 
        const arrivalTime = new Date(n.arrivalDate || n.time).getTime()
        return (now - arrivalTime) < CLEANUP_THRESHOLD
      })

      // Merge and deduplicate
      const combined = [...dynamicItems, ...filteredPrev, ...sysNotifs]
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values())
      
      return unique
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .map(n => ({ ...n, read: readIds.includes(n.id) }))
    })

    lastCheckRef.current = new Date().toISOString()
  }

  useEffect(() => {
    if (user) {
      // Defer initial check by 5 seconds so it doesn't block dashboard initial rendering
      const initialTimer = setTimeout(() => {
        checkForUpdates()
      }, 5000)
      const interval = setInterval(checkForUpdates, POLL_INTERVAL)
      return () => {
        clearTimeout(initialTimer)
        clearInterval(interval)
      }
    }
  }, [user])

  const markAsRead = (id: string) => {
    setReadIds(prev => [...new Set([...prev, id])])
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id)
    setReadIds(prev => [...new Set([...prev, ...allIds])])
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const clearAllNotifications = () => {
    setNotifications([])
    // Also mark all as read in storage so they don't reappear if fetched again with same IDs (though dynamic are cleared anyway)
    const allIds = notifications.map(n => n.id)
    setReadIds(prev => [...new Set([...prev, ...allIds])])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    setReadIds(prev => [...new Set([...prev, id])])
  }

  const triggerDemoNotification = () => {
    const isFirst = Math.random() > 0.5
    const demoNotif: Notification = {
      id: `demo-${Date.now()}`,
      type: "lead",
      title: "New Lead Received",
      body: isFirst 
        ? "(+917003061622) from IVR API - Sound"
        : "Nanthakumar (+60 16 205 5245) from AI-Order Status Enquiry",
      time: new Date().toISOString(),
      arrivalDate: new Date().toISOString(),
      link: "/leads/assign",
      notifId: Math.floor(Math.random() * 100000).toString(),
      read: false
    }
    
    setNotifications(prev => [demoNotif, ...prev])
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAllNotifications, checkForUpdates, triggerDemoNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
