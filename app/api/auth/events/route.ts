import { NextRequest } from 'next/server'
import { readVerifiedSessionPayload } from '@/lib/session'
import { subscribeSessionEvents } from '@/lib/session-event-bus'
import { autoEnsureActiveSessionAndDevice } from '@/lib/user-devices'
import { getRequestSourceIp } from '@/lib/security-audit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const rawCookie = req.cookies.get('kairali_user')?.value
  const payload = readVerifiedSessionPayload(rawCookie)

  if (!payload || !payload.user || !payload.user.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = String(payload.user.id).trim()
  const userEmail = String(payload.user.email || '').trim().toLowerCase()
  const sid = payload.sid || `legacy_${userId}`
  const userAgent = req.headers.get('user-agent') || ''
  const sourceIp = getRequestSourceIp(req)

  // Ensure this active device and session are registered
  await autoEnsureActiveSessionAndDevice(sid, userId, payload.deviceId, {
    deviceName: userAgent.includes('Mac') ? 'Apple Mac' : userAgent.includes('Windows') ? 'Windows PC' : 'Desktop Device',
    platform: userAgent.includes('Mac') ? 'macOS' : userAgent.includes('Windows') ? 'Windows' : 'Web',
    browser: userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : 'Browser',
    ipAddress: sourceIp,
    role: payload.user.role,
  })

  let isStreamOpen = true
  let unsubscribeUser: (() => void) | null = null
  let unsubscribeEmail: (() => void) | null = null
  let pingInterval: NodeJS.Timeout | null = null

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // 1. Send initial connected event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId, sid, deviceId: payload.deviceId, timestamp: Date.now() })}\n\n`)
      )

      // 2. Event listener callback
      const onEvent = (event: any) => {
        if (!isStreamOpen) return
        try {
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`))
        } catch (err) {
          console.error('[auth/events] Failed to enqueue event to stream:', err)
        }
      }

      // 3. Subscribe for events by userId and userEmail
      unsubscribeUser = subscribeSessionEvents(userId, onEvent)
      if (userEmail && userEmail !== userId) {
        unsubscribeEmail = subscribeSessionEvents(userEmail, onEvent)
      }

      // 4. Heartbeat keepalive every 20 seconds
      pingInterval = setInterval(() => {
        if (!isStreamOpen) return
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          // Stream likely closed
          if (pingInterval) clearInterval(pingInterval)
        }
      }, 20000)
    },
    cancel() {
      isStreamOpen = false
      if (pingInterval) clearInterval(pingInterval)
      if (unsubscribeUser) unsubscribeUser()
      if (unsubscribeEmail) unsubscribeEmail()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
