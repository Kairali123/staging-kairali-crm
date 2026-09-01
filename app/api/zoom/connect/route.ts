// src/app/api/zoom/connect/route.ts
// Initiates Zoom OAuth — moved OUT of /api/auth/ to avoid NextAuth interception
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const clientId    = process.env.ZOOM_CLIENT_ID!
  const redirectUri = process.env.ZOOM_REDIRECT_URI!
  const state       = Math.random().toString(36).substring(2, 15)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    redirect_uri:  redirectUri,
    state,
  })

  const response = NextResponse.redirect(
    `https://zoom.us/oauth/authorize?${params.toString()}`
  )

  response.cookies.set('zoom_oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   600,
    path:     '/',
  })

  return response
}