"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { AuthProvider } from "@/hooks/use-auth"
import { LeadsProvider } from "@/hooks/use-leads"
import RouteGuard from "@/components/route-guard"
import ContentProtectionProvider from "@/components/content-protection-provider"
import { NotificationProvider } from "@/contexts/notification-context"
import { NextAuthSessionProvider } from "@/components/session-provider"
import { SessionGuard } from "@/components/session-guard"
import ChatWidget from "@/components/bot-widget/ChatWidget"

export default function CRMProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Bypass all heavy CRM providers for the Guest Experience PWA
  if (pathname?.startsWith("/guest-experience")) {
    return <>{children}</>
  }

  return (
    <AuthProvider>
      <SessionGuard />
      <RouteGuard>
        <LeadsProvider>
          <NotificationProvider>
            <ContentProtectionProvider>
              <NextAuthSessionProvider>
                {children}
              </NextAuthSessionProvider>
            </ContentProtectionProvider>
          </NotificationProvider>
        </LeadsProvider>
      </RouteGuard>
      <ChatWidget />
    </AuthProvider>
  )
}
