import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'

// The client's only trustworthy source for "who am I". The browser copy of the
// user in localStorage is mutable by anyone with devtools, so the auth context
// bootstraps from this route instead: it re-derives identity from the HMAC-signed
// HttpOnly cookie minted by /api/auth/login and returns only what that signature
// covers.
//
// This route answers identity, not authorization. It never mints, refreshes, or
// clears the cookie — a session's lifetime is decided at login and by the expiry
// embedded in the payload, and an expired session is simply unauthorized here.

// An identity reply is per-user and must never land in a shared or disk cache,
// nor be replayed from bfcache after logout. Applied to every response.
const NO_STORE = 'private, no-store'

// Fixed reply for every rejection. Absent, malformed, forged, and expired
// cookies are indistinguishable to the caller: a client learns only that it has
// no usable session, never why the one it presented failed.
const MSG_UNAUTHORIZED = 'Unauthorized'

function jsonNoStore(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': NO_STORE } })
}

export async function GET(req: NextRequest) {
  const raw = req.cookies.get('kairali_user')?.value

  if (!raw) {
    return jsonNoStore({ success: false, error: MSG_UNAUTHORIZED }, 401)
  }

  // Returns null for a bad shape, a signature mismatch, an unparseable payload,
  // or an elapsed expiry. Nothing derived from `raw` — not the value, not its
  // length, not a parse error — is returned or logged; the cookie and its
  // signature stay server-side.
  const user = verifySessionCookieValue(raw)

  // A verified payload still has to carry a user object. A session signed around
  // a string, array, or null is one this route does not understand, and an
  // unrecognised payload must never be handed back as an established identity.
  if (typeof user !== 'object' || user === null || Array.isArray(user)) {
    return jsonNoStore({ success: false, error: MSG_UNAUTHORIZED }, 401)
  }

  // Exactly the record the signature covers. The cookie value is not echoed.
  return jsonNoStore({ success: true, user }, 200)
}
