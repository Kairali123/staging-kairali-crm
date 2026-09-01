// src/app/api/auth/[...nextauth]/route.ts
// Google Calendar scope + persists refresh token to DB so the mobile app
// can read the calendar without its own OAuth.

import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { getPool } from '@/lib/db'

// ── Persist refresh token to DB (keyed by email) ──────────────────────────────
async function persistRefreshToken(email: string, refreshToken: string) {
  if (!email || !refreshToken) return
  try {
    const db = await getPool()
    await db.execute(
      `INSERT INTO google_tokens (email, refresh_token)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE refresh_token = VALUES(refresh_token)`,
      [email, refreshToken]
    )
    console.log('[NextAuth] Stored Google refresh token for', email)
  } catch (err) {
    console.error('[NextAuth] Could not persist refresh token:', err)
  }
}

async function refreshAccessToken(token: any) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type:    'refresh_token',
        refresh_token: token.refreshToken,
      }),
    })
    const refreshed = await res.json()
    if (!res.ok) throw refreshed
    return {
      ...token,
      accessToken:  refreshed.access_token,
      expiresAt:    Math.floor(Date.now() / 1000) + refreshed.expires_in,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error:        undefined,
    }
  } catch (err) {
    console.error('[NextAuth] Token refresh failed:', err)
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/meetings.space.readonly',
            'https://www.googleapis.com/auth/calendar.readonly',
          ].join(' '),
          access_type: 'offline',
          prompt:      'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        // First sign-in — persist refresh token to DB for mobile access
        const email = (profile as any)?.email || token.email
        if (account.refresh_token && email) {
          await persistRefreshToken(email as string, account.refresh_token)
        }
        return {
          ...token,
          accessToken:  account.access_token,
          refreshToken: account.refresh_token,
          expiresAt:    account.expires_at,
          error:        undefined,
        }
      }
      if (Date.now() < (token.expiresAt as number) * 1000 - 60_000) return token
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      ;(session as any).accessToken = token.accessToken
      ;(session as any).error       = token.error
      return session
    },
  },
  session: { strategy: 'jwt' },
  secret:  process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
