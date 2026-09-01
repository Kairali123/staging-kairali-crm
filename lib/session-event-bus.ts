// In-process event bus for real-time session events (SSE)
type SessionEventCallback = (event: {
  type: 'PASSWORD_CHANGED' | 'SESSION_KICKED' | 'REMOTE_LOGOUT' | 'PING'
  message?: string
  sid?: string
  deviceId?: string
  timestamp: number
}) => void

declare global {
  var _sessionEventSubscribers: Map<string, Set<SessionEventCallback>> | undefined
}

function getSubscribers(): Map<string, Set<SessionEventCallback>> {
  if (!global._sessionEventSubscribers) {
    global._sessionEventSubscribers = new Map()
  }
  return global._sessionEventSubscribers
}

export function subscribeSessionEvents(
  userId: string,
  callback: SessionEventCallback
): () => void {
  const subscribers = getSubscribers()
  const cleanId = String(userId).trim()

  if (!subscribers.has(cleanId)) {
    subscribers.set(cleanId, new Set())
  }

  subscribers.get(cleanId)!.add(callback)

  return () => {
    const userSubs = subscribers.get(cleanId)
    if (userSubs) {
      userSubs.delete(callback)
      if (userSubs.size === 0) {
        subscribers.delete(cleanId)
      }
    }
  }
}

export function broadcastSessionEvent(
  userId: string,
  event: {
    type: 'PASSWORD_CHANGED' | 'SESSION_KICKED' | 'REMOTE_LOGOUT' | 'PING'
    message?: string
    sid?: string
    deviceId?: string
  }
): void {
  const subscribers = getSubscribers()
  const cleanId = String(userId).trim()
  const userSubs = subscribers.get(cleanId)

  if (userSubs && userSubs.size > 0) {
    const payload = {
      ...event,
      timestamp: Date.now(),
    }
    for (const callback of userSubs) {
      try {
        callback(payload)
      } catch (err) {
        console.error(`[session-event-bus] Error notifying subscriber for user ${cleanId}:`, err)
      }
    }
  }
}
