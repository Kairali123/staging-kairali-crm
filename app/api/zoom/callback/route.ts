// src/app/api/zoom/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/meetings?zoom_error=${error || 'no_code'}`, req.url)
    )
  }

  const clientId     = process.env.ZOOM_CLIENT_ID!
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!
  const redirectUri  = process.env.ZOOM_REDIRECT_URI!
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  try {
    const tokenRes = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Zoom OAuth] Token exchange failed:', tokenData)
      return NextResponse.redirect(
        new URL('/meetings?zoom_error=token_failed', req.url)
      )
    }

    const userRes  = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userData = await userRes.json()

    const zoomSession = {
      accessToken:  tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt:    Date.now() + (tokenData.expires_in * 1000),
      userName:     userData.display_name || userData.first_name || userData.email || 'Zoom User',
      userEmail:    userData.email        || '',
      userId:       userData.id           || '',
    }

    console.log('[Zoom OAuth] User stored in session:', {
      id:    userData.id,
      email: userData.email,
      name:  userData.display_name,
    })

    // Redirect back to /meetings — the useEffect there detects zoom_connected=true,
    // re-fetches zoom session, and re-opens the recording modal automatically
    const response = NextResponse.redirect(
      new URL('/meetings?zoom_connected=true', req.url)
    )

    response.cookies.set('zoom_session', JSON.stringify(zoomSession), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      maxAge:   3600,
      path:     '/',
    })

    return response

  } catch (err: any) {
    console.error('[Zoom OAuth] Callback error:', err)
    return NextResponse.redirect(
      new URL('/meetings?zoom_error=server_error', req.url)
    )
  }
}