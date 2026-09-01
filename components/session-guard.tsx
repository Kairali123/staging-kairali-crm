"use client"

import React, { useEffect, useState, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { KeyRound, Smartphone, AlertTriangle, LogOut, ShieldAlert } from "lucide-react"

export type SessionAlertState = {
  isOpen: boolean
  type: "PASSWORD_CHANGED" | "SESSION_KICKED" | "REMOTE_LOGOUT" | "SESSION_EXPIRED"
  title: string
  message: string
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server-env"
  let id = localStorage.getItem("crm_device_id")
  if (!id) {
    id = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36)
    localStorage.setItem("crm_device_id", id)
  }
  return id
}

export function SessionGuard() {
  const { user, logout } = useAuth()
  const [alertState, setAlertState] = useState<SessionAlertState>({
    isOpen: false,
    type: "PASSWORD_CHANGED",
    title: "",
    message: "",
  })
  const [countdown, setCountdown] = useState<number | null>(null)
  const isLoggedOutRef = useRef(false)

  const currentSidRef = useRef<string | null>(null)
  const currentDeviceIdRef = useRef<string | null>(null)

  // Trigger alert and start automatic redirect countdown
  const triggerSessionAlert = (type: SessionAlertState["type"], title: string, message: string) => {
    if (isLoggedOutRef.current) return
    setAlertState({
      isOpen: true,
      type,
      title,
      message,
    })
    setCountdown(20) // 20 seconds auto-redirect countdown
  }

  // Handle countdown tick
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      handleForceLogout()
      return
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown])

  const handleForceLogout = async () => {
    if (isLoggedOutRef.current) return
    isLoggedOutRef.current = true
    try {
      await logout()
    } catch {
      // Ignore
    } finally {
      window.location.href = "/"
    }
  }

  // 1. Real-Time SSE Listener
  useEffect(() => {
    if (!user) return

    let eventSource: EventSource | null = null
    let retryTimeout: NodeJS.Timeout | null = null

    const connectSSE = () => {
      try {
        eventSource = new EventSource("/api/auth/events")

        eventSource.addEventListener("connected", (e: any) => {
          try {
            const data = JSON.parse(e.data)
            if (data.sid) currentSidRef.current = String(data.sid)
            if (data.deviceId) currentDeviceIdRef.current = String(data.deviceId)
          } catch {}
        })

        eventSource.addEventListener("PASSWORD_CHANGED", (e: any) => {
          try {
            const data = JSON.parse(e.data)
            triggerSessionAlert(
              "PASSWORD_CHANGED",
              "Password Updated by Administrator",
              data.message ||
                "Your account password has been updated by the system administrator. For security reasons, your active session has been ended. Please log in using your new credentials."
            )
          } catch {
            triggerSessionAlert(
              "PASSWORD_CHANGED",
              "Password Updated by Administrator",
              "Your account password has been updated by the system administrator. For security reasons, your active session has been ended. Please log in using your new credentials."
            )
          }
        })

        eventSource.addEventListener("SESSION_KICKED", (e: any) => {
          try {
            const data = JSON.parse(e.data)
            // If the kick event was targeted at a specific SID/deviceId and it does NOT match this session, ignore it
            if (data.sid && currentSidRef.current && data.sid !== currentSidRef.current) {
              return
            }
            if (data.deviceId && currentDeviceIdRef.current && data.deviceId !== currentDeviceIdRef.current) {
              return
            }

            triggerSessionAlert(
              "SESSION_KICKED",
              "Concurrent Login Detected",
              data.message ||
                "Your account has been accessed from another authorized device. To adhere to security guidelines, simultaneous active sessions are restricted, and access on this device has been paused."
            )
          } catch {}
        })

        eventSource.addEventListener("REMOTE_LOGOUT", (e: any) => {
          try {
            const data = JSON.parse(e.data)
            // If remote logout targeted a specific SID/deviceId and does NOT match this session, ignore it
            if (data.sid && currentSidRef.current && data.sid !== currentSidRef.current) {
              return
            }
            if (data.deviceId && currentDeviceIdRef.current && data.deviceId !== currentDeviceIdRef.current) {
              return
            }

            triggerSessionAlert(
              "REMOTE_LOGOUT",
              "Session Terminated",
              data.message || "Your active session has been remotely terminated by the system administrator."
            )
          } catch {}
        })

        eventSource.onerror = () => {
          // If SSE closes, close and attempt reconnect after delay
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }
          if (!alertState.isOpen && !isLoggedOutRef.current) {
            retryTimeout = setTimeout(connectSSE, 10000)
          }
        }
      } catch (err) {
        console.warn("[SessionGuard] SSE connection error:", err)
      }
    }

    connectSSE()

    return () => {
      if (eventSource) eventSource.close()
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  }, [user])

  // 2. Periodic Heartbeat (Every 30s)
  useEffect(() => {
    if (!user) return

    const checkHeartbeat = async () => {
      if (alertState.isOpen || isLoggedOutRef.current) return
      try {
        const res = await fetch("/api/auth/heartbeat", {
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        })

        if (res.status === 401) {
          const data = await res.json().catch(() => ({}))
          if (data.reason === "PASSWORD_CHANGED") {
            triggerSessionAlert(
              "PASSWORD_CHANGED",
              "Password Updated by Administrator",
              "Your account password has been updated by the system administrator. For security reasons, your active session has been ended. Please log in using your new credentials."
            )
          } else if (data.reason === "KICKED_BY_CONCURRENT_DEVICE") {
            triggerSessionAlert(
              "SESSION_KICKED",
              "Concurrent Login Detected",
              "Your account was accessed from another authorized device. Access on this device has been paused to prevent concurrent logins."
            )
          } else if (data.reason === "SESSION_REVOKED" || data.reason === "DEVICE_REMOVED") {
            triggerSessionAlert(
              "REMOTE_LOGOUT",
              "Session Terminated",
              "Your session is no longer active. Please log in again to continue."
            )
          }
        }
      } catch {
        // Network error, ignore
      }
    }

    const interval = setInterval(checkHeartbeat, 30000)
    return () => clearInterval(interval)
  }, [user, alertState.isOpen])

  if (!alertState.isOpen) return null

  const getIcon = () => {
    switch (alertState.type) {
      case "PASSWORD_CHANGED":
        return <KeyRound className="h-7 w-7 text-amber-600" />
      case "SESSION_KICKED":
        return <Smartphone className="h-7 w-7 text-blue-600" />
      case "REMOTE_LOGOUT":
        return <LogOut className="h-7 w-7 text-rose-600" />
      default:
        return <ShieldAlert className="h-7 w-7 text-orange-600" />
    }
  }

  const getHeaderBg = () => {
    switch (alertState.type) {
      case "PASSWORD_CHANGED":
        return "bg-amber-50 border-amber-200"
      case "SESSION_KICKED":
        return "bg-blue-50 border-blue-200"
      case "REMOTE_LOGOUT":
        return "bg-rose-50 border-rose-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  return (
    <Dialog open={alertState.isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md rounded-2xl border bg-white p-0 shadow-2xl overflow-hidden [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className={`flex items-center gap-3.5 border-b px-6 py-5 ${getHeaderBg()}`}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {getIcon()}
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-gray-900 leading-snug">
              {alertState.title}
            </DialogTitle>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Session Security Notification</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <DialogDescription className="text-sm leading-relaxed text-gray-700">
            {alertState.message}
          </DialogDescription>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3.5 border border-gray-100 text-xs text-gray-600">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Auto-redirecting to login in:
            </span>
            <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded shadow-xs border">
              {countdown}s
            </span>
          </div>
        </div>

        <DialogFooter className="border-t bg-gray-50/70 px-6 py-4">
          <Button
            onClick={handleForceLogout}
            className="w-full h-10 rounded-xl bg-gray-900 hover:bg-black font-semibold text-sm shadow-sm gap-2"
          >
            <LogOut className="h-4 w-4" />
            Proceed to Login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
