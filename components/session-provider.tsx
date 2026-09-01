// src/components/session-provider.tsx
// Wrap your root layout with this so useSession() works everywhere
'use client'

import { SessionProvider } from 'next-auth/react'

export function NextAuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}